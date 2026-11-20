import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as adminApi from '@admin/api/admin.js'
import AdminActionModal from '@admin/components/AdminActionModal.jsx'
import Modal from '@shared/components/ui/Modal.jsx'
import { useToast, useConfirm } from '@admin/context/AdminUIContext.jsx'
import { useRealtimeEvent } from '@shared/realtime/index.js'
import { formatWaitingTime, getWaitUrgencyClass } from '@admin/utils/adminFormatters.js'
import CourseReviewHeader from '@admin/components/course-review/CourseReviewHeader.jsx'
import OutlinePanel from '@admin/components/course-review/OutlinePanel.jsx'
import ContentViewer from '@admin/components/course-review/ContentViewer.jsx'
import AiReportPanel from '@admin/components/course-review/AiReportPanel.jsx'
import DecisionPanel from '@admin/components/course-review/DecisionPanel.jsx'
import { RefreshCw, AlertCircle, Wrench } from 'lucide-react'
import './AdminReviewWorkspace.css'

import { vnTime } from '@shared/utils/dateTime.js'
const REJECT_REASONS = [
  { code: 'CONTENT_QUALITY', label: 'Chất lượng nội dung chưa đạt' },
  { code: 'FORMAT_ERROR', label: 'Sai định dạng chuẩn TOEIC' },
  { code: 'COPYRIGHT', label: 'Nghi vấn vi phạm bản quyền' },
  { code: 'UNSAFE_CONTENT', label: 'Nội dung không an toàn / từ ngữ nhạy cảm' },
  { code: 'MISLEADING_INFO', label: 'Tuyên bố sai lệch so với nội dung' },
  { code: 'INCOMPLETE', label: 'Chưa đủ bài tập tối thiểu' },
  { code: 'OTHER', label: 'Lý do khác' },
]

export default function AdminCourseReviewDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  // Dữ liệu chính
  const [data, setData] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [moderationData, setModerationData] = useState(null)
  const [readinessData, setReadinessData] = useState(null)
  const [decidingIssueId, setDecidingIssueId] = useState(null)
  const [loading, setLoading] = useState(true)

  // Mục bài học đang được chọn
  const [selectedItem, setSelectedItem] = useState(null)
  const [itemDetail, setItemDetail] = useState(null)
  const [itemLoading, setItemLoading] = useState(false)

  // Khóa học chờ duyệt tiếp theo trong hàng đợi FIFO
  const [nextPendingCourseId, setNextPendingCourseId] = useState(null)

  // Checklist kiểm duyệt
  const [checklist, setChecklist] = useState({
    contentAppropriate: false,
    answersAccurate: false,
    mediaPlayable: false,
    copyrightClean: false,
  })
  const [adminNote, setAdminNote] = useState('')

  // Trạng thái modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReasonCode, setRejectReasonCode] = useState('CONTENT_QUALITY')
  const [rejectNote, setRejectNote] = useState('')
  const [suspendModalOpen, setSuspendModalOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [reAuditing, setReAuditing] = useState(false)

  // Tải dữ liệu toàn bộ khóa học và cây bài giảng
  const loadWorkspace = async () => {
    try {
      setLoading(true)
      const [reviewDetails, preview, moderation, readiness] = await Promise.all([
        adminApi.getCourseReviewDetails(courseId),
        adminApi.getCoursePreview(courseId),
        adminApi.getCourseModeration(courseId).catch((err) => {
          console.warn('Chưa có dữ liệu moderation mới:', err)
          return null
        }),
        adminApi.getCourseReadiness(courseId).catch((err) => {
          console.warn('Không thể nạp dữ liệu readiness:', err)
          return null
        }),
      ])
      setData(reviewDetails)
      setPreviewData(preview)
      setModerationData(moderation)
      setReadinessData(readiness)

      // Tìm khóa học tiếp theo trong hàng đợi chờ duyệt (FIFO)
      try {
        const queueRes = await adminApi.getAdminCourses({
          status: 'PENDING_REVIEW',
          sort: 'submittedAt,asc',
          page: 0,
          size: 10,
        })
        const nextInQueue = queueRes.content?.find((c) => String(c.id) !== String(courseId))
        setNextPendingCourseId(nextInQueue ? nextInQueue.id : null)
      } catch (err) {
        console.warn('Không thể nạp hàng đợi duyệt:', err)
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu workspace kiểm duyệt:', err)
      toast.error('Không thể tải thông tin khóa học')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspace()
    setSelectedItem(null)
    setItemDetail(null)
  }, [courseId])

  // Lắng nghe sự kiện phân tích AI hoàn tất để tự động nạp lại không cần F5
  useRealtimeEvent('moderation-run', (payload) => {
    if (payload?.courseId === courseId) {
      toast.info('Kết quả phân tích kiểm duyệt AI đã được cập nhật!')
      loadWorkspace()
    }
  })

  // Xử lý quyết định của admin với từng issue vi phạm
  const handleIssueDecision = async (issueId, decision, note) => {
    try {
      setDecidingIssueId(issueId)
      await adminApi.updateIssueDecision(issueId, { decision, note })
      toast.success(
        decision === 'ACCEPT'
          ? 'Đã chấp nhận ngoại lệ (bỏ qua cảnh báo)'
          : decision === 'DISMISS'
          ? 'Đã bỏ qua cảnh báo'
          : 'Đã đánh dấu yêu cầu giảng viên sửa'
      )
      // Tải lại dữ liệu moderation để cập nhật chỉ số rủi ro và các ràng buộc
      const updatedModeration = await adminApi.getCourseModeration(courseId)
      setModerationData(updatedModeration)
    } catch (err) {
      console.error('Lỗi khi cập nhật quyết định xử lý issue:', err)
      toast.error(err.response?.data?.message || 'Không thể lưu quyết định xử lý')
    } finally {
      setDecidingIssueId(null)
    }
  }

  // Khi admin chọn một bài học ở cột trái -> gọi API tải chi tiết nội dung thật
  const handleSelectItem = async (item) => {
    if (!item) {
      setSelectedItem(null)
      setItemDetail(null)
      return
    }

    setSelectedItem(item)
    try {
      setItemLoading(true)
      const detail = await adminApi.getContentItemPreview(item.id)
      setItemDetail(detail)
    } catch (err) {
      console.error('Lỗi tải chi tiết bài học:', err)
      toast.error('Không thể tải chi tiết bài học')
    } finally {
      setItemLoading(false)
    }
  }

  // Parse báo cáo tự động / AI
  const aiReport = useMemo(() => {
    if (!data?.aiReport) return null
    try {
      return typeof data.aiReport === 'string' ? JSON.parse(data.aiReport) : data.aiReport
    } catch {
      return null
    }
  }, [data?.aiReport])

  // Gom các bài học có lỗi / cảnh báo trong báo cáo
  const issueMap = useMemo(() => {
    const map = {}
    if (moderationData?.issues && Array.isArray(moderationData.issues)) {
      for (const issue of moderationData.issues) {
        if (issue.targetId) {
          if (!map[issue.targetId] || issue.severity === 'ERROR') {
            map[issue.targetId] = issue.severity
          }
        }
      }
      return map
    }
    if (!aiReport?.issues) return map
    for (const issue of aiReport.issues) {
      if (issue.targetId) {
        map[issue.targetId] = issue.level
      }
    }
    return map
  }, [moderationData, aiReport])

  // Nhảy tới bài học khi click vào một issue trong báo cáo kiểm tra
  const handleJumpToIssue = (issue) => {
    const targetId = issue.targetId || issue.target_id
    if (!targetId) return
    handleSelectItem({ id: targetId, title: issue.targetTitle || issue.ruleCode || 'Bài học' })
  }

  // Xử lý Phê duyệt
  const handleExecuteApprove = async () => {
    const isHighRisk = aiReport?.riskLevel === 'HIGH'
    if (isHighRisk && (!adminNote || adminNote.trim().length < 10)) {
      toast.warning('Khóa học này có mức rủi ro CAO. Admin bắt buộc phải nhập ghi chú thẩm định (tối thiểu 10 ký tự).')
      return
    }

    const ok = await confirm({
      title: 'Phê duyệt khóa học',
      message: `Bạn có chắc chắn muốn phê duyệt và xuất bản khóa học "${data.course.title}" không?${
        nextPendingCourseId ? ' Hệ thống sẽ tự động chuyển tới khóa học chờ duyệt tiếp theo.' : ''
      }`,
      confirmText: 'Phê duyệt & Xuất bản',
      variant: 'primary',
    })
    if (!ok) return

    try {
      setProcessing(true)
      const checklistJson = JSON.stringify(checklist)
      const note = adminNote.trim() || 'Đã thẩm định đạt chuẩn chất lượng và TOEIC format'
      await adminApi.approveCourse(courseId, { note, checklist: checklistJson })
      toast.success('Đã phê duyệt xuất bản khóa học thành công')

      if (nextPendingCourseId) {
        navigate(`/admin/moderation/${nextPendingCourseId}`, { replace: true })
      } else {
        navigate('/admin/courses')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi phê duyệt khóa học')
    } finally {
      setProcessing(false)
    }
  }

  // Danh sách các vấn đề được kiểm duyệt viên yêu cầu sửa (NEED_FIX)
  const needFixIssues = useMemo(() => {
    return (moderationData?.issues || []).filter(
      (i) => i.decision?.decision === 'NEED_FIX'
    )
  }, [moderationData])

  // Xử lý Từ chối
  const handleExecuteReject = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    const note = rejectNote.trim()
    if (!note) {
      toast.warning('Vui lòng nhập ghi chú hướng dẫn giảng viên chỉnh sửa')
      return
    }

    try {
      setProcessing(true)
      await adminApi.rejectCourse(courseId, { reasonCode: rejectReasonCode, note })
      setRejectModalOpen(false)
      toast.info('Đã từ chối duyệt và gửi phản hồi cho giảng viên')
      navigate('/admin/courses')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối khóa học')
    } finally {
      setProcessing(false)
    }
  }

  // Xử lý Tạm gỡ (Suspend)
  const handleExecuteSuspend = async (reason) => {
    try {
      setProcessing(true)
      await adminApi.suspendCourse(courseId, { reason })
      setSuspendModalOpen(false)
      toast.success('Đã tạm gỡ khóa học')
      await loadWorkspace()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi gỡ khóa học')
    } finally {
      setProcessing(false)
    }
  }

  // Xử lý Khôi phục
  const handleExecuteRestore = async () => {
    const ok = await confirm({
      title: 'Khôi phục khóa học',
      message: `Khôi phục và hiển thị lại khóa học "${data.course.title}" trên nền tảng cho học viên?`,
      confirmText: 'Khôi phục',
      variant: 'primary',
    })
    if (!ok) return

    try {
      setProcessing(true)
      await adminApi.restoreCourse(courseId)
      toast.success('Đã khôi phục khóa học thành công')
      await loadWorkspace()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi khôi phục khóa học')
    } finally {
      setProcessing(false)
    }
  }

  // Chạy lại kiểm tra tự động / AI
  const handleReAudit = async () => {
    try {
      setReAuditing(true)
      await adminApi.reAuditCourseWithAi(courseId)
      toast.success('Đã phân tích lại toàn bộ nội dung khóa học')
      await loadWorkspace()
    } catch (err) {
      toast.error('Lỗi khi chạy lại kiểm tra')
    } finally {
      setReAuditing(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--c-muted, #64748b)' }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: 8 }} />
        <div>Đang nạp không gian kiểm duyệt khóa học...</div>
      </div>
    )
  }

  if (!data?.course) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--c-muted, #64748b)' }}>
        Không tìm thấy thông tin khóa học.
      </div>
    )
  }

  const course = data.course
  const waitingTime = formatWaitingTime(course.submittedAt)
  const urgencyClass = getWaitUrgencyClass(course.submittedAt)
  const isModifiedAfterPublish =
    course.contentChangedAt && course.reviewedAt && vnTime(course.contentChangedAt) > vnTime(course.reviewedAt)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 1. Header trên cùng */}
      <CourseReviewHeader
        course={course}
        riskLevel={moderationData?.riskLevel || 'LOW'}
        onBack={() => navigate('/admin/courses')}
        nextPendingCourseId={nextPendingCourseId}
        onNextPending={() => navigate(`/admin/moderation/${nextPendingCourseId}`)}
        waitingTime={waitingTime}
        urgencyClass={urgencyClass}
      />

      {/* 2. Workspace 3 cột */}
      <div className="admin-workspace-container">
        {/* Cột 1 (Trái): Mục lục */}
        <OutlinePanel
          previewData={previewData}
          selectedItem={selectedItem}
          onSelectItem={handleSelectItem}
          issueMap={issueMap}
        />

        {/* Cột 2 (Giữa): Preview nội dung */}
        <ContentViewer
          course={course}
          selectedItem={selectedItem}
          itemDetail={itemDetail}
          itemLoading={itemLoading}
        />

        {/* Cột 3 (Phải): Báo cáo AI & Quyết định */}
        <aside className="admin-workspace-col-right" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AiReportPanel
            aiReport={aiReport}
            moderationData={moderationData}
            readinessData={readinessData}
            onDecision={handleIssueDecision}
            decidingIssueId={decidingIssueId}
            isModifiedAfterPublish={isModifiedAfterPublish}
            course={course}
            onJumpToIssue={handleJumpToIssue}
            onReAudit={handleReAudit}
            reAuditing={reAuditing}
          />

          <DecisionPanel
            course={course}
            aiReport={aiReport}
            moderationData={moderationData}
            checklist={checklist}
            setChecklist={setChecklist}
            adminNote={adminNote}
            setAdminNote={setAdminNote}
            onApprove={handleExecuteApprove}
            onReject={() => {
              setRejectNote(adminNote || '')
              setRejectModalOpen(true)
            }}
            onSuspend={() => setSuspendModalOpen(true)}
            onRestore={handleExecuteRestore}
            processing={processing}
            nextPendingCourseId={nextPendingCourseId}
          />
        </aside>
      </div>

      {/* Modal Từ chối kèm chọn mã lý do và danh sách lỗi NEED_FIX */}
      {rejectModalOpen && (
        <Modal
          open={rejectModalOpen}
          title="Từ chối phê duyệt khóa học"
          onClose={processing ? undefined : () => setRejectModalOpen(false)}
          width={540}
        >
          <form onSubmit={handleExecuteReject}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <AlertCircle size={24} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: '0 0 6px 0', fontSize: 13.5, color: '#1e293b', lineHeight: 1.4 }}>
                  Chọn mã lý do chính và nhập phản hồi chi tiết để gửi thông báo hướng dẫn giảng viên{' '}
                  <strong>"{course.teacherName}"</strong> chỉnh sửa:
                </p>
              </div>
            </div>

            {/* Chips mã lý do từ SPEC */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Mã lý do từ chối (bắt buộc):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {REJECT_REASONS.map((r) => {
                  const isSelected = rejectReasonCode === r.code
                  return (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => setRejectReasonCode(r.code)}
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: isSelected ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                        background: isSelected ? '#fee2e2' : '#ffffff',
                        color: isSelected ? '#b91c1c' : '#334155',
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Danh sách lỗi đã đánh dấu NEED_FIX tự động đính kèm */}
            {needFixIssues.length > 0 && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '10px 12px',
                  background: '#fff7ed',
                  border: '1px solid #fdba74',
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#c2410c', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Wrench size={13} />
                  <span>Kèm theo {needFixIssues.length} vấn đề bạn đã đánh dấu "Yêu cầu sửa":</span>
                </div>
                <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {needFixIssues.map((issue) => (
                    <div key={issue.id} style={{ fontSize: 11.5, color: '#9a3412', display: 'flex', gap: 6 }}>
                      <strong style={{ whiteSpace: 'nowrap' }}>[{issue.ruleId}]</strong>
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ô nhập ghi chú hướng dẫn */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Ghi chú hướng dẫn chỉnh sửa:
              </label>
              <textarea
                rows={3}
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                  outline: 'none',
                  color: '#0f172a',
                }}
                placeholder="Nhập ghi chú hướng dẫn chi tiết gửi đến giảng viên..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => setRejectModalOpen(false)}
                disabled={processing}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn danger sm"
                disabled={processing || !rejectNote.trim()}
              >
                {processing ? 'Đang gửi...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Tạm gỡ (Suspend) */}
      <AdminActionModal
        open={suspendModalOpen}
        type="prompt"
        title="Tạm gỡ khóa học khỏi nền tảng"
        message={`Nhập lý do tạm gỡ khóa học "${course.title}":`}
        defaultValue="Khóa học vi phạm quy định nền tảng"
        confirmText="Tạm gỡ khóa học"
        variant="danger"
        loading={processing}
        onConfirm={handleExecuteSuspend}
        onClose={() => setSuspendModalOpen(false)}
      />
    </div>
  )
}
