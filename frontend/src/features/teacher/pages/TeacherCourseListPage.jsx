import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useMyCourses } from '@shared/hooks/useCourses.js'
import AddCardTrigger from '@teacher/components/AddCardTrigger.jsx'
import { useSubmitCourse, useHideCourse, useShowCourse, useCancelSubmitCourse } from '@teacher/hooks/useTeacherCourses.js'
import { FolderOpen, Pencil, BookOpen, Send, EyeOff, Eye, Clock, Star, ChevronRight, RotateCcw, AlertCircle, Library, Database } from 'lucide-react'
import { resolveMediaUrl } from '@config/media.js'
import TeacherVocabLibraryPage from '@teacher/pages/TeacherVocabLibraryPage.jsx'
import TeacherQuestionBankPage from '@teacher/pages/TeacherQuestionBankPage.jsx'
import { useState, useEffect } from 'react'
import CourseReadinessModal from '@teacher/components/modals/CourseReadinessModal.jsx'
import CourseRejectDetailModal from '@teacher/components/modals/CourseRejectDetailModal.jsx'
import { parseRejectReason } from '@teacher/utils/rejectReasonParser.js'
import { useAuthStore } from '@auth/store/authStore.js'
import { useRealtimeEvent } from '@shared/realtime/index.js'
import { useToast, useConfirm } from '@shared/context/AppUIContext.jsx'

const stripHtml = (html) => {
  if (!html) return ''
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
}

const STATUS_BADGE = {
  DRAFT: { cls: 'neutral', label: 'Bản nháp' },
  PENDING_REVIEW: { cls: 'warn', label: 'Chờ duyệt' },
  PUBLISHED: { cls: 'good', label: 'Đã xuất bản' },
  HIDDEN: { cls: 'neutral', label: 'Đã ẩn' },
  REJECTED: { cls: 'bad', label: 'Bị từ chối' },
}

/**
 * TeacherCourseListPage — Điểm vào chính của toàn bộ CMS giáo viên:
 * Liệt kê khoá học đã tạo + card [+ Tạo khoá học]. Bấm vào 1 khoá học đưa thẳng vào khu vực soạn bài.
 */
export default function TeacherCourseListPage() {
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const { data: courses, isLoading } = useMyCourses()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab = rawTab === 'vocab' || rawTab === 'questions' ? rawTab : 'courses'

  // Lắng nghe trạng thái khóa học thay đổi theo thời gian thực (duyệt/từ chối)
  useRealtimeEvent('course-status', (payload) => {
    qc.invalidateQueries({ queryKey: ['courses', 'mine'] })
    if (payload?.courseId) {
      qc.invalidateQueries({ queryKey: ['course', payload.courseId] })
    }
  })

  const handleTabChange = (newTab) => {
    const next = new URLSearchParams(searchParams)
    if (newTab === 'courses') {
      next.delete('tab')
    } else {
      next.set('tab', newTab)
    }
    setSearchParams(next, { replace: true })
  }

  const [readinessCourseId, setReadinessCourseId] = useState(null)
  const [rejectModalCourse, setRejectModalCourse] = useState(null)

  useEffect(() => {
    refreshProfile()
  }, [])

  // Tự động mở modal chi tiết từ chối nếu có tham số rejectCourseId trên URL (từ thông báo chuông)
  useEffect(() => {
    const rId = searchParams.get('rejectCourseId')
    if (rId && courses && courses.length > 0) {
      const found = courses.find((c) => c.id === rId)
      if (found) {
        setRejectModalCourse(found)
      }
    }
  }, [searchParams, courses])

  const openCreate = () => {
    if (user?.status === 'PENDING_APPROVAL') {
      toast.warning('Tài khoản giảng viên của bạn đang chờ quản trị viên phê duyệt. Trong thời gian này bạn chưa thể tạo khóa học.')
      return
    }
    navigate('/teacher/courses/new')
  }

  const openEdit = (course) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/teacher/courses/${course.id}/edit`)
  }

  return (
    <div>
      {user?.status === 'PENDING_APPROVAL' && (
        <div
          style={{
            marginBottom: 20,
            padding: '14px 18px',
            borderRadius: 8,
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 14,
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Tài khoản giảng viên đang chờ duyệt:</strong> Tài khoản của bạn đang được quản trị viên xem xét. Trong thời gian này bạn vẫn có thể học tập các khóa học nhưng chưa thể tạo khóa học hoặc gửi yêu cầu rút tiền.
          </div>
        </div>
      )}

      {/* 3 Cục Card Tab Nổi Bật: Khóa học của tôi | Thư viện từ vựng | Ngân hàng câu hỏi */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        {[
          {
            id: 'courses',
            label: 'Khóa học của tôi',
            count: courses?.length,
            desc: 'Quản lý bài giảng & nội dung khóa học',
            icon: BookOpen,
            color: '#2563eb',
            softBg: 'rgba(37, 99, 235, 0.08)',
            softBorder: 'rgba(37, 99, 235, 0.25)',
            activeShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.22)',
          },
          {
            id: 'vocab',
            label: 'Thư viện từ vựng',
            badge: 'Flashcard',
            desc: 'Kho từ vựng & flashcard bài học',
            icon: Library,
            color: '#059669',
            softBg: 'rgba(5, 150, 105, 0.08)',
            softBorder: 'rgba(5, 150, 105, 0.25)',
            activeShadow: '0 8px 20px -4px rgba(5, 150, 105, 0.22)',
          },
          {
            id: 'questions',
            label: 'Ngân hàng câu hỏi',
            badge: 'Trắc nghiệm',
            desc: 'Kho câu hỏi kiểm tra & bài luyện tập',
            icon: Database,
            color: '#7c3aed',
            softBg: 'rgba(124, 58, 237, 0.08)',
            softBorder: 'rgba(124, 58, 237, 0.25)',
            activeShadow: '0 8px 20px -4px rgba(124, 58, 237, 0.22)',
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                borderRadius: 14,
                cursor: 'pointer',
                textAlign: 'left',
                border: isActive ? `2px solid ${tab.color}` : '1.5px solid var(--border)',
                background: isActive ? 'var(--surface)' : 'var(--surface)',
                boxShadow: isActive ? tab.activeShadow : '0 1px 3px rgba(0, 0, 0, 0.04)',
                transform: isActive ? 'translateY(-2px)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = tab.color
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.06)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              {/* Dải vạch màu active ở góc trên */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3.5,
                    background: tab.color,
                  }}
                />
              )}

              {/* Icon Box */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: isActive ? tab.color : tab.softBg,
                  color: isActive ? '#ffffff' : tab.color,
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? `0 4px 10px ${tab.softBorder}` : 'none',
                }}
              >
                <Icon size={22} strokeWidth={isActive ? 2.3 : 2} />
              </div>

              {/* Thông tin Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: isActive ? 700 : 600,
                      color: 'var(--text)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {tab.label}
                  </span>

                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: isActive ? tab.color : tab.softBg,
                        color: isActive ? '#ffffff' : tab.color,
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {tab.count}
                    </span>
                  )}

                  {tab.badge && (
                    <span
                      style={{
                        fontSize: 10.5,
                        padding: '1px 6px',
                        borderRadius: 6,
                        background: isActive ? tab.softBg : 'var(--surface-2)',
                        color: isActive ? tab.color : 'var(--text-dim)',
                        border: `1px solid ${isActive ? tab.softBorder : 'var(--border)'}`,
                        fontWeight: 600,
                        lineHeight: 1.4,
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: isActive ? 'var(--text-muted)' : 'var(--text-dim)',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {tab.desc}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tab 1: Khóa học của tôi */}
      {activeTab === 'courses' && (
        <>
          <div className="teacher-toolbar">
            <div>
              <h2 style={{ margin: 0 }}>Khoá học của tôi</h2>
              <p className="text-dim text-sm" style={{ marginTop: 4 }}>
                Quản lý nội dung, từ vựng và bài luyện tập cho từng khoá học bạn phụ trách.
              </p>
            </div>
          </div>

          {isLoading && <p className="text-dim">Đang tải...</p>}

          {!isLoading && (!courses || courses.length === 0) && (
            <div className="empty-state">
              <div className="icon">
                <FolderOpen size={24} />
              </div>
              <p>Bạn chưa tạo khoá học nào.</p>
            </div>
          )}

          <div className="teacher-course-grid mt-16">
            {(courses || []).map((c) => (
              <TeacherCourseCard
                key={c.id}
                course={c}
                onEdit={openEdit(c)}
                onOpen={() => navigate(`/teacher/courses/${c.id}/content`)}
                onOpenReadiness={() => setReadinessCourseId(c.id)}
                onOpenRejectDetail={() => setRejectModalCourse(c)}
              />
            ))}

            <div className="teacher-add-card-wrapper">
              <AddCardTrigger label="Tạo khoá học mới" onClick={openCreate} />
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Thư viện từ vựng */}
      {activeTab === 'vocab' && <TeacherVocabLibraryPage />}

      {/* Tab 3: Ngân hàng câu hỏi */}
      {activeTab === 'questions' && <TeacherQuestionBankPage embedded={true} />}

      <CourseReadinessModal
        isOpen={Boolean(readinessCourseId)}
        courseId={readinessCourseId}
        onClose={() => setReadinessCourseId(null)}
      />

      <CourseRejectDetailModal
        isOpen={Boolean(rejectModalCourse)}
        course={rejectModalCourse}
        onClose={() => setRejectModalCourse(null)}
        onGoEdit={(c) => navigate(`/teacher/courses/${c.id}/content`)}
      />
    </div>
  )
}

function TeacherCourseCard({ course, onEdit, onOpen, onOpenReadiness, onOpenRejectDetail }) {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const submitCourse = useSubmitCourse()
  const cancelSubmit = useCancelSubmitCourse()
  const hideCourse = useHideCourse()
  const showCourse = useShowCourse()
  const badge = STATUS_BADGE[course.status] || STATUS_BADGE.DRAFT
  const busy = submitCourse.isPending || cancelSubmit.isPending || hideCourse.isPending || showCourse.isPending

  const handleAction = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (course.status === 'PUBLISHED') {
      const ok = await confirm({
        title: 'Ẩn khoá học',
        message: 'Bạn có chắc muốn ẩn khoá học này khỏi học viên?',
        confirmLabel: 'Ẩn khoá học',
        variant: 'warning',
      })
      if (ok) hideCourse.mutate(course.id)
    } else if (course.status === 'HIDDEN') {
      showCourse.mutate(course.id)
    } else if (course.status === 'DRAFT' || course.status === 'REJECTED') {
      if (onOpenReadiness) {
        onOpenReadiness()
      } else {
        const ok = await confirm({
          title: 'Gửi duyệt khoá học',
          message: 'Gửi khoá học này tới Quản trị viên để xét duyệt?',
          confirmLabel: 'Gửi duyệt',
          variant: 'primary',
        })
        if (ok) {
          submitCourse.mutate(course.id, {
            onError: (err) => {
              const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Không thể gửi duyệt'
              toast.error('Không thể gửi duyệt: ' + msg)
            },
            onSuccess: () => {
              toast.success('Đã gửi duyệt khóa học thành công!')
            },
          })
        }
      }
    }
  }

  const parsedReject = course.status === 'REJECTED' && course.rejectReason
    ? parseRejectReason(course.rejectReason)
    : null

  return (
    <div className="card hoverable course-card teacher-course-card editable-block" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <div className="editable-actions">
        <button type="button" onClick={onEdit} title="Sửa thông tin khoá học">
          <Pencil size={14} />
        </button>
      </div>

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
      </div>

      <div className="course-card-body">
        <div className="flex-between" style={{ marginBottom: 10, alignItems: 'center' }}>
          <span className={`badge ${badge.cls}`}>{badge.label}</span>
          {course.level && (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
              {course.level}
            </span>
          )}
        </div>

        <h3 className="course-title" title={course.title}>
          {course.title}
        </h3>

        <p className="course-description">
          {stripHtml(course.description) || 'Chưa có mô tả khoá học.'}
        </p>

        {/* Khối hiển thị lý do từ chối cải tiến: gọn gàng, có nút xem chi tiết */}
        {parsedReject && (
          <div
            className="teacher-reject-summary-card"
            style={{
              padding: '10px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              margin: '0 0 14px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
            onClick={(e) => {
              e.stopPropagation()
              onOpenRejectDetail?.()
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertCircle size={14} />
                <span>Yêu cầu chỉnh sửa</span>
              </span>
              {parsedReject.reasonLabel && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#991b1b',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    padding: '1px 6px',
                    borderRadius: 4,
                    maxWidth: 140,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={parsedReject.reasonLabel}
                >
                  {parsedReject.reasonLabel}
                </span>
              )}
            </div>

            {parsedReject.adminNote && (
              <div
                style={{
                  fontSize: 12,
                  color: '#475569',
                  fontStyle: 'italic',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                title={parsedReject.adminNote}
              >
                "{parsedReject.adminNote}"
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 2,
                paddingTop: 6,
                borderTop: '1px dashed #fecaca',
              }}
            >
              <span style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 600 }}>
                {parsedReject.issues.length > 0 ? `${parsedReject.issues.length} vấn đề cần sửa` : 'Cần xem lại nội dung'}
              </span>
              <button
                type="button"
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#dc2626',
                  background: '#ffffff',
                  border: '1px solid #fca5a5',
                  padding: '3px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onOpenRejectDetail?.()
                }}
              >
                <span>Xem chi tiết</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Khung tương tác Đánh giá học viên (Click để vào trang quản lý đánh giá) */}
        <div
          className="teacher-rating-action-card"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            navigate(`/teacher/courses/${course.id}/reviews`)
          }}
          title="Nhấn để xem và phản hồi các đánh giá của học viên"
        >
          <div className="rating-card-left">
            <Star size={14} fill="#f59e0b" color="#f59e0b" />
            <strong className="rating-score">
              {course.averageRating ? course.averageRating.toFixed(1) : '0.0'}
            </strong>
            <span className="rating-dot">•</span>
            <span className="rating-text">
              {course.reviewCount > 0 ? `${course.reviewCount} đánh giá` : 'Chưa có đánh giá'}
            </span>
          </div>
          <div className="rating-card-right">
            <span>Xem đánh giá</span>
            <ChevronRight size={13} className="rating-arrow" />
          </div>
        </div>

        {/* Footer: Nút trạng thái khóa học duy nhất */}
        <div className="teacher-course-footer" onClick={(e) => e.stopPropagation()}>
          {course.status === 'PENDING_REVIEW' ? (
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                type="button"
                className="teacher-status-btn pending"
                disabled
                style={{ flex: 1 }}
                title="Khoá học đang chờ quản trị viên phê duyệt"
              >
                <Clock size={15} />
                <span>Chờ duyệt</span>
              </button>
              <button
                type="button"
                className="teacher-status-btn"
                style={{
                  background: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
                disabled={busy}
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const ok = await confirm({
                    title: 'Rút lại yêu cầu duyệt',
                    message: 'Bạn có chắc muốn rút lại khoá học này về bản nháp để tiếp tục chỉnh sửa?',
                    confirmLabel: 'Rút lại',
                    variant: 'warning',
                  })
                  if (ok) {
                    cancelSubmit.mutate(course.id, {
                      onError: (err) => {
                        const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Không thể rút lại yêu cầu duyệt'
                        toast.error('Không thể rút lại: ' + msg)
                      },
                      onSuccess: () => {
                        toast.success('Đã rút lại yêu cầu duyệt. Khoá học hiện ở trạng thái Bản nháp để bạn chỉnh sửa!')
                      },
                    })
                  }
                }}
                title="Rút lại yêu cầu kiểm duyệt để tiếp tục chỉnh sửa khóa học"
              >
                <RotateCcw size={14} />
                <span>Rút lại</span>
              </button>
            </div>
          ) : course.status === 'PUBLISHED' ? (
            <button
              type="button"
              className="teacher-status-btn hide"
              onClick={handleAction}
              disabled={busy}
              title="Ẩn khoá học này khỏi học viên"
            >
              <EyeOff size={15} />
              <span>Ẩn khoá học</span>
            </button>
          ) : course.status === 'HIDDEN' ? (
            <button
              type="button"
              className="teacher-status-btn show"
              onClick={handleAction}
              disabled={busy}
              title="Hiện lại khoá học cho học viên"
            >
              <Eye size={15} />
              <span>Hiện lại khoá học</span>
            </button>
          ) : (
            <button
              type="button"
              className="teacher-status-btn submit"
              onClick={handleAction}
              disabled={busy}
              title="Gửi khoá học tới quản trị viên để xét duyệt"
            >
              <Send size={15} />
              <span>Gửi Admin duyệt</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
