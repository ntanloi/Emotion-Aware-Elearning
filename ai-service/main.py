"""
AI Service — nhan dien cam xuc hoc vien.
Day la STUB de ban co the demo/tich hop ngay. Nguoi train AI chi can sua phan
duoc danh dau "TODO" - KHONG duoc doi request/response schema neu khong muon
backend (Spring Boot) phai sua theo.

Hop dong day du: xem docs/ai-service-contract.md o thu muc goc project.

Chay thu:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

import base64
import io
import random
from typing import List, Dict

from fastapi import FastAPI
from pydantic import BaseModel
from PIL import Image

app = FastAPI(title="Emotion Recognition AI Service")

EMOTION_LABELS = ["neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"]

# TODO: doi thanh phien ban model that cua ban, vi du "custom-cnn-fer2013-v1.0"
MODEL_VERSION = "stub-random-v0"


class PredictRequest(BaseModel):
    images: List[str]  # base64 data URLs, toi da 6 anh/lan theo BR-04


class PredictResultItem(BaseModel):
    emotion_label: str
    confidence_score: float
    raw_scores: Dict[str, float]


class PredictResponse(BaseModel):
    model_version: str
    results: List[PredictResultItem]


# TODO: load model that 1 lan khi service khoi dong (vd torch.load(...), tf.keras.models.load_model(...))
def load_model():
    # vi du:
    # global model
    # model = torch.load("emotion_cnn.pt", map_location="cpu")
    # model.eval()
    pass


def decode_base64_image(data_url: str) -> Image.Image:
    """Anh chi ton tai trong RAM, KHONG ghi ra dia — dung tinh than BR-08 (khong luu anh khuon mat)."""
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    raw = base64.b64decode(data_url)
    return Image.open(io.BytesIO(raw)).convert("RGB")


def infer_one(image: Image.Image) -> PredictResultItem:
    """
    TODO: thay toan bo ham nay bang suy luan model that. Vi du (PyTorch, minh hoa):

        tensor = preprocess(image)                # resize, normalize theo dung cach da train
        with torch.no_grad():
            logits = model(tensor.unsqueeze(0))
            probs = torch.softmax(logits, dim=1)[0]
        raw_scores = {label: float(probs[i]) for i, label in enumerate(EMOTION_LABELS)}
        label = max(raw_scores, key=raw_scores.get)
        return PredictResultItem(
            emotion_label=label,
            confidence_score=raw_scores[label],
            raw_scores=raw_scores,
        )

    Neu khong phat hien khuon mat trong anh, tra ve emotion_label="no_face".
    """
    # --- STUB: sinh ket qua ngau nhien de test end-to-end ---
    scores = [random.random() for _ in EMOTION_LABELS]
    total = sum(scores)
    raw_scores = {label: round(s / total, 4) for label, s in zip(EMOTION_LABELS, scores)}
    label = max(raw_scores, key=raw_scores.get)
    return PredictResultItem(
        emotion_label=label,
        confidence_score=raw_scores[label],
        raw_scores=raw_scores,
    )


@app.get("/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    results = []
    for data_url in req.images:
        try:
            image = decode_base64_image(data_url)
            results.append(infer_one(image))
        except Exception:
            # anh loi / khong doc duoc -> coi nhu khong phat hien khuon mat, khong lam sap service
            results.append(PredictResultItem(
                emotion_label="no_face", confidence_score=0.0, raw_scores={}
            ))
    return PredictResponse(model_version=MODEL_VERSION, results=results)
