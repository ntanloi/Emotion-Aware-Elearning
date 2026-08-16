# frontend — React (Vite)

## Cấu trúc thư mục

```
frontend/
├── index.html
├── vite.config.js
├── .env.example
└── src/
    ├── main.jsx          # entry point
    ├── App.jsx           # định nghĩa route
    ├── styles.css         # style dùng chung (dark theme đơn giản)
    ├── api/               # 1 file / nhóm endpoint, gọi qua axios (client.js tự đính JWT)
    ├── context/
    │   └── AuthContext.jsx
    ├── components/
    │   ├── Layout.jsx
    │   └── EmotionCameraCapture.jsx   # ⭐ nơi bắt webcam & gửi khung hình — xem kỹ file này
    └── pages/             # 1 trang / route
```

## ⭐ `components/EmotionCameraCapture.jsx`

Đây là component **duy nhất** thay đổi hành vi khi bạn chuyển từ face-api.js sang AI tự train,
vì nó là nơi quyết định: nhận diện ngay trên trình duyệt (face-api.js) hay chỉ chụp & gửi ảnh thô
đi nơi khác xử lý (AI tự train, chạy ở `ai-service`). Bản hiện tại đã viết theo hướng thứ hai —
đọc comment đầu file để hiểu rõ.

## Cách chạy

```bash
cp .env.example .env   # chỉnh VITE_API_BASE_URL nếu backend không chạy ở localhost:8080
npm install
npm run dev
```

Mặc định chạy ở `http://localhost:5173`, gọi API tới `http://localhost:8080/api`.

Lưu ý: trình duyệt chỉ cho phép truy cập camera (`getUserMedia`) trên `https://` hoặc
`localhost` — chạy trên `localhost` khi dev là an toàn, nhưng khi deploy thật phải có HTTPS.
