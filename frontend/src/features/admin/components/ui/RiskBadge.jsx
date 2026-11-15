import React from 'react'
import { AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'

/**
 * RiskBadge — Huy hiệu đánh giá mức độ rủi ro chuẩn hóa cho toàn bộ Admin (Phase A0):
 * - Thay thế toàn bộ chuỗi icon viết tay trước đây.
 * - Sử dụng token màu và biểu tượng chuẩn từ lucide-react.
 */
export default function RiskBadge({ riskLevel, level: propLevel, label: propLabel, labelOverride, showIcon = true, size = 'sm', className = '' }) {
  const level = (riskLevel || propLevel || '').toUpperCase()

  const config = {
    HIGH: {
      label: 'Rủi ro cao',
      icon: AlertTriangle,
      bg: 'rgba(239, 68, 68, 0.12)',
      text: '#dc2626',
      border: 'rgba(239, 68, 68, 0.28)',
    },
    MEDIUM: {
      label: 'Rủi ro trung bình',
      icon: AlertCircle,
      bg: 'rgba(245, 158, 11, 0.12)',
      text: '#d97706',
      border: 'rgba(245, 158, 11, 0.28)',
    },
    LOW: {
      label: 'Rủi ro thấp',
      icon: CheckCircle2,
      bg: 'rgba(16, 185, 129, 0.12)',
      text: '#059669',
      border: 'rgba(16, 185, 129, 0.28)',
    },
    CLEAN: {
      label: 'Đạt chuẩn AI',
      icon: ShieldCheck,
      bg: 'rgba(16, 185, 129, 0.12)',
      text: '#059669',
      border: 'rgba(16, 185, 129, 0.28)',
    },
  }[level] || {
    label: 'Chưa đánh giá',
    icon: AlertCircle,
    bg: 'var(--surface-2, #f1f5f9)',
    text: 'var(--text-dim, #64748b)',
    border: 'var(--border, #e2e8f0)',
  }

  const Icon = config.icon
  const isSm = size === 'sm'

  return (
    <span
      className={`admin-risk-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? 5 : 6,
        padding: isSm ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--radius-sm, 6px)',
        fontSize: isSm ? 11.5 : 12.5,
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      {showIcon && <Icon size={isSm ? 12 : 14} style={{ flexShrink: 0 }} />}
      <span>{propLabel || labelOverride || config.label}</span>
    </span>
  )
}
