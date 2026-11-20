import { Link } from 'react-router-dom'
import { useAuthStore } from '@auth/store/authStore.js'
import { homeForRole } from '@shared/utils/notificationNavigation.js'

export default function NotFoundPage() {
  const role = useAuthStore((s) => s.user?.role)
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, fontWeight: 800, color: '#cbd5e1' }}>404</div>
      <h2 style={{ margin: '8px 0', fontSize: 20 }}>Không tìm thấy trang</h2>
      <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>
        Đường dẫn này không tồn tại hoặc bạn không có quyền truy cập.
      </p>
      <Link
        to={homeForRole(role)}
        style={{ padding: '8px 16px', borderRadius: 8, background: '#4f46e5', color: '#fff', textDecoration: 'none' }}
      >
        Về trang chủ
      </Link>
    </div>
  )
}
