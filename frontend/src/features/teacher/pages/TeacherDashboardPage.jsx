import { useMyCourses } from '@shared/hooks/useCourses.js'

/**
 * TeacherDashboardPage — giữ nguyên phạm vi tối thiểu (Giai đoạn 7 - trang giảng viên đầy đủ
 * KHÔNG thuộc phạm vi lần này, xem docs/giai-doan-5-6-ghi-chu-doi-chieu.md mục 5).
 * Chỉ hiển thị danh sách khóa học của giảng viên bằng hook đã chuẩn bị sẵn.
 */
export default function TeacherDashboardPage() {
  const { data: courses, isLoading } = useMyCourses()

  return (
    <div>
      <h2>Dashboard giảng viên</h2>
      {isLoading && <p className="text-dim">Đang tải...</p>}
      <div className="grid mt-16">
        {(courses || []).map((c) => (
          <div className="card" key={c.id}>
            <h3 style={{ marginTop: 0 }}>{c.title}</h3>
            <span className="badge neutral">{c.status}</span>
          </div>
        ))}
      </div>
      <p className="text-dim text-sm mt-24">
        Trang xây dựng khóa học, biểu đồ báo cáo, danh sách học viên (Giai đoạn 7) sẽ được bổ sung ở lần triển khai sau.
      </p>
    </div>
  )
}
