"""
FastAPI Server - AI Service nhận diện trạng thái học tập (lõi emotion_demo: MediaPipe + luật + model JSON).
GIỮ NGUYÊN hợp đồng API cũ nên backend/frontend không cần đổi đường dẫn:
  GET  /health, /model-info
  POST /v1/predict-batch   (chính)      POST /predict (legacy)
  POST /reload-model                    POST /v1/vocab/check, /v1/text/lemma (kiểm duyệt từ vựng)
Thêm mới: trường tùy chọn "session_id" để mỗi học viên có baseline/cửa sổ thời gian riêng.
"""
import os
import hmac
import logging
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .engine import engine, MODEL_VERSION, CLASSIFIER_CFG, CALIB_SECONDS, FRAME_SPACING_SEC
from .vocab_checker import check_word_details, get_word_lemmas

import time

logger = logging.getLogger("ai-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine.load()          # nạp MediaPipe + model JSON một lần
    yield


app = FastAPI(
    title="Emotion & Learning State Recognition AI Service",
    description="Microservice AI (emotion_demo core) phục vụ E-Learning AI",
    version="2.0.0",
    lifespan=lifespan,
)

_default_origins = "http://localhost:5173,http://localhost:8080,http://localhost:3000"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if "*" not in ALLOWED_ORIGINS else ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Internal-Secret"],
)

AI_SERVICE_SECRET = os.getenv("AI_SERVICE_SECRET", "").strip()
AI_ALLOW_NO_SECRET = os.getenv("AI_ALLOW_NO_SECRET", "true").lower() in ("true", "1", "yes")
if not AI_SERVICE_SECRET:
    if not AI_ALLOW_NO_SECRET:
        raise RuntimeError("Thiếu AI_SERVICE_SECRET (hoặc đặt AI_ALLOW_NO_SECRET=true CHỈ khi chạy dev).")
    logger.warning("AI_ALLOW_NO_SECRET=true: ai-service chạy KHÔNG có xác thực nội bộ (chỉ dùng cho dev).")


def verify_internal_secret(x_internal_secret: Optional[str] = Header(None)):
    if not AI_SERVICE_SECRET:
        return True
    provided = (x_internal_secret or "").strip()
    if not hmac.compare_digest(provided.encode("utf-8"), AI_SERVICE_SECRET.encode("utf-8")):
        raise HTTPException(status_code=403, detail="Forbidden: Khóa xác thực nội bộ AI Service không hợp lệ")
    return True


# --- Schemas (giữ nguyên + session_id tùy chọn) ---
class FrameItem(BaseModel):
    timestamp_ms: Optional[int] = None
    image: str = Field(..., description="Chuỗi ảnh base64 (data URL hoặc raw)")


class PredictBatchRequest(BaseModel):
    session_id: Optional[str] = Field(None, description="ID phiên học; thiếu thì mọi ảnh dùng chung phiên 'default'")
    frames: List[FrameItem] = Field(..., max_length=6)


class PredictionResultItem(BaseModel):
    learning_state: str
    emotion_label: str
    confidence: float
    binary_states: Dict[str, float]
    raw_emotion_scores: Dict[str, float]
    cues: List[str] = []


class PredictBatchResponse(BaseModel):
    model_version: str
    predictions: List[PredictionResultItem]


class LegacyPredictRequest(BaseModel):
    session_id: Optional[str] = None
    images: List[str]


class LegacyPredictResultItem(BaseModel):
    emotion_label: str
    confidence_score: float
    raw_scores: Dict[str, float]


class LegacyPredictResponse(BaseModel):
    model_version: str
    results: List[LegacyPredictResultItem]


NO_FACE_ITEM = dict(learning_state="NO_FACE", emotion_label="no_face", confidence=0.0,
                    binary_states={"engaged": 0.0, "bored": 0.0, "confused": 0.0}, raw_emotion_scores={}, cues=[])


def _run(session_id: Optional[str], images: List[str], ts_ms: List[Optional[int]]) -> List[dict]:
    sid = (session_id or "default").strip() or "default"
    n = len(images)
    now = time.monotonic()
    out = []
    for i, img in enumerate(images[:6]):
        # Backend không gửi timestamp -> dùng giờ máy chủ; ảnh trong cùng lô cách nhau FRAME_SPACING_SEC
        t = ts_ms[i] / 1000.0 if ts_ms[i] is not None else now - (n - 1 - i) * FRAME_SPACING_SEC
        try:
            out.append(engine.predict(sid, img, t))
        except Exception:
            logger.exception("Lỗi suy luận 1 khung hình")
            out.append(dict(NO_FACE_ITEM))
    return out


# Một lô nhiều ảnh (vd 5 ảnh/giây) là các khung LIÊN TIẾP của cùng 1 học viên: tất cả đều được đưa vào bộ phân loại
# để nó thấy đủ chuyển động, nhưng chỉ trả KẾT QUẢ CUỐI (1 dòng log/giây thay vì 5). AI_BATCH_RETURN=all để trả đủ.
BATCH_RETURN = os.getenv("AI_BATCH_RETURN", "last").lower()


def _collapse(preds: List[dict]) -> List[dict]:
    return preds[-1:] if (BATCH_RETURN != "all" and len(preds) > 1) else preds


# --- Endpoints ---
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "device": "cpu",
        "detector": "mediapipe-facemesh+hands",
        "is_mock": False,
        "allow_mock": False,
        "engine_ready": engine.ready,
        "ml_models": engine.model_status(),
        "active_sessions": engine.active_sessions(),
    }


@app.get("/model-info")
def model_info():
    return {
        "model_name": "MediaPipe rules + logistic-regression (emotion_demo)",
        "version": MODEL_VERSION,
        "backbone": "mediapipe-facemesh",
        "weights_source": "models/smile.json, models/lookaway.json",
        "thresholds": CLASSIFIER_CFG,
        "calibration_seconds": CALIB_SECONDS,
        "is_mock": False,
        "ml_models": engine.model_status(),
        "metrics_available": False,
        "metrics": None,
    }


@app.post("/v1/predict-batch", response_model=PredictBatchResponse, dependencies=[Depends(verify_internal_secret)])
def predict_batch(req: PredictBatchRequest):
    if not req.frames:
        return PredictBatchResponse(model_version=MODEL_VERSION, predictions=[])
    frames = req.frames[:6]
    preds = _run(req.session_id, [f.image for f in frames], [f.timestamp_ms for f in frames])
    preds = _collapse(preds)
    return PredictBatchResponse(model_version=MODEL_VERSION,
                                predictions=[PredictionResultItem(**p) for p in preds])


@app.post("/predict", response_model=LegacyPredictResponse, dependencies=[Depends(verify_internal_secret)])
def predict_legacy(req: LegacyPredictRequest):
    imgs = req.images[:6]
    preds = _collapse(_run(req.session_id, imgs, [None] * len(imgs)))
    return LegacyPredictResponse(model_version=MODEL_VERSION, results=[
        LegacyPredictResultItem(emotion_label=p["emotion_label"], confidence_score=p["confidence"],
                                raw_scores=p["raw_emotion_scores"]) for p in preds])


@app.post("/reload-model", dependencies=[Depends(verify_internal_secret)])
def reload_model():
    """Nạp lại models/*.json (sau khi train lại) mà không cần khởi động lại server."""
    engine.load()
    return {"status": "success", "message": "Đã nạp lại model", "is_mock": False, "ml_models": engine.model_status()}


@app.post("/v1/sessions/{session_id}/end", dependencies=[Depends(verify_internal_secret)])
def end_session(session_id: str):
    """(Tùy chọn) Giải phóng bộ nhớ phiên học khi học viên học xong."""
    return {"ended": engine.end_session(session_id)}


@app.post("/v1/sessions/{session_id}/recalibrate", dependencies=[Depends(verify_internal_secret)])
def recalibrate(session_id: str):
    """(Tùy chọn) Hiệu chỉnh lại baseline của phiên (khi học viên đổi tư thế/ánh sáng)."""
    return {"recalibrating": engine.recalibrate(session_id)}


# --- Phase AG-6: Vocab & Lemmatizer Schemas and Endpoints ---
class VocabCheckItem(BaseModel):
    word: str
    part_of_speech: Optional[str] = None
    ipa: Optional[str] = None


class VocabCheckRequest(BaseModel):
    words: List[VocabCheckItem]


class VocabCheckResultItem(BaseModel):
    word: str
    in_dictionary: bool
    valid_pos: List[str]
    pos_match: bool
    ipa_match: bool
    frequency_zipf: float
    is_rare: bool
    suggestions: List[str] = []


class VocabCheckResponse(BaseModel):
    results: List[VocabCheckResultItem]


class LemmaRequest(BaseModel):
    text: Optional[str] = None
    words: Optional[List[str]] = None


class LemmaResponse(BaseModel):
    lemmas: List[str]


@app.post("/v1/vocab/check", response_model=VocabCheckResponse,
          dependencies=[Depends(verify_internal_secret)])
def check_vocab(req: VocabCheckRequest):
    """
    Kiểm tra từ vựng tiếng Anh: tồn tại trong WordNet, khớp loại từ, khớp phiên âm CMUdict, tần suất wordfreq.
    """
    results = [
        VocabCheckResultItem(**check_word_details(item.word, item.part_of_speech, item.ipa))
        for item in req.words
    ]
    return VocabCheckResponse(results=results)


@app.post("/v1/text/lemma", response_model=LemmaResponse,
          dependencies=[Depends(verify_internal_secret)])
def get_lemmas(req: LemmaRequest):
    """
    Tách các từ trong câu văn hoặc danh sách từ về dạng gốc (lemmas).
    """
    lemmas = get_word_lemmas(text=req.text, words=req.words)
    return LemmaResponse(lemmas=lemmas)