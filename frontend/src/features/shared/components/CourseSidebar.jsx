import { NavLink, useParams } from 'react-router-dom'
import { useCustomSections } from '@shared/hooks/useCustomSections.js'

/**
 * CourseSidebar — Nội dung khóa học.
 * 10 mục đầu là cố định (BR-17), bên dưới là các mục tùy chỉnh do giáo viên tạo thêm.
 * `courseId` truyền vào KHI route hiện tại không có param :courseId (vd trang
 * /content-items/:id) — nếu không truyền, tự lấy từ useParams() như trước.
 */
const FIXED_SECTIONS = [
  { code: 'VOCAB',     label: 'Từ vựng',                  icon: '📚' },
  { code: 'GRAMMAR',   label: 'Ngữ pháp',                 icon: '📖' },
  { code: 'PART1',     label: 'Part 1',                   icon: '🎧' },
  { code: 'PART2',     label: 'Part 2',                   icon: '💬' },
  { code: 'PART3',     label: 'Part 3',                   icon: '🗣️' },
  { code: 'PART4',     label: 'Part 4',                   icon: '📻' },
  { code: 'PART5',     label: 'Part 5',                   icon: '📝' },
  { code: 'PART6',     label: 'Part 6',                   icon: '📄' },
  { code: 'PART7',     label: 'Part 7',                   icon: '📖' },
  { code: 'DICTATION', label: 'Luyện nghe chép chính tả', icon: '✍️' },
]

export default function CourseSidebar({ activeSection, courseId: courseIdProp }) {
  const { courseId: courseIdFromRoute } = useParams()
  const courseId = courseIdProp || courseIdFromRoute

  const { data: customSections = [] } = useCustomSections(courseId)

  return (
    <>
      <h1>Nội dung khóa học</h1>
      <nav>
        {/* 10 mục cố định — không thể sửa/xóa */}
        {FIXED_SECTIONS.map((s) => (
          <NavLink
            key={s.code}
            to={`/courses/${courseId}/learn?section=${s.code}`}
            className={() => `nav-link ${activeSection === s.code ? 'active' : ''}`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </NavLink>
        ))}

        {/* Mục tùy chỉnh do giáo viên tạo — học viên chỉ xem, không sửa/xóa */}
        {customSections.map((s) => (
          <NavLink
            key={s.sectionCode}
            to={`/courses/${courseId}/learn?section=${s.sectionCode}`}
            className={() => `nav-link ${activeSection === s.sectionCode ? 'active' : ''}`}
          >
            <span>{s.icon}</span>
            <span>{s.title}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}