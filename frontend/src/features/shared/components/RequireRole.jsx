import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@auth/store/authStore.js'

/**
 * RequireRole — Route guard bảo vệ các đường dẫn theo quyền hạn người dùng (STUDENT | TEACHER | ADMIN)
 */
export default function RequireRole({ allowedRoles = [], children }) {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  if (roles.length > 0 && !roles.includes(user.role)) {
    // Nếu role không khớp, chuyển hướng về trang tương ứng với quyền của user
    if (user.role === 'TEACHER') {
      return <Navigate to="/teacher/courses" replace />
    }
    if (user.role === 'ADMIN') {
      return <Navigate to="/dashboard/admin" replace />
    }
    return <Navigate to="/courses" replace />
  }

  return children ? children : <Outlet />
}
