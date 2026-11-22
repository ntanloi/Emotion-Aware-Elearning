import client from '@shared/api/client.js'

// 1. Thống kê Overview Dashboard
export const getOverviewStats = async () => {
  const { data } = await client.get('/admin/stats/overview')
  return data
}

// 2. Quản lý người dùng
export const getUsers = async (params) => {
  const { data } = await client.get('/admin/users', { params })
  return data
}

export const updateUserStatus = async (userId, payload) => {
  const { data } = await client.patch(`/admin/users/${userId}/status`, payload)
  return data
}

// 3. Quản lý & kiểm duyệt khóa học
export const getAdminCourses = async (params) => {
  const { data } = await client.get('/admin/courses', { params })
  return data
}

export const getCourseReviewDetails = async (courseId) => {
  const { data } = await client.get(`/admin/courses/${courseId}/review`)
  return data
}

export const getCoursePreview = async (courseId) => {
  const { data } = await client.get(`/admin/courses/${courseId}/preview`)
  return data
}

export const getContentItemPreview = async (contentItemId) => {
  const { data } = await client.get(`/admin/content-items/${contentItemId}/preview`)
  return data
}

export const reAuditCourseWithAi = async (courseId) => {
  const { data } = await client.post(`/admin/courses/${courseId}/re-audit`)
  return data
}

export const approveCourse = async (courseId, payload) => {
  const { data } = await client.post(`/admin/courses/${courseId}/approve`, payload)
  return data
}

export const rejectCourse = async (courseId, payload) => {
  const { data } = await client.post(`/admin/courses/${courseId}/reject`, payload)
  return data
}

export const suspendCourse = async (courseId, payload) => {
  const { data } = await client.post(`/admin/courses/${courseId}/suspend`, payload)
  return data
}

export const restoreCourse = async (courseId) => {
  const { data } = await client.post(`/admin/courses/${courseId}/restore`)
  return data
}

// 4. Nhật ký Audit Logs
export const getAuditLogs = async (params) => {
  const { data } = await client.get('/admin/audit-logs', { params })
  return data
}

// 5. Quản lý & kiểm duyệt đánh giá khóa học (Phase 3)
export const getAdminReviews = async (params) => {
  const { data } = await client.get('/admin/reviews', { params })
  return data
}

export const getAdminReviewReports = async (params) => {
  const { data } = await client.get('/admin/reviews/reports', { params })
  return data
}

export const adminHideReview = async (id, payload) => {
  const { data } = await client.patch(`/admin/reviews/${id}/hide`, payload)
  return data
}

export const adminRestoreReview = async (id) => {
  const { data } = await client.patch(`/admin/reviews/${id}/restore`)
  return data
}

export const adminHideReviewImage = async (imageId, payload) => {
  const { data } = await client.patch(`/admin/reviews/images/${imageId}/hide`, payload)
  return data
}

export const adminRestoreReviewImage = async (imageId) => {
  const { data } = await client.patch(`/admin/reviews/images/${imageId}/restore`)
  return data
}

export const adminResolveReviewReport = async (reportId, payload) => {
  const { data } = await client.patch(`/admin/reviews/reports/${reportId}/resolve`, payload)
  return data
}

// 6. Hệ thống kiểm duyệt khóa học chuyên sâu (Phase AG-4)
export const getCourseModeration = async (courseId) => {
  const { data } = await client.get('/admin/courses/' + courseId + '/moderation')
  return data
}

export const getCourseReadiness = async (courseId) => {
  const { data } = await client.get('/admin/courses/' + courseId + '/readiness')
  return data
}

export const updateIssueDecision = async (issueId, payload) => {
  const { data } = await client.put('/admin/moderation/issues/' + issueId + '/decision', payload)
  return data
}

// 7. Quản lý Từ điển kiểm duyệt (Phase AG-5)
export const getLexiconStats = async () => {
  const { data } = await client.get('/admin/lexicon/stats')
  return data
}

export const getLexiconList = async (params) => {
  const { data } = await client.get('/admin/lexicon', { params })
  return data
}

export const createLexicon = async (payload) => {
  const { data } = await client.post('/admin/lexicon', payload)
  return data
}

export const updateLexicon = async (id, payload) => {
  const { data } = await client.patch(`/admin/lexicon/${id}`, payload)
  return data
}

export const deleteLexicon = async (id) => {
  const { data } = await client.delete(`/admin/lexicon/${id}`)
  return data
}

export const reloadLexiconCache = async () => {
  const { data } = await client.post('/admin/lexicon/reload')
  return data
}

// 9. Tạo tài khoản Kiểm duyệt viên (chỉ ADMIN)
export const createModerator = async (payload) => {
  const { data } = await client.post('/admin/moderators', payload)
  return data
}

// 8. Xét duyệt hồ sơ giảng viên (Teacher Approval Workflow)
export const getPendingTeachers = async () => {
  const { data } = await client.get('/admin/teachers/pending')
  return data
}

export const approveTeacher = async (teacherId) => {
  const { data } = await client.post(`/admin/teachers/${teacherId}/approve`)
  return data
}

export const rejectTeacher = async (teacherId, reason) => {
  const { data } = await client.post(`/admin/teachers/${teacherId}/reject`, { reason })
  return data
}



