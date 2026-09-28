import apiClient from './client.js'

/** Lấy danh sách mục nội dung tùy chỉnh của 1 khóa học (cả student lẫn teacher đều dùng) */
export const listCustomSections = (courseId) =>
  apiClient.get(`/courses/${courseId}/custom-sections`).then((r) => r.data)

/** Tạo mục mới — chỉ teacher */
export const createCustomSection = (courseId, payload) =>
  apiClient.post(`/courses/${courseId}/custom-sections`, payload).then((r) => r.data)

/** Sửa tiêu đề / icon — chỉ teacher */
export const updateCustomSection = (courseId, id, payload) =>
  apiClient.put(`/courses/${courseId}/custom-sections/${id}`, payload).then((r) => r.data)

/** Xóa mục — chỉ teacher */
export const deleteCustomSection = (courseId, id) =>
  apiClient.delete(`/courses/${courseId}/custom-sections/${id}`).then((r) => r.data)
