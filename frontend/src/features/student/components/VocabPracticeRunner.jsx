import { useEffect, useMemo, useState } from 'react'
import { useAttempt } from '@student/hooks/useAttempt.js'
import VocabPracticeTabs from '@student/components/VocabPracticeTabs.jsx'
import FlashcardCard from '@shared/components/FlashcardCard.jsx'
import MultipleChoiceQuestion from '@shared/components/MultipleChoiceQuestion.jsx'
import MatchingPairsGame from '@shared/components/MatchingPairsGame.jsx'
import FillBlankQuestion from '@shared/components/FillBlankQuestion.jsx'
import AudioPlayer from '@shared/components/AudioPlayer.jsx'
import TestResultCard from '@student/components/TestResultCard.jsx'

/**
 * VocabPracticeRunner — FR-LES-03/BR-18: 5 dạng luyện tập tự sinh từ 1 VOCAB_SET.
 * VocabPracticeTabs chọn dạng TRƯỚC, rồi mới gọi start(contentItemId, practiceType) tương ứng
 * (đúng logic ContentItemRenderer đã mô tả — VOCAB_SET có thêm 1 lớp chọn tab).
 *
 * LƯU Ý (xem docs/giai-doan-5-6-ghi-chu-doi-chieu.md mục 6): backend generateFillBlank/
 * generateMatching luôn trả kèm đáp án đúng trong field `choices` bất kể revealAnswer.
 * Ở đây, FillBlank/MATCHING chỉ dùng `choices` cho mục đích hiển thị hợp lệ (cột phải ghép cặp)
 * hoặc SAU khi nộp bài (so sánh đáp án) — không hiển thị trước cho FILL_BLANK để tránh lộ đáp án.
 */
export default function VocabPracticeRunner({ contentItem }) {
  const [practiceType, setPracticeType] = useState('FLASHCARD')
  const { attempt, result, start, submit, reset } = useAttempt()
  const [flippedWordIds, setFlippedWordIds] = useState(new Set())
  const [flashIndex, setFlashIndex] = useState(0)
  const [mcAnswers, setMcAnswers] = useState({}) // wordId -> selectedIndex
  const [fillAnswers, setFillAnswers] = useState({}) // wordId -> text
  const [matchAnswers, setMatchAnswers] = useState({}) // wordId -> matched meaning text

  useEffect(() => {
    reset()
    setFlashIndex(0)
    setFlippedWordIds(new Set())
    setMcAnswers({})
    setFillAnswers({})
    setMatchAnswers({})
    start(contentItem.id, practiceType).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentItem.id, practiceType])

  const questions = attempt?.vocabQuestions || []

  const handleSubmit = async (answers) => {
    await submit(practiceType, answers)
  }

  const handleRetry = () => {
    reset()
    setFlashIndex(0)
    setFlippedWordIds(new Set())
    setMcAnswers({})
    setFillAnswers({})
    setMatchAnswers({})
    start(contentItem.id, practiceType)
  }

  if (result) {
    return (
      <div>
        <VocabPracticeTabs active={practiceType} onChange={setPracticeType} />
        <TestResultCard result={result} onRetry={handleRetry} />
      </div>
    )
  }

  if (!attempt) return <div><VocabPracticeTabs active={practiceType} onChange={setPracticeType} /><p className="text-dim">Đang tải...</p></div>

  if (questions.length === 0) {
    return (
      <div>
        <VocabPracticeTabs active={practiceType} onChange={setPracticeType} />
        <p className="text-dim">Bộ từ vựng cần tối thiểu 4 từ để luyện dạng này.</p>
      </div>
    )
  }

  return (
    <div>
      <VocabPracticeTabs active={practiceType} onChange={setPracticeType} />

      {practiceType === 'FLASHCARD' && (
        <FlashcardRunner
          questions={questions}
          index={flashIndex}
          setIndex={setFlashIndex}
          flippedIds={flippedWordIds}
          setFlippedIds={setFlippedWordIds}
          onFinish={() => handleSubmit(questions.map((q) => ({ wordId: q.wordId })))}
        />
      )}

      {(practiceType === 'MULTIPLE_CHOICE' || practiceType === 'LISTENING') && (
        <McOrListeningRunner
          questions={questions}
          answers={mcAnswers}
          setAnswers={setMcAnswers}
          listening={practiceType === 'LISTENING'}
          onSubmit={() =>
            handleSubmit(
              questions.map((q) => ({ wordId: q.wordId, selectedChoiceIndex: mcAnswers[q.wordId] ?? null })),
            )
          }
        />
      )}

      {practiceType === 'MATCHING' && (
        <MatchingRunner
          questions={questions}
          onSubmit={(matches) =>
            handleSubmit(matches.map((m) => ({ wordId: m.wordId, submittedText: m.rightContent })))
          }
        />
      )}

      {practiceType === 'FILL_BLANK' && (
        <FillBlankRunner
          questions={questions}
          answers={fillAnswers}
          setAnswers={setFillAnswers}
          onSubmit={() =>
            handleSubmit(questions.map((q) => ({ wordId: q.wordId, submittedText: fillAnswers[q.wordId] || '' })))
          }
        />
      )}
    </div>
  )
}

function FlashcardRunner({ questions, index, setIndex, flippedIds, setFlippedIds, onFinish }) {
  const q = questions[index]

  const goNext = () => {
    setFlippedIds((prev) => new Set(prev).add(q.wordId))
    if (index < questions.length - 1) setIndex(index + 1)
  }

  const allSeen = flippedIds.size >= questions.length - (flippedIds.has(q.wordId) ? 0 : 1)

  return (
    <div>
      <p className="text-dim text-sm">Thẻ {index + 1}/{questions.length}</p>
      <FlashcardCard
        key={q.wordId}
        word={q.word}
        ipa={q.ipa}
        partOfSpeech={q.partOfSpeech}
        meaningVi={q.meaningVi}
        imageUrl={q.imageUrl}
        audioUkUrl={q.audioUkUrl}
        audioUsUrl={q.audioUsUrl}
        examples={q.examples}
      />
      <div className="flex-between mt-24">
        <button className="btn secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>← Thẻ trước</button>
        {index < questions.length - 1 ? (
          <button className="btn" onClick={goNext}>Thẻ tiếp →</button>
        ) : (
          <button className="btn" onClick={onFinish}>✅ Hoàn thành</button>
        )}
      </div>
    </div>
  )
}

function McOrListeningRunner({ questions, answers, setAnswers, listening, onSubmit }) {
  const [index, setIndex] = useState(0)
  const q = questions[index]
  const answeredCount = Object.keys(answers).length

  return (
    <div>
      <p className="text-dim text-sm">Câu {index + 1}/{questions.length}</p>
      {listening ? (
        <AudioPlayer src={q.audioUrl} />
      ) : (
        <p className="question-prompt">{q.prompt}</p>
      )}
      <MultipleChoiceQuestion
        key={q.wordId}
        choices={q.choices}
        selectedIndex={answers[q.wordId]}
        onSelectIndex={(idx) => setAnswers((prev) => ({ ...prev, [q.wordId]: idx }))}
        correctIndex={q.correctChoiceIndex || 0}
        allowCheck={true}
      />
      <div className="flex-between mt-24">
        <button className="btn secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>← Câu trước</button>
        {index < questions.length - 1 ? (
          <button className="btn" onClick={() => setIndex(index + 1)}>Câu tiếp →</button>
        ) : (
          <button className="btn" onClick={onSubmit}>✅ Nộp bài ({answeredCount}/{questions.length})</button>
        )}
      </div>
    </div>
  )
}

function MatchingRunner({ questions, onSubmit }) {
  const pairs = useMemo(
    () => questions.map((q) => ({ id: q.wordId, leftContent: q.prompt, rightContent: q.choices[0] })),
    [questions],
  )
  const [matched, setMatched] = useState([])

  const submit = () => onSubmit(matched.map((m) => ({ wordId: pairs.find((p) => p.leftContent === m.leftContent)?.id, rightContent: m.rightContent })))

  return (
    <div>
      <MatchingPairsGame pairs={pairs} onChange={setMatched} />
      <button className="btn mt-24" onClick={submit} disabled={matched.length < pairs.length}>
        ✅ Nộp bài ({matched.length}/{pairs.length})
      </button>
    </div>
  )
}

function FillBlankRunner({ questions, answers, setAnswers, onSubmit }) {
  const [index, setIndex] = useState(0)
  const q = questions[index]
  const answeredCount = Object.values(answers).filter((v) => v?.trim()).length

  return (
    <div>
      <p className="text-dim text-sm">Câu {index + 1}/{questions.length}</p>
      <FillBlankQuestion
        key={q.wordId}
        prompt={q.prompt}
        hint="Nhập từ tiếng Anh tương ứng với nghĩa trên"
        value={answers[q.wordId]}
        onChange={(v) => setAnswers((prev) => ({ ...prev, [q.wordId]: v }))}
        correctText={q.choices?.[0]}
        allowCheck={true}
      />
      <div className="flex-between mt-24">
        <button className="btn secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>← Câu trước</button>
        {index < questions.length - 1 ? (
          <button className="btn" onClick={() => setIndex(index + 1)}>Câu tiếp →</button>
        ) : (
          <button className="btn" onClick={onSubmit}>✅ Nộp bài ({answeredCount}/{questions.length})</button>
        )}
      </div>
    </div>
  )
}