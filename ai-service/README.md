# ai-service — Nơi bạn của bạn cắm model vào

Service Python (FastAPI) độc lập, expose duy nhất 1 endpoint `POST /predict` đúng theo
hợp đồng ở `../docs/ai-service-contract.md`.

## Việc cần làm khi có model đã train

Chỉ sửa trong `main.py`:
1. `load_model()` — load model đã train (PyTorch/TensorFlow/DeepFace...), chạy 1 lần lúc khởi động.
2. `infer_one()` — thay phần random bằng suy luận model thật (đã có ví dụ mẫu trong docstring).
3. Đổi `MODEL_VERSION` thành tên phiên bản thật, vd `"custom-cnn-fer2013-v1.0"` — giá trị này
   được backend lưu vào bảng `ai_models` để truy vết.

**Không cần đổi** field trong `PredictRequest`/`PredictResponse` — backend đã code cứng theo
đúng các field này (xem `AiServiceRestClient.java` phía backend).

## Chạy thử

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Kiểm tra:
```bash
curl http://localhost:8000/health
```

## Dataset & đánh giá offline (mục 7 trong đặc tả)

Phần thực nghiệm so sánh face-api.js vs model tự train (FER2013/CK+, accuracy, confusion matrix...)
KHÔNG nằm trong service này — đó là notebook/script chạy riêng, không phải API chạy production.
Có thể để trong `ai-service/experiments/` (tự tạo) khi tới lúc làm chương thực nghiệm.
