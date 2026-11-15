"""Kiểm thử logic phân loại bằng dữ liệu giả lập (không cần camera).
Chạy:  python tests/test_classifier.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.emotion_core.classifier import Baseline, EngagementClassifier
from app.emotion_core.features import FrameFeatures
from app.emotion_core.models_ml import LinearModel

B = Baseline()
NO_ML = {}   # tắt model ML để các test luật không phụ thuộc file trong models/

# model giả để kiểm thử cách tích hợp (không cần train)
SMILE = LinearModel("smile", [0] * 5, [1] * 5, [20, 0, 0, 0, 0], -1.0)   # cười khi miệng rộng hơn nền ~0.05
LOOK = LinearModel("look", [0] * 4, [1] * 4, [30, 0, 0, 0], -2.0)        # quay mặt khi |yaw| lệch nền ~0.07


def frame(**kw):
    d = dict(ear=B.ear, mar=B.mar, brow_gap=B.brow_gap, brow_eye=B.brow_eye, yaw=B.yaw, pitch=B.pitch,
             roll=B.roll, gaze_x=B.gaze_x, gaze_y=B.gaze_y, hand=None)
    d.update(kw)
    return FrameFeatures(**d)


def run(make, seconds=12, fps=15):
    clf, last = EngagementClassifier(B, models=NO_ML), None
    for i in range(int(seconds * fps)):
        last = clf.update(i / fps, make(i / fps))
    return last


def test_focused():
    r = run(lambda t: frame())
    assert r.state == "FOCUSED", r


def test_bored_yawn_and_head_down():
    r = run(lambda t: frame(mar=0.8, pitch=B.pitch + 0.2, ear=0.18))
    assert r.state == "BORED", r


def test_bored_looking_away_head_down():
    r = run(lambda t: frame(yaw=0.25, pitch=B.pitch + 0.2))
    assert r.state == "BORED", r


def test_confused_brow_and_hand_on_head():
    r = run(lambda t: frame(brow_gap=0.13, brow_eye=0.055, hand="head"))
    assert r.state == "CONFUSED", r


def test_confused_chin_brow():
    r = run(lambda t: frame(hand="chin", brow_gap=0.14))
    assert r.state == "CONFUSED", r


def test_head_tilt_is_ignored():
    # nghiêng đầu không còn ảnh hưởng cảm xúc nào
    assert run(lambda t: frame(roll=25)).state == "FOCUSED"
    assert run(lambda t: frame(roll=-25)).state == "FOCUSED"


def test_normal_blinks_stay_focused():
    r = run(lambda t: frame(ear=0.1 if int(t * 15) % 40 == 0 else B.ear))
    assert r.state == "FOCUSED", r


def test_away():
    clf = EngagementClassifier(B, models=NO_ML)
    for i in range(30):
        clf.update(i / 15, frame())
    for i in range(30, 100):
        r = clf.update(i / 15, None)
    assert r.state == "AWAY", r


def test_hysteresis_short_glitch_ignored():
    clf = EngagementClassifier(B, models=NO_ML)
    for i in range(60):
        clf.update(i / 15, frame())
    for i in range(60, 62):   # 0.13 giây nhiễu (2 khung) -> bỏ qua
        clf.update(i / 15, frame(mar=0.9, pitch=B.pitch + 0.2, ear=0.15))
    for i in range(62, 90):
        r = clf.update(i / 15, frame())
    assert r.state == "FOCUSED", r


def test_realtime_response_under_one_second():
    # tín hiệu ngáp + cúi đầu + nhắm mắt kéo dài: phải đổi sang BORED trong vòng ~1 giây
    clf = EngagementClassifier(B, models=NO_ML)
    for i in range(45):
        clf.update(i / 15, frame())
    t_on, got = 45 / 15, None
    for i in range(45, 120):
        r = clf.update(i / 15, frame(mar=0.9, pitch=B.pitch + 0.2, ear=0.15))
        if r.state == "BORED":
            got = i / 15 - t_on
            break
    assert got is not None and got <= 1.0, got


def run_ml(make, models, seconds=12, fps=15):
    clf, last = EngagementClassifier(B, models=models), None
    for i in range(int(seconds * fps)):
        last = clf.update(i / fps, make(i / fps))
    return last


def test_interested_needs_smile_model():
    smile = lambda t: frame(mouth_w=B.mouth_w + 0.10)
    assert run_ml(smile, {"smile": SMILE}).state == "INTERESTED"
    assert run_ml(smile, NO_ML).state == "FOCUSED"          # không có model -> chạy như cũ


def test_interested_overrides_others_when_over_60():
    # Quy tắc mới: hứng thú >= 60% được ưu tiên, bỏ qua Chán/Bối rối (vd cười + cúi đầu + híp mắt)
    r = run_ml(lambda t: frame(mouth_w=B.mouth_w + 0.10, pitch=B.pitch + 0.2, ear=0.18), {"smile": SMILE})
    assert r.state == "INTERESTED", r


def test_yawn_is_not_a_smile():
    # ngáp (há miệng to) không được tính là cười -> vẫn là BORED
    r = run_ml(lambda t: frame(mouth_w=B.mouth_w + 0.10, mar=0.8, pitch=B.pitch + 0.2, ear=0.18), {"smile": SMILE})
    assert r.state == "BORED", r


def test_lookaway_model_adds_bored_signal():
    # quay mặt nhẹ (dưới ngưỡng luật) + cúi nhẹ: luật tay bỏ lọt, model lookaway bắt được
    make = lambda t: frame(yaw=B.yaw + 0.10, pitch=B.pitch + 0.13)
    assert run_ml(make, NO_ML).state == "FOCUSED"
    assert run_ml(make, {"look": LOOK}).state == "BORED"


def test_lookaway_model_ignores_straight_face():
    assert run_ml(lambda t: frame(), {"look": LOOK, "smile": SMILE}).state == "FOCUSED"


def test_interested_over_90_beats_confused():
    # cười liên tục (hứng thú ~100%) + cau mày + tay chạm đầu + nghiêng đầu (bối rối > 25%) -> vẫn là HỨNG THÚ
    make = lambda t: frame(mouth_w=B.mouth_w + 0.10, brow_gap=0.13, brow_eye=0.055, hand="head")
    assert run_ml(make, {"smile": SMILE}).state == "INTERESTED"
    assert run(lambda t: frame(brow_gap=0.13, brow_eye=0.055, hand="head")).state == "CONFUSED"  # không cười -> vẫn bối rối


def test_brief_frown_is_not_confused():
    # cau mày thoáng qua (~30% thời gian, hay gặp khi đang tập trung) không được báo bối rối nữa
    clf = EngagementClassifier(B, models=NO_ML)
    states = set()
    for i in range(15 * 12):
        f = frame(brow_gap=0.13, brow_eye=0.055) if i % 10 < 3 else frame()
        r = clf.update(i / 15, f)
        if i >= 30:   # bỏ 2 giây đầu: cửa sổ còn quá ít khung nên tỉ lệ cau mày bị đẩy cao giả tạo
            states.add(r.state)
    assert "CONFUSED" not in states, states


def test_sustained_frown_alone_still_confused():
    # cau mày liên tục thì vẫn báo bối rối (chỉ khó hơn trước)
    assert run(lambda t: frame(brow_gap=0.13, brow_eye=0.055)).state == "CONFUSED"


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            try:
                fn(); print("PASS", name)
            except AssertionError as e:
                fails += 1; print("FAIL", name, e)
    sys.exit(1 if fails else 0)
