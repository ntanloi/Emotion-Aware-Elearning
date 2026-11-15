import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { parseRejectReason, resolveIssueJumpTarget } from '@teacher/utils/rejectReasonParser.js'
import { listContentItems } from '@shared/api/contentItems.js'
import {
  X,
  AlertTriangle,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Pencil,
  Settings,
  Folder,
  ChevronRight,
  Info
} from 'lucide-react'

/**
 * CourseRejectDetailModal — hiển thị chi tiết lý do từ chối và danh sách lỗi cần khắc phục.
 * Cho phép giảng viên nhấn trực tiếp vào từng thẻ để điều hướng thẳng đến vị trí cần sửa.
 */
export default function CourseRejectDetailModal({ isOpen, course, onClose, onGoEdit }) {
  const navigate = useNavigate()
  const [contentItems, setContentItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  // Tải danh sách hoạt động trong khóa học để liên kết chính xác tên bài học với ID
  useEffect(() => {
    if (!isOpen || !course?.id) return
    let active = true
    setLoadingItems(true)
    listContentItems(course.id)
      .then((items) => {
        if (active && Array.isArray(items)) {
          setContentItems(items)
        }
      })
      .catch((err) => {
        console.warn('Không thể nạp danh sách bài học của khóa học:', err)
      })
      .finally(() => {
        if (active) setLoadingItems(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, course?.id])

  if (!isOpen || !course) return null

  const parsed = parseRejectReason(course.rejectReason)

  const handleEditClick = () => {
    onClose?.()
    if (onGoEdit) {
      onGoEdit(course)
    } else {
      navigate(`/teacher/courses/${course.id}/content`)
    }
  }

  const handleJumpToIssue = (target) => {
    onClose?.()
    if (target?.jumpTo) {
      navigate(target.jumpTo)
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100050,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          background: 'var(--surface-1, #ffffff)',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border, #e2e8f0)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff5f5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
                Yêu cầu chỉnh sửa khóa học
              </h3>
              <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                {course.title || 'Khoá học'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Modal */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          {/* Phân loại lý do chính */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-dim, #64748b)' }}>
              Phân loại vấn đề:
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#991b1b',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                padding: '3px 10px',
                borderRadius: 20,
              }}
            >
              {parsed.reasonLabel || parsed.reasonCode || 'Cần hoàn thiện nội dung'}
            </span>
          </div>

          {/* Lời nhắn trực tiếp từ Quản trị viên */}
          {parsed.adminNote && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <MessageSquare size={13} color="#0284c7" />
                <span>Ghi chú từ Quản trị viên</span>
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: '#1e293b',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line',
                  fontWeight: 500,
                }}
              >
                {parsed.adminNote}
              </div>
            </div>
          )}

          {/* Danh sách các vấn đề cụ thể cần sửa */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  Danh sách các mục cần khắc phục ({parsed.issues.length}):
                </span>
                <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                  (Nhấn vào thẻ để tới vị trí cần sửa)
                </span>
              </div>
            </div>

            {parsed.issues.length === 0 ? (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: 13,
                  color: '#475569',
                  lineHeight: 1.5,
                }}
              >
                {parsed.raw || 'Vui lòng kiểm tra lại cấu trúc và nội dung các bài học trong khóa học theo hướng dẫn của Quản trị viên.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {parsed.issues.map((iss, idx) => {
                  const target = resolveIssueJumpTarget(iss, course.id, contentItems)

                  return (
                    <div
                      key={idx}
                      onClick={() => handleJumpToIssue(target)}
                      style={{
                        padding: '13px 15px',
                        borderRadius: 10,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#0284c7'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.12)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.background = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0'
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.background = '#ffffff'
                      }}
                      title={`Nhấn để chuyển đến: ${target.jumpLabel}`}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          marginBottom: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#dc2626',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {iss.ruleId}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                            {iss.ruleName}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#0284c7',
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            padding: '3px 9px',
                            borderRadius: 6,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {target.targetType === 'ITEM' ? (
                            <Pencil size={11} />
                          ) : target.targetType === 'COURSE_SETTINGS' ? (
                            <Settings size={11} />
                          ) : target.targetType === 'SECTION' ? (
                            <Folder size={11} />
                          ) : (
                            <ExternalLink size={11} />
                          )}
                          <span>{target.jumpLabel}</span>
                          <ChevronRight size={12} />
                        </div>
                      </div>

                      <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: iss.adminRequirement ? 8 : 0 }}>
                        {iss.message}
                      </div>

                      {iss.adminRequirement && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: 6,
                            fontSize: 12,
                            color: '#92400e',
                            fontWeight: 500,
                          }}
                        >
                          <Info size={13} style={{ flexShrink: 0 }} />
                          <span><strong>Yêu cầu sửa đổi:</strong> {iss.adminRequirement}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 500,
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleEditClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 600,
              background: 'var(--accent, #0284c7)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Vào chỉnh sửa khóa học</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
