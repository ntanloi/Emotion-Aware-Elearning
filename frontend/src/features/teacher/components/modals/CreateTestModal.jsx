import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, CheckSquare, Square, X, AlertCircle } from 'lucide-react'
import Modal from '@shared/components/ui/Modal.jsx'
import { createCustomTest } from '@teacher/api/teacherTests.js'

const TOEIC_PARTS = [
  { no: 1, name: 'Part 1: Mô tả hình ảnh (Photographs)', type: 'listening' },
  { no: 2, name: 'Part 2: Hỏi & Đáp (Question - Response)', type: 'listening' },
  { no: 3, name: 'Part 3: Đoạn hội thoại (Short Conversations)', type: 'listening' },
  { no: 4, name: 'Part 4: Bài nói ngắn (Short Talks)', type: 'listening' },
  { no: 5, name: 'Part 5: Hoàn thành câu (Incomplete Sentences)', type: 'reading' },
  { no: 6, name: 'Part 6: Điền đoạn văn (Text Completion)', type: 'reading' },
  { no: 7, name: 'Part 7: Đọc hiểu văn bản (Reading Comprehension)', type: 'reading' },
]

export default function CreateTestModal({ open, onClose, onSuccess }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listeningMinutes, setListeningMinutes] = useState(45)
  const [readingMinutes, setReadingMinutes] = useState(75)
  const [selectedParts, setSelectedParts] = useState([1, 2, 3, 4, 5, 6, 7])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleTogglePart = (partNo) => {
    setSelectedParts((prev) =>
      prev.includes(partNo) ? prev.filter((p) => p !== partNo) : [...prev, partNo].sort((a, b) => a - b)
    )
  }

  const handleSelectAll = () => setSelectedParts([1, 2, 3, 4, 5, 6, 7])
  const handleSelectListening = () => setSelectedParts([1, 2, 3, 4])
  const handleSelectReading = () => setSelectedParts([5, 6, 7])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề đề thi')
      return
    }

    if (selectedParts.length === 0) {
      setError('Vui lòng chọn ít nhất một phần thi (Part)')
      return
    }

    setSubmitting(true)
    try {
      const created = await createCustomTest({
        title: title.trim(),
        description: description.trim() || null,
        listeningMinutes: Number(listeningMinutes) || 45,
        readingMinutes: Number(readingMinutes) || 75,
        selectedParts,
      })

      if (onSuccess) {
        onSuccess(created)
      }
      onClose()
      navigate(`/teacher/tests/${created.id}/builder`)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo đề thi. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Tạo đề thi mới" width={700}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {error && (
          <div
            style={{
              background: 'var(--bad-soft)',
              color: 'var(--bad)',
              border: '1px solid var(--bad-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: 13.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
            Tiêu đề đề thi <span style={{ color: 'var(--bad)' }}>*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="Ví dụ: Đề thi thử TOEIC Format mới 2026 - Test 01"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
            Mô tả đề thi (tùy chọn)
          </label>
          <textarea
            className="input"
            rows={2}
            placeholder="Mô tả mục tiêu, độ khó hoặc lưu ý dành cho học viên khi làm đề..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
              Thời gian Nghe (phút)
            </label>
            <input
              type="number"
              min={0}
              max={180}
              className="input"
              value={listeningMinutes}
              onChange={(e) => setListeningMinutes(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
              Thời gian Đọc (phút)
            </label>
            <input
              type="number"
              min={0}
              max={180}
              className="input"
              value={readingMinutes}
              onChange={(e) => setReadingMinutes(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
              Cấu hình các phần thi (Part) <span style={{ color: 'var(--bad)' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn xs secondary"
                onClick={handleSelectAll}
                style={{ fontSize: 11.5, padding: '3px 8px' }}
              >
                Cả 7 Part
              </button>
              <button
                type="button"
                className="btn xs secondary"
                onClick={handleSelectListening}
                style={{ fontSize: 11.5, padding: '3px 8px' }}
              >
                Chỉ Listening
              </button>
              <button
                type="button"
                className="btn xs secondary"
                onClick={handleSelectReading}
                style={{ fontSize: 11.5, padding: '3px 8px' }}
              >
                Chỉ Reading
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: 8,
              background: 'var(--surface-2)',
              padding: 12,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            {TOEIC_PARTS.map((p) => {
              const checked = selectedParts.includes(p.no)
              return (
                <div
                  key={p.no}
                  onClick={() => handleTogglePart(p.no)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: checked ? 'var(--surface)' : 'transparent',
                    border: checked ? '1px solid var(--accent-soft)' : '1px solid transparent',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {checked ? (
                    <CheckSquare size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  ) : (
                    <Square size={17} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 13, color: checked ? 'var(--text)' : 'var(--text-dim)', fontWeight: checked ? 600 : 400 }}>
                    {p.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button type="button" className="btn secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? 'Đang tạo...' : 'Tạo đề thi'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
