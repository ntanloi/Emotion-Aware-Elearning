import apiClient from './client.js'

/**
 * Endpoint upload dùng chung cho mọi form (ảnh/audio/video). Trả về MediaAssetDto
 * ({ id, type, url, fileName, durationSec }) — dùng id đó gắn vào các form khác.
 */
export const uploadMedia = (file, type, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  return apiClient
    .post('/media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (evt) => onProgress(evt.total ? Math.round((evt.loaded * 100) / evt.total) : 0)
        : undefined,
    })
    .then((r) => r.data)
}
