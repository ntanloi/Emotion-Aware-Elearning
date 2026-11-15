# ai-service (lõi emotion_demo)

Thay thế ai-service cũ (MobileNetV3/torch) bằng lõi **emotion_demo**: MediaPipe FaceMesh + Hands → luật hình học
+ 2 model logistic-regression JSON (`models/smile.json`, `models/lookaway.json`). Không cần torch/timm.

Giữ NGUYÊN các endpoint cũ nên frontend không đổi API:

| Endpoint | Dùng bởi |
|---|---|
| `POST /v1/predict-batch` | backend `AiServiceRestClient` (nhận diện cảm xúc) |
| `POST /predict` | fallback legacy |
| `POST /v1/vocab/check`, `POST /v1/text/lemma` | backend kiểm duyệt từ vựng (giữ nguyên code cũ) |
| `GET /health`, `GET /model-info`, `POST /reload-model` | kiểm tra / nạp lại model |
| `POST /v1/sessions/{id}/recalibrate`, `/end` | tùy chọn |

## Chạy
```
cd ai-service
py -3.11 -m venv venv          # Python 3.9–3.12 (mediapipe 0.10.14 chưa hỗ trợ 3.13)
venv\Scripts\activate
pip install -r requirements.txt
python -m nltk.downloader wordnet cmudict omw-1.4 punkt   # cho kiểm duyệt từ vựng
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Hoặc chạy `start-ai-service.bat`. Mở http://localhost:8000/health → `"engine_ready": true`, `"ml_models": {"smile": true, "look": true}`.

## Cách hoạt động trong hệ thống
Frontend (1 ảnh/giây) → backend `/api/sessions/{id}/frames/batch` → ai-service `/v1/predict-batch` (kèm `session_id`).
- ~4 giây đầu mỗi phiên là **hiệu chỉnh** baseline của học viên (trả ENGAGED), sau đó phân loại.
- Mỗi `session_id` có baseline + cửa sổ thời gian (4 khung) riêng. Phiên im lặng > 15 phút tự xóa.
- Ánh xạ: FOCUSED→ENGAGED, INTERESTED, CONFUSED, BORED, AWAY→NO_FACE.
- `confidence` được ánh xạ về 0.5–1.0 vì backend loại mẫu < 0.5 khỏi báo cáo.

## Chỉnh độ nhạy (biến môi trường, xem `.env.example`)
`AI_CONFUSED_THRESHOLD` (tăng nếu báo Bối rối nhầm), `AI_BORED_THRESHOLD` (giảm nếu Chán khó lên),
`AI_INTERESTED_THRESHOLD`, `AI_WINDOW_SEC`, `AI_CALIB_SEC`. Ngưỡng chi tiết hơn: `app/emotion_core/classifier.py` → `CONFIG`.

## Train lại model (tùy chọn)
`pip install scikit-learn` → `python tools/extract_features.py --ai-service <thư mục ai-service cũ> [--extra ...]`
→ `python tools/train_models.py --csv features.csv` → gọi `POST /reload-model` (không cần restart).

## Test
`python tests/test_emotion_core.py` và `python tests/test_engine_5fps.py`
