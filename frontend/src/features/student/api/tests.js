import apiClient from '@shared/api/client.js'

/** Lấy danh sách đề thi công khai từ thư viện đề thi */
export const listTests = (params) =>
  apiClient.get('/tests', { params }).then((r) => r.data)

/** Lấy chi tiết thông tin một đề thi */
export const getTest = (id) =>
  apiClient.get(`/tests/${id}`).then((r) => r.data)

/** Bắt đầu một lượt làm bài thi TOEIC */
export const startTestAttempt = (data) =>
  apiClient.post('/test-attempts', data).then((r) => r.data)

/** Lấy nội dung câu hỏi và bài đọc của lượt làm bài (không lộ đáp án đúng) */
export const getAttemptContent = (attemptId) =>
  apiClient.get(`/test-attempts/${attemptId}/content`).then((r) => r.data)

/** Lưu nháp đáp án đang làm */
export const saveDraft = (attemptId, answers) =>
  apiClient.post(`/test-attempts/${attemptId}/save`, { answers }).then((r) => r.data)

/** Nộp bài thi */
export const submitAttempt = (attemptId, data) =>
  apiClient.post(`/test-attempts/${attemptId}/submit`, data).then((r) => r.data)

/** Xem lại kết quả và lời giải sau khi đã nộp */
export const getAttemptResult = (attemptId) =>
  apiClient.get(`/test-attempts/${attemptId}/result`).then((r) => r.data)

/** Danh sách lịch sử làm bài thi của học viên */
export const getMyTestAttempts = (params) =>
  apiClient.get('/test-attempts/mine', { params }).then((r) => r.data)
