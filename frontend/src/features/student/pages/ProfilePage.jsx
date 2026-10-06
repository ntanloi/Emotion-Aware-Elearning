import { useEffect, useState } from 'react'
import { useAuthStore } from '@auth/store/authStore.js'
import AnswerHistoryTable from '@student/components/AnswerHistoryTable.jsx'
import * as attemptsApi from '@student/api/attempts.js'

/** ProfilePage (HoSoCaNhan) — Giai đoạn 6, Bước 14. Thông tin tài khoản + lịch sử làm bài (luồng phụ). */
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [attempts, setAttempts] = useState(null)

  useEffect(() => {
    attemptsApi.myAttempts().then(setAttempts).catch(() => setAttempts([]))
  }, [])

  return (
    <div>
      <h2>Hồ sơ cá nhân</h2>
      <div className="card" style={{ maxWidth: 400 }}>
        <p><strong>Họ tên:</strong> {user?.fullName}</p>
        <p><strong>Vai trò:</strong> {user?.role}</p>
      </div>

      <h3 className="mt-24">Lịch sử làm bài</h3>
      {attempts === null ? (
        <p className="text-dim">Đang tải...</p>
      ) : (
        <AnswerHistoryTable attempts={attempts} />
      )}
    </div>
  )
}
