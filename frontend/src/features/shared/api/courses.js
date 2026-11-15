import apiClient from './client.js'

// FR-ACC-02: danh sách khoá học công khai (PUBLISHED)
export const listCourses = () => apiClient.get('/courses').then((r) => r.data)
export const getCourse = (id) => apiClient.get(`/courses/${id}`).then((r) => r.data)

// FR-TCH-01 (giảng viên)
export const listMyCourses = () => apiClient.get('/courses/mine').then((r) => r.data)
export const createCourse = (payload) => apiClient.post('/courses', payload).then((r) => r.data)
export const updateCourse = (id, payload) => apiClient.put(`/courses/${id}`, payload).then((r) => r.data)
export const submitCourse = (id) => apiClient.post(`/courses/${id}/submit`).then((r) => r.data)
export const hideCourse = (id) => apiClient.post(`/courses/${id}/hide`).then((r) => r.data)
export const showCourse = (id) => apiClient.post(`/courses/${id}/show`).then((r) => r.data)
export const cancelSubmitCourse = (id) => apiClient.post(`/courses/${id}/cancel-submit`).then((r) => r.data)
export const getCourseSections = (id) => apiClient.get(`/courses/${id}/sections`).then((r) => r.data)
export const deleteCourseSection = (id, sectionCode) => apiClient.delete(`/courses/${id}/sections/${sectionCode}`).then((r) => r.data)
