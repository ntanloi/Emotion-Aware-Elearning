import apiClient from '@shared/api/client.js'

const API_BASE = apiClient.defaults.baseURL || 'http://localhost:8080/api'
// Goc backend (bo "/api" o cuoi), dung de ghep voi cac duong dan TUONG DOI nhu "/uploads/..."
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '')

/**
 * Tối ưu hóa URL Cloudinary:
 * - Hình ảnh: thêm f_auto (WebP/AVIF), q_auto (nén tối ưu) và w_800,c_limit để giảm 80-90% dung lượng
 * - Âm thanh/Video: thêm q_auto,br_128k để tối ưu bitrate 128kbps giúp tải nhanh và tiết kiệm băng thông
 */
// Cờ "tắt transformation": bật khi build có VITE_CLOUDINARY_TRANSFORM=false, hoặc tự bật khi Cloudinary
// từ chối URL đã chèn transformation (thường là 401 do bật "Strict transformations" trong Security settings).
let transformBlocked = import.meta.env?.VITE_CLOUDINARY_TRANSFORM === 'false'

const IMAGE_TRANSFORM_RE = /\/image\/upload\/f_auto,q_[^,/]+,w_\d+,c_limit\//
const VIDEO_TRANSFORM_RE = /\/video\/upload\/q_auto,br_128k\//

/** Gỡ phần transformation do optimizeCloudinaryUrl chèn vào, trả về URL gốc của Cloudinary. */
export function stripCloudinaryTransform(url) {
  if (!url || typeof url !== 'string') return url
  return url
    .replace(IMAGE_TRANSFORM_RE, '/image/upload/')
    .replace(VIDEO_TRANSFORM_RE, '/video/upload/')
}

/**
 * Nếu ảnh/âm thanh/video đã tối ưu bị lỗi tải, tự chuyển sang URL gốc (không transformation)
 * và ngừng chèn transformation cho các URL sau đó, tránh hàng loạt lỗi 401 trong console.
 * Gọi một lần ở main.jsx.
 */
export function installCloudinaryFallback() {
  if (typeof window === 'undefined' || window.__cldFallbackInstalled) return
  window.__cldFallbackInstalled = true
  window.addEventListener(
    'error',
    (e) => {
      const el = e.target
      if (!el || !el.tagName || !['IMG', 'AUDIO', 'VIDEO', 'SOURCE'].includes(el.tagName)) return
      const current = el.currentSrc || el.src
      const original = stripCloudinaryTransform(current)
      if (!current || original === current) return
      transformBlocked = true
      if (el.dataset.cldFallback) return
      el.dataset.cldFallback = '1'
      el.src = original
      if (el.tagName === 'SOURCE') el.parentElement?.load?.()
    },
    true,
  )
}

export function optimizeCloudinaryUrl(url, { width = 800, quality = 'auto' } = {}) {
  if (!url || typeof url !== 'string') return url
  if (transformBlocked) return url

  // 1. Tối ưu hình ảnh Cloudinary (Part 1, minh hoạ, avatar, bìa khoá học)
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    if (!url.includes('f_auto') && !url.includes('q_auto')) {
      return url.replace(
        /\/image\/upload\//,
        `/image/upload/f_auto,q_${quality},w_${width},c_limit/`
      )
    }
  }

  // 2. Tối ưu âm thanh / video Cloudinary (Part 1, 2, 3, 4, bài giảng)
  if (url.includes('res.cloudinary.com') && url.includes('/video/upload/')) {
    if (!url.includes('q_auto') && !url.includes('br_')) {
      return url.replace(
        /\/video\/upload\//,
        `/video/upload/q_auto,br_128k/`
      )
    }
  }

  return url
}


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
export function resolveMediaUrl(url, options = {}) {
  if (!url) return url
  const resolved = /^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')
    ? url
    : `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`

  return optimizeCloudinaryUrl(resolved, options)
}