import { RotateCcw } from 'lucide-react'

export default function AttemptBadge({ attempt, onRestart }) {
  if (!attempt) return null

  if (attempt.status === 'VALID') {
    return (
      <div className="attempt-badge ok">
        <span>Video này đã đạt yêu cầu nhận thưởng</span>
      </div>
    )
  }

  if (attempt.status === 'INVALID') {
    return (
      <div className="attempt-badge bad">
        <span>Lượt xem này chưa đạt (rời camera hoặc mất tập trung quá 30%).</span>
        {onRestart && (
          <button type="button" onClick={onRestart} className="attempt-restart-btn">
            <RotateCcw size={13} />
            <span>Thử lại bằng lượt mới</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="attempt-badge">
      <span>Đã xem có mặt {Math.round(attempt.coveragePercent || 0)}% · Tỷ lệ xấu {Math.round(attempt.badPercent || 0)}%</span>
    </div>
  )
}
