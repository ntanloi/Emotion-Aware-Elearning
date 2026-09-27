import { Navigate } from 'react-router-dom'

/** Giữ route cũ /dashboard/student tương thích ngược — điều hướng sang trang Báo cáo ngày mới. */
export default function StudentDashboardPage() {
  return <Navigate to="/reports/daily" replace />
}
