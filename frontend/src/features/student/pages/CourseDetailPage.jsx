import { useParams } from 'react-router-dom'
import { useCourse } from '@shared/hooks/useCourses.js'
import StarRating from '@shared/components/StarRating.jsx'
import EnrollButton from '@student/components/EnrollButton.jsx'
import CourseReviews from '@student/components/CourseReviews.jsx'

/** ChiTietKhoaHoc — Giai đoạn 6, Bước 2. */
export default function CourseDetailPage() {
  const { courseId } = useParams()
  const { data: course, isLoading } = useCourse(courseId)

  if (isLoading) return <p className="text-dim">Đang tải...</p>
  if (!course) return <p className="text-dim">Không tìm thấy khóa học.</p>

  return (
    <div>
      {course.coverUrl && <img className="course-cover" src={course.coverUrl} alt={course.title} style={{ height: 260 }} />}
      <h1>{course.title}</h1>
      <div className="flex-row" style={{ gap: 8, marginBottom: 16 }}>
        {course.level && <span className="badge neutral">{course.level}</span>}
        <span className="text-dim text-sm">Giảng viên: {course.teacherName}</span>
        {course.durationHours && <span className="text-dim text-sm">• {course.durationHours} giờ học</span>}
        {course.averageRating != null && (
          <span className="flex-row" style={{ gap: 4 }}>
            <StarRating value={Math.round(course.averageRating)} size={14} />
            <span className="text-dim text-sm">
              {course.averageRating.toFixed(1)} ({course.reviewCount})
            </span>
          </span>
        )}
      </div>
      <p>{course.description}</p>
      <div className="card mt-24" style={{ maxWidth: 320 }}>
        <div className="price-row">
          {course.price ? (
            <span className="price-current" style={{ fontSize: 24 }}>
              {Number(course.price).toLocaleString('vi-VN')}đ
            </span>
          ) : (
            <span className="price-current" style={{ fontSize: 24 }}>Miễn phí</span>
          )}
        </div>
        <EnrollButton courseId={course.id} />
      </div>

      <CourseReviews courseId={course.id} />
    </div>
  )
}
