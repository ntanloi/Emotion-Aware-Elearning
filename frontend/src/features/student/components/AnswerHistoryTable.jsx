/**
 * AnswerHistoryTable — Giai đoạn 6, Bước 14 (luồng phụ).
 * Bảng lịch sử điểm các lần làm bài.
 */
export default function AnswerHistoryTable({ attempts }) {
  if (!attempts || attempts.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📄</div>
        <p>Chưa có lượt làm bài nào.</p>
      </div>
    )
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Hoạt động</th>
          <th>Ngày làm</th>
          <th>Điểm</th>
          <th>Đúng/Tổng</th>
        </tr>
      </thead>
      <tbody>
        {attempts.map((a) => (
          <tr key={a.id}>
            <td>{a.contentItemTitle || a.contentItemId}</td>
            <td>{a.submittedAt ? new Date(a.submittedAt).toLocaleString('vi-VN') : '—'}</td>
            <td>{a.score != null ? `${a.score.toFixed(0)}%` : '—'}</td>
            <td>{a.correctCount != null ? `${a.correctCount}/${a.totalQuestions}` : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
