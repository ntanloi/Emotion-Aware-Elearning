import { useCourses } from '@shared/hooks/useCourses.js'
import CourseCard from '@shared/components/CourseCard.jsx'

/** DanhSachKhoaHoc — Giai đoạn 6, Bước 2. FR-ACC-02: duyệt khóa học nhiều giảng viên. */
export default function CourseListPage() {
  const { data: courses, isLoading } = useCourses()

  if (isLoading) return <p className="text-dim">Đang tải khóa học...</p>

  return (
    <div>
      <h2>Danh sách khóa học TOEIC</h2>
      <div className="grid">
        {(courses || []).map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
        {(!courses || courses.length === 0) && <p className="text-dim">Chưa có khóa học nào.</p>}
      </div>
    </div>
  )
}
