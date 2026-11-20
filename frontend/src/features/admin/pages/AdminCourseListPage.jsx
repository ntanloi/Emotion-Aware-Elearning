import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as adminApi from '@admin/api/admin.js'
import AdminActionModal from '@admin/components/AdminActionModal.jsx'
import AdminPageHeader from '@admin/components/ui/AdminPageHeader.jsx'
import RiskBadge from '@admin/components/ui/RiskBadge.jsx'
import StatusBadge from '@admin/components/ui/StatusBadge.jsx'
import { useToast, useConfirm } from '@admin/context/AdminUIContext.jsx'
import { formatWaitingTime, getWaitUrgencyClass } from '@admin/utils/adminFormatters.js'
import { useRealtimeEvent } from '@shared/realtime/index.js'
import {
  BookOpen,
  Search,
  User,
  Eye,
  ShieldAlert,
  RotateCcw,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'

import { formatVnDate, vnTime } from '@shared/utils/dateTime.js'
function CourseAiBadge({ reportJson }) {
  if (!reportJson) {
    return <span style={{ fontSize: 12, color: 'var(--c-muted, #94a3b8)' }}>Chưa kiểm tra</span>
  }
  let report = null
  try {
    report = typeof reportJson === 'string' ? JSON.parse(reportJson) : reportJson
  } catch (e) {
    return <span style={{ fontSize: 12, color: 'var(--c-muted, #94a3b8)' }}>Lỗi đọc dữ liệu</span>
  }

  const errors = report?.errorCount || 0
  const warnings = report?.warningCount || 0
  const riskLevel = report?.riskLevel || (errors > 0 ? 'HIGH' : warnings > 0 ? 'MEDIUM' : 'LOW')
  const score = report?.riskScore !== undefined ? ` • Điểm rủi ro: ${report.riskScore}` : ''

  if (errors > 0) {
    return (
      <div title={`${errors} lỗi vi phạm, ${warnings} cảnh báo${score}`}>
        <RiskBadge level={riskLevel} label={`${errors} lỗi • ${riskLevel}`} />
      </div>
    )
  }
  if (warnings > 0) {
    return (
      <div title={`${warnings} cảnh báo${score}`}>
        <RiskBadge level={riskLevel} label={`${warnings} cảnh báo • ${riskLevel}`} />
      </div>
    )
  }
  return (
    <div title={`Khóa học đạt toàn bộ chuẩn tự động${score}`}>
      <RiskBadge level="LOW" label="Đạt chuẩn" />
    </div>
  )
}

export default function AdminCourseListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'PENDING_REVIEW'

  const [courses, setCourses] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  // Bộ lọc tìm kiếm debounce
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pendingCount, setPendingCount] = useState(0)

  // Modal actions
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [suspendModalOpen, setSuspendModalOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey })
    setPage(0)
  }

  const loadCourses = async () => {
    try {
      setLoading(true)
      let statusParam = undefined
      let sortParam = undefined
      if (currentTab === 'PENDING_REVIEW') {
        statusParam = 'PENDING_REVIEW'
        sortParam = 'submittedAt,asc' // Mặc định sắp xếp theo thời gian chờ lâu nhất (FIFO)
      } else if (currentTab === 'PUBLISHED') {
        statusParam = 'PUBLISHED'
      } else if (currentTab === 'FLAGGED') {
        statusParam = 'FLAGGED'
      }

      const data = await adminApi.getAdminCourses({
        status: statusParam,
        sort: sortParam,
        q: debouncedSearch || undefined,
        page,
        size: 15,
      })

      setCourses(data.content || [])
      setTotalElements(data.totalElements || 0)
      setTotalPages(data.totalPages || 1)

      if (currentTab === 'PENDING_REVIEW') {
        setPendingCount(data.totalElements || 0)
      }
    } catch (err) {
      console.error('Lỗi tải danh sách khóa học:', err)
      toast.error('Không thể tải danh sách khóa học')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [currentTab, debouncedSearch, page])

  // Lắng nghe tín hiệu Realtime để tự động cập nhật bảng khóa học
  useRealtimeEvent('admin-stats', () => {
    loadCourses()
    adminApi.getOverviewStats()
      .then((stats) => {
        if (stats?.pendingCourses !== undefined) {
          setPendingCount(stats.pendingCourses)
        }
      })
      .catch(() => {})
  })
  useRealtimeEvent('moderation-run', () => {
    loadCourses()
  })

  useEffect(() => {
    if (currentTab !== 'PENDING_REVIEW') {
      adminApi.getOverviewStats()
        .then((stats) => {
          if (stats?.pendingCourses !== undefined) {
            setPendingCount(stats.pendingCourses)
          }
        })
        .catch(() => {})
    }
  }, [currentTab])

  // Xử lý Tạm gỡ (Suspend)
  const handleSuspend = async (reason) => {
    if (!selectedCourse) return
    try {
      setProcessing(true)
      await adminApi.suspendCourse(selectedCourse.id, { reason })
      setSuspendModalOpen(false)
      toast.success(`Đã tạm gỡ khóa học "${selectedCourse.title}"`)
      await loadCourses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạm gỡ khóa học')
    } finally {
      setProcessing(false)
    }
  }

  // Xử lý Khôi phục (Restore) với modal useConfirm
  const handleRestore = async (course, e) => {
    e.stopPropagation()
    const ok = await confirm({
      title: 'Khôi phục khóa học',
      message: `Khôi phục và mở lại hiển thị cho khóa học "${course.title}"?`,
      confirmText: 'Khôi phục',
      variant: 'primary',
    })
    if (!ok) return

    try {
      await adminApi.restoreCourse(course.id)
      toast.success(`Đã khôi phục khóa học "${course.title}"`)
      await loadCourses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi khôi phục khóa học')
    }
  }

  return (
    <div className="admin-course-list-page">
      <AdminPageHeader
        title="Khóa học"
        badge={
          pendingCount > 0 ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--c-danger, #ef4444)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              {pendingCount} chờ duyệt
            </span>
          ) : null
        }
      />

      {/* Thanh tabs & Tìm kiếm */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div className="admin-segmented-tabs">
          <button
            type="button"
            className={`admin-segmented-tab ${currentTab === 'PENDING_REVIEW' ? 'active' : ''}`}
            onClick={() => handleTabChange('PENDING_REVIEW')}
          >
            <span>Chờ duyệt</span>
            {pendingCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  background: 'var(--c-danger, #ef4444)',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`admin-segmented-tab ${currentTab === 'PUBLISHED' ? 'active' : ''}`}
            onClick={() => handleTabChange('PUBLISHED')}
          >
            Đang xuất bản
          </button>

          <button
            type="button"
            className={`admin-segmented-tab ${currentTab === 'FLAGGED' ? 'active' : ''}`}
            onClick={() => handleTabChange('FLAGGED')}
          >
            Cần chú ý / Đã sửa
          </button>

          <button
            type="button"
            className={`admin-segmented-tab ${currentTab === 'ALL' ? 'active' : ''}`}
            onClick={() => handleTabChange('ALL')}
          >
            Tất cả
          </button>
        </div>

        <div className="search-input-wrap" style={{ minWidth: 260, maxWidth: 360, flex: 1 }}>
          <Search size={15} style={{ color: 'var(--c-muted, #94a3b8)' }} />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề khóa học..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Bảng danh sách khóa học */}
      {loading ? (
        <div className="p-24 text-center" style={{ color: 'var(--c-muted, #94a3b8)', padding: 48 }}>
          Đang tải danh sách khóa học...
        </div>
      ) : courses.length === 0 ? (
        <div
          style={{ maxWidth: 600, margin: '24px auto', padding: '48px 32px', textAlign: 'center', background: 'var(--surface, #ffffff)', borderRadius: 14, border: '1px solid var(--c-border, #e2e8f0)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><BookOpen size={28} /></div>
          <h4 className="mt-12" style={{ color: 'var(--text, #0f172a)', margin: '12px 0 4px' }}>
            Không có khóa học nào
          </h4>
          <p style={{ color: 'var(--c-muted, #64748b)', fontSize: 13, margin: 0 }}>
            {currentTab === 'PENDING_REVIEW'
              ? 'Hàng đợi sạch sẽ! Không có khóa học nào đang chờ thẩm định.'
              : 'Không tìm thấy khóa học nào phù hợp với bộ lọc.'}
          </p>
        </div>
      ) : (
        <div
          className="admin-table-wrap admin-table-wrap-cards"
          style={{
            background: 'var(--surface, #ffffff)',
            borderRadius: 8,
            border: '1px solid var(--c-border, #e2e8f0)',
            overflowX: 'auto',
          }}
        >
          <table className="admin-table admin-table-card-mobile" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: 'var(--surface-2, #f8fafc)',
                  borderBottom: '1px solid var(--c-border, #e2e8f0)',
                  textAlign: 'left',
                  fontSize: 13,
                  color: 'var(--text-dim, #475569)',
                }}
              >
                <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Khóa học</th>
                <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Giảng viên</th>

                {currentTab === 'PENDING_REVIEW' && (
                  <>
                    <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Thời gian chờ</th>
                    <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Kiểm tra tự động</th>
                  </>
                )}

                {currentTab === 'PUBLISHED' && (
                  <>
                    <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Học phí</th>
                    <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Cập nhật gần nhất</th>
                  </>
                )}

                {currentTab === 'FLAGGED' && (
                  <>
                    <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Trạng thái</th>
                    <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Thời điểm sửa</th>
                  </>
                )}

                {currentTab === 'ALL' && (
                  <>
                    <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Học phí</th>
                    <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  </>
                )}

                <th style={{ padding: '13px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const waitingTime = formatWaitingTime(c.submittedAt)
                const urgencyClass = getWaitUrgencyClass(c.submittedAt)
                const isModifiedAfterPublish =
                  c.contentChangedAt && c.reviewedAt && vnTime(c.contentChangedAt) > vnTime(c.reviewedAt)

                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/admin/moderation/${c.id}`)}
                    style={{
                      borderBottom: '1px solid var(--c-border, #f1f5f9)',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                    className="admin-interactive-row"
                  >
                    <td data-label="Khóa học" style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {c.coverUrl && (
                          <img
                            src={c.coverUrl}
                            alt=""
                            style={{
                              width: 48,
                              height: 32,
                              borderRadius: 4,
                              objectFit: 'cover',
                              border: '1px solid var(--c-border, #e2e8f0)',
                            }}
                          />
                        )}
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--text, #0f172a)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            <span>{c.title}</span>
                            {isModifiedAfterPublish && (
                              <span
                                style={{
                                  fontSize: 10,
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  color: 'var(--c-warning, #b45309)',
                                  border: '1px solid rgba(245, 158, 11, 0.25)',
                                  borderRadius: 4,
                                  padding: '1px 5px',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                                title="Giảng viên đã chỉnh sửa nội dung sau khi khóa học đã được duyệt"
                              >
                                <AlertTriangle size={10} />
                                <span>Đã sửa sau duyệt</span>
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--c-muted, #64748b)', marginTop: 2 }}>
                            {c.level || 'TOEIC'} • {c.durationHours || 0}h
                          </div>
                        </div>
                      </div>
                    </td>

                    <td data-label="Giảng viên" style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text, #334155)' }}>
                        <User size={14} style={{ color: 'var(--c-muted, #94a3b8)' }} />
                        <span>{c.teacherName || 'Chưa rõ'}</span>
                      </div>
                    </td>

                    {/* Cột theo từng tab */}
                    {currentTab === 'PENDING_REVIEW' && (
                      <>
                        <td data-label="Thời gian chờ" style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-dim, #475569)' }}>
                              {c.submittedAt ? formatVnDate(c.submittedAt) : '—'}
                            </div>
                            {waitingTime && (
                              <div className={`urgency-badge ${urgencyClass}`} style={{ marginTop: 4 }}>
                                <Clock size={11} />
                                <span>{waitingTime}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td data-label="Kiểm tra AI" style={{ padding: '12px 14px' }}>
                          <CourseAiBadge reportJson={c.aiModerationReport} />
                        </td>
                      </>
                    )}

                    {currentTab === 'PUBLISHED' && (
                      <>
                        <td data-label="Học phí" style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 500 }}>
                            {c.price ? `${Number(c.price).toLocaleString()} đ` : 'Miễn phí'}
                          </span>
                        </td>
                        <td data-label="Cập nhật" style={{ padding: '12px 14px', color: 'var(--c-muted, #64748b)' }}>
                          {c.updatedAt ? formatVnDate(c.updatedAt) : '—'}
                        </td>
                      </>
                    )}

                    {currentTab === 'FLAGGED' && (
                      <>
                        <td data-label="Trạng thái" style={{ padding: '12px 14px' }}>
                          <StatusBadge status={isModifiedAfterPublish ? 'MODIFIED' : c.status} />
                        </td>
                        <td data-label="Thời điểm sửa" style={{ padding: '12px 14px', color: 'var(--c-muted, #64748b)' }}>
                          {c.contentChangedAt ? formatVnDate(c.contentChangedAt) : '—'}
                        </td>
                      </>
                    )}

                    {currentTab === 'ALL' && (
                      <>
                        <td data-label="Học phí" style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 500 }}>
                            {c.price ? `${Number(c.price).toLocaleString()} đ` : 'Miễn phí'}
                          </span>
                        </td>
                        <td data-label="Trạng thái" style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <StatusBadge status={c.status} />
                            {c.rejectReason && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: 'var(--c-danger, #b91c1c)',
                                  marginTop: 4,
                                  maxWidth: 200,
                                }}
                                title={c.rejectReason}
                              >
                                {c.rejectReason.slice(0, 40)}...
                              </div>
                            )}
                          </div>
                        </td>
                      </>
                    )}

                    {/* Thao tác */}
                    <td data-label="Thao tác" style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="btn primary sm flex-row items-center gap-4"
                          style={{ fontSize: 12 }}
                          onClick={() => navigate(`/admin/moderation/${c.id}`)}
                        >
                          <Eye size={13} />
                          <span>{currentTab === 'PENDING_REVIEW' ? 'Thẩm định' : 'Chi tiết'}</span>
                        </button>

                        {c.status === 'PUBLISHED' && (
                          <button
                            type="button"
                            className="btn danger sm flex-row items-center gap-4"
                            style={{ fontSize: 12 }}
                            onClick={() => {
                              setSelectedCourse(c)
                              setSuspendModalOpen(true)
                            }}
                            title="Tạm gỡ khóa học vi phạm"
                          >
                            <ShieldAlert size={13} />
                            <span>Gỡ</span>
                          </button>
                        )}

                        {c.status === 'SUSPENDED' && (
                          <button
                            type="button"
                            className="btn secondary sm flex-row items-center gap-4"
                            style={{ fontSize: 12, color: 'var(--c-success, #15803d)' }}
                            onClick={(e) => handleRestore(c, e)}
                            title="Khôi phục khóa học"
                          >
                            <RotateCcw size={13} />
                            <span>Khôi phục</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Phân trang */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--c-muted, #64748b)' }}>
            Tổng số: {totalElements} khóa học • Trang {page + 1}/{totalPages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn secondary sm flex-row items-center gap-4"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft size={14} />
              <span>Trước</span>
            </button>
            <button
              type="button"
              className="btn secondary sm flex-row items-center gap-4"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <span>Sau</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Tạm gỡ */}
      <AdminActionModal
        open={suspendModalOpen}
        type="prompt"
        title="Tạm gỡ khóa học"
        message={`Nhập lý do tạm gỡ khóa học "${selectedCourse?.title}":`}
        defaultValue="Vi phạm quy định nền tảng"
        confirmText="Tạm gỡ"
        variant="danger"
        loading={processing}
        onConfirm={handleSuspend}
        onClose={() => setSuspendModalOpen(false)}
      />
    </div>
  )
}
