import { useEffect, useState } from 'react'
import {
  BookOpen,
  Search,
  CheckSquare,
  Square,
  Volume2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react'
import Modal from '@shared/components/ui/Modal.jsx'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import { useMyCourses } from '@shared/hooks/useCourses.js'
import {
  getCandidateQuestionsFromCourse,
  importQuestionsFromCourse,
} from '@teacher/api/teacherTests.js'

export default function ImportFromCourseModal({ open, onClose, partNo, onSuccess }) {
  const { data: courses, isLoading: coursesLoading } = useMyCourses()
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [questions, setQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Tự động chọn khóa học đầu tiên khi danh sách khóa học tải xong
  useEffect(() => {
    if (open) {
      setError('')
      setSelectedIds([])
      setSearch('')
      if (courses && courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courses[0].id)
      }
    }
  }, [open, courses])

  // Tải danh sách câu hỏi khi chọn khóa học hoặc khi mở modal
  useEffect(() => {
    if (open && selectedCourseId && partNo) {
      loadCourseQuestions(selectedCourseId, partNo)
    } else {
      setQuestions([])
    }
  }, [open, selectedCourseId, partNo])

  const loadCourseQuestions = async (courseId, pNo) => {
    setLoadingQuestions(true)
    setError('')
    setSelectedIds([])
    try {
      const data = await getCandidateQuestionsFromCourse(courseId, pNo)
      setQuestions(data || [])
    } catch (err) {
      console.error('Lỗi tải câu hỏi từ khóa học:', err)
      setError(err.response?.data?.message || 'Không thể tải câu hỏi từ khóa học đã chọn')
      setQuestions([])
    } finally {
      setLoadingQuestions(false)
    }
  }

  if (!open) return null

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
      const updatedPart = await importQuestionsFromCourse(partNo, selectedIds)
      if (onSuccess) {
        onSuccess(updatedPart, selectedIds.length)
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể nhập câu hỏi vào ngân hàng. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Thêm câu hỏi từ Khóa học vào Ngân hàng - Part ${partNo}`}
      maxWidth={780}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

        {/* Bước 1: Chọn Khóa học */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
            Chọn khóa học nguồn
          </label>
          <div style={{ position: 'relative' }}>
            <select
              className="input"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={coursesLoading || submitting}
              style={{ fontSize: 13.5 }}
            >
              {coursesLoading && <option>Đang tải danh sách khóa học...</option>}
              {!coursesLoading && (!courses || courses.length === 0) && (
                <option value="">Bạn chưa có khóa học nào</option>
              )}
              {(courses || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.level || 'TOEIC'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Thanh tìm kiếm & chọn tất cả */}
        {questions.length > 0 && (
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
                placeholder="Tìm câu hỏi theo nội dung, tag, giải thích..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 34, fontSize: 13 }}
              />
            </div>

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
          </div>
        )}

        {/* Danh sách câu hỏi có thể thêm */}
        <div
          style={{
            maxHeight: 380,
            overflowY: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {loadingQuestions ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton height={60} />
              <Skeleton height={60} />
              <Skeleton height={60} />
            </div>
          ) : !selectedCourseId ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              Vui lòng chọn một khóa học để xem danh sách câu hỏi.
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
              <BookOpen size={30} style={{ opacity: 0.6 }} />
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                {search
                  ? 'Không tìm thấy câu hỏi phù hợp với từ khóa'
                  : `Khóa học này chưa có câu hỏi nào thuộc Part ${partNo}`}
              </div>
              <div style={{ fontSize: 12, maxWidth: 420 }}>
                Các câu hỏi thuộc phần thi Part {partNo} trong khóa học đã chọn sẽ xuất hiện ở đây để bạn sao chép vào ngân hàng.
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

                    {/* Hiển thị tóm tắt đáp án */}
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
              {submitting ? 'Đang thêm...' : `Thêm vào ngân hàng (${selectedIds.length})`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
