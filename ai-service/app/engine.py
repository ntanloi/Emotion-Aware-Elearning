"""
Engine nhận diện trạng thái học tập (lõi emotion_demo) dùng cho ai-service.

Khác với emotion_demo (đọc webcam liên tục), ở đây ảnh đến từng khung qua HTTP
(frontend -> backend -> ai-service, khoảng 1 ảnh/giây/học viên). Vì thế engine:

  * Giữ MỘT bộ trạng thái RIÊNG cho từng phiên học (session_id): baseline cá nhân
    (hiệu chỉnh ~4 giây đầu), cửa sổ thời gian, làm mượt, giữ trạng thái.
  * Dùng chung MỘT FaceMesh + Hands (chế độ ảnh tĩnh, không nhớ trạng thái giữa các khung)
    và khóa lại khi chạy, nên nhiều học viên dùng cùng lúc không lẫn nhau.
  * Ảnh chỉ nằm trong RAM, không ghi ra đĩa (BR-08).

Ánh xạ trạng thái (giữ đúng hợp đồng cũ với backend):
    FOCUSED    -> ENGAGED     / neutral
    INTERESTED -> INTERESTED  / happy
    CONFUSED   -> CONFUSED    / fearful
    BORED      -> BORED       / sad
    AWAY       -> NO_FACE     / no_face
"""
from __future__ import annotations

import base64
import logging
import os
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import cv2
import numpy as np

from .emotion_core.classifier import CONFIG as CLF_CONFIG
from .emotion_core.classifier import Calibrator, EngagementClassifier
from .emotion_core.features import FrameFeatures, extract
from .emotion_core.models_ml import load_models

logger = logging.getLogger("ai-service.engine")

MODEL_VERSION = "mediapipe-rules-ml-v1.0"


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return float(default)


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return int(default)


# ---------------------------------------------------------------------------
# Cấu hình (chỉnh bằng biến môi trường, không cần sửa code)
# ---------------------------------------------------------------------------
CALIB_SECONDS = _env_float("AI_CALIB_SEC", 5.0)         # thời gian hiệu chỉnh đầu phiên
CALIB_MIN_SAMPLES = _env_int("AI_CALIB_MIN_SAMPLES", 10)  # số khung có mặt tối thiểu để chốt baseline
SESSION_TTL_SEC = _env_float("AI_SESSION_TTL_SEC", 900)  # phiên không có ảnh quá lâu -> xóa, lần sau hiệu chỉnh lại
FRAME_SPACING_SEC = _env_float("AI_FRAME_SPACING_SEC", 0.2)  # khoảng cách giả định giữa các ảnh trong 1 lô
PROC_WIDTH = _env_int("AI_PROC_WIDTH", 480)              # ảnh rộng hơn mức này sẽ được thu nhỏ trước khi đưa vào MediaPipe

# Ghi đè CONFIG của emotion_demo cho nhịp ~1 khung/giây (emotion_demo gốc chạy ~15-30 khung/giây)
# Frontend gửi ~5 ảnh/giây (lô 1 giây) nên dùng đúng các giá trị gốc của emotion_demo (classifier.CONFIG).
CLASSIFIER_CFG: Dict[str, float] = {
    "window_sec": _env_float("AI_WINDOW_SEC", CLF_CONFIG["window_sec"]),
    "hold_sec": _env_float("AI_HOLD_SEC", CLF_CONFIG["hold_sec"]),
    "release_hold_sec": _env_float("AI_RELEASE_HOLD_SEC", CLF_CONFIG["release_hold_sec"]),
    "away_after_sec": _env_float("AI_AWAY_AFTER_SEC", CLF_CONFIG["away_after_sec"]),
    "smooth_tau": _env_float("AI_SMOOTH_TAU", CLF_CONFIG["smooth_tau"]),
}
DEBUG = os.getenv("AI_DEBUG", "").lower() in ("1", "true", "yes")
for _k in ("bored_threshold", "interested_threshold", "confused_threshold", "smile_frac_full"):
    _v = os.getenv("AI_" + _k.upper())
    if _v is not None:
        try:
            CLASSIFIER_CFG[_k] = float(_v)
        except ValueError:
            pass

STATE_MAP = {
    "FOCUSED": ("ENGAGED", "neutral"),
    "INTERESTED": ("INTERESTED", "happy"),
    "CONFUSED": ("CONFUSED", "fearful"),
    "BORED": ("BORED", "sad"),
    "AWAY": ("NO_FACE", "no_face"),
}
EMOTIONS = ["neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"]


def decode_image(data: str) -> Optional[np.ndarray]:
    """base64 (data URL hoặc raw) -> ảnh BGR trong RAM. Lỗi -> None."""
    try:
        if "," in data[:100]:
            data = data.split(",", 1)[1]
        arr = np.frombuffer(base64.b64decode(data), np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img if img is not None and img.size > 0 else None
    except Exception:
        return None


@dataclass
class SessionState:
    calib: Calibrator
    clf: Optional[EngagementClassifier] = None
    lock: threading.Lock = field(default_factory=threading.Lock)
    last_seen: Optional[float] = None
    last_t: float = 0.0
    last_access: float = field(default_factory=time.monotonic)
    frames: int = 0


class EmotionEngine:
    def __init__(self) -> None:
        self.models = load_models()
        self._face = None
        self._hands = None
        self._mp_lock = threading.Lock()
        self._sessions: Dict[str, SessionState] = {}
        self._sess_lock = threading.Lock()
        self._last_gc = time.monotonic()

    # ------------------------------------------------------------------ nạp
    def load(self) -> None:
        """Khởi tạo MediaPipe một lần khi service khởi động (và khi /reload-model)."""
        import mediapipe as mp

        with self._mp_lock:
            for h in (self._face, self._hands):
                try:
                    if h is not None:
                        h.close()
                except Exception:
                    pass
            sol = mp.solutions
            # static_image_mode=True: mỗi ảnh dò mặt độc lập -> không rò trạng thái giữa các học viên
            self._face = sol.face_mesh.FaceMesh(
                static_image_mode=True, max_num_faces=1, refine_landmarks=True,
                min_detection_confidence=0.5)
            self._hands = sol.hands.Hands(
                static_image_mode=True, max_num_hands=2, model_complexity=0,
                min_detection_confidence=0.5)
        self.models = load_models()
        logger.info("Engine sẵn sàng. Model ML: %s",
                    {k: ("đã nạp" if v else "chưa có") for k, v in self.models.items()})

    @property
    def ready(self) -> bool:
        return self._face is not None and self._hands is not None

    def model_status(self) -> Dict[str, bool]:
        return {k: v is not None for k, v in self.models.items()}

    # ------------------------------------------------------------ phiên học
    def _get_session(self, session_id: str) -> SessionState:
        now = time.monotonic()
        with self._sess_lock:
            if now - self._last_gc > 60:                      # dọn phiên bỏ quên
                self._last_gc = now
                for sid in [s for s, st in self._sessions.items() if now - st.last_access > SESSION_TTL_SEC]:
                    self._sessions.pop(sid, None)
            st = self._sessions.get(session_id)
            if st is None:
                st = SessionState(Calibrator(CALIB_SECONDS, CALIB_MIN_SAMPLES))
                self._sessions[session_id] = st
            st.last_access = now
            return st

    def end_session(self, session_id: str) -> bool:
        with self._sess_lock:
            return self._sessions.pop(session_id, None) is not None

    def recalibrate(self, session_id: str) -> bool:
        with self._sess_lock:
            st = self._sessions.get(session_id)
        if st is None:
            return False
        with st.lock:
            st.calib.reset()
            st.clf = None
        return True

    def active_sessions(self) -> int:
        with self._sess_lock:
            return len(self._sessions)

    # -------------------------------------------------------------- suy luận
    def _features(self, img_bgr: np.ndarray) -> Optional[FrameFeatures]:
        h, w = img_bgr.shape[:2]
        small = img_bgr if w <= PROC_WIDTH else cv2.resize(
            img_bgr, (PROC_WIDTH, int(h * PROC_WIDTH / w)), interpolation=cv2.INTER_AREA)
        rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        with self._mp_lock:
            fres = self._face.process(rgb)
            if not fres.multi_face_landmarks:
                return None
            hres = self._hands.process(rgb)
        return extract(fres.multi_face_landmarks[0], hres.multi_hand_landmarks, w, h)

    def predict(self, session_id: str, image_b64: str, t: Optional[float] = None) -> Dict[str, Any]:
        """Phân tích 1 ảnh của 1 phiên học. t: thời điểm (giây, đồng hồ tăng dần); None = giờ máy chủ."""
        if not self.ready:
            self.load()
        st = self._get_session(session_id)
        img = decode_image(image_b64)
        feat = self._features(img) if img is not None else None

        with st.lock:
            t_now = time.monotonic() if t is None else t
            t_now = max(t_now, st.last_t)          # đồng hồ không được lùi
            st.last_t = t_now
            st.frames += 1

            if feat is not None:
                st.last_seen = t_now

            # --- Giai đoạn 1: hiệu chỉnh baseline cá nhân ---
            if st.clf is None:
                if feat is not None and st.calib.add(t_now, feat):
                    st.clf = EngagementClassifier(
                        st.calib.result(), cfg={**CLF_CONFIG, **CLASSIFIER_CFG}, models=self.models)
                    logger.info("Phiên %s: hiệu chỉnh xong sau %d khung", session_id, len(st.calib.samples))
                    # khung vừa dùng để hiệu chỉnh cũng được phân loại luôn
                    return self._finish(session_id, t_now, feat, st.clf.update(t_now, feat))
                gone = feat is None and (st.last_seen is None and st.frames >= 2 or
                                         st.last_seen is not None and t_now - st.last_seen > CLASSIFIER_CFG["away_after_sec"])
                return self._calibrating(gone)

            # --- Giai đoạn 2: phân loại ---
            return self._finish(session_id, t_now, feat, st.clf.update(t_now, feat))

    def _finish(self, session_id, t, feat, res):
        out = self._format(res)
        if DEBUG:
            fs = ("no-face" if feat is None else
                  f"EAR {feat.ear:.2f} MAR {feat.mar:.2f} brow {feat.brow_gap:.2f}/{feat.brow_eye:.2f} "
                  f"yaw {feat.yaw:+.2f} pitch {feat.pitch:.2f} hand {feat.hand}")
            sc = res.scores
            print(f"[AI_DEBUG {session_id[:8]} t={t:7.1f}] {res.state:10s} foc {sc['focused']:.2f} int {sc['interested']:.2f} "
                  f"conf {sc['confused']:.2f} bor {sc['bored']:.2f} | {fs} | {','.join(res.cues)}", flush=True)
        return out

    # ------------------------------------------------------------ định dạng
    @staticmethod
    def _calibrating(no_face: bool) -> Dict[str, Any]:
        """Đang hiệu chỉnh: coi như đang tập trung (hoặc NO_FACE nếu không thấy mặt)."""
        if no_face:
            return EmotionEngine._payload("NO_FACE", "no_face", 0.95,
                                          {"focused": 0.0, "interested": 0.0, "confused": 0.0, "bored": 0.0})
        return EmotionEngine._payload("ENGAGED", "neutral", 0.75,
                                      {"focused": 0.75, "interested": 0.0, "confused": 0.0, "bored": 0.0})

    @staticmethod
    def _format(res) -> Dict[str, Any]:
        learning_state, emotion = STATE_MAP.get(res.state, ("ENGAGED", "neutral"))
        sc = res.scores
        if learning_state == "NO_FACE":
            conf = 0.95
        else:
            strength = {"ENGAGED": sc["focused"], "INTERESTED": sc["interested"],
                        "CONFUSED": sc["confused"], "BORED": sc["bored"]}[learning_state]
            # backend loại mẫu có confidence < 0.5 khỏi báo cáo -> ánh xạ độ mạnh 0..1 sang 0.5..1.0
            conf = 0.5 + 0.5 * max(0.0, min(1.0, strength))
        return EmotionEngine._payload(learning_state, emotion, conf, sc, res.cues)

    @staticmethod
    def _payload(state: str, emotion: str, conf: float, sc: Dict[str, float],
                 cues: Optional[List[str]] = None) -> Dict[str, Any]:
        f, i, c, b = (float(sc.get(k, 0.0)) for k in ("focused", "interested", "confused", "bored"))
        raw = {"neutral": f, "happy": i, "fearful": c, "sad": b,
               "surprised": i * 0.3, "angry": 0.02 if state != "NO_FACE" else 0.0,
               "disgusted": 0.02 if state != "NO_FACE" else 0.0}
        return {
            "learning_state": state,
            "emotion_label": emotion,
            "confidence": round(float(conf), 4),
            "binary_states": {"engaged": round(min(1.0, f + i), 4), "bored": round(b, 4), "confused": round(c, 4)},
            "raw_emotion_scores": {k: round(raw.get(k, 0.0), 4) for k in EMOTIONS},
            "cues": cues or [],
        }


engine = EmotionEngine()
