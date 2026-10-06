import apiClient from './client.js'

// FR-ACC-02: danh sách khoá học công khai (PUBLISHED)
export const listCourses = () => apiClient.get('/courses').then((r) => r.data)
export const getCourse = (id) => apiClient.get(`/courses/${id}`).then((r) => r.data)

// FR-TCH-01 (giảng viên) - giữ lại để component dùng chung có thể tái sử dụng sau này
export const listMyCourses = () => apiClient.get('/courses/mine').then((r) => r.data)
export const createCourse = (payload) => apiClient.post('/courses', payload).then((r) => r.data)
export const updateCourse = (id, payload) => apiClient.put(`/courses/${id}`, payload).then((r) => r.data)
export const publishCourse = (id) => apiClient.post(`/courses/${id}/publish`).then((r) => r.data)
export const hideCourse = (id) => apiClient.post(`/courses/${id}/hide`).then((r) => r.data)
