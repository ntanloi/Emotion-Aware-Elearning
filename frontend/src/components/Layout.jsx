import { Outlet, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Layout() {
  const { user, logout } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>E-Learning AI</h1>
        <nav>
          <Link to="/courses">Khóa học</Link>
          {user.role === 'STUDENT' && <Link to="/dashboard/student">Báo cáo của tôi</Link>}
          {user.role === 'TEACHER' && <Link to="/dashboard/teacher">Dashboard giảng viên</Link>}
        </nav>
        <button className="btn secondary" style={{ marginTop: 24, width: '100%' }} onClick={logout}>
          Đăng xuất ({user.fullName})
        </button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
