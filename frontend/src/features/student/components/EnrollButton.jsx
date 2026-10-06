import { useIsEnrolled, useEnroll } from '@student/hooks/useEnroll.js'
import { useNavigate } from 'react-router-dom'

/**
 * EnrollButton — Giai đoạn 6, Bước 2.
 * Nút đăng ký khóa học, xử lý trạng thái đã/chưa enroll. Optimistic update qua React Query.
 */
export default function EnrollButton({ courseId }) {
  const isEnrolled = useIsEnrolled(courseId)
  const enrollMutation = useEnroll(courseId)
  const navigate = useNavigate()

  if (isEnrolled) {
    return (
      <button className="btn" onClick={() => navigate(`/courses/${courseId}/learn`)}>
        ▶ Vào học
      </button>
    )
  }

  return (
    <button
      className="btn"
      disabled={enrollMutation.isPending}
      onClick={() => enrollMutation.mutate()}
    >
      {enrollMutation.isPending ? 'Đang đăng ký...' : 'Đăng ký học'}
    </button>
  )
}
