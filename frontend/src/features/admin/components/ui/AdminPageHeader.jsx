import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * AdminPageHeader — Thanh tiêu đề chuẩn hóa cho các trang Admin (Phase A0/A1):
 * - Thay thế việc lặp tiêu đề hai ba lần giữa AdminLayout và Page con.
 * - Đưa các nút hành động lên cùng hàng với tiêu đề.
 */
export default function AdminPageHeader({
  title,
  badge = null,
  actions = null,
  onBack = null,
  backTo = null,
  className = '',
}) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  return (
    <div
      className={`admin-page-header-unified flex-between items-center ${className}`}
      style={{
        marginBottom: 20,
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {(onBack || backTo) && (
          <button
            type="button"
            className="btn secondary sm"
            onClick={handleBack}
            style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            title="Quay lại"
          >
            <ArrowLeft size={15} />
          </button>
        )}

        <h1
          style={{
            fontSize: 'var(--fs-lg, 20px)',
            fontWeight: 700,
            margin: 0,
            color: 'var(--text, #0f172a)',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>

        {badge && <div style={{ display: 'inline-flex', alignItems: 'center' }}>{badge}</div>}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  )
}
