import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyCourses } from '@shared/hooks/useCourses.js'
import CourseModal from '@teacher/components/modals/CourseModal.jsx'
import AddCardTrigger from '@teacher/components/AddCardTrigger.jsx'
import { usePublishCourse, useHideCourse } from '@teacher/hooks/useTeacherCourses.js'

const STATUS_BADGE = {
  DRAFT: { cls: 'neutral', label: 'Bản nháp' },
  PUBLISHED: { cls: 'good', label: 'Đã xuất bản' },
  HIDDEN: { cls: 'warn', label: 'Đã ẩn' },
}

/**
 * TeacherCourseListPage — thay thế TeacherDashboardPage cũ (placeholder). Điểm vào chính của
 * toàn bộ CMS giáo viên: liệt kê khoá học đã tạo + card [+ Tạo khoá học]. Bấm vào 1 khoá học
 * đưa thẳng vào khu vực soạn bài (/teacher/courses/:id/content?section=VOCAB).
 */
export default function TeacherCourseListPage() {
  const { data: courses, isLoading } = useMyCourses()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const navigate = useNavigate()

  const openCreate = () => {
    setEditingCourse(null)
    setModalOpen(true)
  }

  const openEdit = (course) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingCourse(course)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="teacher-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Khoá học của tôi</h2>
          <p className="text-dim text-sm" style={{ marginTop: 4 }}>
            Quản lý nội dung, từ vựng và bài luyện tập cho từng khoá học bạn phụ trách.
          </p>
        </div>
      </div>

      {isLoading && <p className="text-dim">Đang tải...</p>}

      {!isLoading && (!courses || courses.length === 0) && (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>Bạn chưa tạo khoá học nào.</p>
        </div>
      )}

      <div className="grid mt-16">
        {(courses || []).map((c) => (
          <TeacherCourseCard key={c.id} course={c} onEdit={openEdit(c)} onOpen={() => navigate(`/teacher/courses/${c.id}/content?section=VOCAB`)} />
        ))}

        <div className="card" style={{ display: 'flex', alignItems: 'stretch' }}>
          <AddCardTrigger label="Tạo khoá học mới" onClick={openCreate} />
        </div>
      </div>

      <CourseModal
        open={modalOpen}
        course={editingCourse}
        onClose={() => setModalOpen(false)}
        onCreated={(created) => navigate(`/teacher/courses/${created.id}/content?section=VOCAB`)}
      />
    </div>
  )
}

function TeacherCourseCard({ course, onEdit, onOpen }) {
  const publishCourse = usePublishCourse()
  const hideCourse = useHideCourse()
  const badge = STATUS_BADGE[course.status] || STATUS_BADGE.DRAFT
  const busy = publishCourse.isPending || hideCourse.isPending

  const togglePublish = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (course.status === 'PUBLISHED') hideCourse.mutate(course.id)
    else publishCourse.mutate(course.id)
  }

  return (
    <div className="card hoverable editable-block" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <div className="editable-actions">
        <button type="button" onClick={onEdit} title="Sửa thông tin khoá học">✏️</button>
      </div>

      <div className="course-cover-wrapper">
        {course.coverUrl ? (
          <img className="course-cover" src={course.coverUrl} alt={course.title} />
        ) : (
          <div className="course-cover course-cover-placeholder">
            <span className="course-cover-icon">📚</span>
          </div>
        )}
      </div>

      <div className="course-card-body">
        <div className="flex-between" style={{ marginBottom: 8 }}>
          <span className={`badge ${badge.cls}`}>{badge.label}</span>
          {course.level && <span className="text-dim text-sm">{course.level}</span>}
        </div>
        <h3 className="course-title" style={{ marginTop: 0 }}>{course.title}</h3>
        <p className="course-description">{course.description}</p>

        <div className="course-footer">
          <button type="button" className="btn secondary sm" onClick={togglePublish} disabled={busy}>
            {course.status === 'PUBLISHED' ? 'Ẩn khoá học' : 'Xuất bản'}
          </button>
        </div>
      </div>
    </div>
  )
}
