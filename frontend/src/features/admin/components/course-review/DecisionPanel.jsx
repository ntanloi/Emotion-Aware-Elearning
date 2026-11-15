import React from 'react'
import {
  CheckCircle2,
  XCircle,
  ShieldAlert,
  RotateCcw,
  AlertTriangle,
  Wrench,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react'

const REJECT_PRESETS = [
  'Nội dung chưa đạt chuẩn sư phạm',
  'Thiếu file âm thanh/video',
  'Sai định dạng chuẩn đề thi TOEIC',
  'Nghi vấn vi phạm bản quyền',
  'Giải thích câu hỏi chưa rõ ràng',
]

export default function DecisionPanel({
  course,
  moderationData,
  aiReport,
  checklist,
  setChecklist,
  adminNote,
  setAdminNote,
  onApprove,
  onReject,
  onSuspend,
  onRestore,
  processing,
  nextPendingCourseId,
}) {
  const isHighRisk = moderationData?.riskLevel === 'HIGH' || aiReport?.riskLevel === 'HIGH'
  const isPending = course.status === 'PENDING_REVIEW'

  const allChecked =
    checklist.contentAppropriate &&
    checklist.answersAccurate &&
    checklist.mediaPlayable &&
    checklist.copyrightClean

  const undecidedErrors = moderationData?.undecidedErrorCount ?? 0
  const needFixCount = moderationData?.needFixCount ?? 0

  // Kiểm tra điều kiện có thể phê duyệt
  const canApprove =
    allChecked &&
    undecidedErrors === 0 &&
    needFixCount === 0 &&
    (!isHighRisk || (adminNote && adminNote.trim().length >= 10))

  const handleSelectPreset = (text) => {
    if (!adminNote) {
      setAdminNote(text)
    } else if (!adminNote.includes(text)) {
      setAdminNote(`${adminNote}; ${text}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Checklist thẩm định */}
      {isPending && (
        <div className="action-card" style={{ marginBottom: 0 }}>
          <div
            className="action-card-header"
            style={{
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
              <ClipboardCheck size={16} style={{ color: '#0284c7' }} />
              <span>Checklist thẩm định bắt buộc</span>
            </span>
            {allChecked && (
              <span
                style={{
                  fontSize: 11,
                  color: '#15803d',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <CheckCircle2 size={12} /> Đủ 4 mục
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label className="checklist-item">
              <input
                type="checkbox"
                checked={checklist.contentAppropriate}
                onChange={(e) => setChecklist({ ...checklist, contentAppropriate: e.target.checked })}
              />
              <span>Đã xem nội dung bài giảng chính của khóa học</span>
            </label>

            <label className="checklist-item">
              <input
                type="checkbox"
                checked={checklist.answersAccurate}
                onChange={(e) => setChecklist({ ...checklist, answersAccurate: e.target.checked })}
              />
              <span>Đã đối chiếu các lỗi AI/luật đánh dấu</span>
            </label>

            <label className="checklist-item">
              <input
                type="checkbox"
                checked={checklist.mediaPlayable}
                onChange={(e) => setChecklist({ ...checklist, mediaPlayable: e.target.checked })}
              />
              <span>Video/Audio nghe rõ, tài nguyên hợp lệ</span>
            </label>

            <label className="checklist-item">
              <input
                type="checkbox"
                checked={checklist.copyrightClean}
                onChange={(e) => setChecklist({ ...checklist, copyrightClean: e.target.checked })}
              />
              <span>Thông tin khóa học trung thực, không vi phạm bản quyền</span>
            </label>
          </div>

          {/* Ghi chú & Preset chips */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
            <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
              Gợi ý lý do nhận xét nhanh:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {REJECT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    fontSize: 10.5,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  + {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              style={{
                width: '100%',
                fontSize: 12.5,
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                lineHeight: 1.4,
              }}
              placeholder={
                isHighRisk
                  ? 'Bắt buộc nhập ghi chú giải trình (tối thiểu 10 ký tự) cho khóa rủi ro cao...'
                  : 'Ghi chú thẩm định gửi giảng viên...'
              }
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Tình trạng các ràng buộc duyệt */}
      {isPending && (
        <div style={{ fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {undecidedErrors > 0 && (
            <div
              style={{
                color: '#b91c1c',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                padding: '8px 10px',
                borderRadius: 6,
                display: 'flex',
                gap: 7,
                alignItems: 'center',
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>Chặn duyệt: Còn <strong>{undecidedErrors} lỗi ERROR</strong> bắt buộc phải đưa ra quyết định.</span>
            </div>
          )}

          {needFixCount > 0 && (
            <div
              style={{
                color: '#c2410c',
                background: '#ffedd5',
                border: '1px solid #fed7aa',
                padding: '8px 10px',
                borderRadius: 6,
                display: 'flex',
                gap: 7,
                alignItems: 'center',
                lineHeight: 1.4,
              }}
            >
              <Wrench size={15} style={{ flexShrink: 0 }} />
              <span>Chặn duyệt: Còn <strong>{needFixCount} vấn đề</strong> đang yêu cầu sửa (NEED_FIX).</span>
            </div>
          )}

          {!allChecked && (
            <div style={{ color: '#64748b', padding: '2px 4px', fontSize: 12 }}>
              • Cần tích chọn đủ 4 mục trong checklist thẩm định để phê duyệt.
            </div>
          )}

          {isHighRisk && (!adminNote || adminNote.trim().length < 10) && (
            <div style={{ color: '#b91c1c', padding: '2px 4px', fontSize: 12 }}>
              • Khóa có rủi ro CAO: Yêu cầu ghi chú thẩm định từ 10 ký tự trở lên.
            </div>
          )}
        </div>
      )}

      {/* Nhóm nút hành động */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isPending && (
          <>
            <button
              type="button"
              style={{
                width: '100%',
                padding: '11px 16px',
                fontWeight: 700,
                fontSize: 13.5,
                color: '#ffffff',
                background: canApprove ? '#16a34a' : '#94a3b8',
                border: 'none',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                cursor: canApprove ? 'pointer' : 'not-allowed',
                boxShadow: canApprove ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onClick={onApprove}
              disabled={processing || !canApprove}
            >
              <CheckCircle2 size={17} />
              <span>
                {nextPendingCourseId ? 'Duyệt & sang khóa kế tiếp' : 'Phê duyệt & Xuất bản'}
              </span>
            </button>

            <button
              type="button"
              style={{
                width: '100%',
                padding: '9px 14px',
                fontWeight: 600,
                fontSize: 13,
                color: '#dc2626',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={onReject}
              disabled={processing}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fef2f2')}
            >
              <XCircle size={15} />
              <span>Từ chối duyệt {needFixCount > 0 ? `(Gửi kèm ${needFixCount} lỗi cần sửa)` : ''}</span>
            </button>
          </>
        )}

        {course.status === 'PUBLISHED' && (
          <div
            style={{
              padding: '14px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              <ShieldAlert size={16} style={{ color: '#d97706' }} />
              <span>Thao tác quản trị khóa học</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
              Khóa học đang hoạt động trên hệ thống. Quản trị viên có thể tạm gỡ nếu phát hiện vi phạm bản quyền hoặc nội dung không đạt chuẩn.
            </div>
            <button
              type="button"
              style={{
                width: '100%',
                padding: '9px 14px',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#b45309',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                cursor: processing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
              onClick={onSuspend}
              disabled={processing}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fef3c7')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fffbeb')}
            >
              <ShieldAlert size={14} />
              <span>Tạm gỡ khóa học (Suspend)</span>
            </button>
          </div>
        )}

        {course.status === 'SUSPENDED' && (
          <div
            style={{
              padding: '14px 16px',
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#9a3412' }}>
              <RotateCcw size={16} />
              <span>Khóa học đang bị tạm gỡ</span>
            </div>
            <div style={{ fontSize: 12, color: '#7c2d12', lineHeight: 1.4 }}>
              Sau khi giảng viên khắc phục các vi phạm, Quản trị viên có thể khôi phục lại trạng thái xuất bản cho học viên tiếp tục học.
            </div>
            <button
              type="button"
              style={{
                width: '100%',
                padding: '9px 14px',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#ffffff',
                background: '#ea580c',
                border: 'none',
                borderRadius: 8,
                cursor: processing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
              onClick={onRestore}
              disabled={processing}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#c2410c')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ea580c')}
            >
              <RotateCcw size={14} />
              <span>Khôi phục xuất bản (Restore)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
