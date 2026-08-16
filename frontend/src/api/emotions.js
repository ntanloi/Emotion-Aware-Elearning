import apiClient from './client.js'

/**
 * Che do "frame" (mac dinh, VITE_EMOTION_MODE=frame): gui anh tho, backend goi AI.
 * Dung khi da co (hoac dang dung mock) AI service.
 */
export const sendFrameBatch = (sessionId, base64Images) =>
  apiClient.post(`/sessions/${sessionId}/frames/batch`, { images: base64Images }).then(r => r.data)

/**
 * Che do "labels" (legacy, vd face-api.js chay tren browser): gui nhan da tinh san.
 * Giu lai de tuong thich neu sau nay ban muon quay lai client-side inference.
 */
export const sendLabeledBatch = (sessionId, entries) =>
  apiClient.post(`/sessions/${sessionId}/emotions/batch`, { entries }).then(r => r.data)
