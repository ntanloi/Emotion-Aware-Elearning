import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import EditableActivityRow from './EditableActivityRow.jsx'

/**
 * SortableActivityRow — bọc EditableActivityRow bằng useSortable (@dnd-kit/sortable) để giáo
 * viên kéo-thả đổi thứ tự hoạt động trong 1 Nhóm hoạt động (hoặc trong danh sách hoạt động lẻ).
 * Chỉ tay cầm "⠿" (dragHandleProps) mới nhận listeners kéo-thả — click vào phần còn lại của
 * hàng vẫn điều hướng sang trang sửa như cũ, không bị xung đột.
 */
export default function SortableActivityRow({ item, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 'auto',
    position: 'relative',
  }

  return (
    <div ref={setNodeRef} style={style}>
      <EditableActivityRow item={item} onDelete={onDelete} dragHandleProps={{ attributes, listeners }} />
    </div>
  )
}