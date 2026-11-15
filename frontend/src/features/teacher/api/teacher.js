import apiClient from '@shared/api/client.js'

export const getTeacherDashboard = () => apiClient.get('/teacher/dashboard').then((r) => r.data)

/**
 * Giai đoạn 8: Lấy biểu đồ mốc thời gian phân tích cảm xúc từng giây của video bài giảng
 */
export const getVideoEmotionTimeline = (contentItemId, durationSec) => {
  const config = durationSec ? { params: { durationSec } } : {}
  return apiClient.get(`/teacher/content-items/${contentItemId}/emotion-timeline`, config).then((r) => r.data)
}

/**
 * Phase 2: Quản lý đánh giá khóa học dành cho giảng viên
 */
export const listTeacherCourseReviews = (courseId, params) =>
  apiClient.get(`/teacher/courses/${courseId}/reviews`, { params }).then((r) => r.data)

export const replyTeacherReview = (reviewId, payload) =>
  apiClient.put(`/teacher/reviews/${reviewId}/reply`, payload).then((r) => r.data)

export const deleteTeacherReviewReply = (reviewId) =>
  apiClient.delete(`/teacher/reviews/${reviewId}/reply`).then((r) => r.data)

export const getTeacherCourseReviewStats = (courseId) =>
  apiClient.get(`/teacher/courses/${courseId}/reviews/stats`).then((r) => r.data)

/**
 * Phase 4: Quản lý đánh giá tiêu biểu được ghim lên trang giới thiệu
 */
export const listTeacherFeaturedReviews = (courseId) =>
  apiClient.get(`/teacher/courses/${courseId}/featured-reviews`).then((r) => r.data)

export const featureReview = (courseId, reviewId) =>
  apiClient.put(`/teacher/courses/${courseId}/featured-reviews/${reviewId}`).then((r) => r.data)

export const unfeatureReview = (courseId, reviewId) =>
  apiClient.delete(`/teacher/courses/${courseId}/featured-reviews/${reviewId}`).then((r) => r.data)

export const reorderFeaturedReviews = (courseId, reviewIds) =>
  apiClient.put(`/teacher/courses/${courseId}/featured-reviews/order`, { reviewIds }).then((r) => r.data)

/**
 * Hệ thống kiểm duyệt: Lấy báo cáo điều kiện gửi duyệt của khóa học (nhóm luật STR)
 */
export const getCourseReadiness = (courseId) =>
  apiClient.get('/teacher/courses/' + courseId + '/readiness').then((r) => r.data)
