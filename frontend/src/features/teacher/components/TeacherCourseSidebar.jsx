import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { useCustomSections, useDeleteCustomSection } from '@teacher/hooks/useCustomSections.js'
import CustomSectionModal from '@teacher/components/modals/CustomSectionModal.jsx'

/**
 * TeacherCourseSidebar — 10 mục cố định (BR-17) + các mục tùy chỉnh do giáo viên tạo thêm.
 * Nút "+ Thêm nội dung khóa học" ở dưới cùng mở modal tạo mục mới.
 * Mỗi mục tùy chỉnh có nút ✏️ (sửa) và 🗑️ (xóa) hiện khi hover.
 */
const FIXED_SECTIONS = [
  { code: 'VOCAB',    label: 'Từ vựng',                   icon: '📚' },
  { code: 'GRAMMAR',  label: 'Ngữ pháp',                  icon: '📖' },
  { code: 'PART1',    label: 'Part 1',                     icon: '🎧' },
  { code: 'PART2',    label: 'Part 2',                     icon: '💬' },
  { code: 'PART3',    label: 'Part 3',                     icon: '🗣️' },
  { code: 'PART4',    label: 'Part 4',                     icon: '📻' },
  { code: 'PART5',    label: 'Part 5',                     icon: '📝' },
  { code: 'PART6',    label: 'Part 6',                     icon: '📄' },
  { code: 'PART7',    label: 'Part 7',                     icon: '📖' },
  { code: 'DICTATION',label: 'Luyện nghe chép chính tả',  icon: '✍️' },
]

export default function TeacherCourseSidebar({ activeSection, courseId: courseIdProp }) {
  const { courseId: courseIdFromRoute } = useParams()
  const courseId = courseIdProp || courseIdFromRoute

  const { data: customSections = [] } = useCustomSections(courseId)
  const deleteSection = useDeleteCustomSection(courseId)

  const [modal, setModal] = useState({ open: false, section: null })
  const openCreate = () => setModal({ open: true, section: null })
  const openEdit = (sec, e) => { e.preventDefault(); e.stopPropagation(); setModal({ open: true, section: sec }) }
  const handleDelete = (sec, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm(`Xóa mục "${sec.title}"? Các Đơn vị trong mục này sẽ không bị xóa.`)) {
      deleteSection.mutate(sec.id)
    }
  }

  return (
    <>
      <h1>Nội dung khóa học</h1>
      <nav>
        {/* 10 mục cố định */}
        {FIXED_SECTIONS.map((s) => (
          <NavLink
            key={s.code}
            to={`/teacher/courses/${courseId}/content?section=${s.code}`}
            className={() => `nav-link ${activeSection === s.code ? 'active' : ''}`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </NavLink>
        ))}

        {/* Mục tùy chỉnh do giáo viên tạo */}
        {customSections.map((s) => (
          <NavLink
            key={s.sectionCode}
            to={`/teacher/courses/${courseId}/content?section=${s.sectionCode}`}
            className={() => `nav-link custom-section-link ${activeSection === s.sectionCode ? 'active' : ''}`}
          >
            <span>{s.icon}</span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.title}
            </span>
            {/* Nút sửa/xóa — chỉ hiện khi hover (CSS .custom-section-link:hover .custom-section-actions) */}
            <span className="custom-section-actions" onClick={(e) => e.preventDefault()}>
              <button
                type="button"
                className="custom-section-btn"
                title="Sửa tên"
                onClick={(e) => openEdit(s, e)}
              >✏️</button>
              <button
                type="button"
                className="custom-section-btn danger"
                title="Xóa mục"
                onClick={(e) => handleDelete(s, e)}
              >🗑️</button>
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
          + Thêm nội dung khóa học
        </button>
      </div>

      <CustomSectionModal
        open={modal.open}
        courseId={courseId}
        section={modal.section}
        onClose={() => setModal({ open: false, section: null })}
      />
    </>
  )
}
