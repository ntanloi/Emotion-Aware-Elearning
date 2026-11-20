import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Star,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Pencil,
  Trash2,
  Send,
  X,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import StarRating from '@shared/components/StarRating.jsx'
import { useCourse } from '@shared/hooks/useCourses.js'
import {
  useTeacherCourseReviews,
  useTeacherCourseReviewStats,
  useTeacherReviewReply,
  useTeacherFeaturedReviews,
  useTeacherFeaturedActions,
} from '@teacher/hooks/useTeacherReviews.js'
import ReviewImageLightbox from '@student/components/ReviewImageLightbox.jsx'
import { useRealtimeEvent } from '@shared/realtime/index.js'
import { useToast, useConfirm } from '@shared/context/AppUIContext.jsx'

import { formatVnDate } from '@shared/utils/dateTime.js'
export default function TeacherCourseReviewsPage() {
  const { courseId } = useParams()
  const { data: course } = useCourse(courseId)
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()

  // Realtime: giảng viên nhận event khi có đánh giá mới, chỉnh sửa, xóa hoặc thay đổi phản hồi
  const handleReviewRealtime = (payload) => {
    if (!payload?.courseId || payload.courseId.toLowerCase() === courseId?.toLowerCase()) {
      qc.invalidateQueries({ queryKey: ['teacherCourseReviews', courseId] })
      qc.invalidateQueries({ queryKey: ['teacherCourseReviewStats', courseId] })
      qc.invalidateQueries({ queryKey: ['teacherFeaturedReviews', courseId] })
    }
  }
  useRealtimeEvent('course-review', handleReviewRealtime)
  useRealtimeEvent('course-review-public', handleReviewRealtime)

  // Filters & Pagination state
  const [filterRating, setFilterRating] = useState(null)
  const [filterUnanswered, setFilterUnanswered] = useState(false)
  const [filterHasImage, setFilterHasImage] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(0)
  const pageSize = 10

  // Reply state: { [reviewId]: boolean (isEditing) } & { [reviewId]: string (replyText) }
  const [editingReplyId, setEditingReplyId] = useState(null)
  const [replyText, setReplyText] = useState('')

  // Lightbox state
  const [lightboxData, setLightboxData] = useState(null)

  // Queries
  const { data: stats, isLoading: loadingStats } = useTeacherCourseReviewStats(courseId)
  const { data: reviewData, isLoading: loadingReviews } = useTeacherCourseReviews(courseId, {
    rating: filterRating,
    unanswered: filterUnanswered || undefined,
    hasImage: filterHasImage || undefined,
    sort: sortBy,
    page,
    size: pageSize,
  })

  const { reply: replyMutation, removeReply: deleteReplyMutation } = useTeacherReviewReply(courseId)

  // Featured Reviews Queries & Actions (Phase 4)
  const { data: featuredReviews = [], isLoading: loadingFeatured } = useTeacherFeaturedReviews(courseId)
  const { pin: pinMutation, unpin: unpinMutation, reorder: reorderMutation } = useTeacherFeaturedActions(courseId)

  const featuredIds = useMemo(() => new Set(featuredReviews.map((f) => f.review?.id)), [featuredReviews])

  const handlePinReview = async (reviewId) => {
    try {
      await pinMutation.mutateAsync(reviewId)
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || err.message || 'Không thể ghim đánh giá')
    }
  }

  const handleUnpinReview = async (reviewId) => {
    const ok = await confirm({
      title: 'Bỏ ghim đánh giá',
      message: 'Gỡ đánh giá này khỏi trang giới thiệu khóa học?',
      confirmLabel: 'Bỏ ghim',
      variant: 'warning',
    })
    if (!ok) return
    try {
      await unpinMutation.mutateAsync(reviewId)
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || err.message || 'Không thể bỏ ghim')
    }
  }

  const handleMoveFeatured = async (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= featuredReviews.length) return
    const ids = featuredReviews.map((f) => f.review?.id).filter(Boolean)
    const temp = ids[index]
    ids[index] = ids[newIndex]
    ids[newIndex] = temp
    try {
      await reorderMutation.mutateAsync(ids)
    } catch (err) {
      toast.error('Không thể cập nhật thứ tự đánh giá ghim')
    }
  }

  const handleStartReply = (review) => {
    setEditingReplyId(review.id)
    setReplyText(review.teacherReply || '')
  }

  const handleCancelReply = () => {
    setEditingReplyId(null)
    setReplyText('')
  }

  const handleSaveReply = async (reviewId) => {
    if (!replyText.trim()) return
    try {
      await replyMutation.mutateAsync({ reviewId, reply: replyText.trim() })
      setEditingReplyId(null)
      setReplyText('')
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Không thể lưu phản hồi')
    }
  }

  const handleDeleteReply = async (reviewId) => {
    const ok = await confirm({
      title: 'Xóa phản hồi',
      message: 'Bạn có chắc chắn muốn xóa phản hồi này không?',
      confirmLabel: 'Xóa phản hồi',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteReplyMutation.mutateAsync(reviewId)
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Không thể xóa phản hồi')
    }
  }

  const distribution = stats?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const totalReviews = stats?.totalReviews || 0

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Lightbox xem ảnh full */}
      {lightboxData && (
        <ReviewImageLightbox
          images={lightboxData.images}
          initialIndex={lightboxData.index}
          onClose={() => setLightboxData(null)}
        />
      )}

      {/* Top Header & Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <Link
          to={`/teacher/courses/${courseId}/content?section=VOCAB`}
          className="text-dim text-sm flex-row"
          style={{ gap: 6, display: 'inline-flex', alignItems: 'center', marginBottom: 12 }}
        >
          <ArrowLeft size={14} /> Quay lại quản lý nội dung khóa học
        </Link>
        <div className="flex-between">
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              Đánh giá &amp; Phản hồi học viên
            </h1>
            <p className="text-dim text-sm" style={{ margin: '4px 0 0 0' }}>
              Khóa học: <strong>{course?.title || 'Đang tải...'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 1. THỐNG KÊ TỔNG QUAN (4 CARDS) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Điểm trung bình */}
        <div className="card" style={{ padding: 18, borderRadius: 12 }}>
          <div className="text-dim text-xs font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
            Điểm đánh giá trung bình
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--warn)' }}>
              {stats ? stats.averageRating.toFixed(1) : '0.0'}
            </span>
            <span className="text-dim text-sm">/ 5.0</span>
          </div>
          <div style={{ marginTop: 4 }}>
            <StarRating value={stats?.averageRating || 0} size={16} />
          </div>
        </div>

        {/* Card 2: Tổng đánh giá */}
        <div className="card" style={{ padding: 18, borderRadius: 12 }}>
          <div className="text-dim text-xs font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
            Tổng số đánh giá
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', marginTop: 8 }}>
            {totalReviews}
          </div>
          <div className="text-dim text-xs mt-4">
            Đánh giá hợp lệ từ học viên đã học
          </div>
        </div>

        {/* Card 3: Chưa phản hồi (Highlight) */}
        <div
          className="card"
          style={{
            padding: 18,
            borderRadius: 12,
            border: stats?.unansweredCount > 0 ? '1.5px solid rgba(245, 158, 11, 0.4)' : undefined,
            backgroundColor: stats?.unansweredCount > 0 ? 'rgba(245, 158, 11, 0.04)' : undefined,
          }}
        >
          <div className="flex-between">
            <span className="text-dim text-xs font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
              Chưa phản hồi
            </span>
            {stats?.unansweredCount > 0 && (
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--warn)',
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                Cần phản hồi
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: stats?.unansweredCount > 0 ? 'var(--warn)' : 'var(--text)',
              marginTop: 8,
            }}
          >
            {stats?.unansweredCount || 0}
          </div>
          <div className="text-dim text-xs mt-4">
            Giảng viên trả lời giúp tăng tương tác với học viên
          </div>
        </div>

        {/* Card 4: Đánh giá có ảnh */}
        <div className="card" style={{ padding: 18, borderRadius: 12 }}>
          <div className="text-dim text-xs font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
            Đánh giá có ảnh
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-primary)', marginTop: 8 }}>
            {stats?.withImagesCount || 0}
          </div>
          <div className="text-dim text-xs mt-4">
            Hình ảnh trải nghiệm học tập thực tế
          </div>
        </div>
      </div>

      {/* 2. KHỐI PHÂN BỐ & XU HƯỚNG THEO THÁNG */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1fr) minmax(320px, 1.2fr)',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Cột 1: Phân bố số sao */}
        <div className="card" style={{ padding: 20, borderRadius: 12 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Phân bố số sao</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[5, 4, 3, 2, 1].map((s) => {
              const count = distribution[s] || 0
              const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
              const isSelected = filterRating === s

              return (
                <div
                  key={s}
                  onClick={() => {
                    setFilterRating(isSelected ? null : s)
                    setPage(0)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 6,
                    backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: 50,
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: isSelected ? 'var(--warn)' : 'inherit',
                    }}
                  >
                    {s} <Star size={13} fill="#f59e0b" color="#f59e0b" />
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
                      }}
                    />
                  </div>
                  <span className="text-dim text-xs" style={{ width: 65, textAlign: 'right' }}>
                    {count} ({percent}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cột 2: Xu hướng đánh giá theo tháng */}
        <div className="card" style={{ padding: 20, borderRadius: 12 }}>
          <div className="flex-between mb-16">
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
              Xu hướng đánh giá (6 tháng gần nhất)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats?.monthlyTrend?.map((item) => (
              <div
                key={item.month}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--surface-2)',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  Tháng {item.month.split('-')[1]}/{item.month.split('-')[0]}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span className="text-dim text-xs">
                    <strong>{item.reviewCount}</strong> đánh giá
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={13} fill='var(--warn)' color='var(--warn)' />
                    <strong style={{ fontSize: 14, color: 'var(--warn)' }}>
                      {item.averageRating > 0 ? item.averageRating.toFixed(1) : '-'}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. KHỐI ĐÁNH GIÁ TIÊU BIỂU ĐƯỢC GHIM (PHASE 4) */}
      <div
        className="card"
        style={{
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
          border: '1px solid var(--border)',
          background: 'var(--bg)',
        }}
      >
        <div className="flex-between items-center mb-14">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Đánh giá tiêu biểu giới thiệu khóa học
            </h4>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                background: featuredReviews.length >= 6 ? 'var(--bad-soft)' : 'rgba(37, 99, 235, 0.1)',
                color: featuredReviews.length >= 6 ? 'var(--bad)' : 'var(--color-primary)',
              }}
            >
              {featuredReviews.length} / 6
            </span>
          </div>

          <span className="text-dim text-xs">
            Hiển thị nổi bật tại trang CourseDetailPage với nhãn <strong>"Do giảng viên chọn"</strong>
          </span>
        </div>

        {featuredReviews.length === 0 ? (
          <div
            style={{
              padding: '20px 24px',
              borderRadius: 8,
              background: 'var(--bg)',
              border: '1px dashed var(--border)',
              textAlign: 'center',
            }}
          >
            <p className="text-dim text-sm" style={{ margin: 0 }}>
              Chưa có đánh giá nào được ghim. Hãy chọn nút <strong>"Ghim giới thiệu"</strong> ở các đánh giá bên dưới
              (yêu cầu: từ 4 sao trở lên, có ít nhất 1 ảnh thực tế và được học viên đồng ý).
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: 14,
            }}
          >
            {featuredReviews.map((f, idx) => {
              const r = f.review
              if (!r) return null
              const isFirst = idx === 0
              const isLast = idx === featuredReviews.length - 1

              return (
                <div
                  key={f.id}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Header item */}
                    <div className="flex-between items-start mb-8">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 6,
                            background: 'var(--accent-soft)',
                            color: 'var(--accent)',
                          }}
                        >
                          #{idx + 1}
                        </span>
                        <strong style={{ fontSize: 14, color: 'var(--text)' }}>{r.studentName}</strong>
                        {r.progressAtReview != null && (
                          <span style={{ fontSize: 10, color: 'var(--good)', fontWeight: 600 }}>
                            ({r.progressAtReview}%)
                          </span>
                        )}
                      </div>

                      {/* Nút điều hướng thứ tự & Bỏ ghim */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <button
                          type="button"
                          className="btn btn-ghost sm"
                          onClick={() => handleMoveFeatured(idx, -1)}
                          disabled={isFirst || reorderMutation.isPending}
                          title="Di chuyển lên trước"
                          style={{ padding: 4, height: 24, width: 24 }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost sm"
                          onClick={() => handleMoveFeatured(idx, 1)}
                          disabled={isLast || reorderMutation.isPending}
                          title="Di chuyển xuống sau"
                          style={{ padding: 4, height: 24, width: 24 }}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost sm"
                          onClick={() => handleUnpinReview(r.id)}
                          disabled={unpinMutation.isPending}
                          title="Bỏ ghim đánh giá này"
                          style={{ padding: 4, height: 24, width: 24, color: 'var(--bad)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <StarRating value={r.rating} size={13} />
                      <span className="text-dim text-xs">
                        {formatVnDate(r.createdAt)}
                      </span>
                    </div>

                    {r.comment && (
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: 'var(--text-dim)',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        "{r.comment}"
                      </p>
                    )}
                  </div>

                  {/* Thumbnail ảnh */}
                  {r.images && r.images.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {r.images.map((img, imgIdx) => (
                        <img
                          key={img.id || imgIdx}
                          src={img.url}
                          alt="Ảnh đính kèm"
                          onClick={() => setLightboxData({ images: r.images, index: imgIdx })}
                          style={{
                            width: 48,
                            height: 48,
                            objectFit: 'cover',
                            borderRadius: 6,
                            cursor: 'pointer',
                            border: '1px solid var(--border)',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. THANH BỘ LỌC & SẮP XẾP */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          borderRadius: 10,
          marginBottom: 18,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className="text-dim text-xs font-semibold">Lọc:</span>
          <button
            type="button"
            className={`btn sm ${filterRating === null && !filterUnanswered && !filterHasImage ? '' : 'secondary'}`}
            onClick={() => {
              setFilterRating(null)
              setFilterUnanswered(false)
              setFilterHasImage(false)
              setPage(0)
            }}
            style={{ borderRadius: 20 }}
          >
            Tất cả ({totalReviews})
          </button>
          <button
            type="button"
            className={`btn sm ${filterUnanswered ? '' : 'secondary'}`}
            onClick={() => {
              setFilterUnanswered(!filterUnanswered)
              setPage(0)
            }}
            style={{
              borderRadius: 20,
              color: filterUnanswered ? undefined : 'var(--warn)',
            }}
          >
            Chưa trả lời ({stats?.unansweredCount || 0})
          </button>
          <button
            type="button"
            className={`btn sm ${filterHasImage ? '' : 'secondary'}`}
            onClick={() => {
              setFilterHasImage(!filterHasImage)
              setPage(0)
            }}
            style={{ borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <ImageIcon size={13} /> Có ảnh ({stats?.withImagesCount || 0})
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
              style={{ borderRadius: 20 }}
            >
              {s} sao ({distribution[s] || 0})
            </button>
          ))}
        </div>

        {/* Dropdown Sắp xếp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="text-dim text-xs font-semibold">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value)
              setPage(0)
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 14,
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

      {/* 4. DANH SÁCH ĐÁNH GIÁ & PHẢN HỒI */}
      {loadingReviews ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div className="home-loading-spinner" style={{ margin: '0 auto 12px' }} />
          <p className="text-dim">Đang tải danh sách đánh giá...</p>
        </div>
      ) : reviewData?.reviews?.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <MessageSquare size={36} className="text-dim" style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h4 style={{ margin: '0 0 4px 0', fontSize: 16 }}>Không tìm thấy đánh giá nào</h4>
          <p className="text-dim text-sm" style={{ margin: 0 }}>
            Thử thay đổi bộ lọc hoặc chọn "Tất cả".
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reviewData?.reviews?.map((r) => {
            const isReplyingThis = editingReplyId === r.id
            const isPinned = featuredIds.has(r.id)

            // Điều kiện ghim: PUBLISHED, allowFeature, rating >= 4, có ít nhất 1 ảnh hợp lệ
            const hasConsent = Boolean(r.allowFeature)
            const hasRating = r.rating != null && r.rating >= 4
            const hasImages = r.images && r.images.length > 0
            const isPublished = r.status === 'PUBLISHED'
            const isEligible = hasConsent && hasRating && hasImages && isPublished
            const isFull = featuredReviews.length >= 6

            const canPin = isEligible && !isFull
            let pinTooltip = 'Ghim đánh giá này lên mục giới thiệu ở CourseDetailPage'
            if (!isEligible) {
              if (!hasConsent) pinTooltip = 'Học viên chưa đồng ý cho phép giới thiệu đánh giá'
              else if (!hasRating) pinTooltip = 'Đánh giá cần từ 4 sao trở lên để được ghim'
              else if (!hasImages) pinTooltip = 'Đánh giá cần có ít nhất 1 hình ảnh đính kèm'
              else if (!isPublished) pinTooltip = 'Chỉ có thể ghim đánh giá đang hiển thị công khai'
            } else if (isFull) {
              pinTooltip = 'Đã đạt giới hạn tối đa 6 đánh giá được ghim'
            }

            return (
              <div
                key={r.id}
                className="card"
                style={{
                  padding: 20,
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {/* Header review */}
                <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        color: 'var(--surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {r.studentName ? r.studentName.charAt(0).toUpperCase() : 'H'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 14, color: 'var(--text)' }}>{r.studentName}</strong>
                        {r.progressAtReview != null && r.progressAtReview > 0 && (
                          <span
                            style={{
                              fontSize: 12,
                              padding: '1px 8px',
                              borderRadius: 10,
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--good)',
                              fontWeight: 600,
                            }}
                          >
                            Đã học {r.progressAtReview}%
                          </span>
                        )}
                        {r.allowFeature && (
                          <span
                            style={{
                              fontSize: 12,
                              padding: '1px 8px',
                              borderRadius: 10,
                              background: 'rgba(37, 99, 235, 0.1)',
                              color: 'var(--color-primary)',
                              fontWeight: 600,
                            }}
                          >
                            Đồng ý giới thiệu
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <StarRating value={r.rating} size={15} />
                        <span className="text-dim text-xs">
                          {formatVnDate(r.createdAt)}
                          {r.isEdited && ' • (đã chỉnh sửa)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nút Ghim lên trang giới thiệu / Đã ghim */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isPinned ? (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => handleUnpinReview(r.id)}
                        disabled={unpinMutation.isPending}
                        style={{
                          background: 'var(--good-soft)',
                          color: 'var(--good)',
                          border: '1px solid var(--good-border)',
                          borderRadius: 20,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Bấm để gỡ đánh giá này khỏi mục Giới thiệu"
                      >
                        <BookmarkCheck size={14} />
                        <span>Đã ghim</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={() => handlePinReview(r.id)}
                        disabled={!canPin || pinMutation.isPending}
                        title={pinTooltip}
                        style={{
                          borderRadius: 20,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          opacity: canPin ? 1 : 0.6,
                          cursor: canPin ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <Bookmark size={14} />
                        <span>Ghim giới thiệu</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Nhận xét của học viên */}
                {r.comment && (
                  <p
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: 'var(--text)',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {r.comment}
                  </p>
                )}

                {/* Lưới ảnh đính kèm */}
                {r.images && r.images.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    {r.images.map((img, idx) => (
                      <div
                        key={img.id || idx}
                        onClick={() => setLightboxData({ images: r.images, index: idx })}
                        title="Bấm để xem ảnh phóng to"
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '1px solid var(--border)',
                          transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        <img src={img.url} alt="Ảnh đính kèm" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* KHU VỰC PHẢN HỒI CỦA GIẢNG VIÊN */}
                {r.teacherReply && !isReplyingThis ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '12px 16px',
                      borderRadius: 10,
                      backgroundColor: 'rgba(37, 99, 235, 0.05)',
                      borderLeft: '3px solid var(--color-primary)',
                    }}
                  >
                    <div className="flex-between mb-4">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: 14, color: 'var(--color-primary)' }}>
                          Phản hồi từ bạn (Giảng viên)
                        </strong>
                        {r.teacherRepliedAt && (
                          <span className="text-dim text-xs">
                            • {formatVnDate(r.teacherRepliedAt)}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => handleStartReply(r)}
                          style={{ padding: '2px 6px', fontSize: 12 }}
                        >
                          <Pencil size={12} style={{ marginRight: 4 }} /> Sửa
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => handleDeleteReply(r.id)}
                          disabled={deleteReplyMutation.isPending}
                          style={{ padding: '2px 6px', fontSize: 12, color: 'var(--bad)' }}
                        >
                          <Trash2 size={12} style={{ marginRight: 4 }} /> Xóa
                        </button>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>
                      {r.teacherReply}
                    </p>
                  </div>
                ) : isReplyingThis ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 16,
                      borderRadius: 10,
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                      Nội dung phản hồi công khai tới học viên
                    </label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Cảm ơn học viên đã gửi nhận xét, giải thích thêm hoặc hỗ trợ học tập..."
                      maxLength={2000}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        marginBottom: 10,
                      }}
                    />
                    <div className="flex-row" style={{ gap: 8 }}>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => handleSaveReply(r.id)}
                        disabled={replyMutation.isPending || !replyText.trim()}
                      >
                        <Send size={13} style={{ marginRight: 4 }} />
                        {replyMutation.isPending ? 'Đang gửi...' : 'Gửi phản hồi'}
                      </button>
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={handleCancelReply}
                        disabled={replyMutation.isPending}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn secondary sm flex-row"
                      onClick={() => handleStartReply(r)}
                      style={{ gap: 6 }}
                    >
                      <MessageSquare size={13} />
                      <span>Phản hồi đánh giá này</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 5. PHÂN TRANG */}
      {reviewData?.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            marginTop: 24,
          }}
        >
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Trang trước
          </button>
          {Array.from({ length: reviewData.totalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`btn sm ${page === i ? '' : 'secondary'}`}
              onClick={() => setPage(i)}
              style={{ minWidth: 36, height: 32, padding: '0 8px' }}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => setPage((p) => Math.min(reviewData.totalPages - 1, p + 1))}
            disabled={page >= reviewData.totalPages - 1}
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  )
}
