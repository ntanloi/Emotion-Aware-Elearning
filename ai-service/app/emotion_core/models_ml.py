"""Model máy học nhẹ cho emotion_demo (chạy bằng numpy, không cần torch/sklearn lúc chạy).

Hai model được train từ dataset của ai-service (xem tools/train_models.py) rồi xuất ra JSON:
  models/smile.json     -> xác suất đang cười  => trạng thái INTERESTED (hứng thú)
  models/lookaway.json  -> xác suất quay mặt/liếc đi chỗ khác => tín hiệu "looking away" của BORED

Cả hai là logistic regression trên đặc trưng hình học của MediaPipe, tính theo mức nền (baseline)
của chính người dùng, nên không phụ thuộc ảnh màu/xám hay độ phân giải.
Nếu thiếu file JSON thì model tương ứng bị tắt và chương trình chạy như cũ.
"""
from __future__ import annotations

import json
import math
import os
from typing import Dict, Optional

import numpy as np

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "models"))

SMILE_FEATURES = ["d_mouth_w", "d_lift", "d_cheek", "d_mar", "ear_ratio"]
LOOK_FEATURES = ["abs_yaw", "abs_gaze_x", "abs_gaze_y", "abs_pitch"]


def smile_vector(f, ref: Dict[str, float]):
    """f: FrameFeatures (hoặc đối tượng có cùng thuộc tính); ref: mức nền (baseline) dạng dict."""
    return [f.mouth_w - ref["mouth_w"], f.lift - ref["lift"], f.cheek - ref["cheek"],
            f.mar - ref["mar"], f.ear / max(ref["ear"], 1e-6)]


def look_vector(f, ref: Dict[str, float]):
    return [abs(f.yaw - ref["yaw"]), abs(f.gaze_x - ref["gaze_x"]),
            abs(f.gaze_y - ref["gaze_y"]), abs(f.pitch - ref["pitch"])]


VECTORS = {"smile": smile_vector, "look": look_vector}


class LinearModel:
    def __init__(self, kind: str, mean, std, coef, intercept: float, threshold: float = 0.5):
        self.kind = kind
        self.mean = np.asarray(mean, dtype=np.float64)
        self.std = np.where(np.asarray(std, dtype=np.float64) < 1e-9, 1.0, np.asarray(std, dtype=np.float64))
        self.coef = np.asarray(coef, dtype=np.float64)
        self.intercept = float(intercept)
        self.threshold = float(threshold)

    @classmethod
    def from_dict(cls, d: dict) -> "LinearModel":
        return cls(d["kind"], d["mean"], d["std"], d["coef"], d["intercept"], d.get("threshold", 0.5))

    @classmethod
    def load(cls, path: str) -> "LinearModel":
        with open(path, encoding="utf-8") as fh:
            return cls.from_dict(json.load(fh))

    def prob(self, f, ref: Dict[str, float]) -> float:
        x = (np.asarray(VECTORS[self.kind](f, ref), dtype=np.float64) - self.mean) / self.std
        z = float(x @ self.coef + self.intercept)
        return 1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, z))))

    def hit(self, f, ref: Dict[str, float]) -> bool:
        return self.prob(f, ref) >= self.threshold


def load_models(directory: str = MODELS_DIR) -> Dict[str, Optional[LinearModel]]:
    out: Dict[str, Optional[LinearModel]] = {"smile": None, "look": None}
    for key, fname in (("smile", "smile.json"), ("look", "lookaway.json")):
        path = os.path.join(directory, fname)
        if os.path.exists(path):
            try:
                out[key] = LinearModel.load(path)
            except Exception as e:          # file hỏng -> tắt model, không làm sập app
                print(f"[models_ml] Không nạp được {fname}: {e}")
    return out
