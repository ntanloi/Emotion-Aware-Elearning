import { useState } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'

/**
 * ConfirmDeleteModal — dùng chung cho MỌI hành động xoá của giáo viên (Unit, Nhóm hoạt động,
 * hoạt động con, câu hỏi, từ vựng...). `onConfirm` có thể là async — nút Xoá tự khoá lại và
 * hiện lỗi rõ ràng nếu backend từ chối (VD: xoá Nhóm còn hoạt động con bên trong).
 */
export default function ConfirmDeleteModal({ open, title, description, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const handleConfirm = async () => {
    setDeleting(true)
    setError(null)
    try {
      await onConfirm()
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể xoá — vui lòng thử lại')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal open={open} title={title || 'Xác nhận xoá'} onClose={onClose} width={420}>
      {error && <div className="form-error">{error}</div>}
      <p className="text-dim">{description || 'Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xoá?'}</p>
      <div className="modal-footer">
        <button type="button" className="btn secondary" onClick={onClose} disabled={deleting}>Huỷ</button>
        <button type="button" className="btn danger" onClick={handleConfirm} disabled={deleting}>
          {deleting ? 'Đang xoá...' : 'Xoá'}
        </button>
      </div>
    </Modal>
  )
}
