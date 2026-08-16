import apiClient from './client.js'

export const startSession = (lessonId) =>
  apiClient.post('/sessions', { lessonId }).then(r => r.data)

export const setCameraPermission = (sessionId, granted) =>
  apiClient.post(`/sessions/${sessionId}/camera-permission`, { granted }).then(r => r.data)

export const pauseSession = (sessionId) =>
  apiClient.post(`/sessions/${sessionId}/pause`).then(r => r.data)

export const resumeSession = (sessionId) =>
  apiClient.post(`/sessions/${sessionId}/resume`).then(r => r.data)

export const finishSession = (sessionId, abandoned = false) =>
  apiClient.post(`/sessions/${sessionId}/finish?abandoned=${abandoned}`).then(r => r.data)
