# E-Learning tích hợp AI nhận diện cảm xúc học viên

Project khởi tạo cho khóa luận: E-Learning (React + Spring Boot + MySQL) tích hợp nhận diện
cảm xúc học viên qua webcam để tính điểm tập trung, sinh báo cáo và gợi ý học tập.

**Trạng thái hiện tại:** frontend + backend + database đã setup đầy đủ, chạy được ngay với
AI giả lập (mock). Phần AI thật (model tự train) là chỗ trống có chủ đích, để bạn/đồng đội
cắm vào sau — xem mục "Tích hợp AI" bên dưới.

## Cấu trúc thư mục

```
elearning-emotion-ai/
├── backend/          # Spring Boot (Java) — API, business logic, database access
├── frontend/          # React (Vite) — giao diện web
├── ai-service/        # Python (FastAPI) — STUB, chỗ để cắm model AI đã train vào
└── docs/
    ├── erd.md                    # ERD đầy đủ (cập nhật so với bản face-api.js ban đầu)
    └── ai-service-contract.md    # hợp đồng API để giao việc cho người train AI
```

Mỗi thư mục con (`backend/`, `frontend/`, `ai-service/`) có README riêng giải thích chi tiết
cấu trúc bên trong và cách chạy.

## Vì sao có 3 service thay vì 2?

Vì AI tự train (khác với face-api.js) không chạy được trong trình duyệt — nó cần một service
Python riêng để suy luận. Backend đóng vai trò trung gian: nhận yêu cầu từ frontend, gọi sang
`ai-service` để lấy nhãn cảm xúc, rồi lưu kết quả. Frontend **không bao giờ gọi thẳng**
`ai-service`. Chi tiết kiến trúc và lý do đổi ERD nằm ở `docs/erd.md`.

## Cách chạy Project

1. **Database**: cài MySQL 8, tạo database `elearning_emotion`.
2. **ai-service**: `cd ai-service && pip install -r requirements.txt && uvicorn main:app --reload --port 8000`
3. **backend**: `cd backend && cp .env.example .env` (chỉnh nếu cần) rồi `mvn spring-boot:run`
4. **frontend**: `cd frontend && cp .env.example .env && npm install && npm run dev`

Xem chi tiết trong README của từng thư mục.

## Tích hợp AI — giao việc cho người train model

1. Đưa họ file `docs/ai-service-contract.md` — đó là toàn bộ những gì họ cần biết
   (không cần đọc code Spring Boot hay React).
2. Họ implement đúng endpoint `POST /predict` trong `ai-service/main.py` (đã có sẵn khung + TODO).
3. Khi xong, chỉ cần đổi 1 dòng `@Primary` trong
   `backend/.../service/emotion/AiServiceRestClient.java` để backend chuyển từ dùng nhãn giả lập
   sang gọi AI thật — **không phải sửa gì ở frontend, database, hay các controller khác**.

Nhờ thiết kế theo interface (`EmotionRecognitionClient`), việc bạn làm frontend/backend trước
và AI sau **không ảnh hưởng gì tới tiến độ hay chất lượng project** — đây là cách tổ chức công
việc song song rất phổ biến trong các dự án thật.

## Điều đã đổi so với thiết kế ban đầu (face-api.js)

Xem đầy đủ trong `docs/erd.md`. Tóm tắt: thêm bảng `AI_MODELS` (đăng ký phiên bản model) và
2 cột trên `EMOTION_LOGS` (`model_id`, `raw_scores`). Không có bảng nào bị xóa hay đổi cấu trúc.
