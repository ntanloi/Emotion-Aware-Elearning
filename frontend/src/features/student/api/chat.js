import apiClient from '@shared/api/client.js'

/**
 * API Chatbot AI tư vấn khóa học và giải thích câu hỏi TOEIC.
 */
export const createConversation = (data = {}) =>
  apiClient.post('/chat/conversations', data).then((r) => r.data)

export const listConversations = () =>
  apiClient.get('/chat/conversations').then((r) => r.data)

export const getMessages = (conversationId) =>
  apiClient.get(`/chat/conversations/${conversationId}/messages`).then((r) => r.data)

export const sendMessage = (conversationId, content) =>
  apiClient.post(`/chat/conversations/${conversationId}/messages`, { content }).then((r) => r.data)
