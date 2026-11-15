import React from 'react'
import { Navigate } from 'react-router-dom'

/**
 * P1-3: Chuyển hướng hàng đợi duyệt cũ sang trang Khóa học tập trung với tab Chờ duyệt
 */
export default function AdminModerationQueuePage() {
  return <Navigate to="/admin/courses?tab=PENDING_REVIEW" replace />
}
