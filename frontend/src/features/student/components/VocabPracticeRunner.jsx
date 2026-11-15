import { useEffect, useMemo, useState } from 'react'
import { useAttempt } from '@student/hooks/useAttempt.js'
import VocabPracticeTabs from '@student/components/VocabPracticeTabs.jsx'
import FlashcardCard from '@shared/components/FlashcardCard.jsx'
import MultipleChoiceQuestion from '@shared/components/MultipleChoiceQuestion.jsx'
import MatchingPairsGame from '@shared/components/MatchingPairsGame.jsx'
import FillBlankQuestion from '@shared/components/FillBlankQuestion.jsx'
import AudioPlayer from '@shared/components/AudioPlayer.jsx'
import TestResultCard from '@student/components/TestResultCard.jsx'
import { recordVocabCompleted } from '@student/api/progress.js'
import { ArrowLeft, ArrowRight, Volume2, Sparkles, BookOpen, CheckCircle2, Shuffle } from 'lucide-react'

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
          onFinish={() => {
            recordVocabCompleted(contentItem.id).catch(() => {})
            handleSubmit(questions.map((q) => ({ wordId: q.wordId })))
          }}
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
          <button className="btn" onClick={onFinish}>Hoàn thành</button>
        )}
      </div>
    </div>
  )
}

function McOrListeningRunner({ questions, answers, setAnswers, listening, onSubmit }) {
  const [list, setList] = useState(questions)
  const [index, setIndex] = useState(0)

  // Cập nhật lại list khi questions ban đầu thay đổi
  useEffect(() => {
    setList(questions)
    setIndex(0)
  }, [questions])

  const handleShuffle = () => {
    setList((prev) => {
      const copy = [...prev]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    })
    setIndex(0)
  }

  const q = list[index] || questions[0]
  const answeredCount = Object.keys(answers).length
  const progressPercent = Math.round(((index + 1) / list.length) * 100)

  return (
    <div className="vocab-quiz-container">
      {/* Thanh tiến độ làm bài */}
      <div className="vocab-quiz-progress-section">
        <div className="vocab-quiz-meta-row">
          <div className="flex-row items-center" style={{ gap: 10 }}>
            <span className="vocab-quiz-step-badge">
              Câu <strong>{index + 1}</strong> / {list.length}
            </span>
            <button
              type="button"
              className="vocab-quiz-shuffle-btn"
              onClick={handleShuffle}
              title="Xáo trộn ngẫu nhiên thứ tự các câu hỏi"
            >
              <Shuffle size={13} />
              <span>Xáo trộn</span>
            </button>
          </div>
          <span className="vocab-quiz-status-badge">
            Đã chọn: <strong>{answeredCount}</strong>/{list.length}
          </span>
        </div>
        <div className="vocab-quiz-progress-track">
          <div className="vocab-quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Thẻ từ vựng câu hỏi */}
      <div className="vocab-quiz-prompt-card">
        <div className="vocab-quiz-prompt-label">
          {listening ? (
            <>
              <Volume2 size={14} />
              <span>Nghe và chọn nghĩa của từ vừa phát:</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>Chọn nghĩa đúng của từ vựng:</span>
            </>
          )}
        </div>

        {listening ? (
          <div className="vocab-quiz-audio-center">
            <AudioPlayer src={q.audioUrl} />
          </div>
        ) : (
          <h2 className="vocab-quiz-target-word">{q.prompt}</h2>
        )}
      </div>

      {/* Danh sách 4 đáp án A, B, C, D */}
      <div className="vocab-quiz-body">
        <MultipleChoiceQuestion
          key={q.wordId}
          choices={q.choices}
          selectedIndex={answers[q.wordId]}
          onSelectIndex={(idx) => setAnswers((prev) => ({ ...prev, [q.wordId]: idx }))}
          correctIndex={q.correctChoiceIndex}
          allowCheck={true}
        />
      </div>

      {/* Thanh nút chuyển câu */}
      <div className="vocab-quiz-nav-row">
        <button
          type="button"
          className="btn secondary sm flex-row"
          style={{ gap: 6 }}
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ArrowLeft size={14} />
          <span>Câu trước</span>
        </button>

        {index < list.length - 1 ? (
          <button
            type="button"
            className="btn sm flex-row"
            style={{ gap: 6 }}
            onClick={() => setIndex(index + 1)}
          >
            <span>Câu tiếp</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="btn sm flex-row"
            style={{ gap: 6 }}
            onClick={onSubmit}
          >
            <span>Nộp bài ({answeredCount}/{list.length})</span>
          </button>
        )}
      </div>
    </div>
  )
}

/** Số cặp tối đa mỗi vòng ghép cặp */
const ROUND_SIZE = 8

function MatchingRunner({ questions, onSubmit }) {
  const allPairs = useMemo(
    () => questions.map((q) => ({ id: q.wordId, leftContent: q.prompt, rightContent: q.choices[0] })),
    [questions],
  )

  // Chia thành các vòng ROUND_SIZE cặp
  const rounds = useMemo(() => {
    const result = []
    for (let i = 0; i < allPairs.length; i += ROUND_SIZE) {
      result.push(allPairs.slice(i, i + ROUND_SIZE))
    }
    return result
  }, [allPairs])

  const [roundIndex, setRoundIndex] = useState(0)
  const [allMatched, setAllMatched] = useState([]) // tích lũy tất cả các vòng
  const [roundMatched, setRoundMatched] = useState([]) // matches của vòng hiện tại
  const [roundDone, setRoundDone] = useState(false)

  const currentRound = rounds[roundIndex] || []
  const totalRounds = rounds.length
  const isLastRound = roundIndex === totalRounds - 1

  // Khi game ghép báo kết quả → kiểm tra xong vòng chưa
  const handleRoundChange = (matched) => {
    setRoundMatched(matched)
    setRoundDone(matched.length === currentRound.length)
  }

  const handleNextRound = () => {
    const enriched = roundMatched.map((m) => ({
      wordId: allPairs.find((p) => p.leftContent === m.leftContent)?.id,
      rightContent: m.rightContent,
    }))
    setAllMatched((prev) => [...prev, ...enriched])
    setRoundMatched([])
    setRoundDone(false)
    setRoundIndex((i) => i + 1)
  }

  const handleSubmit = () => {
    const enriched = roundMatched.map((m) => ({
      wordId: allPairs.find((p) => p.leftContent === m.leftContent)?.id,
      rightContent: m.rightContent,
    }))
    onSubmit([...allMatched, ...enriched])
  }

  const totalMatched = allMatched.length + roundMatched.length

  return (
    <div className="vocab-matching-runner-wrap">
      {/* Thanh tiến độ tổng theo vòng */}
      <div className="matching-round-progress-bar">
        <div className="matching-round-info">
          <span className="matching-round-badge">
            Vòng <strong>{roundIndex + 1}</strong> / {totalRounds}
          </span>
          <span className="matching-round-total">
            Tổng: <strong>{totalMatched}</strong> / {allPairs.length} cặp
          </span>
        </div>
        <div className="matching-round-track">
          {rounds.map((_, i) => (
            <div
              key={i}
              className={`matching-round-seg${i < roundIndex ? ' done' : i === roundIndex ? ' active' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Game ghép cặp vòng hiện tại — key=roundIndex để reset hoàn toàn khi đổi vòng */}
      <MatchingPairsGame key={roundIndex} pairs={currentRound} onChange={handleRoundChange} />

      <div className="vocab-matching-footer">
        {roundDone && (
          <div className="vocab-matching-success-callout">
            <CheckCircle2 size={18} />
            {isLastRound ? (
              <span>Xuất sắc! Đã ghép xong tất cả {allPairs.length} cặp. Nhấn nộp bài để hoàn thành!</span>
            ) : (
              <span>Vòng {roundIndex + 1} hoàn thành! Tiếp tục vòng tiếp theo.</span>
            )}
          </div>
        )}

        {roundDone &&
          (isLastRound ? (
            <button
              type="button"
              className="btn flex-row"
              style={{ gap: 8, minWidth: 220, justifyContent: 'center' }}
              onClick={handleSubmit}
            >
              <CheckCircle2 size={16} />
              <span>Hoàn thành &amp; Nộp bài</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn flex-row"
              style={{ gap: 8, minWidth: 220, justifyContent: 'center' }}
              onClick={handleNextRound}
            >
              <ArrowRight size={16} />
              <span>
                Vòng tiếp theo ({roundIndex + 2}/{totalRounds})
              </span>
            </button>
          ))}

        {!roundDone && (
          <p className="text-dim text-sm" style={{ textAlign: 'center' }}>
            Ghép đúng <strong>{roundMatched.length}/{currentRound.length}</strong> cặp trong vòng này để tiếp tục
          </p>
        )}
      </div>
    </div>
  )
}

function FillBlankRunner({ questions, answers, setAnswers, onSubmit }) {
  const [list, setList] = useState(questions)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setList(questions)
    setIndex(0)
  }, [questions])

  const handleShuffle = () => {
    setList((prev) => {
      const copy = [...prev]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    })
    setIndex(0)
  }

  const q = list[index] || questions[0]
  const answeredCount = Object.values(answers).filter((v) => v?.trim()).length
  const progressPercent = Math.round(((index + 1) / list.length) * 100)

  return (
    <div className="vocab-quiz-container">
      {/* Thanh tiến độ */}
      <div className="vocab-quiz-progress-section">
        <div className="vocab-quiz-meta-row">
          <div className="flex-row items-center" style={{ gap: 10 }}>
            <span className="vocab-quiz-step-badge">
              Câu <strong>{index + 1}</strong> / {list.length}
            </span>
            <button
              type="button"
              className="vocab-quiz-shuffle-btn"
              onClick={handleShuffle}
              title="Xáo trộn ngẫu nhiên thứ tự các câu hỏi"
            >
              <Shuffle size={13} />
              <span>Xáo trộn</span>
            </button>
          </div>
          <span className="vocab-quiz-status-badge">
            Đã điền: <strong>{answeredCount}</strong>/{list.length}
          </span>
        </div>
        <div className="vocab-quiz-progress-track">
          <div className="vocab-quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Thẻ nghĩa từ vựng */}
      <div className="vocab-quiz-prompt-card">
        <div className="vocab-quiz-prompt-label">
          <BookOpen size={14} />
          <span>Dịch nghĩa / Điền từ tiếng Anh tương ứng:</span>
        </div>
        <h3 className="vocab-quiz-target-meaning">{q.prompt}</h3>
      </div>

      <div className="vocab-quiz-body">
        <FillBlankQuestion
          key={q.wordId}
          hint="Nhập từ tiếng Anh tương ứng với nghĩa trên"
          value={answers[q.wordId]}
          onChange={(v) => setAnswers((prev) => ({ ...prev, [q.wordId]: v }))}
          correctText={q.choices?.[0]}
          allowCheck={true}
        />
      </div>

      <div className="vocab-quiz-nav-row">
        <button
          type="button"
          className="btn secondary sm flex-row"
          style={{ gap: 6 }}
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ArrowLeft size={14} />
          <span>Câu trước</span>
        </button>

        {index < list.length - 1 ? (
          <button
            type="button"
            className="btn sm flex-row"
            style={{ gap: 6 }}
            onClick={() => setIndex(index + 1)}
          >
            <span>Câu tiếp</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="btn sm flex-row"
            style={{ gap: 6 }}
            onClick={onSubmit}
          >
            <span>Nộp bài ({answeredCount}/{list.length})</span>
          </button>
        )}
      </div>
    </div>
  )
}