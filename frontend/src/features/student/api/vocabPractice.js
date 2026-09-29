import apiClient from '@shared/api/client.js'

/** BR-18: lấy câu hỏi "ảo" đã sinh sẵn cho 1 trong 5 dạng luyện tập (không lưu DB) */
export const getVocabPractice = (contentItemId, practiceType) =>
  apiClient.get(`/content-items/${contentItemId}/vocab-practice/${practiceType}`).then((r) => r.data)
