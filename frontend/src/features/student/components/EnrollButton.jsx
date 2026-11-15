import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Sparkles, CreditCard } from 'lucide-react'
import { useIsEnrolled, useEnroll } from '@student/hooks/useEnroll.js'
import { useAuthStore } from '@auth/store/authStore.js'
import WalletCheckoutModal from '@student/components/WalletCheckoutModal.jsx'

/**
 * EnrollButton — Xử lý logic đăng ký khóa học:
 * 1. Chưa đăng nhập -> Chuyển hướng /login
 * 2. Đã enroll -> Chuyển vào học ngay (/courses/:id/learn)
 * 3. Miễn phí (price == 0/null) -> Ghi danh trực tiếp (optimistic update)
 * 4. Có phí (price > 0) -> Mở modal thanh toán QR Code VietQR
 */
export default function EnrollButton({ course, courseId, className = "btn" }) {
  const targetId = course?.id || courseId
  const isEnrolled = useIsEnrolled(targetId)
  const enrollMutation = useEnroll(targetId)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const isFree = !course?.price || Number(course.price) <= 0

  if (isEnrolled) {
    return (
      <button className={className} onClick={() => navigate(`/courses/${targetId}/learn`)}>
        <Play size={16} fill="currentColor" /> Vào học ngay
      </button>
    )
  }

  const handleClick = () => {
    if (!isAuthenticated) {
      // Lưu lại URL để sau khi login quay lại
      navigate('/login')
      return
    }

    if (isFree) {
      enrollMutation.mutate()
    } else {
      setShowPaymentModal(true)
    }
  }

  return (
    <>
      <button
        className={className}
        disabled={enrollMutation.isPending}
        onClick={handleClick}
      >
        {isFree ? (
          <>
            <Sparkles size={16} /> {enrollMutation.isPending ? 'Đang đăng ký...' : 'Đăng ký học miễn phí'}
          </>
        ) : (
          <>
            <CreditCard size={16} /> Đăng ký &amp; Thanh toán
          </>
        )}
      </button>

      {showPaymentModal && course && (
        <WalletCheckoutModal
          course={course}
          holdsReward={Boolean(course.price && Number(course.price) > 0)}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => setShowPaymentModal(false)}
        />
      )}
    </>
  )
}
