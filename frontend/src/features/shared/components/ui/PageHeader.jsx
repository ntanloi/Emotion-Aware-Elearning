import React from 'react'

/**
 * PageHeader - Chuẩn hoá tiêu đề và khu vực tác vụ ở đầu mỗi trang
 */
export default function PageHeader({
  title,
  description,
  actions,
  badge,
  icon: Icon,
  className = '',
}) {
  return (
    <div className={`page-header-unified flex-between ${className}`} style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
      <div>
        <div className="flex-row" style={{ gap: 10, alignItems: 'center' }}>
          {Icon && (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--accent-soft, rgba(37, 99, 235, 0.08))',
                color: 'var(--accent, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={18} />
            </div>
          )}
          <h1 style={{ margin: 0, fontSize: 'var(--fs-2xl, 24px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text, #0f172a)' }}>
            {title}
          </h1>
          {badge && <span style={{ marginLeft: 6 }}>{badge}</span>}
        </div>
        {description && (
          <p className="text-dim text-sm" style={{ margin: '6px 0 0' }}>
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex-row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  )
}
