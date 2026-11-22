import { matchPath } from 'react-router-dom'

/**
 * Danh sách đường dẫn HỢP LỆ của ứng dụng (phải khớp với App.jsx).
 * Dùng để kiểm tra link của thông báo trước khi navigate -> không bao giờ dẫn tới
 * route không tồn tại (nguyên nhân gây màn hình trắng).
 */
const KNOWN_ROUTES = [
  '/',
  '/courses',
  '/courses/:courseId',
  '/courses/:courseId/learn',
  '/tests',
  '/tests/:testId',
  '/tests/attempts/:attemptId',
  '/tests/attempts/:attemptId/result',
  '/content-items/:id',
  '/flashcards/review',
  '/reports',
  '/profile',
  '/wallet',
  // Admin
  '/admin',
  '/admin/moderation',
  '/admin/moderation/:courseId',
  '/admin/users',
  '/admin/courses',
  '/admin/tests',
  '/admin/reviews',
  '/admin/finance',
  '/admin/audit-logs',
  '/admin/lexicon',
  '/admin/teachers',
  // Giảng viên
  '/dashboard/teacher',
  '/teacher/courses',
  '/teacher/courses/new',
  '/teacher/courses/:courseId/edit',
  '/teacher/courses/:courseId/content',
  '/teacher/courses/:courseId/curriculum',
  '/teacher/courses/:courseId/reviews',
  '/teacher/tests',
  '/teacher/tests/:id/builder',
  '/teacher/content-items/:id',
]

/** Link cũ đã lưu trong database (backend từng gửi sai) -> đường dẫn đúng hiện tại. */
const LEGACY_REWRITES = [
  [/^\/teacher\/dashboard(?=[/?#]|$)/, '/dashboard/teacher'],
  [/^\/admin\/wallet\/reconcile(?=[/?#]|$)/, '/admin/finance?tab=rewards-escrow'],
  [/^\/dashboard\/student(?=[/?#]|$)/, '/courses'],
  [/^\/dashboard\/admin(?=[/?#]|$)/, '/admin'],
  [/^\/my-courses(?=[/?#]|$)/, '/courses'],
]

const ADMIN_ONLY_PATHS = ['/admin/users', '/admin/finance']
const isAdminPath = (p) => p === '/admin' || p.startsWith('/admin/')
const isTeacherPath = (p) => p === '/dashboard/teacher' || p.startsWith('/teacher/')

/** Trang chủ theo vai trò, dùng làm đích dự phòng. */
export function homeForRole(role) {
  if (role === 'ADMIN' || role === 'MODERATOR') return '/admin'
  if (role === 'TEACHER') return '/dashboard/teacher'
  return '/courses'
}

function splitUrl(raw) {
  const hashIdx = raw.indexOf('#')
  const noHash = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw
  const qIdx = noHash.indexOf('?')
  const path = qIdx >= 0 ? noHash.slice(0, qIdx) : noHash
  const search = qIdx >= 0 ? noHash.slice(qIdx) : ''
  return { path: path.length > 1 ? path.replace(/\/+$/, '') : path, search }
}

function isKnownPath(path) {
  // Chặn id rác như /courses/undefined hoặc /courses/null
  if (path.split('/').some((seg) => seg === 'undefined' || seg === 'null')) return false
  return KNOWN_ROUTES.some((pattern) => matchPath({ path: pattern, end: true }, path))
}

function allowedForRole(path, role) {
  if (isAdminPath(path)) {
    if (role === 'ADMIN') return true
    // Kiểm duyệt viên không được vào trang Người dùng và Tài chính
    return role === 'MODERATOR' && !ADMIN_ONLY_PATHS.some((p) => path === p || path.startsWith(p + '/'))
  }
  if (isTeacherPath(path)) return role === 'TEACHER' || role === 'ADMIN'
  return true
}

/**
 * Trả về đường dẫn nội bộ AN TOÀN để navigate khi bấm vào một thông báo,
 * hoặc null nếu thông báo không có đích để mở (chỉ đánh dấu đã đọc).
 *
 * @param {object} n     thông báo { type, referenceId, link, ... }
 * @param {string} role  'STUDENT' | 'TEACHER' | 'MODERATOR' | 'ADMIN'
 */
export function resolveNotificationTarget(n, role) {
  if (!n) return null
  const fallback = homeForRole(role)

  // Khóa học bị từ chối: giảng viên mở thẳng modal chi tiết các mục cần sửa
  if (n.type === 'COURSE_REJECTED' && n.referenceId && (role === 'TEACHER' || role === 'ADMIN')) {
    return `/teacher/courses?rejectCourseId=${encodeURIComponent(n.referenceId)}`
  }

  let raw = typeof n.link === 'string' ? n.link.trim() : ''
  if (!raw) return null

  // Chỉ cho phép đường dẫn nội bộ (chặn http://, //evil.com, javascript:)
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback

  for (const [pattern, replacement] of LEGACY_REWRITES) {
    if (pattern.test(raw)) {
      raw = raw.replace(pattern, replacement)
      break
    }
  }

  let { path, search } = splitUrl(raw)

  // Giảng viên bấm thông báo đề thi: đưa về trang quản lý đề thi của mình
  if (role === 'TEACHER' && n.type === 'TEST_MODERATION' && /^\/tests\/[^/]+$/.test(path)) {
    return '/teacher/tests'
  }

  // Thông báo tài chính của giảng viên: mở sẵn tab giao dịch
  if (n.type === 'FINANCE' && path === '/dashboard/teacher' && !search) {
    search = '?tab=transactions'
  }

  if (!isKnownPath(path)) return fallback
  if (!allowedForRole(path, role)) return fallback

  return `${path}${search}`
}
