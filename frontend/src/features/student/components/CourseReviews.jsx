import { useState } from 'react'
import StarRating from '@shared/components/StarRating.jsx'
import { useAuthStore } from '@auth/store/authStore.js'
import { useCourseReviews, useMyCourseReview, useSubmitCourseReview } from '@student/hooks/useCourseReviews.js'

/**
 * CourseReviews — Đánh giá khoá học (BR: hoc vien CHUA dang ky chi xem duoc review + so sao;
 * chi hoc vien DA dang ky moi duoc viet/sua/xoa danh gia cua chinh minh).
 * Đặt trong CourseDetailPage — không cần courseId enrolled prop, tự fetch trạng thái "mine".
 */
export default function CourseReviews({ courseId }) {
  const { isAuthenticated } = useAuthStore()
  const { data: summary, isLoading } = useCourseReviews(courseId)
  const { data: mine } = useMyCourseReview(courseId)
  const { create, update, remove } = useSubmitCourseReview(courseId)

  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState(null)

  const startEdit = () => {
    setRating(mine?.review?.rating || 0)
    setComment(mine?.review?.comment || '')
    setError(null)
    setEditing(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!rating) {
      setError('Vui lòng chọn số sao đánh giá')
      return
    }
    try {
      const payload = { rating, comment: comment.trim() || null }
      if (mine?.review) {
        await update.mutateAsync(payload)
      } else {
        await create.mutateAsync(payload)
      }
      setEditing(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Xoá đánh giá của bạn?')) return
    try {
      await remove.mutateAsync()
      setEditing(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể xoá — vui lòng thử lại')
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <div className="mt-24">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Đánh giá khoá học</h2>
        {summary && summary.totalReviews > 0 && (
          <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
            <StarRating value={Math.round(summary.averageRating)} />
            <span className="text-dim text-sm">
              {summary.averageRating.toFixed(1)} · {summary.totalReviews} đánh giá
            </span>
          </div>
        )}
      </div>

      {/* Form viết / sửa đánh giá — chỉ hiện cho học viên đã đăng ký */}
      {isAuthenticated && mine?.enrolled && !editing && (
        <div className="card" style={{ marginBottom: 16 }}>
          {mine.review ? (
            <div className="flex-between">
              <div>
                <StarRating value={mine.review.rating} />
                <p className="mt-8" style={{ margin: 0 }}>{mine.review.comment}</p>
              </div>
              <div className="flex-row" style={{ gap: 8 }}>
                <button className="btn secondary sm" onClick={startEdit}>Sửa</button>
                <button className="btn ghost sm" onClick={handleDelete} disabled={remove.isPending}>
                  {remove.isPending ? 'Đang xoá...' : 'Xoá'}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn" onClick={startEdit}>Viết đánh giá</button>
          )}
        </div>
      )}

      {isAuthenticated && mine?.enrolled && editing && (
        <form className="card" style={{ marginBottom: 16 }} onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label>Số sao *</label>
            <StarRating value={rating} onChange={setRating} readOnly={false} size={26} />
          </div>
          <div className="field">
            <label>Nhận xét</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ cảm nhận của bạn về khoá học..."
              maxLength={2000}
            />
          </div>
          <div className="flex-row" style={{ gap: 8 }}>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Gửi đánh giá'}
            </button>
            <button type="button" className="btn secondary" onClick={() => setEditing(false)} disabled={saving}>
              Huỷ
            </button>
          </div>
        </form>
      )}

      {/* Gợi ý đăng ký nếu đã đăng nhập nhưng chưa enroll — chỉ được XEM, không được đánh giá */}
      {isAuthenticated && mine && !mine.enrolled && (
        <p className="text-dim text-sm" style={{ marginBottom: 16 }}>
          Bạn cần đăng ký khoá học này để có thể viết đánh giá.
        </p>
      )}
      {!isAuthenticated && (
        <p className="text-dim text-sm" style={{ marginBottom: 16 }}>Đăng nhập và đăng ký khoá học để viết đánh giá.</p>
      )}

      {/* Danh sách review — công khai, ai cũng xem được */}
      {isLoading && <p className="text-dim">Đang tải đánh giá...</p>}
      {!isLoading && summary?.reviews?.length === 0 && (
        <p className="text-dim">Chưa có đánh giá nào cho khoá học này.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {summary?.reviews
          ?.filter((r) => !mine?.review || r.id !== mine.review.id)
          .map((r) => (
            <div key={r.id} className="card">
              <div className="flex-between">
                <strong>{r.studentName}</strong>
                <span className="text-dim text-sm">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              <StarRating value={r.rating} />
              {r.comment && <p className="mt-8" style={{ margin: 0 }}>{r.comment}</p>}
            </div>
          ))}
      </div>
    </div>
  )
}
