import { useState } from 'react'
import { useFlashcards } from '@student/hooks/useFlashcards.js'
import FlashcardCard from '@shared/components/FlashcardCard.jsx'

const STATUS_LABEL = { NEW: 'Mới', LEARNING: 'Đang học', MASTERED: 'Đã thành thạo' }

/**
 * FlashcardReviewPage (OnTapFlashcardTongHop) — Giai đoạn 6, Bước 11.
 * FR-LES-07: gom TỰ ĐỘNG mọi từ đã học từ mọi Unit/khóa học đã đăng ký.
 */
export default function FlashcardReviewPage() {
  const { data: progressList, isLoading, review, reviewing } = useFlashcards()
  const [index, setIndex] = useState(0)

  if (isLoading) return <p className="text-dim">Đang tải...</p>

  const dueList = progressList || []

  if (dueList.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🎉</div>
        <p>Chưa có từ vựng nào cần ôn tập. Hãy học thêm từ mới ở các khóa học!</p>
      </div>
    )
  }

  const current = dueList[Math.min(index, dueList.length - 1)];

  const handleReview = async (knewIt) => {
    await review({ wordId: current.wordId, knewIt })
    setIndex((i) => Math.min(i + 1, dueList.length - 1))
  }

  return (
    <div>
      <h2>Ôn tập Flashcards tổng hợp</h2>
      <p className="text-dim">{dueList.length} từ • Thẻ {index + 1}/{dueList.length}</p>
      <span className="badge neutral">{STATUS_LABEL[current.status] || current.status}</span>

      <div className="mt-24">
        <FlashcardCard
          key={current.wordId}
          word={current.word}
          ipa={current.ipa}
          partOfSpeech={current.partOfSpeech}
          meaningVi={current.meaningVi}
          imageUrl={current.imageUrl}
          audioUkUrl={current.audioUkUrl}
          audioUsUrl={current.audioUsUrl}
          examples={current.examples}
          onKnow={() => handleReview(true)}
          onDontKnow={() => handleReview(false)}
        />
      </div>
      {reviewing && <p className="text-dim text-sm mt-8">Đang lưu...</p>}
    </div>
  )
}