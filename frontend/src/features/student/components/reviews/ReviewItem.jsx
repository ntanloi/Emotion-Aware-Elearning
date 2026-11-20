import StarRating from '@shared/components/StarRating.jsx'
import { Flag, Sparkles } from 'lucide-react'

import { formatVnDate } from '@shared/utils/dateTime.js'
export default function ReviewItem({
  review: r,
  isFeatured = false,
  onOpenLightbox,
  onReport,
  isAuthenticated,
}) {
  if (!r) return null

  return (
    <div
      className="card"
      style={{
        padding: '16px 20px',
        borderRadius: 12,
        border: isFeatured ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid var(--border)',
        background: isFeatured ? 'var(--accent-soft)' : 'var(--surface)',
      }}
    >
      {/* Header */}
      <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--color-primary)', color: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {r.studentName ? r.studentName.charAt(0).toUpperCase() : 'H'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14, color: 'var(--text)' }}>{r.studentName}</strong>
              {isFeatured && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 8,
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: 'var(--color-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <Sparkles size={10} /> Tiêu biểu
                </span>
              )}
              {r.progressAtReview != null && r.progressAtReview > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    padding: '1px 6px',
                    borderRadius: 8,
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--good)',
                    fontWeight: 600,
                  }}
                >
                  Đã học {r.progressAtReview}%
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <StarRating value={r.rating} size={13} />
              <span className="text-dim text-xs">
                {formatVnDate(r.createdAt)}
                {r.isEdited && ' • (đã sửa)'}
              </span>
            </div>
          </div>
        </div>

        {isAuthenticated && onReport && (
          <button
            type="button"
            onClick={() => onReport(r)}
            title="Báo cáo vi phạm"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              padding: '4px 6px',
              borderRadius: 4,
            }}
          >
            <Flag size={12} />
            <span>Báo cáo</span>
          </button>
        )}
      </div>

      {/* Comment */}
      {r.comment && (
        <p
          style={{
            margin: '0 0 10px 0',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--text)',
            whiteSpace: 'pre-line',
          }}
        >
          {r.comment}
        </p>
      )}

      {/* Images */}
      {r.images && r.images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          {r.images.map((img, idx) => (
            <div
              key={img.id || idx}
              onClick={() => onOpenLightbox?.(r.images, idx)}
              title="Bấm để xem ảnh phóng to"
              style={{
                width: 72,
                height: 72,
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                border: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <img
                src={img.url}
                alt="Ảnh đính kèm"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Teacher reply */}
      {r.teacherReply && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
            borderLeft: '3px solid var(--accent)',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <strong style={{ color: 'var(--accent)', fontSize: 12 }}>
              Phản hồi từ Giảng viên
            </strong>
            {r.teacherRepliedAt && (
              <span className="text-dim text-xs">
                • {formatVnDate(r.teacherRepliedAt)}
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: 'var(--text)' }}>{r.teacherReply}</p>
        </div>
      )}
    </div>
  )
}
