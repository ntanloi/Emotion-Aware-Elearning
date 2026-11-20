import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import * as financeApi from '@admin/api/finance.js'
import AdminPageHeader from '@admin/components/ui/AdminPageHeader.jsx'
import Modal from '@shared/components/ui/Modal.jsx'
import { useRealtimeEvent } from '@shared/realtime/index.js'
import AdminStudentWithdrawalsTab from '@admin/components/AdminStudentWithdrawalsTab.jsx'
import AdminRewardsEscrowTab from '@admin/components/AdminRewardsEscrowTab.jsx'
import {
  CreditCard,
  ShoppingBag,
  ArrowRightLeft,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  RotateCcw,
  ExternalLink,
  Info,
  DollarSign,
  TrendingUp,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  ShieldCheck,
  Building2,
  AlertCircle,
  Wallet,
  Award
} from 'lucide-react'

import { formatVnDate, formatVnDateTime } from '@shared/utils/dateTime.js'
// Avatar initials helper
function getInitials(name) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Format VND helper
function formatVND(amount) {
  if (amount === undefined || amount === null) return '0 đ'
  return `${Number(amount).toLocaleString('vi-VN')} đ`
}

export default function AdminFinancePage() {
  // Cho phép mở thẳng tab qua ?tab=... (từ thông báo chuông)
  const tabsNavRef = useRef(null)
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab')
      return ['orders', 'transactions', 'payouts', 'student-withdrawals', 'rewards-escrow'].includes(t) ? t : 'orders'
    } catch {
      return 'orders'
    }
  })

  // Summary Metrics State
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // 1. State Đơn hàng
  const [orders, setOrders] = useState([])
  const [orderTotalElements, setOrderTotalElements] = useState(0)
  const [orderStatus, setOrderStatus] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderPage, setOrderPage] = useState(0)
  const [orderTotalPages, setOrderTotalPages] = useState(0)
  const [orderLoading, setOrderLoading] = useState(false)

  // 2. State Giao dịch SePay
  const [transactions, setTransactions] = useState([])
  const [txTotalElements, setTxTotalElements] = useState(0)
  const [txStatus, setTxStatus] = useState('')
  const [txPage, setTxPage] = useState(0)
  const [txTotalPages, setTxTotalPages] = useState(0)
  const [txLoading, setTxLoading] = useState(false)

  // 3. State Yêu cầu rút tiền
  const [payouts, setPayouts] = useState([])
  const [payoutTotalElements, setPayoutTotalElements] = useState(0)
  const [payoutStatus, setPayoutStatus] = useState('')
  const [payoutPage, setPayoutPage] = useState(0)
  const [payoutTotalPages, setPayoutTotalPages] = useState(0)
  const [payoutLoading, setPayoutLoading] = useState(false)

  // Copy feedback
  const [copiedText, setCopiedText] = useState('')
  const copyToClipboard = (text, label) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopiedText(text)
    showToast(`Đã sao chép ${label || 'mã'}: ${text}`)
    setTimeout(() => setCopiedText(''), 2500)
  }

  // Modals state
  const [matchModal, setMatchModal] = useState({
    open: false,
    tx: null,
    orderCode: '',
    note: '',
    submitting: false,
    error: null
  })

  const [approvePayoutModal, setApprovePayoutModal] = useState({
    open: false,
    payout: null,
    txRef: '',
    note: '',
    submitting: false,
    error: null,
    checkingSepay: false,
    sepayResult: null
  })

  const [rejectPayoutModal, setRejectPayoutModal] = useState({
    open: false,
    payout: null,
    reason: '',
    submitting: false,
    error: null
  })

  // Toast feedback
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true)
      const data = await financeApi.getAdminFinanceSummary()
      setSummary(data)
    } catch (err) {
      console.warn('Không thể tải thống kê tổng quan (sử dụng fallback):', err)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  // Fetch Đơn hàng
  const fetchOrders = useCallback(async () => {
    try {
      setOrderLoading(true)
      const res = await financeApi.getAdminOrders({
        status: orderStatus,
        q: orderSearch,
        page: orderPage,
        size: 15
      })
      setOrders(res.content || [])
      setOrderTotalPages(res.totalPages || 0)
      setOrderTotalElements(res.totalElements || 0)
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hàng:', err)
      showToast('Không thể tải danh sách đơn hàng', 'error')
    } finally {
      setOrderLoading(false)
    }
  }, [orderStatus, orderSearch, orderPage])

  // Fetch Giao dịch SePay
  const fetchTransactions = useCallback(async () => {
    try {
      setTxLoading(true)
      const res = await financeApi.getAdminTransactions({
        status: txStatus,
        page: txPage,
        size: 15
      })
      setTransactions(res.content || [])
      setTxTotalPages(res.totalPages || 0)
      setTxTotalElements(res.totalElements || 0)
    } catch (err) {
      console.error('Lỗi tải danh sách giao dịch SePay:', err)
      showToast('Không thể tải giao dịch SePay', 'error')
    } finally {
      setTxLoading(false)
    }
  }, [txStatus, txPage])

  // Fetch Yêu cầu rút tiền
  const fetchPayouts = useCallback(async () => {
    try {
      setPayoutLoading(true)
      const res = await financeApi.getAdminPayouts({
        status: payoutStatus,
        page: payoutPage,
        size: 15
      })
      setPayouts(res.content || [])
      setPayoutTotalPages(res.totalPages || 0)
      setPayoutTotalElements(res.totalElements || 0)
    } catch (err) {
      console.error('Lỗi tải danh sách yêu cầu rút tiền:', err)
      showToast('Không thể tải yêu cầu rút tiền', 'error')
    } finally {
      setPayoutLoading(false)
    }
  }, [payoutStatus, payoutPage])

  // Thanh tab: lăn chuột dọc để cuộn ngang, và tự cuộn tới tab đang chọn
  useEffect(() => {
    const nav = tabsNavRef.current
    if (!nav) return undefined
    const onWheel = (e) => {
      if (nav.scrollWidth <= nav.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      const atStart = nav.scrollLeft <= 0 && e.deltaY < 0
      const atEnd = nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 1 && e.deltaY > 0
      if (atStart || atEnd) return // hết đầu/cuối thì để trang cuộn dọc bình thường
      e.preventDefault()
      nav.scrollLeft += e.deltaY
    }
    nav.addEventListener('wheel', onWheel, { passive: false })
    return () => nav.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const active = tabsNavRef.current?.querySelector('.admin-finance-tab-btn.active')
    active?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [activeTab])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders()
    else if (activeTab === 'transactions') fetchTransactions()
    else if (activeTab === 'payouts') fetchPayouts()
  }, [activeTab, fetchOrders, fetchTransactions, fetchPayouts])

  // Xử lý Khớp giao dịch thủ công
  const handleConfirmMatch = async (e) => {
    e.preventDefault()
    if (!matchModal.orderCode.trim() || !matchModal.note.trim()) {
      setMatchModal(m => ({ ...m, error: 'Bắt buộc nhập Mã đơn hàng và Ghi chú đối soát' }))
      return
    }

    try {
      setMatchModal(m => ({ ...m, submitting: true, error: null }))
      await financeApi.manualMatchTransaction(matchModal.tx.id, {
        orderCode: matchModal.orderCode.trim(),
        adminNote: matchModal.note.trim()
      })
      showToast(`Khớp thủ công giao dịch #${matchModal.tx.sepayId} vào đơn ${matchModal.orderCode.trim()} thành công`)
      setMatchModal({ open: false, tx: null, orderCode: '', note: '', submitting: false, error: null })
      fetchTransactions()
      fetchSummary()
    } catch (err) {
      setMatchModal(m => ({ ...m, submitting: false, error: err.response?.data?.message || err.message || 'Lỗi khi khớp giao dịch' }))
    }
  }

  // Kiểm tra đối soát giao dịch SePay (Luồng tiền chuyển đi)
  const handleCheckSepay = async (txRefOverride, targetPayout) => {
    const currentPayout = targetPayout || approvePayoutModal.payout
    if (!currentPayout) return
    const refToTest = txRefOverride !== undefined ? txRefOverride : approvePayoutModal.txRef

    try {
      setApprovePayoutModal(m => ({ ...m, checkingSepay: true, error: null }))
      const res = await financeApi.checkPayoutSepay(currentPayout.id, { transactionRef: refToTest })
      setApprovePayoutModal(m => ({
        ...m,
        checkingSepay: false,
        sepayResult: res,
        txRef: (!m.txRef && res.matched && res.transaction?.referenceCode)
          ? res.transaction.referenceCode
          : (!m.txRef && res.matched && res.transaction?.sepayId)
            ? String(res.transaction.sepayId)
            : m.txRef,
        error: res.matched ? null : (res.message || 'Chưa tìm thấy giao dịch chuyển tiền hợp lệ trên SePay')
      }))
    } catch (err) {
      setApprovePayoutModal(m => ({
        ...m,
        checkingSepay: false,
        sepayResult: null,
        error: err.response?.data?.message || err.message || 'Lỗi khi kiểm tra đối soát SePay'
      }))
    }
  }

  // Xử lý Duyệt chi rút tiền
  const handleConfirmApprovePayout = async (e) => {
    e.preventDefault()
    if (!approvePayoutModal.sepayResult?.matched) {
      setApprovePayoutModal(m => ({
        ...m,
        error: 'Chưa vượt qua bước kiểm tra SePay! Hệ thống bắt buộc phải xác nhận đúng số tiền, đúng mã giảng viên và đúng tài khoản thụ hưởng trên luồng tiền chuyển đi của SePay trước khi duyệt chi.'
      }))
      return
    }

    try {
      setApprovePayoutModal(m => ({ ...m, submitting: true, error: null }))
      await financeApi.approvePayout(approvePayoutModal.payout.id, {
        transactionRef: (approvePayoutModal.txRef || '').trim(),
        adminNote: approvePayoutModal.note.trim()
      })
      showToast(`Đã xác nhận giải ngân thành công cho giảng viên ${approvePayoutModal.payout.teacherName}`)
      setApprovePayoutModal({
        open: false,
        payout: null,
        txRef: '',
        note: '',
        submitting: false,
        error: null,
        checkingSepay: false,
        sepayResult: null
      })
      fetchPayouts()
      fetchSummary()
    } catch (err) {
      setApprovePayoutModal(m => ({
        ...m,
        submitting: false,
        error: err.response?.data?.message || err.message || 'Lỗi duyệt chi rút tiền'
      }))
    }
  }

  // Xử lý Từ chối rút tiền
  const handleConfirmRejectPayout = async (e) => {
    e.preventDefault()
    if (!rejectPayoutModal.reason.trim()) {
      setRejectPayoutModal(m => ({ ...m, error: 'Bắt buộc nhập lý do từ chối' }))
      return
    }

    try {
      setRejectPayoutModal(m => ({ ...m, submitting: true, error: null }))
      await financeApi.rejectPayout(rejectPayoutModal.payout.id, {
        reason: rejectPayoutModal.reason.trim()
      })
      showToast(`Đã từ chối yêu cầu rút tiền của ${rejectPayoutModal.payout.teacherName}`)
      setRejectPayoutModal({ open: false, payout: null, reason: '', submitting: false, error: null })
      fetchPayouts()
      fetchSummary()
    } catch (err) {
      setRejectPayoutModal(m => ({ ...m, submitting: false, error: err.response?.data?.message || err.message || 'Lỗi khi từ chối rút tiền' }))
    }
  }

  // Fallback summary computation if API summary not loaded yet
  const computedMetrics = useMemo(() => {
    if (summary) {
      return {
        totalRevenue: summary.totalRevenue || 0,
        paidOrdersCount: summary.paidOrdersCount || 0,
        totalOrdersCount: summary.totalOrdersCount || 0,
        pendingPayoutCount: summary.pendingPayoutCount || 0,
        pendingPayoutAmount: summary.pendingPayoutAmount || 0,
        approvedPayoutAmount: summary.approvedPayoutAmount || 0,
        totalMatchedInflow: summary.totalMatchedInflow || 0,
        matchedTxCount: summary.matchedTxCount || 0,
        unmatchedTxCount: summary.unmatchedTxCount || 0
      }
    }
    // Fallback locally
    const paidSum = orders
      .filter(o => o.status === 'PAID')
      .reduce((acc, o) => acc + Number(o.paidAmount || o.amount || 0), 0)
    const paidCount = orders.filter(o => o.status === 'PAID').length
    const pendingPayouts = payouts.filter(p => p.status === 'PENDING')
    const pendingPayoutAmt = pendingPayouts.reduce((acc, p) => acc + Number(p.amount || 0), 0)

    return {
      totalRevenue: paidSum,
      paidOrdersCount: paidCount,
      totalOrdersCount: orderTotalElements || orders.length,
      pendingPayoutCount: pendingPayouts.length,
      pendingPayoutAmount: pendingPayoutAmt,
      approvedPayoutAmount: 0,
      totalMatchedInflow: transactions.filter(t => t.status === 'MATCHED').reduce((acc, t) => acc + Number(t.transferAmount || 0), 0),
      matchedTxCount: transactions.filter(t => t.status === 'MATCHED').length,
      unmatchedTxCount: transactions.filter(t => t.status !== 'MATCHED').length
    }
  }, [summary, orders, orderTotalElements, payouts, transactions])

  // Lắng nghe sự kiện Realtime để tự động cập nhật số liệu tài chính & giao dịch
  useRealtimeEvent('admin-stats', () => {
    fetchSummary()
    if (activeTab === 'orders') fetchOrders()
    else if (activeTab === 'transactions') fetchTransactions()
    else if (activeTab === 'payouts') fetchPayouts()
  })

  useRealtimeEvent('payment', () => {
    fetchSummary()
    if (activeTab === 'orders') fetchOrders()
    else if (activeTab === 'transactions') fetchTransactions()
  })

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 100000,
          padding: '12px 20px',
          borderRadius: 10,
          background: toast.type === 'error' ? 'var(--c-danger)' : 'var(--c-success)',
          color: 'var(--surface)',
          fontWeight: 600,
          fontSize: 14,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header thanh tiêu đề */}
      <AdminPageHeader
        title="Tài chính & Thanh toán"
        subtitle="Quản lý giao dịch ghi danh, đối soát chuyển khoản ngân hàng SePay và duyệt giải ngân tiền rút cho giảng viên"
      />

      {/* ========================================================================= */}
      {/* 4 THẺ CHỈ SỐ TÀI CHÍNH (KPI METRICS) */}
      {/* ========================================================================= */}
      <div className="admin-finance-kpi-grid">
        {/* Card 1: Tổng doanh thu đã thu */}
        <div
          className={`admin-finance-kpi-card success-card ${activeTab === 'orders' ? 'active-tab-card' : ''}`}
          onClick={() => {
            setActiveTab('orders')
            setOrderStatus('PAID')
            setOrderPage(0)
          }}
          title="Bấm để lọc đơn hàng đã thanh toán thành công"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-title">Doanh thu đã thu</span>
            <div className="kpi-icon-wrap emerald">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="kpi-card-value">
            {formatVND(computedMetrics.totalRevenue)}
          </div>
          <div className="kpi-card-subtitle">
            <TrendingUp size={13} style={{ color: 'var(--c-success)' }} />
            <span><strong>{computedMetrics.paidOrdersCount}</strong> đơn hàng đã thanh toán</span>
          </div>
        </div>

        {/* Card 2: Tiền vào SePay ngân hàng */}
        <div
          className={`admin-finance-kpi-card indigo-card ${activeTab === 'transactions' ? 'active-tab-card' : ''}`}
          onClick={() => {
            setActiveTab('transactions')
            setTxStatus('')
            setTxPage(0)
          }}
          title="Bấm để chuyển sang tab đối soát SePay"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-title">Tiền vào SePay (Khớp)</span>
            <div className="kpi-icon-wrap indigo">
              <ArrowRightLeft size={19} />
            </div>
          </div>
          <div className="kpi-card-value">
            {formatVND(computedMetrics.totalMatchedInflow)}
          </div>
          <div className="kpi-card-subtitle">
            <CheckCircle2 size={13} style={{ color: 'var(--accent)' }} />
            <span>{computedMetrics.matchedTxCount} giao dịch khớp • {computedMetrics.unmatchedTxCount} chờ</span>
          </div>
        </div>

        {/* Card 3: Yêu cầu rút tiền chờ giải ngân */}
        <div
          className={`admin-finance-kpi-card ${computedMetrics.pendingPayoutCount > 0 ? 'has-urgent' : 'purple-card'} ${activeTab === 'payouts' ? 'active-tab-card' : ''}`}
          onClick={() => {
            setActiveTab('payouts')
            setPayoutStatus('PENDING')
            setPayoutPage(0)
          }}
          title="Bấm để xem các yêu cầu rút tiền đang chờ giải ngân"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-title">Chờ giải ngân giảng viên</span>
            <div className={`kpi-icon-wrap ${computedMetrics.pendingPayoutCount > 0 ? 'amber' : 'slate'}`}>
              <CreditCard size={19} />
            </div>
          </div>
          <div className="kpi-card-value">
            {formatVND(computedMetrics.pendingPayoutAmount)}
          </div>
          <div className="kpi-card-subtitle">
            <Clock size={13} style={{ color: computedMetrics.pendingPayoutCount > 0 ? 'var(--c-warning)' : 'var(--text-dim)' }} />
            <span>
              {computedMetrics.pendingPayoutCount > 0 ? (
                <strong style={{ color: 'var(--c-warning)' }}>{computedMetrics.pendingPayoutCount} yêu cầu đang chờ chi trả</strong>
              ) : (
                'Tất cả yêu cầu đã được xử lý'
              )}
            </span>
          </div>
        </div>

        {/* Card 4: Tổng đơn hàng đăng ký */}
        <div
          className="admin-finance-kpi-card"
          onClick={() => {
            setActiveTab('orders')
            setOrderStatus('')
            setOrderPage(0)
          }}
          title="Bấm để xem danh sách toàn bộ đơn hàng"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-title">Tổng đơn hàng</span>
            <div className="kpi-icon-wrap slate">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="kpi-card-value">
            {computedMetrics.totalOrdersCount} <span className="unit">đơn</span>
          </div>
          <div className="kpi-card-subtitle">
            <ShieldCheck size={13} style={{ color: 'var(--text-dim)' }} />
            <span>{computedMetrics.paidOrdersCount} đơn thanh toán thành công</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEGMENTED NAVIGATION 3 TABS */}
      {/* ========================================================================= */}
      <div className="admin-finance-tabs-nav" ref={tabsNavRef}>
        <button
          className={`admin-finance-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingBag size={17} />
          <span>Đơn hàng đăng ký</span>
          <span className="tab-badge-pill">
            {orderTotalElements > 0 ? orderTotalElements : computedMetrics.totalOrdersCount}
          </span>
        </button>

        <button
          className={`admin-finance-tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <ArrowRightLeft size={17} />
          <span>Giao dịch ngân hàng (SePay)</span>
          <span className={`tab-badge-pill ${computedMetrics.unmatchedTxCount > 0 ? 'warning-pill' : ''}`}>
            {computedMetrics.unmatchedTxCount > 0 ? `${computedMetrics.unmatchedTxCount} chưa khớp` : 'Tất cả'}
          </span>
        </button>

        <button
          className={`admin-finance-tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('payouts')}
        >
          <CreditCard size={17} />
          <span>Yêu cầu rút tiền giảng viên</span>
          {computedMetrics.pendingPayoutCount > 0 ? (
            <span className="tab-badge-pill warning-pill">
              {computedMetrics.pendingPayoutCount} chờ duyệt
            </span>
          ) : (
            <span className="tab-badge-pill">Duyệt chi</span>
          )}
        </button>

        <button
          className={`admin-finance-tab-btn ${activeTab === 'student-withdrawals' ? 'active' : ''}`}
          onClick={() => setActiveTab('student-withdrawals')}
        >
          <Wallet size={17} />
          <span>Rút tiền ví học viên</span>
        </button>

        <button
          className={`admin-finance-tab-btn ${activeTab === 'rewards-escrow' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewards-escrow')}
        >
          <Award size={17} />
          <span>Học thưởng 10% & Đối soát</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ĐƠN HÀNG (ORDERS) */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div>
          {/* Filter Bar */}
          <div className="admin-filter-bar" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 280, maxWidth: 480 }}>
              <div className="search-input-wrap" style={{ flex: 1 }}>
                <Search size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Tìm theo mã đơn ELN..., học viên, khóa học..."
                  value={orderSearch}
                  onChange={(e) => {
                    setOrderSearch(e.target.value)
                    setOrderPage(0)
                  }}
                />
                {orderSearch && (
                  <button
                    type="button"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => {
                      setOrderSearch('')
                      setOrderPage(0)
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Status Filters & Refresh Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="finance-quick-filters">
                <button
                  type="button"
                  className={`finance-filter-chip ${orderStatus === '' ? 'active' : ''}`}
                  onClick={() => {
                    setOrderStatus('')
                    setOrderPage(0)
                  }}
                >
                  <span>Tất cả</span>
                </button>

                <button
                  type="button"
                  className={`finance-filter-chip ${orderStatus === 'PAID' ? 'active' : ''}`}
                  onClick={() => {
                    setOrderStatus('PAID')
                    setOrderPage(0)
                  }}
                >
                  <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-success)', display: 'inline-block' }} />
                  <span>Đã thanh toán</span>
                </button>

                <button
                  type="button"
                  className={`finance-filter-chip ${orderStatus === 'PENDING' ? 'active' : ''}`}
                  onClick={() => {
                    setOrderStatus('PENDING')
                    setOrderPage(0)
                  }}
                >
                  <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-warning)', display: 'inline-block' }} />
                  <span>Chờ thanh toán</span>
                </button>

                <button
                  type="button"
                  className={`finance-filter-chip ${orderStatus === 'EXPIRED' ? 'active' : ''}`}
                  onClick={() => {
                    setOrderStatus('EXPIRED')
                    setOrderPage(0)
                  }}
                >
                  <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-dim)', display: 'inline-block' }} />
                  <span>Hết hạn 24h</span>
                </button>
              </div>

              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={orderLoading}
                onClick={() => {
                  fetchOrders()
                  fetchSummary()
                }}
                title="Tải lại danh sách đơn hàng"
              >
                <RefreshCw size={14} className={orderLoading ? 'spinner' : ''} style={{ color: 'var(--admin-c-info, #2563eb)' }} />
                <span>{orderLoading ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          {orderLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--surface)', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border)' }}>
              <RefreshCw size={26} className="spinner" style={{ color: 'var(--accent)', margin: '0 auto' }} />
              <p style={{ marginTop: 12, color: 'var(--text-dim)', fontSize: 14 }}>Đang tải danh sách đơn hàng...</p>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border)' }}>
              <ShoppingBag size={40} style={{ color: 'var(--border)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Không tìm thấy đơn hàng nào</div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 4 }}>
                {orderSearch || orderStatus ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc trạng thái' : 'Hệ thống chưa ghi nhận đơn hàng nào'}
              </div>
              {(orderSearch || orderStatus) && (
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  style={{ marginTop: 14 }}
                  onClick={() => {
                    setOrderSearch('')
                    setOrderStatus('')
                    setOrderPage(0)
                  }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Mã đơn</th>
                    <th>Học viên</th>
                    <th>Khóa học</th>
                    <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Số tiền</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Thời gian tạo</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Thanh toán / Hoàn</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const statusClass =
                      order.status === 'PAID' ? 'paid' :
                      order.status === 'PENDING' ? 'pending' :
                      order.status === 'EXPIRED' ? 'expired' :
                      order.status === 'REFUNDED' ? 'refunded' : 'cancelled'

                    const statusLabel =
                      order.status === 'PAID' ? 'Đã thanh toán' :
                      order.status === 'PENDING' ? 'Chờ thanh toán' :
                      order.status === 'EXPIRED' ? 'Hết hạn 24h' :
                      order.status === 'REFUNDED' ? 'Đã hoàn tiền' : 'Đã hủy'

                    return (
                      <tr key={order.id} className="admin-interactive-row">
                        {/* Mã đơn */}
                        <td>
                          <div
                            className="finance-code-pill"
                            onClick={() => copyToClipboard(order.orderCode, 'mã đơn')}
                            title="Bấm để sao chép mã đơn hàng"
                          >
                            <span>{order.orderCode}</span>
                            {copiedText === order.orderCode ? (
                              <Check size={12} style={{ color: 'var(--c-success)' }} />
                            ) : (
                              <Copy size={12} style={{ opacity: 0.6 }} />
                            )}
                          </div>
                        </td>

                        {/* Học viên */}
                        <td>
                          <div className="finance-user-cell">
                            <div className="finance-avatar-circle">
                              {getInitials(order.studentName || order.studentEmail)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                                {order.studentName || 'Chưa đặt tên'}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                {order.studentEmail}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Khóa học */}
                        <td>
                          <div style={{ maxWidth: 240 }}>
                            <div
                              style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', lineHeight: 1.35 }}
                              className="line-clamp-1"
                              title={order.courseTitle}
                            >
                              {order.courseTitle}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                              Giảng viên: <strong>{order.teacherName || '—'}</strong>
                            </div>
                          </div>
                        </td>

                        {/* Số tiền */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <strong style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                            {formatVND(order.paidAmount || order.amount)}
                          </strong>
                        </td>

                        {/* Trạng thái */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`admin-status-pill ${statusClass}`}>
                            <span className="status-dot" />
                            <span>{statusLabel}</span>
                          </span>
                        </td>

                        {/* Thời gian tạo */}
                        <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                          {order.createdAt ? formatVnDateTime(order.createdAt) : '—'}
                        </td>

                        {/* Thời gian thanh toán / hoàn */}
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {order.status === 'PAID' && order.paidAt ? (
                            <span style={{ color: 'var(--c-success)', fontWeight: 600 }}>
                              {formatVnDateTime(order.paidAt)}
                            </span>
                          ) : order.status === 'REFUNDED' && order.refundedAt ? (
                            <div style={{ color: 'var(--c-danger)' }}>
                              <span style={{ fontWeight: 600 }}>{formatVnDateTime(order.refundedAt)}</span>
                              {order.refundRefCode && (
                                <div style={{ fontSize: 12, color: 'var(--c-danger)', fontFamily: 'monospace' }}>
                                  Mã: {order.refundRefCode}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td style={{ textAlign: 'center' }}>
                          {order.status === 'PAID' && (
                            <span
                              style={{ fontSize: 12, color: 'var(--c-success)', background: 'var(--good-soft)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--good-border)' }}
                            >
                              Hoàn tất
                            </span>
                          )}
                          {order.status === 'REFUNDED' && (
                            <span
                              style={{ fontSize: 12, color: 'var(--c-danger)', background: 'var(--bad-soft)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--bad-border)' }}
                              title={order.refundReason || 'Đã hoàn tiền'}
                            >
                              Đã hoàn
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {orderTotalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '0 4px' }}>
              <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>
                Hiển thị <strong>{orders.length}</strong> / <strong>{orderTotalElements}</strong> đơn hàng
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary sm"
                  disabled={orderPage === 0}
                  onClick={() => setOrderPage(p => p - 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <ChevronLeft size={15} />
                  <span>Trước</span>
                </button>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', padding: '0 8px' }}>
                  Trang {orderPage + 1} / {orderTotalPages}
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary sm"
                  disabled={orderPage + 1 >= orderTotalPages}
                  onClick={() => setOrderPage(p => p + 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span>Sau</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GIAO DỊCH NGÂN HÀNG SEPAY (TRANSACTIONS) */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div>
          {/* Header Note */}
          <div style={{
            background: 'var(--good-soft)',
            border: '1px solid var(--good-border)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 14,
            color: 'var(--c-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={18} style={{ color: 'var(--c-success)', flexShrink: 0 }} />
              <div>
                <strong>Webhook SePay tự động:</strong> Mỗi biến động số dư chuyển khoản vào tài khoản ngân hàng được ghi nhận và khớp tự động với mã đơn hàng.
                Nếu học viên chuyển khoản sai cú pháp hoặc sai số tiền, admin có thể dùng tính năng <strong>Khớp thủ công</strong> bên dưới.
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="admin-filter-bar" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div className="finance-quick-filters">
              <button
                type="button"
                className={`finance-filter-chip ${txStatus === '' ? 'active' : ''}`}
                onClick={() => {
                  setTxStatus('')
                  setTxPage(0)
                }}
              >
                <span>Tất cả trạng thái đối soát</span>
              </button>

              <button
                type="button"
                className={`finance-filter-chip ${txStatus === 'UNMATCHED' ? 'active' : ''}`}
                onClick={() => {
                  setTxStatus('UNMATCHED')
                  setTxPage(0)
                }}
              >
                <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-dim)', display: 'inline-block' }} />
                <span>Chưa khớp đơn (UNMATCHED)</span>
              </button>

              <button
                type="button"
                className={`finance-filter-chip ${txStatus === 'AMOUNT_MISMATCH' ? 'active' : ''}`}
                onClick={() => {
                  setTxStatus('AMOUNT_MISMATCH')
                  setTxPage(0)
                }}
              >
                <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-warning)', display: 'inline-block' }} />
                <span>Sai số tiền (AMOUNT_MISMATCH)</span>
              </button>

              <button
                type="button"
                className={`finance-filter-chip ${txStatus === 'MATCHED' ? 'active' : ''}`}
                onClick={() => {
                  setTxStatus('MATCHED')
                  setTxPage(0)
                }}
              >
                <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-success)', display: 'inline-block' }} />
                <span>Đã khớp thành công (MATCHED)</span>
              </button>
            </div>

            <div>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={txLoading}
                onClick={() => {
                  fetchTransactions()
                  fetchSummary()
                }}
                title="Tải lại giao dịch SePay"
              >
                <RefreshCw size={14} className={txLoading ? 'spinner' : ''} style={{ color: 'var(--admin-c-info, #2563eb)' }} />
                <span>{txLoading ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          {txLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--surface)', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border)' }}>
              <RefreshCw size={26} className="spinner" style={{ color: 'var(--accent)', margin: '0 auto' }} />
              <p style={{ marginTop: 12, color: 'var(--text-dim)', fontSize: 14 }}>Đang tải giao dịch ngân hàng SePay...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border)' }}>
              <ArrowRightLeft size={40} style={{ color: 'var(--border)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Không có giao dịch SePay nào</div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 4 }}>
                {txStatus ? 'Thử chọn trạng thái đối soát khác' : 'Chưa có biến động số dư nào được gửi từ SePay'}
              </div>
            </div>
          ) : (
            <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>ID SePay</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Thời gian GD</th>
                    <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Số tiền</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Tài khoản nguồn/nhận</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Nội dung chuyển khoản</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái đối soát</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Khớp Đơn / GV</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Ghi chú kiểm toán</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap', minWidth: 160, paddingRight: 24 }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const statusClass =
                      tx.status === 'MATCHED' ? 'matched' :
                      tx.status === 'AMOUNT_MISMATCH' ? 'mismatch' : 'unmatched'

                    const statusLabel =
                      tx.status === 'MATCHED' ? 'Khớp thành công' :
                      tx.status === 'AMOUNT_MISMATCH' ? 'Sai lệch số tiền' : 'Chưa khớp đơn'

                    return (
                      <tr key={tx.id} className="admin-interactive-row">
                        {/* ID SePay */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div
                            className="finance-code-pill"
                            onClick={() => copyToClipboard(String(tx.sepayId), 'ID SePay')}
                            title="Bấm để sao chép ID SePay"
                          >
                            <span>#{tx.sepayId}</span>
                            <Copy size={11} style={{ opacity: 0.6 }} />
                          </div>
                        </td>

                        {/* Thời gian GD */}
                        <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                          {tx.transactionDate ? formatVnDateTime(tx.transactionDate) : (
                            tx.createdAt ? formatVnDateTime(tx.createdAt) : '—'
                          )}
                        </td>

                        {/* Số tiền */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {tx.transferType === 'out' ? (
                            <div>
                              <strong style={{ color: 'var(--c-danger, #ef4444)', fontSize: 14, whiteSpace: 'nowrap' }}>
                                -{Number(tx.transferAmount || 0).toLocaleString('vi-VN')}&nbsp;đ
                              </strong>
                              <div style={{ fontSize: 11, color: 'var(--c-danger)', opacity: 0.85 }}>Tiền ra (Giải ngân)</div>
                            </div>
                          ) : (
                            <div>
                              <strong style={{ color: 'var(--c-success)', fontSize: 14, whiteSpace: 'nowrap' }}>
                                +{Number(tx.transferAmount || 0).toLocaleString('vi-VN')}&nbsp;đ
                              </strong>
                              <div style={{ fontSize: 11, color: 'var(--c-success)', opacity: 0.85 }}>Tiền vào</div>
                            </div>
                          )}
                        </td>

                        {/* Tài khoản nhận */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div className="finance-bank-pill">
                            <span>{tx.accountNumber || '—'}</span>
                          </div>
                        </td>

                        {/* Nội dung */}
                        <td>
                          <div
                            style={{
                              fontSize: 12,
                              maxWidth: 200,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontFamily: 'monospace',
                              background: 'var(--bg)',
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--surface-2)',
                              color: 'var(--text)'
                            }}
                            title={tx.content || tx.description}
                          >
                            {tx.content || tx.description || '—'}
                          </div>
                        </td>

                        {/* Trạng thái đối soát */}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span className={`admin-status-pill ${statusClass}`}>
                            <span className="status-dot" />
                            <span>{statusLabel}</span>
                          </span>
                        </td>

                        {/* Mã đơn khớp / Yêu cầu rút khớp */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {tx.orderCode ? (
                            <div
                              className="finance-code-pill"
                              onClick={() => copyToClipboard(tx.orderCode, 'mã đơn khớp')}
                              title="Bấm để sao chép mã đơn"
                            >
                              <span>{tx.orderCode}</span>
                              <Copy size={11} style={{ opacity: 0.6 }} />
                            </div>
                          ) : tx.payoutTeacherName ? (
                            <div style={{ fontSize: 12 }}>
                              <span style={{ color: 'var(--c-warning)', fontWeight: 600 }}>Rút GV:</span>{' '}
                              <span>{tx.payoutTeacherName}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Ghi chú */}
                        <td style={{ fontSize: 12, color: 'var(--text-dim)', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={tx.adminNote}>
                          {tx.adminNote || '—'}
                        </td>

                        {/* Thao tác */}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap', minWidth: 160, paddingRight: 24 }}>
                          {tx.status !== 'MATCHED' && (
                            <button
                              type="button"
                              className="admin-action-btn-success"
                              style={{ whiteSpace: 'nowrap' }}
                              onClick={() => setMatchModal({
                                open: true,
                                tx,
                                orderCode: '',
                                note: '',
                                submitting: false,
                                error: null
                              })}
                              title="Khớp thủ công với mã đơn hàng và kích hoạt ghi danh học viên"
                            >
                              <CheckCircle2 size={13} />
                              <span>Khớp thủ công</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {txTotalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '0 4px' }}>
              <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>
                Hiển thị <strong>{transactions.length}</strong> / <strong>{txTotalElements}</strong> giao dịch SePay
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary sm"
                  disabled={txPage === 0}
                  onClick={() => setTxPage(p => p - 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <ChevronLeft size={15} />
                  <span>Trước</span>
                </button>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', padding: '0 8px' }}>
                  Trang {txPage + 1} / {txTotalPages}
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary sm"
                  disabled={txPage + 1 >= txTotalPages}
                  onClick={() => setTxPage(p => p + 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span>Sau</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: YÊU CẦU RÚT TIỀN (PAYOUTS) */}
      {/* ========================================================================= */}
      {activeTab === 'payouts' && (
        <div>
          {/* Header Note */}
          <div style={{
            background: 'var(--warn-soft)',
            border: '1px solid var(--warn-border)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 14,
            color: 'var(--c-warning)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <CreditCard size={18} style={{ color: 'var(--c-warning)', flexShrink: 0 }} />
            <div>
              <strong>Quy trình giải ngân:</strong> Admin sử dụng ngân hàng của đơn vị chuyển khoản trực tiếp vào số tài khoản của giảng viên, sau đó bấm <strong>Duyệt đã chi</strong> và điền mã giao dịch ngân hàng để lưu kiểm toán đối soát.
            </div>
          </div>

          {/* Filter Bar */}
          <div className="admin-filter-bar" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div className="finance-quick-filters">
              <button
                type="button"
                className={`finance-filter-chip ${payoutStatus === '' ? 'active' : ''}`}
                onClick={() => {
                  setPayoutStatus('')
                  setPayoutPage(0)
                }}
              >
                <span>Tất cả yêu cầu rút</span>
              </button>

              <button
                type="button"
                className={`finance-filter-chip ${payoutStatus === 'PENDING' ? 'active' : ''}`}
                onClick={() => {
                  setPayoutStatus('PENDING')
                  setPayoutPage(0)
                }}
              >
                <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-warning)', display: 'inline-block' }} />
                <span>Chờ giải ngân (PENDING)</span>
              </button>

              <button
                type="button"
                className={`finance-filter-chip ${payoutStatus === 'APPROVED' ? 'active' : ''}`}
                onClick={() => {
                  setPayoutStatus('APPROVED')
                  setPayoutPage(0)
                }}
              >
                <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-success)', display: 'inline-block' }} />
                <span>Đã chi tiền (APPROVED)</span>
              </button>

              <button
                type="button"
                className={`finance-filter-chip ${payoutStatus === 'REJECTED' ? 'active' : ''}`}
                onClick={() => {
                  setPayoutStatus('REJECTED')
                  setPayoutPage(0)
                }}
              >
                <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-danger)', display: 'inline-block' }} />
                <span>Từ chối (REJECTED)</span>
              </button>
            </div>

            <div>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={payoutLoading}
                onClick={() => {
                  fetchPayouts()
                  fetchSummary()
                }}
                title="Tải lại danh sách rút tiền"
              >
                <RefreshCw size={14} className={payoutLoading ? 'spinner' : ''} style={{ color: 'var(--admin-c-info, #2563eb)' }} />
                <span>{payoutLoading ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          {payoutLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--surface)', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border)' }}>
              <RefreshCw size={26} className="spinner" style={{ color: 'var(--accent)', margin: '0 auto' }} />
              <p style={{ marginTop: 12, color: 'var(--text-dim)', fontSize: 14 }}>Đang tải danh sách yêu cầu rút tiền...</p>
            </div>
          ) : payouts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border)' }}>
              <CreditCard size={40} style={{ color: 'var(--border)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Không có yêu cầu rút tiền nào</div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 4 }}>
                {payoutStatus ? 'Thử chọn bộ lọc trạng thái khác' : 'Hiện chưa có giảng viên nào gửi yêu cầu rút tiền'}
              </div>
            </div>
          ) : (
            <div className="admin-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Giảng viên</th>
                    <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Số tiền rút</th>
                    <th>Tài khoản nhận tiền</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Mã GD ngân hàng</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Thời gian gửi</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Người xử lý</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap', minWidth: 140 }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((req) => {
                    const statusClass =
                      req.status === 'APPROVED' ? 'approved' :
                      req.status === 'PENDING' ? 'pending' : 'rejected'

                    const statusLabel =
                      req.status === 'APPROVED' ? 'Đã chi tiền' :
                      req.status === 'PENDING' ? 'Chờ giải ngân' : 'Từ chối'

                    return (
                      <tr key={req.id} className="admin-interactive-row">
                        {/* Giảng viên */}
                        <td>
                          <div className="finance-user-cell">
                            <div className="finance-avatar-circle" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-soft)' }}>
                              {getInitials(req.teacherName || req.teacherEmail)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                                {req.teacherName || 'Chưa đặt tên'}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                {req.teacherEmail}
                              </div>
                              {req.teacherCode && (
                                <div style={{ marginTop: 2 }}>
                                  <span
                                    className="finance-code-pill"
                                    onClick={() => copyToClipboard(req.teacherCode, 'mã giảng viên')}
                                    title="Bấm sao chép Mã GV"
                                    style={{ fontSize: 11, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <span>Mã GV: <strong>{req.teacherCode}</strong></span>
                                    <Copy size={10} style={{ opacity: 0.6 }} />
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Số tiền rút */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <strong style={{ fontSize: 14.5, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                            {formatVND(req.amount)}
                          </strong>
                        </td>

                        {/* Tài khoản nhận */}
                        <td>
                          <div>
                            <div
                              className="finance-code-pill"
                              onClick={() => copyToClipboard(req.bankAccountNo, 'số tài khoản')}
                              title="Bấm để sao chép số tài khoản"
                            >
                              <span>{req.bankAccountNo}</span>
                              <Copy size={11} style={{ opacity: 0.6 }} />
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
                              <strong>{req.bankAccountName}</strong> • {req.bankId}
                            </div>
                          </div>
                        </td>

                        {/* Trạng thái */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`admin-status-pill ${statusClass}`}>
                            <span className="status-dot" />
                            <span>{statusLabel}</span>
                          </span>
                          {req.status === 'PENDING' && req.sepayMatched && (
                            <div style={{ marginTop: 4 }}>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--c-success, #16a34a)',
                                background: 'var(--good-soft, #dcfce7)',
                                border: '1px solid var(--good-border, #bbf7d0)',
                                borderRadius: 12,
                                padding: '2px 8px',
                                display: 'inline-block'
                              }}>
                                ⚡ SePay đã chuyển
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Mã GD ngân hàng */}
                        <td>
                          {req.transactionRef ? (
                            <div
                              className="finance-code-pill"
                              onClick={() => copyToClipboard(req.transactionRef, 'mã GD ngân hàng')}
                              title="Bấm để sao chép mã GD"
                            >
                              <span>{req.transactionRef}</span>
                              <Copy size={11} style={{ opacity: 0.6 }} />
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Thời gian gửi */}
                        <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                          {req.createdAt ? formatVnDateTime(req.createdAt) : '—'}
                        </td>

                        {/* Người xử lý */}
                        <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                          {req.processedByName ? (
                            <div>
                              <div style={{ fontWeight: 500, color: 'var(--text)' }}>{req.processedByName}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {formatVnDate(req.processedAt)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td style={{ textAlign: 'center' }}>
                          {req.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="admin-action-btn-success"
                                onClick={() => {
                                  const initRef = req.sepayReferenceCode || (req.sepayTransactionId ? String(req.sepayTransactionId) : '')
                                  setApprovePayoutModal({
                                    open: true,
                                    payout: req,
                                    txRef: initRef,
                                    note: '',
                                    submitting: false,
                                    error: null,
                                    checkingSepay: false,
                                    sepayResult: null
                                  })
                                  handleCheckSepay(initRef, req)
                                }}
                                title="Kiểm tra SePay & Duyệt chi"
                              >
                                <CheckCircle2 size={13} />
                                <span>Duyệt đã chi</span>
                              </button>

                              <button
                                type="button"
                                className="admin-action-btn-danger"
                                onClick={() => setRejectPayoutModal({
                                  open: true,
                                  payout: req,
                                  reason: '',
                                  submitting: false,
                                  error: null
                                })}
                                title="Từ chối yêu cầu rút"
                              >
                                <XCircle size={13} />
                                <span>Từ chối</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {payoutTotalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '0 4px' }}>
              <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>
                Hiển thị <strong>{payouts.length}</strong> / <strong>{payoutTotalElements}</strong> yêu cầu rút tiền
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary sm"
                  disabled={payoutPage === 0}
                  onClick={() => setPayoutPage(p => p - 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <ChevronLeft size={15} />
                  <span>Trước</span>
                </button>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', padding: '0 8px' }}>
                  Trang {payoutPage + 1} / {payoutTotalPages}
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary sm"
                  disabled={payoutPage + 1 >= payoutTotalPages}
                  onClick={() => setPayoutPage(p => p + 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span>Sau</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RÚT TIỀN VÍ HỌC VIÊN (STUDENT WITHDRAWALS) */}
      {/* ========================================================================= */}
      {activeTab === 'student-withdrawals' && (
        <AdminStudentWithdrawalsTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HỌC THƯỞNG 10% & ĐỐI SOÁT (REWARDS & RECONCILIATION) */}
      {/* ========================================================================= */}
      {activeTab === 'rewards-escrow' && (
        <AdminRewardsEscrowTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: KHỚP THỦ CÔNG GIAO DỊCH SEPAY */}
      {/* ========================================================================= */}
      {matchModal.open && (
        <Modal
          open={matchModal.open}
          title={`Khớp thủ công giao dịch SePay #${matchModal.tx?.sepayId}`}
          onClose={() => setMatchModal({ open: false, tx: null, orderCode: '', note: '', submitting: false, error: null })}
          width={520}
        >
          <form onSubmit={handleConfirmMatch}>
            {matchModal.error && (
              <div style={{ padding: '10px 14px', background: 'var(--bad-soft)', border: '1px solid var(--bad-border)', color: 'var(--c-danger)', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
                {matchModal.error}
              </div>
            )}

            {/* Thông tin GD SePay tóm tắt */}
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: 10, fontSize: 14, marginBottom: 16 }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--text-dim)' }}>Số tiền nhận:</span>{' '}
                <strong style={{ color: 'var(--c-success)', fontSize: 16 }}>
                  +{Number(matchModal.tx?.transferAmount).toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--text-dim)' }}>Tài khoản nhận:</span> <strong>{matchModal.tx?.accountNumber}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Nội dung CK:</span>{' '}
                <em style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{matchModal.tx?.content || matchModal.tx?.description}</em>
              </div>
            </div>

            {/* Mã đơn cần khớp */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
                Mã đơn hàng cần khớp (dạng ELN...) <span style={{ color: 'var(--c-danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="search-input-wrap"
                style={{ width: '100%', borderRadius: 8, padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, boxSizing: 'border-box' }}
                placeholder="VD: ELN8X9K2M1P"
                value={matchModal.orderCode}
                onChange={(e) => setMatchModal(m => ({ ...m, orderCode: e.target.value.toUpperCase() }))}
                required
              />
            </div>

            {/* Gợi ý lý do kiểm toán */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>
                Ghi chú kiểm toán nhanh:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  'Học viên quên ghi mã đơn ELN, đã đối chiếu ủy nhiệm chi',
                  'Học viên chuyển khoản sai cú pháp nội dung',
                  'Xác thực giao dịch thành công qua hỗ trợ viên'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`modal-preset-chip ${matchModal.note === preset ? 'active' : ''}`}
                    onClick={() => setMatchModal(m => ({ ...m, note: preset }))}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Ô nhập ghi chú */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
                Ghi chú đối soát kiểm toán <span style={{ color: 'var(--c-danger)' }}>*</span>
              </label>
              <textarea
                className="search-input-wrap"
                style={{ width: '100%', minHeight: 70, borderRadius: 8, padding: 10, boxSizing: 'border-box' }}
                placeholder="Nhập ghi chú đối soát kiểm toán..."
                value={matchModal.note}
                onChange={(e) => setMatchModal(m => ({ ...m, note: e.target.value }))}
                required
              />
            </div>

            {/* Cảnh báo tác động */}
            <div style={{ fontSize: 12, color: 'var(--c-success)', background: 'var(--good-soft)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--good-border)', marginBottom: 16, lineHeight: 1.5 }}>
              <strong>Tác động hệ thống:</strong> Đơn hàng sẽ chuyển sang <strong>PAID</strong>, kích hoạt ngay ghi danh cho học viên và cộng số dư ví cho giảng viên.
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setMatchModal({ open: false, tx: null, orderCode: '', note: '', submitting: false, error: null })}
                disabled={matchModal.submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="admin-action-btn-success"
                disabled={matchModal.submitting}
                style={{ padding: '8px 18px', fontSize: 14 }}
              >
                {matchModal.submitting ? 'Đang khớp đơn...' : 'Xác nhận khớp & Kích hoạt'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DUYỆT CHI RÚT TIỀN & ĐỐI SOÁT SEPAY */}
      {/* ========================================================================= */}
      {approvePayoutModal.open && (
        <Modal
          open={approvePayoutModal.open}
          title="Duyệt chi giải ngân & Đối soát SePay"
          onClose={() => setApprovePayoutModal({ open: false, payout: null, txRef: '', note: '', submitting: false, error: null, checkingSepay: false, sepayResult: null })}
          width={650}
        >
          <form onSubmit={handleConfirmApprovePayout}>
            {approvePayoutModal.error && (
              <div style={{ padding: '10px 14px', background: 'var(--bad-soft)', border: '1px solid var(--bad-border)', color: 'var(--c-danger)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                <strong>Lỗi xác thực:</strong> {approvePayoutModal.error}
              </div>
            )}

            {/* 1. Thông tin giải ngân */}
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: 10, fontSize: 13.5, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Giảng viên:</span>{' '}
                  <strong>{approvePayoutModal.payout?.teacherName}</strong> ({approvePayoutModal.payout?.teacherEmail})
                </div>
                {approvePayoutModal.payout?.teacherCode && (
                  <span
                    className="finance-code-pill"
                    style={{ background: 'var(--surface-hover)', cursor: 'pointer', padding: '3px 8px' }}
                    onClick={() => copyToClipboard(approvePayoutModal.payout.teacherCode, 'mã giảng viên')}
                    title="Bấm sao chép Mã GV"
                  >
                    <span>Mã GV: <strong>{approvePayoutModal.payout.teacherCode}</strong></span>
                    <Copy size={11} style={{ opacity: 0.6 }} />
                  </span>
                )}
              </div>

              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ color: 'var(--text-dim)' }}>Số tiền chi trả:</span>{' '}
                <strong style={{ color: 'var(--accent)', fontSize: 18 }}>
                  {formatVND(approvePayoutModal.payout?.amount)}
                </strong>
              </div>

              <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-dim)' }}>Số tài khoản nhận:</span>{' '}
                <span
                  className="finance-code-pill"
                  onClick={() => copyToClipboard(approvePayoutModal.payout?.bankAccountNo, 'số tài khoản')}
                  title="Bấm để sao chép số tài khoản"
                >
                  <strong style={{ fontFamily: 'monospace' }}>{approvePayoutModal.payout?.bankAccountNo}</strong>{' '}
                  <Copy size={11} style={{ opacity: 0.6 }} />
                </span>
                <span>({approvePayoutModal.payout?.bankId} • {approvePayoutModal.payout?.bankAccountName})</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                <span style={{ color: 'var(--text-dim)' }}>Cú pháp chuyển tiền chuẩn:</span>{' '}
                <span
                  className="finance-code-pill"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => copyToClipboard(`RUT ${approvePayoutModal.payout?.teacherCode || ''} ${approvePayoutModal.payout?.bankAccountNo}`, 'cú pháp chuyển khoản')}
                  title="Bấm để sao chép cú pháp"
                >
                  <span>{`RUT ${approvePayoutModal.payout?.teacherCode || ''} ${approvePayoutModal.payout?.bankAccountNo}`}</span>
                  <Copy size={11} />
                </span>
              </div>
            </div>

            {/* VietQR chuyển khoản nhanh */}
            <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                  📱 Quét VietQR chuyển khoản nhanh
                </div>
                <a
                  href={`https://img.vietqr.io/image/${approvePayoutModal.payout?.bankId}-${approvePayoutModal.payout?.bankAccountNo}-qr_only.png?amount=${approvePayoutModal.payout?.amount}&addInfo=${encodeURIComponent(`RUT ${approvePayoutModal.payout?.teacherCode || ''} ${approvePayoutModal.payout?.bankAccountNo}`)}&accountName=${encodeURIComponent(approvePayoutModal.payout?.bankAccountName || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Bấm để mở mã QR cỡ lớn"
                  style={{ display: 'block', width: '100%', maxWidth: 320 }}
                >
                  <img
                    src={`https://img.vietqr.io/image/${approvePayoutModal.payout?.bankId}-${approvePayoutModal.payout?.bankAccountNo}-qr_only.png?amount=${approvePayoutModal.payout?.amount}&addInfo=${encodeURIComponent(`RUT ${approvePayoutModal.payout?.teacherCode || ''} ${approvePayoutModal.payout?.bankAccountNo}`)}&accountName=${encodeURIComponent(approvePayoutModal.payout?.bankAccountName || '')}`}
                    alt="VietQR Chuyển khoản"
                    style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1', objectFit: 'contain', background: '#fff', borderRadius: 10, padding: 10, border: '1px solid var(--border)', display: 'block' }}
                  />
                </a>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', maxWidth: 420 }}>
                  Quét mã QR từ ứng dụng ngân hàng của bạn. Mã đã điền sẵn số tài khoản, số tiền và nội dung chuyển tiền chứa <strong>Mã GV</strong> để hệ thống đối soát tự động.
                </div>
              </div>
            </div>

            {/* 2. Kiểm tra đối soát SePay */}
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Kiểm tra giao dịch SePay (Luồng tiền ra)</span>
                  <span style={{ color: 'var(--c-danger)' }}>*</span>
                </label>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  disabled={approvePayoutModal.checkingSepay || approvePayoutModal.submitting}
                  onClick={() => handleCheckSepay()}
                >
                  <RefreshCw size={12} className={approvePayoutModal.checkingSepay ? 'spinner' : ''} />
                  <span>{approvePayoutModal.checkingSepay ? 'Đang kiểm tra...' : 'Kiểm tra SePay'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  className="search-input-wrap"
                  style={{ flex: 1, borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, boxSizing: 'border-box' }}
                  placeholder="Mã GD ngân hàng (FT... hoặc mã SePay) hoặc để trống để tự tìm"
                  value={approvePayoutModal.txRef}
                  onChange={(e) => setApprovePayoutModal(m => ({ ...m, txRef: e.target.value }))}
                />
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  style={{ padding: '8px 14px', fontSize: 12.5, whiteSpace: 'nowrap' }}
                  disabled={approvePayoutModal.checkingSepay || approvePayoutModal.submitting}
                  onClick={() => handleCheckSepay()}
                >
                  {approvePayoutModal.checkingSepay ? 'Đang dò...' : 'Dò SePay'}
                </button>
              </div>

              {/* Hộp kết quả kiểm tra SePay */}
              {approvePayoutModal.sepayResult && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  background: approvePayoutModal.sepayResult.matched ? 'var(--good-soft)' : 'var(--warn-soft)',
                  border: `1px solid ${approvePayoutModal.sepayResult.matched ? 'var(--good-border)' : 'var(--warn-border)'}`,
                  color: approvePayoutModal.sepayResult.matched ? 'var(--c-success)' : 'var(--c-warning)'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {approvePayoutModal.sepayResult.matched ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{approvePayoutModal.sepayResult.matched ? 'Giao dịch SePay hợp lệ và đã khớp 100%' : 'Chưa khớp toàn bộ điều kiện SePay'}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{approvePayoutModal.sepayResult.checks?.amountMatched ? '✅' : '❌'}</span>
                      <span>Số tiền: <strong>{formatVND(approvePayoutModal.payout?.amount)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{approvePayoutModal.sepayResult.checks?.teacherCodeMatched ? '✅' : '❌'}</span>
                      <span>Mã GV: <strong>{approvePayoutModal.payout?.teacherCode || 'N/A'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{approvePayoutModal.sepayResult.checks?.bankAccountMatched ? '✅' : '❌'}</span>
                      <span>STK nhận: <strong>{approvePayoutModal.payout?.bankAccountNo}</strong></span>
                    </div>
                  </div>

                  {approvePayoutModal.sepayResult.transaction && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(0,0,0,0.1)', fontSize: 12, color: 'var(--text-dim)' }}>
                      <div>GD SePay: <strong>#{approvePayoutModal.sepayResult.transaction.sepayId}</strong> {approvePayoutModal.sepayResult.transaction.referenceCode && `(Mã ref: ${approvePayoutModal.sepayResult.transaction.referenceCode})`}</div>
                      <div>Nội dung: <em>"{approvePayoutModal.sepayResult.transaction.content || approvePayoutModal.sepayResult.transaction.description}"</em></div>
                    </div>
                  )}

                  {!approvePayoutModal.sepayResult.matched && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--c-danger)', fontWeight: 500 }}>
                      {approvePayoutModal.sepayResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Ghi chú */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
                Ghi chú kiểm toán (tùy chọn)
              </label>
              <input
                type="text"
                className="search-input-wrap"
                style={{ width: '100%', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' }}
                placeholder="VD: Đã đối soát khớp lệnh qua SePay..."
                value={approvePayoutModal.note}
                onChange={(e) => setApprovePayoutModal(m => ({ ...m, note: e.target.value }))}
              />
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setApprovePayoutModal({ open: false, payout: null, txRef: '', note: '', submitting: false, error: null, checkingSepay: false, sepayResult: null })}
                disabled={approvePayoutModal.submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="admin-action-btn-success"
                disabled={approvePayoutModal.submitting || !approvePayoutModal.sepayResult?.matched}
                title={!approvePayoutModal.sepayResult?.matched ? 'Vui lòng kiểm tra SePay thành công trước khi duyệt chi' : 'Xác nhận duyệt chi'}
                style={{
                  padding: '9px 20px',
                  fontSize: 14,
                  opacity: approvePayoutModal.sepayResult?.matched ? 1 : 0.6,
                  cursor: approvePayoutModal.sepayResult?.matched ? 'pointer' : 'not-allowed'
                }}
              >
                {approvePayoutModal.submitting ? 'Đang lưu...' : 'Xác nhận đã chi tiền (Đã kiểm tra SePay)'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TỪ CHỐI RÚT TIỀN */}
      {/* ========================================================================= */}
      {rejectPayoutModal.open && (
        <Modal
          open={rejectPayoutModal.open}
          title="Từ chối yêu cầu rút tiền"
          onClose={() => setRejectPayoutModal({ open: false, payout: null, reason: '', submitting: false, error: null })}
          width={500}
        >
          <form onSubmit={handleConfirmRejectPayout}>
            {rejectPayoutModal.error && (
              <div style={{ padding: '10px 14px', background: 'var(--bad-soft)', border: '1px solid var(--bad-border)', color: 'var(--c-danger)', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
                {rejectPayoutModal.error}
              </div>
            )}

            {/* Thông tin yêu cầu */}
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: 10, fontSize: 14, marginBottom: 16 }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--text-dim)' }}>Giảng viên:</span> <strong>{rejectPayoutModal.payout?.teacherName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Số tiền yêu cầu:</span>{' '}
                <strong style={{ color: 'var(--c-danger)' }}>{formatVND(rejectPayoutModal.payout?.amount)}</strong>
              </div>
            </div>

            {/* Gợi ý lý do từ chối */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>
                Lý do từ chối thường gặp:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  'Số tài khoản và tên chủ tài khoản không khớp',
                  'Thông tin ngân hàng thụ hưởng không hợp lệ',
                  'Số dư tài khoản cần được đối soát lại',
                  'Giảng viên liên hệ ban quản trị để cập nhật STK'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`modal-preset-chip ${rejectPayoutModal.reason === preset ? 'active' : ''}`}
                    onClick={() => setRejectPayoutModal(m => ({ ...m, reason: preset }))}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Ô nhập lý do */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
                Lý do từ chối cụ thể <span style={{ color: 'var(--c-danger)' }}>*</span>
              </label>
              <textarea
                className="search-input-wrap"
                style={{ width: '100%', minHeight: 70, borderRadius: 8, padding: 10, boxSizing: 'border-box' }}
                placeholder="Nhập lý do gửi thông báo cho giảng viên..."
                value={rejectPayoutModal.reason}
                onChange={(e) => setRejectPayoutModal(m => ({ ...m, reason: e.target.value }))}
                required
              />
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setRejectPayoutModal({ open: false, payout: null, reason: '', submitting: false, error: null })}
                disabled={rejectPayoutModal.submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="admin-action-btn-danger"
                disabled={rejectPayoutModal.submitting}
                style={{ padding: '8px 18px', fontSize: 14 }}
              >
                {rejectPayoutModal.submitting ? 'Đang từ chối...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}