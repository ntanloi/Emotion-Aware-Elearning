import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as adminApi from '@admin/api/admin.js'
import AdminPageHeader from '@admin/components/ui/AdminPageHeader.jsx'
import { Users, GraduationCap, BookOpen, ClipboardCheck, ShoppingCart, CreditCard, ClipboardList } from 'lucide-react'

/**
 * Tổng quan dành cho Quản trị viên (ADMIN): chỉ số liệu hệ thống và lối tắt tới các
 * khu vực quản trị. Việc kiểm duyệt nội dung do Kiểm duyệt viên (MODERATOR) đảm nhiệm.
 */
const STAT_CARDS = [
  { key: 'totalStudents', label: 'Học viên', icon: Users },
  { key: 'totalTeachers', label: 'Giảng viên', icon: GraduationCap },
  { key: 'totalCourses', label: 'Khóa học', icon: BookOpen },
  { key: 'totalEnrollments', label: 'Lượt đăng ký học', icon: ClipboardCheck },
  { key: 'totalOrders', label: 'Đơn hàng', icon: ShoppingCart },
]

const SHORTCUTS = [
  { to: '/admin/users', label: 'Quản lý người dùng', desc: 'Khóa, mở khóa tài khoản và tạo kiểm duyệt viên', icon: Users },
  { to: '/admin/finance', label: 'Tài chính & Thanh toán', desc: 'Đơn hàng, ví, rút tiền và đối soát', icon: CreditCard },
  { to: '/admin/audit-logs', label: 'Nhật ký', desc: 'Theo dõi hoạt động của quản trị và kiểm duyệt viên', icon: ClipboardList },
]

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    adminApi
      .getOverviewStats()
      .then((d) => alive && setStats(d))
      .catch(() => alive && setStats(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <AdminPageHeader title="Tổng quan hệ thống" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
        {STAT_CARDS.map(({ key, label, icon: Icon }) => (
          <div key={key} style={{ border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: 18, background: 'var(--surface, #fff)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim, #64748b)', fontSize: 13 }}>
              <Icon size={16} /> {label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>
              {loading ? '…' : (stats?.[key] ?? 0).toLocaleString('vi-VN')}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {SHORTCUTS.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to} style={{ textDecoration: 'none', color: 'inherit', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: 18, background: 'var(--surface, #fff)', display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <Icon size={18} /> {label}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-dim, #64748b)' }}>{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
