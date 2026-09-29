import apiClient from '@shared/api/client.js'

/** BR-12: học viên bắt buộc đã enroll khoá học mới mở được nội dung bên trong */
export const myEnrollments = () => apiClient.get('/enrollments/mine').then((r) => r.data)
export const enrollCourse = (courseId) => apiClient.post(`/courses/${courseId}/enroll`).then((r) => r.data)
