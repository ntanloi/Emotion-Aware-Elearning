import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Award, Clock, CheckCircle2, XCircle, RotateCcw, ArrowLeft, Filter, BookOpen, ChevronDown, ChevronUp, Bot } from 'lucide-react'
import { useChatStore } from '@student/stores/useChatStore.js'
import { getAttemptResult } from '@student/api/tests.js'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import '@student/components/tests/tests.css'

import { formatVnTime } from '@shared/utils/dateTime.js'
export default function TestResultPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Bộ lọc xem lại câu hỏi
  const [filterType, setFilterType] = useState('ALL') // ALL | WRONG | CORRECT
  const [filterPart, setFilterPart] = useState('ALL') // ALL | 1..7
  const [expandedExplanations, setExpandedExplanations] = useState({})

  useEffect(() => {
    loadResult()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId])

  const loadResult = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const data = await getAttemptResult(attemptId)
      setResult(data)
    } catch (err) {
      console.error('Lỗi tải kết quả bài làm:', err)
      setErrorMsg('Không thể tải kết quả bài làm hoặc bài thi chưa kết thúc.')
    } finally {
      setLoading(false)
    }
  }

  const toggleExplanation = (qId) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }))
  }

  const filteredQuestions = useMemo(() => {
    if (!result?.questionDetails) return []
    let list = result.questionDetails

    if (filterType === 'WRONG') {
      list = list.filter((q) => !q.isCorrect)
    } else if (filterType === 'CORRECT') {
      list = list.filter((q) => q.isCorrect)
    }

    if (filterPart !== 'ALL') {
      const partNum = parseInt(filterPart, 10)
      list = list.filter((q) => q.partNo === partNum)
    }

    return list
  }, [result?.questionDetails, filterType, filterPart])

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m} phút ${s} giây`
  }

  if (loading) {
    return (
      <div className="tests-container">
        <Skeleton width="40%" height={28} style={{ marginBottom: 20 }} />
        <Skeleton width="100%" height={500} />
      </div>
    )
  }

  if (!result && errorMsg) {
    return (
      <div className="tests-container">
        <div style={{ background: 'var(--bad-soft)', color: 'var(--bad)', padding: 20, borderRadius: 'var(--radius-lg)' }}>
          {errorMsg}
        </div>
        <Link to="/tests" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <ArrowLeft size={16} />
          <span>Quay lại thư viện đề thi</span>
        </Link>
      </div>
    )
  }

  const isFullTest = result.mode === 'FULL' && result.scoreTotal != null
  const overallAccuracy = result.totalQuestions > 0
    ? Math.round((result.totalCorrect * 100) / result.totalQuestions)
    : 0

  return (
    <div className="tests-container">
      {/* Nút quay lại */}
      <Link
        to="/tests"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-dim)',
          marginBottom: 16,
          fontSize: 14,
        }}
      >
        <ArrowLeft size={16} />
        <span>Quay lại thư viện đề thi</span>
      </Link>

      {/* Thẻ kết quả tổng quan */}
      <div className="result-header-card">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Kết quả thi TOEIC • {result.title}
        </span>

        {isFullTest ? (
          <div>
            <div className="result-score-highlight">
              {result.scoreTotal}
              <span style={{ fontSize: 24, fontWeight: 500, color: 'var(--text-dim)' }}> / 990</span>
            </div>
            <div className="result-score-sub">
              Điểm quy đổi chuẩn ETS • Trạng thái: {result.status === 'COMPLETED' ? 'Hoàn thành' : 'Hết giờ'}
            </div>
          </div>
        ) : (
          <div>
            <div className="result-score-highlight">
              {result.totalCorrect} / {result.totalQuestions}
            </div>
            <div className="result-score-sub">
              Tỷ lệ chính xác: {overallAccuracy}% • Chế độ: Luyện tập
            </div>
          </div>
        )}

        {/* Breakdown chi tiết */}
        <div className="result-breakdown-grid">
          {isFullTest ? (
            <>
              <div className="breakdown-box">
                <h4>Listening (Phần Nghe)</h4>
                <div className="score" style={{ color: 'var(--accent)' }}>
                  {result.scoreListening} <span style={{ fontSize: 14, fontWeight: 400 }}>/ 495</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                  {result.rawListeningCorrect} câu đúng
                </div>
              </div>

              <div className="breakdown-box">
                <h4>Reading (Phần Đọc)</h4>
                <div className="score" style={{ color: '#7e22ce' }}>
                  {result.scoreReading} <span style={{ fontSize: 14, fontWeight: 400 }}>/ 495</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                  {result.rawReadingCorrect} câu đúng
                </div>
              </div>
            </>
          ) : (
            <div className="breakdown-box">
              <h4>Tổng câu đúng</h4>
              <div className="score" style={{ color: 'var(--accent)' }}>
                {result.totalCorrect} / {result.totalQuestions}
              </div>
            </div>
          )}

          <div className="breakdown-box">
            <h4>Thời gian làm bài</h4>
            <div className="score" style={{ fontSize: 18, paddingTop: 4 }}>
              {formatDuration(result.timeSpentSeconds)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>
              {result.submittedAt ? formatVnTime(result.submittedAt) : '—'}
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-test-action"
            onClick={() => navigate(`/tests/${result.testId}`)}
          >
            <RotateCcw size={15} />
            <span>Làm lại đề này</span>
          </button>
          <button
            type="button"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => navigate('/tests')}
          >
            <BookOpen size={15} />
            <span>Thư viện đề thi</span>
          </button>
        </div>
      </div>

      {/* Thẻ thống kê từng Part */}
      <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
        Kết quả chi tiết từng phần thi
      </h3>
      <div className="parts-result-grid">
        {(result.partResults || []).map((p) => {
          const acc = Math.round(p.accuracyRate || 0)
          return (
            <div key={p.partNo} className="part-result-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14.5 }}>Part {p.partNo}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: acc >= 70 ? 'var(--good)' : 'var(--warn)' }}>
                  {acc}%
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
                Đúng {p.correctCount} / {p.totalQuestions} câu
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, width: '100%', background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${acc}%`,
                    background: acc >= 70 ? 'var(--good)' : 'var(--warn)',
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Khu vực xem lại câu hỏi & lời giải */}
      <div className="review-answers-section">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
            Xem lại đáp án và giải thích ({filteredQuestions.length} câu)
          </h3>

          {/* Bộ lọc xem lại */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="tests-tabs-group">
              <button
                type="button"
                className={`tests-tab-btn ${filterType === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterType('ALL')}
              >
                Tất cả ({result.questionDetails?.length || 0})
              </button>
              <button
                type="button"
                className={`tests-tab-btn ${filterType === 'WRONG' ? 'active' : ''}`}
                onClick={() => setFilterType('WRONG')}
              >
                Câu sai ({result.questionDetails?.filter((q) => !q.isCorrect).length || 0})
              </button>
              <button
                type="button"
                className={`tests-tab-btn ${filterType === 'CORRECT' ? 'active' : ''}`}
                onClick={() => setFilterType('CORRECT')}
              >
                Câu đúng ({result.questionDetails?.filter((q) => q.isCorrect).length || 0})
              </button>
            </div>

            {/* Lọc theo Part */}
            <select
              value={filterPart}
              onChange={(e) => setFilterPart(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
                fontSize: 13.5,
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Tất cả Part</option>
              {(result.partResults || []).map((p) => (
                <option key={p.partNo} value={p.partNo}>
                  Part {p.partNo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Danh sách câu hỏi xem lại */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredQuestions.map((q, idx) => {
            const isCorrect = q.isCorrect
            const isExpanded = Boolean(expandedExplanations[q.questionId])

            return (
              <div
                key={q.questionId || idx}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 18,
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                      Câu {idx + 1} (Part {q.partNo})
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: isCorrect ? 'var(--good-soft)' : 'var(--bad-soft)',
                        color: isCorrect ? 'var(--good)' : 'var(--bad)',
                      }}
                    >
                      {isCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      <span>{isCorrect ? 'Đúng' : 'Sai'}</span>
                    </span>
                  </div>
                </div>

                {q.promptText && (
                  <div style={{ fontSize: 14.5, color: 'var(--text)', marginBottom: 12, fontWeight: 500 }}>
                    {q.promptText}
                  </div>
                )}

                {/* Các lựa chọn trắc nghiệm */}
                <div className="options-list" style={{ marginBottom: 12 }}>
                  {(q.options || []).map((opt) => {
                    const isUserChoice = q.selectedOptionId === opt.id
                    const isSystemCorrect = q.correctOptionId === opt.id

                    let rowClass = 'option-row'
                    if (isSystemCorrect) {
                      rowClass += ' correct-revealed'
                    } else if (isUserChoice && !isCorrect) {
                      rowClass += ' wrong-revealed'
                    }

                    return (
                      <div key={opt.id} className={rowClass} style={{ cursor: 'default' }}>
                        <div className="option-letter">{opt.label}</div>
                        <div style={{ flex: 1 }}>{opt.content}</div>
                        {isUserChoice && (
                          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>
                            (Bạn đã chọn)
                          </span>
                        )}
                        {isSystemCorrect && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--good)' }}>
                            (Đáp án đúng)
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Lời giải thích */}
                {q.explanation && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      onClick={() => toggleExplanation(q.questionId)}
                    >
                      <span>{isExpanded ? 'Ẩn giải thích chi tiết' : 'Xem giải thích chi tiết'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isExpanded && (
                      <div
                        style={{
                          background: 'var(--surface-2)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 14px',
                          marginTop: 8,
                          fontSize: 13.5,
                          lineHeight: 1.5,
                          color: 'var(--text)',
                        }}
                      >
                        {q.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Nút Hỏi AI về câu hỏi này */}
                <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn secondary sm flex-row"
                    style={{ gap: 5, fontSize: 12, padding: '4px 10px' }}
                    onClick={() =>
                      useChatStore.getState().openWith({
                        contextType: 'QUESTION_EXPLAIN',
                        contextRefId: q.questionId,
                      })
                    }
                  >
                    <Bot size={13} color="var(--accent)" />
                    <span>Hỏi AI về câu này</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
