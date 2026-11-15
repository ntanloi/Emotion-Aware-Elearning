"""Bước 1: biến ảnh trong dataset của ai-service thành bảng đặc trưng MediaPipe (features.csv).

Chạy (trong thư mục emotion_demo, đã kích hoạt venv):
    python tools/extract_features.py --ai-service D:\\path\\to\\ai-service
    # thêm ảnh của chính bạn (khuyên dùng):  --extra lookaway=D:\\anh_cua_toi\\nhin_di  --extra interested=D:\\anh_cua_toi\\cuoi
Mỗi dòng CSV = 1 ảnh có tìm được khuôn mặt. Ảnh không thấy mặt sẽ bị bỏ (có báo tỉ lệ).
"""
import argparse
import csv
import glob
import os
import re
import sys
from collections import defaultdict

import cv2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import mediapipe as mp  # noqa: E402
from app.emotion_core.features import extract  # noqa: E402

FIELDS = ["cls", "group", "file", "ear", "mar", "brow_gap", "brow_eye", "yaw", "pitch", "roll",
          "gaze_x", "gaze_y", "mouth_w", "lift", "cheek"]


def group_of(cls: str, name: str) -> str:
    """bored được tách theo tên file: noface_lookingaway_* -> lookaway, bored_drowsy_* -> drowsy ..."""
    if cls != "bored":
        return cls
    n = name.lower()
    if "lookingaway" in n or "lookaway" in n:
        return "lookaway"
    if "drowsy" in n:
        return "drowsy"
    if n.startswith("user_"):
        return "bored_user"
    return "bored_other"


def collect(ai: str, extra, use_raw: bool = False):
    """Mặc định: interested + bored lấy từ dataset_clean (bộ đã làm sạch).
    dataset_clean KHÔNG có ảnh engaged/confused, mà train model cần cả ảnh "không cười / nhìn thẳng"
    làm mẫu âm, nên engaged + confused buộc phải lấy từ data/dataset_5classes.
    --use-raw: lấy thêm interested/bored thô trong data/dataset_5classes (nhiều ảnh hơn nhưng chưa làm sạch)."""
    # Thứ tự quan trọng: interested/bored xử lý TRƯỚC. dataset_clean đã chuyển 162 ảnh đang cười từ engaged sang
    # interested; vì trùng tên file nên engaged thô sẽ tự loại các ảnh đó (tránh vừa là mẫu dương vừa là mẫu âm).
    spec = {
        "interested": ["dataset_clean/1_interested"] + (["data/dataset_5classes/1_interested"] if use_raw else []),
        "bored": ["dataset_clean/3_bored"] + (["data/dataset_5classes/3_bored"] if use_raw else []),
        "engaged": ["data/dataset_5classes/0_engaged"],
        "confused": ["data/dataset_5classes/2_confused"],
    }
    items, seen = [], set()
    for cls, folders in spec.items():
        for fo in folders:
            for f in sorted(glob.glob(os.path.join(ai, fo, "*.*"))):
                if not f.lower().endswith((".jpg", ".jpeg", ".png")) or os.path.basename(f) in seen:
                    continue
                seen.add(os.path.basename(f))
                items.append((cls, group_of(cls, os.path.basename(f)), f))
    for e in extra:
        label, folder = e.split("=", 1)
        grp = "lookaway" if label == "lookaway" else label
        cls = "bored" if label == "lookaway" else label
        for f in sorted(glob.glob(os.path.join(folder, "*.*"))):
            if f.lower().endswith((".jpg", ".jpeg", ".png")):
                items.append((cls, "own_" + grp, f))
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ai-service", required=True, help="đường dẫn thư mục ai-service (đã giải nén)")
    ap.add_argument("--extra", action="append", default=[], help="nhãn=thư_mục, nhãn: engaged|interested|confused|bored|lookaway")
    ap.add_argument("--use-raw", action="store_true", help="lấy thêm interested/bored thô từ data/dataset_5classes")
    ap.add_argument("--out", default="features.csv")
    ap.add_argument("--pad", type=float, default=0.4, help="viền thêm quanh ảnh crop mặt để MediaPipe dò được")
    a = ap.parse_args()

    items = collect(a.ai_service, a.extra, a.use_raw)
    if not items:
        raise SystemExit("Không thấy ảnh nào. Kiểm tra lại đường dẫn --ai-service.")
    fm = mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True,
                                         min_detection_confidence=0.3)
    ok, total = defaultdict(int), defaultdict(int)
    with open(a.out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS)
        w.writeheader()
        for cls, grp, path in items:
            total[grp] += 1
            im = cv2.imread(path)
            if im is None:
                continue
            p = int(a.pad * max(im.shape[:2]))
            im = cv2.copyMakeBorder(im, p, p, p, p, cv2.BORDER_CONSTANT, value=(127, 127, 127))
            h, wd = im.shape[:2]
            r = fm.process(cv2.cvtColor(im, cv2.COLOR_BGR2RGB))
            if not r.multi_face_landmarks:
                continue
            f = extract(r.multi_face_landmarks[0], None, wd, h)
            w.writerow({"cls": cls, "group": grp, "file": os.path.basename(path), "ear": f.ear, "mar": f.mar,
                        "brow_gap": f.brow_gap, "brow_eye": f.brow_eye, "yaw": f.yaw, "pitch": f.pitch,
                        "roll": f.roll, "gaze_x": f.gaze_x, "gaze_y": f.gaze_y,
                        "mouth_w": f.mouth_w, "lift": f.lift, "cheek": f.cheek})
            ok[grp] += 1
    print("\nTỉ lệ tìm thấy mặt theo nhóm:")
    for g in total:
        print(f"  {g:14s} {ok[g]:4d}/{total[g]:4d}  ({100 * ok[g] / max(total[g], 1):.0f}%)")
    print("Đã ghi", a.out)


if __name__ == "__main__":
    main()
