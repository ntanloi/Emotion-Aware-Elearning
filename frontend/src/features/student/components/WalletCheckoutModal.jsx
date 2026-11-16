import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Wallet, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getWallet, purchaseWithWallet } from '@student/api/wallet.js'

export default function WalletCheckoutModal({ course, holdsReward = true, onClose, onSuccess }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [accepted, setAccepted] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => getWallet(),
  })

  const price = Number(course?.price || 0)
  const total = wallet ? Number(wallet.total || 0) : 0
  const cash = wallet ? Number(wallet.cashBalance || 0) : 0
  const bonus = wallet ? Number(wallet.bonusBalance || 0) : 0
  const shortfall = Math.max(0, price - total)

  const buyMutation = useMutation({
    mutationFn: () => purchaseWithWallet(course.id, accepted),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['wallet'] })
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['courses'] })
      qc.invalidateQueries({ queryKey: ['myCourses'] })
      if (onSuccess) onSuccess(data)
      onClose()
      navigate(`/courses/${course.id}/learn`)
    },
    onError: (err) => {
      const resp = err.response?.data
      if (err.response?.status === 402 || resp?.code === 'INSUFFICIENT_BALANCE') {
        setErrorMsg(`Số dư ví không đủ (thiếu ${(resp?.shortfall || shortfall).toLocaleString('vi-VN')} đ). Vui lòng nạp thêm tiền.`)
      } else {
        setErrorMsg(resp?.message || resp?.error || 'Có lỗi xảy ra khi thanh toán khóa học.')
      }
    },
  })

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
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24,
          borderRadius: 14,
          background: 'var(--surface, #ffffff)',
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: 16, borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: 12 }}>
          <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
            <Wallet size={20} color="var(--accent, #2563eb)" />
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text, #0f172a)' }}>
              Thanh toán khóa học bằng ví
            </h3>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-dim, #64748b)',
              padding: 4,
            }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Thông tin khóa học & số dư */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>{course?.title}</h4>
          <div
            style={{
              background: 'var(--surface-hover, #f8fafc)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 14,
            }}
          >
            <div className="flex-between">
              <span style={{ color: 'var(--text-dim, #64748b)' }}>Giá khóa học:</span>
              <strong style={{ fontSize: 16, color: '#dc2626' }}>{price.toLocaleString('vi-VN')} đ</strong>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--text-dim, #64748b)' }}>Tổng số dư ví hiện có:</span>
              <strong style={{ fontSize: 16, color: '#059669' }}>
                {loadingWallet ? 'Đang tải...' : `${total.toLocaleString('vi-VN')} đ`}
              </strong>
            </div>
            {total > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-dim, #64748b)', textAlign: 'right' }}>
                (Tiền nạp: {cash.toLocaleString('vi-VN')} đ · Tiền thưởng: {bonus.toLocaleString('vi-VN')} đ)
              </div>
            )}
          </div>
        </div>

        {/* Điều khoản thưởng 10% */}
        {holdsReward && (
          <div
            style={{
              background: 'rgba(37, 99, 235, 0.05)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                cursor: 'pointer',
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--text, #0f172a)',
              }}
            >
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                style={{ marginTop: 3, cursor: 'pointer', width: 16, height: 16 }}
              />
              <span>
                <strong>Điều khoản chương trình học thưởng:</strong> Tôi hiểu 10% giá khóa học ({Math.round(price * 0.1).toLocaleString('vi-VN')} đ) được hệ thống giữ lại và sẽ hoàn vào ví của tôi nếu xem đủ 70% video với camera bật và tập trung (độ phủ &ge; 80%, rời cam &le; 20%). Nếu không đạt trước khi hết hạn khóa học, phần này thuộc về giảng viên.
              </span>
            </label>
          </div>
        )}

        {/* Lỗi hiển thị nếu có */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Nút hành động */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            disabled={buyMutation.isPending}
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            Hủy
          </button>

          {shortfall > 0 ? (
            <button
              type="button"
              className="btn primary"
              style={{ padding: '8px 18px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => {
                onClose()
                navigate(`/wallet?amount=${shortfall}`)
              }}
            >
              <span>Nạp thêm {shortfall.toLocaleString('vi-VN')} đ</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn primary"
              disabled={buyMutation.isPending || (holdsReward && !accepted)}
              onClick={() => buyMutation.mutate()}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: (holdsReward && !accepted) ? 'var(--border, #cbd5e1)' : undefined,
                cursor: (holdsReward && !accepted) ? 'not-allowed' : 'pointer',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{buyMutation.isPending ? 'Đang xử lý...' : 'Thanh toán bằng ví'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
