import { useEffect, useState } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'
import { useCreateContentItem } from '@teacher/hooks/useTeacherContentItems.js'

const TYPES = [
  { value: 'VIDEO_LECTURE', icon: '▶️', label: 'Video bài giảng', desc: 'Tải lên 1 video lý thuyết' },
  { value: 'GRAMMAR_ARTICLE', icon: '📖', label: 'Bài viết ngữ pháp', desc: 'Soạn nội dung dạng văn bản' },
  { value: 'VOCAB_SET', icon: '🗂️', label: 'Bộ từ vựng (Flashcard)', desc: 'Thêm từng thẻ từ vựng' },
  { value: 'PRACTICE_TEST', icon: '✏️', label: 'Bài luyện tập', desc: 'Soạn câu hỏi trắc nghiệm/điền từ...' },
  { value: 'DICTATION_SET', icon: '🎧', label: 'Bộ chính tả (tự sinh)', desc: 'Tự sinh từ thư viện từ vựng' },
]

/**
 * Danh sách loại hoạt động ẨN theo từng section — tuỳ ngữ cảnh mà bớt lựa chọn không phù hợp:
 *  - VOCAB (Từ vựng): mỗi Nhóm hoạt động đã tự động có sẵn 1 "Bộ từ vựng" ngay lúc tạo Nhóm
 *    (xem ContentGroupModal), nên modal này bỏ luôn Bộ từ vựng + Video bài giảng + Bài viết
 *    ngữ pháp — chỉ còn Bài luyện tập và Bộ chính tả.
 *  - GRAMMAR (Ngữ pháp) và PART1-PART7 (TOEIC Part 1-7): bỏ Bộ từ vựng + Bộ chính tả (không
 *    hợp ngữ cảnh) — còn lại Video bài giảng, Bài viết ngữ pháp, Bài luyện tập. KHÔNG áp cứng
 *    gì ở bước tạo Nhóm hoạt động (khác với VOCAB) — giáo viên tự chọn loại hoạt động cho từng
 *    nội dung như bình thường.
 *  - DICTATION (Luyện nghe chép chính tả): mỗi Nhóm hoạt động đã tự động có sẵn 1 "Bộ chính tả
 *    (tự sinh)" ngay lúc tạo Nhóm (xem ContentGroupModal), nên modal này bỏ hết 4 loại còn lại
 *    (Video bài giảng, Bài viết ngữ pháp, Bộ từ vựng, Bài luyện tập) — chỉ còn duy nhất Bộ
 *    chính tả (tự sinh), khớp với việc section này chỉ có đúng 1 loại hoạt động.
 */
const NON_VOCAB_TYPES = new Set(['VOCAB_SET', 'DICTATION_SET'])
const HIDDEN_TYPES_BY_SECTION = {
  VOCAB: new Set(['VIDEO_LECTURE', 'GRAMMAR_ARTICLE', 'VOCAB_SET']),
  GRAMMAR: NON_VOCAB_TYPES,
  PART1: NON_VOCAB_TYPES,
  PART2: NON_VOCAB_TYPES,
  PART3: NON_VOCAB_TYPES,
  PART4: NON_VOCAB_TYPES,
  PART5: NON_VOCAB_TYPES,
  PART6: NON_VOCAB_TYPES,
  PART7: NON_VOCAB_TYPES,
  DICTATION: new Set(['VIDEO_LECTURE', 'GRAMMAR_ARTICLE', 'VOCAB_SET', 'PRACTICE_TEST']),
}

/**
 * ContentItemTypeModal — bước 1: chọn 1 trong các loại hoạt động (danh sách tuỳ theo section);
 * bước 2: nhập tiêu đề (+ giới hạn thời gian nếu là Bài luyện tập). Tạo xong gọi onCreated(item)
 * để trang cha điều hướng THẲNG vào trang soạn nội dung tương ứng — không quay lại danh sách trước.
 */
export default function ContentItemTypeModal({ open, courseId, groupId, section, onClose, onCreated }) {
  const [type, setType] = useState(null)
  const [title, setTitle] = useState('')
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('')
  const [error, setError] = useState(null)
  const createItem = useCreateContentItem(courseId, section)
  const hidden = HIDDEN_TYPES_BY_SECTION[section]
  const visibleTypes = hidden ? TYPES.filter((t) => !hidden.has(t.value)) : TYPES

  useEffect(() => {
    if (!open) return
    setType(null)
    setTitle('')
    setTimeLimitMinutes('')
    setError(null)
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề hoạt động')
      return
    }
    setError(null)
    try {
      const created = await createItem.mutateAsync({
        groupId: groupId || null,
        type,
        title: title.trim(),
        timeLimitMinutes: timeLimitMinutes === '' ? null : Number(timeLimitMinutes),
      })
      onClose?.()
      onCreated?.(created)
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại')
    }
  }

  return (
    <Modal
      open={open}
      title={type ? 'Thông tin hoạt động' : 'Chọn loại hoạt động'}
      onClose={onClose}
      width={560}
    >
      {!type && (
        <div className="type-option-grid">
          {visibleTypes.map((t) => (
            <button key={t.value} type="button" className="type-option-card" onClick={() => setType(t.value)}>
              <span className="type-option-icon">{t.icon}</span>
              <span className="type-option-label">{t.label}</span>
              <span className="type-option-desc">{t.desc}</span>
            </button>
          ))}
        </div>
      )}

      {type && (
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <button type="button" className="text-dim text-sm" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }} onClick={() => setType(null)}>
            ← Đổi loại hoạt động ({TYPES.find((t) => t.value === type)?.label})
          </button>

          <div className="field">
            <label>Tiêu đề hoạt động *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'VOCAB_SET' ? 'VD: Danh từ - Bộ từ vựng cơ bản' : 'VD: Video bài giảng: Lý thuyết (phần 1)'}
              autoFocus
            />
          </div>

          {type === 'PRACTICE_TEST' && (
            <div className="field">
              <label>Giới hạn thời gian (phút)</label>
              <input
                type="number"
                min="0"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value)}
                placeholder="Để trống = không giới hạn"
              />
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn secondary" onClick={onClose} disabled={createItem.isPending}>Huỷ</button>
            <button type="submit" className="btn" disabled={createItem.isPending}>
              {createItem.isPending ? 'Đang tạo...' : 'Tạo & bắt đầu soạn'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}