import { Outlet, Link, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@auth/store/authStore.js'
import ChatWidget from '@student/components/ChatWidget.jsx'

/**
 * Layout — Navbar ngang cố định ở trên (thay sidebar trái).
 * Khi vào "Học" → CourseSidebar sẽ xuất hiện bên trái.
 */
export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace />

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="layout">
      {/* Navbar cố định trên cùng */}
      <nav className="navbar">
        <Link to="/courses" className="navbar-brand">
          📚 E-Learning AI
        </Link>
        
        <div className="navbar-nav">
          {user.role === 'STUDENT' && (
            <>
              <Link to="/courses" className={isActive('/courses') && !isActive('/courses/') ? 'active' : ''}>
                Khóa học
              </Link>
              <Link to="/flashcards/review" className={isActive('/flashcards') ? 'active' : ''}>
                Ôn tập Flashcards
              </Link>
              <Link to="/reports/daily" className={isActive('/reports') ? 'active' : ''}>
                Báo cáo
              </Link>
              <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>
                Hồ sơ
              </Link>
            </>
          )}
          {user.role === 'TEACHER' && (
            <>
              <Link to="/teacher/courses" className={isActive('/teacher/courses') ? 'active' : ''}>
                Khóa học của tôi
              </Link>
              <Link to="/teacher/vocab-library" className={isActive('/teacher/vocab-library') ? 'active' : ''}>
                Thư viện từ vựng
              </Link>
              <Link to="/dashboard/teacher" className={isActive('/dashboard/teacher') ? 'active' : ''}>
                Dashboard
              </Link>
            </>
          )}
          {user.role === 'ADMIN' && (
            <Link to="/dashboard/admin" className={isActive('/dashboard/admin') ? 'active' : ''}>
              Quản trị
            </Link>
          )}
        </div>

        <div className="navbar-actions">
          <span className="text-dim text-sm">{user.fullName}</span>
          <button className="btn secondary sm" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="layout-content">
        <main className="main">
          <Outlet />
        </main>
      </div>

      {user.role === 'STUDENT' && <ChatWidget />}
    </div>
  )
}

