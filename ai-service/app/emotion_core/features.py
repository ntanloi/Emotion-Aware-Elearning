"""Trích đặc trưng từ MediaPipe Face Mesh + Hands cho từng frame.

Mỗi frame cho ra một đối tượng FrameFeatures gồm các số đo hình học
(mắt, miệng, lông mày, hướng đầu, hướng nhìn) và việc tay có chạm vào
vùng mặt/đầu hay không.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional, Sequence

import numpy as np

# ---- Chỉ số landmark của MediaPipe Face Mesh (refine_landmarks=True) ----
EYE_A = [33, 160, 158, 133, 153, 144]      # p1..p6 của mắt A
EYE_B = [362, 385, 387, 263, 373, 380]     # p1..p6 của mắt B
EYE_A_LIDS = (159, 145)                    # mi trên, mi dưới
EYE_B_LIDS = (386, 374)
IRIS_1, IRIS_2 = 468, 473                  # tâm hai mống mắt
MOUTH_TOP, MOUTH_BOTTOM = 13, 14
MOUTH_LEFT, MOUTH_RIGHT = 61, 291
NOSE_TIP, CHIN = 4, 152
CHEEK_L, CHEEK_R = 234, 454
BROW_INNER = (107, 336)                    # hai đầu lông mày phía trong
BROW_MID = (105, 334)                      # giữa lông mày
EYE_TOP_FOR_BROW = (159, 386)


@dataclass
class FrameFeatures:
    ear: float          # Eye Aspect Ratio (nhỏ = nhắm mắt)
    mar: float          # Mouth Aspect Ratio (lớn = há miệng/ngáp)
    brow_gap: float     # khoảng cách 2 đầu lông mày / bề rộng mặt (nhỏ = cau mày)
    brow_eye: float     # khoảng cách lông mày - mắt / bề rộng mặt (nhỏ = nhíu/hạ mày)
    yaw: float          # quay trái/phải (tỉ lệ, 0 = nhìn thẳng)
    pitch: float        # cúi/ngẩng (tỉ lệ, tăng = cúi xuống)
    roll: float         # nghiêng đầu (độ)
    gaze_x: float       # lệch mống mắt ngang so với tâm mắt
    gaze_y: float       # lệch mống mắt dọc
    hand: Optional[str] # None | "head" | "chin" | "cheek"
    # --- đặc trưng nụ cười (dùng cho model INTERESTED), mặc định 0 để code/test cũ vẫn chạy ---
    mouth_w: float = 0.0   # bề rộng miệng / bề rộng mặt (cười -> tăng)
    lift: float = 0.0      # khóe miệng nâng lên so với giữa miệng / bề rộng mặt (cười -> tăng)
    cheek: float = 0.0     # khoảng cách khóe miệng - mi dưới / bề rộng mặt (cười -> má nâng -> giảm)


def _d(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


def _ear(p: np.ndarray, idx: Sequence[int]) -> float:
    p1, p2, p3, p4, p5, p6 = (p[i] for i in idx)
    return (_d(p2, p6) + _d(p3, p5)) / (2.0 * _d(p1, p4) + 1e-6)


def _iris_ratio(p: np.ndarray, iris_idx: int, eye: Sequence[int], lids: Sequence[int]):
    """Vị trí mống mắt trong mắt: (0..1, 0..1), 0.5 = giữa mắt."""
    c = p[iris_idx]
    x0, x1 = sorted((p[eye[0]][0], p[eye[3]][0]))
    top, bot = p[lids[0]][1], p[lids[1]][1]
    rx = (c[0] - x0) / (x1 - x0 + 1e-6)
    ry = (c[1] - top) / (bot - top + 1e-6)
    return rx, ry


def _gaze(p: np.ndarray):
    if len(p) < 478:
        return 0.0, 0.0
    ctr_a = p[[EYE_A[0], EYE_A[3]]].mean(axis=0)
    # ghép mỗi mống mắt với mắt gần nó nhất (tránh nhầm trái/phải)
    if _d(p[IRIS_1], ctr_a) < _d(p[IRIS_2], ctr_a):
        i_a, i_b = IRIS_1, IRIS_2
    else:
        i_a, i_b = IRIS_2, IRIS_1
    ax, ay = _iris_ratio(p, i_a, EYE_A, EYE_A_LIDS)
    bx, by = _iris_ratio(p, i_b, EYE_B, EYE_B_LIDS)
    return (ax + bx) / 2 - 0.5, (ay + by) / 2 - 0.5


def _hand_contact(p: np.ndarray, hands_px: Sequence[np.ndarray]) -> Optional[str]:
    """Tay có nằm trong vùng mặt không, và ở vùng nào (đầu / cằm-miệng / má)."""
    x0, y0 = p.min(axis=0)
    x1, y1 = p.max(axis=0)
    fw, fh = x1 - x0, y1 - y0
    mx, my = 0.12 * fw, 0.25 * fh                  # mở rộng lên trên để bắt tay gãi đầu
    eye_y = p[[EYE_A[0], EYE_B[3]]][:, 1].mean()
    mouth_y = p[MOUTH_BOTTOM][1]
    best, best_n = None, 0
    for h in hands_px:
        votes = {"head": 0, "chin": 0, "cheek": 0}
        for pt in h:
            if x0 - mx <= pt[0] <= x1 + mx and y0 - my <= pt[1] <= y1 + 0.1 * fh:
                if pt[1] < eye_y - 0.05 * fh:
                    votes["head"] += 1
                elif pt[1] > mouth_y - 0.02 * fh:
                    votes["chin"] += 1
                else:
                    votes["cheek"] += 1
        n = sum(votes.values())
        if n >= 3 and n > best_n:           # cần >= 3 điểm bàn tay trong vùng mặt
            best, best_n = max(votes, key=votes.get), n
    return best


def extract(face_landmarks, hands_landmarks, w: int, h: int) -> FrameFeatures:
    p = np.array([[lm.x * w, lm.y * h] for lm in face_landmarks.landmark], dtype=np.float32)
    face_w = _d(p[CHEEK_L], p[CHEEK_R]) + 1e-6

    ear = (_ear(p, EYE_A) + _ear(p, EYE_B)) / 2
    mar = _d(p[MOUTH_TOP], p[MOUTH_BOTTOM]) / (_d(p[MOUTH_LEFT], p[MOUTH_RIGHT]) + 1e-6)

    brow_gap = _d(p[BROW_INNER[0]], p[BROW_INNER[1]]) / face_w
    brow_eye = (_d(p[BROW_MID[0]], p[EYE_TOP_FOR_BROW[0]]) +
                _d(p[BROW_MID[1]], p[EYE_TOP_FOR_BROW[1]])) / 2 / face_w

    # Hướng đầu ước lượng bằng hình học 2D (đủ ổn khi có hiệu chỉnh baseline)
    yaw = (p[NOSE_TIP][0] - (p[CHEEK_L][0] + p[CHEEK_R][0]) / 2) / face_w
    eye_mid = (p[EYE_A[0]] + p[EYE_B[3]]) / 2
    pitch = (p[NOSE_TIP][1] - eye_mid[1]) / (p[CHIN][1] - eye_mid[1] + 1e-6)
    dx, dy = p[EYE_B[3]] - p[EYE_A[0]]
    roll = math.degrees(math.atan2(dy, dx))
    if roll > 90:
        roll -= 180
    elif roll < -90:
        roll += 180

    gx, gy = _gaze(p)

    hands_px = []
    for hl in hands_landmarks or []:
        hands_px.append(np.array([[lm.x * w, lm.y * h] for lm in hl.landmark], dtype=np.float32))
    hand = _hand_contact(p, hands_px)

    mouth_w = _d(p[MOUTH_LEFT], p[MOUTH_RIGHT]) / face_w
    lift = ((p[MOUTH_TOP][1] + p[MOUTH_BOTTOM][1]) / 2 - (p[MOUTH_LEFT][1] + p[MOUTH_RIGHT][1]) / 2) / face_w
    cheek = (_d(p[MOUTH_LEFT], p[EYE_A_LIDS[1]]) + _d(p[MOUTH_RIGHT], p[EYE_B_LIDS[1]])) / 2 / face_w

    return FrameFeatures(ear, mar, brow_gap, brow_eye, yaw, pitch, roll, gx, gy, hand,
                         float(mouth_w), float(lift), float(cheek))
