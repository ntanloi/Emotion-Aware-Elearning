import React, { useState, useEffect, useCallback } from 'react'
import * as financeApi from '@admin/api/finance.js'
import Modal from '@shared/components/ui/Modal.jsx'
import {
  Wallet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Sliders,
  DollarSign
} from 'lucide-react'

export default function AdminStudentWithdrawalsTab({ showToast }) {
  const [status, setStatus] = useState('PENDING')
  const [page, setPage] = useState(0)
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 })
  const [loading, setLoading] = useState(false)

  // Modal Xử lý chuyển khoản
  const [payModal, setPayModal] = useState({ open: false, item: null, txRef: '', submitting: false, error: null })
  // Modal Từ chối
  const [rejectModal, setRejectModal] = useState({ open: false, item: null, note: '', submitting: false, error: null })
  // Modal Điều chỉnh số dư ví (ADJUST)
  const [adjustModal, setAdjustModal] = useState({ open: false, userId: '', bucket: 'CASH', amount: '', note: '', submitting: false, error: null })

  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true)
      const res = await financeApi.getAdminWithdrawals({ status: status === 'ALL' ? '' : status, page, size: 15 })
      setData(res || { content: [], totalPages: 0, totalElements: 0 })
    } catch (err) {
      console.error('Lỗi tải danh sách rút tiền ví học viên:', err)
    } finally {
      setLoading(false)
    }
  }, [status, page])

  useEffect(() => {
    fetchWithdrawals()
  }, [fetchWithdrawals])

  const handlePay = async (e) => {
    e.preventDefault()
    if (!payModal.txRef.trim()) {
      setPayModal((m) => ({ ...m, error: 'Bắt buộc nhập Mã giao dịch ngân hàng / Ủy nhiệm chi' }))
      return
    }
    try {
      setPayModal((m) => ({ ...m, submitting: true, error: null }))
      await financeApi.payAdminWithdrawal(payModal.item.id, { transactionRef: payModal.txRef.trim() })
      showToast(`Đã xác nhận chuyển tiền cho yêu cầu rút #${payModal.item.id.slice(0, 8)}`)
      setPayModal({ open: false, item: null, txRef: '', submitting: false, error: null })
      fetchWithdrawals()
    } catch (err) {
      setPayModal((m) => ({ ...m, submitting: false, error: err.response?.data?.message || 'Có lỗi xảy ra khi xác nhận chuyển tiền' }))
    }
  }

  const handleReject = async (e) => {
    e.preventDefault()
    if (!rejectModal.note.trim()) {
      setRejectModal((m) => ({ ...m, error: 'Bắt buộc nhập lý do từ chối để học viên nắm rõ' }))
      return
    }
    try {
      setRejectModal((m) => ({ ...m, submitting: true, error: null }))
      await financeApi.rejectAdminWithdrawal(rejectModal.item.id, { note: rejectModal.note.trim() })
      showToast(`Đã từ chối và hoàn tiền về ví cho học viên`)
      setRejectModal({ open: false, item: null, note: '', submitting: false, error: null })
      fetchWithdrawals()
    } catch (err) {
      setRejectModal((m) => ({ ...m, submitting: false, error: err.response?.data?.message || 'Có lỗi xảy ra khi từ chối yêu cầu rút' }))
    }
  }

  const handleAdjust = async (e) => {
    e.preventDefault()
    if (!adjustModal.userId.trim() || !adjustModal.amount || !adjustModal.note.trim()) {
      setAdjustModal((m) => ({ ...m, error: 'Vui lòng điền đầy đủ User ID, Số tiền và Ghi chú bắt buộc' }))
      return
    }
    try {
      setAdjustModal((m) => ({ ...m, submitting: true, error: null }))
      await financeApi.adjustWalletBalance({
        userId: adjustModal.userId.trim(),
        bucket: adjustModal.bucket,
        amount: Number(adjustModal.amount),
        note: adjustModal.note.trim(),
      })
      showToast(`Đã điều chỉnh ${Number(adjustModal.amount).toLocaleString('vi-VN')} đ vào ví ${adjustModal.userId}`)
      setAdjustModal({ open: false, userId: '', bucket: 'CASH', amount: '', note: '', submitting: false, error: null })
      fetchWithdrawals()
    } catch (err) {
      setAdjustModal((m) => ({ ...m, submitting: false, error: err.response?.data?.message || 'Lỗi khi điều chỉnh số dư ví' }))
    }
  }

  const items = data.content || []

  return (
    <div>
      {/* Thanh lọc & Nút điều chỉnh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'PENDING', label: 'Chờ xử lý' },
            { id: 'PAID', label: 'Đã chuyển khoản' },
            { id: 'REJECTED', label: 'Đã từ chối' },
            { id: 'ALL', label: 'Tất cả' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-btn sm ${status === tab.id ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => {
                setStatus(tab.id)
                setPage(0)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="admin-btn admin-btn-secondary flex-row sm"
          style={{ gap: 6 }}
          onClick={() => setAdjustModal({ open: true, userId: '', bucket: 'CASH', amount: '', note: '', submitting: false, error: null })}
        >
          <Sliders size={15} />
          <span>Điều chỉnh số dư ví (ADJUST)</span>
        </button>
      </div>

      {/* Bảng danh sách yêu cầu rút tiền */}
      <div className="admin-table-wrap" style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--border)', borderRadius: 10, overflowX: 'auto' }}>
        {loading ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)' }}>Đang tải danh sách rút tiền...</p>
        ) : items.length === 0 ? (
          <p style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)' }}>Không có yêu cầu rút tiền nào.</p>
        ) : (
          <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover, #f8fafc)', borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)' }}>
                <th style={{ padding: '10px 14px' }}>Thời gian</th>
                <th style={{ padding: '10px 14px' }}>Học viên (User ID)</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Số tiền rút</th>
                <th style={{ padding: '10px 14px' }}>Tài khoản thụ hưởng</th>
                <th style={{ padding: '10px 14px' }}>Trạng thái</th>
                <th style={{ padding: '10px 14px' }}>Mã GD / Lý do</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => {
                const isPending = w.status === 'PENDING'
                const isPaid = w.status === 'PAID'
                const isRejected = w.status === 'REJECTED'
                return (
                  <tr key={w.id} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '12px 14px', color: 'var(--text-dim)', fontSize: 12 }}>
                      {new Date(w.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12 }}>
                      {w.userId}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {Number(w.amount).toLocaleString('vi-VN')} đ
                      <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-dim)' }}>
                        (CASH: {Number(w.fromCash || 0).toLocaleString('vi-VN')} · BONUS: {Number(w.fromBonus || 0).toLocaleString('vi-VN')})
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{w.bankId} · {w.bankAccountNo}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{w.bankAccountName}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {isPending && (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11.5 }}>
                          Chờ xử lý
                        </span>
                      )}
                      {isPaid && (
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11.5 }}>
                          Đã chuyển
                        </span>
                      )}
                      {isRejected && (
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11.5 }}>
                          Từ chối
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-dim)', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {w.transactionRef ? `Mã: ${w.transactionRef}` : w.adminNote ? `Lý do: ${w.adminNote}` : '---'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {isPending && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary sm"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setPayModal({ open: true, item: w, txRef: '', submitting: false, error: null })}
                          >
                            Đã chuyển
                          </button>
                          <button
                            type="button"
                            className="admin-btn sm"
                            style={{ padding: '4px 8px', fontSize: 12, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
                            onClick={() => setRejectModal({ open: true, item: w, note: '', submitting: false, error: null })}
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Phân trang */}
        {data.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Trang {page + 1} / {data.totalPages} ({data.totalElements} yêu cầu)
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary sm"
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: XÁC NHẬN ĐÃ CHUYỂN KHOẢN */}
      {payModal.open && (
        <Modal
          open={payModal.open}
          title="Xác nhận chuyển khoản cho học viên"
          onClose={() => setPayModal({ open: false, item: null, txRef: '', submitting: false, error: null })}
          width={480}
        >
          <form onSubmit={handlePay}>
            {payModal.error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {payModal.error}
              </div>
            )}
            <div style={{ background: 'var(--surface-hover, #f8fafc)', padding: 14, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
              <div>Số tiền cần chuyển: <strong style={{ color: '#059669', fontSize: 16 }}>{Number(payModal.item?.amount || 0).toLocaleString('vi-VN')} đ</strong></div>
              <div>Ngân hàng: <strong>{payModal.item?.bankId}</strong> - STK: <strong>{payModal.item?.bankAccountNo}</strong></div>
              <div>Chủ tài khoản: <strong>{payModal.item?.bankAccountName}</strong></div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Mã tham chiếu ngân hàng / Mã giao dịch <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: FT2603482342934"
                value={payModal.txRef}
                onChange={(e) => setPayModal({ ...payModal, txRef: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPayModal({ open: false, item: null, txRef: '', submitting: false, error: null })}>
                Hủy
              </button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={payModal.submitting}>
                {payModal.submitting ? 'Đang lưu...' : 'Xác nhận đã chuyển'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: TỪ CHỐI RÚT TIỀN */}
      {rejectModal.open && (
        <Modal
          open={rejectModal.open}
          title="Từ chối yêu cầu rút tiền"
          onClose={() => setRejectModal({ open: false, item: null, note: '', submitting: false, error: null })}
          width={480}
        >
          <form onSubmit={handleReject}>
            {rejectModal.error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {rejectModal.error}
              </div>
            )}
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 0 }}>
              Tiền sẽ được tự động hoàn lại đúng vào các ngăn ví (CASH / BONUS) của học viên.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Lý do từ chối gửi cho học viên <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="VD: Số tài khoản và tên chủ tài khoản không khớp..."
                value={rejectModal.note}
                onChange={(e) => setRejectModal({ ...rejectModal, note: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setRejectModal({ open: false, item: null, note: '', submitting: false, error: null })}>
                Hủy
              </button>
              <button type="submit" className="admin-btn" style={{ background: '#dc2626', color: '#fff' }} disabled={rejectModal.submitting}>
                {rejectModal.submitting ? 'Đang xử lý...' : 'Xác nhận từ chối & Hoàn tiền'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: ĐIỀU CHỈNH SỐ DƯ VÍ (ADJUST) */}
      {adjustModal.open && (
        <Modal
          open={adjustModal.open}
          title="Điều chỉnh số dư ví học viên (ADJUST)"
          onClose={() => setAdjustModal({ open: false, userId: '', bucket: 'CASH', amount: '', note: '', submitting: false, error: null })}
          width={480}
        >
          <form onSubmit={handleAdjust}>
            {adjustModal.error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                {adjustModal.error}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                User ID học viên <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nhập UUID học viên..."
                value={adjustModal.userId}
                onChange={(e) => setAdjustModal({ ...adjustModal, userId: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Ngăn ví điều chỉnh:
              </label>
              <select
                value={adjustModal.bucket}
                onChange={(e) => setAdjustModal({ ...adjustModal, bucket: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
              >
                <option value="CASH">Tiền nạp (CASH)</option>
                <option value="BONUS">Tiền thưởng (BONUS)</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Số tiền điều chỉnh (VNĐ) <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="number"
                required
                placeholder="Nhập số dương để cộng, số âm để trừ..."
                value={adjustModal.amount}
                onChange={(e) => setAdjustModal({ ...adjustModal, amount: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginTop: 4 }}>
                Ví dụ: 100000 (cộng 100k) hoặc -50000 (trừ 50k).
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Lý do điều chỉnh (bắt buộc ghi audit log) <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Ghi rõ lý do điều chỉnh..."
                value={adjustModal.note}
                onChange={(e) => setAdjustModal({ ...adjustModal, note: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setAdjustModal({ open: false, userId: '', bucket: 'CASH', amount: '', note: '', submitting: false, error: null })}>
                Hủy
              </button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={adjustModal.submitting}>
                {adjustModal.submitting ? 'Đang lưu...' : 'Lưu điều chỉnh'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
