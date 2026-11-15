import apiClient from '@shared/api/client.js'

/**
 * API tiến độ học tập phân cấp:
 * Cấp 3: Khóa học (Enrollment)
 * Cấp 2: Part / Section
 * Cấp 1: Nhóm hoạt động (ContentGroup)
 * Cấp 0: Hoạt động con (ContentItem)
 */
export const getCourseProgress = (courseId) =>
  apiClient.get(`/courses/${courseId}/progress`).then((r) => r.data)

export const recordVideoProgress = (itemId, { watchedSeconds, durationSeconds }) =>
  apiClient.post(`/content-items/${itemId}/video-progress`, { watchedSeconds, durationSeconds }).then((r) => r.data)

export const recordVocabCompleted = (itemId) =>
  apiClient.post(`/content-items/${itemId}/vocab-completed`).then((r) => r.data)

export const recordGrammarRead = (itemId) =>
  apiClient.post(`/content-items/${itemId}/grammar-read`).then((r) => r.data)

export const savePartialAnswers = (itemId, attemptId, answers) =>
  apiClient
    .post(`/content-items/${itemId}/save-partial-answers`, { answers }, { params: attemptId ? { attemptId } : {} })
    .then((r) => r.data)
