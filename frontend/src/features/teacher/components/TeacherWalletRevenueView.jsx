import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as walletApi from '@teacher/api/wallet.js'
import { useAuthStore } from '@auth/store/authStore.js'
import {
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  History,
  Send,
  X,
  ShieldCheck,
  Building2,
  User,
  Info,
  ChevronDown
} from 'lucide-react'

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN')

const ESCROW_STATUS = {
  HOLDING:  { label: 'Đang giữ hộ',              color: '#4f46e5', bg: 'rgba(99,102,241,0.12)' },
  CLAIMED:  { label: 'Học viên đã nhận thưởng',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  RELEASED: { label: 'Đã chuyển về ví của bạn',  color: '#059669', bg: 'rgba(16,185,129,0.12)' }
}

function StatCard({ label, value, hint, icon: Icon, color, bg, children }) {
  return (
    <div style={{
      background: 'var(--surface, #fff)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg, 12px)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {label}
          </span>
          <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 4 }}>
            {fmt(value)} <span style={{ fontSize: 14 }}>đ</span>
          </div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          <Icon size={19} />
        </div>
      </div>
      {hint && <p className="text-dim text-xs" style={{ margin: '10px 0 0' }}>{hint}</p>}
      {children}
    </div>
  )
}

export default function TeacherWalletRevenueView() {
  const user = useAuthStore((s) => s.user)
  const [summary, setSummary] = useState(null)
  const [entries, setEntries] = useState([])
  const [payouts, setPayouts] = useState([])
  const [escrows, setEscrows] = useState([])
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [subTab, setSubTab] = useState('entries') // 'entries' | 'payouts' | 'escrows'
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Modal rút tiền
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [submittingPayout, setSubmittingPayout] = useState(false)
  const [payoutError, setPayoutError] = useState(null)
  const [payoutSuccess, setPayoutSuccess] = useState(null)

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      else setRefreshing(true)
      setError(null)

      const [summaryRes, entriesRes, payoutsRes, escrowsRes] = await Promise.all([
        walletApi.getWalletSummary(),
        walletApi.getWalletEntries({ page: 0, size: 20 }),
        walletApi.getMyPayoutRequests(),
        walletApi.getEscrows({ page: 0, size: 20 })
      ])

      setSummary(summaryRes)
      setEntries(entriesRes.content || [])
      setPayouts(payoutsRes || [])
      setEscrows(escrowsRes.content || [])
    } catch (err) {
      console.error('Lỗi tải dữ liệu ví giảng viên:', err)
      setError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu tài chính')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenPayoutModal = () => {
    if (user?.status === 'PENDING_APPROVAL') {
      alert('Tài khoản giảng viên của bạn đang chờ phê duyệt, chưa thể gửi yêu cầu rút tiền.')
      return
    }
    setPayoutError(null)
    setPayoutSuccess(null)
    setPayoutAmount('')
    setShowPayoutModal(true)
  }

  const handleClosePayoutModal = () => {
    setShowPayoutModal(false)
  }

  const handleSubmitPayout = async (e) => {
    e.preventDefault()
    if (user?.status === 'PENDING_APPROVAL') {
      setPayoutError('Tài khoản giảng viên của bạn đang chờ phê duyệt, chưa thể gửi yêu cầu rút tiền.')
      return
    }
    const amountNum = Number(payoutAmount)
    const minAmount = summary?.minPayoutAmount || 50000
    const available = summary?.availableBalance || 0

    if (!amountNum || amountNum <= 0) {
      setPayoutError('Vui lòng nhập số tiền hợp lệ')
      return
    }
    if (amountNum < minAmount) {
      setPayoutError(`Số tiền rút tối thiểu là ${Number(minAmount).toLocaleString('vi-VN')} đ`)
      return
    }
    if (amountNum > available) {
      setPayoutError(`Số tiền rút vượt quá số dư khả dụng (${Number(available).toLocaleString('vi-VN')} đ)`)
      return
    }

    try {
      setSubmittingPayout(true)
      setPayoutError(null)
      await walletApi.requestPayout(amountNum)
      setPayoutSuccess('Yêu cầu rút tiền đã được tạo thành công và đang chờ ban quản trị giải ngân.')
      fetchData(true)
      setTimeout(() => {
        handleClosePayoutModal()
      }, 2000)
    } catch (err) {
      setPayoutError(err.response?.data?.error || err.response?.data?.message || err.message || 'Lỗi khi gửi yêu cầu rút tiền')
    } finally {
      setSubmittingPayout(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <RefreshCw size={30} className="spinner text-dim" />
        <p className="text-dim text-sm mt-12">Đang tải dữ liệu số dư và sổ cái giảng viên...</p>
      </div>
    )
  }

  const availableBal = Number(summary?.availableBalance || 0)
  const totalPaidOut = Number(summary?.totalPaidOut || 0)
  const pendingPayout = Number(summary?.pendingPayoutAmount || 0)
  const pendingReward = Number(summary?.pendingRewardAmount || 0)
  const totalEarned = Number(summary?.totalEarned || 0)
  const grossSales = Number(summary?.grossSales || 0)
  const platformFee = Number(summary?.platformFeeTotal || 0)
  const rewardClaimed = Number(summary?.rewardClaimedAmount || 0)
  const holdingCount = Number(summary?.holdingCount || 0)
  const nextDue = summary?.nextHoldingDue
    ? new Date(summary.nextHoldingDue).toLocaleDateString('vi-VN') : null
  const hasBank = !!(summary?.bankAccountNo && summary?.bankId)
  const minPayout = summary?.minPayoutAmount || 50000
  const payoutDisabled = user?.status === 'PENDING_APPROVAL'
    || availableBal < minPayout || summary?.hasPendingPayoutRequest

  return (
    <div>
      {/* 1. Header & Thông báo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet size={20} color="#10b981" />
            <span>Ví giảng viên</span>
          </h3>
          <p className="text-dim text-xs" style={{ margin: '4px 0 0 0' }}>
            Doanh thu khóa học được cộng trực tiếp vào số dư khả dụng ngay sau khi học viên thanh toán thành công.
          </p>
        </div>

        <button
          className="btn secondary sm flex-row"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          style={{ gap: 6 }}
          title="Tải lại số dư và lịch sử giao dịch mới nhất"
        >
          <RefreshCw size={14} className={refreshing ? 'spinner' : ''} />
          <span>{refreshing ? 'Đang làm mới...' : 'Làm mới số dư'}</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 2a. Thẻ dài: Số dư có thể rút */}
      <div className="teacher-wallet-balance-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Wallet size={26} />
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Số dư có thể rút
            </span>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#059669', lineHeight: 1.15 }}>
              {fmt(availableBal)} <span style={{ fontSize: 18 }}>đ</span>
            </div>
            <span className="text-dim text-xs">
              Đã trừ các lệnh đang chờ · Rút tối thiểu {fmt(minPayout)} đ
            </span>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleOpenPayoutModal}
          disabled={payoutDisabled}
          title={payoutDisabled && summary?.hasPendingPayoutRequest ? 'Bạn đang có một lệnh rút chờ duyệt' : undefined}
          style={{ padding: '10px 22px', fontSize: 14 }}
        >
          <Send size={15} style={{ marginRight: 8 }} />
          <span>{user?.status === 'PENDING_APPROVAL' ? 'Chờ duyệt tài khoản' : summary?.hasPendingPayoutRequest ? 'Đang có lệnh chờ' : 'Rút tiền'}</span>
        </button>
      </div>

      {/* 2b. Ba thẻ con */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16, marginBottom: 12 }}>
        <StatCard
          label="Chờ duyệt chi" value={pendingPayout} icon={Clock} color="#d97706" bg="rgba(245,158,11,0.15)"
          hint={summary?.hasPendingPayoutRequest ? 'Đã trừ khỏi số dư, đang chờ ban quản trị chuyển khoản' : 'Không có lệnh rút nào đang chờ'}
        />
        <StatCard
          label="Đã nhận về TK" value={totalPaidOut} icon={CheckCircle2} color="#2563eb" bg="rgba(59,130,246,0.15)"
          hint={`${payouts.filter(p => p.status === 'APPROVED').length} đợt rút đã hoàn tất`}
        />
        <StatCard
          label="Đang giữ hộ" value={pendingReward} icon={ShieldCheck} color="#4f46e5" bg="rgba(99,102,241,0.15)"
          hint={holdingCount > 0
            ? `${holdingCount} khoản · hạn gần nhất ${nextDue}`
            : 'Chưa có khoản nào đang giữ'}
        >
          <p className="text-dim" style={{ fontSize: 11.5, margin: '6px 0 0' }}>
            Nếu học viên xem đủ 70% video, khoản này thuộc về học viên. Nếu không, nó chuyển về số dư của bạn khi hết hạn.
          </p>
        </StatCard>
      </div>

      {/* 2c. Chi tiết cách tính (thu gọn) */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setShowBreakdown(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
        >
          <Info size={14} />
          <span>Xem cách tính từ doanh số đến thực nhận</span>
          <ChevronDown size={14} style={{ transform: showBreakdown ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        {showBreakdown && (
          <div style={{ marginTop: 10, padding: '14px 18px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', fontSize: 13 }}>
            {[
              ['Doanh số (100% giá bán)', grossSales, false],
              ['Phí nền tảng', -platformFee, false],
              ['Thưởng học viên đã nhận', -rewardClaimed, false],
              ['Đang giữ hộ (chưa tính)', -pendingReward, false],
              ['Thực nhận', totalEarned, true]
            ].map(([label, val, strong]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                fontWeight: strong ? 700 : 400,
                borderTop: strong ? '1px solid var(--border)' : 'none', marginTop: strong ? 6 : 0
              }}>
                <span>{label}</span>
                <span>{val < 0 ? '−' : ''}{fmt(Math.abs(val))} đ</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Cảnh báo thông tin ngân hàng nếu chưa cập nhật */}
      {!hasBank && (
        <div className="teacher-wallet-bank-alert">
          <div className="teacher-wallet-bank-alert-content">
            <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: 13.5, color: '#92400e', display: 'block' }}>Chưa cập nhật tài khoản ngân hàng thụ hưởng</strong>
              <p className="text-dim text-xs" style={{ margin: '3px 0 0', lineHeight: 1.45 }}>
                Vui lòng cập nhật số tài khoản và ngân hàng tại trang Thông tin cá nhân để có thể nhận tiền rút.
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="btn sm teacher-wallet-bank-alert-btn"
            style={{
              background: '#d97706',
              color: '#ffffff',
              border: '1px solid #b45309',
              fontWeight: 600,
              fontSize: 13,
              padding: '7px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            Cập nhật ngay
          </Link>
        </div>
      )}

      {/* 4. Tab điều hướng Sổ cái ví vs Lịch sử rút tiền */}
      <div className="teacher-wallet-tabs-nav">
        <button
          type="button"
          className={`teacher-wallet-tab-btn ${subTab === 'entries' ? 'active' : ''}`}
          onClick={() => setSubTab('entries')}
        >
          <History size={16} />
          <span>Biến động số dư (Sổ cái)</span>
          <span className="badge" style={{ fontSize: 11, background: subTab === 'entries' ? 'rgba(37, 99, 235, 0.12)' : 'var(--surface-hover)' }}>
            {entries.length}
          </span>
        </button>

        <button
          type="button"
          className={`teacher-wallet-tab-btn ${subTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setSubTab('payouts')}
        >
          <CreditCard size={16} />
          <span>Lịch sử yêu cầu rút tiền</span>
          <span className="badge" style={{ fontSize: 11, background: subTab === 'payouts' ? 'rgba(37, 99, 235, 0.12)' : 'var(--surface-hover)' }}>
            {payouts.length}
          </span>
        </button>

        <button
          type="button"
          className={`teacher-wallet-tab-btn ${subTab === 'escrows' ? 'active' : ''}`}
          onClick={() => setSubTab('escrows')}
        >
          <ShieldCheck size={16} />
          <span>Khoản giữ hộ</span>
          <span className="badge" style={{ fontSize: 11, background: subTab === 'escrows' ? 'rgba(37, 99, 235, 0.12)' : 'var(--surface-hover)' }}>
            {escrows.length}
          </span>
        </button>
      </div>

      {/* 5. Nội dung Tab 1: Sổ cái (Wallet Entries) */}
      {subTab === 'entries' && (
        <div>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <History size={36} className="text-dim" style={{ marginBottom: 10, opacity: 0.6 }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: 15 }}>Chưa có biến động số dư nào</h4>
              <p className="text-dim text-xs">
                Khi có học viên thanh toán hoặc giao dịch rút tiền được xử lý, lịch sử sổ cái sẽ ghi nhận tại đây.
              </p>
            </div>
          ) : (
            <div className="table-scroll" style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)', fontSize: 12 }}>
                    <th style={{ padding: '12px 16px' }}>Loại giao dịch</th>
                    <th style={{ padding: '12px 16px' }}>Số tiền</th>
                    <th style={{ padding: '12px 16px' }}>Mã đơn / Khóa học</th>
                    <th style={{ padding: '12px 16px' }}>Thời điểm khả dụng</th>
                    <th style={{ padding: '12px 16px' }}>Thời gian ghi nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const isPositive = Number(entry.amount) > 0
                    const isAvailable = new Date(entry.availableAt) <= new Date()

                    return (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: (entry.type === 'SALE' || entry.type === 'REWARD_RELEASE') ? '#dcfce7' : (entry.type === 'REFUND' ? '#fee2e2' : '#e0e7ff'),
                              color: (entry.type === 'SALE' || entry.type === 'REWARD_RELEASE') ? '#166534' : (entry.type === 'REFUND' ? '#991b1b' : '#3730a3')
                            }}>
                              {isPositive ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                              {entry.type === 'SALE' ? 'Bán khóa học (85%)' : (entry.type === 'REWARD_RELEASE' ? 'Nhận tiền giữ hộ' : (entry.type === 'REFUND' ? 'Hoàn tiền học viên' : 'Rút tiền về TK'))}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: isPositive ? '#10b981' : '#ef4444'
                          }}>
                            {isPositive ? '+' : ''}{Number(entry.amount).toLocaleString('vi-VN')} đ
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {entry.courseTitle || '—'}
                          </div>
                          {entry.orderCode && (
                            <div className="text-dim text-xs">Mã: {entry.orderCode}</div>
                          )}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 600,
                            background: isAvailable ? '#f0fdf4' : '#fffbeb',
                            color: isAvailable ? '#15803d' : '#b45309'
                          }}>
                            {isAvailable ? 'Đã khả dụng' : `Khả dụng: ${new Date(entry.availableAt).toLocaleDateString('vi-VN')}`}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-dim)' }}>
                          {new Date(entry.createdAt).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. Nội dung Tab 2: Lịch sử yêu cầu rút tiền (Payouts) */}
      {subTab === 'payouts' && (
        <div>
          {payouts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <CreditCard size={36} className="text-dim" style={{ marginBottom: 10, opacity: 0.6 }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: 15 }}>Chưa có yêu cầu rút tiền nào</h4>
              <p className="text-dim text-xs">
                Khi số dư có thể rút đạt từ {fmt(minPayout)} đ, bạn có thể tạo lệnh rút tiền về tài khoản ngân hàng.
              </p>
            </div>
          ) : (
            <div className="table-scroll" style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)', fontSize: 12 }}>
                    <th style={{ padding: '12px 16px' }}>Số tiền rút</th>
                    <th style={{ padding: '12px 16px' }}>Tài khoản nhận</th>
                    <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                    <th style={{ padding: '12px 16px' }}>Mã GD ngân hàng</th>
                    <th style={{ padding: '12px 16px' }}>Ghi chú</th>
                    <th style={{ padding: '12px 16px' }}>Thời gian gửi</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((req) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>
                          {Number(req.amount).toLocaleString('vi-VN')} đ
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{req.bankAccountNo}</div>
                        <div className="text-dim text-xs">{req.bankAccountName} ({req.bankId})</div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: 700,
                          background: req.status === 'APPROVED' ? '#dcfce7' : (req.status === 'PENDING' ? '#fef3c7' : '#fee2e2'),
                          color: req.status === 'APPROVED' ? '#15803d' : (req.status === 'PENDING' ? '#b45309' : '#991b1b')
                        }}>
                          {req.status === 'APPROVED' ? 'Đã chi tiền' : (req.status === 'PENDING' ? 'Đang chờ duyệt' : 'Từ chối')}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 12.5, fontWeight: 500 }}>
                        {req.transactionRef ? (
                          <span className="badge" style={{ background: 'var(--surface-hover)', fontFamily: 'monospace' }}>
                            {req.transactionRef}
                          </span>
                        ) : '—'}
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--text-dim)', maxWidth: 220 }}>
                        {req.adminNote || '—'}
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-dim)' }}>
                        {new Date(req.createdAt).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6b. Nội dung Tab 3: Khoản giữ hộ (Reward Escrows) */}
      {subTab === 'escrows' && (
        <div className="table-scroll" style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
          {escrows.length === 0 ? (
            <p className="text-dim text-xs" style={{ padding: 24, textAlign: 'center' }}>Chưa có khoản giữ hộ nào.</p>
          ) : (
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)', fontSize: 12 }}>
                  <th style={{ padding: '12px 16px' }}>Khóa học</th>
                  <th style={{ padding: '12px 16px' }}>Số tiền</th>
                  <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px' }}>Hạn quyết toán</th>
                </tr>
              </thead>
              <tbody>
                {escrows.map((e) => {
                  const st = ESCROW_STATUS[e.status] || ESCROW_STATUS.HOLDING
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px' }}>{e.courseTitle}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{fmt(e.amount)} đ</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, color: st.color, background: st.bg }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        {e.status === 'HOLDING'
                          ? new Date(e.holdingUntil).toLocaleDateString('vi-VN')
                          : e.settledAt ? `Đã xử lý ${new Date(e.settledAt).toLocaleDateString('vi-VN')}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 7. Modal Yêu cầu rút tiền */}
      {showPayoutModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 16,
            maxWidth: 480,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={18} color="var(--primary)" />
                <span>Yêu cầu rút tiền về ngân hàng</span>
              </h3>
              <button onClick={handleClosePayoutModal} aria-label="Đóng" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                <X size={20} />
              </button>
            </div>

            {payoutSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: 12 }} />
                <h4 style={{ margin: '0 0 6px 0', fontSize: 16 }}>Gửi yêu cầu thành công!</h4>
                <p className="text-dim text-xs" style={{ maxWidth: 360, margin: '0 auto' }}>
                  {payoutSuccess}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPayout}>
                {payoutError && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                    {payoutError}
                  </div>
                )}

                {/* Thông tin tài khoản thụ hưởng */}
                <div style={{ background: 'var(--surface-hover)', borderRadius: 10, padding: '14px 16px', marginBottom: 18, fontSize: 13 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
                    Tài khoản nhận tiền (Đã đăng ký)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Building2 size={15} className="text-dim" />
                    <strong>Ngân hàng:</strong> <span>{summary?.bankId || 'Chưa cài đặt'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <CreditCard size={15} className="text-dim" />
                    <strong>Số tài khoản:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{summary?.bankAccountNo || 'Chưa cài đặt'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={15} className="text-dim" />
                    <strong>Chủ tài khoản:</strong> <span>{summary?.bankAccountName || 'Chưa cài đặt'}</span>
                  </div>
                </div>

                {/* Nhập số tiền */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Số tiền muốn rút (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    min={summary?.minPayoutAmount || 50000}
                    max={availableBal}
                    className="input"
                    placeholder="VD: 500000"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    style={{ width: '100%', fontSize: 15, fontWeight: 600 }}
                    required
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--text-dim)' }}>
                    <span>Số dư khả dụng: <strong>{availableBal.toLocaleString('vi-VN')} đ</strong></span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: 0 }}
                      onClick={() => setPayoutAmount(availableBal.toString())}
                    >
                      Rút tối đa
                    </button>
                  </div>
                </div>

                {/* Nút gửi */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-ghost" onClick={handleClosePayoutModal} disabled={submittingPayout}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submittingPayout || availableBal < minPayout}>
                    {submittingPayout ? (
                      <>
                        <RefreshCw size={14} className="spinner" style={{ marginRight: 6 }} />
                        <span>Đang gửi yêu cầu...</span>
                      </>
                    ) : (
                      <span>Xác nhận gửi yêu cầu</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
