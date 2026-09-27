import { useNavigate } from 'react-router-dom'

const TYPE_ICON = {
  VIDEO_LECTURE: '▶️',
  VOCAB_SET: '🗂️',
  GRAMMAR_ARTICLE: '📖',
  PRACTICE_TEST: '✏️',
  DICTATION_SET: '🎧',
}

/**
 * EditableActivityRow — giữ NGUYÊN class CSS ".activity-row" bên học viên để nhìn giống hệt,
 * chỉ bọc thêm ".editable-block" để hiện 2 icon ✏️/🗑️ khi hover (đè lên góc phải).
 * ✏️ Sửa = vào thẳng trang soạn nội dung (nơi sửa đầy đủ mọi trường của hoạt động).
 * 🗑️ Xoá = mở ConfirmDeleteModal, KHÔNG điều hướng.
 *
 * dragHandleProps (tuỳ chọn): { attributes, listeners } từ useSortable (@dnd-kit) — khi có, hiện
 * thêm tay cầm "⠿" ở đầu dòng để giáo viên kéo-thả đổi thứ tự; chặn onClick nổi bọt lên hàng
 * (tránh vô tình điều hướng sang trang sửa khi chỉ đang kéo-thả).
 */
export default function EditableActivityRow({ item, onDelete, dragHandleProps }) {
  const navigate = useNavigate()
  const icon = TYPE_ICON[item.type] || '📄'
  const colonIdx = item.title.indexOf(':')
  const boldPart = colonIdx === -1 ? item.title : item.title.slice(0, colonIdx + 1)
  const restPart = colonIdx === -1 ? '' : item.title.slice(colonIdx + 1)

  const goToEditor = () => navigate(`/teacher/content-items/${item.id}`)

  return (
    <div className="activity-row hoverable editable-block" onClick={goToEditor} style={{ cursor: 'pointer' }}>
      {dragHandleProps && (
        <span
          className="activity-row-drag-handle"
          title="Kéo để đổi thứ tự"
          onClick={(e) => e.stopPropagation()}
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
        >
          ⠿
        </span>
      )}
      <span className="activity-row-icon">{icon}</span>
      <span className="activity-row-title">
        <strong>{boldPart}</strong>{restPart}
      </span>

      <div className="editable-actions" style={{ position: 'static', opacity: 1, marginLeft: 'auto' }}>
        <button type="button" onClick={(e) => { e.stopPropagation(); goToEditor() }} title="Sửa">✏️</button>
        <button
          type="button"
          className="danger"
          onClick={(e) => { e.stopPropagation(); onDelete?.(item) }}
          title="Xoá"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}