import { Image as ImageIcon, MessageSquare, Star } from 'lucide-react'
import ReviewItem from './ReviewItem.jsx'
import Skeleton from '@shared/components/ui/Skeleton.jsx'

export default function ReviewList({
  reviews = [],
  totalReviews = 0,
  filterRating,
  setFilterRating,
  filterHasImage,
  setFilterHasImage,
  sortBy,
  setSortBy,
  page,
  setPage,
  totalPages = 0,
  distribution = {},
  isLoading,
  onOpenLightbox,
  onReport,
  isAuthenticated,
}) {
  return (
    <div>
      {/* Thanh bộ lọc & sắp xếp */}
      <div
        className="card"
        style={{
          marginBottom: 12,
          padding: '10px 16px',
          borderRadius: 10,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* Pills lọc */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            className={`btn sm ${filterRating === null && !filterHasImage ? '' : 'secondary'}`}
            onClick={() => {
              setFilterRating(null)
              setFilterHasImage(false)
              setPage(0)
            }}
            style={{ borderRadius: 16, fontSize: 12, padding: '4px 10px' }}
          >
            Tất cả ({totalReviews})
          </button>

          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              className={`btn sm ${filterRating === s ? '' : 'secondary'}`}
              onClick={() => {
                setFilterRating(filterRating === s ? null : s)
                setPage(0)
              }}
              style={{ borderRadius: 16, fontSize: 12, padding: '4px 10px' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {s} <Star size={11} fill="#f59e0b" color="#f59e0b" /> ({distribution[s] || 0})
              </span>
            </button>
          ))}

          <button
            type="button"
            className={`btn sm ${filterHasImage ? '' : 'secondary'}`}
            onClick={() => {
              setFilterHasImage(!filterHasImage)
              setPage(0)
            }}
            style={{
              borderRadius: 16,
              fontSize: 12,
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ImageIcon size={12} /> Có ảnh
          </button>
        </div>

        {/* Sắp xếp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="text-dim text-xs">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value)
              setPage(0)
            }}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              fontSize: 12,
              backgroundColor: 'var(--surface)',
              cursor: 'pointer',
            }}
          >
            <option value="newest">Mới nhất</option>
            <option value="highest">Đánh giá cao nhất</option>
            <option value="lowest">Đánh giá thấp nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
      </div>

      {/* Danh sách reviews */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ padding: 16, display: 'flex', gap: 12, borderRadius: 'var(--radius-lg, 12px)' }}>
              <Skeleton width={38} height={38} borderRadius="50%" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton width="28%" height={16} />
                <Skeleton width="88%" height={14} />
                <Skeleton width="55%" height={14} />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <MessageSquare size={32} className="text-dim" style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <h4 style={{ margin: '0 0 4px 0', fontSize: 14 }}>Chưa có đánh giá phù hợp</h4>
          <p className="text-dim text-xs" style={{ margin: 0 }}>
            {filterRating || filterHasImage
              ? 'Không có đánh giá nào phù hợp với bộ lọc. Thử chọn "Tất cả".'
              : 'Chưa có nhận xét nào trong mục này.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map((r) => (
            <ReviewItem
              key={r.id}
              review={r}
              onOpenLightbox={onOpenLightbox}
              onReport={onReport}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}

      {/* Phân trang */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            marginTop: 20,
          }}
        >
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ fontSize: 12 }}
          >
            Trước
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`btn sm ${page === i ? '' : 'secondary'}`}
              onClick={() => setPage(i)}
              style={{ minWidth: 32, height: 28, padding: '0 6px', fontSize: 12 }}
            >
              {i + 1}
            </button>
          ))}

          <button
            type="button"
            className="btn secondary sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ fontSize: 12 }}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  )
}
