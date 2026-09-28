import apiClient from '@shared/api/client.js'

const API_BASE = apiClient.defaults.baseURL || 'http://localhost:8080/api'
// Goc backend (bo "/api" o cuoi), dung de ghep voi cac duong dan TUONG DOI nhu "/uploads/..."
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '')

/**
 * Media (audio/anh) tu backend tra ve co the la duong dan TUONG DOI, vi
 * app.storage.public-base-url mac dinh la "/uploads" (khong co host/port).
 *
 * Neu dung thang duong dan nay lam `src` cho <audio>/<img> hoac url cho WaveSurfer,
 * trinh duyet se tu resolve theo ORIGIN CUA FRONTEND (vd: http://localhost:5173/uploads/...)
 * chu khong phai backend (http://localhost:8080) -> 404 -> audio khong bao gio "ready"
 * -> nut Play bi disabled vinh vien (BUG: "nut Play nhan khong duoc" o phan Nghe).
 *
 * Ham nay ghep them origin backend khi URL la duong dan tuong doi; giu nguyen neu da la
 * URL tuyet doi (http/https/data/blob) - vd khi sau nay chuyen sang S3/CDN.
 */
export function resolveMediaUrl(url) {
  if (!url) return url
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url
  return `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}