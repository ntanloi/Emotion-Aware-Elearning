import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as adminApi from '@admin/api/admin.js'
import * as financeApi from '@admin/api/finance.js'
import { useAuthStore } from '@auth/store/authStore.js'
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  ShoppingCart,
  ClipboardList,
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react'

/**
 * Tổng quan dành cho Quản trị viên (ADMIN): số liệu hệ thống, tài chính và các việc cần xử lý.
 * Việc kiểm duyệt nội dung do Kiểm duyệt viên (MODERATOR) đảm nhiệm nên không xuất hiện ở đây.
 */

const nf = new Intl.NumberFormat('vi-VN')
const money = (v) => `${nf.format(Math.round(v || 0))} đ`

/** Rút gọn số tiền lớn cho thẻ KPI: 1,2 tỷ / 35,5 triệu. */
const moneyShort = (v) => {
  const n = Number(v || 0)
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`
  return nf.format(Math.round(n))
}

const card = {
  background: 'var(--surface, #fff)',
  border: '1px solid var(--c-border, #e2e8f0)',
  borderRadius: 14,
}

function KpiCard({ icon: Icon, label, value, hint, tone, loading }) {
  return (
    <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-dim, #64748b)' }}>{label}</span>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: tone.bg,
            color: tone.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} />
        </span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {loading ? '…' : value}
      </div>
      {hint && <div style={{ fontSize: 12, color: 'var(--text-dim, #64748b)' }}>{hint}</div>}
    </div>
  )
}

/** Thanh tỉ lệ nhiều đoạn kèm chú thích. */
function SplitBar({ segments, total }) {
  const sum = total || segments.reduce((s, x) => s + x.value, 0)
  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--surface-2, #f1f5f9)' }}>
        {sum > 0 &&
          segments.map((s) => (
            <div key={s.label} title={`${s.label}: ${s.value}`} style={{ width: `${(s.value / sum) * 100}%`, background: s.color }} />
          ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
              {s.label}
            </span>
            <span style={{ fontWeight: 700 }}>
              {nf.format(s.value)}
              <span style={{ fontWeight: 500, color: 'var(--text-dim, #64748b)', marginLeft: 6 }}>
                {sum > 0 ? `${Math.round((s.value / sum) * 100)}%` : '0%'}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const fullName = useAuthStore((st) => st.user?.fullName)
  const [stats, setStats] = useState(null)
  const [finance, setFinance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.allSettled([adminApi.getOverviewStats(), financeApi.getAdminFinanceSummary()]).then(([s, f]) => {
      if (!alive) return
      setStats(s.status === 'fulfilled' ? s.value : null)
      setFinance(f.status === 'fulfilled' ? f.value : null)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const today = useMemo(
    () =>
      new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
    []
  )

  const s = stats || {}
  const f = finance || {}
  const totalUsers = (s.totalStudents || 0) + (s.totalTeachers || 0)

  // Các việc dành riêng cho quản trị (tài chính). Việc kiểm duyệt thuộc kiểm duyệt viên.
  const alerts = [
    { show: (f.pendingPayoutCount || 0) > 0, text: `${f.pendingPayoutCount} yêu cầu rút tiền đang chờ xử lý (${money(f.pendingPayoutAmount)})` },
    { show: (f.unmatchedTxCount || 0) > 0, text: `${f.unmatchedTxCount} giao dịch ngân hàng chưa khớp đơn hàng` },
  ].filter((a) => a.show)

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Lời chào */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          Xin chào{fullName ? `, ${fullName}` : ''} 👋
        </h1>
        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-dim, #64748b)', textTransform: 'capitalize' }}>
          {today} · Tổng quan hệ thống
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 14 }}>
        <KpiCard
          icon={Users}
          label="Học viên"
          value={nf.format(s.totalStudents || 0)}
          tone={{ bg: 'rgba(37, 99, 235, 0.12)', fg: '#2563eb' }}
          loading={loading}
        />
        <KpiCard
          icon={GraduationCap}
          label="Giảng viên"
          value={nf.format(s.totalTeachers || 0)}
          tone={{ bg: 'rgba(124, 58, 237, 0.12)', fg: '#7c3aed' }}
          loading={loading}
        />
        <KpiCard
          icon={BookOpen}
          label="Khóa học"
          value={nf.format(s.totalCourses || 0)}
          hint={`${nf.format(s.publishedCourses || 0)} đang xuất bản`}
          tone={{ bg: 'rgba(14, 165, 233, 0.12)', fg: '#0284c7' }}
          loading={loading}
        />
        <KpiCard
          icon={ClipboardCheck}
          label="Lượt đăng ký học"
          value={nf.format(s.totalEnrollments || 0)}
          tone={{ bg: 'rgba(16, 185, 129, 0.12)', fg: '#059669' }}
          loading={loading}
        />
        <KpiCard
          icon={ShoppingCart}
          label="Đơn hàng"
          value={nf.format(s.totalOrders || 0)}
          hint={finance ? `${nf.format(f.paidOrdersCount || 0)} đã thanh toán` : undefined}
          tone={{ bg: 'rgba(245, 158, 11, 0.14)', fg: '#d97706' }}
          loading={loading}
        />
      </div>

      {/* Doanh thu nổi bật */}
      {finance && (
        <div
          style={{
            borderRadius: 14,
            padding: '22px 24px',
            marginBottom: 14,
            color: '#fff',
            background: 'linear-gradient(120deg, #1d4ed8 0%, #4f46e5 55%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} />
            </span>
            <div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>Tổng doanh thu đã ghi nhận</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {money(f.totalRevenue)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>≈ {moneyShort(f.totalRevenue)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Chờ chi trả</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{money(f.pendingPayoutAmount)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Đã chi trả</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{money(f.approvedPayoutAmount)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Cần xử lý */}
      <div
        style={{
          ...card,
          padding: '14px 18px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          borderColor: alerts.length ? 'rgba(245, 158, 11, 0.45)' : 'var(--c-border, #e2e8f0)',
          background: alerts.length ? 'rgba(245, 158, 11, 0.06)' : 'var(--surface, #fff)',
        }}
      >
        {alerts.length === 0 ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#059669', fontWeight: 600, fontSize: 14 }}>
            <CheckCircle2 size={18} /> Không có việc tài chính nào cần xử lý
          </span>
        ) : (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#b45309', fontWeight: 700, fontSize: 14 }}>
              <AlertTriangle size={18} /> Cần xử lý
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, fontSize: 13 }}>
              {alerts.map((a) => (
                <span key={a.text}>• {a.text}</span>
              ))}
            </div>
            <Link to="/admin/finance" className="btn secondary sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Mở Tài chính <ArrowUpRight size={14} />
            </Link>
          </>
        )}
      </div>

      {/* Cơ cấu */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 14 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Cơ cấu người dùng</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim, #64748b)', marginBottom: 16 }}>
            Tổng {nf.format(totalUsers)} tài khoản học viên và giảng viên
          </div>
          <SplitBar
            segments={[
              { label: 'Học viên', value: s.totalStudents || 0, color: '#2563eb' },
              { label: 'Giảng viên', value: s.totalTeachers || 0, color: '#7c3aed' },
            ]}
          />
        </div>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Trạng thái khóa học</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim, #64748b)', marginBottom: 16 }}>
            Số liệu tham khảo, việc duyệt do kiểm duyệt viên phụ trách
          </div>
          <SplitBar
            segments={[
              { label: 'Đang xuất bản', value: s.publishedCourses || 0, color: '#10b981' },
              { label: 'Chờ duyệt', value: s.pendingCourses || 0, color: '#f59e0b' },
              { label: 'Bị từ chối', value: s.rejectedCourses || 0, color: '#ef4444' },
            ]}
          />
        </div>
      </div>

      {/* Lối tắt */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {[
          { to: '/admin/users', label: 'Quản lý người dùng', desc: 'Khóa, mở khóa tài khoản và tạo kiểm duyệt viên', icon: Users },
          { to: '/admin/finance', label: 'Tài chính & Thanh toán', desc: 'Đơn hàng, ví, rút tiền và đối soát', icon: Wallet },
          { to: '/admin/audit-logs', label: 'Nhật ký', desc: 'Theo dõi hoạt động của quản trị và kiểm duyệt viên', icon: ClipboardList },
        ].map(({ to, label, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            style={{ ...card, textDecoration: 'none', color: 'inherit', padding: 18, display: 'flex', gap: 14, alignItems: 'flex-start', transition: 'box-shadow .15s, transform .15s' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(15, 23, 42, 0.08)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft, #eef2ff)', color: 'var(--accent, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={19} />
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
                {label} <ArrowUpRight size={15} style={{ opacity: 0.5 }} />
              </span>
              <span style={{ display: 'block', marginTop: 4, fontSize: 13, color: 'var(--text-dim, #64748b)' }}>{desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
