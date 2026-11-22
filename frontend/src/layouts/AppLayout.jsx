import { useState, useEffect } from 'react'
import { Outlet, Link, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@auth/store/authStore.js'
import ChatWidget from '@student/components/ChatWidget.jsx'
import Footer from '@shared/components/Footer.jsx'
import NotificationBell from '@shared/components/NotificationBell.jsx'
import RouteErrorBoundary from '@shared/components/RouteErrorBoundary.jsx'
import { RealtimeProvider } from '@shared/realtime/index.js'
import {
  GraduationCap,
  BookOpen,
  Layers,
  BarChart3,
  User,
  Library,
  LayoutDashboard,
  Shield,
  LogOut,
  Compass,
  FileCheck,
  Wallet,
  Menu,
  X,
} from 'lucide-react'

/**
 * Layout — Navbar ngang cố định ở trên (thay sidebar trái).
 * Hỗ trợ giao diện co giãn Responsive chuẩn cho Tablet & Mobile với Mobile Navigation Drawer.
 * Khi vào "Học" → CourseSidebar sẽ xuất hiện bên trái.
 * Footer hiển thị ở các trang thông thường (ẩn khi đang ở màn hình học bài toàn màn hình).
 */
export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Tự động đóng drawer khi đổi route
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname, location.search])

  // Chặn cuộn nền khi đang mở drawer trên mobile
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileDrawerOpen])

  if (!user) return <Navigate to="/login" replace />

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')
  const isLearnMode =
    (location.pathname.includes('/learn') ||
      location.pathname.startsWith('/content-items/') ||
      location.pathname.includes('/content?') ||
      location.pathname.startsWith('/tests/attempts/')) &&
    !location.pathname.includes('/result')
  const isAdminMode = location.pathname.startsWith('/admin')
  const isTeacherWorkspace =
    user?.role === 'TEACHER' &&
    (location.pathname.startsWith('/dashboard/teacher') ||
      location.pathname.startsWith('/teacher') ||
      (location.pathname === '/profile' && location.search.includes('view=teacher')))
  const isStaff = user.role === 'ADMIN' || user.role === 'MODERATOR'
  const brandLink = isStaff ? '/admin' : user.role === 'TEACHER' && isTeacherWorkspace ? '/dashboard/teacher' : '/'

  const roleLabel = user.role === 'ADMIN' ? 'Quản trị viên' : user.role === 'MODERATOR' ? 'Kiểm duyệt viên' : user.role === 'TEACHER' ? 'Giảng viên' : 'Học viên'

  return (
    <RealtimeProvider>
      <div className="layout">
        {/* Navbar cố định trên cùng */}
        <nav className={`navbar ${user?.role === 'TEACHER' && isTeacherWorkspace ? 'navbar--teacher' : ''}`}>
          <Link to={brandLink} className="navbar-brand">
            <span className="navbar-brand-badge">
              <GraduationCap size={18} strokeWidth={2.2} />
            </span>
            <span className="navbar-brand-text">E-Learning AI</span>
            {user.role === 'TEACHER' && isTeacherWorkspace && (
              <span
                className="badge navbar-teacher-badge"
                style={{
                  background: 'rgba(37, 99, 235, 0.12)',
                  color: 'var(--accent, #2563eb)',
                  fontSize: 11,
                  fontWeight: 700,
                  marginLeft: 4,
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                Giảng viên
              </span>
            )}
          </Link>

          {/* Desktop Navigation Links (Ẩn trên Mobile) */}
          <div className="navbar-nav">
            {/* 1. Menu cho Học viên hoặc Giảng viên khi ở Giao diện Học viên */}
            {(user.role === 'STUDENT' || (user.role === 'TEACHER' && !isTeacherWorkspace)) && (
              <>
                <Link to="/courses" className={isActive('/courses') && !location.pathname.startsWith('/courses/') ? 'active' : ''}>
                  <Compass size={16} />
                  <span>Khám phá</span>
                </Link>
                <Link to="/tests" className={isActive('/tests') ? 'active' : ''}>
                  <FileCheck size={16} />
                  <span>Đề thi TOEIC</span>
                </Link>
                <Link to="/flashcards/review" className={isActive('/flashcards') ? 'active' : ''}>
                  <Layers size={16} />
                  <span>Ôn tập</span>
                </Link>
                <Link to="/reports" className={isActive('/reports') ? 'active' : ''}>
                  <BarChart3 size={16} />
                  <span>Báo cáo</span>
                </Link>
                <Link to="/wallet" className={isActive('/wallet') ? 'active' : ''}>
                  <Wallet size={16} />
                  <span>Ví</span>
                </Link>
              </>
            )}

            {/* 2. Menu cho Giảng viên khi ở Khu vực Giảng viên */}
            {user.role === 'TEACHER' && isTeacherWorkspace && (
              <>
                <Link to="/dashboard/teacher" className={isActive('/dashboard/teacher') ? 'active' : ''}>
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </Link>
                <Link to="/teacher/courses" className={isActive('/teacher/courses') ? 'active' : ''}>
                  <BookOpen size={16} />
                  <span>Khóa học của tôi</span>
                </Link>
                <Link to="/teacher/tests" className={isActive('/teacher/tests') ? 'active' : ''}>
                  <FileCheck size={16} />
                  <span>Quản lý đề thi</span>
                </Link>
                <Link to="/profile?view=teacher" className={location.pathname === '/profile' ? 'active' : ''}>
                  <User size={16} />
                  <span>Hồ sơ</span>
                </Link>
              </>
            )}
          </div>

          {/* Nhóm thao tác bên phải */}
          <div className="navbar-actions">
            {/* Nút chuyển đổi nhanh Không gian Giảng viên <-> Học viên (Desktop) */}
            {user.role === 'TEACHER' && (
              isTeacherWorkspace ? (
                <Link
                  to="/courses"
                  className="btn secondary sm flex-row navbar-switch-role"
                  style={{
                    gap: 6,
                    padding: '6px 14px',
                    fontSize: 13,
                    textDecoration: 'none',
                    borderRadius: 'var(--radius, 8px)',
                    fontWeight: 500,
                  }}
                  title="Quay lại Giao diện Học tập của học viên"
                >
                  <Compass size={15} />
                  <span>Giao diện Học viên</span>
                </Link>
              ) : (
                <Link
                  to="/dashboard/teacher"
                  className="btn sm flex-row navbar-switch-role"
                  style={{
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: 'var(--accent, #2563eb)',
                    border: '1.5px solid rgba(37, 99, 235, 0.3)',
                    fontWeight: 600,
                    gap: 6,
                    padding: '6px 14px',
                    fontSize: 13,
                    textDecoration: 'none',
                    borderRadius: 'var(--radius, 8px)',
                  }}
                  title="Mở Không gian Quản trị & Giảng dạy"
                >
                  <LayoutDashboard size={15} />
                  <span>Khu vực Giảng viên</span>
                </Link>
              )
            )}

            <NotificationBell />

            {/* Thông tin tài khoản người dùng (Desktop) */}
            <Link
              to="/profile"
              className={`navbar-user-link ${isActive('/profile') ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 'var(--radius, 8px)',
                color: 'var(--text, #0f172a)',
                fontWeight: 500,
                fontSize: 'var(--fs-sm, 13.5px)',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-full, 9999px)',
                  background: 'var(--surface-2, #f1f5f9)',
                  border: '1px solid var(--border, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent, #2563eb)',
                  flexShrink: 0,
                }}
              >
                <User size={14} />
              </div>
              <span className="navbar-username">{user.fullName || 'Học viên'}</span>
            </Link>

            {/* Nút đăng xuất (Desktop) */}
            <button className="btn secondary sm flex-row navbar-logout-btn" style={{ gap: 6 }} onClick={logout} title="Đăng xuất">
              <LogOut size={14} />
              <span>Đăng xuất</span>
            </button>

            {/* Nút Hamburger bật Drawer điều hướng trên Mobile */}
            <button
              type="button"
              className="navbar-mobile-toggle"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Mở menu điều hướng di động"
            >
              <Menu size={22} />
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Drawer & Backdrop */}
        <div
          className={`mobile-nav-backdrop ${mobileDrawerOpen ? 'open' : ''}`}
          onClick={() => setMobileDrawerOpen(false)}
        />
        <aside className={`mobile-nav-drawer ${mobileDrawerOpen ? 'open' : ''}`}>
          <div className="mobile-nav-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="navbar-brand-badge" style={{ width: 30, height: 30 }}>
                <GraduationCap size={16} strokeWidth={2.2} />
              </span>
              <strong style={{ fontSize: 16 }}>E-Learning AI</strong>
            </div>
            <button
              type="button"
              className="mobile-nav-close"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Đóng menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile Card trong Drawer */}
          <div className="mobile-nav-user-card">
            <div className="mobile-nav-avatar">
              <User size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.fullName || 'Học viên'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
              <span
                className="badge"
                style={{
                  marginTop: 4,
                  fontSize: 10.5,
                  padding: '2px 8px',
                  background: 'rgba(37, 99, 235, 0.12)',
                  color: 'var(--accent, #2563eb)',
                  borderRadius: 4,
                  fontWeight: 600,
                  display: 'inline-block'
                }}
              >
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Nút chuyển đổi vai trò trong Mobile Drawer (dành cho Giảng viên) */}
          {user.role === 'TEACHER' && (
            <div style={{ padding: '12px 16px 4px 16px' }}>
              {isTeacherWorkspace ? (
                <Link
                  to="/courses"
                  className="btn secondary sm"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    fontWeight: 600,
                    fontSize: 13,
                    borderRadius: 8
                  }}
                  onClick={() => setMobileDrawerOpen(false)}
                >
                  <Compass size={16} />
                  <span>Chuyển sang Giao diện Học viên</span>
                </Link>
              ) : (
                <Link
                  to="/dashboard/teacher"
                  className="btn primary sm"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    fontWeight: 600,
                    fontSize: 13,
                    borderRadius: 8
                  }}
                  onClick={() => setMobileDrawerOpen(false)}
                >
                  <LayoutDashboard size={16} />
                  <span>Vào Khu vực Giảng viên</span>
                </Link>
              )}
            </div>
          )}

          {/* Danh sách liên kết điều hướng trên Mobile */}
          <div className="mobile-nav-links">
            {(user.role === 'STUDENT' || (user.role === 'TEACHER' && !isTeacherWorkspace)) && (
              <>
                <Link to="/courses" className={`mobile-nav-item ${isActive('/courses') && !location.pathname.startsWith('/courses/') ? 'active' : ''}`}>
                  <Compass size={18} />
                  <span>Khám phá khóa học</span>
                </Link>
                <Link to="/tests" className={`mobile-nav-item ${isActive('/tests') ? 'active' : ''}`}>
                  <FileCheck size={18} />
                  <span>Đề thi TOEIC</span>
                </Link>
                <Link to="/flashcards/review" className={`mobile-nav-item ${isActive('/flashcards') ? 'active' : ''}`}>
                  <Layers size={18} />
                  <span>Ôn tập từ vựng</span>
                </Link>
                <Link to="/reports" className={`mobile-nav-item ${isActive('/reports') ? 'active' : ''}`}>
                  <BarChart3 size={18} />
                  <span>Báo cáo học tập</span>
                </Link>
                <Link to="/wallet" className={`mobile-nav-item ${isActive('/wallet') ? 'active' : ''}`}>
                  <Wallet size={18} />
                  <span>Ví học viên</span>
                </Link>
                <Link to="/profile" className={`mobile-nav-item ${isActive('/profile') ? 'active' : ''}`}>
                  <User size={18} />
                  <span>Thông tin cá nhân</span>
                </Link>
              </>
            )}

            {user.role === 'TEACHER' && isTeacherWorkspace && (
              <>
                <Link to="/dashboard/teacher" className={`mobile-nav-item ${isActive('/dashboard/teacher') ? 'active' : ''}`}>
                  <LayoutDashboard size={18} />
                  <span>Bảng điều khiển (Dashboard)</span>
                </Link>
                <Link to="/teacher/courses" className={`mobile-nav-item ${isActive('/teacher/courses') ? 'active' : ''}`}>
                  <BookOpen size={18} />
                  <span>Khóa học của tôi</span>
                </Link>
                <Link to="/teacher/tests" className={`mobile-nav-item ${isActive('/teacher/tests') ? 'active' : ''}`}>
                  <FileCheck size={18} />
                  <span>Quản lý đề thi</span>
                </Link>
                <Link to="/profile?view=teacher" className={`mobile-nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
                  <User size={18} />
                  <span>Hồ sơ giảng viên</span>
                </Link>
              </>
            )}

            {isStaff && (
              <Link to="/admin" className={`mobile-nav-item ${isActive('/admin') ? 'active' : ''}`}>
                <Shield size={18} />
                <span>{user.role === 'ADMIN' ? 'Trang quản trị' : 'Trang kiểm duyệt'}</span>
              </Link>
            )}
          </div>

          {/* Chân Mobile Drawer: Nút Đăng xuất */}
          <div className="mobile-nav-footer">
            <button
              type="button"
              className="btn secondary sm"
              style={{
                width: '100%',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 14px',
                fontSize: 13.5,
                fontWeight: 600,
                color: 'var(--c-danger, #ef4444)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 8
              }}
              onClick={logout}
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        {/* Nội dung trang */}
        <div className="layout-content">
          <main className="main">
            <RouteErrorBoundary resetKey={location.pathname + location.search}>
              <Outlet />
            </RouteErrorBoundary>
          </main>
        </div>

        {/* Global Footer (hiển thị khi không ở trong chế độ học tập chuyên biệt hoặc quản trị) */}
        {!isLearnMode && !isAdminMode && <Footer />}

        {/* Nút chat nổi: Hiển thị cho học viên, giảng viên và quản trị viên ngoài chế độ học tập */}
        {!isLearnMode && <ChatWidget />}
      </div>
    </RealtimeProvider>
  )
}
