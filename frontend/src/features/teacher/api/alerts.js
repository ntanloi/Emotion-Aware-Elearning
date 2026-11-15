import api from '@shared/api/client.js'

/**
 * Lấy danh sách cảnh báo đoạn bài giảng của giảng viên
 * @param {string} [status] OPEN | ACKED | RESOLVED
 */
export async function getTeacherAlerts(status) {
  const params = status ? { status } : {}
  const res = await api.get('/teacher/alerts', { params })
  return res.data
}

/**
 * Đếm số lượng cảnh báo OPEN
 */
export async function getOpenAlertsCount() {
  const res = await api.get('/teacher/alerts/count-open')
  return res.data?.openAlerts || 0
}

/**
 * Lấy cảnh báo cho 1 bài giảng cụ thể
 */
export async function getLessonAlerts(lessonId) {
  const res = await api.get(`/teacher/alerts/lesson/${lessonId}`)
  return res.data
}

/**
 * Cập nhật trạng thái cảnh báo (ACKED | RESOLVED)
 */
export async function updateAlertStatus(alertId, status) {
  const res = await api.put(`/teacher/alerts/${alertId}/status`, { status })
  return res.data
}

/**
 * Chạy quét cảnh báo tức thời
 */
export async function triggerAlertScan() {
  const res = await api.post('/teacher/alerts/scan')
  return res.data
}

/**
 * Sinh dữ liệu mẫu test cảnh báo (Demo KLTN)
 */
export async function seedDemoAlerts(contentItemId, studentCount = 20) {
  const params = { studentCount }
  if (contentItemId) params.contentItemId = contentItemId
  const res = await api.post('/teacher/alerts/demo-seed', null, { params })
  return res.data
}
