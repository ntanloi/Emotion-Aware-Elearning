import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Volume2,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  RotateCcw,
  Bot,
  Tag,
  Layers,
  FileText,
  GraduationCap,
} from 'lucide-react'
import { useChatStore } from '@student/stores/useChatStore.js'

/**
 * Phân biệt câu hỏi bắt nguồn từ Đề thi TOEIC hay Khóa học:
 * - Nếu courseTitle khớp với bất kỳ khóa học đã đăng ký của học viên -> Chắc chắn là Khóa học.
 * - Chỉ các đề thi độc lập trong Thư viện đề thi TOEIC mới có courseTitle chứa "Kho chứa đề" (container ẩn của hệ thống/giáo viên).
 * - Mặc định mọi câu khác đều là bài luyện tập thuộc Khóa học.
 */
export function isExamTestQuestion(q, enrolledCourses = []) {
  if (!q) return false
  const courseTitle = (q.courseTitle || '').trim().toLowerCase()

  // 1. Kiểm tra đối chiếu với danh sách các khóa học học viên đã đăng ký
  if (Array.isArray(enrolledCourses) && enrolledCourses.length > 0) {
    const isEnrolled = enrolledCourses.some((c) => {
      if (!c || !c.title) return false
      return c.title.trim().toLowerCase() === courseTitle
    })
    if (isEnrolled) {
      return false
    }
  }

  // 2. Các đề thi TOEIC trong Thư viện đề thi luôn nằm trong container ẩn "Kho chứa đề TOEIC..."
  if (courseTitle.includes('kho chứa đề') || courseTitle.includes('kho chua de')) {
    return true
  }

  // 3. Mặc định là câu thuộc Khóa học
  return false
}

/**
 * Trích xuất thông tin nguồn câu hỏi chuẩn xác để hiển thị nhãn và tên
 */
export function getQuestionSourceInfo(q, enrolledCourses = []) {
  const isTest = isExamTestQuestion(q, enrolledCourses)
  if (isTest) {
    let testName = q.contentItemTitle || 'Đề thi TOEIC'
    // Ví dụ: "Part 1 - Mô tả tranh (ETS TOEIC 2024 - Full Test 01)" -> lấy tên đề trong ngoặc
    const match = testName.match(/\(([^)]+)\)/)
    if (match) {
      testName = match[1]
    } else if (testName.includes(' - Part')) {
      testName = testName.split(' - Part')[0]
    }
    return {
      isTest: true,
      badgeText: 'Đề thi TOEIC',
      badgeBg: 'rgba(99, 102, 241, 0.12)',
      badgeColor: '#4f46e5',
      sourceTitle: testName,
      partTitle: q.sectionCode || 'TOEIC Part',
    }
  }

  return {
    isTest: false,
    badgeText: 'Khóa học',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeColor: '#059669',
    sourceTitle: q.courseTitle || 'Khóa học',
    partTitle: q.contentItemTitle || q.sectionCode || 'Bài luyện tập',
  }
}

export default function WrongQuestionsNotebook({
  wrongQuestions = [],
  enrolledCourses = [],
  onRefresh,
}) {
  const navigate = useNavigate()
  const [sourceFilter, setSourceFilter] = useState('all') // 'all' | 'courses' | 'tests'
  const [selectedTag, setSelectedTag] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [expandedExplanations, setExpandedExplanations] = useState({})

  // Đếm số lượng theo nguồn
  const testsCount = useMemo(() => {
    return wrongQuestions.filter((q) => isExamTestQuestion(q, enrolledCourses)).length
  }, [wrongQuestions, enrolledCourses])

  const coursesCount = useMemo(() => {
    return wrongQuestions.filter((q) => !isExamTestQuestion(q, enrolledCourses)).length
  }, [wrongQuestions, enrolledCourses])

  // Lấy danh sách Tag duy nhất
  const availableTags = useMemo(() => {
    const tags = new Set()
    wrongQuestions.forEach((q) => {
      if (q.tag) tags.add(q.tag)
    })
    return Array.from(tags)
  }, [wrongQuestions])

  // Lọc câu hỏi theo Nguồn (Khóa học / Đề thi), Tag và Keyword tìm kiếm
  const filteredQuestions = useMemo(() => {
    return wrongQuestions.filter((q) => {
      const isTest = isExamTestQuestion(q, enrolledCourses)
      if (sourceFilter === 'courses' && isTest) return false
      if (sourceFilter === 'tests' && !isTest) return false
      if (selectedTag && q.tag !== selectedTag) return false
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase()
        const matchPrompt = q.promptText && q.promptText.toLowerCase().includes(kw)
        const matchTag = q.tag && q.tag.toLowerCase().includes(kw)
        const matchTitle = q.contentItemTitle && q.contentItemTitle.toLowerCase().includes(kw)
        const matchCourse = q.courseTitle && q.courseTitle.toLowerCase().includes(kw)
        if (!matchPrompt && !matchTag && !matchTitle && !matchCourse) return false
      }
      return true
    })
  }, [wrongQuestions, enrolledCourses, sourceFilter, selectedTag, searchKeyword])

  const toggleExplanation = (questionId) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }))
  }

  const handleRetryLesson = (contentItemId) => {
    if (contentItemId) {
      navigate(`/content-items/${contentItemId}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Bộ lọc Sổ câu sai */}
      <div
        className="card"
        style={{
          padding: 16,
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
            <Filter size={16} color="var(--accent)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Bộ lọc câu sai:</span>
            <span className="badge neutral" style={{ fontSize: 11 }}>
              {filteredQuestions.length}/{wrongQuestions.length} câu
            </span>
          </div>

          {/* Ô tìm kiếm từ khoá */}
          <div style={{ position: 'relative', minWidth: 260, flex: '1 1 260px', maxWidth: 360 }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            />
            <input
              type="text"
              placeholder="Tìm theo nội dung câu, bài, đề thi..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{
                padding: '7px 10px 7px 30px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 13,
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Hàng 1: Lọc theo NGUỒN (Khóa học vs Đề thi TOEIC) */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.05))', paddingTop: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginRight: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Layers size={13} /> Nguồn:
          </span>
          <button
            type="button"
            onClick={() => setSourceFilter('all')}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: sourceFilter === 'all' ? 'var(--accent)' : 'var(--surface)',
              color: sourceFilter === 'all' ? '#fff' : 'var(--text-dim)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Tất cả ({wrongQuestions.length})
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('courses')}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: sourceFilter === 'courses' ? '#059669' : 'var(--surface)',
              color: sourceFilter === 'courses' ? '#fff' : 'var(--text-dim)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
          >
            <GraduationCap size={13} />
            <span>Khóa học ({coursesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('tests')}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: sourceFilter === 'tests' ? '#4f46e5' : 'var(--surface)',
              color: sourceFilter === 'tests' ? '#fff' : 'var(--text-dim)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={13} />
            <span>Đề thi TOEIC ({testsCount})</span>
          </button>

          {/* Lọc theo Tag chủ đề nếu có */}
          {availableTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 12,
                color: 'var(--text)',
                marginLeft: 'auto',
              }}
            >
              <option value="">Tất cả chủ đề (Tags)</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Danh sách câu hỏi sai */}
      {filteredQuestions.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: 0, fontSize: 16 }}>Không có câu sai nào trong mục này</h3>
          <p className="text-dim text-sm" style={{ margin: '6px 0 0' }}>
            {wrongQuestions.length === 0
              ? 'Tuyệt vời! Bạn chưa có câu hỏi nào bị làm sai trong các bài tập khóa học hoặc đề thi TOEIC.'
              : 'Không tìm thấy câu hỏi sai nào khớp với các bộ lọc đã chọn.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredQuestions.map((q, idx) => {
            const isExpanded = !!expandedExplanations[q.questionId]
            const srcInfo = getQuestionSourceInfo(q, enrolledCourses)

            return (
              <div
                key={q.questionId}
                className="card"
                style={{
                  padding: 20,
                  borderLeft: `4px solid ${srcInfo.isTest ? '#4f46e5' : '#ef4444'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                {/* Header câu hỏi */}
                <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div className="flex-row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: srcInfo.isTest ? 'rgba(99, 102, 241, 0.14)' : '#fee2e2',
                        color: srcInfo.isTest ? '#4338ca' : '#b91c1c',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </span>

                    {/* Badge phân biệt rõ nguồn: Đề thi TOEIC vs Khóa học */}
                    <span
                      className="badge"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        background: srcInfo.badgeBg,
                        color: srcInfo.badgeColor,
                      }}
                    >
                      {srcInfo.badgeText}
                    </span>

                    <span className="badge neutral" style={{ fontSize: 11, fontWeight: 600 }}>
                      {q.sectionCode || 'BÀI TẬP'}
                    </span>

                    {q.tag && (
                      <span
                        className="badge neutral"
                        style={{
                          fontSize: 11,
                          background: 'var(--surface-2, #f1f5f9)',
                          color: 'var(--text-dim, #64748b)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Tag size={11} /> {q.tag}
                      </span>
                    )}

                    <span className="text-dim text-xs">
                      • {srcInfo.sourceTitle}
                      {srcInfo.partTitle && srcInfo.partTitle !== srcInfo.sourceTitle ? ` — ${srcInfo.partTitle}` : ''}
                    </span>
                  </div>

                  <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
                    <span className="text-dim text-xs">
                      Lần sai gần nhất: {q.lastAttemptedAt}
                    </span>
                    {q.wrongCount > 1 && (
                      <span
                        className="badge warn"
                        style={{ fontSize: 10, padding: '2px 6px' }}
                        title="Bạn đã làm sai câu này nhiều hơn 1 lần"
                      >
                        Sai {q.wrongCount} lần
                      </span>
                    )}
                  </div>
                </div>

                {/* Media Audio & Image nếu có */}
                {q.imageUrl && (
                  <div style={{ maxWidth: 380, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={q.imageUrl} alt="Hình ảnh câu hỏi" style={{ width: '100%', display: 'block' }} />
                  </div>
                )}

                {q.audioUrl && (
                  <div
                    style={{
                      background: 'var(--surface-hover, #f8fafc)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Volume2 size={18} color="var(--accent)" />
                    <audio controls src={q.audioUrl} style={{ height: 32, flex: 1 }} />
                  </div>
                )}

                {/* Nội dung câu hỏi (prompt text) */}
                <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.6 }}>
                  {q.promptText || '(Nghe đoạn băng và chọn đáp án đúng)'}
                </div>

                {/* So sánh đáp án: Bạn đã chọn (Sai) vs Đáp án đúng */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 12,
                  }}
                >
                  {/* Đáp án đã chọn (sai) */}
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 8,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <XCircle size={18} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#991b1b', textTransform: 'uppercase' }}>
                        Đáp án bạn đã chọn (Sai)
                      </div>
                      <div style={{ fontSize: 13, color: '#7f1d1d', fontWeight: 600, marginTop: 2 }}>
                        {q.selectedOptionLabel ? `(${q.selectedOptionLabel}) ` : ''}
                        {q.selectedOptionContent || q.submittedText || 'Chưa chọn đáp án (Bỏ trống trong bài thi)'}
                      </div>
                    </div>
                  </div>

                  {/* Đáp án đúng */}
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 8,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <CheckCircle2 size={18} color="#16a34a" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
                        Đáp án chính xác
                      </div>
                      <div style={{ fontSize: 13, color: '#14532d', fontWeight: 600, marginTop: 2 }}>
                        {q.correctOptionLabel ? `(${q.correctOptionLabel}) ` : ''}
                        {q.correctOptionContent || '(Đáp án chuẩn của đề)'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Giải thích (Toggle) */}
                {q.explanation && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleExplanation(q.questionId)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <HelpCircle size={15} />
                      <span>{isExpanded ? 'Ẩn lời giải thích chi tiết' : 'Xem lời giải thích chi tiết'}</span>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {isExpanded && (
                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: 12,
                          marginTop: 8,
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: '#334155',
                        }}
                      >
                        <strong>Lời giải & Phân tích:</strong>
                        <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer action: Luyện tập lại bài này / đề thi & Hỏi AI */}
                <div className="flex-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <span className="text-dim text-xs">
                    {srcInfo.isTest
                      ? 'Câu hỏi từ đề thi TOEIC. Bạn có thể luyện tập lại trong Thư viện đề thi hoặc hỏi AI.'
                      : 'Luyện tập lại bài kiểm tra trong khóa học hoặc nhờ trợ lý AI giải thích.'}
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn secondary sm flex-row"
                      style={{ gap: 6 }}
                      onClick={() =>
                        useChatStore.getState().openWith({
                          contextType: 'QUESTION_EXPLAIN',
                          contextRefId: q.questionId,
                        })
                      }
                    >
                      <Bot size={13} color="var(--accent)" />
                      <span>Hỏi AI</span>
                    </button>

                    {srcInfo.isTest ? (
                      <button
                        type="button"
                        className="btn secondary sm flex-row"
                        style={{ gap: 6 }}
                        onClick={() => navigate('/tests')}
                        title="Mở Thư viện đề thi TOEIC để làm lại đề thi"
                      >
                        <RotateCcw size={13} />
                        <span>Làm lại ở Thư viện đề thi</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn secondary sm flex-row"
                        style={{ gap: 6 }}
                        onClick={() => handleRetryLesson(q.contentItemId)}
                        title="Mở bài học này để làm lại"
                      >
                        <RotateCcw size={13} />
                        <span>Làm lại bài luyện tập này</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
