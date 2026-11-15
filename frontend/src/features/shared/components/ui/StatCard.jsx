import React from 'react'

/**
 * StatCard - Thẻ thống kê chuẩn hoá cho Dashboard & Báo cáo
 */
export default function StatCard({
  icon: Icon,
  iconColor = 'var(--color-primary, #2563eb)',
  iconBg = 'rgba(37, 99, 235, 0.08)',
  label,
  value,
  unit,
  subtext,
  footer,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`report-overview-kpi-card ${className}`}
      style={{
        background: 'var(--surface, #ffffff)',
        border: '1px solid var(--border, #e2e8f0)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '14px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 104,
        ...style,
      }}
    >
      <div className="report-kpi-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && (
          <div
            className="report-kpi-icon-wrap"
            style={{
              width: 26,
              height: 26,
              borderRadius: 'var(--radius-sm, 6px)',
              background: iconBg,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={14} />
          </div>
        )}
        <span
          className="report-kpi-label"
          style={{
            fontSize: 'var(--fs-xs, 12px)',
            fontWeight: 500,
            color: 'var(--text-dim, #64748b)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
      </div>

      <div
        className="report-kpi-val"
        style={{
          fontSize: 'var(--fs-xl, 20px)',
          fontWeight: 700,
          color: 'var(--text, #0f172a)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          margin: '8px 0 4px',
        }}
      >
        {value}{' '}
        {unit && (
          <span style={{ fontSize: 'var(--fs-sm, 13px)', fontWeight: 500, color: 'var(--text-dim)' }}>
            {unit}
          </span>
        )}
      </div>

      {footer ? (
        <div className="report-kpi-sub">{footer}</div>
      ) : subtext ? (
        <div
          className="report-kpi-sub"
          style={{
            fontSize: '11.5px',
            color: 'var(--text-muted, #94a3b8)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subtext}
        </div>
      ) : null}
    </div>
  )
}
