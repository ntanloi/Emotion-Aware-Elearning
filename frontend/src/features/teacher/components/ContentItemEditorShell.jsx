import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Pencil, Home, ChevronRight, ArrowLeft, UploadCloud } from 'lucide-react'
import { useUpdateContentItem } from '@teacher/hooks/useTeacherContentItems.js'
import { useCourse } from '@shared/hooks/useCourses.js'
import TeacherCourseShell from '@teacher/components/TeacherCourseShell.jsx'
import ItemModerationAlertBanner from '@teacher/components/ItemModerationAlertBanner.jsx'
import PublishToLibraryModal from '@teacher/components/modals/PublishToLibraryModal.jsx'

const SECTION_LABELS = {
  VOCAB: 'Từ vựng',
  GRAMMAR: 'Ngữ pháp',
  PART1: 'Part 1',
  PART2: 'Part 2',
  PART3: 'Part 3',
  PART4: 'Part 4',
  PART5: 'Part 5',
  PART6: 'Part 6',
  PART7: 'Part 7',
  DICTATION: 'Luyện nghe chép chính tả',
}

/**
 * ContentItemEditorShell — khung dùng chung cho cả 5 loại Editor (Video/Ngữ pháp/Từ vựng/
 * Luyện tập/Chính tả): có Sidebar danh mục khoá học cố định bên trái (TeacherCourseShell),
 * thanh Breadcrumbs phân cấp trực quan + nút quay lại + tiêu đề có thể sửa tại chỗ (inline rename)
 * + Banner cảnh báo lỗi kiểm duyệt kèm nút Thẩm định lại tức thì.
 */
export default function ContentItemEditorShell({ item, children }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusRule = searchParams.get('focusRule')

  const updateItem = useUpdateContentItem(item.courseId, item.sectionCode)
  const { data: course } = useCourse(item.courseId)

  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [publishModalOpen, setPublishModalOpen] = useState(false)

  const courseTitle = item.courseTitle || course?.title || 'Khóa học'
  const sectionLabel = SECTION_LABELS[item.sectionCode] || item.sectionCode || 'Mục bài học'

  const saveTitle = async () => {
    setEditingTitle(false)
    const trimmed = title.trim()
    if (trimmed && trimmed !== item.title) {
      await updateItem.mutateAsync({ id: item.id, payload: { title: trimmed } })
    } else {
      setTitle(item.title)
    }
  }

  const cancelTitle = () => {
    setTitle(item.title)
    setEditingTitle(false)
  }

  const handleBack = () => {
    if (item.courseId) {
      navigate(`/teacher/courses/${item.courseId}/content?section=${item.sectionCode || 'VOCAB'}`)
    } else {
      navigate(-1)
    }
  }

  return (
    <TeacherCourseShell activeSection={item.sectionCode} courseId={item.courseId}>
      {/* Thanh điều hướng đường dẫn phân cấp (Breadcrumbs Trail) cho Giảng viên */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--surface-1)',
        borderRadius: 12,
        border: '1px solid var(--border-subtle)',
        marginBottom: 20
      }}>
        {/* Đường dẫn phân cấp trực quan */}
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
            fontSize: 13,
            color: 'var(--text-dim)'
          }}
        >
          {/* Cấp 1: Danh sách khóa học */}
          <Link
            to="/teacher/courses"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: 'var(--text-dim)',
              textDecoration: 'none',
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
            title="Khóa học của tôi"
          >
            <Home size={15} />
            <span>Khóa học</span>
          </Link>

          <ChevronRight size={14} style={{ opacity: 0.5 }} />

          {/* Cấp 2: Tên khóa học đang biên soạn */}
          <Link
            to={`/teacher/courses/${item.courseId}/edit`}
            style={{
              color: 'var(--text-dim)',
              textDecoration: 'none',
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
            title="Cài đặt khóa học"
          >
            {courseTitle}
          </Link>

          <ChevronRight size={14} style={{ opacity: 0.5 }} />

          {/* Cấp 3: Mục/Section cha */}
          <Link
            to={`/teacher/courses/${item.courseId}/content?section=${item.sectionCode || 'VOCAB'}`}
            style={{
              color: 'var(--text-dim)',
              textDecoration: 'none',
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
            title={`Nội dung mục ${sectionLabel}`}
          >
            {sectionLabel}
          </Link>

          <ChevronRight size={14} style={{ opacity: 0.5 }} />

          {/* Cấp 4: Tên Nhóm hoạt động (nếu có) */}
          {item.groupTitle && (
            <>
              <span style={{ color: 'var(--text-dim)' }}>
                {item.groupTitle}
              </span>
              <ChevronRight size={14} style={{ opacity: 0.5 }} />
            </>
          )}

          {/* Cấp 5: Hoạt động hiện tại đang biên soạn (Active leaf node) */}
          <span
            style={{
              color: 'var(--accent)',
              fontWeight: 600,
              maxWidth: 260,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={title || item.title}
          >
            {title || item.title}
          </span>
        </nav>

        {/* Nút quay lại danh sách hoạt động */}
        <button
          type="button"
          className="btn sm secondary flex-row"
          style={{ gap: 6, fontSize: 12, padding: '5px 12px', borderRadius: 8, cursor: 'pointer' }}
          onClick={handleBack}
          title="Quay lại danh sách bài học của mục này"
        >
          <ArrowLeft size={13} />
          <span>Quay lại danh sách</span>
        </button>
      </div>

      {/* Tiêu đề có thể click để sửa inline */}
      <div className="mt-8 flex-row" style={{ gap: 10, alignItems: 'center' }}>
        {editingTitle ? (
          <input
            type="text"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') cancelTitle()
            }}
            style={{
              fontSize: 22,
              fontWeight: 700,
              padding: '4px 8px',
              flex: 1,
              border: '1px solid var(--border)',
              borderRadius: 6,
            }}
          />
        ) : (
          <h2
            style={{ margin: 0, cursor: 'text' }}
            onClick={() => setEditingTitle(true)}
            title="Bấm để sửa tiêu đề"
          >
            {title} <span className="text-dim text-sm"><Pencil size={13} /></span>
          </h2>
        )}
        {item.type === 'PRACTICE_TEST' && (
          <button
            type="button"
            className="btn sm primary flex-row"
            style={{ gap: 6, fontSize: 13, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', marginLeft: 'auto' }}
            onClick={() => setPublishModalOpen(true)}
            title="Đăng đề thi này lên thư viện đề thi TOEIC độc lập"
          >
            <UploadCloud size={15} />
            <span>Đăng lên thư viện đề thi</span>
          </button>
        )}
        {updateItem.isPending && <span className="text-dim text-sm">Đang lưu...</span>}
      </div>

      {/* Banner thông báo lỗi kiểm duyệt trực tiếp và nút thẩm định lại tức thì */}
      <div style={{ marginTop: 16 }}>
        <ItemModerationAlertBanner item={item} course={course} focusRule={focusRule} />
      </div>

      <div className="mt-20">{children}</div>

      <PublishToLibraryModal
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        item={item}
        courseId={item.courseId}
      />
    </TeacherCourseShell>
  )
}
