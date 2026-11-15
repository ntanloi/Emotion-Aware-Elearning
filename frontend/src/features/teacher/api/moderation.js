import apiClient from '@shared/api/client.js'

/**
 * Giảng viên gửi yêu cầu thẩm định lại hoạt động bài học (hoặc kiểm tra riêng 1 ruleId)
 * @param {string} itemId
 * @param {string} [ruleId]
 */
export async function auditContentItem(itemId, ruleId) {
  const params = ruleId ? { ruleId } : {}
  const res = await apiClient.post(`/teacher/content-items/${itemId}/audit`, null, { params })
  return res.data
}
