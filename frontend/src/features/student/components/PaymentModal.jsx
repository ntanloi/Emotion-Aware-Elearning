import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import * as orderApi from '@student/api/orders.js'
import { useRealtimeEvent, useRealtimeStatus } from '@shared/realtime/index.js'
import {
  X,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Clock,
  AlertCircle,
  Hourglass
} from 'lucide-react'

import { vnTime } from '@shared/utils/dateTime.js'
export default function PaymentModal({ course, onClose, onSuccess }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isLive } = useRealtimeStatus()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copiedField, setCopiedField] = useState(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [remainingSecs, setRemainingSecs] = useState(null)

  // Lắng nghe sự kiện realtime push thanh toán thành công hoặc hết hạn
  useRealtimeEvent('payment', (data) => {
    if (!order?.id || data?.orderId !== order.id) return

    if (data.status === 'PAID') {
      setIsSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      if (onSuccess) onSuccess()
    } else if (data.status === 'EXPIRED') {
      setError('Đơn hàng này đã hết hạn sau 24h. Vui lòng đóng và tạo lại đơn mới.')
    }
  })

  // 1. Tạo hoặc lấy đơn hàng PENDING khi mở Modal
  useEffect(() => {
    let isMounted = true
    async function initOrder() {
      try {
        setLoading(true)
        setError(null)
        const data = await orderApi.createOrder(course.id)
        if (isMounted) {
          setOrder(data)
          if (data.status === 'PAID') {
            setIsSuccess(true)
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || err.message || 'Không thể tạo mã thanh toán')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initOrder()
    return () => {
      isMounted = false
    }
  }, [course.id])

  // 2. Tính toán đồng hồ đếm ngược 24h
  useEffect(() => {
    if (!order) return

    const calculateRemaining = () => {
      const expireTime = order.expiredAt
        ? vnTime(order.expiredAt)
        : (order.createdAt ? vnTime(order.createdAt) + 24 * 60 * 60 * 1000 : null)

      if (!expireTime) return 0
      const diff = Math.max(0, Math.floor((expireTime - Date.now()) / 1000))
      return diff
    }

    setRemainingSecs(calculateRemaining())

    const timer = setInterval(() => {
      const rem = calculateRemaining()
      setRemainingSecs(rem)
      if (rem <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [order])

  // 3. Tự động kiểm tra trạng thái thanh toán
  // Khi Realtime LIVE: không poll 3s (đợi event push), chỉ giữ 1 lần kiểm tra an toàn sau 20s
  // Khi mất Realtime: quay về Polling 3s làm dự phòng
  useEffect(() => {
    if (!order?.id || isSuccess || order.status === 'PAID') return

    const checkOrderStatus = async () => {
      try {
        const fresh = await orderApi.getOrder(order.id)
        if (fresh.status === 'PAID') {
          setOrder(fresh)
          setIsSuccess(true)
          queryClient.invalidateQueries({ queryKey: ['enrollments', 'mine'] })
          queryClient.invalidateQueries({ queryKey: ['orders'] })
          if (onSuccess) onSuccess()
          return true
        } else if (fresh.status === 'EXPIRED') {
          setOrder(fresh)
          setError('Đơn hàng này đã hết hạn sau 24h. Vui lòng đóng và tạo lại đơn mới.')
          return true
        }
      } catch (err) {
        // bỏ qua lỗi mạng tạm thời
      }
      return false
    }

    if (isLive) {
      // Chế độ LIVE: Chỉ đặt 1 lần kiểm tra an toàn sau 20 giây
      const safetyTimer = setTimeout(checkOrderStatus, 20000)
      return () => clearTimeout(safetyTimer)
    } else {
      // Chế độ Fallback: Polling mỗi 3 giây
      const interval = setInterval(async () => {
        const done = await checkOrderStatus()
        if (done) clearInterval(interval)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [order?.id, isSuccess, isLive, queryClient, onSuccess])

  // Xử lý kiểm tra thủ công
  const handleCheckStatus = async () => {
    if (!order?.id || checkingStatus) return
    try {
      setCheckingStatus(true)
      const fresh = await orderApi.getOrder(order.id)
      setOrder(fresh)
      if (fresh.status === 'PAID') {
        setIsSuccess(true)
        queryClient.invalidateQueries({ queryKey: ['enrollments', 'mine'] })
        if (onSuccess) onSuccess()
      } else if (fresh.status === 'EXPIRED') {
        setError('Đơn hàng này đã hết hạn sau 24h. Vui lòng đóng và tạo lại đơn mới.')
      }
    } catch (err) {
      // bỏ qua
    } finally {
      setTimeout(() => setCheckingStatus(false), 500)
    }
  }

  // Xử lý sao chép thông tin
  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleStartLearning = () => {
    onClose()
    navigate(`/courses/${course.id}/learn`)
  }

  // Format đếm ngược HH:mm:ss
  const formatCountdown = (secs) => {
    if (secs == null) return '--:--:--'
    if (secs <= 0) return '00:00:00 (Đã hết hạn)'
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const isExpired = remainingSecs !== null && remainingSecs <= 0

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal-card">
        {/* Modal Header */}
        <div className="payment-modal-header">
          <div className="payment-modal-title-wrap">
            <QrCode size={20} className="text-primary" />
            <h3>Thanh toán đăng ký khóa học</h3>
          </div>
          <button className="payment-modal-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="payment-modal-body">
          {loading ? (
            <div className="payment-loading-box">
              <RefreshCw size={28} className="spinner" />
              <p>Đang khởi tạo mã QR thanh toán...</p>
            </div>
          ) : error ? (
            <div className="payment-error-box">
              <AlertCircle size={32} className="text-warn" />
              <p>{error}</p>
              <button className="btn btn-outline mt-12" onClick={onClose}>
                Đóng
              </button>
            </div>
          ) : isSuccess ? (
            <div className="payment-success-box">
              <div className="success-icon-badge">
                <CheckCircle2 size={54} color="#10b981" />
              </div>
              <h4 className="mt-12">Thanh toán thành công!</h4>
              <p className="text-dim mt-4">
                Bạn đã được tự động ghi danh vào khóa học <strong>{course.title}</strong>.
              </p>
              <div className="payment-success-actions mt-20">
                <button className="btn btn-primary" onClick={handleStartLearning}>
                  Vào học ngay bây giờ
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Dải đếm ngược thời gian thanh toán (24 giờ) */}
              <div style={{
                background: isExpired ? '#fef2f2' : '#f8fafc',
                border: isExpired ? '1px solid #fecaca' : '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 14px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12.5
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isExpired ? '#991b1b' : 'var(--text-dim)' }}>
                  <Hourglass size={15} color={isExpired ? '#dc2626' : 'var(--primary)'} />
                  <span>Hạn thanh toán đơn:</span>
                </div>
                <strong style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: isExpired ? '#dc2626' : (remainingSecs < 3600 ? '#d97706' : '#2563eb')
                }}>
                  {formatCountdown(remainingSecs)}
                </strong>
              </div>

              <div className="payment-content-grid">
                {/* CỘT TRÁI: VietQR Code */}
                <div className="payment-qr-pane">
                  <div className="payment-qr-frame">
                    {order?.qrUrl && !isExpired ? (
                      <img
                        src={order.qrUrl}
                        alt="VietQR Chuyển khoản"
                        className="payment-qr-image"
                      />
                    ) : (
                      <div className="payment-qr-placeholder">
                        <QrCode size={64} />
                        <span>{isExpired ? 'Đơn hàng đã hết hạn' : 'Không thể tải ảnh QR'}</span>
                      </div>
                    )}
                  </div>
                  <div className="payment-qr-hint">
                    <Clock size={13} />
                    <span>Quét bằng app Mobile Banking bất kỳ</span>
                  </div>
                </div>

                {/* CỘT PHẢI: Thông tin số tài khoản & Nội dung */}
                <div className="payment-info-pane">
                  <div className="payment-course-brief">
                    <div className="text-dim text-xs">Khóa học đăng ký:</div>
                    <div className="font-semibold text-sm line-clamp-1">{course.title}</div>
                    <div className="payment-amount-highlight mt-6">
                      {Number(order?.amount || course.price).toLocaleString('vi-VN')} đ
                    </div>
                  </div>

                  <div className="payment-transfer-details">
                    {/* Ngân hàng */}
                    <div className="payment-detail-row">
                      <span className="detail-label">Ngân hàng thụ hưởng:</span>
                      <span className="detail-val font-medium">{order?.bankId || 'MB'}</span>
                    </div>

                    {/* Tên chủ tài khoản */}
                    <div className="payment-detail-row">
                      <span className="detail-label">Chủ tài khoản:</span>
                      <span className="detail-val font-medium">{order?.accountName || 'ELEARNING TOEIC CENTER'}</span>
                    </div>

                    {/* Số tài khoản */}
                    <div className="payment-detail-row has-copy">
                      <div>
                        <span className="detail-label">Số tài khoản:</span>
                        <div className="detail-val font-bold text-base text-primary">
                          {order?.accountNo || '—'}
                        </div>
                      </div>
                      {order?.accountNo && (
                        <button
                          className="copy-btn"
                          title="Sao chép số tài khoản"
                          onClick={() => handleCopy(order.accountNo, 'acc')}
                        >
                          {copiedField === 'acc' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                          <span>{copiedField === 'acc' ? 'Đã chép' : 'Chép'}</span>
                        </button>
                      )}
                    </div>

                    {/* Nội dung chuyển khoản (QUAN TRỌNG) */}
                    <div className="payment-detail-row has-copy highlight-bg">
                      <div>
                        <span className="detail-label">Nội dung chuyển khoản (Bắt buộc):</span>
                        <div className="detail-val font-bold text-accent text-base">
                          {order?.orderCode}
                        </div>
                      </div>
                      <button
                        className="copy-btn"
                        title="Sao chép nội dung chuyển khoản"
                        onClick={() => handleCopy(order?.orderCode, 'code')}
                      >
                        {copiedField === 'code' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        <span>{copiedField === 'code' ? 'Đã chép' : 'Chép'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Nút tự kiểm tra trạng thái */}
                  <div style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="btn btn-outline sm"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onClick={handleCheckStatus}
                      disabled={checkingStatus || isExpired}
                    >
                      <RefreshCw size={13} className={checkingStatus ? 'spinner' : ''} />
                      <span>{checkingStatus ? 'Đang kiểm tra giao dịch...' : 'Tôi đã chuyển tiền — Kiểm tra ngay'}</span>
                    </button>
                  </div>

                  {/* Cảnh báo chính sách không hoàn tiền */}
                  <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626', textAlign: 'center', fontWeight: 500 }}>
                    Lưu ý: Thanh toán thành công sẽ không được hoàn tiền.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="payment-modal-footer">
          <div className="secure-tag">
            <ShieldCheck size={14} color="#10b981" />
            <span>Thanh toán an toàn qua VietQR Napas247 • Không hoàn tiền</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
