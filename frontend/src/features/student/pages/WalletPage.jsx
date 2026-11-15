import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  QrCode,
  Clock,
  Lock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { getWallet, getWalletEntries, requestWithdrawal, getWithdrawals } from '@student/api/wallet.js'

const ENTRY_TYPE_LABELS = {
  TOPUP: 'Nạp tiền vào ví',
  PURCHASE: 'Thanh toán khóa học',
  REWARD: 'Thưởng học tập (10%)',
  WITHDRAW: 'Rút tiền về ngân hàng',
  WITHDRAW_REVERSE: 'Hoàn tiền rút bị từ chối',
  ADJUST: 'Điều chỉnh số dư',
}

const VIETNAM_BANKS = [
  { id: 'MB', name: 'MBBank (Ngân hàng Quân Đội)' },
  { id: 'VCB', name: 'Vietcombank' },
  { id: 'TCB', name: 'Techcombank' },
  { id: 'ACB', name: 'ACB' },
  { id: 'VPB', name: 'VPBank' },
  { id: 'BIDV', name: 'BIDV' },
  { id: 'CTG', name: 'VietinBank' },
  { id: 'TPB', name: 'TPBank' },
  { id: 'STB', name: 'Sacombank' },
  { id: 'VIB', name: 'VIB' },
]

export default function WalletPage() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialAmount = searchParams.get('amount') || ''

  const [topupAmount, setTopupAmount] = useState(initialAmount)
  const [page, setPage] = useState(0)
  const [copiedField, setCopiedField] = useState(null)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bankId: 'MB',
    bankAccountNo: '',
    bankAccountName: '',
  })
  const [withdrawError, setWithdrawError] = useState(null)
  const [withdrawSuccess, setWithdrawSuccess] = useState(null)

  // 1. Tự làm mới ví mỗi 5 giây
  const { data: wallet, isFetching: fetchingWallet } = useQuery({
    queryKey: ['wallet', topupAmount],
    queryFn: () => getWallet(topupAmount ? Number(topupAmount) : undefined),
    refetchInterval: 5000,
  })

  // 2. Lịch sử giao dịch sổ cái
  const { data: entriesData, isLoading: loadingEntries } = useQuery({
    queryKey: ['walletEntries', page],
    queryFn: () => getWalletEntries(page, 15),
  })

  // 3. Danh sách yêu cầu rút tiền
  const { data: withdrawals = [] } = useQuery({
    queryKey: ['myWithdrawals'],
    queryFn: () => getWithdrawals(),
  })

  const withdrawMutation = useMutation({
    mutationFn: requestWithdrawal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] })
      qc.invalidateQueries({ queryKey: ['walletEntries'] })
      qc.invalidateQueries({ queryKey: ['myWithdrawals'] })
      setShowWithdrawModal(false)
      setWithdrawSuccess('Yêu cầu rút tiền đã được gửi và đang chờ ban quản trị xử lý trong 24 giờ.')
      setWithdrawForm({ amount: '', bankId: 'MB', bankAccountNo: '', bankAccountName: '' })
      setWithdrawError(null)
    },
    onError: (err) => {
      setWithdrawError(err.response?.data?.message || err.response?.data?.error || 'Có lỗi xảy ra khi gửi yêu cầu rút tiền.')
    },
  })

  const copyToClipboard = (text, field) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const entries = entriesData?.content || []
  const totalPages = entriesData?.totalPages || 0

  const cash = Number(wallet?.cashBalance || 0)
  const bonus = Number(wallet?.bonusBalance || 0)
  const total = Number(wallet?.total || 0)
  const withdrawable = Number(wallet?.withdrawableAmount || 0)
  const lockedCash = Number(wallet?.lockedCashAmount || 0)

  return (
    <div className="container" style={{ maxWidth: 1080, padding: '24px 16px', margin: '0 auto' }}>
      {/* Tiêu đề & badge cập nhật */}
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wallet size={26} color="var(--accent, #2563eb)" />
            <span>Ví học viên</span>
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-dim, #64748b)', fontSize: 14 }}>
            Quản lý số dư, nạp tiền tự động qua ngân hàng và nhận thưởng học tập 10%.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim, #64748b)' }}>
          <RefreshCw size={14} className={fetchingWallet ? 'spin' : ''} />
          <span>Tự động làm mới mỗi 5s</span>
        </div>
      </div>

      {withdrawSuccess && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: 13.5,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{withdrawSuccess}</span>
        </div>
      )}

      {/* KHỐI SỐ DƯ & THẺ TỔNG QUAN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Card 1: Tổng số dư & hai ngăn */}
        <div className="card" style={{ padding: 20, borderRadius: 12, background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)' }}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim, #64748b)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Tổng số dư ví
            </span>
            <span style={{ fontSize: 12, background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent, #2563eb)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
              Sẵn sàng thanh toán
            </span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text, #0f172a)', marginBottom: 16 }}>
            {total.toLocaleString('vi-VN')} <span style={{ fontSize: 18, fontWeight: 600 }}>đ</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-dim, #64748b)', marginBottom: 2 }}>Tiền nạp (CASH)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>
                {cash.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-dim, #64748b)', marginBottom: 2 }}>Tiền thưởng (BONUS)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent, #2563eb)' }}>
                {bonus.toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim, #64748b)', marginTop: 10, lineHeight: 1.4 }}>
            * Tiền thưởng được hoàn khi xem đủ 70% video hợp lệ, dùng để mua khóa học khác và không có hạn sử dụng.
          </div>
        </div>

        {/* Card 2: Quy định rút tiền theo quyết định D3 */}
        <div className="card" style={{ padding: 20, borderRadius: 12, background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)' }}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim, #64748b)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Số tiền có thể rút
            </span>
            <button
              type="button"
              className="btn primary sm"
              disabled={withdrawable < 50000}
              onClick={() => setShowWithdrawModal(true)}
              style={{ padding: '4px 12px', fontSize: 12.5, borderRadius: 6 }}
            >
              Rút tiền
            </button>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: withdrawable > 0 ? '#059669' : 'var(--text-dim)', marginBottom: 12 }}>
            {withdrawable.toLocaleString('vi-VN')} <span style={{ fontSize: 18, fontWeight: 600 }}>đ</span>
          </div>

          <div style={{ fontSize: 12.5, color: 'var(--text, #0f172a)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lockedCash > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', background: '#fef3c7', padding: '6px 10px', borderRadius: 6 }}>
                <Lock size={14} />
                <span>
                  Đang giữ: <strong>{lockedCash.toLocaleString('vi-VN')} đ</strong>
                  {wallet?.nextUnlockAt && ` (mở khóa từ ${new Date(wallet.nextUnlockAt).toLocaleDateString('vi-VN')})`}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669' }}>
                <ShieldCheck size={14} />
                <span>Không có khoản tiền nạp nào đang bị giữ.</span>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4, marginTop: 4 }}>
              Quy định rút tiền (D3): Tiền thưởng và tiền tự nạp đã nằm trong ví từ 1 tháng trở lên được rút tự do về tài khoản ngân hàng chính chủ.
            </div>
          </div>
        </div>
      </div>

      {/* KHỐI NẠP TIỀN TỰ ĐỘNG QUA VIETQR */}
      <div className="card" style={{ padding: 24, borderRadius: 12, marginBottom: 28, background: 'var(--surface, #ffffff)', border: '1.5px solid var(--border, #e2e8f0)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <QrCode size={20} color="var(--accent, #2563eb)" />
          <span>Nạp tiền vào ví qua chuyển khoản VietQR</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
          {/* Cột trái: Mã QR động */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1.5px solid var(--border, #cbd5e1)',
                background: '#ffffff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                display: 'inline-block',
                marginBottom: 10,
              }}
            >
              {wallet?.qrUrl ? (
                <img
                  src={wallet.qrUrl}
                  alt="VietQR nạp ví"
                  style={{ width: 220, height: 220, objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                  Đang tải mã QR...
                </div>
              )}
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
              Quét mã bằng ứng dụng ngân hàng bất kỳ để chuyển tiền nhanh 24/7.
            </span>
          </div>

          {/* Cột phải: Thông tin tài khoản & Mã nạp bắt buộc */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Chọn nhanh số tiền nạp */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #0f172a)', display: 'block', marginBottom: 6 }}>
                Số tiền muốn nạp (để tạo QR chính xác số tiền):
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {['100000', '200000', '500000', '1000000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`btn sm ${topupAmount === amt ? 'primary' : 'secondary'}`}
                    style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6 }}
                    onClick={() => setTopupAmount(amt)}
                  >
                    {Number(amt).toLocaleString('vi-VN')} đ
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="10000"
                step="10000"
                placeholder="Nhập số tiền khác (VNĐ)..."
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14 }}
              />
            </div>

            {/* Chi tiết ngân hàng */}
            <div style={{ background: 'var(--surface-hover, #f8fafc)', padding: 14, borderRadius: 10, border: '1px solid var(--border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="flex-between">
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Ngân hàng:</span>
                <strong style={{ fontSize: 14 }}>{wallet?.bankName || wallet?.bankId || 'MBBank'}</strong>
              </div>

              <div className="flex-between">
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Số tài khoản:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ fontSize: 15, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                    {wallet?.accountNumber || '---'}
                  </strong>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--accent, #2563eb)' }}
                    onClick={() => copyToClipboard(wallet?.accountNumber, 'acc')}
                    title="Sao chép số tài khoản"
                  >
                    {copiedField === 'acc' ? <Check size={16} color="#059669" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex-between">
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chủ tài khoản:</span>
                <strong style={{ fontSize: 14 }}>{wallet?.accountName || '---'}</strong>
              </div>

              {/* NỘI DUNG CHUYỂN KHOẢN (MÃ NAP) */}
              <div
                style={{
                  borderTop: '1px dashed var(--border, #cbd5e1)',
                  paddingTop: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
                    Nội dung chuyển khoản (bắt buộc):
                  </span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', fontFamily: 'monospace', letterSpacing: 1 }}>
                    {wallet?.topupCode || '---'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn primary sm flex-row"
                  style={{ gap: 4, padding: '6px 12px', fontSize: 12, borderRadius: 6 }}
                  onClick={() => copyToClipboard(wallet?.topupCode, 'topupCode')}
                >
                  {copiedField === 'topupCode' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedField === 'topupCode' ? 'Đã sao chép' : 'Sao chép mã'}</span>
                </button>
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#b45309', background: '#fef3c7', padding: '8px 12px', borderRadius: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>
                Hệ thống tự động cộng tiền vào ví trong vòng 1-2 phút ngay khi nhận được giao dịch đúng nội dung.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DANH SÁCH YÊU CẦU RÚT TIỀN (NẾU CÓ) */}
      {withdrawals.length > 0 && (
        <div className="card" style={{ padding: 20, borderRadius: 12, marginBottom: 28, background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Yêu cầu rút tiền gần đây</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border, #e2e8f0)', textAlign: 'left', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '8px 12px' }}>Thời gian</th>
                  <th style={{ padding: '8px 12px' }}>Số tiền</th>
                  <th style={{ padding: '8px 12px' }}>Tài khoản nhận</th>
                  <th style={{ padding: '8px 12px' }}>Trạng thái</th>
                  <th style={{ padding: '8px 12px' }}>Ghi chú / Mã giao dịch</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => {
                  const isPending = w.status === 'PENDING'
                  const isPaid = w.status === 'PAID'
                  const isRejected = w.status === 'REJECTED'
                  return (
                    <tr key={w.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        {new Date(w.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                        {Number(w.amount).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {w.bankId} · {w.bankAccountNo} ({w.bankAccountName})
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {isPending && (
                          <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11.5 }}>
                            Chờ xử lý
                          </span>
                        )}
                        {isPaid && (
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11.5 }}>
                            Đã chuyển khoản
                          </span>
                        )}
                        {isRejected && (
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11.5 }}>
                            Bị từ chối
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: 12 }}>
                        {w.transactionRef ? `Mã GD: ${w.transactionRef}` : w.adminNote ? `Lý do: ${w.adminNote}` : '---'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BẢNG LỊCH SỬ GIAO DỊCH SỔ CÁI */}
      <div className="card" style={{ padding: 20, borderRadius: 12, background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Lịch sử biến động số dư ví</h3>

        {loadingEntries ? (
          <p style={{ color: 'var(--text-dim)', padding: 12 }}>Đang tải lịch sử giao dịch...</p>
        ) : entries.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', padding: 12, textAlign: 'center' }}>Chưa có giao dịch nào.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border, #e2e8f0)', textAlign: 'left', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '8px 12px' }}>Thời gian</th>
                  <th style={{ padding: '8px 12px' }}>Loại giao dịch</th>
                  <th style={{ padding: '8px 12px' }}>Ngăn ví</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Biến động</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Số dư sau GD</th>
                  <th style={{ padding: '8px 12px' }}>Mô tả</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const amt = Number(entry.amount || 0)
                  const isPositive = amt > 0
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: 12 }}>
                        {new Date(entry.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                        {ENTRY_TYPE_LABELS[entry.type] || entry.type}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 600,
                            background: entry.bucket === 'BONUS' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: entry.bucket === 'BONUS' ? 'var(--accent, #2563eb)' : '#059669',
                          }}
                        >
                          {entry.bucket === 'BONUS' ? 'Tiền thưởng' : 'Tiền nạp'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: isPositive ? '#059669' : '#dc2626' }}>
                        {isPositive ? `+${amt.toLocaleString('vi-VN')}` : amt.toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-dim)' }}>
                        {entry.bucket === 'BONUS'
                          ? `${Number(entry.bonusAfter || 0).toLocaleString('vi-VN')} đ`
                          : `${Number(entry.cashAfter || 0).toLocaleString('vi-VN')} đ`}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: 12.5 }}>
                        {entry.description || '---'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="flex-between" style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border, #e2e8f0)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                  Trang {page + 1} / {totalPages}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn secondary sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn secondary sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL YÊU CẦU RÚT TIỀN */}
      {showWithdrawModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowWithdrawModal(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 480,
              padding: 24,
              borderRadius: 14,
              background: 'var(--surface, #ffffff)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-between" style={{ marginBottom: 14, borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowUpRight size={18} color="var(--accent, #2563eb)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Rút tiền về tài khoản ngân hàng</h3>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}
                onClick={() => setShowWithdrawModal(false)}
              >
                <XCircle size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 14, background: 'var(--surface-hover, #f8fafc)', padding: 12, borderRadius: 8, fontSize: 13 }}>
              Số tiền khả dụng có thể rút: <strong style={{ color: '#059669' }}>{withdrawable.toLocaleString('vi-VN')} đ</strong>
            </div>

            {withdrawError && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 12.5, marginBottom: 14 }}>
                {withdrawError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                withdrawMutation.mutate({
                  amount: Number(withdrawForm.amount),
                  bankId: withdrawForm.bankId,
                  bankAccountNo: withdrawForm.bankAccountNo.trim(),
                  bankAccountName: withdrawForm.bankAccountName.trim().toUpperCase(),
                })
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Số tiền muốn rút (tối thiểu 50.000 đ):
                </label>
                <input
                  type="number"
                  required
                  min="50000"
                  max={withdrawable}
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  placeholder="VD: 200000"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Ngân hàng nhận:
                </label>
                <select
                  value={withdrawForm.bankId}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, bankId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14 }}
                >
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Số tài khoản ngân hàng:
                </label>
                <input
                  type="text"
                  required
                  value={withdrawForm.bankAccountNo}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, bankAccountNo: e.target.value })}
                  placeholder="Nhập số tài khoản chính chủ"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Tên chủ tài khoản (in hoa không dấu):
                </label>
                <input
                  type="text"
                  required
                  value={withdrawForm.bankAccountName}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, bankAccountName: e.target.value.toUpperCase() })}
                  placeholder="VD: NGUYEN VAN A"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border, #cbd5e1)', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={withdrawMutation.isPending}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={withdrawMutation.isPending || !withdrawForm.amount || Number(withdrawForm.amount) > withdrawable}
                >
                  {withdrawMutation.isPending ? 'Đang gửi...' : 'Xác nhận rút tiền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
