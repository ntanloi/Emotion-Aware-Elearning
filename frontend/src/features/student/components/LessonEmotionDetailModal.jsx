import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Clock,
  Sparkles,
  AlertTriangle,
  PlayCircle,
  Smile,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { getStudentLessonEmotionDetail } from '@student/api/reports.js'

function formatSeconds(sec) {
  if (!sec && sec !== 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
}

function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0 phút'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) {
    return `${hours} giờ ${minutes > 0 ? `${minutes} phút` : ''}`
  }
  return `${minutes} phút`
}

function getSegmentReasonInfo(seg, timeline = []) {
  const buckets = (timeline || []).filter(
    (b) => b.startSecond >= seg.startSecond && b.startSecond < seg.endSecond
  )
  let totalNoFace = 0
  let totalBored = 0
  let totalConfused = 0

  buckets.forEach((b) => {
    totalNoFace += b.noFaceCount || 0
    totalBored += b.boredCount || 0
    totalConfused += b.confusedCount || 0
  })

  if (totalNoFace > totalBored && totalNoFace > totalConfused && totalNoFace > 0) {
    return { label: 'Rời camera', color: '#6d28d9', bg: '#f3e8ff', border: '#ddd6fe' }
  }
  if (totalConfused > totalBored || (seg.averageConfusion > seg.averageBoredom)) {
    return { label: 'Bối rối', color: '#b45309', bg: '#fef3c7', border: '#fde68a' }
  }
  return { label: 'Mất tập trung', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' }
}

function getEmotionBarColor(b) {
  const dominant = (b.dominantEmotion || '').toUpperCase()
  if (dominant === 'ENGAGED') return '#10b981'
  if (dominant === 'INTERESTED') return '#06b6d4'
  if (dominant === 'CONFUSED') return '#f59e0b'
  if (dominant === 'BORED') return '#ef4444'
  if (dominant === 'NO_FACE') return '#8b5cf6'

  // Fallback nếu không có dominantEmotion:
  const counts = [
    { type: 'ENGAGED', count: b.engaged || 0, color: '#10b981' },
    { type: 'INTERESTED', count: b.interested || 0, color: '#06b6d4' },
    { type: 'CONFUSED', count: b.confused || 0, color: '#f59e0b' },
    { type: 'BORED', count: b.bored || 0, color: '#ef4444' },
    { type: 'NO_FACE', count: b.noFace || 0, color: '#8b5cf6' },
  ]
  counts.sort((x, y) => y.count - x.count)
  if (counts[0].count > 0) return counts[0].color

  if (b.focusScore != null) {
    if (b.focusScore >= 70) return '#10b981'
    if (b.focusScore >= 50) return '#f59e0b'
    return '#ef4444'
  }
  return '#cbd5e1'
}

export default function LessonEmotionDetailModal({ contentItemId, lessonSummary, onClose }) {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!contentItemId) return
    setLoading(true)
    setError(null)
    getStudentLessonEmotionDetail(contentItemId)
      .then((res) => setData(res))
      .catch((err) => {
        console.error('Lỗi tải chi tiết cảm xúc bài học:', err)
        setError('Không thể tải chi tiết cảm xúc của bài học.')
      })
      .finally(() => setLoading(false))
  }, [contentItemId])

  const handleSeekReview = (startSec) => {
    navigate(`/content-items/${contentItemId}?t=${startSec}`)
  }

  const chartData = (data?.timeline || []).map((b) => ({
    timeLabel: formatSeconds(b.startSecond),
    startSecond: b.startSecond,
    endSecond: b.endSecond,
    focusScore: b.focusScore,
    engaged: b.engagedCount,
    interested: b.interestedCount,
    confused: b.confusedCount,
    bored: b.boredCount,
    noFace: b.noFaceCount,
    dominantEmotion: b.dominantEmotion,
  }))

  const displayFocusScore = lessonSummary?.focusScore ?? data?.overallFocusScore
  const displayPresenceRate = lessonSummary?.presenceRate ?? data?.presenceRate

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-panel"
        style={{ maxWidth: 860, maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="badge neutral" style={{ fontSize: 11 }}>
                {data?.courseTitle || lessonSummary?.courseTitle || 'Khóa học'}
              </span>
              {(data?.videoDurationSeconds || lessonSummary?.totalActiveSeconds) && (
                <span className="text-dim text-xs flex-row" style={{ gap: 4, alignItems: 'center' }}>
                  <Clock size={12} />
                  {formatSeconds(data?.videoDurationSeconds || lessonSummary?.totalActiveSeconds)}
                </span>
              )}
            </div>
            <h3 style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 600 }}>
              {data?.lessonTitle || lessonSummary?.lessonTitle || 'Chi tiết cảm xúc & tập trung bài học'}
            </h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p className="text-dim">Đang tổng hợp dữ liệu cảm xúc 10 giây...</p>
            </div>
          )}

          {error && (
            <div className="banner danger" style={{ margin: 0 }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* 4 Chỉ số cốt lõi: Thời gian học, Độ tập trung, Số buổi học, Tỷ lệ có mặt */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                }}
              >
                {/* 1. Thời gian học */}
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div className="text-dim text-xs" style={{ marginBottom: 4 }}>
                    Thời gian học
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                    {formatDuration(lessonSummary?.totalActiveSeconds || data.videoDurationSeconds || 0)}
                  </div>
                </div>

                {/* 2. Độ tập trung */}
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div className="text-dim text-xs" style={{ marginBottom: 4 }}>
                    Độ tập trung
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color:
                        displayFocusScore == null
                          ? 'var(--text-dim)'
                          : displayFocusScore >= 70
                          ? '#10b981'
                          : displayFocusScore >= 50
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  >
                    {displayFocusScore != null ? `${displayFocusScore}%` : 'Không có camera'}
                  </div>
                </div>

                {/* 3. Số buổi học */}
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div className="text-dim text-xs" style={{ marginBottom: 4 }}>
                    Số buổi học
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                    {lessonSummary?.totalSessionsCount || 1} buổi
                  </div>
                </div>

                {/* 4. Tỷ lệ có mặt */}
                <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                  <div className="text-dim text-xs" style={{ marginBottom: 4 }}>
                    Tỷ lệ có mặt
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                    {displayPresenceRate != null ? `${displayPresenceRate}%` : '—'}
                  </div>
                </div>
              </div>

              {/* Danh sách các đoạn kiến nghị xem lại */}
              {data.reviewSegments && data.reviewSegments.length > 0 ? (
                <div
                  style={{
                    border: '1px solid #fde68a',
                    background: '#fffbeb',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div className="flex-row" style={{ gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <AlertTriangle size={18} color="#d97706" />
                    <h4 style={{ margin: 0, color: '#92400e', fontSize: 15, fontWeight: 600 }}>
                      Đoạn video hệ thống đề xuất bạn nên xem lại ({data.reviewSegments.length} đoạn)
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {data.reviewSegments.map((seg, idx) => {
                      const reasonInfo = getSegmentReasonInfo(seg, data.timeline)
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ffffff',
                            border: '1px solid #fcd34d',
                            borderRadius: 8,
                            padding: '10px 14px',
                            gap: 12,
                          }}
                        >
                          <div>
                            <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: 14,
                                  color: '#1f2937',
                                  fontFamily: 'monospace',
                                }}
                              >
                                <Clock size={12} style={{ marginRight: 3, verticalAlign: 'middle', display: 'inline' }} />{seg.formattedTime}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  color: reasonInfo.color,
                                  background: reasonInfo.bg,
                                  border: `1px solid ${reasonInfo.border}`,
                                }}
                              >
                                {reasonInfo.label}
                              </span>
                            </div>
                            <div className="text-dim text-xs" style={{ marginTop: 4 }}>
                              Tỷ lệ bối rối: {seg.averageConfusion}% • Tỷ lệ mất tập trung: {seg.averageBoredom}%
                            </div>
                          </div>

                          <button
                            className="btn primary sm flex-row"
                            style={{ gap: 6, flexShrink: 0 }}
                            onClick={() => handleSeekReview(seg.startSecond)}
                          >
                            <PlayCircle size={15} />
                            <span>Xem lại đoạn này</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Smile size={20} color="#16a34a" />
                  <span style={{ fontSize: 13, color: '#166534', fontWeight: 500 }}>
                    Tuyệt vời! Không có đoạn video nào xuất hiện dấu hiệu bối rối kéo dài trong quá trình bạn học bài này.
                  </span>
                </div>
              )}

              {/* Biểu đồ Timeline 10s */}
              <div className="card" style={{ padding: 18 }}>
                <div className="flex-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                      Timeline điểm tập trung theo mốc thời gian 10 giây
                    </h4>
                  </div>
                  {/* Legend 5 trạng thái cảm xúc */}
                  <div className="flex-row" style={{ gap: 12, fontSize: 11, flexWrap: 'wrap' }}>
                    <span className="flex-row" style={{ gap: 4, alignItems: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981' }} />
                      Tập trung
                    </span>
                    <span className="flex-row" style={{ gap: 4, alignItems: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#06b6d4' }} />
                      Hứng thú
                    </span>
                    <span className="flex-row" style={{ gap: 4, alignItems: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }} />
                      Bối rối
                    </span>
                    <span className="flex-row" style={{ gap: 4, alignItems: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444' }} />
                      Mất tập trung
                    </span>
                    <span className="flex-row" style={{ gap: 4, alignItems: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#8b5cf6' }} />
                      Rời camera
                    </span>
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="timeLabel"
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                          interval="preserveStartEnd"
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} />
                        <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" />
                        <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null
                            const b = payload[0].payload
                            const dominantMap = {
                              ENGAGED: 'Tập trung',
                              INTERESTED: 'Hứng thú',
                              CONFUSED: 'Bối rối',
                              BORED: 'Mất tập trung',
                              NO_FACE: 'Rời camera',
                            }
                            const emotionLabel = dominantMap[(b.dominantEmotion || '').toUpperCase()] || 'Bình thường'
                            const color = getEmotionBarColor(b)

                            return (
                              <div
                                style={{
                                  background: '#1f2937',
                                  color: '#fff',
                                  padding: '8px 12px',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                }}
                              >
                                <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={12} /> {formatSeconds(b.startSecond)} - {formatSeconds(b.endSecond)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <span style={{ color: '#9ca3af' }}>Trạng thái:</span>
                                  <strong style={{ color }}>{emotionLabel}</strong>
                                </div>
                                <div>
                                  Điểm tập trung:{' '}
                                  <strong style={{ color: b.focusScore >= 70 ? '#34d399' : b.focusScore >= 50 ? '#fbbf24' : '#f87171' }}>
                                    {b.focusScore != null ? `${b.focusScore}%` : 'Thiếu mẫu'}
                                  </strong>
                                </div>
                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, lineHeight: 1.4 }}>
                                  Tập trung: {b.engaged} • Hứng thú: {b.interested} • Bối rối: {b.confused} • Mất tập trung: {b.bored} • Rời camera: {b.noFace || 0}
                                </div>
                              </div>
                            )
                          }}
                        />
                        <Bar
                          dataKey="focusScore"
                          shape={(props) => {
                            const { x, y, width, height, payload } = props
                            const fill = getEmotionBarColor(payload)
                            const barHeight = Math.max(height || 0, 6)
                            const barY = (height || 0) < 6 ? y - (6 - (height || 0)) : y

                            return (
                              <rect
                                x={x}
                                y={barY}
                                width={Math.max(width - 1, 2)}
                                height={barHeight}
                                fill={fill}
                                rx={2}
                              />
                            )
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)' }}>
                    Chưa có đủ mẫu camera trong bài học này để vẽ biểu đồ timeline 10s.
                  </div>
                )}
              </div>

              {/* Lời khuyên & Ghi chú hệ thống */}
              {data.recommendationNotes && data.recommendationNotes.length > 0 && (
                <div
                  style={{
                    background: 'var(--surface-hover, #f8fafc)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div className="flex-row" style={{ gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <Sparkles size={16} color="var(--accent)" />
                    <h5 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                      Nhận xét & Hướng dẫn học tập
                    </h5>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-dim)' }}>
                    {data.recommendationNotes.map((n, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
