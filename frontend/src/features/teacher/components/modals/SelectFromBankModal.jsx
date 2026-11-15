import { useEffect, useState } from 'react'
import {
  Search,
  CheckSquare,
  Square,
  Volume2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react'
import Modal from '@shared/components/ui/Modal.jsx'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import { getBankPart, importQuestionsFromBank } from '@teacher/api/teacherTests.js'

export default function SelectFromBankModal({ open, onClose, testId, partNo, onSuccess }) {
  const [bankData, setBankData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && partNo) {
      loadBankQuestions()
      setSelectedIds([])
      setSearch('')
      setError('')
    }
  }, [open, partNo])

  const loadBankQuestions = async () => {
    setLoading(true)
    try {
      const data = await getBankPart(partNo)
      setBankData(data)
    } catch (err) {
      console.error('Lỗi tải câu hỏi từ ngân hàng:', err)
      setError('Không thể tải ngân hàng câu hỏi cho phần này')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const questions = bankData?.questions || []
  const filteredQuestions = questions.filter((q) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      (q.promptText && q.promptText.toLowerCase().includes(term)) ||
      (q.tag && q.tag.toLowerCase().includes(term)) ||
      (q.explanation && q.explanation.toLowerCase().includes(term))
    )
  })

  const handleToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredQuestions.map((q) => q.id))
    }
  }

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const updatedPart = await importQuestionsFromBank(testId, partNo, selectedIds)
      if (onSuccess) {
        onSuccess(updatedPart)
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể thêm câu hỏi vào đề thi. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Chọn câu hỏi từ Ngân hàng câu hỏi - Part ${partNo}`}
      maxWidth={760}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div
            style={{
              background: 'var(--bad-soft)',
              color: 'var(--bad)',
              border: '1px solid var(--bad-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Toolbar: Tìm kiếm & Chọn tất cả */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Tìm theo nội dung, tag, giải thích..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 34, fontSize: 13 }}
            />
          </div>

          {filteredQuestions.length > 0 && (
            <button
              type="button"
              className="btn secondary sm"
              onClick={handleSelectAll}
              style={{ flexShrink: 0, fontSize: 12.5 }}
            >
              {selectedIds.length === filteredQuestions.length
                ? 'Bỏ chọn tất cả'
                : `Chọn tất cả (${filteredQuestions.length})`}
            </button>
          )}
        </div>

        {/* Danh sách câu hỏi */}
        <div
          style={{
            maxHeight: 420,
            overflowY: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {loading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton height={60} />
              <Skeleton height={60} />
              <Skeleton height={60} />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div
              style={{
                padding: '36px 16px',
                textAlign: 'center',
                color: 'var(--text-dim)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Database size={32} style={{ color: 'var(--text-dim)', opacity: 0.6 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                {search ? 'Không tìm thấy câu hỏi phù hợp với từ khóa' : `Chưa có câu hỏi nào trong ngân hàng Part ${partNo}`}
              </div>
              <div style={{ fontSize: 12.5, maxWidth: 400 }}>
                Bạn có thể tạo câu hỏi trực tiếp trên đề thi, hoặc thêm câu hỏi vào Ngân hàng câu hỏi cá nhân để sử dụng cho nhiều đề.
              </div>
            </div>
          ) : (
            filteredQuestions.map((q, idx) => {
              const checked = selectedIds.includes(q.id)
              return (
                <div
                  key={q.id}
                  onClick={() => handleToggle(q.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: checked ? 'var(--surface)' : 'var(--surface-2)',
                    border: checked ? '1px solid var(--accent)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ paddingTop: 2 }}>
                    {checked ? (
                      <CheckSquare size={17} style={{ color: 'var(--accent)' }} />
                    ) : (
                      <Square size={17} style={{ color: 'var(--text-dim)' }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                        Câu {idx + 1}
                      </span>
                      {q.tag && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface-3)',
                            color: 'var(--text-dim)',
                          }}
                        >
                          {q.tag}
                        </span>
                      )}
                      {q.audioUrl && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 11,
                            color: 'var(--text-dim)',
                          }}
                        >
                          <Volume2 size={12} /> Audio
                        </span>
                      )}
                      {q.imageUrl && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 11,
                            color: 'var(--text-dim)',
                          }}
                        >
                          <ImageIcon size={12} /> Ảnh
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500, marginBottom: 6, lineHeight: 1.4 }}>
                      {q.promptText || '(Không có nội dung câu hỏi)'}
                    </div>

                    {/* Hiển thị tóm tắt đáp án trắc nghiệm */}
                    {q.options && q.options.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
                        {q.options.map((opt) => (
                          <div
                            key={opt.id || opt.label}
                            style={{
                              color: opt.isCorrect ? 'var(--good)' : 'var(--text-dim)',
                              fontWeight: opt.isCorrect ? 600 : 400,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>{opt.label}.</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {opt.content}
                            </span>
                            {opt.isCorrect && <CheckCircle2 size={12} />}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.explanation && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4, fontStyle: 'italic' }}>
                        Giải thích: {q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Đã chọn: <strong style={{ color: 'var(--text)' }}>{selectedIds.length}</strong> câu hỏi
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn secondary" onClick={onClose} disabled={submitting}>
              Đóng
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={handleSubmit}
              disabled={submitting || selectedIds.length === 0}
            >
              {submitting ? 'Đang thêm...' : `Thêm vào đề thi (${selectedIds.length})`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
