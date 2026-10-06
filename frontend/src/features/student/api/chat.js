import apiClient from '@shared/api/client.js'

/**
 * FR-CHAT-01/02/03: chatbot tư vấn khoá học (RAG).
 * LƯU Ý: backend hiện CHƯA có nhóm endpoint /api/chat/** — xem
 * docs/giai-doan-5-6-ghi-chu-doi-chieu.md. ChatWidget tự xử lý lỗi, không chặn UI.
 */
export const createConversation = () => apiClient.post('/chat/conversations').then((r) => r.data)
export const listConversations = () => apiClient.get('/chat/conversations').then((r) => r.data)
export const sendMessage = (conversationId, content) =>
  apiClient.post(`/chat/conversations/${conversationId}/messages`, { content }).then((r) => r.data)
