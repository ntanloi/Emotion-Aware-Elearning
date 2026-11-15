import React from 'react'

/**
 * SectionCard - Khung thẻ chuẩn hoá cho các khối nội dung trong trang
 */
export default function SectionCard({
  title,
  subtitle,
  headerActions,
  children,
  className = '',
  style = {},
  noPadding = false,
}) {
  return (
    <div
      className={`card section-card-unified ${className}`}
      style={{
        borderRadius: 'var(--radius-lg, 12px)',
        padding: noPadding ? 0 : 'var(--sp-5, 20px)',
        border: '1px solid var(--border, #e2e8f0)',
        background: 'var(--surface, #ffffff)',
        ...style,
      }}
    >
      {(title || subtitle || headerActions) && (
        <div
          className="flex-between section-card-header"
          style={{
            marginBottom: noPadding ? 0 : 'var(--sp-4, 16px)',
            padding: noPadding ? 'var(--sp-4, 16px) var(--sp-5, 20px)' : 0,
            borderBottom: noPadding ? '1px solid var(--border, #e2e8f0)' : 'none',
          }}
        >
          <div>
            {title && (
              <h3 style={{ margin: 0, fontSize: 'var(--fs-md, 16px)', fontWeight: 600, color: 'var(--text, #0f172a)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-dim text-xs" style={{ marginTop: 4 }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>{headerActions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
