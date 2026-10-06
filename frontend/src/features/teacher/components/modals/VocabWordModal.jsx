import { useEffect, useState } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'
import MediaUploader from '@shared/components/ui/MediaUploader.jsx'
import { uploadMedia } from '@shared/api/media.js'
import { useCreateVocabWord, useUpdateVocabWord } from '@teacher/hooks/useTeacherVocabWords.js'

/**
 * Các field media (image/audioUk/audioUs/example.audio) dùng MediaUploader ở chế độ
 * deferUpload=true: khi kéo-thả chỉ preview local (URL.createObjectURL), CHƯA gọi Cloudinary.
 * resolveMediaId() upload thật sự (nếu có file mới) đúng lúc bấm "Tạo từ vựng" / "Lưu thay đổi" -
 * nếu người dùng bấm Huỷ thì không có request nào lên Cloudinary cả, không cần dọn rác.
 */
const resolveMediaId = async (value, type) => {
  if (!value) return null
  if (value.id) return value.id // đã có mediaId sẵn (đang sửa từ vựng, giữ nguyên file cũ)
  if (value.file) {
    const asset = await uploadMedia(value.file, type)
    return asset.id
  }
  return null
}

const emptyForm = {
  word: '', ipa: '', partOfSpeech: '', meaningVi: '',
  image: null, audioUk: null, audioUs: null,
  examples: [], // [{ sentenceEn, sentenceVi, audio }]
}

/**
 * VocabWordModal — tạo mới hoặc sửa 1 từ vựng trong thư viện của giáo viên.
 * Đúng yêu cầu: mọi field ngoài `word`/`meaningVi` đều CÓ THỂ ĐỂ TRỐNG — không thêm ví dụ nào
 * thì mặt sau Flashcard sẽ không có phần "Ví dụ" (FlashcardCard đã tự ẩn khi examples rỗng).
 */
export default function VocabWordModal({ open, word, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false) // bao trùm cả bước upload media LẪN bước gọi API lưu từ vựng
  const isEdit = !!word
  const createWord = useCreateVocabWord()
  const updateWord = useUpdateVocabWord()
  const saving = submitting || createWord.isPending || updateWord.isPending

  useEffect(() => {
    if (!open) return
    if (word) {
      setForm({
        word: word.word || '',
        ipa: word.ipa || '',
        partOfSpeech: word.partOfSpeech || '',
        meaningVi: word.meaningVi || '',
        image: word.imageUrl ? { url: word.imageUrl, fileName: 'Ảnh hiện tại' } : null,
        audioUk: word.audioUkUrl ? { url: word.audioUkUrl, fileName: 'Audio UK hiện tại' } : null,
        audioUs: word.audioUsUrl ? { url: word.audioUsUrl, fileName: 'Audio US hiện tại' } : null,
        examples: (word.examples || []).map((ex) => ({
          sentenceEn: ex.sentenceEn, sentenceVi: ex.sentenceVi,
          audio: ex.audioUrl ? { url: ex.audioUrl, fileName: 'Audio ví dụ' } : null,
        })),
      })
    } else {
      setForm(emptyForm)
    }
    setError(null)
  }, [open, word])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const addExample = () =>
    setForm((f) => ({ ...f, examples: [...f.examples, { sentenceEn: '', sentenceVi: '', audio: null }] }))

  const updateExample = (idx, key, value) =>
    setForm((f) => ({
      ...f,
      examples: f.examples.map((ex, i) => (i === idx ? { ...ex, [key]: value } : ex)),
    }))

  const removeExample = (idx) =>
    setForm((f) => ({ ...f, examples: f.examples.filter((_, i) => i !== idx) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.word.trim() || !form.meaningVi.trim()) {
      setError('Vui lòng nhập ít nhất Từ vựng và Nghĩa tiếng Việt')
      return
    }
    // Ví dụ đã thêm thì bắt buộc đủ 2 câu (Anh + Việt) - tránh lưu ví dụ dở dang
    const invalidExample = form.examples.find((ex) => !ex.sentenceEn.trim() || !ex.sentenceVi.trim())
    if (invalidExample) {
      setError('Mỗi ví dụ đã thêm cần đủ câu tiếng Anh và tiếng Việt (hoặc xoá ví dụ đó đi)')
      return
    }

    setSubmitting(true)
    try {
      // Chỉ upload thật sự lên Cloudinary tại đây - lúc người dùng đã chắc chắn bấm lưu.
      const [imageMediaId, audioUkMediaId, audioUsMediaId, exampleAudioIds] = await Promise.all([
        resolveMediaId(form.image, 'IMAGE'),
        resolveMediaId(form.audioUk, 'AUDIO'),
        resolveMediaId(form.audioUs, 'AUDIO'),
        Promise.all(form.examples.map((ex) => resolveMediaId(ex.audio, 'AUDIO'))),
      ])

      const payload = {
        word: form.word.trim(),
        ipa: form.ipa.trim() || null,
        partOfSpeech: form.partOfSpeech.trim() || null,
        meaningVi: form.meaningVi.trim(),
        imageMediaId,
        audioUkMediaId,
        audioUsMediaId,
        examples: form.examples.map((ex, i) => ({
          sentenceEn: ex.sentenceEn.trim(),
          sentenceVi: ex.sentenceVi.trim(),
          audioMediaId: exampleAudioIds[i],
        })),
      }

      let saved
      if (isEdit) {
        saved = await updateWord.mutateAsync({ id: word.id, payload })
      } else {
        saved = await createWord.mutateAsync(payload)
      }
      onClose?.()
      onSaved?.(saved)
    } catch (err) {
      setError(err.response?.data?.error || 'Tải file lên hoặc lưu từ vựng thất bại, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Sửa từ vựng' : 'Tạo từ vựng mới'} onClose={onClose} width={620}>
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Từ vựng *</label>
            <input type="text" value={form.word} onChange={set('word')} placeholder="VD: nation" autoFocus />
          </div>
          <div className="field">
            <label>Phiên âm</label>
            <input type="text" value={form.ipa} onChange={set('ipa')} placeholder="VD: /ˈneɪʃən/" />
          </div>
          <div className="field">
            <label>Từ loại</label>
            <input type="text" value={form.partOfSpeech} onChange={set('partOfSpeech')} placeholder="VD: n." />
          </div>
        </div>

        <div className="field">
          <label>Nghĩa tiếng Việt *</label>
          <input type="text" value={form.meaningVi} onChange={set('meaningVi')} placeholder="VD: quốc gia" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Audio UK (tuỳ chọn)</label>
            <MediaUploader type="AUDIO" value={form.audioUk} onChange={(a) => setForm((f) => ({ ...f, audioUk: a }))} label="Chọn audio giọng Anh-Anh" deferUpload disabled={saving} />
          </div>
          <div className="field">
            <label>Audio US (tuỳ chọn)</label>
            <MediaUploader type="AUDIO" value={form.audioUs} onChange={(a) => setForm((f) => ({ ...f, audioUs: a }))} label="Chọn audio giọng Anh-Mỹ" deferUpload disabled={saving} />
            <div className="hint">Nên có Audio US — dùng làm nguồn cho phần Luyện nghe chép chính tả tự sinh</div>
          </div>
        </div>

        <div className="field">
          <label>Ảnh minh hoạ (tuỳ chọn)</label>
          <MediaUploader type="IMAGE" value={form.image} onChange={(a) => setForm((f) => ({ ...f, image: a }))} deferUpload disabled={saving} />
        </div>

        <div className="field">
          <div className="flex-between" style={{ marginBottom: 8 }}>
            <label style={{ margin: 0 }}>Câu ví dụ (tuỳ chọn)</label>
            <button type="button" className="btn ghost sm" onClick={addExample}>+ Thêm câu ví dụ</button>
          </div>
          {form.examples.length === 0 && (
            <p className="text-dim text-sm">Không thêm câu ví dụ nào — mặt sau Flashcard sẽ không có phần Ví dụ.</p>
          )}
          {form.examples.map((ex, idx) => (
            <div key={idx} className="card" style={{ marginBottom: 10, padding: 12 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="text-dim text-sm">Ví dụ {idx + 1}</span>
                <button type="button" className="icon-btn" onClick={() => removeExample(idx)} title="Xoá ví dụ này">🗑️</button>
              </div>
              <input
                type="text" value={ex.sentenceEn} onChange={(e) => updateExample(idx, 'sentenceEn', e.target.value)}
                placeholder="Câu tiếng Anh" className="vocab-example-input" style={{ marginBottom: 8 }}
              />
              <input
                type="text" value={ex.sentenceVi} onChange={(e) => updateExample(idx, 'sentenceVi', e.target.value)}
                placeholder="Câu dịch tiếng Việt" className="vocab-example-input" style={{ marginBottom: 8 }}
              />
              <MediaUploader type="AUDIO" value={ex.audio} onChange={(a) => updateExample(idx, 'audio', a)} label="Audio đọc câu ví dụ (tuỳ chọn)" deferUpload disabled={saving} />
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose} disabled={saving}>Huỷ</button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo từ vựng'}
          </button>
        </div>
      </form>
    </Modal>
  )
}