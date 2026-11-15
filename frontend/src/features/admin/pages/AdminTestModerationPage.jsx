import { useEffect, useState } from 'react'
import {
  FileCheck,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  Clock,
  Shield,
  EyeOff,
  User,
  Sparkles,
} from 'lucide-react'
import { listAdminTests, approveTest, rejectTest, hideTest, seedSampleTests } from '@admin/api/adminTests.js'
import AdminTestDetailModal from '@admin/components/AdminTestDetailModal.jsx'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import EmptyState from '@shared/components/ui/EmptyState.jsx'

export default function AdminTestModerationPage() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [message, setMessage] = useState('')
  const [seeding, setSeeding] = useState(false)

  // Modal xem chi tiết
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedTestId, setSelectedTestId] = useState(null)

  // Modal nhập lý do từ chối / gỡ đề
  const [reasonModal, setReasonModal] = useState({
    open: false,
    actionType: null, // 'REJECT' | 'HIDE'
    test: null,
    reason: '',
  })

  useEffect(() => {
    loadTests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const loadTests = async () => {
    setLoading(true)
    try {
      const params = {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        size: 50,
      }
      const data = await listAdminTests(params)
      setTests(data?.content || data || [])
    } catch (err) {
      console.error('Lỗi tải danh sách đề thi:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (test) => {
    if (!window.confirm(`Bạn có chắc muốn phê duyệt đề thi "${test.title}" để xuất bản lên Thư viện công khai?`)) {
      return
    }
    setActionLoadingId(test.id)
    setMessage('')
    try {
      const updated = await approveTest(test.id)
      setTests((prev) => prev.map((t) => (t.id === test.id ? updated : t)))
      setMessage(`Đã phê duyệt và xuất bản đề thi "${test.title}" thành công!`)
      setDetailModalOpen(false)
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi khi phê duyệt đề thi')
    } finally {
      setActionLoadingId(null)
    }
  }

  const openRejectModal = (test, actionType = 'REJECT') => {
    setReasonModal({
      open: true,
      actionType,
      test,
      reason: actionType === 'REJECT'
        ? 'Chưa đáp ứng tiêu chuẩn chất lượng câu hỏi hoặc lỗi định dạng âm thanh/hình ảnh.'
        : 'Vi phạm quy chế bản quyền nội dung hoặc có phản ánh từ học viên.',
    })
  }

  const handleConfirmReasonAction = async () => {
    const { test, actionType, reason } = reasonModal
    if (!test || !reason.trim()) return

    setActionLoadingId(test.id)
    setMessage('')
    try {
      let updated
      if (actionType === 'REJECT') {
        updated = await rejectTest(test.id, reason.trim())
        setMessage(`Đã từ chối đề thi "${test.title}". Lý do đã được gửi tới giáo viên.`)
      } else {
        updated = await hideTest(test.id, reason.trim())
        setMessage(`Đã gỡ đề thi "${test.title}" khỏi thư viện.`)
      }

      setTests((prev) => prev.map((t) => (t.id === test.id ? updated : t)))
      setReasonModal({ open: false, actionType: null, test: null, reason: '' })
      setDetailModalOpen(false)
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện thao tác')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSeedSamples = async () => {
    if (!window.confirm('Hệ thống sẽ khởi tạo 5 bộ đề thi mẫu chuẩn ETS TOEIC cho thư viện. Tiếp tục?')) {
      return
    }
    setSeeding(true)
    setMessage('')
    try {
      await seedSampleTests()
      setMessage('Khởi tạo thành công 5 đề thi mẫu Hệ thống chuẩn ETS TOEIC!')
      loadTests()
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi khởi tạo đề mẫu')
    } finally {
      setSeeding(false)
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

  const filteredTests = tests.filter((t) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase().trim()
    return t.title?.toLowerCase().includes(q) || t.authorName?.toLowerCase().includes(q)
  })

  return (
    <div style={{ padding: '0 8px 32px' }}>
      {/* Tiêu đề trang Admin */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>
            Kiểm duyệt đề thi TOEIC
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-dim)' }}>
            Xét duyệt các đề thi do giáo viên đóng góp, kiểm tra tính chuẩn xác của câu hỏi và xuất bản lên Thư viện đề thi TOEIC.
          </p>
        </div>
        <button
          type="button"
          disabled={seeding}
          onClick={handleSeedSamples}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--accent)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Sparkles size={15} />
          <span>{seeding ? 'Đang khởi tạo...' : 'Khởi tạo 5 đề mẫu Hệ thống'}</span>
        </button>
      </div>

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
            fontSize: 13.5,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Bộ lọc trạng thái & Tìm kiếm */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 4, borderRadius: 'var(--radius-md)', gap: 4 }}>
          {[
            { id: 'PENDING_REVIEW', label: 'Chờ duyệt' },
            { id: 'PUBLISHED', label: 'Đã xuất bản' },
            { id: 'REJECTED', label: 'Bị từ chối' },
            { id: 'HIDDEN', label: 'Đã gỡ / ẩn' },
            { id: 'ALL', label: 'Tất cả' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              style={{
                border: 'none',
                background: statusFilter === tab.id ? 'var(--surface)' : 'transparent',
                color: statusFilter === tab.id ? 'var(--accent)' : 'var(--text-dim)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontWeight: statusFilter === tab.id ? 600 : 500,
                cursor: 'pointer',
                boxShadow: statusFilter === tab.id ? 'var(--shadow-sm)' : 'none',
              }}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Tìm đề theo tên hoặc giáo viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13.5,
              background: 'var(--surface)',
            }}
          />
        </div>
      </div>

      {/* Danh sách đề thi */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: 'var(--surface)', padding: 18, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <Skeleton width="30%" height={20} style={{ marginBottom: 8 }} />
              <Skeleton width="60%" height={16} />
            </div>
          ))}
        </div>
      ) : filteredTests.length === 0 ? (
        <EmptyState
          title="Không có đề thi nào trong danh sách"
          description="Hiện tại không có đề thi nào phù hợp với bộ lọc đã chọn."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredTests.map((test) => {
            const badge = getStatusBadge(test.status)
            const isLoading = actionLoadingId === test.id

            return (
              <div
                key={test.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 20,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>
                        {test.source === 'SYSTEM' ? 'Đề Hệ thống' : 'Đề Cộng đồng'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        • Phiên bản {test.version || 1}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: 16.5, color: 'var(--text)' }}>
                      {test.title}
                    </h3>

                    <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                      <span>Giáo viên biên soạn: <strong>{test.authorName || '—'}</strong></span>
                      <span>•</span>
                      <span>Tổng số câu: <strong>{test.totalQuestions || 0} câu</strong></span>
                      <span>•</span>
                      <span>Thời lượng: <strong>{test.totalMinutes || 120} phút</strong></span>
                      <span>•</span>
                      <span>
                        Các phần: {(test.parts || []).map((p) => `Part ${p.partNo}`).join(', ') || 'Chưa có part'}
                      </span>
                    </div>

                    {test.rejectionReason && (
                      <div style={{ marginTop: 10, fontSize: 13, color: 'var(--bad)', background: 'var(--bad-soft)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                        <strong>Lý do từ chối / gỡ:</strong> {test.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Nhóm nút hành động */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontWeight: 500,
                      }}
                      onClick={() => {
                        setSelectedTestId(test.id)
                        setDetailModalOpen(true)
                      }}
                    >
                      <Eye size={14} />
                      <span>Soát đề chi tiết</span>
                    </button>

                    {test.status === 'PENDING_REVIEW' && (
                      <>
                        <button
                          type="button"
                          style={{
                            background: 'var(--bad-soft)',
                            border: '1px solid var(--bad-border)',
                            color: 'var(--bad)',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          disabled={isLoading}
                          onClick={() => openRejectModal(test, 'REJECT')}
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          style={{
                            background: 'var(--good)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '6px 14px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          disabled={isLoading}
                          onClick={() => handleApprove(test)}
                        >
                          Duyệt đề
                        </button>
                      </>
                    )}

                    {test.status === 'PUBLISHED' && (
                      <button
                        type="button"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--bad)',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                        disabled={isLoading}
                        onClick={() => openRejectModal(test, 'HIDE')}
                      >
                        Gỡ đề vi phạm
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal soát chi tiết đề */}
      <AdminTestDetailModal
        open={detailModalOpen}
        testId={selectedTestId}
        onClose={() => setDetailModalOpen(false)}
        onApprove={(test) => handleApprove(test)}
        onReject={(test) => openRejectModal(test, 'REJECT')}
      />

      {/* Modal nhập lý do Từ chối / Gỡ đề */}
      {reasonModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 17, color: 'var(--text)' }}>
              {reasonModal.actionType === 'REJECT' ? 'Từ chối duyệt đề thi' : 'Gỡ đề thi vi phạm'}
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
              Nhập lý do phản hồi cho giảng viên <strong>{reasonModal.test?.authorName}</strong> để họ biết và điều chỉnh:
            </p>

            <textarea
              rows={4}
              value={reasonModal.reason}
              onChange={(e) => setReasonModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Nhập lý do cụ thể..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13.5,
                background: 'var(--surface)',
                color: 'var(--text)',
                resize: 'none',
                marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
                onClick={() => setReasonModal({ open: false, actionType: null, test: null, reason: '' })}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--bad)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                disabled={!reasonModal.reason.trim()}
                onClick={handleConfirmReasonAction}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
