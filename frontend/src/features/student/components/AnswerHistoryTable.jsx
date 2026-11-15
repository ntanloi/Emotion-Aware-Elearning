import { Link } from 'react-router-dom'
import { ClipboardList, ArrowRight, CheckCircle2 } from 'lucide-react'

/**
 * AnswerHistoryTable — Bảng lịch sử điểm các lần làm bài tập / thi thử.
 */
export default function AnswerHistoryTable({ attempts }) {
  if (!attempts || attempts.length === 0) {
    return (
      <div className="profile-empty-history-card">
        <div className="profile-empty-icon-wrap">
          <ClipboardList size={32} />
        </div>
        <h4 className="profile-empty-title">Chưa có lượt làm bài nào</h4>
        <p className="profile-empty-desc">
          Khi bạn hoàn thành các bài trắc nghiệm, bài nghe chép chính tả hoặc đề thi thử TOEIC, kết quả chi tiết sẽ được ghi nhận tại đây.
        </p>
        <Link to="/courses" className="btn sm hero-btn-primary flex-row" style={{ gap: 6, marginTop: 12 }}>
          <span>Làm bài luyện tập ngay</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    )
  }

  return (
    <div className="profile-history-table-wrap">
      <table className="table profile-history-table">
        <thead>
          <tr>
            <th>Hoạt động / Bài tập</th>
            <th>Thời gian nộp bài</th>
            <th>Kết quả câu đúng</th>
            <th>Điểm số</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => {
            const scoreNum = a.score != null ? Math.round(a.score) : null
            const isHigh = scoreNum != null && scoreNum >= 80
            const isMid = scoreNum != null && scoreNum >= 50 && scoreNum < 80

            return (
              <tr key={a.id}>
                <td>
                  <strong className="text-sm">{a.contentItemTitle || a.contentItemId}</strong>
                </td>
                <td className="text-dim text-sm">
                  {a.submittedAt ? new Date(a.submittedAt).toLocaleString('vi-VN') : '—'}
                </td>
                <td className="text-sm">
                  {a.correctCount != null ? (
                    <span className="font-semibold">
                      {a.correctCount} / {a.totalQuestions} câu
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {scoreNum != null ? (
                    <span
                      className="score-badge"
                      style={{
                        background: isHigh ? 'var(--good-soft)' : isMid ? 'rgba(37, 99, 235, 0.1)' : 'var(--warn-soft)',
                        color: isHigh ? 'var(--good)' : isMid ? 'var(--accent)' : 'var(--warn)',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: '13px',
                      }}
                    >
                      {scoreNum}%
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
