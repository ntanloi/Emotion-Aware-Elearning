import { useState } from 'react'
import ExplanationDropdown from '@shared/components/ExplanationDropdown.jsx'

/**
 * FillBlankQuestion — Câu hỏi điền từ.
 * Thêm nút kiểm tra đáp án sau mỗi câu.
 *
 * Props:
 *  - prompt: text đề bài
 *  - hint: gợi ý (optional)
 *  - value, onChange(text)
 *  - readOnly, showAnswer, correctText
 *  - allowCheck: cho phép kiểm tra ngay
 *  - onCheck: async () => { correctText, explanation } — dùng khi correctText bị ẩn với học viên
 *    (Part 1-7/ngữ pháp/chính tả) trước khi nộp bài. Nếu không truyền, dùng correctText có sẵn.
 *  - onAnswerChecked(isCorrect): báo cho component cha biết kết quả mỗi lần bấm "Kiểm tra đáp án"
 *    (kể cả lần kiểm tra lại sau khi bấm "Làm lại"). Dùng để quyết định tự động chuyển câu.
 *  - explanation: giải thích đáp án (hiển thị qua dropdown sau khi kiểm tra)
 */
export default function FillBlankQuestion({
  prompt,
  hint,
  value,
  onChange,
  readOnly = false,
  showAnswer = false,
  correctText,
  allowCheck = false,
  onCheck,
  onAnswerChecked,
  explanation,
}) {
  const [checked, setChecked] = useState(false)
  const [checking, setChecking] = useState(false)
  const [remoteCorrectText, setRemoteCorrectText] = useState(null)
  const [remoteExplanation, setRemoteExplanation] = useState(null)

  const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const displayAnswer = showAnswer || checked
  const effectiveCorrectText = correctText ?? remoteCorrectText
  const isCorrect = displayAnswer && effectiveCorrectText ? normalize(value) === normalize(effectiveCorrectText) : null

  const handleCheck = async () => {
    let resolvedCorrectText = correctText
    let resolvedExplanation = explanation
    if (onCheck) {
      setChecking(true)
      try {
        const res = await onCheck()
        resolvedCorrectText = res?.correctText ?? null
        resolvedExplanation = res?.explanation ?? null
        setRemoteCorrectText(resolvedCorrectText)
        setRemoteExplanation(resolvedExplanation)
      } finally {
        setChecking(false)
      }
    }
    setChecked(true)
    const isAnswerCorrect = resolvedCorrectText ? normalize(value) === normalize(resolvedCorrectText) : null
    onAnswerChecked?.(isAnswerCorrect === true)
  }

  // BUGFIX: khi tra loi sai, can co nut "Lam lai" de xoa dap an dung dang hien va lam moi
  // o input, cho phep hoc vien nhap lai tu dau (truoc day khong co, input bi khoa vinh vien
  // sau khi bam "Kiem tra dap an").
  const handleRetry = () => {
    setChecked(false)
    setRemoteCorrectText(null)
    setRemoteExplanation(null)
    onChange?.('')
  }

  return (
    <div className="question-card">
      {prompt && <p className="question-prompt">{prompt}</p>}
      <input
        className="input"
        style={{ marginBottom: 0 }}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={hint ? `Gợi ý: ${hint}` : 'Nhập câu trả lời...'}
        disabled={readOnly || checked}
      />
      {displayAnswer && effectiveCorrectText && (
        <p className="text-sm mt-8" style={{ color: isCorrect ? 'var(--good)' : 'var(--bad)', fontWeight: 500 }}>
          {isCorrect ? '✓ Chính xác' : `✗ Đáp án đúng: ${effectiveCorrectText}`}
        </p>
      )}
      
      {/* Nút kiểm tra */}
      {allowCheck && !readOnly && !checked && value?.trim() && (
        <button className="btn secondary mt-16" onClick={handleCheck} disabled={checking}>
          {checking ? 'Đang kiểm tra...' : '✓ Kiểm tra đáp án'}
        </button>
      )}

      {/* Nút làm lại — chỉ hiện khi đã kiểm tra và trả lời SAI, cho phép xoá đáp án đúng
          đang hiển thị và làm mới ô input để học viên nhập lại. */}
      {allowCheck && !readOnly && checked && isCorrect === false && (
        <button className="btn secondary mt-16" onClick={handleRetry}>
          ↻ Làm lại
        </button>
      )}

      {/* Hiển thị giải thích đáp án (nếu có) sau khi đã kiểm tra */}
      {(checked || showAnswer) && (
        <ExplanationDropdown explanation={explanation || remoteExplanation} />
      )}
    </div>
  )
}