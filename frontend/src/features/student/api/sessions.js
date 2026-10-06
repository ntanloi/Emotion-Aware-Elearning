import apiClient from '@shared/api/client.js'

/**
 * FR-LES-02/08: vòng đời Phiên học (chỉ áp dụng content_item.type = VIDEO_LECTURE, BR-19).
 * SỬA so với bản cũ: backend StartSessionRequest nhận field "contentItemId", không phải
 * "lessonId" — bản cũ gọi sai tên field nên request start() sẽ luôn bị 400.
 */
export const startSession = (contentItemId) =>
  apiClient.post('/sessions', { contentItemId }).then((r) => r.data)

export const setCameraPermission = (sessionId, granted) =>
  apiClient.post(`/sessions/${sessionId}/camera-permission`, { granted }).then((r) => r.data)

export const pauseSession = (sessionId) => apiClient.post(`/sessions/${sessionId}/pause`).then((r) => r.data)

export const resumeSession = (sessionId) => apiClient.post(`/sessions/${sessionId}/resume`).then((r) => r.data)

export const finishSession = (sessionId, abandoned = false) =>
  apiClient.post(`/sessions/${sessionId}/finish?abandoned=${abandoned}`).then((r) => r.data)
