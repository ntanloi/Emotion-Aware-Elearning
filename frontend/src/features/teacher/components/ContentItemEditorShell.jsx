import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUpdateContentItem } from '@teacher/hooks/useTeacherContentItems.js'

/**
 * ContentItemEditorShell — khung dùng chung cho cả 5 loại Editor (Video/Ngữ pháp/Từ vựng/
 * Luyện tập/Chính tả): nút quay lại + tiêu đề có thể bấm để sửa tại chỗ (inline rename).
 * Mỗi Editor cụ thể chỉ cần lo phần nội dung riêng (children).
 */
export default function ContentItemEditorShell({ item, children }) {
  const navigate = useNavigate()
  const updateItem = useUpdateContentItem(item.courseId, item.sectionCode)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(item.title)

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

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px' }}>
      <button
        type="button"
        className="text-dim text-sm"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onClick={() => navigate(-1)}
      >
        ← Quay lại
      </button>

      <div className="mt-16 flex-row" style={{ gap: 10 }}>
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
              fontSize: 22, fontWeight: 700, padding: '4px 8px', flex: 1,
              border: '1px solid var(--border)', borderRadius: 6,
            }}
          />
        ) : (
          <h2
            style={{ margin: 0, cursor: 'text' }}
            onClick={() => setEditingTitle(true)}
            title="Bấm để sửa tiêu đề"
          >
            {item.title} <span className="text-dim text-sm">✏️</span>
          </h2>
        )}
        {updateItem.isPending && <span className="text-dim text-sm">Đang lưu...</span>}
      </div>

      <div className="mt-24">{children}</div>
    </div>
  )
}
