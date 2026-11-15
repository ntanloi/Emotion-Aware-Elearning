import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Flag, X } from 'lucide-react'
import { useAuthStore } from '@auth/store/authStore.js'
import { useCourseReviews, useMyCourseReview } from '@student/hooks/useCourseReviews.js'
import * as reviewsApi from '@student/api/reviews.js'
import ReviewImageLightbox from './ReviewImageLightbox.jsx'
import ReviewSummary from './reviews/ReviewSummary.jsx'
import ReviewList from './reviews/ReviewList.jsx'
import ReviewForm from './reviews/ReviewForm.jsx'
import { useRealtimeEvent } from '@shared/realtime/index.js'

/**
 * CourseReviews — Tối ưu hóa UI & Kiến trúc mô-đun (Phase U4):
 * - Tách nhỏ thành: ReviewSummary, ReviewList, ReviewItem, ReviewForm.
 * - Tự động loại trừ các đánh giá đã xuất hiện ở danh sách tiêu biểu (CourseFeaturedReviews) để không trùng lặp nội dung.
 * - Form viết đánh giá nằm gọn trong modal khi người dùng bấm "Viết đánh giá".
 * - Điều kiện tiến độ rút gọn thành 1 dòng tinh gọn.
 */
export default function CourseReviews({ courseId }) {
  const { isAuthenticated } = useAuthStore()
  const qc = useQueryClient()

  // Realtime: cập nhật danh sách và rating khi có đánh giá mới (từ chính mình hoặc học viên khác)
  useRealtimeEvent('course-review-public', (payload) => {
    if (!payload?.courseId || payload.courseId.toLowerCase() === courseId?.toLowerCase()) {
      qc.invalidateQueries({ queryKey: ['courseReviews', courseId] })
      qc.invalidateQueries({ queryKey: ['course', courseId] })
      qc.invalidateQueries({ queryKey: ['featuredReviews', courseId] })
    }
  })

  // State bộ lọc, sắp xếp & phân trang
  const [filterRating, setFilterRating] = useState(null)
  const [filterHasImage, setFilterHasImage] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(0)
  const pageSize = 8

  // Queries
  const { data: summary, isLoading: isLoadingList } = useCourseReviews(courseId, {
    rating: filterRating,
    hasImage: filterHasImage || undefined,
    sort: sortBy,
    page,
    size: pageSize,
  })
  const { data: mine } = useMyCourseReview(courseId)

  // Lấy danh sách ID các đánh giá tiêu biểu để loại bỏ trùng lặp
  const { data: featured = [] } = useQuery({
    queryKey: ['featuredReviews', courseId],
    queryFn: () => reviewsApi.getFeaturedReviews(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  })

  const featuredIds = useMemo(() => {
    return new Set(featured.map((f) => f.review?.id || f.id).filter(Boolean))
  }, [featured])

  // Lọc bỏ đánh giá đã hiện ở khối tiêu biểu
  const visibleReviews = useMemo(() => {
    const list = summary?.reviews || []
    return list.filter((r) => !featuredIds.has(r.id))
  }, [summary?.reviews, featuredIds])

  // Modal viết / sửa đánh giá
  const [isFormOpen, setIsFormOpen] = useState(false)

  // State Lightbox xem ảnh
  const [lightboxData, setLightboxData] = useState(null)

  // State Báo cáo vi phạm
  const [reportModal, setReportModal] = useState({
    open: false,
    review: null,
    imageId: null,
    reason: 'SPAM',
    details: '',
    submitting: false,
  })

  const handleOpenReport = (review, imageId = null) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để gửi báo cáo vi phạm.')
      return
    }
    setReportModal({
      open: true,
      review,
      imageId: imageId || null,
      reason: 'SPAM',
      details: '',
      submitting: false,
    })
  }

  const handleSendReport = async (e) => {
    e.preventDefault()
    if (!reportModal.review) return
    try {
      setReportModal((prev) => ({ ...prev, submitting: true }))
      await reviewsApi.reportReview(reportModal.review.id, {
        reason: reportModal.reason,
        details: reportModal.details,
        imageId: reportModal.imageId || undefined,
      })
      alert('Cảm ơn bạn! Báo cáo vi phạm đã được gửi tới Ban quản trị hệ thống.')
      setReportModal({ open: false, review: null, imageId: null, reason: 'SPAM', details: '', submitting: false })
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi gửi báo cáo')
      setReportModal((prev) => ({ ...prev, submitting: false }))
    }
  }

  const totalReviews = summary?.totalReviews || 0
  const distribution = summary?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  return (
    <div className="course-reviews-container">
      {/* Lightbox Modal */}
      {lightboxData && (
        <ReviewImageLightbox
          images={lightboxData.images}
          initialIndex={lightboxData.index}
          onClose={() => setLightboxData(null)}
        />
      )}

      {/* Header khu vực đánh giá */}
      <div className="flex-between" style={{ alignItems: 'baseline', marginBottom: 14 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
          Đánh giá từ học viên
        </h3>
        {totalReviews > 0 && (
          <span className="text-dim text-xs">{totalReviews} nhận xét</span>
        )}
      </div>

      {/* 1. KHỐI TỔNG QUAN ĐIỂM SỐ & PHÂN BỐ SAO */}
      <ReviewSummary
        summary={summary}
        totalReviews={totalReviews}
        distribution={distribution}
        filterRating={filterRating}
        onSelectRating={(r) => {
          setFilterRating(r)
          setPage(0)
        }}
        mine={mine}
        onOpenForm={() => setIsFormOpen(true)}
        isAuthenticated={isAuthenticated}
      />

      {/* 2. FORM VIẾT / CHỈNH SỬA ĐÁNH GIÁ (Dạng Modal) */}
      <ReviewForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        mineReview={mine?.review}
        courseId={courseId}
      />

      {/* 3. DANH SÁCH ĐÁNH GIÁ (ĐÃ LOẠI BỎ CÁC BÀI ĐÃ XUẤT HIỆN Ở PHẦN TIÊU BIỂU) */}
      <ReviewList
        reviews={visibleReviews}
        totalReviews={totalReviews}
        filterRating={filterRating}
        setFilterRating={setFilterRating}
        filterHasImage={filterHasImage}
        setFilterHasImage={setFilterHasImage}
        sortBy={sortBy}
        setSortBy={setSortBy}
        page={page}
        setPage={setPage}
        totalPages={summary?.totalPages || 0}
        distribution={distribution}
        isLoading={isLoadingList}
        onOpenLightbox={(images, index) => setLightboxData({ images, index })}
        onReport={handleOpenReport}
        isAuthenticated={isAuthenticated}
      />

      {/* 4. MODAL BÁO CÁO VI PHẠM */}
      {reportModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 440,
              padding: 20,
              borderRadius: 12,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              background: 'var(--surface)',
            }}
          >
            <div className="flex-between items-center mb-14">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flag size={16} style={{ color: 'var(--bad)' }} />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  Báo cáo đánh giá vi phạm
                </h4>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setReportModal({ ...reportModal, open: false })}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendReport}>
              <div className="field mb-12">
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Lý do vi phạm:
                </label>
                <select
                  value={reportModal.reason}
                  onChange={(e) => setReportModal({ ...reportModal, reason: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14 }}
                >
                  <option value="SPAM">Spam / Quảng cáo</option>
                  <option value="PHONE_NUMBER">Chứa số điện thoại hoặc liên hệ riêng</option>
                  <option value="INAPPROPRIATE">Từ ngữ không phù hợp</option>
                  <option value="SENSITIVE_INFO">Lộ thông tin cá nhân (CCCD, SBD)</option>
                  <option value="OTHER">Lý do khác</option>
                </select>
              </div>

              <div className="field mb-16">
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Chi tiết (tùy chọn):
                </label>
                <textarea
                  rows={2}
                  placeholder="Lý do vi phạm..."
                  value={reportModal.details}
                  onChange={(e) => setReportModal({ ...reportModal, details: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={reportModal.submitting}
                  onClick={() => setReportModal({ ...reportModal, open: false })}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn sm"
                  disabled={reportModal.submitting}
                  style={{ background: 'var(--bad)', color: 'var(--surface)', borderColor: 'var(--bad)' }}
                >
                  {reportModal.submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
