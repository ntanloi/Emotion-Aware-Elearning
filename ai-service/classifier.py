"""Hiệu chỉnh baseline + phân loại trạng thái học tập theo cửa sổ thời gian.

Ý tưởng: không quyết định từng frame. Mỗi 4 giây gần nhất được tóm tắt thành
các tỉ lệ (mắt nhắm, ngáp, nhìn đi chỗ khác, cau mày, tay chạm đầu/cằm...),
rồi chấm điểm BORED, CONFUSED và INTERESTED. Không đủ điểm => FOCUSED.
INTERESTED (đang cười) và tín hiệu "quay mặt đi" có thể dùng thêm model ML (models/*.json, xem models_ml.py).
Toàn bộ ngưỡng nằm trong CONFIG để bạn dễ chỉnh.
"""
from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass, field, asdict
from typing import Deque, Dict, List, Optional, Tuple

import numpy as np

from .features import FrameFeatures
from .models_ml import LinearModel, load_models

CONFIG = dict(
    window_sec=1.2,          # độ dài cửa sổ trượt (ngắn = phản ứng gần thời gian thực)
    hold_sec=0.15,           # trạng thái mới (khác FOCUSED) phải kéo dài bấy lâu mới đổi
    release_hold_sec=0.35,   # quay về FOCUSED phải ổn định bấy lâu (vào nhanh, thoát chậm hơn để đỡ nhấp nháy)
    away_after_sec=1.0,      # mất mặt bao lâu thì coi là vắng mặt
    smooth_tau=0.10,         # hằng số thời gian làm mượt điểm số
    bored_threshold=0.38,
    interested_threshold=0.60,  # điểm hứng thú >= 60% -> INTERESTED (vẫn nhường BỐI RỐI nếu bối rối đạt ngưỡng, trừ khi >= interested_override)
    interested_override=0.90,   # điểm hứng thú >= 90% -> INTERESTED bất kể bối rối bao nhiêu (ưu tiên cao nhất)
    smile_frac_full=0.50,    # cười trong >= 50% cửa sổ => điểm hứng thú đạt tối đa
    confused_threshold=0.25,  # điểm bối rối > 25% ...
    confused_focus_max=0.65,  # ... VÀ tỉ lệ tập trung < 65% thì mới tính BỐI RỐI
    focus_gain=1.55,         # tỉ lệ tập trung = 1 - gain * điểm cao nhất (0.20 -> tập trung 69%)
    # ---- ngưỡng cho từng tín hiệu (so với baseline của chính người dùng) ----
    ear_closed_ratio=0.75,   # EAR < 75% baseline => mắt đang nhắm/híp
    brow_noise_frac=0.18,    # nhiễu landmark mày (~12% khung) được trừ ra, tránh báo bối rối nhầm khi cửa sổ ngắn
    normal_blink_frac=0.08,  # chớp mắt bình thường chiếm ~8% thời gian, trừ ra
    yawn_mar=0.50,           # MAR > ngưỡng => há miệng lớn
    yaw_off=0.12,            # |yaw - baseline| > ngưỡng => quay mặt đi
    pitch_off=0.15,          # |pitch - baseline| > ngưỡng => cúi/ngẩng nhiều
    pitch_down=0.12,         # pitch - baseline > ngưỡng => cúi đầu
    gaze_off=0.17,           # mống mắt lệch quá ngưỡng => liếc đi chỗ khác
    brow_ratio=0.93,         # khoảng cách mày < 93% baseline => cau mày (nhạy hơn, trước là 0.88)
    brow_confused_weight=0.35,  # cau mày tối đa cộng bấy nhiêu điểm vào BỐI RỐI (trước là 0.55; giảm vì cau mày nhạy, dễ nhầm với đang tập trung)
)

CUE_NAMES = {
    "eye": "eyes closing", "yawn": "yawning", "down": "head down",
    "off": "looking away", "chin": "hand on chin/mouth", "head": "hand on head",
    "brow": "brow furrowed", "smile": "smiling",
}


@dataclass
class Baseline:
    ear: float = 0.28
    mar: float = 0.05
    brow_gap: float = 0.17
    brow_eye: float = 0.07
    yaw: float = 0.0
    pitch: float = 0.55
    roll: float = 0.0
    gaze_x: float = 0.0
    gaze_y: float = 0.0
    mouth_w: float = 0.0     # mức nền nụ cười (0 = dùng giá trị tuyệt đối khi chưa hiệu chỉnh)
    lift: float = 0.0
    cheek: float = 0.0


class Calibrator:
    """Thu thập vài giây đầu (người dùng nhìn màn hình tự nhiên) để lấy baseline."""

    def __init__(self, seconds: float = 5.0, min_samples: int = 10):
        self.seconds = seconds
        self.min_samples = min_samples   # ai-service nhận ~1 khung/giây nên cần hạ xuống (mặc định 3)
        self.reset()

    def reset(self):
        self.t0: Optional[float] = None
        self.samples: List[FrameFeatures] = []
        self.done = False

    def progress(self, t: float) -> float:
        if self.t0 is None:
            return 0.0
        return min(1.0, (t - self.t0) / self.seconds)

    def add(self, t: float, f: FrameFeatures) -> bool:
        if self.t0 is None:
            self.t0 = t
        self.samples.append(f)
        if t - self.t0 >= self.seconds and len(self.samples) >= self.min_samples:
            self.done = True
        return self.done

    def result(self) -> Baseline:
        med = lambda name: float(np.median([getattr(s, name) for s in self.samples]))
        return Baseline(**{k: med(k) for k in asdict(Baseline()).keys()})


@dataclass
class Result:
    state: str                       # FOCUSED | INTERESTED | CONFUSED | BORED | AWAY
    scores: Dict[str, float]         # điểm mượt 0..1 cho focused/interested/confused/bored
    cues: List[str] = field(default_factory=list)


def _c(x: float) -> float:
    return max(0.0, min(1.0, x))


class EngagementClassifier:
    def __init__(self, baseline: Baseline, cfg: Optional[dict] = None,
                 models: Optional[Dict[str, Optional[LinearModel]]] = None):
        self.b = baseline
        self.ref = asdict(baseline)
        ml = models if models is not None else load_models()
        self.m_smile, self.m_look = ml.get("smile"), ml.get("look")
        self.cfg = {**CONFIG, **(cfg or {})}
        self.win: Deque[Tuple[float, FrameFeatures]] = deque()
        self.state = "FOCUSED"
        self._cand, self._cand_since = "FOCUSED", 0.0
        self._last_seen: Optional[float] = None
        self._last_t: Optional[float] = None
        self.smooth = {"bored": 0.0, "confused": 0.0, "interested": 0.0}
        self.last = Result("FOCUSED", {"focused": 1.0, "interested": 0.0, "confused": 0.0, "bored": 0.0})

    # ------------------------------------------------------------------
    def _stats(self) -> Dict[str, float]:
        c, b = self.cfg, self.b
        fs = [f for _, f in self.win]
        n = max(1, len(fs))
        frac = lambda pred: sum(1 for f in fs if pred(f)) / n

        gaze_off = lambda f: math.hypot(f.gaze_x - b.gaze_x, 0.5 * (f.gaze_y - b.gaze_y))
        off = lambda f: (abs(f.yaw - b.yaw) > c["yaw_off"] or abs(f.pitch - b.pitch) > c["pitch_off"]
                         or gaze_off(f) > c["gaze_off"]
                         or (self.m_look is not None and self.m_look.hit(f, self.ref)))   # model học từ ảnh lookaway
        return {
            "eye": max(0.0, frac(lambda f: f.ear < c["ear_closed_ratio"] * b.ear) - c["normal_blink_frac"]),
            "yawn": frac(lambda f: f.mar > max(c["yawn_mar"], 4 * b.mar)),
            "down": frac(lambda f: f.pitch - b.pitch > c["pitch_down"]),
            "off": frac(off),
            "chin": frac(lambda f: f.hand == "chin"),
            "head": frac(lambda f: f.hand == "head"),
            "brow": max(0.0, frac(lambda f: f.brow_gap < c["brow_ratio"] * b.brow_gap
                                  or f.brow_eye < c["brow_ratio"] * b.brow_eye) - c["brow_noise_frac"]),
            # Khung đang ngáp (há miệng rất to) KHÔNG tính là cười: model smile nhầm ngáp thành cười,
            # mà Hứng thú >= 60% lại được ưu tiên bỏ qua Chán -> sẽ báo sai.
            "smile": frac(lambda f: self.m_smile is not None and self.m_smile.hit(f, self.ref)
                          and f.mar <= max(c["yawn_mar"], 4 * b.mar)),
        }

    def _score(self, s: Dict[str, float]):
        parts_b = {
            "eye": 0.25 * _c(s["eye"] / 0.30),
            "yawn": 0.25 * _c(s["yawn"] / 0.15),
            "down": 0.20 * _c(s["down"] / 0.50),
            "off": 0.25 * _c(s["off"] / 0.60),
            "chin": 0.05 * _c(s["chin"] / 0.50),
        }
        parts_c = {
            "brow": self.cfg["brow_confused_weight"] * _c(s["brow"] / 0.30),
            "head": 0.30 * _c(s["head"] / 0.25),
            "chin": 0.20 * _c(s["chin"] / 0.40),
        }
        # Bối rối chỉ có nghĩa khi vẫn đang nhìn màn hình
        k = 1.0 - 0.6 * _c(s["off"])
        parts_c = {n: v * k for n, v in parts_c.items()}
        interested = _c(s["smile"] / self.cfg["smile_frac_full"])
        return sum(parts_b.values()), parts_b, sum(parts_c.values()), parts_c, interested

    # ------------------------------------------------------------------
    def update(self, t: float, f: Optional[FrameFeatures]) -> Result:
        c = self.cfg
        dt = 0.0 if self._last_t is None else max(0.0, t - self._last_t)
        self._last_t = t

        if f is None:
            if self._last_seen is not None and t - self._last_seen > c["away_after_sec"]:
                self.state = "AWAY"
                self.last = Result("AWAY", {"focused": 0.0, "interested": 0.0, "confused": 0.0, "bored": 0.0}, ["no face"])
            return self.last
        self._last_seen = t
        if self.state == "AWAY":
            self.state, self._cand, self._cand_since = "FOCUSED", "FOCUSED", t

        self.win.append((t, f))
        while self.win and t - self.win[0][0] > c["window_sec"]:
            self.win.popleft()

        s = self._stats()
        bored, pb, confused, pc, interested = self._score(s)

        a = 1.0 - math.exp(-dt / c["smooth_tau"]) if dt > 0 else 1.0
        self.smooth["bored"] += a * (bored - self.smooth["bored"])
        self.smooth["confused"] += a * (confused - self.smooth["confused"])
        self.smooth["interested"] += a * (interested - self.smooth["interested"])
        sb, sc, si = self.smooth["bored"], self.smooth["confused"], self.smooth["interested"]

        focus_now = _c(1.0 - c["focus_gain"] * max(sb, sc))
        confused_ok = sc >= c["confused_threshold"] and focus_now < c["confused_focus_max"]
        if si >= c["interested_override"]:
            cand = "INTERESTED"          # hứng thú >= 90%: không xét các cảm xúc còn lại (kể cả bối rối > 25%)
        elif si >= c["interested_threshold"] and not confused_ok:
            cand = "INTERESTED"          # hứng thú 60-90%: thắng Chán, nhưng nhường Bối rối nếu bối rối đủ ngưỡng
        elif sb >= c["bored_threshold"] and sb >= sc:
            cand = "BORED"
        elif confused_ok:
            cand = "CONFUSED"
        else:
            cand = "FOCUSED"

        if cand != self._cand:
            self._cand, self._cand_since = cand, t
        hold = c["release_hold_sec"] if cand == "FOCUSED" else c["hold_sec"]
        if cand != self.state and t - self._cand_since >= hold:
            self.state = cand

        parts = (pb if self.state == "BORED" else pc if self.state == "CONFUSED"
                 else {"smile": si} if self.state == "INTERESTED" else {})
        cues = [CUE_NAMES[k] for k, v in sorted(parts.items(), key=lambda kv: -kv[1]) if v > 0.05]
        scores = {"focused": _c(1.0 - c["focus_gain"] * max(sb, sc)), "interested": _c(si),
                  "confused": _c(sc), "bored": _c(sb)}
        self.last = Result(self.state, scores, cues)
        return self.last
