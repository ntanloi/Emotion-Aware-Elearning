import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAdminStats } from '@admin/hooks/useAdminStats.js'
import { useAuthStore } from '@auth/store/authStore.js'
import './admin-theme.css'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  MessageSquare,
  CreditCard,
  BookA,
  FileCheck,
  Menu,
  X,
  ShieldAlert,
  UserCheck
} from 'lucide-react'

/**
 * Menu điều hướng theo nhóm. Mỗi mục có `roles`: ADMIN chỉ thấy nhóm quản trị hệ thống,
 * MODERATOR chỉ thấy nhóm kiểm duyệt; Tổng quan và Nhật ký dùng chung.
 */
const NAV_GROUPS = [
  {
    key: 'overview',
    label: null,
    items: [{ to: '/admin', end: true, icon: LayoutDashboard, label: 'Tổng quan' }]
  },
  {
    key: 'moderation',
    label: 'Kiểm duyệt',
    roles: ['MODERATOR'],
    items: [
      { to: '/admin/courses', alsoActive: '/admin/moderation', icon: BookOpen, label: 'Khóa học', badge: 'courses', badgeColor: 'var(--c-danger, #ef4444)' },
      { to: '/admin/tests', icon: FileCheck, label: 'Duyệt đề thi' },
      { to: '/admin/reviews', icon: MessageSquare, label: 'Đánh giá & báo cáo', badge: 'reports', badgeColor: 'var(--c-warning, #f59e0b)' },
      { to: '/admin/teachers', icon: UserCheck, label: 'Duyệt giảng viên', badge: 'teachers', badgeColor: 'var(--c-warning, #f59e0b)' },
      { to: '/admin/lexicon', icon: BookA, label: 'Từ điển kiểm duyệt' }
    ]
  },
  {
    key: 'system',
    label: 'Quản trị hệ thống',
    roles: ['ADMIN'],
    items: [
      { to: '/admin/users', icon: Users, label: 'Người dùng' },
      { to: '/admin/finance', icon: CreditCard, label: 'Tài chính & Thanh toán' }
    ]
  },
  {
    key: 'log',
    label: null,
    items: [{ to: '/admin/audit-logs', icon: ClipboardList, label: 'Nhật ký' }]
  }
]

export default function AdminLayout() {
  const location = useLocation()
  const { pendingCourses, pendingReports, pendingTeachers } = useAdminStats(60000)
  const role = useAuthStore((st) => st.user?.role)
  const isAdmin = role === 'ADMIN'
  const badges = isAdmin
    ? {}
    : { courses: pendingCourses, reports: pendingReports, teachers: pendingTeachers }
  const pendingTotal = isAdmin ? 0 : pendingCourses + pendingReports + pendingTeachers
  const menuTitle = isAdmin ? 'Menu Quản trị viên' : 'Menu Kiểm duyệt viên'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Tự động đóng sidebar khi chuyển trang
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Khóa cuộn màn hình khi sidebar mở trên màn hình nhỏ
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <>
      <div className="admin-layout-wrapper">
        {/* Thanh công cụ mở menu Admin trên Tablet & Mobile */}
        <div className="admin-mobile-topbar">
          <button
            type="button"
            className="admin-mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu quản trị"
          >
            <Menu size={18} />
            <span>{isAdmin ? 'Menu Quản trị' : 'Menu Kiểm duyệt'}</span>
          </button>
          {pendingTotal > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                className="badge"
                style={{
                  background: 'var(--c-danger, #ef4444)',
                  color: '#ffffff',
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 12
                }}
              >
                {pendingTotal} việc cần duyệt
              </span>
            </div>
          )}
        </div>

        {/* Lớp nền mờ khi mở Sidebar trên Mobile/Tablet */}
        <div
          className={`admin-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Cột trái: Sidebar điều hướng Admin chuẩn hóa (hỗ trợ trượt off-canvas trên Mobile) */}
        <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="admin-sidebar-header-mobile">
            <span style={{ fontWeight: 700, fontSize: 14 }}>{menuTitle}</span>
            <button
              type="button"
              className="admin-sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Đóng menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="admin-sidebar-nav">
            {NAV_GROUPS.map((group) => {
              if (group.roles && !group.roles.includes(role)) return null
              const items = group.items
              return (
                <React.Fragment key={group.key}>
                  {group.label && (
                    <div className="admin-nav-group-label">{group.label}</div>
                  )}
                  {items.map((it) => {
                    const Icon = it.icon
                    const badge = it.badge ? badges[it.badge] : 0
                    return (
                      <NavLink
                        key={it.to}
                        to={it.to}
                        end={it.end}
                        className={({ isActive }) =>
                          `admin-nav-link ${isActive || (it.alsoActive && location.pathname.startsWith(it.alsoActive)) ? 'active' : ''}`
                        }
                      >
                        <Icon size={18} />
                        <span>{it.label}</span>
                        {badge > 0 && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 10,
                              background: it.badgeColor,
                              color: '#ffffff'
                            }}
                          >
                            {badge}
                          </span>
                        )}
                      </NavLink>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </nav>
        </aside>

        {/* Cột phải: Khu vực hiển thị nội dung chính với tiêu đề chuẩn hóa từng trang */}
        <main className="admin-main-viewport">
          <div className="admin-page-body">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}
