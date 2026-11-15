import React from 'react'

/**
 * StatusBadge — Huy hiệu hiển thị trạng thái thực thể chuẩn hóa cho Admin (Phase A0).
 * Thay thế việc code lại bộ màu rải rác trên các bảng.
 */
export default function StatusBadge({ status, size = 'sm', labelOverride = null, className = '' }) {
  const s = (status || '').toUpperCase()

  const config = {
    // Khóa học
    PUBLISHED: {
      label: 'Đang xuất bản',
      bg: 'rgba(16, 185, 129, 0.12)',
      text: '#059669',
      border: 'rgba(16, 185, 129, 0.25)',
    },
    PENDING_REVIEW: {
      label: 'Chờ duyệt',
      bg: 'rgba(245, 158, 11, 0.12)',
      text: '#d97706',
      border: 'rgba(245, 158, 11, 0.25)',
    },
    MODIFIED: {
      label: 'Đã sửa sau duyệt',
      bg: 'rgba(37, 99, 235, 0.12)',
      text: '#1d4ed8',
      border: 'rgba(37, 99, 235, 0.25)',
    },
    REJECTED: {
      label: 'Bị từ chối',
      bg: 'rgba(239, 68, 68, 0.12)',
      text: '#dc2626',
      border: 'rgba(239, 68, 68, 0.25)',
    },
    SUSPENDED: {
      label: 'Bị gỡ',
      bg: 'rgba(239, 68, 68, 0.12)',
      text: '#dc2626',
      border: 'rgba(239, 68, 68, 0.25)',
    },
    DRAFT: {
      label: 'Bản nháp',
      bg: 'var(--surface-2, #f1f5f9)',
      text: 'var(--text-dim, #64748b)',
      border: 'var(--border, #e2e8f0)',
    },
    HIDDEN: {
      label: 'Giảng viên ẩn',
      bg: 'var(--surface-2, #f1f5f9)',
      text: 'var(--text-dim, #64748b)',
      border: 'var(--border, #e2e8f0)',
    },

    // Người dùng
    ACTIVE: {
      label: 'Hoạt động',
      bg: 'rgba(16, 185, 129, 0.12)',
      text: '#059669',
      border: 'rgba(16, 185, 129, 0.25)',
    },
    PENDING_APPROVAL: {
      label: 'Chờ duyệt GV',
      bg: 'rgba(245, 158, 11, 0.12)',
      text: '#d97706',
      border: 'rgba(245, 158, 11, 0.25)',
    },
    BLOCKED: {
      label: 'Bị khóa',
      bg: 'rgba(239, 68, 68, 0.12)',
      text: '#dc2626',
      border: 'rgba(239, 68, 68, 0.25)',
    },
    LOCKED: {
      label: 'Bị khóa',
      bg: 'rgba(239, 68, 68, 0.12)',
      text: '#dc2626',
      border: 'rgba(239, 68, 68, 0.25)',
    },

    // Báo cáo vi phạm
    PENDING: {
      label: 'Chờ xử lý',
      bg: 'rgba(245, 158, 11, 0.12)',
      text: '#d97706',
      border: 'rgba(245, 158, 11, 0.25)',
    },
    RESOLVED: {
      label: 'Đã xử lý',
      bg: 'rgba(16, 185, 129, 0.12)',
      text: '#059669',
      border: 'rgba(16, 185, 129, 0.25)',
    },
    DISMISSED: {
      label: 'Đã bác bỏ',
      bg: 'var(--surface-2, #f1f5f9)',
      text: 'var(--text-dim, #64748b)',
      border: 'var(--border, #e2e8f0)',
    },
  }[s] || {
    label: status || 'Không rõ',
    bg: 'var(--surface-2, #f1f5f9)',
    text: 'var(--text-dim, #64748b)',
    border: 'var(--border, #e2e8f0)',
  }

  const isSm = size === 'sm'

  return (
    <span
      className={`admin-status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: isSm ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--radius-sm, 6px)',
        fontSize: isSm ? 11.5 : 12.5,
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {labelOverride || config.label}
    </span>
  )
}
