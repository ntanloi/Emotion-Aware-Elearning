import { useEffect, useState } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'
import MediaUploader from '@shared/components/ui/MediaUploader.jsx'
import RichTextEditor from '@shared/components/ui/RichTextEditor.jsx'
import { COURSE_TEMPLATES } from '@shared/components/ui/editorTemplates.js'
import { useCreateCourse, useUpdateCourse } from '@teacher/hooks/useTeacherCourses.js'
import { FileText, Sparkles } from 'lucide-react'

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
    description: form.description && form.description.trim() ? form.description.trim() : null,
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
    <Modal open={open} title={isEdit ? 'Sửa khoá học' : 'Tạo khoá học mới'} onClose={onClose} width={840}>
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label>Tên khoá học *</label>
          <input type="text" value={form.title} onChange={set('title')} placeholder="VD: TOEIC 500+ Xuất phát" autoFocus />
        </div>

        <div className="field course-modal-desc-field">
          <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ margin: 0, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FileText size={16} className="text-accent" />
              <span>Mô tả & Lộ trình khóa học</span>
            </label>
            <span className="text-dim text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={13} style={{ color: 'var(--accent)' }} />
              <span>Hỗ trợ định dạng, bảng biểu, ảnh và bố cục gợi ý</span>
            </span>
          </div>
          <RichTextEditor
            templates={COURSE_TEMPLATES}
            value={form.description}
            onChange={(html) => setForm((f) => ({ ...f, description: html }))}
            placeholder="Soạn mô tả, mục tiêu đầu ra, lộ trình học và quyền lợi học viên..."
            minHeight={220}
          />
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
