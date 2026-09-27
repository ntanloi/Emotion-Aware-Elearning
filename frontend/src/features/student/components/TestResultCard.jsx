/**
 * TestResultCard — Giai đoạn 5, component #8.
 * Card kết quả sau khi nộp bài (Part 1-7/ngữ pháp/chính tả/vocab). result: AttemptResultDto.
 */
export default function TestResultCard({ result, onRetry, onReview }) {
  if (!result) return null
  const score = result.score ?? 0
  const level = score >= 80 ? 'good' : score >= 50 ? 'warn' : 'bad'

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2>Kết quả</h2>
      <div style={{ fontSize: 42, fontWeight: 800, margin: '12px 0' }} className={level === 'good' ? 'text-good' : ''}>
        <span className={`badge ${level}`} style={{ fontSize: 28, padding: '8px 20px' }}>
          {score.toFixed(0)}%
        </span>
      </div>
      <p className="text-dim">
        Đúng {result.correctCount}/{result.totalQuestions} câu
      </p>
      <div className="flex-row" style={{ justifyContent: 'center', marginTop: 16 }}>
        {onReview && <button className="btn secondary" onClick={onReview}>Xem lại đáp án</button>}
        {onRetry && <button className="btn" onClick={onRetry}>Làm lại</button>}
      </div>
    </div>
  )
}
