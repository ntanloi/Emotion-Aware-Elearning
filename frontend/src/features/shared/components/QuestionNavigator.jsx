/**
 * QuestionNavigator — Giai đoạn 5, component #4.
 * Thanh điều hướng làm bài: nút Câu trước/Câu sau, công tắc "Tự động chuyển câu", nút
 * "Xáo trộn câu hỏi", và lưới số câu (bấm để nhảy nhanh, tô màu đã làm/chưa làm/review).
 * Dùng ở trang làm bài Part 1–7.
 *
 * Props:
 *  - total: number
 *  - currentIndex: number (0-based, câu ĐẦU TIÊN của trang đang xem — dùng để tô "current")
 *  - currentSpan: number (mặc định 1) — số câu thuộc trang đang xem (Part 3/4/6/7 gộp nhiều câu/trang)
 *  - answeredSet: Set<number>
 *  - reviewSet: Set<number>
 *  - onJump(index)
 *  - onPrev(), onNext(), canGoPrev, canGoNext
 *  - autoAdvance: boolean, onToggleAutoAdvance()
 *  - onShuffle(): xáo trộn thứ tự câu hỏi ngẫu nhiên cho học viên (giữ nguyên nhóm chung 1 đoạn văn)
 */
export default function QuestionNavigator({
  total,
  currentIndex,
  currentSpan = 1,
  answeredSet,
  reviewSet,
  onJump,
  onPrev,
  onNext,
  canGoPrev = true,
  canGoNext = true,
  autoAdvance,
  onToggleAutoAdvance,
  onShuffle,
}) {
  const currentEnd = currentIndex + currentSpan - 1

  return (
    <div className="practice-nav-card">
      <div className="practice-nav-controls">
        <button type="button" className="btn secondary sm" onClick={onPrev} disabled={!canGoPrev}>‹ Câu trước</button>

        <div className="practice-nav-center">
          {typeof autoAdvance === 'boolean' && (
            <label className="switch-label">
              <span className="switch">
                <input type="checkbox" checked={autoAdvance} onChange={onToggleAutoAdvance} />
                <span className="switch-slider" />
              </span>
              Tự động chuyển câu
            </label>
          )}
          {onShuffle && (
            <button type="button" className="btn ghost sm" onClick={onShuffle} title="Đảo ngẫu nhiên thứ tự câu hỏi">
              🔀 Xáo trộn câu hỏi
            </button>
          )}
        </div>

        <button type="button" className="btn secondary sm" onClick={onNext} disabled={!canGoNext}>Câu sau ›</button>
      </div>

      <p className="practice-nav-title">Danh sách bài tập:</p>
      <div className="question-nav-grid">
        {Array.from({ length: total }, (_, i) => {
          const classes = ['question-nav-item']
          if (i >= currentIndex && i <= currentEnd) classes.push('current')
          if (reviewSet?.has(i)) classes.push('review')
          else if (answeredSet?.has(i)) classes.push('answered')
          else classes.push('unanswered')
          return (
            <button key={i} className={classes.join(' ')} onClick={() => onJump(i)} type="button">
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}