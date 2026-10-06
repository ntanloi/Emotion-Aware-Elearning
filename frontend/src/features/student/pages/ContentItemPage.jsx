import { useParams, useSearchParams, Link } from 'react-router-dom'
import CourseLearnShell from '@shared/components/CourseLearnShell.jsx'
import ContentItemRenderer from '@shared/components/ContentItemRenderer.jsx'

/**
 * ContentItemPage — route trung tâm /content-items/:id (mục 2.2 lộ trình).
 * Bọc trong CourseLearnShell giống MyLearningPage để sidebar cố định xuyên suốt các Hoạt
 * động trong mục sidebar. Route này không có :courseId trong path nên courseId được lấy
 * qua query string và truyền thẳng cho CourseLearnShell/CourseSidebar. Nút quay lại trỏ
 * thẳng về danh sách Nhóm hoạt động của mục sidebar (không còn tầng "Đơn vị" trung gian).
 */
export default function ContentItemPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const section = searchParams.get('section')
  const courseId = searchParams.get('courseId')

  return (
    <CourseLearnShell activeSection={section === 'PART' ? 'PART' : section} courseId={courseId}>
      {courseId && (
        <Link to={`/courses/${courseId}/learn?section=${section || ''}`} className="text-dim text-sm">
          ← Quay lại danh sách hoạt động
        </Link>
      )}
      <div className="mt-16">
        <ContentItemRenderer contentItemId={id} />
      </div>
    </CourseLearnShell>
  )
}
