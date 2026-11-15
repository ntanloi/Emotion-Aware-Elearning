export const COURSE_STATUS_MAP = {
  PUBLISHED: { label: 'Đang xuất bản', color: 'success', bg: 'var(--success-soft, #dcfce7)', text: '#15803d' },
  PENDING_REVIEW: { label: 'Chờ duyệt', color: 'warning', bg: 'var(--warning-soft, #fef3c7)', text: '#b45309' },
  REJECTED: { label: 'Bị từ chối', color: 'danger', bg: 'var(--danger-soft, #fee2e2)', text: '#b91c1c' },
  SUSPENDED: { label: 'Bị gỡ', color: 'danger', bg: 'var(--danger-soft, #fee2e2)', text: '#b91c1c' },
  HIDDEN: { label: 'Giảng viên ẩn', color: 'dim', bg: '#f3f4f6', text: '#4b5563' },
  DRAFT: { label: 'Bản nháp', color: 'dim', bg: '#f3f4f6', text: '#6b7280' },
}

export function formatWaitingTime(submittedAt) {
  if (!submittedAt) return null
  const diffMs = Date.now() - new Date(submittedAt).getTime()
  if (diffMs < 0) return 'Vừa gửi'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `Đã chờ ${mins} phút`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Đã chờ ${hours} giờ`
  const days = Math.floor(hours / 24)
  return `Đã chờ ${days} ngày`
}

export function getWaitUrgencyClass(submittedAt) {
  if (!submittedAt) return ''
  const diffMs = Date.now() - new Date(submittedAt).getTime()
  const hours = diffMs / (1000 * 60 * 60)
  if (hours >= 48) return 'urgency-red'
  if (hours >= 24) return 'urgency-yellow'
  return 'urgency-normal'
}

export function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}
