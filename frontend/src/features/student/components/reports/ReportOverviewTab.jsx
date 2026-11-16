import React, { useMemo, useState } from 'react'
import {
  Clock,
  PlayCircle,
  TrendingUp,
  Award,
  Layers,
  Flame,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import DailyReportCard from '@student/components/DailyReportCard.jsx'
import EmptyState from '@shared/components/ui/EmptyState.jsx'

function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0 phút'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) {
    return `${hours} giờ ${minutes > 0 ? `${minutes} phút` : ''}`
  }
  return `${minutes} phút`
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`
  }
  return dateStr
}

export default function ReportOverviewTab({
  overviewData,
  days,
  dailyReports = [],
  generatingReport,
  onGenerateTodayReport,
  onMarkAsRead,
}) {
  const [showAllDailyReports, setShowAllDailyReports] = useState(false)

  // Chuẩn bị dữ liệu Recharts
  const chartData = useMemo(() => {
    if (!overviewData?.dailyActivity) return []
    return overviewData.dailyActivity.map((point) => ({
      dateLabel: formatDateShort(point.date),
      fullDate: point.date,
      studyMinutes: Math.round((point.studySeconds / 60) * 10) / 10,
      focusScore: point.focusScore,
      videoSessionsCount: point.videoSessionsCount,
      practiceAttemptsCount: point.practiceAttemptsCount,
    }))
  }, [overviewData])

  const visibleDailyReports = showAllDailyReports ? dailyReports : dailyReports.slice(0, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. 4 KPI Cards Grid */}
      <div className="report-overview-kpi-grid">
        {/* Card 1: Thời gian học (dòng phụ "N buổi video") */}
        <div className="report-overview-kpi-card">
          <div className="report-kpi-header">
            <div className="report-kpi-icon-wrap" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Clock size={14} />
            </div>
            <span className="report-kpi-label">Thời gian học</span>
          </div>
          <div className="report-kpi-val">
            {formatDuration(overviewData.kpi.totalStudySeconds)}
          </div>
          <div className="report-kpi-sub">
            {overviewData.kpi.totalSessions || 0} buổi video
          </div>
        </div>

        {/* Card 2: Độ tập trung TB */}
        <div className="report-overview-kpi-card">
          <div className="report-kpi-header">
            <div className="report-kpi-icon-wrap" style={{ background: 'var(--good-soft, #ecfdf5)', color: 'var(--good, #059669)' }}>
              <TrendingUp size={14} />
            </div>
            <span className="report-kpi-label">Độ tập trung TB</span>
          </div>
          <div className="report-kpi-val">
            {overviewData.kpi.avgFocusScore != null ? `${overviewData.kpi.avgFocusScore}%` : 'Chưa đủ mẫu'}
          </div>
          <div className="report-kpi-sub">Ước lượng qua AI</div>
        </div>

        {/* Card 3: Điểm luyện tập */}
        <div className="report-overview-kpi-card">
          <div className="report-kpi-header">
            <div className="report-kpi-icon-wrap" style={{ background: 'var(--color-primary-soft, rgba(37, 99, 235, 0.08))', color: 'var(--color-primary)' }}>
              <Award size={14} />
            </div>
            <span className="report-kpi-label">Điểm luyện tập</span>
          </div>
          <div className="report-kpi-val">
            {overviewData.kpi.avgPracticeScore != null ? `${overviewData.kpi.avgPracticeScore}%` : '—'}
          </div>
          <div className="report-kpi-sub">Điểm bài kiểm tra</div>
        </div>

        {/* Card 4: Tiến độ khóa học */}
        <div className="report-overview-kpi-card">
          <div className="report-kpi-header">
            <div className="report-kpi-icon-wrap" style={{ background: 'var(--info-soft, #ecfeff)', color: 'var(--info, #0891b2)' }}>
              <Layers size={14} />
            </div>
            <span className="report-kpi-label">Tiến độ khóa học</span>
          </div>
          <div className="report-kpi-val">{overviewData.kpi.courseProgressPercent}%</div>
          <div className="report-kpi-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--surface-2, #f1f5f9)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(1, overviewData.kpi.courseProgressPercent))}%`,
                  height: '100%',
                  background: 'var(--color-accent, #0891b2)',
                  borderRadius: 2,
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>hoàn thành</span>
          </div>
        </div>
      </div>

      {/* 2. Nhật ký học tập hàng ngày (Được đưa lên thay thế khối nhận xét nổi bật) */}
      <div className="card" style={{ padding: 22, borderRadius: 12 }}>
        <div className="flex-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
            <Calendar size={18} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 600 }}>
              Lời khuyên học tập
            </h3>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 9999,
                background: '#eff6ff',
                color: '#2563eb',
              }}
            >
              {dailyReports.length} bản ghi
            </span>
          </div>

          <button
            className="btn secondary sm flex-row"
            style={{ gap: 6, borderRadius: 8, fontSize: 12.5 }}
            onClick={onGenerateTodayReport}
            disabled={generatingReport}
          >
            <Sparkles size={13} color="var(--accent)" />
            <span>{generatingReport ? 'Đang tổng hợp...' : 'Tổng hợp báo cáo hôm nay'}</span>
          </button>
        </div>

        {dailyReports.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Chưa có bản ghi nhật ký ngày nào"
            description="Báo cáo ngày sẽ tự động tổng hợp sau các buổi học video hoặc bài kiểm tra."
            actionText="Tạo báo cáo ngày hôm nay"
            onAction={onGenerateTodayReport}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="daily-reports-grid">
              {visibleDailyReports.map((r) => (
                <DailyReportCard key={r.id} report={r} onMarkAsRead={onMarkAsRead} />
              ))}
            </div>

            {dailyReports.length > 1 && (
              <div style={{ textAlign: 'center', marginTop: 6 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  style={{ borderRadius: 8, fontSize: 12.5 }}
                  onClick={() => setShowAllDailyReports((prev) => !prev)}
                >
                  {showAllDailyReports ? (
                    <span className="flex-row" style={{ gap: 4 }}>
                      <ChevronUp size={14} /> Thu gọn nhật ký
                    </span>
                  ) : (
                    <span className="flex-row" style={{ gap: 4 }}>
                      <ChevronDown size={14} /> Xem thêm ({dailyReports.length - 1} ngày khác)
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Biểu đồ Thời gian học & Độ tập trung theo ngày */}
      <div className="card" style={{ padding: 24, borderRadius: 12 }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            Thời gian học theo ngày
          </h3>
        </div>

        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  stroke="#cbd5e1"
                  unit="p"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const d = payload[0].payload
                    return (
                      <div
                        style={{
                          background: '#1f2937',
                          color: '#fff',
                          padding: '10px 14px',
                          borderRadius: 8,
                          fontSize: 12,
                          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 6, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={13} style={{ color: '#9ca3af' }} />
                          <span>{d.fullDate}</span>
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          Thời gian học: <strong>{d.studyMinutes} phút</strong>
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          Điểm tập trung:{' '}
                          <strong style={{ color: d.focusScore != null ? '#34d399' : '#9ca3af' }}>
                            {d.focusScore != null ? `${d.focusScore}%` : 'Không có camera/mẫu'}
                          </strong>
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                          {d.videoSessionsCount} buổi video • {d.practiceAttemptsCount} bài luyện tập
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="studyMinutes"
                  name="Thời gian học (phút)"
                  fill="var(--color-primary, #2563eb)"
                  radius={[4, 4, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
            Chưa có dữ liệu học tập trong khoảng thời gian này.
          </div>
        )}
      </div>
    </div>
  )
}
