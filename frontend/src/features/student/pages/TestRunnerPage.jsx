import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, Send, AlertTriangle, ArrowLeft, ArrowRight, Check, Volume2, Bookmark, List, X } from 'lucide-react'
import { getAttemptContent, saveDraft, submitAttempt } from '@student/api/tests.js'
import AudioPlayer from '@shared/components/AudioPlayer.jsx'
import QuestionImage from '@shared/components/QuestionImage.jsx'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import '@student/components/tests/tests.css'
import { useToast } from '@shared/context/AppUIContext.jsx'

import { vnTime } from '@shared/utils/dateTime.js'
export default function TestRunnerPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [testContent, setTestContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // State bài làm
  const [activePartIndex, setActivePartIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // questionId -> optionId hoặc text
  const [savedDraftStatus, setSavedDraftStatus] = useState('')
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showQuestionPaletteMobile, setShowQuestionPaletteMobile] = useState(false)

  // Đồng hồ đếm ngược server deadline
  const [remainingSeconds, setRemainingSeconds] = useState(null)
  const saveTimeoutRef = useRef(null)
  const autoSubmittedRef = useRef(false)

  useEffect(() => {
    loadContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId])

  const loadContent = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const data = await getAttemptContent(attemptId)
      if (data.status === 'COMPLETED' || data.status === 'TIMED_OUT') {
        navigate(`/tests/attempts/${attemptId}/result`, { replace: true })
        return
      }
      setTestContent(data)

      // Khôi phục nháp đã lưu
      if (data.draftAnswers && Object.keys(data.draftAnswers).length > 0) {
        setAnswers(data.draftAnswers)
      }

      // Khởi tạo đồng hồ
      console.info('[TestRunner] timer', {
        status: data.status,
        timeLimitSeconds: data.timeLimitSeconds,
        startedAt: data.startedAt,
        deadlineAt: data.deadlineAt,
        remainingSeconds: data.remainingSeconds,
      })
      if (typeof data.remainingSeconds === 'number') {
        // Ưu tiên số giây còn lại do server tính (không phụ thuộc múi giờ của máy học viên)
        setRemainingSeconds(Math.max(0, Math.floor(data.remainingSeconds)))
      } else if (data.deadlineAt) {
        // Dự phòng: deadlineAt là LocalDateTime không kèm múi giờ, server chạy giờ Việt Nam (UTC+7).
        // parseVnDate coi chuỗi không có offset là giờ Việt Nam nên không phụ thuộc múi giờ máy học viên.
        const deadline = vnTime(data.deadlineAt)
        const diff = Number.isNaN(deadline) ? 0 : Math.max(0, Math.floor((deadline - Date.now()) / 1000))
        setRemainingSeconds(diff)
      }
    } catch (err) {
      console.error('Lỗi tải nội dung đề thi:', err)
      setErrorMsg('Không thể tải nội dung bài làm hoặc bạn không có quyền truy cập.')
    } finally {
      setLoading(false)
    }
  }

  // Timer đếm ngược
  useEffect(() => {
    if (remainingSeconds === null) return
    if (remainingSeconds <= 0) {
      // Hết giờ -> tự động nộp bài
      handleAutoSubmitOnTimeout()
      return
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          handleAutoSubmitOnTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds])

  const handleAutoSubmitOnTimeout = async () => {
    // Chặn gọi lặp (interval và effect cùng kích hoạt khi về 0) -> tránh nộp bài và hiện toast 2 lần
    if (submitting || autoSubmittedRef.current) return
    autoSubmittedRef.current = true
    toast.warning('Thời gian làm bài đã kết thúc! Hệ thống đang tự động nộp bài của bạn.', 8000)
    await performSubmit()
  }

  // Tự động lưu nháp khi thay đổi đáp án
  const handleSelectOption = (questionId, optionId) => {
    const updated = { ...answers, [questionId]: optionId }
    setAnswers(updated)

    // Debounce save draft sau 1.5 giây
    setSavedDraftStatus('Đang lưu...')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveDraft(attemptId, updated)
        setSavedDraftStatus('Đã lưu nháp')
        setTimeout(() => setSavedDraftStatus(''), 2500)
      } catch (e) {
        setSavedDraftStatus('Lỗi lưu nháp')
      }
    }, 1500)
  }

  const performSubmit = async () => {
    setSubmitting(true)
    setShowSubmitModal(false)
    try {
      await submitAttempt(attemptId, {
        answerMap: answers,
      })
      navigate(`/tests/attempts/${attemptId}/result`, { replace: true })
    } catch (err) {
      console.error('Lỗi khi nộp bài:', err)
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.')
      setSubmitting(false)
      autoSubmittedRef.current = false
    }
  }

  // Danh sách các part của đề thi
  const parts = testContent?.parts || []
  const currentPart = parts[activePartIndex] || null

  // Đếm tổng số câu hỏi và câu đã trả lời
  const allQuestions = useMemo(() => {
    const list = []
    let num = 1
    for (const p of parts) {
      for (const q of p.questions || []) {
        list.push({ ...q, partNo: p.partNo, globalIndex: num++ })
      }
    }
    return list
  }, [parts])

  const answeredCount = useMemo(() => {
    return allQuestions.filter((q) => answers[q.id] != null && answers[q.id] !== '').length
  }, [allQuestions, answers])

  // Gom nhóm câu hỏi theo Passage trong Part hiện tại
  const groupedQuestionsInCurrentPart = useMemo(() => {
    if (!currentPart) return []
    const passages = currentPart.passages || []
    const questions = currentPart.questions || []
    const pById = Object.fromEntries(passages.map((p) => [p.id, p]))

    const groups = []
    for (const q of questions) {
      const lastGroup = groups[groups.length - 1]
      if (q.passageId && lastGroup && lastGroup.passageId === q.passageId) {
        lastGroup.questions.push(q)
      } else {
        groups.push({
          passageId: q.passageId,
          passage: q.passageId ? pById[q.passageId] : null,
          questions: [q],
        })
      }
    }
    return groups
  }, [currentPart])

  const formatTimer = (seconds) => {
    if (seconds === null) return 'Không giới hạn'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="tests-container">
        <Skeleton width="40%" height={28} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={600} />
      </div>
    )
  }

  if (!testContent && errorMsg) {
    return (
      <div className="tests-container">
        <div style={{ background: 'var(--bad-soft)', color: 'var(--bad)', padding: 20, borderRadius: 'var(--radius-lg)' }}>
          {errorMsg}
        </div>
      </div>
    )
  }

  const isUrgent = remainingSeconds !== null && remainingSeconds < 300 // Dưới 5 phút

  return (
    <div className="runner-layout">
      {/* Header làm bài cố định trên cùng */}
      <header className="runner-header">
        <div className="runner-title-wrap">
          <h2 className="runner-title">{testContent.title}</h2>
          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--surface-2)', color: 'var(--text-dim)', fontWeight: 600 }}>
            {testContent.mode === 'FULL' ? 'Thi thử ETS' : 'Luyện tập'}
          </span>
          {savedDraftStatus && (
            <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 8 }}>
              {savedDraftStatus}
            </span>
          )}
        </div>

        <div className="runner-header-controls">
          {remainingSeconds !== null && (
            <div className={`runner-timer-pill ${isUrgent ? 'urgent' : ''}`}>
              <Clock size={16} />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>
          )}

          <button
            type="button"
            className="runner-mobile-palette-toggle"
            onClick={() => setShowQuestionPaletteMobile((v) => !v)}
            aria-label="Mở bảng câu hỏi"
          >
            <List size={15} />
            <span>Câu hỏi ({answeredCount}/{allQuestions.length})</span>
          </button>

          <button
            type="button"
            className="btn-test-action"
            style={{ padding: '8px 18px', fontWeight: 600 }}
            onClick={() => setShowSubmitModal(true)}
          >
            <Send size={15} />
            <span className="runner-submit-btn-text">Nộp bài ({answeredCount}/{allQuestions.length})</span>
            <span className="runner-submit-btn-text-mobile">Nộp</span>
          </button>
        </div>
      </header>

      {/* Thanh tab các Part */}
      <div className="runner-part-tabs">
        {parts.map((p, idx) => {
          const partQuestions = p.questions || []
          const partAnswered = partQuestions.filter((q) => answers[q.id] != null).length
          const isCurrent = idx === activePartIndex
          return (
            <button
              key={p.partNo}
              type="button"
              className={`runner-part-tab ${isCurrent ? 'active' : ''}`}
              onClick={() => setActivePartIndex(idx)}
            >
              <span>Part {p.partNo}</span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>
                ({partAnswered}/{partQuestions.length})
              </span>
            </button>
          )
        })}
      </div>

      {/* Khu vực nội dung làm bài & Question Navigator */}
      <div className="runner-content-area">
        {/* Cột trái: Nội dung câu hỏi của Part hiện tại */}
        <div className="runner-main-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text)' }}>
              Phần thi: <strong>Part {currentPart?.partNo}</strong> ({currentPart?.questions?.length || 0} câu)
            </h3>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {currentPart?.partNo <= 4 ? 'Kỹ năng Nghe (Listening)' : 'Kỹ năng Đọc (Reading)'}
            </div>
          </div>

          {groupedQuestionsInCurrentPart.map((group, gIdx) => {
            const hasPassage = Boolean(group.passage)

            return (
              <div
                key={gIdx}
                className={`runner-group-card ${hasPassage ? 'has-passage' : ''}`}
              >
                {/* Cột Passage/Audio nếu có */}
                {hasPassage && (
                  <div className="runner-group-passage">
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--accent)', marginBottom: 8 }}>
                      Đoạn thông tin / Bài đọc
                    </div>
                    {group.passage.audioUrl && (
                      <div style={{ marginBottom: 12 }}>
                        <AudioPlayer src={group.passage.audioUrl} />
                      </div>
                    )}
                    {group.passage.imageUrl && (
                      <div style={{ marginBottom: 12 }}>
                        <QuestionImage src={group.passage.imageUrl} alt="Passage visual" />
                      </div>
                    )}
                    {group.passage.passageHtml && (
                      <div
                        className="runner-passage-html"
                        style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}
                        dangerouslySetInnerHTML={{ __html: group.passage.passageHtml }}
                      />
                    )}
                  </div>
                )}

                {/* Cột câu hỏi */}
                <div className="runner-group-questions">
                  {group.questions.map((q) => {
                    const globalItem = allQuestions.find((item) => item.id === q.id)
                    const qIndex = globalItem ? globalItem.globalIndex : '?'
                    const selectedOptId = answers[q.id]

                    return (
                      <div key={q.id} id={`question-${q.id}`} className="question-item-card">
                        <div className="question-item-header">
                          <span className="question-num-badge">Câu {qIndex}</span>
                        </div>

                        {/* Audio riêng cho câu hỏi (Part 1, 2) */}
                        {q.audioUrl && (
                          <div style={{ marginBottom: 12 }}>
                            <AudioPlayer src={q.audioUrl} />
                          </div>
                        )}

                        {/* Ảnh riêng cho câu hỏi (Part 1) */}
                        {q.imageUrl && (
                          <div style={{ marginBottom: 12 }}>
                            <QuestionImage src={q.imageUrl} alt={`Question ${qIndex}`} />
                          </div>
                        )}

                        {q.promptText && <div className="question-prompt">{q.promptText}</div>}

                        {/* Các lựa chọn trắc nghiệm */}
                        <div className="options-list">
                          {(q.options || []).map((opt) => {
                            const isSelected = selectedOptId === opt.id
                            return (
                              <div
                                key={opt.id}
                                className={`option-row ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSelectOption(q.id, opt.id)}
                              >
                                <div className="option-letter">{opt.label}</div>
                                <div style={{ flex: 1 }}>{opt.content}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Nút chuyển Part trước / sau */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button
              type="button"
              className="btn-test-action"
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
              disabled={activePartIndex === 0}
              onClick={() => setActivePartIndex((p) => Math.max(0, p - 1))}
            >
              <ArrowLeft size={16} />
              <span>Part trước</span>
            </button>

            <button
              type="button"
              className="btn-test-action"
              disabled={activePartIndex === parts.length - 1}
              onClick={() => setActivePartIndex((p) => Math.min(parts.length - 1, p + 1))}
            >
              <span>Part tiếp theo</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Cột phải: Bảng điều hướng câu hỏi (Question Palette) */}
        {showQuestionPaletteMobile && (
          <div
            className="runner-sidebar-backdrop"
            onClick={() => setShowQuestionPaletteMobile(false)}
            aria-hidden="true"
          />
        )}
        <aside className={`runner-sidebar-panel ${showQuestionPaletteMobile ? 'mobile-open' : ''}`}>
          <div className="runner-sidebar-header">
            <div>
              <h4 style={{ margin: 0, fontSize: 14.5, color: 'var(--text)' }}>Mục lục câu hỏi</h4>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                {answeredCount}/{allQuestions.length} đã làm
              </span>
            </div>
            <button
              type="button"
              className="runner-sidebar-close-btn"
              onClick={() => setShowQuestionPaletteMobile(false)}
              aria-label="Đóng bảng câu hỏi"
            >
              <X size={18} />
            </button>
          </div>

          <div className="palette-grid">
            {allQuestions.map((q) => {
              const isAnswered = answers[q.id] != null
              const isCurrentPart = q.partNo === currentPart?.partNo
              return (
                <button
                  key={q.id}
                  type="button"
                  className={`palette-btn ${isAnswered ? 'answered' : ''}`}
                  style={{
                    opacity: isCurrentPart ? 1 : 0.6,
                  }}
                  onClick={() => {
                    // Nếu câu hỏi thuộc part khác -> chuyển part trước
                    const targetPartIdx = parts.findIndex((p) => p.partNo === q.partNo)
                    if (targetPartIdx !== -1 && targetPartIdx !== activePartIndex) {
                      setActivePartIndex(targetPartIdx)
                    }
                    setShowQuestionPaletteMobile(false)
                    setTimeout(() => {
                      const el = document.getElementById(`question-${q.id}`)
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }, 100)
                  }}
                >
                  {q.globalIndex}
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button
              type="button"
              className="btn-test-action"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              onClick={() => setShowSubmitModal(true)}
            >
              <Send size={15} />
              <span>Nộp bài thi</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Modal xác nhận nộp bài */}
      {showSubmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-xl)',
              padding: 28,
              maxWidth: 440,
              width: '90%',
              boxShadow: var_shadow_lg,
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 18, color: 'var(--text)' }}>
              Xác nhận nộp bài thi
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Bạn đã hoàn thành <strong>{answeredCount}</strong> / <strong>{allQuestions.length}</strong> câu hỏi.
              {answeredCount < allQuestions.length && (
                <span style={{ color: 'var(--bad)', display: 'block', marginTop: 6, fontWeight: 500 }}>
                  Chú ý: Còn {allQuestions.length - answeredCount} câu bạn chưa chọn đáp án!
                </span>
              )}
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                className="btn-test-action"
                style={{ padding: '8px 20px', fontWeight: 600 }}
                disabled={submitting}
                onClick={performSubmit}
              >
                {submitting ? 'Đang nộp bài...' : 'Nộp bài ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const var_shadow_lg = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'