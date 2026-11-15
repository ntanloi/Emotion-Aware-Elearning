import apiClient from '@shared/api/client.js'

/** FR-LES-07: Ôn tập Flashcards tổng hợp */
export const myFlashcards = () => apiClient.get('/flashcards/mine').then((r) => r.data)
export const reviewFlashcard = (wordId, knewIt) =>
  apiClient.post('/flashcards/review', { wordId, knewIt }).then((r) => r.data)

/** Lấy danh sách các bộ từ vựng tổng hợp siêu tốc bằng 1 API duy nhất */
export const getAvailableFlashcardSets = () =>
  apiClient.get('/flashcards/available-sets').then((r) => r.data)
