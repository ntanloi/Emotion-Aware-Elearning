import apiClient from './client.js'

/** FR-TCH-03: thư viện từ vựng riêng của giáo viên, dùng lại được giữa nhiều Unit/khoá học. Có hỗ trợ params phân trang: { page, size, search, partOfSpeech } */
export const listMyVocabWords = (params) => apiClient.get('/vocab-words/mine', { params }).then((r) => r.data)

/** payload: { word, ipa?, partOfSpeech?, meaningVi, imageMediaId?, audioUkMediaId?, audioUsMediaId?, examples?: [{sentenceEn, sentenceVi, audioMediaId?}] } */
export const createVocabWord = (payload) => apiClient.post('/vocab-words', payload).then((r) => r.data)

/** field nào null/undefined thì giữ nguyên giá trị cũ. examples gửi lên (kể cả []) ghi đè toàn bộ ví dụ cũ */
export const updateVocabWord = (id, payload) => apiClient.put(`/vocab-words/${id}`, payload).then((r) => r.data)

export const deleteVocabWord = (id) => apiClient.delete(`/vocab-words/${id}`).then((r) => r.data)
