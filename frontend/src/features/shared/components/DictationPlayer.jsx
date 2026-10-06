import { useState } from 'react'
import AudioPlayer from '@shared/components/AudioPlayer.jsx'
import ExplanationDropdown from '@shared/components/ExplanationDropdown.jsx'

/**
 * DictationPlayer — Component nghe chép chính tả.
 * Thêm nút kiểm tra đáp án sau mỗi câu.
 *
 * Props:
 *  - audioUrl
 *  - value, onChange(text)
 *  - readOnly, showAnswer, correctText
 *  - allowCheck: cho phép kiểm tra ngay
 *  - onCheck: async () => { correctText, explanation } — dùng khi correctText bị ẩn với học viên trước khi nộp bài.
 *  - explanation: giải thích đáp án (hiển thị qua dropdown sau khi kiểm tra)
 */
export default function DictationPlayer({
  audioUrl,
  value,
  onChange,
  readOnly = false,
  showAnswer = false,
  correctText,
  allowCheck = false,
  onCheck,
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
    if (onCheck) {
      setChecking(true)
      try {
        const res = await onCheck()
        setRemoteCorrectText(res?.correctText ?? null)
        setRemoteExplanation(res?.explanation ?? null)
      } finally {
        setChecking(false)
      }
    }
    setChecked(true)
  }

  return (
    <div className="question-card">
      <AudioPlayer src={audioUrl} />
      <textarea
        className="input"
        rows={3}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Nghe và gõ lại chính xác nội dung..."
        disabled={readOnly || checked}
        style={{ marginBottom: 0, resize: 'vertical' }}
      />
      {displayAnswer && effectiveCorrectText && (
        <div className="mt-8">
          <p className="text-sm" style={{ color: isCorrect ? 'var(--good)' : 'var(--bad)', fontWeight: 500 }}>
            {isCorrect ? '✓ Chính xác' : '✗ Chưa khớp — đối chiếu đáp án dưới đây:'}
          </p>
          {!isCorrect && <p className="dictation-answer-diff mt-8">{effectiveCorrectText}</p>}
        </div>
      )}
      
      {/* Nút kiểm tra */}
      {allowCheck && !readOnly && !checked && value?.trim() && (
        <button className="btn secondary mt-16" onClick={handleCheck} disabled={checking}>
          {checking ? 'Đang kiểm tra...' : '✓ Kiểm tra đáp án'}
        </button>
      )}

      {/* Hiển thị giải thích đáp án (nếu có) sau khi đã kiểm tra */}
      {(checked || showAnswer) && (
        <ExplanationDropdown explanation={explanation || remoteExplanation} />
      )}
    </div>
  )
}