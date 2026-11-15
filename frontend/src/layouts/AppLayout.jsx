import { Outlet, Link, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@auth/store/authStore.js'
import ChatWidget from '@student/components/ChatWidget.jsx'
import Footer from '@shared/components/Footer.jsx'
import NotificationBell from '@shared/components/NotificationBell.jsx'
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
} from 'lucide-react'

/**
 * Layout — Navbar ngang cố định ở trên (thay sidebar trái).
 * Khi vào "Học" → CourseSidebar sẽ xuất hiện bên trái.
 * Footer hiển thị ở các trang thông thường (ẩn khi đang ở màn hình học bài toàn màn hình).
 */
export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()

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
  const brandLink = user.role === 'ADMIN' ? '/admin' : user.role === 'TEACHER' && isTeacherWorkspace ? '/dashboard/teacher' : '/'

  return (
    <RealtimeProvider>
      <div className="layout">
        {/* Navbar cố định trên cùng */}
      <nav className="navbar">
        <Link to={brandLink} className="navbar-brand">
          <span className="navbar-brand-badge">
            <GraduationCap size={18} strokeWidth={2.2} />
          </span>
          <span>E-Learning AI</span>
          {user.role === 'TEACHER' && isTeacherWorkspace && (
            <span
              className="badge"
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

        <div className="navbar-actions">
          {/* Nút chuyển đổi nhanh Không gian Giảng viên <-> Học viên */}
          {user.role === 'TEACHER' && (
            isTeacherWorkspace ? (
              <Link
                to="/courses"
                className="btn secondary sm flex-row"
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
                className="btn sm flex-row"
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
            <span>{user.fullName || 'Học viên'}</span>
          </Link>
          <button className="btn secondary sm flex-row" style={{ gap: 6 }} onClick={logout} title="Đăng xuất">
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="layout-content">
        <main className="main">
          <Outlet />
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
