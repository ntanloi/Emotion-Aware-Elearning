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
  Clock,
} from 'lucide-react'

/**
 * Tổng quan Quản trị viên (ADMIN) - Chuẩn UX/UI Pro Max
 * Loại bỏ gradient AI tím xanh chói gắt, thiết kế tinh gọn theo ngôn ngữ Bento & Clean SaaS Fintech.
 */

const nf = new Intl.NumberFormat('vi-VN')
const money = (v) => `${nf.format(Math.round(v || 0))} đ`

/** Rút gọn số tiền lớn cho thẻ KPI: 1,2 tỷ / 35,5 triệu */
const moneyShort = (v) => {
  const n = Number(v || 0)
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`
  return nf.format(Math.round(n))
}

/** Thẻ KPI Thống kê chuẩn Modern SaaS */
function StatCard({ icon: Icon, label, value, hint, tone, loading }) {
  return (
    <div
      style={{
        background: 'var(--surface, #ffffff)',
        border: '1px solid var(--border, #e2e8f0)',
        borderRadius: 14,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = tone.borderHover || '#cbd5e1'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 6px 18px -4px rgba(15, 23, 42, 0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-muted, #64748b)',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: tone.bg,
            color: tone.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${tone.border || 'transparent'}`,
          }}
        >
          <Icon size={17} strokeWidth={2} />
        </span>
      </div>

      <div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text-main, #0f172a)',
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {loading ? '…' : value}
        </div>

        {hint ? (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: 'var(--text-muted, #64748b)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: tone.fg,
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 500 }}>{hint}</span>
          </div>
        ) : (
          <div style={{ marginTop: 8, height: 18 }} />
        )}
      </div>
    </div>
  )
}

/** Thanh tỉ lệ phân bổ chuẩn Vercel / Apple Design */
function VisualSegmentBar({ segments, total }) {
  const sum = total || segments.reduce((s, x) => s + x.value, 0)
  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 8,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'var(--surface-2, #f1f5f9)',
          padding: 1,
          gap: 2,
        }}
      >
        {sum > 0 ? (
          segments.map((s) => {
            const pct = (s.value / sum) * 100
            if (pct <= 0) return null
            return (
              <div
                key={s.label}
                title={`${s.label}: ${nf.format(s.value)} (${Math.round(pct)}%)`}
                style={{
                  width: `${pct}%`,
                  background: s.color,
                  borderRadius: 999,
                  transition: 'width 0.4s ease',
                }}
              />
            )
          })
        ) : (
          <div style={{ width: '100%', background: 'var(--surface-3, #e2e8f0)', borderRadius: 999 }} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
        {segments.map((s) => {
          const pct = sum > 0 ? Math.round((s.value / sum) * 100) : 0
          return (
            <div
              key={s.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
                padding: '6px 8px',
                borderRadius: 8,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2, #f8fafc)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    background: s.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 500, color: 'var(--text-main, #334155)' }}>{s.label}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                  {nf.format(s.value)}
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--text-muted, #64748b)',
                    background: 'var(--surface-2, #f1f5f9)',
                    padding: '2px 7px',
                    borderRadius: 6,
                    minWidth: 36,
                    textAlign: 'center',
                  }}
                >
                  {pct}%
                </span>
              </span>
            </div>
          )
        })}
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

  // Các sự vụ cần quản trị xử lý
  const alerts = [
    {
      type: 'payout',
      show: (f.pendingPayoutCount || 0) > 0,
      text: `${f.pendingPayoutCount} yêu cầu rút tiền đang chờ xử lý (${money(f.pendingPayoutAmount)})`,
    },
    {
      type: 'unmatched',
      show: (f.unmatchedTxCount || 0) > 0,
      text: `${f.unmatchedTxCount} giao dịch ngân hàng chưa khớp đơn hàng`,
    },
  ].filter((a) => a.show)

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 48 }}>
      {/* 1. Header tinh gọn, chuyên nghiệp kèm status pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
          paddingTop: 4,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                margin: 0,
                letterSpacing: '-0.025em',
                color: 'var(--text-main, #0f172a)',
              }}
            >
              Tổng quan
            </h1>
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: 'var(--text-muted, #64748b)',
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          >
            {today} · Tổng quan hệ thống quản trị
          </div>
        </div>

        {/* Status Badge: Tín hiệu vận hành hệ thống */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 999,
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            fontSize: 12.5,
            fontWeight: 600,
            color: '#059669',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)',
            }}
          />
          Hệ thống hoạt động ổn định
        </div>
      </div>

      {/* 2. Bộ 5 thẻ KPI cốt lõi */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <StatCard
          icon={Users}
          label="Học viên"
          value={nf.format(s.totalStudents || 0)}
          tone={{
            bg: 'rgba(37, 99, 235, 0.08)',
            fg: '#2563eb',
            border: 'rgba(37, 99, 235, 0.18)',
            borderHover: '#93c5fd',
          }}
          loading={loading}
        />
        <StatCard
          icon={GraduationCap}
          label="Giảng viên"
          value={nf.format(s.totalTeachers || 0)}
          tone={{
            bg: 'rgba(124, 58, 237, 0.08)',
            fg: '#7c3aed',
            border: 'rgba(124, 58, 237, 0.18)',
            borderHover: '#c4b5fd',
          }}
          loading={loading}
        />
        <StatCard
          icon={BookOpen}
          label="Khóa học"
          value={nf.format(s.totalCourses || 0)}
          hint={`${nf.format(s.publishedCourses || 0)} đang xuất bản`}
          tone={{
            bg: 'rgba(14, 165, 233, 0.08)',
            fg: '#0284c7',
            border: 'rgba(14, 165, 233, 0.18)',
            borderHover: '#7dd3fc',
          }}
          loading={loading}
        />
        <StatCard
          icon={ClipboardCheck}
          label="Lượt đăng ký học"
          value={nf.format(s.totalEnrollments || 0)}
          tone={{
            bg: 'rgba(16, 185, 129, 0.08)',
            fg: '#059669',
            border: 'rgba(16, 185, 129, 0.18)',
            borderHover: '#86efac',
          }}
          loading={loading}
        />
        <StatCard
          icon={ShoppingCart}
          label="Đơn hàng"
          value={nf.format(s.totalOrders || 0)}
          hint={finance ? `${nf.format(f.paidOrdersCount || 0)} đã thanh toán` : undefined}
          tone={{
            bg: 'rgba(245, 158, 11, 0.08)',
            fg: '#d97706',
            border: 'rgba(245, 158, 11, 0.18)',
            borderHover: '#fde68a',
          }}
          loading={loading}
        />
      </div>

      {/* 3. Hero Financial Card - Modern Royal Blue Executive Card (Màu xanh thanh lịch, không dùng màu đen) */}
      {finance && (
        <div
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            padding: '24px 28px',
            marginBottom: 16,
            color: '#ffffff',
            boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          {/* Cột trái: Tổng doanh thu */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.16)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <TrendingUp size={22} strokeWidth={2.2} />
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.88)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>Tổng doanh thu đã ghi nhận</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                  }}
                >
                  Đối soát tự động
                </span>
              </div>

              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  marginTop: 6,
                  color: '#ffffff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {money(f.totalRevenue)}
              </div>

              <div
                style={{
                  fontSize: 12.5,
                  color: 'rgba(255, 255, 255, 0.85)',
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                Ước đạt <strong style={{ color: '#ffffff' }}>≈ {moneyShort(f.totalRevenue)}</strong> · Tích hợp cổng thanh toán trực tuyến
              </div>
            </div>
          </div>

          {/* Cột phải: 2 Widget con chi trả + Nút xem chi tiết */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Widget 1: Chờ chi trả */}
            <div
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                minWidth: 150,
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Clock size={13} color="#fef08a" />
                <span>Chờ chi trả</span>
              </div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: '#fef08a',
                  marginTop: 4,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {money(f.pendingPayoutAmount)}
              </div>
            </div>

            {/* Widget 2: Đã chi trả */}
            <div
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                minWidth: 150,
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <CheckCircle2 size={13} color="#86efac" />
                <span>Đã chi trả</span>
              </div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: '#a7f3d0',
                  marginTop: 4,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {money(f.approvedPayoutAmount)}
              </div>
            </div>

            {/* Nút đi tới Quản lý Tài chính */}
            <Link
              to="/admin/finance"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '11px 18px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.28)'
              }}
            >
              <span>Đối soát chi tiết</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      )}

      {/* 4. Khối Cần xử lý (Action Required Banner) */}
      <div
        style={{
          borderRadius: 14,
          padding: '14px 20px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          background: alerts.length > 0 ? 'rgba(245, 158, 11, 0.05)' : 'rgba(16, 185, 129, 0.04)',
          border: alerts.length > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)',
          transition: 'all 0.2s ease',
        }}
      >
        {alerts.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#047857', fontSize: 13.5, fontWeight: 600 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <CheckCircle2 size={18} />
            </span>
            <span>Hệ thống tài chính cân bằng, không có giao dịch hoặc yêu cầu rút tiền nào cần xử lý.</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 280 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={19} />
              </span>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309', marginBottom: 2 }}>
                  Cần xử lý ({alerts.length} việc tài chính tồn đọng)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12.5, color: '#78350f' }}>
                  {alerts.map((a) => (
                    <span key={a.text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#b45309' }} />
                      {a.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Link
              to="/admin/finance"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                background: '#d97706',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: 12.5,
                fontWeight: 600,
                boxShadow: '0 1px 3px rgba(217, 119, 6, 0.25)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#b45309'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#d97706'
              }}
            >
              <span>Mở Tài chính</span>
              <ArrowUpRight size={14} />
            </Link>
          </>
        )}
      </div>

      {/* 5. Phân bổ cơ cấu: Cơ cấu người dùng & Trạng thái khóa học (Bento 2 cột) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Card 1: Cơ cấu người dùng */}
        <div
          style={{
            background: 'var(--surface, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 16,
            padding: 22,
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main, #0f172a)' }}>
              Cơ cấu người dùng
            </div>
            <Users size={18} color="var(--text-muted, #64748b)" />
          </div>

          <div style={{ fontSize: 12.5, color: 'var(--text-muted, #64748b)', marginBottom: 18 }}>
            Tổng cộng <strong>{nf.format(totalUsers)}</strong> tài khoản học viên và giảng viên
          </div>

          <VisualSegmentBar
            segments={[
              { label: 'Học viên', value: s.totalStudents || 0, color: '#2563eb' },
              { label: 'Giảng viên', value: s.totalTeachers || 0, color: '#7c3aed' },
            ]}
          />
        </div>

        {/* Card 2: Trạng thái khóa học */}
        <div
          style={{
            background: 'var(--surface, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 16,
            padding: 22,
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main, #0f172a)' }}>
              Trạng thái khóa học
            </div>
            <BookOpen size={18} color="var(--text-muted, #64748b)" />
          </div>

          <div style={{ fontSize: 12.5, color: 'var(--text-muted, #64748b)', marginBottom: 18 }}>
            Số liệu giám sát phân phối nội dung toàn hệ thống
          </div>

          <VisualSegmentBar
            segments={[
              { label: 'Đang xuất bản', value: s.publishedCourses || 0, color: '#10b981' },
              { label: 'Chờ duyệt', value: s.pendingCourses || 0, color: '#f59e0b' },
              { label: 'Bị từ chối', value: s.rejectedCourses || 0, color: '#ef4444' },
            ]}
          />
        </div>
      </div>

      {/* 6. Lối tắt nhanh (Navigation Bento Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {[
          {
            to: '/admin/users',
            label: 'Quản lý người dùng',
            desc: 'Phân quyền, khóa/mở khóa tài khoản học viên & giảng viên',
            icon: Users,
            tone: { bg: 'rgba(37, 99, 235, 0.08)', fg: '#2563eb' },
          },
          {
            to: '/admin/finance',
            label: 'Tài chính & Thanh toán',
            desc: 'Quản lý đơn hàng, ví học viên, đối soát và phê duyệt rút tiền',
            icon: Wallet,
            tone: { bg: 'rgba(16, 185, 129, 0.08)', fg: '#059669' },
          },
          {
            to: '/admin/audit-logs',
            label: 'Nhật ký hệ thống',
            desc: 'Theo dõi chi tiết lịch sử hành động của quản trị & kiểm duyệt',
            icon: ClipboardList,
            tone: { bg: 'rgba(124, 58, 237, 0.08)', fg: '#7c3aed' },
          },
        ].map(({ to, label, desc, icon: Icon, tone }) => (
          <Link
            key={to}
            to={to}
            style={{
              background: 'var(--surface, #ffffff)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 14,
              padding: 20,
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 18px -4px rgba(15, 23, 42, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.03)'
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 11,
                background: tone.bg,
                color: tone.fg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={20} strokeWidth={2} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  fontSize: 14.5,
                  color: 'var(--text-main, #0f172a)',
                }}
              >
                <span>{label}</span>
                <ArrowUpRight size={16} color="var(--text-muted, #94a3b8)" />
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12.5,
                  color: 'var(--text-muted, #64748b)',
                  lineHeight: 1.45,
                }}
              >
                {desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
