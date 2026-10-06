import { useEffect, useState } from 'react'
import RichTextViewer from '@shared/components/RichTextViewer.jsx'
import FillBlankQuestion from '@shared/components/FillBlankQuestion.jsx'
import TestResultCard from '@student/components/TestResultCard.jsx'
import { useAttempt } from '@student/hooks/useAttempt.js'
import * as questionsApi from '@shared/api/questions.js'

/**
 * GrammarRunner — FR-LES-04: đọc lý thuyết ngữ pháp + làm bài điền từ.
 * Thêm nút kiểm tra cho mỗi câu.
 */
export default function GrammarRunner({ contentItem }) {
  const [questions, setQuestions] = useState([])
  const { attempt, result, start, submit, reset } = useAttempt()
  const [answers, setAnswers] = useState({})

  useEffect(() => {
    questionsApi.listQuestions(contentItem.id).then(setQuestions).catch(() => setQuestions([]))
    start(contentItem.id).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentItem.id])

  const detailByQuestionId = Object.fromEntries((result?.details || []).map((d) => [d.questionId, d]))

  const handleSubmit = () => {
    submit(null, questions.map((q) => ({ questionId: q.id, submittedText: answers[q.id] || '' })))
  }

  const handleRetry = () => {
    setAnswers({})
    reset()
    start(contentItem.id)
  }

  return (
    <div>
      <h2>{contentItem.title}</h2>
      <div className="card mt-16">
        <RichTextViewer html={contentItem.bodyHtml} />
      </div>

      {questions.length > 0 && (
        <div className="card mt-24">
          <h3>Bài luyện tập</h3>
          {!result ? (
            <>
              {questions.map((q, i) => (
                <div key={q.id} className="mt-16">
                  <p className="text-dim text-sm">Câu {i + 1}</p>
                  <FillBlankQuestion
                    prompt={q.promptText}
                    hint={q.hint}
                    value={answers[q.id]}
                    onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                    correctText={q.correctText}
                    allowCheck={true}
                    explanation={q.explanation}
                  />
                </div>
              ))}
              <button className="btn mt-16" onClick={handleSubmit}>✅ Nộp bài</button>
            </>
          ) : (
            <>
              {questions.map((q, i) => (
                <div key={q.id} className="mt-16">
                  <p className="text-dim text-sm">Câu {i + 1}</p>
                  <FillBlankQuestion
                    prompt={q.promptText}
                    value={answers[q.id]}
                    readOnly
                    showAnswer
                    correctText={detailByQuestionId[q.id]?.correctText}
                    explanation={detailByQuestionId[q.id]?.explanation}
                  />
                </div>
              ))}
              <TestResultCard result={result} onRetry={handleRetry} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

