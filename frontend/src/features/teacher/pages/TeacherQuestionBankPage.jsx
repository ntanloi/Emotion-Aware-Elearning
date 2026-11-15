import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Database,
  Plus,
  Trash2,
  Edit2,
  Search,
  Volume2,
  Image as ImageIcon,
  CheckCircle2,
  FileCheck,
  BookOpen,
  AlertCircle,
  X,
} from 'lucide-react'
import { getBankPart, getBankSummary, deleteBankQuestion } from '@teacher/api/teacherTests.js'
import QuestionModal from '@teacher/components/modals/QuestionModal.jsx'
import PassageModal from '@teacher/components/modals/PassageModal.jsx'
import ImportFromCourseModal from '@teacher/components/modals/ImportFromCourseModal.jsx'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import EmptyState from '@shared/components/ui/EmptyState.jsx'

const PART_NAMES = {
  1: 'Part 1: Mô tả hình ảnh (Photographs)',
  2: 'Part 2: Hỏi & Đáp (Question - Response)',
  3: 'Part 3: Đoạn hội thoại (Short Conversations)',
  4: 'Part 4: Bài nói ngắn (Short Talks)',
  5: 'Part 5: Hoàn thành câu (Incomplete Sentences)',
  6: 'Part 6: Điền đoạn văn (Text Completion)',
  7: 'Part 7: Đọc hiểu văn bản (Reading Comprehension)',
}

export default function TeacherQuestionBankPage({ embedded = false }) {
  const [activePartNo, setActivePartNo] = useState(1)
  const [bankData, setBankData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [notification, setNotification] = useState('')

  // Modals
  const [openQuestionModal, setOpenQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [openPassageModal, setOpenPassageModal] = useState(false)
  const [editingPassage, setEditingPassage] = useState(null)
  const [openImportModal, setOpenImportModal] = useState(false)

  useEffect(() => {
    loadSummary()
  }, [])

  useEffect(() => {
    loadPartData(activePartNo)
  }, [activePartNo])

  const loadSummary = async () => {
    try {
      const data = await getBankSummary()
      setSummary(data)
    } catch (err) {
      console.error('Lỗi tải tóm tắt ngân hàng câu hỏi:', err)
    }
  }

  const loadPartData = async (partNo) => {
    setLoading(true)
    try {
      const data = await getBankPart(partNo)
      setBankData(data)
    } catch (err) {
      console.error('Lỗi tải dữ liệu ngân hàng:', err)
      alert(err.response?.data?.message || 'Không thể tải ngân hàng câu hỏi')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (questionId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng câu hỏi?')) return
    try {
      await deleteBankQuestion(questionId)
      await loadPartData(activePartNo)
      await loadSummary()
      setNotification('Đã xóa câu hỏi khỏi ngân hàng câu hỏi')
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa câu hỏi')
    }
  }

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

  const isPassagePart = [3, 4, 6, 7].includes(activePartNo)

  return (
    <div style={embedded ? { width: '100%' } : { maxWidth: 1100, margin: '0 auto', padding: '24px 16px 48px' }}>
      {/* Header */}
      {!embedded && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>
              Ngân hàng câu hỏi cá nhân
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Kho lưu trữ câu hỏi riêng của bạn, dùng để chọn và đưa vào các đề thi tùy chỉnh bất cứ lúc nào.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              to="/teacher/tests"
              className="btn secondary sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <FileCheck size={15} />
              <span>Quản lý đề thi</span>
            </Link>
          </div>
        </div>
      )}

      {/* Thông báo */}
      {notification && (
        <div
          style={{
            background: 'var(--good-soft)',
            color: 'var(--good)',
            border: '1px solid var(--good-border)',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13.5,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Tabs Part 1 - 7 */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border)',
          marginBottom: 20,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7].map((partNo) => {
          const isActive = partNo === activePartNo
          const count = summary?.questionCountByPart?.[partNo] ?? 0
          return (
            <button
              key={partNo}
              type="button"
              onClick={() => setActivePartNo(partNo)}
              style={{
                background: isActive ? 'var(--surface)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '10px 16px',
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--accent)' : 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Part {partNo}</span>
              <span
                style={{
                  fontSize: 11.5,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: isActive ? 'var(--accent-soft)' : 'var(--surface-3)',
                  color: isActive ? 'var(--accent)' : 'var(--text-dim)',
                  fontWeight: 600,
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Section nội dung Part đang chọn */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>
              {PART_NAMES[activePartNo]}
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Đang có <strong>{questions.length}</strong> câu hỏi đã lưu trong phần này
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isPassagePart && (
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => {
                  setEditingPassage(null)
                  setOpenPassageModal(true)
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
              >
                <Plus size={14} />
                <span>Thêm đoạn văn</span>
              </button>
            )}

            <button
              type="button"
              className="btn secondary sm"
              onClick={() => setOpenImportModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
            >
              <BookOpen size={14} />
              <span>Thêm từ khóa học</span>
            </button>

            <button
              type="button"
              className="btn primary sm"
              onClick={() => {
                setEditingQuestion(null)
                setOpenQuestionModal(true)
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
            >
              <Plus size={14} />
              <span>Thêm câu hỏi vào ngân hàng</span>
            </button>
          </div>
        </div>

        {/* Thanh tìm kiếm đồng bộ */}
        {questions.length > 0 && (
          <div className="teacher-search-box" style={{ maxWidth: 420 }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm câu hỏi trong phần này..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-btn"
                title="Xóa tìm kiếm"
                onClick={() => setSearch('')}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Danh sách câu hỏi */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton height={80} />
            <Skeleton height={80} />
            <Skeleton height={80} />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '48px 20px',
              textAlign: 'center',
            }}
          >
            <EmptyState
              title={search ? 'Không tìm thấy câu hỏi phù hợp' : `Chưa có câu hỏi nào trong ngân hàng Part ${activePartNo}`}
              description="Hãy thêm các câu hỏi vào ngân hàng câu hỏi để dễ dàng tái sử dụng khi tạo đề thi mới."
              action={
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() => {
                      setEditingQuestion(null)
                      setOpenQuestionModal(true)
                    }}
                  >
                    Thêm câu hỏi ngay
                  </button>
                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={() => setOpenImportModal(true)}
                  >
                    Thêm từ khóa học
                  </button>
                </div>
              }
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredQuestions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--accent)',
                        background: 'var(--accent-soft)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      Câu {idx + 1}
                    </span>
                    {q.tag && (
                      <span
                        style={{
                          fontSize: 11.5,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface-3)',
                          color: 'var(--text-dim)',
                        }}
                      >
                        {q.tag}
                      </span>
                    )}
                    {q.audioUrl && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}>
                        <Volume2 size={13} /> Có audio
                      </span>
                    )}
                    {q.imageUrl && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}>
                        <ImageIcon size={13} /> Có ảnh
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn xs secondary"
                      title="Sửa câu hỏi"
                      onClick={() => {
                        setEditingQuestion(q)
                        setOpenQuestionModal(true)
                      }}
                      style={{ padding: '4px 8px' }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn xs secondary"
                      title="Xóa khỏi ngân hàng"
                      onClick={() => handleDelete(q.id)}
                      style={{ padding: '4px 8px', color: 'var(--bad)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: 14.5, color: 'var(--text)', fontWeight: 500, lineHeight: 1.5 }}>
                  {q.promptText || '(Không có tiêu đề)'}
                </div>

                {q.options && q.options.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    {q.options.map((opt) => (
                      <div
                        key={opt.id || opt.label}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: opt.isCorrect ? 'var(--good-soft)' : 'var(--surface-2)',
                          border: opt.isCorrect ? '1px solid var(--good-border)' : '1px solid var(--border)',
                          color: opt.isCorrect ? 'var(--good)' : 'var(--text)',
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontWeight: opt.isCorrect ? 600 : 400,
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{opt.label}.</span>
                        <span style={{ flex: 1 }}>{opt.content}</span>
                        {opt.isCorrect && <CheckCircle2 size={14} style={{ color: 'var(--good)' }} />}
                      </div>
                    ))}
                  </div>
                )}

                {q.explanation && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--text-dim)',
                      background: 'var(--surface-2)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      marginTop: 4,
                    }}
                  >
                    <strong>Giải thích:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal thêm/sửa câu hỏi */}
      {openQuestionModal && bankData && (
        <QuestionModal
          open={openQuestionModal}
          contentItemId={bankData.contentItemId}
          passages={bankData.passages || []}
          question={editingQuestion}
          onClose={() => {
            setOpenQuestionModal(false)
            setEditingQuestion(null)
            loadPartData(activePartNo)
            loadSummary()
          }}
        />
      )}

      {/* Modal thêm/sửa bài đọc */}
      {openPassageModal && bankData && (
        <PassageModal
          open={openPassageModal}
          contentItemId={bankData.contentItemId}
          passage={editingPassage}
          onClose={() => {
            setOpenPassageModal(false)
            setEditingPassage(null)
            loadPartData(activePartNo)
          }}
        />
      )}

      {/* Modal thêm câu hỏi từ khóa học */}
      {openImportModal && (
        <ImportFromCourseModal
          open={openImportModal}
          partNo={activePartNo}
          onClose={() => setOpenImportModal(false)}
          onSuccess={(updatedPart, count) => {
            loadPartData(activePartNo)
            loadSummary()
            setNotification(`Đã thêm thành công ${count} câu hỏi từ khóa học vào ngân hàng Part ${activePartNo}`)
          }}
        />
      )}
    </div>
  )
}
