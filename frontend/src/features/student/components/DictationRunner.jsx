import { useEffect, useState } from 'react'
import DictationPlayer from '@shared/components/DictationPlayer.jsx'
import TestResultCard from '@student/components/TestResultCard.jsx'
import { useAttempt } from '@student/hooks/useAttempt.js'
import * as questionsApi from '@shared/api/questions.js'

/**
 * DictationRunner — FR-LES-06: nghe và gõ lại chính tả.
 * Thêm nút kiểm tra sau mỗi câu.
 */
export default function DictationRunner({ contentItem }) {
  const { attempt, result, start, submit, reset } = useAttempt()
  const [answers, setAnswers] = useState({})
  const [index, setIndex] = useState(0)

  useEffect(() => {
    start(contentItem.id).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentItem.id])

  const questions = attempt?.questions || []
  const current = questions[index]
  const detailByQuestionId = Object.fromEntries((result?.details || []).map((d) => [d.questionId, d]))

  const handleSubmit = () => {
    submit(null, questions.map((q) => ({ questionId: q.id, submittedText: answers[q.id] || '' })))
  }

  const handleRetry = () => {
    setAnswers({})
    setIndex(0)
    reset()
    start(contentItem.id)
  }

  if (!attempt) return <p className="text-dim">Đang tải...</p>
  if (questions.length === 0) return <p className="text-dim">Chưa có bài chính tả nào.</p>

  if (result) {
    return (
      <div>
        <h2>{contentItem.title}</h2>
        {questions.map((q, i) => (
          <div key={q.id} className="card mt-16">
            <p className="text-dim text-sm">Câu {i + 1}</p>
            <DictationPlayer
              audioUrl={q.audioUrl}
              value={answers[q.id]}
              readOnly
              showAnswer
              correctText={detailByQuestionId[q.id]?.correctText}
              allowCheck={false}
              explanation={detailByQuestionId[q.id]?.explanation}
            />
          </div>
        ))}
        <TestResultCard result={result} onRetry={handleRetry} />
      </div>
    )
  }

  return (
    <div>
      <h2>{contentItem.title}</h2>
      <div className="card mt-16">
        <p className="text-dim text-sm">Câu {index + 1}/{questions.length}</p>
        <DictationPlayer
          key={current.id}
          audioUrl={current.audioUrl}
          value={answers[current.id]}
          onChange={(v) => setAnswers((prev) => ({ ...prev, [current.id]: v }))}
          correctText={current.correctText}
          allowCheck={true}
          onCheck={() => questionsApi.checkAnswer(current.id, { submittedText: answers[current.id] || '' })}
          explanation={current.explanation}
        />
        <div className="flex-between mt-24">
          <button className="btn secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>← Câu trước</button>
          {index < questions.length - 1 ? (
            <button className="btn" onClick={() => setIndex(index + 1)}>Câu tiếp →</button>
          ) : (
            <button className="btn" onClick={handleSubmit}>✅ Nộp bài</button>
          )}
        </div>
      </div>
    </div>
  )
}