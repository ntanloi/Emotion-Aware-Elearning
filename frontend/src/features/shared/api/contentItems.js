import apiClient from './client.js'

export const listContentItems = (courseId, sectionCode) =>
  apiClient.get(`/courses/${courseId}/content-items`, { params: { sectionCode } }).then((r) => r.data)

/** V4: cây nội dung có Nhóm hoạt động (groups) + hoạt động không thuộc nhóm nào (ungroupedItems) */
export const getContentTree = (courseId, sectionCode) =>
  apiClient.get(`/courses/${courseId}/content-tree`, { params: { sectionCode } }).then((r) => r.data)

export const getContentItem = (id) => apiClient.get(`/content-items/${id}`).then((r) => r.data)

/** FR-LES-03: danh sách từ của 1 Bộ từ vựng (nguồn cho 5 dạng luyện tập tự sinh) */
export const getVocabWords = (contentItemId) =>
  apiClient.get(`/content-items/${contentItemId}/vocab-words`).then((r) => r.data)

// ---------- FR-TCH-03..06: giáo viên quản lý hoạt động (ContentItem) ----------
/** payload: { courseId, sectionCode, groupId?, type, title, timeLimitMinutes?, videoMediaId?, bodyHtml? } */
export const createContentItem = (payload) =>
  apiClient.post('/content-items', payload).then((r) => r.data)

/** payload field nào null/undefined thì giữ nguyên giá trị cũ ở BE. groupId: '' để gỡ khỏi Nhóm */
export const updateContentItem = (id, payload) =>
  apiClient.put(`/content-items/${id}`, payload).then((r) => r.data)

export const deleteContentItem = (id) => apiClient.delete(`/content-items/${id}`).then((r) => r.data)

export const reorderContentItems = (orderedItemIds) =>
  apiClient.put('/content-items/reorder', { orderedItemIds }).then((r) => r.data)

export const setVocabWords = (contentItemId, wordIds) =>
  apiClient.put(`/content-items/${contentItemId}/vocab-words`, { wordIds }).then((r) => r.data)

// ---------- FR-TCH: Luyện nghe chép chính tả tự sinh ----------
/** payload: { vocabWordIds?: string[], sourceGroupIds?: string[] } — gộp cả 2, loại trùng ở BE */
export const generateDictationQuestions = (contentItemId, payload) =>
  apiClient.post(`/content-items/${contentItemId}/dictation-source`, payload).then((r) => r.data)
