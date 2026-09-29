import apiClient from '@shared/api/client.js'

/** FR-LES-03/05/06: bắt đầu 1 lượt làm bài (câu hỏi thật hoặc câu hỏi ảo từ vựng) */
export const startAttempt = (contentItemId, practiceType) =>
  apiClient.post('/attempts', { contentItemId, practiceType }).then((r) => r.data)

export const submitAttempt = (attemptId, practiceType, answers) =>
  apiClient.post(`/attempts/${attemptId}/submit`, { practiceType, answers }).then((r) => r.data)

/**
 * Lịch sử điểm các lần làm bài (luồng phụ, mục 2.4 Bước 14).
 * LƯU Ý: backend hiện CHƯA có endpoint GET /api/attempts (theo user) — xem
 * docs/giai-doan-5-6-ghi-chu-doi-chieu.md. Gọi vẫn theo đúng path đã chốt để
 * sẵn sàng khi backend bổ sung; AnswerHistoryTable tự xử lý lỗi 404.
 */
export const myAttempts = () => apiClient.get('/attempts').then((r) => r.data)
