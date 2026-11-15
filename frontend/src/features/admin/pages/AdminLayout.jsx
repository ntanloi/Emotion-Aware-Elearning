import React from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AdminUIProvider } from '@admin/context/AdminUIContext.jsx'
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
  FileCheck
} from 'lucide-react'

export default function AdminLayout() {
  const location = useLocation()
  const { pendingCourses, pendingReports } = useAdminStats(60000)

  return (
    <AdminUIProvider>
      <div className="admin-layout-wrapper">
        {/* Cột trái: Sidebar điều hướng Admin chuẩn hóa */}
        <aside className="admin-sidebar">
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
              <span>Đánh giá & báo cáo</span>
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
              <span>Tài chính & Thanh toán</span>
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
    </AdminUIProvider>
  )
}
