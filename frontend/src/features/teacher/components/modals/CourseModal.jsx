import { useEffect, useState } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'
import MediaUploader from '@shared/components/ui/MediaUploader.jsx'
import { useCreateCourse, useUpdateCourse } from '@teacher/hooks/useTeacherCourses.js'

const LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Advanced']

const emptyForm = {
  title: '',
  description: '',
  level: 'Beginner',
  durationHours: '',
  price: '',
  originalPrice: '',
  cover: null, // { id, url, fileName } | null
}

/**
 * CourseModal — tạo khoá học mới hoặc sửa khoá học đã có (props.course != null).
 * onCreated(courseDto) được gọi sau khi tạo THÀNH CÔNG để trang cha điều hướng luôn vào
 * trong khoá học vừa tạo (không bắt giáo viên bấm thêm 1 bước nào nữa).
 */
export default function CourseModal({ open, course, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)
  const isEdit = !!course
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const saving = createCourse.isPending || updateCourse.isPending

  useEffect(() => {
    if (!open) return
    if (course) {
      setForm({
        title: course.title || '',
        description: course.description || '',
        level: course.level || 'Beginner',
        durationHours: course.durationHours ?? '',
        price: course.price ?? '',
        originalPrice: course.originalPrice ?? '',
        cover: course.coverUrl ? { url: course.coverUrl, id: course.coverMediaId } : null,
      })
    } else {
      setForm(emptyForm)
    }
    setError(null)
  }, [open, course])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const buildPayload = () => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    level: form.level || null,
    durationHours: form.durationHours === '' ? null : Number(form.durationHours),
    price: form.price === '' ? null : Number(form.price),
    originalPrice: form.originalPrice === '' ? null : Number(form.originalPrice),
    coverMediaId: form.cover?.id ?? null,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) {
      setError('Vui lòng nhập tên khoá học')
      return
    }
    try {
      if (isEdit) {
        await updateCourse.mutateAsync({ id: course.id, payload: buildPayload() })
        onClose?.()
      } else {
        const created = await createCourse.mutateAsync(buildPayload())
        onClose?.()
        onCreated?.(created)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại')
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Sửa khoá học' : 'Tạo khoá học mới'} onClose={onClose} width={560}>
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label>Tên khoá học *</label>
          <input type="text" value={form.title} onChange={set('title')} placeholder="VD: TOEIC 500+ Xuất phát" autoFocus />
        </div>

        <div className="field">
          <label>Mô tả</label>
          <textarea value={form.description} onChange={set('description')} placeholder="Mô tả ngắn về khoá học..." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Trình độ</label>
            <select value={form.level} onChange={set('level')}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Thời lượng (giờ)</label>
            <input type="number" min="0" value={form.durationHours} onChange={set('durationHours')} placeholder="VD: 40" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Giá bán (đ)</label>
            <input type="number" min="0" value={form.price} onChange={set('price')} placeholder="Để trống = miễn phí" />
          </div>
          <div className="field">
            <label>Giá gốc (đ)</label>
            <input type="number" min="0" value={form.originalPrice} onChange={set('originalPrice')} placeholder="Tuỳ chọn — để hiện badge giảm giá" />
            <div className="hint">Chỉ hiện badge giảm giá nếu giá gốc lớn hơn giá bán</div>
          </div>
        </div>

        <div className="field">
          <label>Ảnh bìa khoá học</label>
          <MediaUploader type="IMAGE" value={form.cover} onChange={(asset) => setForm((f) => ({ ...f, cover: asset }))} />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose} disabled={saving}>Huỷ</button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo khoá học'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
