import apiClient from '@shared/api/client.js'

/** Cong khai - ai cung xem duoc (khong can dang nhap) */
export const listCourseReviews = (courseId) =>
  apiClient.get(`/courses/${courseId}/reviews`).then((r) => r.data)

/** Tra ve { enrolled, review }. Neu chua dang nhap -> enrolled=false, review=null */
export const myCourseReview = (courseId) =>
  apiClient.get(`/courses/${courseId}/reviews/mine`).then((r) => r.data)

export const createCourseReview = (courseId, payload) =>
  apiClient.post(`/courses/${courseId}/reviews`, payload).then((r) => r.data)

export const updateCourseReview = (courseId, payload) =>
  apiClient.put(`/courses/${courseId}/reviews`, payload).then((r) => r.data)

export const deleteCourseReview = (courseId) =>
  apiClient.delete(`/courses/${courseId}/reviews`).then((r) => r.data)
