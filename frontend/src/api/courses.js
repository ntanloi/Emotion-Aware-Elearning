import apiClient from './client.js'

export const listCourses = () => apiClient.get('/courses').then(r => r.data)
export const getCourse = (id) => apiClient.get(`/courses/${id}`).then(r => r.data)
