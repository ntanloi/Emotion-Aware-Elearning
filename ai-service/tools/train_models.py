"""Bước 2: train 2 model nhẹ từ features.csv và xuất JSON vào models/.

    pip install scikit-learn
    python tools/train_models.py --csv features.csv

  models/smile.json     : "đang cười" (ảnh interested  vs  engaged/confused/bored)  -> INTERESTED
  models/lookaway.json  : "quay mặt/liếc đi" (ảnh lookaway vs engaged/interested/confused) -> tín hiệu BORED
"""
import argparse
import csv
import json
import math
import os
import sys
from types import SimpleNamespace

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.emotion_core.models_ml import LOOK_FEATURES, SMILE_FEATURES, VECTORS  # noqa: E402

NUM = ["ear", "mar", "brow_gap", "brow_eye", "yaw", "pitch", "roll", "gaze_x", "gaze_y", "mouth_w", "lift", "cheek"]


def load(path):
    rows = []
    with open(path, encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            o = SimpleNamespace(cls=r["cls"], group=r["group"], file=r["file"])
            for k in NUM:
                setattr(o, k, float(r[k]))
            rows.append(o)
    return rows


def population_ref(rows):
    """Mức nền 'trung bình' = trung vị của ảnh engaged (lúc chạy thật sẽ thay bằng baseline của từng người)."""
    eng = [r for r in rows if r.cls == "engaged"] or rows
    return {k: float(np.median([getattr(r, k) for r in eng])) for k in NUM}


def best_threshold(y, p, min_precision=0.85):
    """Chọn ngưỡng có F1 cao nhất nhưng ưu tiên precision (tránh báo nhầm)."""
    best = (0.5, -1.0)
    for t in np.linspace(0.2, 0.9, 71):
        pred = p >= t
        tp = int((pred & (y == 1)).sum()); fp = int((pred & (y == 0)).sum()); fn = int((~pred & (y == 1)).sum())
        prec = tp / max(tp + fp, 1); rec = tp / max(tp + fn, 1)
        f1 = 2 * prec * rec / max(prec + rec, 1e-9)
        score = f1 + (0.5 if prec >= min_precision else 0.0)
        if score > best[1]:
            best = (float(t), score)
    return best[0]


def prf(y, p, t):
    pred = p >= t
    tp = int((pred & (y == 1)).sum()); fp = int((pred & (y == 0)).sum()); fn = int((~pred & (y == 1)).sum())
    prec = tp / max(tp + fp, 1); rec = tp / max(tp + fn, 1)
    return prec, rec, 2 * prec * rec / max(prec + rec, 1e-9), tp, fp, fn


def fit(kind, feats, X, y, out_path, ref, notes):
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedKFold, cross_val_predict

    X, y = np.asarray(X, dtype=np.float64), np.asarray(y)
    mean, std = X.mean(0), X.std(0)
    std = np.where(std < 1e-9, 1.0, std)
    Z = (X - mean) / std
    clf = LogisticRegression(C=1.0, class_weight="balanced", max_iter=2000)
    n_splits = max(2, min(5, int(y.sum()), int((1 - y).sum())))
    pcv = cross_val_predict(clf, Z, y, cv=StratifiedKFold(n_splits, shuffle=True, random_state=0),
                            method="predict_proba")[:, 1]
    thr = best_threshold(y, pcv)
    prec, rec, f1, tp, fp, fn = prf(y, pcv, thr)
    clf.fit(Z, y)
    model = dict(kind=kind, features=feats, mean=mean.tolist(), std=std.tolist(), coef=clf.coef_[0].tolist(),
                 intercept=float(clf.intercept_[0]), threshold=thr,
                 cv=dict(precision=prec, recall=rec, f1=f1, n_pos=int(y.sum()), n_neg=int((1 - y).sum())),
                 population_ref=ref, notes=notes)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(model, fh, indent=2, ensure_ascii=False)
    print(f"\n[{kind}] mẫu dương={int(y.sum())}, âm={int((1 - y).sum())}  | CV {n_splits}-fold @ngưỡng {thr:.2f}: "
          f"precision={prec:.2f} recall={rec:.2f} F1={f1:.2f}  (TP={tp} FP={fp} FN={fn})")
    print("   hệ số:", {f: round(float(c), 2) for f, c in zip(feats, clf.coef_[0])})
    print("   đã lưu", out_path)
    return model


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="features.csv")
    ap.add_argument("--out-dir", default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models"))
    a = ap.parse_args()

    rows = load(a.csv)
    ref = population_ref(rows)
    print(f"Đọc {len(rows)} dòng. Mức nền dân số (từ ảnh engaged):", {k: round(v, 3) for k, v in ref.items()})

    # ---- 1) SMILE ----
    X = [VECTORS["smile"](r, ref) for r in rows]
    y = [1 if r.cls == "interested" else 0 for r in rows]
    if sum(y) >= 20:
        fit("smile", SMILE_FEATURES, X, y, os.path.join(a.out_dir, "smile.json"), ref,
            "dương = ảnh interested (thực chất là ảnh cười). Đặc trưng tính lệch so với baseline.")
    else:
        print("\n[smile] bỏ qua: cần >= 20 ảnh interested có tìm được mặt.")

    # ---- 2) LOOKAWAY ----
    pos = [r for r in rows if r.group in ("lookaway", "own_lookaway")]
    neg = [r for r in rows if r.cls in ("engaged", "interested", "confused")]
    if len(pos) >= 20 and neg:
        data = pos + neg
        X = [VECTORS["look"](r, ref) for r in data]
        y = [1] * len(pos) + [0] * len(neg)
        # So sánh với luật tay hiện có (yaw_off=0.12, pitch_off=0.15, gaze_off=0.17)
        rule = lambda r: (abs(r.yaw - ref["yaw"]) > 0.12 or abs(r.pitch - ref["pitch"]) > 0.15
                          or math.hypot(r.gaze_x - ref["gaze_x"], 0.5 * (r.gaze_y - ref["gaze_y"])) > 0.17)
        rp = np.mean([rule(r) for r in pos]); rn = np.mean([rule(r) for r in neg])
        print(f"\n[lookaway] luật tay hiện tại: bắt được {100 * rp:.0f}% ảnh lookaway, báo nhầm {100 * rn:.0f}% ảnh nhìn thẳng")
        n_own = sum(1 for r in pos if r.group == "own_lookaway")
        if n_own == 0:
            print("   ⚠ Ảnh lookaway của ai-service chủ yếu từ ít người -> model dễ học riêng khuôn mặt đó. "
                  "Nên thêm ảnh của bạn: --extra lookaway=<thư mục> ở bước extract.")
        fit("look", LOOK_FEATURES, X, y, os.path.join(a.out_dir, "lookaway.json"), ref,
            "dương = ảnh quay mặt/liếc đi chỗ khác; âm = engaged/interested/confused nhìn màn hình.")
    else:
        print(f"\n[lookaway] bỏ qua: cần >= 20 ảnh lookaway (đang có {len(pos)}).")
    print("\nXong. Chạy lại: python app.py --source droidcam")


if __name__ == "__main__":
    main()
