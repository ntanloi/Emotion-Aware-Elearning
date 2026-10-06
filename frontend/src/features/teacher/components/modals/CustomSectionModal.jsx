import { useEffect, useState } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'
import { useCreateCustomSection, useUpdateCustomSection } from '@teacher/hooks/useCustomSections.js'

// Một số icon gợi ý để giáo viên chọn nhanh
const ICON_SUGGESTIONS = ['📌', '📚', '📝', '🎯', '💡', '🔖', '📋', '🗂️', '✏️', '🧩', '🌟', '📊']

/**
 * CustomSectionModal — tạo hoặc sửa 1 mục nội dung tùy chỉnh trong sidebar khóa học.
 * Props:
 *  - open, onClose
 *  - courseId: string
 *  - section: object | null  — null = tạo mới, có object = sửa
 */
export default function CustomSectionModal({ open, courseId, section, onClose }) {
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('📌')
  const [error, setError] = useState(null)

  const isEdit = !!section
  const create = useCreateCustomSection(courseId)
  const update = useUpdateCustomSection(courseId)
  const saving = create.isPending || update.isPending

  useEffect(() => {
    if (!open) return
    setTitle(section?.title || '')
    setIcon(section?.icon || '📌')
    setError(null)
  }, [open, section])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Vui lòng nhập tên mục nội dung')
      return
    }
    setError(null)
    try {
      if (isEdit) {
        await update.mutateAsync({ id: section.id, payload: { title: title.trim(), icon } })
      } else {
        await create.mutateAsync({ title: title.trim(), icon })
      }
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại')
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Sửa mục nội dung' : 'Thêm mục nội dung khóa học'}
      onClose={onClose}
      width={440}
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label>Icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {ICON_SUGGESTIONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                style={{
                  width: 40, height: 40, fontSize: 20, borderRadius: 8,
                  border: `2px solid ${icon === ic ? 'var(--accent)' : 'var(--border)'}`,
                  background: icon === ic ? 'var(--accent-soft)' : 'var(--surface-2)',
                  cursor: 'pointer',
                }}
              >
                {ic}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="Hoặc nhập emoji tùy chọn..."
            maxLength={10}
            style={{ marginBottom: 0 }}
          />
        </div>

        <div className="field">
          <label>Tên mục *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Luyện đề thi thử, Bổ sung kiến thức..."
            autoFocus
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose} disabled={saving}>
            Huỷ
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm mục'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
