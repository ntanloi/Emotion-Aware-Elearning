import { Link } from 'react-router-dom'

function formatVnd(value) {
  if (value == null) return null
  return Number(value).toLocaleString('vi-VN') + 'đ'
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
            <img className="course-cover" src={course.coverUrl} alt={course.title} />
          ) : (
            <div className="course-cover course-cover-placeholder">
              <span className="course-cover-icon">📚</span>
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
              <span className="badge" style={{ background: 'var(--info-soft)', color: 'var(--info)', fontSize: '11px', padding: '2px 8px' }}>
                {course.level}
              </span>
            )}
            {course.averageRating != null ? (
              <span className="text-dim text-sm">⭐ {course.averageRating.toFixed(1)}</span>
            ) : (
              <span className="text-dim text-sm">Chưa có đánh giá</span>
            )}
          </div>
          
          <h3 className="course-title">{course.title}</h3>
          <p className="course-description">{course.description}</p>
          
          <div className="course-meta">
            <span className="text-dim text-sm">👤 {course.teacherName}</span>
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

