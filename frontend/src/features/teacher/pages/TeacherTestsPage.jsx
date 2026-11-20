import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileCheck,
  Clock,
  Eye,
  Send,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  EyeOff,
  BookOpen,
  BarChart2,
  Users,
  Award,
  Plus,
  Database,
  Edit2,
  Trash2,
} from 'lucide-react'
import {
  listTeacherTests,
  submitTestForReview,
  toggleTestStatus,
  getTeacherTestStats,
  deleteDraftTest,
} from '@teacher/api/teacherTests.js'
import CreateTestModal from '@teacher/components/modals/CreateTestModal.jsx'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import { useRealtimeEvent } from '@shared/realtime/index.js'
import EmptyState from '@shared/components/ui/EmptyState.jsx'
import { useToast, useConfirm } from '@shared/context/AppUIContext.jsx'

export default function TeacherTestsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [tests, setTests] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [message, setMessage] = useState('')
  const [openCreateModal, setOpenCreateModal] = useState(false)

  useEffect(() => {
    loadTests()
  }, [])

  // Realtime: admin duyệt / từ chối / ẩn đề thi -> danh sách của giảng viên tự cập nhật
  useRealtimeEvent('notification', (payload) => {
    if (payload?.notification?.type === 'TEST_MODERATION') loadTests()
  })

  const loadTests = async () => {
    setLoading(true)
    try {
      const [testData, statsData] = await Promise.allSettled([
        listTeacherTests({ size: 50 }),
        getTeacherTestStats(),
      ])

      if (testData.status === 'fulfilled') {
        setTests(testData.value?.content || testData.value || [])
      }
      if (statsData.status === 'fulfilled') {
        setStats(statsData.value)
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đề thi:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async (testId, totalQ) => {
    if (totalQ === 0) {
      toast.warning('Đề thi chưa có câu hỏi nào. Vui lòng soạn nội dung trước khi gửi duyệt.')
      return
    }
    setActionLoadingId(testId)
    setMessage('')
    try {
      const updated = await submitTestForReview(testId)
      setTests((prev) => prev.map((t) => (t.id === testId ? updated : t)))
      setMessage('Đã gửi đề thi lên ban quản trị xét duyệt!')
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Không thể gửi duyệt đề thi')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleToggleStatus = async (testId) => {
    setActionLoadingId(testId)
    setMessage('')
    try {
      const updated = await toggleTestStatus(testId)
      setTests((prev) => prev.map((t) => (t.id === testId ? updated : t)))
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Không thể thay đổi trạng thái đề thi')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteTest = async (testId) => {
    const ok = await confirm({
      title: 'Xóa đề thi',
      message: 'Bạn có chắc chắn muốn xóa đề thi này? Hành động này không thể hoàn tác.',
      confirmLabel: 'Xóa đề thi',
      variant: 'danger',
    })
    if (!ok) return
    setActionLoadingId(testId)
    setMessage('')
    try {
      await deleteDraftTest(testId)
      setTests((prev) => prev.filter((t) => t.id !== testId))
      setMessage('Đã xóa đề thi thành công')
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Không thể xóa đề thi')
    } finally {
      setActionLoadingId(null)
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

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 48px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>
            Quản lý đề thi TOEIC
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Tạo đề thi tùy chỉnh từ ngân hàng câu hỏi hoặc tự soạn mới, gửi ban quản trị duyệt để xuất bản lên Thư viện đề thi chung.
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to="/teacher/courses?tab=questions"
            className="btn secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <Database size={15} />
            <span>Ngân hàng câu hỏi</span>
          </Link>

          <button
            type="button"
            className="btn primary"
            onClick={() => setOpenCreateModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} />
            <span>Tạo đề thi mới</span>
          </button>
        </div>
      </div>

      {/* Thẻ thống kê tổng quan của Giảng viên */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 500 }}>Tổng đề đóng góp</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{stats.totalTests}</div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'var(--good-soft)',
                color: 'var(--good)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 500 }}>Đã xuất bản</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--good)' }}>{stats.publishedTests}</div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 500 }}>Lượt học viên làm bài</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{stats.totalAttempts}</div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={22} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 500 }}>Điểm trung bình</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                {stats.overallAverageScore ? `${stats.overallAverageScore} / 990` : 'Chưa có'}
              </div>
            </div>
          </div>
        </div>
      )}

      {message && (
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
            fontSize: 14,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Danh sách đề thi */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 20,
              }}
            >
              <Skeleton width="40%" height={24} style={{ marginBottom: 10 }} />
              <Skeleton width="70%" height={16} />
            </div>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <EmptyState
          title="Bạn chưa có đề thi nào"
          description="Hãy bắt đầu bằng cách bấm nút Tạo đề thi mới hoặc quản lý Ngân hàng câu hỏi cá nhân."
          action={
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => setOpenCreateModal(true)}
              >
                Tạo đề thi mới ngay
              </button>
              <Link
                to="/teacher/courses?tab=questions"
                className="btn secondary sm"
                style={{ textDecoration: 'none' }}
              >
                Vào Ngân hàng câu hỏi
              </Link>
            </div>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tests.map((test) => {
            const badge = getStatusBadge(test.status)
            const isLoadingAction = actionLoadingId === test.id
            const summaryItem = (stats?.testSummaries || []).find((s) => s.testId === test.id)

            return (
              <div
                key={test.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 20,
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--text-dim)', fontWeight: 500 }}>
                        Phiên bản {test.version || 1}
                      </span>
                      {test.attemptCount > 0 && (
                        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                          • {test.attemptCount} lượt học viên làm bài
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => navigate(`/teacher/tests/${test.id}/builder`)}
                      style={{
                        margin: '0 0 6px',
                        fontSize: 17,
                        color: 'var(--text)',
                        cursor: 'pointer',
                        display: 'inline-block',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
                    >
                      {test.title}
                    </h3>

                    {test.description && (
                      <p style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                        {test.description}
                      </p>
                    )}

                    {/* Chi tiết Parts & Thời lượng */}
                    <div style={{ display: 'flex', gap: 10, fontSize: 12.5, color: 'var(--text-dim)', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>Tổng câu: <strong style={{ color: 'var(--text)' }}>{test.totalQuestions || 0} câu</strong></span>
                      <span>•</span>
                      <span>Thời lượng: <strong>{test.listeningMinutes || 45}p nghe / {test.readingMinutes || 75}p đọc</strong></span>
                      <span>•</span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(test.parts || []).map((p) => (
                          <span
                            key={p.partNo}
                            style={{
                              background: 'var(--surface-2)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '1px 6px',
                              fontSize: 11.5,
                            }}
                          >
                            Part {p.partNo} ({p.questionCount || 0} câu)
                          </span>
                        ))}
                      </div>
                    </div>

                    {summaryItem && summaryItem.attemptCount > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: '6px 12px',
                          background: 'var(--surface-2)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 14,
                          fontSize: 12.5,
                          flexWrap: 'wrap',
                          color: 'var(--text)',
                        }}
                      >
                        <span>Lượt nộp bài: <strong>{summaryItem.attemptCount}</strong></span>
                        <span>•</span>
                        <span>Điểm trung bình: <strong>{summaryItem.averageScore ? `${summaryItem.averageScore} / 990` : '—'}</strong></span>
                        {summaryItem.averageListeningScore && (
                          <span>(Nghe: <strong>{summaryItem.averageListeningScore}</strong> | Đọc: <strong>{summaryItem.averageReadingScore || '—'}</strong>)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hành động */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Nút soạn nội dung (luôn có) */}
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={() => navigate(`/teacher/tests/${test.id}/builder`)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Edit2 size={13} />
                      <span>Soạn nội dung</span>
                    </button>

                    <button
                      type="button"
                      className="btn secondary sm"
                      onClick={() => navigate(`/tests/${test.id}`)}
                      title="Xem trước giao diện làm bài của học viên"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Eye size={13} />
                      <span>Xem trước</span>
                    </button>

                    {/* Nút gửi duyệt (DRAFT / REJECTED) */}
                    {(test.status === 'DRAFT' || test.status === 'REJECTED') && (
                      <button
                        type="button"
                        className="btn secondary sm"
                        disabled={isLoadingAction || (test.totalQuestions || 0) === 0}
                        onClick={() => handleSubmitReview(test.id, test.totalQuestions || 0)}
                        title={(test.totalQuestions || 0) === 0 ? 'Đề thi cần có ít nhất 1 câu hỏi' : 'Gửi lên ban quản trị duyệt'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <Send size={13} />
                        <span>{isLoadingAction ? 'Đang gửi...' : 'Gửi duyệt'}</span>
                      </button>
                    )}

                    {/* Nút rút yêu cầu duyệt (PENDING_REVIEW) */}
                    {test.status === 'PENDING_REVIEW' && (
                      <button
                        type="button"
                        style={{
                          background: 'var(--warn-soft)',
                          border: '1px solid var(--warn-border)',
                          color: 'var(--warn)',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                        disabled={isLoadingAction}
                        onClick={() => handleToggleStatus(test.id)}
                      >
                        <RotateCcw size={13} />
                        <span>Rút yêu cầu</span>
                      </button>
                    )}

                    {/* Nút Ẩn đề (PUBLISHED) */}
                    {test.status === 'PUBLISHED' && (
                      <button
                        type="button"
                        className="btn secondary sm"
                        disabled={isLoadingAction}
                        onClick={() => handleToggleStatus(test.id)}
                        title="Tạm ẩn đề thi khỏi danh sách công khai"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <EyeOff size={13} />
                        <span>Tạm ẩn</span>
                      </button>
                    )}

                    {/* Nút Hiện lại đề (HIDDEN) */}
                    {test.status === 'HIDDEN' && (
                      <button
                        type="button"
                        className="btn primary sm"
                        disabled={isLoadingAction}
                        onClick={() => handleToggleStatus(test.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <Eye size={13} />
                        <span>Hiện lại đề</span>
                      </button>
                    )}

                    {/* Nút Xóa bản nháp (DRAFT / REJECTED) */}
                    {(test.status === 'DRAFT' || test.status === 'REJECTED') && (
                      <button
                        type="button"
                        className="btn secondary sm"
                        title="Xóa đề thi nháp"
                        disabled={isLoadingAction}
                        onClick={() => handleDeleteTest(test.id)}
                        style={{ color: 'var(--bad)', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <Trash2 size={13} />
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Nếu bị từ chối: hiển thị lý do từ chối */}
                {test.status === 'REJECTED' && test.rejectionReason && (
                  <div
                    style={{
                      background: 'var(--bad-soft)',
                      border: '1px solid var(--bad-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      marginTop: 14,
                      fontSize: 13.5,
                      color: 'var(--bad)',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Lý do từ chối từ Ban quản trị:</strong> {test.rejectionReason}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Tạo đề thi mới */}
      <CreateTestModal
        open={openCreateModal}
        onClose={() => setOpenCreateModal(false)}
        onSuccess={() => loadTests()}
      />
    </div>
  )
}
