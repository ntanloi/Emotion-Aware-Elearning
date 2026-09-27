import { useMemo, useRef, useState } from 'react'

/**
 * SentenceFillQuestion — Câu hỏi "Điền từ vào chỗ trống trong câu/đoạn văn" (SENTENCE_FILL).
 *
 * `promptText` chứa câu/đoạn văn đầy đủ với các ô trống được đánh dấu bằng token {{1}}, {{2}}, ...
 * Học viên gõ từ vào từng ô → nhấn nút "✓ Kiểm tra đáp án" → tất cả ô hiện đúng/sai cùng lúc.
 *
 * Props:
 *  - promptText: string — câu văn có token {{1}}, {{2}}...
 *  - blanks: [{ id, orderIndex, hint, correctText }] — correctText bị ẩn với học viên
 *  - value: { [blankId]: string } — nội dung học viên đã gõ vào từng ô
 *  - onChange(value)
 *  - readOnly: khoá không cho nhập (khi xem lại)
 *  - showAnswer: hiện đáp án đúng ngay (khi xem lại sau nộp bài — cần correctText trong blanks)
 *  - onCheck: async (currentValue) => { sentenceFillBlanks } — gọi API check toàn bộ câu
 *  - onAnswerChecked(isCorrect): báo kết quả toàn câu sau khi check
 */
export default function SentenceFillQuestion({
  promptText,
  blanks = [],
  value,
  onChange,
  readOnly = false,
  showAnswer = false,
  onCheck,
  onAnswerChecked,
}) {
  const [checked, setChecked] = useState(false)
  const [checking, setChecking] = useState(false)
  // revealedCorrect: { [blankId]: correctText } nhận từ API sau khi check
  const [revealedCorrect, setRevealedCorrect] = useState({})

  const inputRefs = useRef({})
  const inputs = value || {}
  const sortedBlanks = useMemo(() => [...blanks].sort((a, b) => a.orderIndex - b.orderIndex), [blanks])
  const parts = useMemo(() => splitPromptText(promptText, sortedBlanks), [promptText, sortedBlanks])

  // Đáp án đúng: từ API (revealedCorrect) hoặc từ prop correctText (xem lại sau nộp bài)
  const correctByBlankId = useMemo(() => {
    const result = {}
    blanks.forEach((b) => {
      if (revealedCorrect[b.id]) result[b.id] = revealedCorrect[b.id]
      else if (b.correctText) result[b.id] = b.correctText
    })
    return result
  }, [blanks, revealedCorrect])

  const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')

  const displayAnswer = showAnswer || checked

  // Có ít nhất 1 ô được nhập
  const hasAnyInput = blanks.some((b) => (inputs[b.id] || '').trim())

  const handleInput = (blankId, text) => {
    if (readOnly || checked) return
    onChange?.({ ...inputs, [blankId]: text })
  }

  // Nhấn Enter trong 1 ô → focus ô tiếp theo (nếu có), hoặc trigger check nếu là ô cuối
  const handleKeyDown = (e, blankId) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const idx = sortedBlanks.findIndex((b) => b.id === blankId)
      const next = sortedBlanks[idx + 1]
      if (next && inputRefs.current[next.id]) {
        inputRefs.current[next.id].focus()
      } else if (hasAnyInput) {
        handleCheck()
      }
    }
  }

  const handleCheck = async () => {
    if (checking || checked) return
    const currentValue = { ...inputs }

    setChecking(true)
    try {
      if (onCheck) {
        const res = await onCheck(currentValue)
        const list = res?.sentenceFillBlanks || []
        const newCorrect = Object.fromEntries(list.map((b) => [b.id, b.correctText]))
        setRevealedCorrect(newCorrect)

        setChecked(true)
        const merged = { ...newCorrect }
        const allCorrect = blanks.every((b) => normalize(currentValue[b.id]) === normalize(merged[b.id]))
        onAnswerChecked?.(allCorrect)
      } else {
        // không có onCheck (readOnly/showAnswer mode): chỉ khoá lại
        setChecked(true)
      }
    } catch {
      // API lỗi — không khoá, cho phép thử lại
    } finally {
      setChecking(false)
    }
  }

  const handleRetry = () => {
    setChecked(false)
    setRevealedCorrect({})
    onChange?.({})
    // Focus ô đầu tiên sau khi reset
    setTimeout(() => {
      const first = sortedBlanks[0]
      if (first && inputRefs.current[first.id]) inputRefs.current[first.id].focus()
    }, 50)
  }

  return (
    <div className="question-card">
      {/* Câu văn với các ô trống inline */}
      <div className="sentence-fill-passage">
        {parts.map((piece, i) => {
          if (piece.type === 'text') return <span key={i}>{piece.value}</span>

          const blank = blanks.find((b) => b.id === piece.blankId)
          if (!blank) return null

          const typedValue = inputs[blank.id] || ''
          const correct = displayAnswer ? correctByBlankId[blank.id] : null

          let borderColor = 'var(--border)'
          let bgColor = 'var(--surface)'
          let textColor = 'inherit'

          if (correct) {
            const isRight = normalize(typedValue) === normalize(correct)
            borderColor = isRight ? 'var(--good)' : 'var(--bad)'
            bgColor = isRight ? 'var(--good-soft)' : 'var(--bad-soft)'
            textColor = isRight ? 'var(--good)' : 'var(--bad)'
          }

          return (
            <span key={blank.id} className="sentence-fill-blank-wrap">
              <input
                ref={(el) => { inputRefs.current[blank.id] = el }}
                className="sentence-fill-input"
                type="text"
                value={typedValue}
                onChange={(e) => handleInput(blank.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, blank.id)}
                placeholder={blank.hint || '...'}
                disabled={readOnly || checked}
                style={{
                  borderColor,
                  background: bgColor,
                  color: textColor,
                  minWidth: Math.max(72, (correctByBlankId[blank.id]?.length || blank.hint?.length || 5) * 11),
                }}
              />
              {/* Hiện đáp án đúng bên dưới ô nếu sai */}
              {correct && normalize(typedValue) !== normalize(correct) && (
                <span className="sentence-fill-correct-hint">{correct}</span>
              )}
            </span>
          )
        })}
      </div>

      {/* Nút Kiểm tra đáp án — hiện khi chưa check, không readOnly */}
      {!readOnly && !showAnswer && !checked && (
        <button
          className="btn secondary mt-16"
          style={{ width: '100%' }}
          onClick={handleCheck}
          disabled={checking || !hasAnyInput}
        >
          {checking ? 'Đang kiểm tra...' : '✓ Kiểm tra đáp án'}
        </button>
      )}

      {/* Nút Làm lại — hiện sau khi đã check, không readOnly */}
      {!readOnly && checked && (
        <button className="btn secondary mt-16" onClick={handleRetry}>
          ↻ Làm lại
        </button>
      )}
    </div>
  )
}

/**
 * Tách promptText thành mảng { type:'text' } | { type:'blank', blankId } theo token {{n}}.
 */
function splitPromptText(text, sortedBlanks) {
  if (!text) return []
  const regex = /\{\{(\d+)\}\}/g
  const result = []
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) result.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    const n = Number(match[1])
    const blank = sortedBlanks[n - 1]
    if (blank) result.push({ type: 'blank', blankId: blank.id })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) result.push({ type: 'text', value: text.slice(lastIndex) })
  return result
}
