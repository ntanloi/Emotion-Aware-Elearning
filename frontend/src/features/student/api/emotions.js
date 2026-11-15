import apiClient from '@shared/api/client.js'

/**
 * Chế độ "frame" (Phase B2 KLTN & GĐ 8, Phase 2-3 Ví học viên): gửi lô ảnh thô (1s/lô),
 * kèm vị trí thời gian video, tốc độ phát (playbackRate), và thời lượng (videoDurationSec).
 * Backend gọi AI service, đánh giá FACE_LOST và theo dõi VideoViewAttempt.
 */
export const sendFrameBatch = (sessionId, base64Images, videoTimeSec = null, extra = {}) =>
  apiClient.post(`/sessions/${sessionId}/frames/batch`, {
    images: base64Images,
    videoTimeSec: videoTimeSec != null ? Number(videoTimeSec) : null,
    playbackRate: extra?.playbackRate ?? 1,
    videoDurationSec: extra?.videoDurationSec != null ? Math.round(extra.videoDurationSec) : null,
  }).then(r => r.data)

/**
 * Thử lại bằng một lượt xem mới khi lượt hiện tại bị INVALID
 */
export const restartAttempt = (sessionId) =>
  apiClient.post(`/sessions/${sessionId}/attempt/restart`).then(r => r.data)

/**
 * Chế độ "labels" (legacy, vd face-api.js chạy trên browser): gửi nhãn đã tính sẵn.
 */
export const sendLabeledBatch = (sessionId, entries) =>
  apiClient.post(`/sessions/${sessionId}/emotions/batch`, { entries }).then(r => r.data)

/**
 * Giai đoạn 8: Phản hồi gợi ý học tập thích ứng (chấp nhận tua lại / nghỉ ngơi hay bỏ qua)
 */
export const respondToSuggestion = (suggestionId, wasAccepted) =>
  apiClient.post(`/suggestions/${suggestionId}/respond`, { wasAccepted }).then(r => r.data)

/**
 * Giai đoạn 8: Lấy báo cáo học tập tổng kết sau buổi học (Learning Session Summary)
 */
export const getSessionSummary = (sessionId) =>
  apiClient.get(`/sessions/${sessionId}/summary`).then(r => r.data)
