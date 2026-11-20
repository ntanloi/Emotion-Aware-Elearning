import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Database,
  Trash2,
  Edit2,
  FileCheck,
  Clock,
  Send,
  Eye,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Volume2,
  Image as ImageIcon,
  BookOpen,
} from 'lucide-react'
import {
  getTestBuilderDetail,
  removeQuestionFromTest,
  submitTestForReview,
  toggleTestStatus,
} from '@teacher/api/teacherTests.js'
import QuestionModal from '@teacher/components/modals/QuestionModal.jsx'
import PassageModal from '@teacher/components/modals/PassageModal.jsx'
import SelectFromBankModal from '@teacher/components/modals/SelectFromBankModal.jsx'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import EmptyState from '@shared/components/ui/EmptyState.jsx'
import { parseRejectReason } from '@teacher/utils/rejectReasonParser.js'
import { useToast, useConfirm } from '@shared/context/AppUIContext.jsx'

const PART_NAMES = {
  1: 'Part 1: Mô tả hình ảnh (Photographs)',
  2: 'Part 2: Hỏi & Đáp (Question - Response)',
  3: 'Part 3: Đoạn hội thoại (Short Conversations)',
  4: 'Part 4: Bài nói ngắn (Short Talks)',
  5: 'Part 5: Hoàn thành câu (Incomplete Sentences)',
  6: 'Part 6: Điền đoạn văn (Text Completion)',
  7: 'Part 7: Đọc hiểu văn bản (Reading Comprehension)',
}

export default function TeacherTestBuilderPage() {
  const { id: testId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const [builderData, setBuilderData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePartNo, setActivePartNo] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [notification, setNotification] = useState('')

  // Modals state
  const [openBankModal, setOpenBankModal] = useState(false)
  const [openQuestionModal, setOpenQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [openPassageModal, setOpenPassageModal] = useState(false)
  const [editingPassage, setEditingPassage] = useState(null)

  useEffect(() => {
    if (testId) {
      loadData()
    }
  }, [testId])

  const loadData = async (preferredPartNo) => {
    try {
      const data = await getTestBuilderDetail(testId)
      setBuilderData(data)
      if (data.parts && data.parts.length > 0) {
        if (preferredPartNo && data.parts.some((p) => p.partNo === preferredPartNo)) {
          setActivePartNo(preferredPartNo)
        } else if (!activePartNo || !data.parts.some((p) => p.partNo === activePartNo)) {
          setActivePartNo(data.parts[0].partNo)
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu soạn đề:', err)
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Không thể tải dữ liệu đề thi')
    } finally {
      setLoading(false)
    }
  }

  const test = builderData?.test
  const parts = builderData?.parts || []
  const activePart = parts.find((p) => p.partNo === activePartNo) || parts[0]
  const totalQuestions = parts.reduce((sum, p) => sum + (p.questionCount || 0), 0)

  const isEditable = test && (test.status === 'DRAFT' || test.status === 'REJECTED')

  const handleDeleteQuestion = async (questionId) => {
    const ok = await confirm({
      title: 'Xóa câu hỏi khỏi đề thi',
      message: 'Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi?',
      confirmLabel: 'Xóa câu hỏi',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await removeQuestionFromTest(testId, questionId)
      await loadData(activePartNo)
      setNotification('Đã xóa câu hỏi khỏi đề thi')
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Không thể xóa câu hỏi')
    }
  }

  const handleSubmitForReview = async () => {
    if (totalQuestions === 0) {
      toast.warning('Đề thi cần có ít nhất 1 câu hỏi để có thể gửi duyệt')
      return
    }
    const ok = await confirm({
      title: 'Gửi duyệt đề thi',
      message: 'Bạn có chắc muốn gửi đề thi này lên ban quản trị kiểm duyệt?',
      confirmLabel: 'Gửi duyệt',
      variant: 'primary',
    })
    if (!ok) return
    setActionLoading(true)
    try {
      await submitTestForReview(testId)
      await loadData(activePartNo)
      setNotification('Đã gửi đề thi lên ban quản trị xét duyệt')
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Không thể gửi duyệt đề thi')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleStatus = async () => {
    setActionLoading(true)
    try {
      await toggleTestStatus(testId)
      await loadData(activePartNo)
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Không thể thay đổi trạng thái đề thi')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return { label: 'Đã xuất bản', color: 'var(--good)', bg: 'var(--good-soft)' }
      case 'PENDING_REVIEW':
        return { label: 'Chờ duyệt', color: 'var(--warn)', bg: 'var(--warn-soft)' }
      case 'REJECTED':
        return { label: 'Bị từ chối', color: 'var(--bad)', bg: 'var(--bad-soft)' }
      case 'HIDDEN':
        return { label: 'Đã ẩn', color: 'var(--text-dim)', bg: 'var(--surface-2)' }
      case 'DRAFT':
      default:
        return { label: 'Bản nháp', color: 'var(--accent)', bg: 'var(--accent-soft)' }
    }
  }

  const parsedRejection = test?.rejectionReason ? parseRejectReason(test.rejectionReason) : null

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 48px' }}>
        <Skeleton width={180} height={20} style={{ marginBottom: 16 }} />
        <Skeleton width="60%" height={32} style={{ marginBottom: 24 }} />
        <Skeleton height={200} />
      </div>
    )
  }

  if (!test) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        <EmptyState
          title="Không tìm thấy đề thi"
          description="Đề thi không tồn tại hoặc bạn không có quyền truy cập."
          action={
            <Link to="/teacher/tests" className="btn primary sm" style={{ textDecoration: 'none' }}>
              Quay lại danh sách đề thi
            </Link>
          }
        />
      </div>
    )
  }

  const statusBadge = getStatusBadge(test.status)
  const isPassagePart = [3, 4, 6, 7].includes(activePart?.partNo)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 48px' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/teacher/tests"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13.5,
            color: 'var(--text-dim)',
            textDecoration: 'none',
            marginBottom: 10,
          }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách đề thi</span>
        </Link>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                {test.title}
              </h1>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  color: statusBadge.color,
                  background: statusBadge.bg,
                }}
              >
                {statusBadge.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-3)',
                  color: 'var(--text-dim)',
                }}
              >
                Phiên bản {test.version || 1}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--text-dim)' }}>
              <span>Tổng số câu hỏi: <strong style={{ color: 'var(--text)' }}>{totalQuestions}</strong> câu</span>
              <span>Thời gian nghe: <strong>{test.listeningMinutes}</strong> phút</span>
              <span>Thời gian đọc: <strong>{test.readingMinutes}</strong> phút</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link
              to={`/tests/${test.id}`}
              target="_blank"
              className="btn secondary sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <Eye size={15} />
              <span>Xem trước đề</span>
            </Link>

            {isEditable && (
              <button
                type="button"
                className="btn primary sm"
                onClick={handleSubmitForReview}
                disabled={actionLoading || totalQuestions === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Send size={15} />
                <span>Gửi duyệt lên thư viện</span>
              </button>
            )}

            {test.status === 'PENDING_REVIEW' && (
              <button
                type="button"
                className="btn secondary sm"
                onClick={handleToggleStatus}
                disabled={actionLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RotateCcw size={15} />
                <span>Rút yêu cầu duyệt</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Thông báo thao tác */}
      {notification && (
        <div
          style={{
            background: 'var(--good-soft)',
            color: 'var(--good)',
            border: '1px solid var(--good-border)',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13.5,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Banner bị từ chối */}
      {parsedRejection && (
        <div
          style={{
            background: 'var(--bad-soft)',
            border: '1px solid var(--bad-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--bad)', fontWeight: 600, fontSize: 14 }}>
            <AlertCircle size={17} />
            <span>Đề thi bị từ chối phê duyệt</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text)' }}>
            {parsedRejection.summary || test.rejectionReason}
          </div>
          {parsedRejection.bulletPoints && parsedRejection.bulletPoints.length > 0 && (
            <ul style={{ margin: '8px 0 0 20px', padding: 0, fontSize: 12.5, color: 'var(--text-dim)' }}>
              {parsedRejection.bulletPoints.map((bp, i) => (
                <li key={i}>{bp}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Main Workspace: Tabs các Part */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border)',
          marginBottom: 20,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {parts.map((p) => {
          const isActive = p.partNo === activePart?.partNo
          return (
            <button
              key={p.partNo}
              type="button"
              onClick={() => setActivePartNo(p.partNo)}
              style={{
                background: isActive ? 'var(--surface)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '10px 16px',
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--accent)' : 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Part {p.partNo}</span>
              <span
                style={{
                  fontSize: 11.5,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: isActive ? 'var(--accent-soft)' : 'var(--surface-3)',
                  color: isActive ? 'var(--accent)' : 'var(--text-dim)',
                  fontWeight: 600,
                }}
              >
                {p.questionCount || 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Nội dung Part đang chọn */}
      {activePart && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header của Part */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
            }}
          >
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>
                {PART_NAMES[activePart.partNo] || `Part ${activePart.partNo}`}
              </h2>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Đang có <strong>{activePart.questionCount || 0}</strong> câu hỏi trong phần này
              </div>
            </div>

            {isEditable && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {isPassagePart && (
                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={() => {
                      setEditingPassage(null)
                      setOpenPassageModal(true)
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
                  >
                    <Plus size={14} />
                    <span>Thêm đoạn văn</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => setOpenBankModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
                >
                  <Database size={14} />
                  <span>Chọn từ ngân hàng câu hỏi</span>
                </button>

                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => {
                    setEditingQuestion(null)
                    setOpenQuestionModal(true)
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
                >
                  <Plus size={14} />
                  <span>Tự tạo câu hỏi mới</span>
                </button>
              </div>
            )}
          </div>

          {/* Danh sách câu hỏi trong Part */}
          {(!activePart.questions || activePart.questions.length === 0) ? (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '48px 20px',
                textAlign: 'center',
              }}
            >
              <EmptyState
                title={`Chưa có câu hỏi nào trong Part ${activePart.partNo}`}
                description="Bạn có thể tự tạo câu hỏi mới trực tiếp, hoặc nhập câu hỏi đã lưu sẵn từ Ngân hàng câu hỏi cá nhân."
                action={
                  isEditable ? (
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => {
                          setEditingQuestion(null)
                          setOpenQuestionModal(true)
                        }}
                      >
                        Tự tạo câu hỏi mới
                      </button>
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={() => setOpenBankModal(true)}
                      >
                        Chọn từ ngân hàng câu hỏi
                      </button>
                    </div>
                  ) : null
                }
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activePart.questions.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {/* Question header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--accent)',
                          background: 'var(--accent-soft)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        Câu {idx + 1}
                      </span>
                      {q.tag && (
                        <span
                          style={{
                            fontSize: 11.5,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface-3)',
                            color: 'var(--text-dim)',
                          }}
                        >
                          {q.tag}
                        </span>
                      )}
                      {q.audioUrl && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}>
                          <Volume2 size={13} /> Có audio
                        </span>
                      )}
                      {q.imageUrl && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}>
                          <ImageIcon size={13} /> Có ảnh
                        </span>
                      )}
                    </div>

                    {isEditable && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn xs secondary"
                          title="Sửa câu hỏi"
                          onClick={() => {
                            setEditingQuestion(q)
                            setOpenQuestionModal(true)
                          }}
                          style={{ padding: '4px 8px' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn xs secondary"
                          title="Xóa khỏi đề"
                          onClick={() => handleDeleteQuestion(q.id)}
                          style={{ padding: '4px 8px', color: 'var(--bad)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Question Prompt */}
                  <div style={{ fontSize: 14.5, color: 'var(--text)', fontWeight: 500, lineHeight: 1.5 }}>
                    {q.promptText || '(Không có tiêu đề)'}
                  </div>

                  {/* Options with correct answer highlighted */}
                  {q.options && q.options.length > 0 && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      {q.options.map((opt) => (
                        <div
                          key={opt.id || opt.label}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: opt.isCorrect ? 'var(--good-soft)' : 'var(--surface-2)',
                            border: opt.isCorrect ? '1px solid var(--good-border)' : '1px solid var(--border)',
                            color: opt.isCorrect ? 'var(--good)' : 'var(--text)',
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontWeight: opt.isCorrect ? 600 : 400,
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>{opt.label}.</span>
                          <span style={{ flex: 1 }}>{opt.content}</span>
                          {opt.isCorrect && <CheckCircle2 size={14} style={{ color: 'var(--good)' }} />}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: 'var(--text-dim)',
                        background: 'var(--surface-2)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        marginTop: 4,
                      }}
                    >
                      <strong>Giải thích:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal chọn từ ngân hàng */}
      {openBankModal && activePart && (
        <SelectFromBankModal
          open={openBankModal}
          onClose={() => setOpenBankModal(false)}
          testId={testId}
          partNo={activePart.partNo}
          onSuccess={() => {
            loadData(activePart.partNo)
            setNotification(`Đã thêm câu hỏi từ ngân hàng vào Part ${activePart.partNo}`)
          }}
        />
      )}

      {/* Modal tự tạo / sửa câu hỏi */}
      {openQuestionModal && activePart && (
        <QuestionModal
          open={openQuestionModal}
          contentItemId={activePart.contentItemId}
          passages={activePart.passages || []}
          question={editingQuestion}
          onClose={() => {
            setOpenQuestionModal(false)
            setEditingQuestion(null)
            loadData(activePart.partNo)
          }}
        />
      )}

      {/* Modal thêm / sửa đoạn văn */}
      {openPassageModal && activePart && (
        <PassageModal
          open={openPassageModal}
          contentItemId={activePart.contentItemId}
          passage={editingPassage}
          onClose={() => {
            setOpenPassageModal(false)
            setEditingPassage(null)
            loadData(activePart.partNo)
          }}
        />
      )}
    </div>
  )
}
