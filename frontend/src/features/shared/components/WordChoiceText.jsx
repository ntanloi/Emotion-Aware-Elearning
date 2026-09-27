import { useMemo, useState } from 'react'

/**
 * WordChoiceText — Câu hỏi "Chọn từ trong đoạn văn" (WORD_CHOICE).
 * `promptText` là đoạn văn đầy đủ, các vị trí chỗ trống được đánh dấu bằng token {{1}}, {{2}}, ...
 * theo đúng thứ tự các phần tử trong `pairs` (orderIndex 1-based). Mỗi blank hiển thị 2 lựa chọn
 * (optionA / optionB) cạnh nhau — bấm chọn 1 trong 2 → hiện đúng/sai NGAY LẬP TỨC cho ô đó.
 *
 * Props:
 *  - promptText: string
 *  - pairs: [{ id, orderIndex, optionA, optionB, correctOption }] — correctOption bị ẩn (null)
 *    với học viên cho tới khi kiểm tra/nộp bài, giống các loại câu hỏi khác.
 *  - value: { [pairId]: 'A'|'B' } — lựa chọn hiện tại của học viên
 *  - onChange(value)
 *  - readOnly, showAnswer (hiện đúng/sai sau khi nộp — cần đi kèm correctPairs)
 *  - onCheck: async () => { wordChoicePairs } — gọi API chấm điểm (được gọi tự động khi chọn đáp án)
 *  - correctPairs: đáp án đúng biết trước (dùng khi XEM LẠI sau khi đã nộp bài)
 *  - onAnswerChecked(isCorrect)
 */
export default function WordChoiceText({
  promptText,
  pairs = [],
  value,
  onChange,
  readOnly = false,
  showAnswer = false,
  onCheck,
  correctPairs,
  onAnswerChecked,
}) {
  // checkedPairIds: set các pairId đã được check (đã click và nhận kết quả từ API)
  const [checkedPairIds, setCheckedPairIds] = useState(new Set())
  // remoteCorrectPairs: kết quả đáp án đúng nhận từ API (tích lũy theo từng lần check)
  const [remoteCorrectPairs, setRemoteCorrectPairs] = useState({}) // { [pairId]: 'A'|'B' }
  // checkingPairIds: set các pairId đang chờ API trả về (để disable tạm thời)
  const [checkingPairIds, setCheckingPairIds] = useState(new Set())

  const selections = value || {}
  const sortedPairs = useMemo(() => [...pairs].sort((a, b) => a.orderIndex - b.orderIndex), [pairs])
  const parts = useMemo(() => splitPromptText(promptText, sortedPairs), [promptText, sortedPairs])

  // correctByPairId: đáp án đúng từ API (ưu tiên), hoặc từ correctPairs (khi xem lại)
  const correctByPairId = useMemo(() => {
    if (Object.keys(remoteCorrectPairs).length > 0) return remoteCorrectPairs
    const source = correctPairs || pairs
    return Object.fromEntries(source.filter((p) => p.correctOption).map((p) => [p.id, p.correctOption]))
  }, [remoteCorrectPairs, correctPairs, pairs])

  const select = async (pairId, option) => {
    if (readOnly) return
    // Ô đã check rồi thì không cho đổi đáp án
    if (checkedPairIds.has(pairId)) return
    // Đang chờ API thì bỏ qua
    if (checkingPairIds.has(pairId)) return

    // Cập nhật selection ngay để UI phản hồi tức thì
    const newSelections = { ...selections, [pairId]: option }
    onChange?.(newSelections)

    // Gọi API check ngay sau khi chọn (nếu có onCheck)
    if (onCheck) {
      setCheckingPairIds((prev) => new Set(prev).add(pairId))
      try {
        const res = await onCheck(newSelections)
        const list = res?.wordChoicePairs || []

        // Lấy kết quả đáp án đúng từ API, merge vào remoteCorrectPairs
        const newCorrect = Object.fromEntries(list.map((p) => [p.id, p.correctOption]))
        setRemoteCorrectPairs((prev) => ({ ...prev, ...newCorrect }))

        // Đánh dấu ô này đã được check
        setCheckedPairIds((prev) => {
          const next = new Set(prev)
          next.add(pairId)

          // Kiểm tra xem tất cả ô đã được check chưa
          const allChecked = pairs.every((p) => next.has(p.id))
          if (allChecked) {
            const mergedCorrect = { ...newCorrect }
            // Dùng setTimeout để tránh setState trong render cycle
            setTimeout(() => {
              const allCorrect = pairs.every(
                (p) => (newSelections[p.id] || selections[p.id]) === mergedCorrect[p.id],
              )
              onAnswerChecked?.(allCorrect)
            }, 0)
          }

          return next
        })
      } catch {
        // Nếu API lỗi, vẫn cho phép thử lại (không đánh dấu là đã check)
      } finally {
        setCheckingPairIds((prev) => {
          const next = new Set(prev)
          next.delete(pairId)
          return next
        })
      }
    } else {
      // Không có onCheck (readOnly review mode với correctPairs): chỉ cập nhật selection
      // và tô màu dựa trên correctByPairId hiện có
      const newChecked = new Set(checkedPairIds).add(pairId)
      setCheckedPairIds(newChecked)
    }
  }

  const handleRetry = () => {
    setCheckedPairIds(new Set())
    setRemoteCorrectPairs({})
    setCheckingPairIds(new Set())
    onChange?.({})
  }

  const allChecked = pairs.length > 0 && pairs.every((p) => checkedPairIds.has(p.id))

  return (
    <div className="question-card">
      <div className="word-choice-passage">
        {parts.map((piece, i) => {
          if (piece.type === 'text') return <span key={i}>{piece.value}</span>
          const pair = pairs.find((p) => p.id === piece.pairId)
          if (!pair) return null
          const selected = selections[pair.id]
          const isChecked = checkedPairIds.has(pair.id)
          const isChecking = checkingPairIds.has(pair.id)
          const correctOption = isChecked || showAnswer ? correctByPairId[pair.id] : null
          const disabled = readOnly || isChecked || isChecking
          return (
            <span className={`word-choice-blank${isChecking ? ' checking' : ''}`} key={pair.id}>
              <WordChoiceOption
                text={pair.optionA}
                isSelected={selected === 'A'}
                isCorrectAnswer={correctOption ? correctOption === 'A' : null}
                otherIsCorrect={!!correctOption && correctOption === 'B'}
                disabled={disabled}
                onClick={() => select(pair.id, 'A')}
              />
              <span className="word-choice-sep">/</span>
              <WordChoiceOption
                text={pair.optionB}
                isSelected={selected === 'B'}
                isCorrectAnswer={correctOption ? correctOption === 'B' : null}
                otherIsCorrect={!!correctOption && correctOption === 'A'}
                disabled={disabled}
                onClick={() => select(pair.id, 'B')}
              />
            </span>
          )
        })}
      </div>

      {/* Nút làm lại: chỉ hiện sau khi đã check hết tất cả ô, không phải chế độ readOnly */}
      {!readOnly && allChecked && (
        <button className="btn secondary mt-16" onClick={handleRetry}>
          ↻ Làm lại
        </button>
      )}
    </div>
  )
}

function WordChoiceOption({ text, isSelected, isCorrectAnswer, otherIsCorrect, disabled, onClick }) {
  const cls = ['word-choice-option']
  if (isCorrectAnswer === true) cls.push('correct')
  else if (isCorrectAnswer === false && isSelected) cls.push('incorrect')
  else if (isCorrectAnswer === false && otherIsCorrect && !isSelected) cls.push('dimmed')
  else if (isSelected) cls.push('selected')
  return (
    <span className={cls.join(' ')} onClick={disabled ? undefined : onClick} role="button">
      {text}
    </span>
  )
}

/**
 * Tách promptText thành mảng { type:'text', value } | { type:'blank', pairId } theo token {{n}}.
 * Token {{n}} ứng với phần tử thứ n (1-based) trong `sortedPairs` (đã sắp theo orderIndex).
 */
function splitPromptText(text, sortedPairs) {
  if (!text) return []
  const regex = /\{\{(\d+)\}\}/g
  const result = []
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) result.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    const n = Number(match[1])
    const pair = sortedPairs[n - 1]
    if (pair) result.push({ type: 'blank', pairId: pair.id })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) result.push({ type: 'text', value: text.slice(lastIndex) })
  return result
}
