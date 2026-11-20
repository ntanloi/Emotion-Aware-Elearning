import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAdminStats } from '@admin/hooks/useAdminStats.js'
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
  ShieldAlert
} from 'lucide-react'

export default function AdminLayout() {
  const location = useLocation()
  const { pendingCourses, pendingReports } = useAdminStats(60000)
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
            <span>Menu Quản trị</span>
          </button>
          {(pendingCourses > 0 || pendingReports > 0) && (
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
                {pendingCourses + pendingReports} việc cần duyệt
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
            <span style={{ fontWeight: 700, fontSize: 14 }}>Menu Quản trị viên</span>
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
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Tổng quan</span>
            </NavLink>

            <NavLink
              to="/admin/courses"
              className={({ isActive }) =>
                `admin-nav-link ${isActive || location.pathname.startsWith('/admin/moderation') ? 'active' : ''}`
              }
            >
              <BookOpen size={18} />
              <span>Khóa học</span>
              {pendingCourses > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: 'var(--c-danger, #ef4444)',
                    color: '#ffffff'
                  }}
                >
                  {pendingCourses}
                </span>
              )}
            </NavLink>

            <NavLink
              to="/admin/tests"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <FileCheck size={18} />
              <span>Duyệt đề thi</span>
            </NavLink>

            <NavLink
              to="/admin/users"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Người dùng</span>
            </NavLink>

            <NavLink
              to="/admin/reviews"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <MessageSquare size={18} />
              <span>Đánh giá &amp; báo cáo</span>
              {pendingReports > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: 'var(--c-warning, #f59e0b)',
                    color: '#ffffff'
                  }}
                >
                  {pendingReports}
                </span>
              )}
            </NavLink>

            <NavLink
              to="/admin/finance"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <CreditCard size={18} />
              <span>Tài chính &amp; Thanh toán</span>
            </NavLink>

            <NavLink
              to="/admin/audit-logs"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <ClipboardList size={18} />
              <span>Nhật ký</span>
            </NavLink>

            <NavLink
              to="/admin/lexicon"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <BookA size={18} />
              <span>Từ điển kiểm duyệt</span>
            </NavLink>
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
