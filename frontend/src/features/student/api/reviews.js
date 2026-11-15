import apiClient from '@shared/api/client.js'

/**
 * Công khai - ai cũng xem được (hỗ trợ phân trang, lọc theo sao, lọc có ảnh, sắp xếp)
 */
export const listCourseReviews = (courseId, params) =>
  apiClient.get(`/courses/${courseId}/reviews`, { params }).then((r) => r.data)

/**
 * Trả về { enrolled, canReview, progress, requiredProgress, review, reason }
 */
export const myCourseReview = (courseId) =>
  apiClient.get(`/courses/${courseId}/reviews/mine`).then((r) => r.data)

export const createCourseReview = (courseId, payload) =>
  apiClient.post(`/courses/${courseId}/reviews`, payload).then((r) => r.data)

export const updateCourseReview = (courseId, payload) =>
  apiClient.put(`/courses/${courseId}/reviews`, payload).then((r) => r.data)

export const deleteCourseReview = (courseId) =>
  apiClient.delete(`/courses/${courseId}/reviews`).then((r) => r.data)

/**
 * Tải ảnh đánh giá lên server riêng (POST /api/reviews/images)
 * Server sẽ kiểm tra định dạng, giới hạn 5 MB, tái mã hóa xóa EXIF và trả về mediaAssetId.
 */
export const uploadReviewImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post('/reviews/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

/**
 * Báo cáo đánh giá hoặc hình ảnh vi phạm (Phase 3)
 */
export const reportReview = (reviewId, payload) =>
  apiClient.post(`/reviews/${reviewId}/report`, payload).then((r) => r.data)

/**
 * Lấy danh sách đánh giá tiêu biểu được ghim lên trang giới thiệu (Phase 4)
 */
export const getFeaturedReviews = (courseId) =>
  apiClient.get(`/courses/${courseId}/featured-reviews`).then((r) => r.data)


