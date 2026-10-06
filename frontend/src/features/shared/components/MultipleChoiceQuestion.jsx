import { useState } from 'react'
import AudioPlayer from '@shared/components/AudioPlayer.jsx'
import ExplanationDropdown from '@shared/components/ExplanationDropdown.jsx'

/**
 * MultipleChoiceQuestion — Component câu hỏi trắc nghiệm.
 * Thêm chức năng kiểm tra đáp án ngay sau khi chọn (không cần làm hết mới biết đúng/sai).
 *
 * Props:
 *  - imageUrl, audioUrl, prompt, options: [{ id, label, content, isCorrect? }]
 *  - selectedOptionId, onSelect(optionId)
 *  - choices: string[], selectedIndex, onSelectIndex(index) (cho vocab ảo)
 *  - correctIndex (cho vocab)
 *  - readOnly, showAnswer (hiện đúng/sai sau khi nộp — cần đi kèm correctOptionId/correctIndex)
 *  - allowCheck: cho phép nút "Kiểm tra" hiện ngay sau mỗi câu
 *  - onCheck: async () => { correctOptionId, explanation } — dùng khi options[].isCorrect bị ẩn với học viên
 *    (Part 1-7/ngữ pháp/chính tả). Nếu không truyền, component tự dùng options[].isCorrect có sẵn
 *    (trường hợp luyện từ vựng, dữ liệu đã có sẵn đáp án đúng phía FE).
 *  - correctOptionId: đáp án đúng biết trước (dùng khi XEM LẠI sau khi đã nộp bài — lúc này không
 *    cần bấm "Kiểm tra" nữa, chỉ cần truyền thẳng để tô xanh đáp án đúng + đỏ đáp án đã chọn nếu sai).
 *  - onAnswerChecked(isCorrect): báo cho component cha biết kết quả NGAY khi bấm "Kiểm tra đáp án".
 *    Component cha (PracticeTestRunner) dùng callback này để quyết định có tự động chuyển câu hay
 *    không — CHỈ tự chuyển câu khi đáp án ĐÚNG (sau 2s). Nếu SAI, component chỉ tô đỏ đáp án đã
 *    chọn + tô xanh đáp án đúng, KHÔNG tự chuyển câu — học viên tự bấm nút "Câu sau" để qua câu
 *    tiếp theo.
 *  - explanation: giải thích đáp án (hiển thị qua dropdown sau khi kiểm tra)
 */
export default function MultipleChoiceQuestion({
  imageUrl,
  audioUrl,
  prompt,
  options,
  selectedOptionId,
  onSelect,
  choices,
  selectedIndex,
  onSelectIndex,
  correctIndex,
  readOnly = false,
  showAnswer = false,
  allowCheck = false,
  onCheck,
  correctOptionId,
  onAnswerChecked,
  explanation,
}) {
  const [checked, setChecked] = useState(false)
  const [checking, setChecking] = useState(false)
  const [remoteCorrectOptionId, setRemoteCorrectOptionId] = useState(null)
  const [remoteExplanation, setRemoteExplanation] = useState(null)
  const useIndexMode = !!choices

  const handleCheck = async () => {
    let resolvedCorrectId = correctOptionId
    let resolvedExplanation = explanation
    if (onCheck) {
      setChecking(true)
      try {
        const res = await onCheck()
        resolvedCorrectId = res?.correctOptionId ?? null
        resolvedExplanation = res?.explanation ?? null
        setRemoteCorrectOptionId(resolvedCorrectId)
        setRemoteExplanation(resolvedExplanation)
      } finally {
        setChecking(false)
      }
    } else if (!useIndexMode) {
      resolvedCorrectId = options?.find((o) => o.isCorrect)?.id ?? correctOptionId
    }
    setChecked(true)
    const isAnswerCorrect = useIndexMode
      ? selectedIndex === correctIndex
      : selectedOptionId === resolvedCorrectId
    onAnswerChecked?.(isAnswerCorrect)
  }

  const letters = ['A', 'B', 'C', 'D', 'E', 'F']

  // Hiển thị trạng thái đúng/sai
  const displayAnswer = showAnswer || checked

  return (
    <div className="question-card">
      {prompt && <p className="question-prompt">{prompt}</p>}
      {(imageUrl || audioUrl) && (
        <div className="question-media">
          {imageUrl && <img src={imageUrl} alt="Minh hoạ câu hỏi" />}
          {audioUrl && <AudioPlayer src={audioUrl} />}
        </div>
      )}

      <div className="options-list">
        {useIndexMode
          ? choices.map((choice, idx) => {
              const isSelected = selectedIndex === idx
              const isCorrectOpt = displayAnswer && correctIndex === idx
              const isWrongSelected = displayAnswer && isSelected && correctIndex !== idx
              const cls = ['option-row']
              if (isSelected) cls.push('selected')
              if (isCorrectOpt) cls.push('correct')
              if (isWrongSelected) cls.push('incorrect')
              return (
                <div
                  key={idx}
                  className={cls.join(' ')}
                  onClick={() => !readOnly && !checked && onSelectIndex?.(idx)}
                >
                  <span className="label">{letters[idx] || idx + 1}</span>
                  <span>{choice}</span>
                </div>
              )
            })
          : options?.map((opt, idx) => {
              const isSelected = selectedOptionId === opt.id
              // opt.isCorrect bị ẩn (null) với học viên trước khi nộp bài (Part 1-7/ngữ pháp/chính tả).
              // Sau khi bấm "Kiểm tra đáp án", remoteCorrectOptionId (lấy qua onCheck) sẽ cho biết đáp án đúng.
              const isActuallyCorrect = opt.isCorrect === true || opt.id === remoteCorrectOptionId || opt.id === correctOptionId
              const isCorrectOpt = displayAnswer && isActuallyCorrect
              const isWrongSelected = displayAnswer && isSelected && !isActuallyCorrect
              const cls = ['option-row']
              if (isSelected) cls.push('selected')
              if (isCorrectOpt) cls.push('correct')
              if (isWrongSelected) cls.push('incorrect')
              return (
                <div
                  key={opt.id}
                  className={cls.join(' ')}
                  onClick={() => !readOnly && !checked && onSelect?.(opt.id)}
                >
                  <span className="label">{opt.label || letters[idx] || idx + 1}</span>
                  <span>{opt.content}</span>
                </div>
              )
            })}
      </div>

      {/* Nút kiểm tra đáp án */}
      {allowCheck && !readOnly && !checked && (selectedOptionId || selectedIndex != null) && (
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