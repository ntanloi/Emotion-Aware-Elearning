import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Modal dùng chung cho MỌI form của giáo viên (tạo Unit, tạo Nhóm hoạt động, tạo từ vựng,
 * tạo câu hỏi...). Bấm nền tối hoặc phím Esc để đóng (trừ khi đang submit).
 */
export default function Modal({ open, title, onClose, children, width = 480 }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 99999 }} onMouseDown={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth: width, zIndex: 100000 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  )
}
