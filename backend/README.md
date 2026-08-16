# backend — Spring Boot API

## Cấu trúc thư mục

```
backend/
├── pom.xml
├── .env.example
└── src/main/
    ├── java/com/elearning/emotion/
    │   ├── EmotionElearningApplication.java   # entry point
    │   ├── config/          # đọc application.yml, CORS, Spring Security
    │   ├── entity/          # 16 bảng JPA, map đúng ERD trong /docs/erd.md
    │   ├── repository/      # Spring Data JPA — 1 interface / bảng
    │   ├── dto/              # request/response body (record, không lộ entity ra ngoài)
    │   ├── controller/      # REST endpoint
    │   ├── service/         # business logic (auth, session lifecycle, focus_score...)
    │   ├── service/emotion/ # ⭐ ĐIỂM TÍCH HỢP AI — xem bên dưới
    │   ├── security/        # JWT
    │   └── exception/       # xử lý lỗi tập trung
    └── resources/
        ├── application.yml
        └── db/migration/V1__init_schema.sql   # Flyway tự chạy khi start app
```

## ⭐ Điểm tích hợp AI (đọc trước khi giao việc cho bạn của bạn)

Mọi thứ liên quan tới "gọi AI để nhận diện cảm xúc" đều đi qua 1 interface duy nhất:
`service/emotion/EmotionRecognitionClient.java`

- `MockEmotionRecognitionClient` — đang **active mặc định** (`@Primary`), trả nhãn giả lập.
  Nhờ vậy bạn build & demo trọn vẹn frontend + backend + database ngay bây giờ, không cần
  chờ model.
- `AiServiceRestClient` — gọi sang service Python thật (`/ai-service`). Khi bạn của bạn train
  xong và implement đúng hợp đồng ở `docs/ai-service-contract.md`, chỉ cần đổi `@Primary` từ
  Mock sang class này (xem comment trong file) — **không sửa gì ở controller, entity, frontend**.

## Cách chạy

1. Cài Java 17, Maven, MySQL 8.
2. Tạo database: `CREATE DATABASE elearning_emotion;`
3. Copy `.env.example` thành `.env` (hoặc export trực tiếp các biến môi trường), điều chỉnh nếu cần.
4. Chạy:
   ```bash
   mvn spring-boot:run
   ```
   Flyway sẽ tự tạo toàn bộ bảng ở lần chạy đầu tiên (`V1__init_schema.sql`).
5. API mặc định chạy ở `http://localhost:8080`.

Test nhanh:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyen Van A","email":"a@test.com","password":"123456","role":"STUDENT"}'
```
