import { Link } from 'react-router-dom'
import { BookOpen, Star, User } from 'lucide-react'
import { resolveMediaUrl } from '@config/media.js'

function formatVnd(value) {
  if (value == null) return null
  return Number(value).toLocaleString('vi-VN') + 'đ'
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * CourseCard — Card khóa học với thiết kế hiện đại.
 * Hiển thị: ảnh bìa + giá + giảm giá + level badge.
 */
export default function CourseCard({ course }) {
  const hasDiscount = course.originalPrice && course.price && Number(course.originalPrice) > Number(course.price)
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(course.price) / Number(course.originalPrice)) * 100)
    : null

  return (
    <Link to={`/courses/${course.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card hoverable course-card">
        <div className="course-cover-wrapper">
          {course.coverUrl ? (
            <img
              className="course-cover"
              src={resolveMediaUrl(course.coverUrl, { width: 600 })}
              alt={course.title}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="course-cover course-cover-placeholder">
              <span className="course-cover-icon">
                <BookOpen size={42} strokeWidth={1.8} />
              </span>
            </div>
          )}
          {hasDiscount && (
            <div className="course-discount-badge">
              -{discountPercent}%
            </div>
          )}
        </div>
        
        <div className="course-card-body">
          <div className="flex-between" style={{ marginBottom: 8 }}>
            {course.level && (
              <span className="badge" style={{ background: 'var(--info-soft)', color: 'var(--info)', fontSize: '12px', padding: '2px 8px' }}>
                {course.level}
              </span>
            )}
            {course.averageRating != null && course.averageRating > 0 ? (
              <span className="text-dim text-sm flex-row" style={{ gap: 4, alignItems: 'center' }}>
                <Star size={13} fill="var(--warn)" color="var(--warn)" />
                <strong style={{ color: 'var(--text)' }}>{course.averageRating.toFixed(1)}</strong>
                {course.reviewCount != null && (
                  <span style={{ fontSize: 12, opacity: 0.8 }}>({course.reviewCount})</span>
                )}
              </span>
            ) : (
              <span className="text-dim text-sm" style={{ fontSize: 12 }}>Chưa có đánh giá</span>
            )}
          </div>
          
          <h3 className="course-title">{course.title}</h3>
          <p className="course-description">{stripHtml(course.description) || 'Chưa có mô tả'}</p>
          
          <div className="course-meta">
            <span className="text-dim text-sm flex-row" style={{ gap: 5, alignItems: 'center' }}>
              <User size={13} />
              <span>{course.teacherName}</span>
            </span>
          </div>
          
          <div className="course-footer">
            <div className="price-row">
              {course.price ? (
                <>
                  <span className="price-current">{formatVnd(course.price)}</span>
                  {hasDiscount && (
                    <span className="price-original">{formatVnd(course.originalPrice)}</span>
                  )}
                </>
              ) : (
                <span className="price-current" style={{ color: 'var(--good)' }}>Miễn phí</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

