import apiClient from '@shared/api/client.js'

/** Lấy danh sách đề thi dành cho Admin kiểm duyệt */
export const listAdminTests = (params) =>
  apiClient.get('/admin/tests', { params }).then((r) => r.data)

/** Lấy chi tiết đề thi kèm câu hỏi, đáp án đúng và lời giải */
export const getAdminTestDetail = (id) =>
  apiClient.get(`/admin/tests/${id}`).then((r) => r.data)

/** Phê duyệt đề thi */
export const approveTest = (id) =>
  apiClient.post(`/admin/tests/${id}/approve`).then((r) => r.data)

/** Từ chối đề thi kèm lý do */
export const rejectTest = (id, reason) =>
  apiClient.post(`/admin/tests/${id}/reject`, { reason }).then((r) => r.data)

/** Gỡ bỏ / Ẩn đề thi vi phạm khỏi thư viện */
export const hideTest = (id, reason) =>
  apiClient.post(`/admin/tests/${id}/hide`, { reason }).then((r) => r.data)

/** Khởi tạo bộ 5 đề thi mẫu Hệ thống chuẩn ETS TOEIC */
export const seedSampleTests = () =>
  apiClient.post('/admin/tests/seed-samples').then((r) => r.data)

