const STATUS_LABEL = { CHUA_TAO: 'Chưa tạo', DA_TAO: 'Đã tạo', DA_XEM: 'Đã xem' }

/**
 * DailyReportCard — Giai đoạn 6, Bước 12.
 * Hiển thị tổng hợp cảm xúc + lời khuyên AI trong ngày (FR-REP-01).
 */
export default function DailyReportCard({ report }) {
  return (
    <div className="card">
      <div className="flex-between">
        <h3 style={{ margin: 0 }}>{new Date(report.reportDate).toLocaleDateString('vi-VN')}</h3>
        <span className="badge neutral">{STATUS_LABEL[report.status] || report.status}</span>
      </div>
      <div className="mt-16">
        <p className="text-dim text-sm" style={{ marginBottom: 4 }}>Tổng hợp cảm xúc</p>
        <p style={{ margin: 0 }}>{report.emotionSummary || 'Chưa có dữ liệu cảm xúc trong ngày này.'}</p>
      </div>
      <div className="mt-16">
        <p className="text-dim text-sm" style={{ marginBottom: 4 }}>Lời khuyên từ AI</p>
        <p style={{ margin: 0 }}>{report.aiAdviceText || '—'}</p>
      </div>
    </div>
  )
}
