# Tài liệu kiểm duyệt khóa học

| Tệp | Đặt ở đâu | Vai trò |
|---|---|---|
| `AGENTS.md` | **Gốc repo** (cạnh `backend/`, `frontend/`, `ai-service/`) | Quy ước dự án cho agent |
| `SPEC.md` | `docs/moderation/` | Đặc tả đầy đủ: luồng, dữ liệu, bộ luật, tiêu chí hoàn thành |
| `policy.default.json` | `docs/moderation/` | Chính sách mặc định (mọi con số) |
| `lexicon.seed.csv` | `docs/moderation/` | Từ điển từ khóa khởi đầu (159 dòng) |
| `grammar_topics.seed.csv` | `docs/moderation/` | Danh mục 24 chủ điểm ngữ pháp (bản nháp, cần rà soát) |
| `PROMPTS.md` | `docs/moderation/` | Prompt theo từng phase AG-0 đến AG-10 |

Bắt đầu: đọc `PROMPTS.md`, chạy phase **AG-0** (chỉ đọc, không sửa code), rồi đi tiếp theo thứ tự.

Định dạng tệp CSV: UTF-8 không BOM, dấu phân cách `,`, ô có dấu phẩy được bọc trong dấu ngoặc kép. Trong `grammar_topics.seed.csv`, các cột `keywords_en` và `keywords_vi` phân tách từ khóa bằng `|`.

**Chưa kiểm thử trên project thật:** các biểu thức chính quy trong từ điển đã được kiểm tra cú pháp bằng Python, nhưng Java có thể khác đôi chút; hãy chạy test tiếng Việt ở phase AG-5 trước khi tin kết quả.
