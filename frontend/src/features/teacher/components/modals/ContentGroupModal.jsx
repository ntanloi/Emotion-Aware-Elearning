import { useEffect, useState } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'
import { useCreateContentGroup, useRenameContentGroup } from '@teacher/hooks/useTeacherContentGroups.js'
import { useCreateContentItem } from '@teacher/hooks/useTeacherContentItems.js'

/**
 * ContentGroupModal — tạo hoặc đổi tên 1 Nhóm hoạt động (vd "Danh từ") trực tiếp trong 1
 * mục sidebar (courseId + sectionCode, không còn tầng "Đơn vị" trung gian). Chỉ có 1 field
 * title.
 *
 * Riêng vài section "áp cứng" 1 loại hoạt động duy nhất: mỗi Nhóm hoạt động MỚI tạo trong các
 * section này sẽ tự động có sẵn 1 hoạt động tương ứng bên trong luôn — giáo viên không cần vào
 * modal "Chọn loại hoạt động" để tạo tay nữa (modal đó với các section này cũng chỉ còn đúng
 * 1 lựa chọn tương ứng, xem ContentItemTypeModal). Chỉ áp dụng lúc TẠO MỚI nhóm, không áp dụng
 * khi đổi tên nhóm.
 *  - VOCAB (Từ vựng)              -> tự tạo VOCAB_SET (Bộ từ vựng)
 *  - DICTATION (Luyện nghe chính tả) -> tự tạo DICTATION_SET (Bộ chính tả tự sinh)
 */
const AUTO_ITEM_TYPE_BY_SECTION = {
  VOCAB: 'VOCAB_SET',
  DICTATION: 'DICTATION_SET',
}

export default function ContentGroupModal({ open, courseId, section, group, onClose }) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState(null)
  const isEdit = !!group
  const createGroup = useCreateContentGroup(courseId, section)
  const renameGroup = useRenameContentGroup(courseId, section)
  const createItem = useCreateContentItem(courseId, section)
  const saving = createGroup.isPending || renameGroup.isPending || createItem.isPending

  useEffect(() => {
    if (!open) return
    setTitle(group?.title || '')
    setError(null)
  }, [open, group])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Vui lòng nhập tên Nhóm hoạt động')
      return
    }
    setError(null)
    try {
      if (isEdit) {
        await renameGroup.mutateAsync({ groupId: group.id, title: title.trim() })
      } else {
        const newGroup = await createGroup.mutateAsync(title.trim())
        const autoType = AUTO_ITEM_TYPE_BY_SECTION[section]
        if (autoType) {
          // Tạo sẵn 1 hoạt động mặc định trong Nhóm vừa tạo, cùng tên với Nhóm cho dễ nhận biết.
          await createItem.mutateAsync({
            groupId: newGroup.id,
            type: autoType,
            title: title.trim(),
            timeLimitMinutes: null,
          })
        }
      }
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại')
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Sửa tên Nhóm hoạt động' : 'Thêm Nhóm hoạt động'} onClose={onClose} width={420}>
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label>Tên Nhóm hoạt động *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Danh từ, Kiến thức cơ bản 2: mệnh đề và câu..."
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose} disabled={saving}>Huỷ</button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo Nhóm'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
