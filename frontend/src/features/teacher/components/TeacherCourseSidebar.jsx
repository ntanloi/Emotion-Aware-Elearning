import { useState } from 'react'
import { NavLink, Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useCustomSections, useDeleteCustomSection } from '@teacher/hooks/useCustomSections.js'
import { useCourse, useCourseSections, useDeleteCourseSection } from '@shared/hooks/useCourses.js'
import { getVisibleStandardSections } from '@shared/utils/courseSections.js'
import CustomSectionModal from '@teacher/components/modals/CustomSectionModal.jsx'
import CourseReadinessModal from '@teacher/components/modals/CourseReadinessModal.jsx'
import { CheckCircle2, Pencil, Trash2, Plus, ArrowLeft, LayoutDashboard, BookOpen } from 'lucide-react'
import { SectionIcon } from '@shared/components/ui/AppIcons.jsx'
import { useToast, useConfirm } from '@shared/context/AppUIContext.jsx'

/**
 * TeacherCourseSidebar — hiển thị danh mục nội dung theo định dạng khóa học (profile):
 * - LISTENING: chỉ hiển thị các Part nghe (Part 1 -> Part 4, Luyện nghe chép chính tả)
 * - READING: chỉ hiển thị các Part đọc (Part 5 -> Part 7, Ngữ pháp)
 * - FULL: hiển thị đầy đủ cả 10 phần TOEIC chuẩn
 * - TOPIC (Khóa chuyên đề / Linh hoạt): CHỈ hiển thị những phần mà giáo viên đã thêm / đã có bài
 */
export default function TeacherCourseSidebar({ activeSection, courseId: courseIdProp }) {
  const { courseId: courseIdFromRoute } = useParams()
  const courseId = courseIdProp || courseIdFromRoute
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const { data: course } = useCourse(courseId)
  const { data: activeSectionCodes = [] } = useCourseSections(courseId)
  const { data: customSections = [] } = useCustomSections(courseId)
  const deleteCustomSection = useDeleteCustomSection(courseId)
  const deleteStandardSection = useDeleteCourseSection(courseId)

  const [modal, setModal] = useState({ open: false, section: null })
  const [readinessOpen, setReadinessOpen] = useState(false)

  const openCreate = () => setModal({ open: true, section: null })
  const openEditCustom = (sec, e) => {
    e.preventDefault()
    e.stopPropagation()
    setModal({ open: true, section: sec })
  }

  const handleDeleteCustom = async (sec, e) => {
    e.preventDefault()
    e.stopPropagation()
    const ok = await confirm({
      title: 'Xóa mục tùy chỉnh',
      message: `Xóa mục tùy chỉnh "${sec.title}"?`,
      confirmLabel: 'Xóa mục',
      variant: 'danger',
    })
    if (ok) {
      deleteCustomSection.mutate(sec.id)
    }
  }

  // Danh sách các mục chuẩn hiển thị dựa theo profile khóa học
  const visibleStandard = getVisibleStandardSections(course?.profile, activeSectionCodes)
  const isTopic = (course?.profile || 'TOPIC').toUpperCase() === 'TOPIC'

  const allExistingCodes = [
    ...visibleStandard.map((s) => s.code),
    ...customSections.map((s) => s.sectionCode),
  ]

  const handleDeleteStandard = async (s, e) => {
    e.preventDefault()
    e.stopPropagation()
    const ok = await confirm({
      title: 'Xóa mục khỏi khóa học',
      message: `Xóa mục "${s.label}" khỏi khóa học này? Toàn bộ các nhóm hoạt động và bài học bên trong mục này sẽ bị xóa.`,
      confirmLabel: 'Xóa mục',
      variant: 'danger',
    })
    if (ok) {
      deleteStandardSection.mutate(s.code, {
        onSuccess: () => {
          if (activeSection === s.code) {
            const remaining = visibleStandard.filter((item) => item.code !== s.code)
            const nextSec = remaining[0]?.code || customSections[0]?.sectionCode || ''
            navigate(nextSec ? `/teacher/courses/${courseId}/content?section=${nextSec}` : `/teacher/courses/${courseId}/content`)
          }
        },
        onError: (err) => {
          toast.error(err?.response?.data?.error || err?.message || 'Không thể xóa mục này')
        },
      })
    }
  }

  const isEmptyCourse = visibleStandard.length === 0 && customSections.length === 0
  const [searchParams] = useSearchParams()
  const fromParam = searchParams.get('from')
  const isFromDashboard = fromParam === 'dashboard'
  const fromSuffix = fromParam ? `&from=${encodeURIComponent(fromParam)}` : ''

  return (
    <>
      <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isFromDashboard ? (
          <>
            <Link
              to="/dashboard/teacher?tab=courses"
              className="btn secondary sm flex-row"
              style={{
                gap: 6,
                fontSize: 12,
                padding: '7px 12px',
                textDecoration: 'none',
                width: '100%',
                justifyContent: 'center',
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                color: 'var(--accent)',
                borderRadius: 'var(--radius, 8px)',
                fontWeight: 600,
              }}
              title="Quay lại tab Khóa học của tôi ở Dashboard Giảng viên"
            >
              <ArrowLeft size={13} />
              <LayoutDashboard size={13} />
              <span>Về Dashboard Khóa học</span>
            </Link>
            <Link
              to="/teacher/courses"
              className="btn ghost sm flex-row"
              style={{
                gap: 6,
                fontSize: 11.5,
                padding: '4px 10px',
                textDecoration: 'none',
                width: '100%',
                justifyContent: 'center',
                color: 'var(--text-dim)',
              }}
              title="Xem danh sách quản lý tất cả khóa học"
            >
              <BookOpen size={12} />
              <span>Danh sách khóa học</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/teacher/courses"
              className="btn secondary sm flex-row"
              style={{
                gap: 6,
                fontSize: 12,
                padding: '6px 12px',
                textDecoration: 'none',
                width: '100%',
                justifyContent: 'center',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius, 8px)'
              }}
              title="Quay lại danh sách khóa học của giảng viên"
            >
              <ArrowLeft size={13} />
              <span>Danh sách khóa học</span>
            </Link>
            <Link
              to="/dashboard/teacher?tab=courses"
              className="btn ghost sm flex-row"
              style={{
                gap: 6,
                fontSize: 11.5,
                padding: '4px 10px',
                textDecoration: 'none',
                width: '100%',
                justifyContent: 'center',
                color: 'var(--text-dim)',
              }}
              title="Đến Dashboard Giảng viên (Khóa học của tôi)"
            >
              <LayoutDashboard size={12} />
              <span>Dashboard Giảng viên</span>
            </Link>
          </>
        )}
      </div>

      <h1>Nội dung khóa học</h1>
      <nav>
        {isEmptyCourse && (
          <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Chưa có phần học nào</p>
            <p style={{ margin: 0, fontSize: 12 }}>Bấm nút bên dưới để thêm phần học đầu tiên cho khóa này.</p>
          </div>
        )}

        {/* Các mục TOEIC chuẩn phù hợp với định dạng khóa học */}
        {visibleStandard.map((s) => (
          <NavLink
            key={s.code}
            to={`/teacher/courses/${courseId}/content?section=${s.code}${fromSuffix}`}
            className={() => `nav-link custom-section-link ${activeSection === s.code ? 'active' : ''}`}
          >
            <div className="nav-link-left">
              <SectionIcon code={s.code} size={15} withBadge />
              <span className="nav-link-text">{s.label}</span>
            </div>

            {/* Khóa chuyên đề (TOPIC) cho phép giáo viên xóa bỏ các Part không muốn dùng */}
            {isTopic && (
              <span className="custom-section-actions" onClick={(e) => e.preventDefault()}>
                <button
                  type="button"
                  className="custom-section-btn danger"
                  title={`Xóa mục ${s.label}`}
                  onClick={(e) => handleDeleteStandard(s, e)}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            )}
          </NavLink>
        ))}

        {/* Mục tùy chỉnh do giáo viên tạo */}
        {customSections.map((s) => (
          <NavLink
            key={s.sectionCode}
            to={`/teacher/courses/${courseId}/content?section=${s.sectionCode}${fromSuffix}`}
            className={() => `nav-link custom-section-link ${activeSection === s.sectionCode ? 'active' : ''}`}
          >
            <div className="nav-link-left">
              <SectionIcon code={s.sectionCode} fallbackEmoji={s.icon} size={15} withBadge />
              <span className="nav-link-text">{s.title}</span>
            </div>
            {/* Nút sửa/xóa — hiện khi hover */}
            <span className="custom-section-actions" onClick={(e) => e.preventDefault()}>
              <button
                type="button"
                className="custom-section-btn"
                title="Sửa tên"
                onClick={(e) => openEditCustom(s, e)}
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                className="custom-section-btn danger"
                title="Xóa mục"
                onClick={(e) => handleDeleteCustom(s, e)}
              >
                <Trash2 size={12} />
              </button>
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Nút thêm mục mới — nằm ngoài <nav> để không bị style nav-link */}
      <div style={{ padding: '12px 12px 16px' }}>
        <button
          type="button"
          className="btn-add-section"
          onClick={openCreate}
        >
          <Plus size={15} />
          <span>Thêm nội dung khóa học</span>
        </button>

        <button
          type="button"
          style={{
            marginTop: 8,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'var(--surface-2, #f3f4f6)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            color: 'var(--text-main)',
          }}
          onClick={() => setReadinessOpen(true)}
        >
          <CheckCircle2 size={15} color="#059669" />
          <span>Điều kiện gửi duyệt</span>
        </button>
      </div>

      <CourseReadinessModal
        isOpen={readinessOpen}
        courseId={courseId}
        onClose={() => setReadinessOpen(false)}
      />

      <CustomSectionModal
        open={modal.open}
        courseId={courseId}
        section={modal.section}
        existingSectionCodes={allExistingCodes}
        onSelectSection={(newSectionCode) => {
          navigate(`/teacher/courses/${courseId}/content?section=${newSectionCode}`)
        }}
        onClose={() => setModal({ open: false, section: null })}
      />
    </>
  )
}
