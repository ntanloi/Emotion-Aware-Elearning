import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react'
import { getEmotionPrivacyOverview, deleteMyEmotionData } from '@student/api/reports.js'

/**
 * EmotionPrivacyModal — Tối giản, minh bạch và chính xác theo kiến trúc hệ thống
 */
export default function EmotionPrivacyModal({ onClose, onDataDeleted }) {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState(null)
  const [error, setError] = useState(null)

  const fetchOverview = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getEmotionPrivacyOverview()
      setOverview(data)
    } catch (err) {
      console.error('Lỗi tải thông tin quyền riêng tư:', err)
      setError('Không thể tải thông tin quyền riêng tư. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const result = await deleteMyEmotionData()
      setDeleteResult(result)
      setConfirmDelete(false)
      if (onDataDeleted) {
        onDataDeleted()
      }
      await fetchOverview()
    } catch (err) {
      console.error('Lỗi xóa dữ liệu cảm xúc:', err)
      setError('Có lỗi xảy ra khi xóa dữ liệu. Vui lòng thử lại.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 520,
          padding: 24,
          borderRadius: 14,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          background: 'var(--surface, #ffffff)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: 16, borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: 12 }}>
          <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
            <ShieldCheck size={20} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text, #0f172a)' }}>
              Quyền riêng tư & Dữ liệu cảm xúc
            </h3>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-dim)',
              padding: 4,
            }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Thông báo kết quả xóa thành công */}
        {deleteResult && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: 13,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} color="#059669" />
            <span>{deleteResult.message || 'Đã xóa toàn bộ dữ liệu cảm xúc cá nhân thành công.'}</span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* 3 dòng chính sách minh bạch */}
        <div
          style={{
            background: 'var(--surface-hover, #f8fafc)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>•</span>
            <div>
              <strong>Dữ liệu ghi nhận:</strong> Khung hình camera chỉ được gửi để nhận diện trạng thái tập trung trong thời gian thực và <em>không bao giờ lưu trữ hình ảnh/video</em> trên máy chủ.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>•</span>
            <div>
              <strong>Thời hạn lưu trữ:</strong> Chỉ số tập trung số học được lưu tối đa {overview?.retentionDays || 30} ngày để phân tích tiến bộ học tập, sau đó tự động xóa.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>•</span>
            <div>
              <strong>Quyền của bạn:</strong> Bạn có quyền xóa toàn bộ lịch sử cảm xúc bất kỳ lúc nào mà không làm ảnh hưởng đến tiến độ khóa học.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>•</span>
            <div>
              <strong>Chương trình học thưởng 10%:</strong> Dữ liệu tổng hợp lượt xem (độ phủ video và tỷ lệ tập trung) được lưu trữ độc lập để phục vụ xét hoàn thưởng và đối soát minh bạch, tự động xóa sau khi quyết toán 90 ngày.
            </div>
          </div>
        </div>

        {/* Số liệu thống kê dữ liệu hiện tại */}
        {overview && !loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              background: 'var(--surface, #ffffff)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 18,
              fontSize: 12.5,
              color: 'var(--text-dim)',
            }}
          >
            <div>
              Dữ liệu hiện có: <strong>{overview.totalBucketStatsCount || 0}</strong> mẫu 10s • <strong>{overview.cameraSessionsCount || 0}</strong> buổi học
            </div>
            <div>
              Lưu trữ: <strong>{overview.retentionDays || 30} ngày</strong>
            </div>
          </div>
        )}

        {/* Khu vực Xóa dữ liệu */}
        <div style={{ borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: 16 }}>
          {!confirmDelete ? (
            <div className="flex-between" style={{ alignItems: 'center' }}>
              <button
                type="button"
                className="btn sm flex-row"
                style={{
                  gap: 6,
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  fontWeight: 600,
                  borderRadius: 8,
                }}
                onClick={() => setConfirmDelete(true)}
                disabled={loading || (overview?.totalBucketStatsCount === 0 && overview?.totalEmotionLogsCount === 0)}
              >
                <Trash2 size={13} />
                <span>Xóa dữ liệu cảm xúc của tôi</span>
              </button>

              <button type="button" className="btn secondary sm" style={{ borderRadius: 8 }} onClick={onClose}>
                Đóng
              </button>
            </div>
          ) : (
            <div
              style={{
                background: '#fff5f5',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#991b1b', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                <AlertTriangle size={15} />
                <span>Xác nhận xóa vĩnh viễn toàn bộ dữ liệu cảm xúc?</span>
              </div>
              <div className="flex-row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn sm"
                  style={{ background: '#dc2626', color: '#fff', border: 'none', fontWeight: 600, borderRadius: 6 }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  style={{ borderRadius: 6 }}
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
