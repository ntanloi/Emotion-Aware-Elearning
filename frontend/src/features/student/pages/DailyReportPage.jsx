import { useDailyReport } from '@student/hooks/useDailyReport.js'
import DailyReportCard from '@student/components/DailyReportCard.jsx'

/**
 * DailyReportPage (BaoCaoNgay) — Giai đoạn 6, Bước 12. FR-REP-01/04.
 * Backend chưa có endpoint tương ứng (xem docs ghi chú đối chiếu) — hiển thị empty-state mềm.
 */
export default function DailyReportPage() {
  const { data: reports, isLoading, isError } = useDailyReport()

  if (isLoading) return <p className="text-dim">Đang tải...</p>

  if (isError || !reports || reports.length === 0) {
    return (
      <div>
        <h2>Báo cáo ngày</h2>
        <div className="empty-state">
          <div className="icon">📊</div>
          <p>Chưa có báo cáo nào. Báo cáo ngày được hệ thống tự tổng hợp vào cuối mỗi ngày sau khi bạn học video bài giảng.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2>Báo cáo ngày</h2>
      <div className="grid cols-2 mt-16">
        {reports.map((r) => (
          <DailyReportCard key={r.id} report={r} />
        ))}
      </div>
    </div>
  )
}
