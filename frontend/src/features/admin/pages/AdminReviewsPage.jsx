import React, { useEffect, useState } from 'react'
import * as adminApi from '@admin/api/admin.js'
import StarRating from '@shared/components/StarRating.jsx'
import AdminPageHeader from '@admin/components/ui/AdminPageHeader.jsx'
import AdminActionModal from '@admin/components/AdminActionModal.jsx'
import StatusBadge from '@admin/components/ui/StatusBadge.jsx'
import { useToast, useConfirm } from '@admin/context/AdminUIContext.jsx'
import {
  ShieldAlert,
  Flag,
  CheckCircle,
  EyeOff,
  Search,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  X,
} from 'lucide-react'

export default function AdminReviewsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState('reports') // 'reports' | 'all-reviews'

  // Tab 1: Reports State
  const [reports, setReports] = useState([])
  const [reportStatus, setReportStatus] = useState('PENDING')
  const [loadingReports, setLoadingReports] = useState(true)
  const [pendingReportCount, setPendingReportCount] = useState(0)

  // Tab 2: Reviews State
  const [reviews, setReviews] = useState([])
  const [reviewStatus, setReviewStatus] = useState('ALL')
  const [reviewSearch, setReviewSearch] = useState('')
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [totalReviews, setTotalReviews] = useState(0)

  // Modal Ẩn đánh giá / Xử lý báo cáo
  const [hideModal, setHideModal] = useState({
    open: false,
    reviewId: null,
    reportId: null,
    action: 'HIDE_REVIEW', // 'HIDE_REVIEW' | 'HIDE_IMAGE'
    imageId: null,
    reason: '',
    customReason: '',
  })

  // Modal Bác bỏ báo cáo
  const [dismissModal, setDismissModal] = useState({
    open: false,
    reportId: null,
  })

  // Lightbox xem ảnh
  const [previewImage, setPreviewImage] = useState(null)

  // Tải danh sách báo cáo vi phạm
  const loadReports = async () => {
    try {
      setLoadingReports(true)
      const data = await adminApi.getAdminReviewReports({
        status: reportStatus,
        page: 0,
        size: 50,
      })
      setReports(data.reports || [])
      if (reportStatus === 'PENDING') {
        setPendingReportCount(data.total || 0)
      }
    } catch (err) {
      console.error('Lỗi tải hàng đợi báo cáo vi phạm:', err)
      toast.error('Không thể tải danh sách báo cáo')
    } finally {
      setLoadingReports(false)
    }
  }

  // Tải danh sách tất cả đánh giá
  const loadReviews = async () => {
    try {
      setLoadingReviews(true)
      const data = await adminApi.getAdminReviews({
        status: reviewStatus === 'ALL' ? undefined : reviewStatus,
        search: reviewSearch || undefined,
        page: 0,
        size: 50,
      })
      setReviews(data.reviews || [])
      setTotalReviews(data.total || 0)
    } catch (err) {
      console.error('Lỗi tải danh sách đánh giá:', err)
      toast.error('Không thể tải danh sách đánh giá')
    } finally {
      setLoadingReviews(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports()
    } else {
      loadReviews()
    }
  }, [activeTab, reportStatus, reviewStatus, reviewSearch])

  useEffect(() => {
    adminApi
      .getAdminReviewReports({ status: 'PENDING', page: 0, size: 1 })
      .then((data) => setPendingReportCount(data.total || 0))
      .catch(() => {})
  }, [])

  // Xử lý Phê duyệt / Khôi phục đánh giá
  const handleRestoreReview = async (reviewId) => {
    const ok = await confirm({
      title: 'Khôi phục đánh giá',
      message: 'Bạn có chắc chắn muốn phê duyệt / khôi phục đánh giá này về trạng thái công khai (PUBLISHED)?',
      confirmText: 'Phê duyệt & Hiển thị',
      variant: 'primary',
    })
    if (!ok) return

    try {
      await adminApi.adminRestoreReview(reviewId)
      toast.success('Đã phê duyệt và hiển thị đánh giá công khai')
      if (activeTab === 'reports') loadReports()
      else loadReviews()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi khôi phục đánh giá')
    }
  }

  // Mở modal ẩn đánh giá
  const openHideReviewModal = (reviewId, reportId = null, prefilledReason = '') => {
    setHideModal({
      open: true,
      reviewId,
      reportId,
      action: 'HIDE_REVIEW',
      imageId: null,
      reason: prefilledReason || 'Nội dung chứa từ ngữ không phù hợp hoặc vi phạm tiêu chuẩn cộng đồng',
      customReason: '',
    })
  }

  // Mở modal ẩn ảnh
  const openHideImageModal = (imageId, reviewId = null, reportId = null, prefilledReason = '') => {
    setHideModal({
      open: true,
      reviewId,
      reportId,
      action: 'HIDE_IMAGE',
      imageId,
      reason: prefilledReason || 'Hình ảnh chứa thông tin nhạy cảm (CCCD/SĐT) hoặc không phù hợp',
      customReason: '',
    })
  }

  // Khôi phục ảnh đã ẩn
  const handleRestoreImage = async (imageId) => {
    const ok = await confirm({
      title: 'Khôi phục hình ảnh',
      message: 'Khôi phục hiển thị cho hình ảnh này?',
      confirmText: 'Khôi phục ảnh',
      variant: 'primary',
    })
    if (!ok) return

    try {
      await adminApi.adminRestoreReviewImage(imageId)
      toast.success('Đã khôi phục hiển thị ảnh')
      if (activeTab === 'reports') loadReports()
      else loadReviews()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi khôi phục ảnh')
    }
  }

  // Bác bỏ báo cáo
  const handleConfirmDismiss = async (note) => {
    if (!dismissModal.reportId) return
    try {
      await adminApi.adminResolveReviewReport(dismissModal.reportId, {
        action: 'DISMISS',
        resolutionNote: note || 'Nội dung đánh giá hợp lệ, không vi phạm quy định.',
      })
      toast.success('Đã bác bỏ báo cáo vi phạm')
      setDismissModal({ open: false, reportId: null })
      loadReports()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xử lý báo cáo')
    }
  }

  // Xác nhận submit Modal Ẩn
  const handleConfirmHide = async () => {
    const finalReason = hideModal.customReason.trim() || hideModal.reason
    if (!finalReason) {
      toast.warning('Vui lòng chọn hoặc nhập lý do xử lý.')
      return
    }

    try {
      if (hideModal.reportId) {
        await adminApi.adminResolveReviewReport(hideModal.reportId, {
          action: hideModal.action,
          resolutionNote: finalReason,
        })
      } else if (hideModal.action === 'HIDE_REVIEW') {
        await adminApi.adminHideReview(hideModal.reviewId, { reason: finalReason })
      } else if (hideModal.action === 'HIDE_IMAGE') {
        await adminApi.adminHideReviewImage(hideModal.imageId, { reason: finalReason })
      }

      toast.success(hideModal.action === 'HIDE_REVIEW' ? 'Đã ẩn đánh giá vi phạm' : 'Đã ẩn hình ảnh vi phạm')
      setHideModal({ open: false, reviewId: null, reportId: null, action: 'HIDE_REVIEW', imageId: null, reason: '', customReason: '' })
      if (activeTab === 'reports') loadReports()
      else loadReviews()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi thực hiện thao tác')
    }
  }

  const formatReason = (reason) => {
    switch (reason) {
      case 'SPAM':
        return 'Spam / Lừa đảo / Quảng cáo'
      case 'PHONE_NUMBER':
        return 'Chứa số điện thoại cá nhân'
      case 'INAPPROPRIATE':
        return 'Từ ngữ thô tục / Xúc phạm'
      case 'SENSITIVE_INFO':
        return 'Lộ thông tin cá nhân (CCCD, chân dung)'
      case 'OTHER':
        return 'Lý do khác'
      default:
        return reason || 'Báo cáo vi phạm'
    }
  }

  return (
    <div className="admin-reviews-page" style={{ paddingBottom: 60 }}>
      {/* 1. Header chuẩn hóa */}
      <AdminPageHeader
        title="Đánh giá & báo cáo"
        badge={
          pendingReportCount > 0 ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--c-warning)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
            >
              {pendingReportCount} chờ xử lý
            </span>
          ) : null
        }
      />

      {/* 2. Tabs chuyển đổi dạng Segmented Control hiện đại */}
      <div style={{ marginBottom: 20 }}>
        <div className="admin-segmented-tabs">
          <button
            type="button"
            className={`admin-segmented-tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <Flag size={15} />
            <span>Hàng chờ báo cáo vi phạm</span>
            {pendingReportCount > 0 && (
              <span
                style={{
                  background: 'var(--c-danger)',
                  color: 'var(--surface)',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 10,
                }}
              >
                {pendingReportCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`admin-segmented-tab ${activeTab === 'all-reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('all-reviews')}
          >
            <MessageSquare size={15} />
            <span>Tất cả đánh giá</span>
            <span
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 10,
              }}
            >
              {totalReviews}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: HÀNG CHỜ BÁO CÁO VI PHẠM                          */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div>
          {/* Bộ lọc trạng thái Báo cáo dạng pills thanh lịch */}
          <div className="admin-status-filter-pills" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-muted)' }}>Trạng thái:</span>
            {[
              { key: 'PENDING', label: 'Chờ xử lý' },
              { key: 'RESOLVED_HIDDEN', label: 'Đã ẩn vi phạm' },
              { key: 'RESOLVED_DISMISSED', label: 'Đã bác bỏ' },
              { key: 'ALL', label: 'Tất cả' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                className={`admin-filter-pill ${reportStatus === t.key ? 'active' : ''}`}
                onClick={() => setReportStatus(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loadingReports ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--c-muted)', background: 'var(--surface)', borderRadius: 12 }}>
              Đang tải danh sách báo cáo...
            </div>
          ) : reports.length === 0 ? (
            <div
              style={{
                maxWidth: 600,
                margin: '24px auto',
                padding: '48px 32px',
                textAlign: 'center',
                background: 'var(--surface)',
                border: '1px solid var(--c-border)',
                borderRadius: 14,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--c-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <ShieldCheck size={30} />
              </div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                Không có báo cáo nào
              </h4>
              <p style={{ color: 'var(--c-muted)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
                Hiện tại không có báo cáo vi phạm nào ở trạng thái {reportStatus === 'PENDING' ? 'chờ xử lý' : reportStatus}.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {reports.map((rep) => {
                const courseTitle = rep.courseTitle || rep.reviewCourseTitle || 'Khóa học liên quan'
                const studentName = rep.studentName || rep.reviewStudentName || 'Học viên'
                const studentEmail = rep.studentEmail || rep.reviewStudentEmail
                const rating = rep.rating ?? rep.reviewRating ?? 5
                const comment = rep.comment ?? rep.reviewComment
                const reportImageUrl = rep.imageUrl || rep.reportedImage?.url
                const reportImageId = rep.imageId || rep.reportedImage?.id
                const resolvedAdmin = rep.resolvedByName || rep.resolvedBy?.fullName

                return (
                  <div
                    key={rep.id}
                    className="card"
                    style={{
                      padding: 20,
                      borderRadius: 10,
                      background: 'var(--surface)',
                      border: '1px solid var(--c-border)',
                      borderLeft:
                        rep.status === 'PENDING'
                          ? '4px solid var(--c-danger)'
                          : '4px solid var(--c-muted)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    {/* Hàng trên: Thông tin báo cáo & Trạng thái */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                        marginBottom: 16,
                        paddingBottom: 14,
                        borderBottom: '1px solid var(--c-border, #e2e8f0)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 12,
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--c-danger)',
                          }}
                        >
                          {formatReason(rep.reason)}
                        </span>
                        {reportImageUrl && (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: 12,
                              background: 'rgba(245, 158, 11, 0.1)',
                              color: 'var(--c-warning)',
                            }}
                          >
                            Báo cáo Hình ảnh
                          </span>
                        )}
                        <span style={{ fontSize: 13, color: 'var(--c-muted)' }}>
                          Báo cáo bởi: <strong style={{ color: 'var(--text)' }}>{rep.reporterName || 'Người dùng'}</strong>
                          {rep.reporterEmail ? ` (${rep.reporterEmail})` : ''} •{' '}
                          {rep.createdAt ? new Date(rep.createdAt).toLocaleString('vi-VN') : '—'}
                        </span>
                      </div>

                      <div>
                        {rep.status === 'PENDING' ? (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '3px 10px',
                              borderRadius: 6,
                              background: 'rgba(245, 158, 11, 0.12)',
                              color: 'var(--c-warning)',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                            }}
                          >
                            Chờ xử lý
                          </span>
                        ) : rep.status === 'RESOLVED_HIDDEN' ? (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '3px 10px',
                              borderRadius: 6,
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: 'var(--c-danger)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                            }}
                          >
                            Đã ẩn nội dung
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '3px 10px',
                              borderRadius: 6,
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: 'var(--c-success)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                            }}
                          >
                            Đã bác bỏ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lời nhắn học viên */}
                    {rep.details && (
                      <div
                        style={{
                          padding: '10px 14px',
                          background: 'var(--surface-2)',
                          borderRadius: 8,
                          fontSize: 13.5,
                          color: 'var(--text-dim)',
                          marginBottom: 16,
                          border: '1px solid var(--c-border)',
                        }}
                      >
                        <strong style={{ color: 'var(--text)' }}>Lời nhắn của học viên:</strong> "{rep.details}"
                      </div>
                    )}

                    {/* Nội dung đánh giá bị báo cáo */}
                    <div
                      style={{
                        padding: 16,
                        background: 'var(--surface-2)',
                        borderRadius: 8,
                        marginBottom: 16,
                        border: '1px solid var(--c-border, #e2e8f0)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                            Khóa học: {courseTitle}
                          </span>
                          <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 4 }}>
                            Tác giả đánh giá: <strong>{studentName}</strong>
                            {studentEmail ? ` (${studentEmail})` : ''}
                          </div>
                        </div>
                        <div>
                          <StarRating value={rating} size={15} />
                        </div>
                      </div>

                      <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>
                        {comment || <em>(Đánh giá không có lời bình)</em>}
                      </p>

                      {reportImageUrl && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-warning)', marginBottom: 6 }}>
                            Hình ảnh bị tố cáo:
                          </div>
                          <img
                            src={reportImageUrl}
                            alt="Ảnh bị báo cáo"
                            onClick={() => setPreviewImage(reportImageUrl)}
                            style={{
                              width: 100,
                              height: 100,
                              objectFit: 'cover',
                              borderRadius: 8,
                              border: '2px solid var(--c-danger)',
                              cursor: 'pointer',
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Thông tin giải quyết */}
                    {resolvedAdmin && (
                      <div style={{ fontSize: 12, color: 'var(--c-muted)', marginBottom: 14 }}>
                        Xử lý bởi <strong>{resolvedAdmin}</strong> vào{' '}
                        {rep.resolvedAt ? new Date(rep.resolvedAt).toLocaleString('vi-VN') : '—'}
                        {rep.resolutionNote && <div>Ghi chú: {rep.resolutionNote}</div>}
                      </div>
                    )}

                    {/* Nút thao tác khi PENDING */}
                    {rep.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: 4 }}>
                        <button
                          type="button"
                          className="btn secondary sm"
                          onClick={() => setDismissModal({ open: true, reportId: rep.id })}
                        >
                          Bác bỏ báo cáo
                        </button>

                        {reportImageId && (
                          <button
                            type="button"
                            className="btn secondary sm flex-row items-center gap-6"
                            style={{ color: 'var(--c-warning)' }}
                            onClick={() =>
                              openHideImageModal(
                                reportImageId,
                                rep.reviewId,
                                rep.id,
                                'Hình ảnh vi phạm quy chế hoặc lộ dữ liệu nhạy cảm'
                              )
                            }
                          >
                            <EyeOff size={14} />
                            <span>Ẩn riêng ảnh vi phạm</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn danger sm flex-row items-center gap-6"
                          onClick={() =>
                            openHideReviewModal(
                              rep.reviewId,
                              rep.id,
                              formatReason(rep.reason) + (rep.details ? `: ${rep.details}` : '')
                            )
                          }
                        >
                          <ShieldAlert size={14} />
                          <span>Ẩn toàn bộ đánh giá</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TẤT CẢ ĐÁNH GIÁ                                    */}
      {/* ======================================================== */}
      {activeTab === 'all-reviews' && (
        <div>
          {/* Bộ lọc trạng thái & Tìm kiếm */}
          <div className="admin-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <div className="search-input-wrap" style={{ minWidth: 280, flex: 1 }}>
              <Search size={15} style={{ color: 'var(--c-muted)' }} />
              <input
                type="text"
                placeholder="Tìm nội dung, tên học viên, email hoặc khóa học..."
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
              />
            </div>

            <div className="filter-select-wrap">
              <select className="admin-select" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PUBLISHED">Công khai (PUBLISHED)</option>
                <option value="FLAGGED">Gắn cờ / Chờ duyệt (FLAGGED)</option>
                <option value="HIDDEN">Bị ẩn bởi Admin (HIDDEN)</option>
                <option value="DELETED">Đã xóa mềm (DELETED)</option>
              </select>
            </div>
          </div>

          {loadingReviews ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--c-muted)' }}>
              Đang tải danh sách đánh giá...
            </div>
          ) : reviews.length === 0 ? (
            <div
              className="card"
              style={{
                padding: 40,
                textAlign: 'center',
                background: 'var(--surface)',
                border: '1px solid var(--c-border)',
                borderRadius: 8,
              }}
            >
              <MessageSquare size={36} style={{ color: 'var(--c-muted)', margin: '0 auto 12px' }} />
              <h4 style={{ margin: 0, fontSize: 16, color: 'var(--text)' }}>Không tìm thấy đánh giá nào</h4>
              <p style={{ color: 'var(--c-muted)', fontSize: 14, marginTop: 4 }}>
                Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="card"
                  style={{
                    padding: 18,
                    borderRadius: 8,
                    background: 'var(--surface)',
                    border: '1px solid var(--c-border)',
                  }}
                >
                  {/* Header Đánh giá: Người dùng + Khóa học + Trạng thái */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 14, color: 'var(--text)' }}>{r.studentFullName}</strong>
                        {r.studentEmail && (
                          <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>({r.studentEmail})</span>
                        )}
                        {r.progressAtReview != null && (
                          <span
                            style={{
                              fontSize: 12,
                              padding: '1px 8px',
                              borderRadius: 10,
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--c-success)',
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
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: 'var(--accent)',
                              fontWeight: 600,
                            }}
                          >
                            Cho phép giới thiệu
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 12 }}>
                        <span style={{ color: 'var(--c-muted)' }}>
                          Khóa học: <strong>{r.courseTitle}</strong>
                        </span>
                        <span style={{ color: 'var(--c-muted)' }}>
                          • {new Date(r.createdAt).toLocaleString('vi-VN')}
                          {r.isEdited && ' (đã sửa)'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StarRating value={r.rating} size={15} />
                      <StatusBadge status={r.status} />
                      {r.reportCount > 0 && (
                        <span
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: 'var(--c-danger)',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {r.reportCount} báo cáo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lý do ẩn hoặc gắn cờ */}
                  {r.hiddenReason && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: r.status === 'HIDDEN' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                        border:
                          r.status === 'HIDDEN'
                            ? '1px solid rgba(239, 68, 68, 0.25)'
                            : '1px solid rgba(245, 158, 11, 0.25)',
                        color: r.status === 'HIDDEN' ? 'var(--c-danger)' : 'var(--c-warning)',
                        fontSize: 12,
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <AlertTriangle size={14} />
                      <span>
                        <strong>{r.status === 'HIDDEN' ? 'Lý do ẩn:' : 'Lý do gắn cờ:'}</strong> {r.hiddenReason}
                        {r.hiddenByName && ` (bởi ${r.hiddenByName} lúc ${new Date(r.hiddenAt).toLocaleString('vi-VN')})`}
                      </span>
                    </div>
                  )}

                  {/* Bình luận */}
                  <p style={{ margin: '0 0 10px 0', fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
                    {r.comment || <em style={{ color: 'var(--c-muted)' }}>(Không có nội dung lời bình)</em>}
                  </p>

                  {/* Hình ảnh */}
                  {r.images && r.images.length > 0 && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                      {r.images.map((img) => (
                        <div
                          key={img.id}
                          style={{
                            position: 'relative',
                            width: 80,
                            height: 80,
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: img.isHidden ? '2px solid var(--c-danger)' : '1px solid var(--c-border)',
                          }}
                        >
                          <img
                            src={img.url}
                            alt="Ảnh đính kèm"
                            onClick={() => setPreviewImage(img.url)}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              cursor: 'pointer',
                              filter: img.isHidden ? 'grayscale(80%) blur(1px)' : 'none',
                            }}
                          />
                          {img.isHidden ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreImage(img.id)}
                              title="Khôi phục ảnh"
                              style={{
                                position: 'absolute',
                                bottom: 2,
                                right: 2,
                                background: 'var(--c-success)',
                                color: 'var(--surface)',
                                border: 'none',
                                borderRadius: 4,
                                padding: '2px 4px',
                                fontSize: 10,
                                cursor: 'pointer',
                              }}
                            >
                              Khôi phục
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openHideImageModal(img.id, r.id)}
                              title="Ẩn ảnh này"
                              style={{
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                background: 'rgba(239, 68, 68, 0.85)',
                                color: 'var(--surface)',
                                border: 'none',
                                borderRadius: 4,
                                padding: '2px 4px',
                                fontSize: 10,
                                cursor: 'pointer',
                              }}
                            >
                              Ẩn ảnh
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Phản hồi giảng viên */}
                  {r.teacherReply && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: 'rgba(99, 102, 241, 0.05)',
                        borderLeft: '3px solid var(--accent)',
                        fontSize: 12,
                        marginBottom: 12,
                      }}
                    >
                      <strong>Giảng viên phản hồi:</strong> {r.teacherReply}
                    </div>
                  )}

                  {/* Nút thao tác */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      justifyContent: 'flex-end',
                      borderTop: '1px solid var(--c-border)',
                      paddingTop: 10,
                    }}
                  >
                    {(r.status === 'FLAGGED' || r.status === 'HIDDEN') && (
                      <button
                        type="button"
                        className="btn primary sm flex-row items-center gap-6"
                        onClick={() => handleRestoreReview(r.id)}
                      >
                        <CheckCircle size={14} />
                        <span>{r.status === 'FLAGGED' ? 'Phê duyệt hiển thị' : 'Khôi phục hiển thị'}</span>
                      </button>
                    )}

                    {(r.status === 'PUBLISHED' || r.status === 'FLAGGED') && (
                      <button
                        type="button"
                        className="btn danger sm flex-row items-center gap-6"
                        onClick={() => openHideReviewModal(r.id)}
                      >
                        <EyeOff size={14} />
                        <span>Ẩn đánh giá</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Ẩn đánh giá hoặc hình ảnh */}
      {hideModal.open && (
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
              maxWidth: 520,
              padding: 24,
              borderRadius: 12,
              background: 'var(--surface)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--c-danger)' }}>
                {hideModal.action === 'HIDE_REVIEW' ? 'Ẩn đánh giá vi phạm' : 'Ẩn hình ảnh vi phạm'}
              </h4>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => setHideModal({ ...hideModal, open: false })}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ color: 'var(--c-muted)', fontSize: 14, marginBottom: 16 }}>
              Lý do ẩn sẽ được lưu vào lịch sử kiểm duyệt và thông báo gửi trực tiếp đến học viên.
            </p>

            <div className="field" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Chọn lý do mẫu:
              </label>
              <select
                value={hideModal.reason}
                onChange={(e) => setHideModal({ ...hideModal, reason: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--c-border)' }}
              >
                {hideModal.action === 'HIDE_REVIEW' ? (
                  <>
                    <option value="Nội dung chứa từ ngữ thô tục, xúc phạm hoặc bôi nhọ">
                      Từ ngữ thô tục, xúc phạm hoặc bôi nhọ
                    </option>
                    <option value="Chứa số điện thoại, link quảng cáo hoặc kéo nhóm lừa đảo">
                      Chứa số điện thoại, link quảng cáo ngoài
                    </option>
                    <option value="Đánh giá spam, vô nghĩa hoặc không liên quan đến khóa học">
                      Đánh giá spam, vô nghĩa
                    </option>
                    <option value="Lộ dữ liệu cá nhân nhạy cảm (CCCD, thẻ sinh viên, chân dung)">
                      Lộ dữ liệu cá nhân nhạy cảm
                    </option>
                    <option value="">Lý do khác (tự nhập bên dưới)</option>
                  </>
                ) : (
                  <>
                    <option value="Hình ảnh chứa thông tin cá nhân nhạy cảm (CCCD, mã dự thi, ngày sinh)">
                      Chứa CCCD, mã dự thi, ngày sinh
                    </option>
                    <option value="Hình ảnh phản cảm, thô tục hoặc không phù hợp giáo dục">
                      Hình ảnh phản cảm, không phù hợp
                    </option>
                    <option value="Hình ảnh chứa số điện thoại hoặc mã QR quảng cáo ngoài">
                      Chứa số điện thoại hoặc mã QR quảng cáo
                    </option>
                    <option value="">Lý do khác (tự nhập bên dưới)</option>
                  </>
                )}
              </select>
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Chi tiết lý do (hoặc nhập lý do riêng):
              </label>
              <textarea
                rows={3}
                placeholder="Nhập chi tiết cụ thể để thông báo rõ ràng cho học viên..."
                value={hideModal.customReason}
                onChange={(e) => setHideModal({ ...hideModal, customReason: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--c-border)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => setHideModal({ ...hideModal, open: false })}
                aria-label="Đóng"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn danger sm"
                onClick={handleConfirmHide}
              >
                Xác nhận ẩn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bác bỏ báo cáo */}
      <AdminActionModal
        open={dismissModal.open}
        type="prompt"
        title="Bác bỏ báo cáo vi phạm"
        message="Nhập ghi chú lý do bác bỏ báo cáo này:"
        defaultValue="Nội dung đánh giá hợp lệ, không vi phạm quy định."
        confirmText="Bác bỏ báo cáo"
        variant="primary"
        onConfirm={handleConfirmDismiss}
        onClose={() => setDismissModal({ open: false, reportId: null })}
      />

      {/* Lightbox xem ảnh */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            cursor: 'zoom-out',
          }}
        >
          <img
            src={previewImage}
            alt="Xem ảnh lớn"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 10, objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  )
}
