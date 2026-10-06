import apiClient from '@shared/api/client.js'

/** FR-LES-07: Ôn tập Flashcards tổng hợp */
export const myFlashcards = () => apiClient.get('/flashcards/mine').then((r) => r.data)
export const reviewFlashcard = (wordId, knewIt) =>
  apiClient.post('/flashcards/review', { wordId, knewIt }).then((r) => r.data)
