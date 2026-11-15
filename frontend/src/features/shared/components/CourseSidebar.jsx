import { NavLink, useParams } from 'react-router-dom'
import { useCustomSections } from '@shared/hooks/useCustomSections.js'
import { useCourse, useCourseSections } from '@shared/hooks/useCourses.js'
import { getVisibleStandardSections } from '@shared/utils/courseSections.js'
import { SectionIcon } from '@shared/components/ui/AppIcons.jsx'
import { useCourseProgress } from '@student/hooks/useCourseProgress.js'
import { Check } from 'lucide-react'

/**
 * CourseSidebar — Nội dung khóa học (phía học viên) hiển thị theo định dạng profile:
 * - LISTENING: chỉ hiển thị các Part nghe (Part 1 -> Part 4, Dictation)
 * - READING: chỉ hiển thị các Part đọc (Part 5 -> Part 7, Ngữ pháp)
 * - FULL: hiển thị đầy đủ cả 10 phần
 * - TOPIC: chỉ hiển thị những phần thực tế có trong khóa học
 */
export default function CourseSidebar({ activeSection, courseId: courseIdProp }) {
  const { courseId: courseIdFromRoute } = useParams()
  const courseId = courseIdProp || courseIdFromRoute

  const { data: course } = useCourse(courseId)
  const { data: activeSectionCodes = [] } = useCourseSections(courseId)
  const { data: customSections = [] } = useCustomSections(courseId)
  const { courseProgressPercent, getSectionProgress } = useCourseProgress(courseId)

  const visibleStandard = getVisibleStandardSections(course?.profile, activeSectionCodes)

  const renderSectionBadge = (sectionCode) => {
    const sp = getSectionProgress(sectionCode)
    if (!sp || sp.isEmpty) return null
    if (sp.isCompleted || sp.progressPercent >= 100) {
      return (
        <span className="sidebar-sec-badge completed" title="Đã hoàn thành mục này">
          <Check size={11} strokeWidth={3} />
          <span>100%</span>
        </span>
      )
    }
    const pct = Math.round(sp.progressPercent || 0)
    return (
      <span className={`sidebar-sec-badge ${pct > 0 ? 'in-progress' : 'zero'}`} title={`Tiến độ mục: ${pct}%`}>
        {pct}%
      </span>
    )
  }

  return (
    <>
      <div className="sidebar-header-wrap">
        <h1 style={{ margin: 0 }}>Nội dung khóa học</h1>
        {courseId && (
          <div className="sidebar-course-progress-card">
            <div className="sidebar-progress-meta">
              <span className="sidebar-progress-title">Tiến độ khóa học</span>
              <span className="sidebar-progress-pct">{Math.round(courseProgressPercent || 0)}%</span>
            </div>
            <div className="sidebar-progress-track">
              <div
                className="sidebar-progress-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, courseProgressPercent || 0))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <nav>
        {/* Các mục TOEIC chuẩn phù hợp với định dạng khóa học */}
        {visibleStandard.map((s) => (
          <NavLink
            key={s.code}
            to={`/courses/${courseId}/learn?section=${s.code}`}
            className={() => `nav-link ${activeSection === s.code ? 'active' : ''}`}
          >
            <div className="nav-link-left">
              <SectionIcon code={s.code} size={15} withBadge />
              <span className="nav-link-text">{s.label}</span>
            </div>
            {renderSectionBadge(s.code)}
          </NavLink>
        ))}

        {/* Mục tùy chỉnh do giáo viên tạo — học viên chỉ xem, không sửa/xóa */}
        {customSections.map((s) => (
          <NavLink
            key={s.sectionCode}
            to={`/courses/${courseId}/learn?section=${s.sectionCode}`}
            className={() => `nav-link ${activeSection === s.sectionCode ? 'active' : ''}`}
          >
            <div className="nav-link-left">
              <SectionIcon code={s.sectionCode} fallbackEmoji={s.icon} size={15} withBadge />
              <span className="nav-link-text">{s.title}</span>
            </div>
            {renderSectionBadge(s.sectionCode)}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
