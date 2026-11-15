"""Kiểm thử bộ phân loại ở nhịp ~5 khung/giây (frontend gửi lô 5 ảnh mỗi giây), không cần camera/MediaPipe."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.emotion_core.classifier import Baseline, Calibrator, EngagementClassifier, CONFIG
from app.emotion_core.features import FrameFeatures
from app.emotion_core.models_ml import load_models
from app.engine import CLASSIFIER_CFG, CALIB_SECONDS, CALIB_MIN_SAMPLES

B = Baseline()
def fr(**kw):
    d = dict(ear=B.ear, mar=B.mar, brow_gap=B.brow_gap, brow_eye=B.brow_eye, yaw=B.yaw, pitch=B.pitch,
             roll=B.roll, gaze_x=B.gaze_x, gaze_y=B.gaze_y, hand=None)
    d.update(kw); return FrameFeatures(**d)

FPS = 5
def run(make, seconds=10):
    clf = EngagementClassifier(B, cfg={**CONFIG, **CLASSIFIER_CFG}, models=load_models())
    r = None
    for i in range(seconds * FPS):
        r = clf.update(i / FPS, make(i / FPS))
    return r

def test_calibration_finishes():
    c = Calibrator(CALIB_SECONDS, CALIB_MIN_SAMPLES)
    done = [c.add(i / FPS, fr()) for i in range(8 * FPS)]
    assert any(done) and done.index(True) <= 5 * FPS + 1

def test_focused(): assert run(lambda i: fr()).state == "FOCUSED"
def test_bored_yawn_head_down(): assert run(lambda i: fr(mar=0.8, pitch=B.pitch + 0.2, ear=0.18)).state == "BORED"
def test_confused_hand_on_head(): assert run(lambda i: fr(hand="head", brow_gap=B.brow_gap * 0.8)).state == "CONFUSED"
def test_single_glitch_ignored():
    clf = EngagementClassifier(B, cfg={**CONFIG, **CLASSIFIER_CFG}, models=load_models())
    states = [clf.update(i / FPS, fr(mar=0.8, pitch=B.pitch + 0.2, ear=0.18) if i == 25 else fr()).state for i in range(12 * FPS)]
    assert "BORED" not in states[:25] and states[-1] == "FOCUSED", states
def test_away():
    clf = EngagementClassifier(B, cfg={**CONFIG, **CLASSIFIER_CFG}, models=load_models())
    for i in range(5 * FPS): clf.update(i / FPS, fr())
    r = None
    for i in range(5 * FPS, 8 * FPS): r = clf.update(i / FPS, None)
    assert r.state == "AWAY"

if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"): f(); print("PASS", n)
