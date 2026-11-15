import StarRating from '@shared/components/StarRating.jsx'
import { Star, Lock, Edit3 } from 'lucide-react'

export default function ReviewSummary({
  summary,
  totalReviews = 0,
  distribution = {},
  filterRating,
  onSelectRating,
  mine,
  onOpenForm,
  isAuthenticated,
}) {
  const avgRating = summary?.averageRating || 0

  return (
    <div
      className="card"
      style={{
        marginBottom: 14,
        padding: '20px 24px',
        borderRadius: 14,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="review-summary-grid">
        {/* Cột 1: Điểm trung bình */}
        <div
          className="review-summary-score-col"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid var(--border)',
            paddingRight: 20,
          }}
        >
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: 'var(--warn)',
              lineHeight: 1.1,
            }}
          >
            {avgRating > 0 ? avgRating.toFixed(1) : '0.0'}
          </div>
          <div className="mt-6 mb-4">
            <StarRating value={avgRating} size={18} />
          </div>
          <div className="text-dim text-xs" style={{ fontWeight: 500 }}>
            {totalReviews > 0 ? `${totalReviews} đánh giá` : 'Chưa có đánh giá'}
          </div>
        </div>

        {/* Cột 2: Phân bố sao 5 -> 1 */}
        <div className="review-summary-bars-col" style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star] || 0
            const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
            const isSelected = filterRating === star

            return (
              <div
                key={star}
                onClick={() => onSelectRating(isSelected ? null : star)}
                title={`Lọc đánh giá ${star} sao`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: 44,
                    fontSize: 12,
                    fontWeight: 600,
                    color: isSelected ? '#f59e0b' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  {star} <Star size={12} fill="#f59e0b" color="#f59e0b" />
                </span>

                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'var(--border)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      backgroundColor: 'var(--warn)',
                      borderRadius: 4,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                <span
                  className="text-dim"
                  style={{
                    width: 60,
                    textAlign: 'right',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {count} ({percent}%)
                </span>
              </div>
            )
          })}
        </div>

        {/* Cột 3: Nút viết đánh giá hoặc dòng nhắc điều kiện thu gọn */}
        <div className="review-summary-action-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
          {isAuthenticated && mine?.canReview && (
            <button
              type="button"
              className="btn sm"
              onClick={onOpenForm}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              <Edit3 size={14} />
              {mine.review ? 'Sửa đánh giá của bạn' : 'Viết đánh giá'}
            </button>
          )}

          {isAuthenticated && mine?.enrolled && !mine.canReview && !mine.review && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: 'var(--text-secondary)',
                background: 'rgba(241, 245, 249, 0.8)',
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              <Lock size={13} />
              <span>Học thêm {mine.requiredProgress - mine.progress}% để đánh giá</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
