import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Activity,
  CheckCheck,
  Brain,
  CalendarX,
  ListChecks,
  ChevronRight,
} from 'lucide-react'

import { parseVnDate, formatVnDateWith, getVnTodayIso } from '@shared/utils/dateTime.js'
const STATUS_CONFIG = {
  DA_XEM: { label: 'Đã xem', badgeClass: 'badge neutral' },
  DA_TAO: { label: 'Mới • Chưa đọc', badgeClass: 'badge info' },
  CHUA_TAO: { label: 'Chưa tạo', badgeClass: 'badge neutral' },
}

/**
 * Format ngày tiếng Việt: Thứ..., dd/mm/yyyy
 */
function formatVietnameseDate(dateStr) {
  if (!dateStr) return '—'
  const d = parseVnDate(dateStr)
  if (!d) return dateStr
  return formatVnDateWith(d, {
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

/**
 * Format số giây thành chuỗi giờ/phút
 */
function formatSeconds(secs) {
  if (!secs || secs <= 0) return '0 phút'
  const m = Math.round(secs / 60)
  if (m < 60) return `${m} phút`
  const h = Math.floor(m / 60)
  const remM = m % 60
  return remM > 0 ? `${h}h ${remM}p` : `${h}h`
}

/**
 * DailyReportCard — Nâng cấp Phase R4
 * Hiển thị thẻ Báo cáo ngày với KPIs, dải màu cảm xúc, tổng hợp học tập & lời khuyên sư phạm AI.
 */
export default function DailyReportCard({ report, onMarkAsRead }) {
  const [marking, setMarking] = useState(false)

  // Parse metrics JSON an toàn
  const metrics = (() => {
    if (!report.metrics) return null
    try {
      return typeof report.metrics === 'string' ? JSON.parse(report.metrics) : report.metrics
    } catch (e) {
      return null
    }
  })()

  const handleReadClick = async (e) => {
    e.stopPropagation()
    if (!onMarkAsRead || report.status === 'DA_XEM' || marking) return
    setMarking(true)
    try {
      await onMarkAsRead(report.id)
    } finally {
      setMarking(false)
    }
  }

  const isUnread = report.status === 'DA_TAO'
  const noActivity = metrics?.noActivity === true
  const isAiAdvice = metrics?.adviceSource === 'AI'
  const nextSteps = Array.isArray(metrics?.nextSteps) ? metrics.nextSteps : []
  const todayVn = getVnTodayIso() // yyyy-mm-dd, giờ Việt Nam
  const isToday = report.reportDate === todayVn
  const positiveEmotion =
    metrics && (metrics.engagedPercent != null || metrics.interestedPercent != null)
      ? Math.round(((metrics.engagedPercent || 0) + (metrics.interestedPercent || 0)) * 10) / 10
      : null

  return (
    <div
      className="card hoverable"
      style={{
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        borderRadius: 12,
        border: isUnread ? '1.5px solid #818cf8' : '1px solid var(--border)',
        boxShadow: isUnread ? '0 4px 16px rgba(99, 102, 241, 0.08)' : 'none',
        background: 'var(--surface, #ffffff)',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
    >
      {/* 1. Header: Ngày & Trạng thái */}
      <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: isUnread ? '#e0e7ff' : '#f1f5f9',
              color: isUnread ? '#4338ca' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calendar size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, textTransform: 'capitalize' }}>
              {formatVietnameseDate(report.reportDate)}
            </h4>
            {isToday && (
              <span className="text-xs text-dim" style={{ fontSize: 11 }}>Hôm nay</span>
            )}
          </div>
        </div>

        <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
          <span
            className={STATUS_CONFIG[report.status]?.badgeClass || 'badge neutral'}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 6,
              background: isUnread ? '#eff6ff' : undefined,
              color: isUnread ? '#2563eb' : undefined,
              border: isUnread ? '1px solid #bfdbfe' : undefined,
            }}
          >
            {STATUS_CONFIG[report.status]?.label || report.status}
          </span>

          {isUnread && onMarkAsRead && (
            <button
              className="btn secondary sm flex-row"
              style={{
                gap: 4,
                fontSize: 11,
                padding: '3px 8px',
                height: 26,
                color: '#4f46e5',
                borderColor: '#c7d2fe',
              }}
              onClick={handleReadClick}
              disabled={marking}
              title="Đánh dấu báo cáo này là đã đọc"
            >
              <CheckCheck size={13} />
              <span>{marking ? '...' : 'Đã đọc'}</span>
            </button>
          )}
        </div>
      </div>



      {/* 2. Chưa có hoạt động trong ngày */}
      {noActivity && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 12,
            color: '#475569',
          }}
        >
          <CalendarX size={15} style={{ flexShrink: 0 }} />
          <span>Hôm nay bạn chưa học video hay làm bài luyện tập nào. Xem gợi ý bên dưới để bắt đầu nhé.</span>
        </div>
      )}

      {/* 3. Dải phân bổ cảm xúc (nếu có dữ liệu học video) */}
      {metrics && positiveEmotion != null && positiveEmotion > 0 && (
        <div>
          <div className="flex-between text-xs" style={{ marginBottom: 4 }}>
            <span className="text-dim" style={{ fontSize: 11 }}>Phân bổ trạng thái cảm xúc:</span>
            <div className="flex-row" style={{ gap: 10, fontSize: 11 }}>
              <span style={{ color: '#10b981', fontWeight: 600 }}>Tập trung {positiveEmotion}%</span>
              {metrics.confusedPercent > 0 && (
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>Bối rối {metrics.confusedPercent}%</span>
              )}
              {metrics.boredPercent > 0 && (
                <span style={{ color: '#ef4444', fontWeight: 600 }}>Chán/Phân tâm {metrics.boredPercent}%</span>
              )}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              height: 6,
              borderRadius: 3,
              overflow: 'hidden',
              background: '#e2e8f0',
            }}
          >
            <div
              style={{ width: `${positiveEmotion}%`, background: '#10b981' }}
              title={`Tập trung/Hứng thú: ${positiveEmotion}%`}
            />
            <div
              style={{ width: `${metrics.confusedPercent || 0}%`, background: '#f59e0b' }}
              title={`Bối rối: ${metrics.confusedPercent || 0}%`}
            />
            <div
              style={{ width: `${metrics.boredPercent || 0}%`, background: '#ef4444' }}
              title={`Mất tập trung: ${metrics.boredPercent || 0}%`}
            />
          </div>
        </div>
      )}

      {/* 4. Cảnh báo đoạn cần xem lại (nếu có dấu hiệu bối rối) */}
      {metrics?.reviewSuggested && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: 8,
            fontSize: 12,
            color: '#b45309',
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            Hôm nay có bài học bạn gặp nhiều điểm bối rối. Hãy mở tab <strong>Cảm xúc & tập trung</strong> để xem lại
            các đoạn video nhé!
          </span>
        </div>
      )}

      {/* 5. Tổng hợp hoạt động & cảm xúc */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="flex-row" style={{ gap: 6, alignItems: 'center' }}>
          <Activity size={14} color="#6366f1" />
          <span className="text-xs font-semibold" style={{ color: '#4338ca' }}>
            Tổng hợp hoạt động & cảm xúc
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text)',
            background: '#fafafa',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #f1f5f9',
          }}
        >
          {report.emotionSummary || 'Chưa có dữ liệu cảm xúc trong ngày này.'}
        </p>
      </div>

      {/* 6. Lời khuyên sư phạm cá nhân hóa từ AI */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="flex-row" style={{ gap: 6, alignItems: 'center' }}>
          <Sparkles size={14} color="var(--color-primary, #2563eb)" />
          <span className="text-xs font-semibold" style={{ color: 'var(--color-primary, #2563eb)' }}>
            {isAiAdvice ? 'Lời khuyên sư phạm cá nhân hóa từ AI' : 'Gợi ý học tập'}
          </span>
        </div>
        <div
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text, #0f172a)',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '12px 14px',
            borderRadius: 8,
          }}
        >
          {report.aiAdviceText || 'Chưa có lời khuyên cho ngày này.'}
        </div>
      </div>

      {/* 7. Bài nên học tiếp (chỉ từ danh sách bài thật của khoá học) */}
      {nextSteps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="flex-row" style={{ gap: 6, alignItems: 'center' }}>
            <ListChecks size={14} color="#059669" />
            <span className="text-xs font-semibold" style={{ color: '#047857' }}>
              {isToday ? 'Nên học tiếp hôm nay' : 'Bài nên học tiếp'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nextSteps.map((st, idx) => {
              const href = `/content-items/${st.itemId}?section=${encodeURIComponent(st.sectionCode || '')}&courseId=${st.courseId || ''}`
              return (
                <Link
                  key={st.itemId}
                  to={href}
                  title="Mở bài học này"
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '10px 12px',
                    border: '1px solid #d1fae5',
                    background: '#f0fdf4',
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span
                    style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#059669', color: '#fff',
                      fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{st.title}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {st.courseTitle && (
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 9999, background: '#e0e7ff', color: '#3730a3' }}>
                          Khoá: {st.courseTitle}
                        </span>
                      )}
                      {st.section && (
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 9999, background: '#d1fae5', color: '#065f46' }}>
                          {st.section}
                        </span>
                      )}
                      {st.groupTitle && (
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 9999, background: '#f1f5f9', color: '#475569' }}>
                          {st.groupTitle}
                        </span>
                      )}
                    </div>
                    {st.reason && (
                      <div className="text-dim" style={{ fontSize: 12, marginTop: 4 }}>{st.reason}</div>
                    )}
                  </div>
                  <ChevronRight size={16} color="#059669" style={{ flexShrink: 0, alignSelf: 'center' }} />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}