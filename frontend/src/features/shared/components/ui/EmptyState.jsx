import React from 'react'
import { Inbox } from 'lucide-react'

/**
 * EmptyState - Giao diện rỗng chuẩn hoá: 1 icon + 1 tiêu đề + 1 dòng mô tả + 1 nút hành động (nếu có)
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Chưa có dữ liệu',
  description,
  actionText,
  onAction,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`empty-state-unified ${className}`}
      style={{
        textAlign: 'center',
        padding: '48px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface, #ffffff)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px dashed var(--border, #e2e8f0)',
        ...style,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-full, 9999px)',
          background: 'var(--surface-2, #f1f5f9)',
          color: 'var(--text-dim, #64748b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Icon size={22} />
      </div>

      <h4 style={{ margin: 0, fontSize: 'var(--fs-base, 15px)', fontWeight: 600, color: 'var(--text, #0f172a)' }}>
        {title}
      </h4>

      {description && (
        <p className="text-dim text-xs" style={{ margin: '6px 0 0', maxWidth: 360 }}>
          {description}
        </p>
      )}

      {actionText && onAction && (
        <button
          className="btn primary sm"
          style={{ marginTop: 16, borderRadius: 'var(--radius, 8px)' }}
          onClick={onAction}
        >
          {actionText}
        </button>
      )}
    </div>
  )
}
