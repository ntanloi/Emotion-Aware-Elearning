# Hệ Thống E-Learning Nhận Diện Cảm Xúc và Kiểm Duyệt Khóa Học TOEIC

Hệ thống E-Learning toàn diện kết hợp:
1. **Nền tảng học tập & luyện thi TOEIC** (Video bài giảng, luyện tập theo Part 1–7, từ vựng, ngữ pháp, chép chính tả).
2. **AI nhận diện cảm xúc & mức độ tập trung học viên** qua webcam thời gian thực.
3. **Hệ thống Kiểm duyệt Nội dung Khóa học TOEIC 3 tầng** (Quy tắc mã nguồn xác định $\rightarrow$ Công cụ xử lý ngôn ngữ tự nhiên cục bộ $\rightarrow$ Tầng mô hình ngôn ngữ lớn LLM tùy chọn), đảm bảo tiêu chuẩn chất lượng ETS trước khi xuất bản.

---

## 1. Kiến Trúc Hệ Thống (5 Dịch Vụ)

```
                       ┌─────────────────────────┐
                       │   React + Vite (5173)   │
                       └────────────┬────────────┘
                                    │ HTTP / REST
                                    ▼
                       ┌─────────────────────────┐
                       │  Spring Boot App (8080) │
                       └───┬────────┬────────┬───┘
                           │        │        │
           ┌───────────────┘        │        └──────────────┐
           ▼                        ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│  MySQL 8.0 (3306)│    │LanguageTool(8010)│    │ ai-service Py (8000) │
└──────────────────┘    └──────────────────┘    └──────────┬───────────┘
                                                           │
                                                           ▼ (Tùy chọn)
                                                ┌──────────────────────┐
                                                │ LLM API (Gemini/GPT) │
                                                └──────────────────────┘
```

- **`frontend/`**: React 18, Vite, Tailwind CSS, Lucide icons, Axios. Cung cấp không gian cho Học viên, Giảng viên biên soạn khóa học, và Không gian Thẩm định dành cho Quản trị viên (Admin Moderation Workspace).
- **`backend/`**: Spring Boot 3.3.x, Java 17+, JPA / Hibernate, Flyway migration, Spring Security (JWT Stateless, Role-based `@PreAuthorize`).
- **`ai-service/`**: Python FastAPI phục vụ trích xuất âm thanh, phân tích NLP, lemmatization và suy luận cảm xúc học viên.
- **`languagetool`**: Máy chủ ngữ pháp tự lưu trữ độc lập (kiểm tra chính tả, ngữ pháp bài giảng tiếng Anh).
- **`mysql`**: MySQL 8.0 lưu trữ cơ sở dữ liệu với migration tự động qua Flyway (`ddl-auto: validate`).

---

## 2. Hướng Dẫn Khởi Chạy Nhanh

### Cách 1: Khởi chạy toàn bộ hệ thống bằng Docker Compose (Khuyến nghị)

1. Sao chép tệp cấu hình môi trường:
   ```bash
   cp .env.example .env
   ```
2. Khởi động 5 dịch vụ cùng lúc:
   ```bash
   docker compose up -d --build
   ```
3. Kiểm tra trạng thái sức khỏe các dịch vụ:
   ```bash
   docker compose ps
   ```
4. Truy cập giao diện ứng dụng:
   - **Frontend**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:8080](http://localhost:8080)
   - **LanguageTool**: [http://localhost:8010](http://localhost:8010)
   - **AI Microservice**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Cách 2: Khởi chạy từng dịch vụ cục bộ trên môi trường Dev (Local)

#### Bước 1: Cơ sở dữ liệu MySQL
- Tạo cơ sở dữ liệu: `CREATE DATABASE elearning_emotion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

#### Bước 2: AI Microservice (Python FastAPI)
```bash
cd ai-service
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Bước 3: LanguageTool Server (Tùy chọn cho tầng công cụ ngoài)
```bash
docker run -d -p 8010:8010 --name languagetool erikvl87/languagetool:latest
```

#### Bước 4: Backend (Spring Boot)
```bash
cd backend
# Cấu hình biến môi trường trong application.yml hoặc .env
mvn spring-boot:run
```

#### Bước 5: Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 3. Cấu Hình Biến Môi Trường (`.env`)

Mẫu cấu hình chi tiết tại [`.env.example`](file:///.env.example):

| Biến môi trường | Giá trị mặc định | Giải thích |
| :--- | :--- | :--- |
| `DB_HOST` | `localhost` (hoặc `mysql` trong Docker) | Địa chỉ máy chủ MySQL |
| `DB_PORT` | `3306` | Cổng kết nối MySQL |
| `DB_NAME` | `elearning_emotion` | Tên cơ sở dữ liệu |
| `DB_USER` | `root` | Tài khoản đăng nhập DB |
| `DB_PASSWORD` | `123456` | Mật khẩu DB |
| `SERVER_PORT` | `8080` | Cổng dịch vụ Spring Boot |
| `JWT_SECRET` | *(chuỗi bảo mật ≥ 32 ký tự)* | Khóa ký token JWT |
| `AI_SERVICE_URL` | `http://localhost:8000` | URL dịch vụ AI Microservice |
| `LANGUAGETOOL_URL`| `http://localhost:8010/v2/check` | URL máy chủ LanguageTool |
| `MODERATION_LLM_ENABLED` | `false` | Bật/tắt tầng LLM (AI-01..AI-08) |
| `MODERATION_LLM_PROVIDER`| `gemini` (hoặc `openai`) | Nhà cung cấp LLM |
| `MODERATION_LLM_MODEL` | `gemini-1.5-flash` | Định danh model LLM |
| `LLM_API_KEY` | *(trống)* | Khóa API dịch vụ LLM |

---

## 4. Kích Hoạt Tầng Kiểm Duyệt Bằng Mô Hình Ngôn Ngữ Lớn (Tùy Chọn)

Hệ thống hoạt động đầy đủ ngay cả khi **không bật LLM** (sử dụng 30+ quy tắc xác định và công cụ NLP cục bộ). Khi muốn bật tầng thẩm định ngữ nghĩa chuyên sâu (AI-01: Tính hợp lý của đáp án, AI-02: Tính mơ hồ của đề, AI-04: Đúng chủ điểm ngữ pháp, AI-06: An toàn văn hóa):

1. Đặt biến trong `.env`:
   ```properties
   MODERATION_LLM_ENABLED=true
   MODERATION_LLM_PROVIDER=gemini
   MODERATION_LLM_MODEL=gemini-1.5-flash
   LLM_API_KEY=AIzaSy...
   ```
2. Khởi động lại Backend.
3. Khi không cấu hình key hoặc gọi thất bại, hệ thống tự động suy thoái mềm (*Graceful Degradation*), không làm gián đoạn quy trình phê duyệt của giảng viên và quản trị viên.

---

## 5. Danh Sách API Endpoints Kiểm Duyệt Nội Dung

### A. Dành cho Giảng Viên (`ROLE_TEACHER`)

| Phương thức | Endpoint | Chức năng |
| :---: | :--- | :--- |
| `GET` | `/api/teacher/courses/{id}/readiness` | Báo cáo điều kiện sẵn sàng gửi duyệt (Checklist STR-01..STR-17, tính năng JumpTo) |
| `POST`| `/api/courses/{id}/submit` | Gửi khóa học lên hàng đợi kiểm duyệt (Khóa chuyển sang `PENDING_REVIEW`) |
| `POST`| `/api/courses/{id}/cancel-submit` | Rút lại yêu cầu duyệt để chỉnh sửa thêm (Khóa trở về `DRAFT`) |

### B. Dành cho Quản Trị Viên (`ROLE_ADMIN`)

| Phương thức | Endpoint | Chức năng |
| :---: | :--- | :--- |
| `GET` | `/api/admin/courses` | Danh sách khóa học cần duyệt kèm bộ lọc trạng thái và phân trang |
| `GET` | `/api/admin/courses/{id}/moderation` | Báo cáo kiểm duyệt chi tiết, tổng hợp danh sách issues và checklist |
| `GET` | `/api/admin/courses/{id}/readiness` | Xem báo cáo cấu trúc kỹ thuật của khóa học |
| `PUT` | `/api/admin/moderation/issues/{issueId}/decision` | Cập nhật quyết định cho issue (`ACCEPT` \| `DISMISS` \| `NEED_FIX`) |
| `POST`| `/api/admin/courses/{id}/approve` | Phê duyệt xuất bản khóa học (`PUBLISHED`) |
| `POST`| `/api/admin/courses/{id}/reject` | Từ chối khóa học kèm lý do chi tiết (`REJECTED`) |
| `GET` | `/api/admin/moderation/stats/rules` | Thống kê tỷ lệ chính xác của cảnh báo theo từng luật |
| `GET` | `/api/admin/lexicon` | Quản lý từ điển kiểm duyệt (tìm kiếm, lọc danh mục, phân loại vi phạm) |
| `POST`| `/api/admin/lexicon` | Thêm từ khóa mới vào từ điển kiểm duyệt |
| `PUT` | `/api/admin/lexicon/{id}` | Cập nhật mẫu từ khóa kiểm duyệt |
| `DELETE`| `/api/admin/lexicon/{id}` | Xóa hoặc tắt kích hoạt từ khóa kiểm duyệt |
| `GET` | `/api/admin/moderation/policies/active` | Xem chính sách kiểm duyệt đang có hiệu lực |
| `POST`| `/api/admin/moderation/policies` | Tạo và kích hoạt phiên bản chính sách mới |

---

## 6. Chính Sách Bảo Mật & Ràng Buộc Kiểm Duyệt Bắt Buộc

1. **Nhân sự duyệt luôn là con người:**
   - AI và các quy tắc kiểm tra chỉ tạo ra **cảnh báo lỗi nghi ngờ**.
   - Tuyệt đối không có cơ chế hệ thống tự động phê duyệt hoặc tự động từ chối khóa học.
2. **Quyền sở hữu và cô lập dữ liệu giữa giảng viên:**
   - Giảng viên chỉ có thể xem, sửa, và gửi duyệt các khóa học thuộc quyền sở hữu của chính mình.
   - Thao tác can thiệp chéo sẽ bị chặn với mã lỗi `403 Forbidden` / `SecurityException`.
3. **Bảo mật bản quyền chéo khóa học (Quy tắc DUP-02):**
   - Khi phát hiện câu hỏi hoặc đoạn văn trùng lặp chéo với khóa học khác (`DUP-02`), chỉ **Quản trị viên (Admin)** mới thấy ID và tiêu đề của khóa học nguồn để đối chiếu bản quyền.
   - **Giảng viên** chỉ nhận được thông báo ẩn danh: *"Phát hiện câu hỏi hoặc đoạn văn có độ tương đồng cao với nội dung đã có trên hệ thống"*, ngăn chặn việc rò rỉ thông tin khóa học của giảng viên khác.
4. **Khử độc mã HTML (XSS Sanitization):**
   - Toàn bộ nội dung mô tả, lý thuyết bài viết, bài đọc và bài nghe đều được tự động làm sạch qua `Jsoup` với danh sách thẻ an toàn (`Safelist.relaxed()`).
   - Mọi thẻ `<script>`, `<iframe>`, sự kiện `onerror`, và giao thức `javascript:` đều bị loại bỏ triệt để trước khi lưu vào DB.
5. **Không lưu trữ hay log bí mật:**
   - Khóa bí mật API, JWT secret, thông tin kết nối DB được nạp từ biến môi trường, tuyệt đối không in ra console log hay commit vào kho mã nguồn.

---

## 7. Các Việc Còn Tồn Đọng & Rủi Ro Đã Biết (Known Risks & Technical Debt)

1. **Dung lượng lưu trữ media lớn:**
   - Khóa học TOEIC chứa số lượng lớn tệp MP3 và hình ảnh. Trên môi trường production thực tế, nên cấu hình lưu trữ qua S3/MinIO thay vì lưu cục bộ thư mục `uploads/`.
2. **Chi phí và hạn mức khi bật tầng LLM:**
   - Khi bật tầng LLM trên các khóa học có hàng trăm câu hỏi, thời gian và chi phí API có thể tăng. Hệ thống đã giải quyết một phần bằng cách lưu cache băm nội dung SHA-256 (không gọi lại LLM nếu câu hỏi không đổi).
3. **Phụ thuộc kết nối mạng của LanguageTool:**
   - Khi chạy độc lập không có Docker, nếu máy dev không cài đặt sẵn LanguageTool cục bộ, các luật `TXT-11`, `GRM-05` sẽ tự động bypass và ghi log cảnh báo thay vì làm dừng luồng kiểm duyệt.
