import React, { useState, useMemo } from 'react'
import {
  Smile,
  Info,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react'
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

function extractTimeOnly(dateStr) {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()
  const parts = trimmed.split(' ')
  if (parts.length >= 2) {
    return parts[parts.length - 1] // "21:59"
  }
  if (trimmed.includes('T')) {
    return trimmed.split('T')[1].substring(0, 5)
  }
  return trimmed
}

export default function ReportEmotionsTab({
  lessonsData = [],
  onSelectLessonId,
  onNavigateCourses,
}) {
  // State quản lý mở rộng mục "Chưa đủ dữ liệu"
  const [showInsufficient, setShowInsufficient] = useState(false)

  // Phân tách và sắp xếp danh sách bài học
  // 1. Điều kiện "Chưa đủ dữ liệu" CHỈ gồm totalActiveSeconds <= 0
  // 2. Video có thời gian học nhưng focusScore == null vẫn nằm trong danh sách chính với nhãn "Không có camera"
  // 3. Video hasReviewSegments luôn được đẩy lên đầu
  const { validLessons, insufficientLessons } = useMemo(() => {
    const valid = []
    const insufficient = []

    for (const lesson of lessonsData) {
      const isInsufficient = !lesson.totalActiveSeconds || lesson.totalActiveSeconds <= 0

      if (isInsufficient) {
        insufficient.push(lesson)
      } else {
        valid.push(lesson)
      }
    }

    // Sắp xếp: hasReviewSegments luôn được đẩy lên đầu, sau đó đến lần học gần nhất
    valid.sort((a, b) => {
      const aRev = Boolean(a.hasReviewSegments)
      const bRev = Boolean(b.hasReviewSegments)
      if (aRev && !bRev) return -1
      if (!aRev && bRev) return 1

      const parseTime = (val) => {
        if (!val) return 0
        const t = new Date(val).getTime()
        return isNaN(t) ? 0 : t
      }
      const timeDiff = parseTime(b.lastStudiedAt) - parseTime(a.lastStudiedAt)
      if (timeDiff !== 0) return timeDiff
      return (b.lastStudiedAt || '').localeCompare(a.lastStudiedAt || '')
    })

    return { validLessons: valid, insufficientLessons: insufficient }
  }, [lessonsData])

  // Nhóm các phiên học hợp lệ theo Ngày học (DD/MM/YYYY)
  const groupedByDate = useMemo(() => {
    const groups = {}

    const getDateKey = (dateStr) => {
      if (!dateStr) return 'Khác'
      // Trường hợp "04/11/2026 21:59"
      const dmyMatch = dateStr.match(/^(\d{2}\/\d{2}\/\d{4})/)
      if (dmyMatch) return dmyMatch[1]
      // Trường hợp "YYYY-MM-DD..."
      const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (ymdMatch) return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`
      const firstPart = dateStr.split(' ')[0]
      return firstPart || 'Khác'
    }

    for (const lesson of validLessons) {
      const dateKey = getDateKey(lesson.lastStudiedAt)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(lesson)
    }

    // Sắp xếp ngày từ mới nhất đến cũ nhất
    const parseDateKeyToTime = (key) => {
      const parts = key.split('/')
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime()
      }
      return 0
    }

    const sortedDates = Object.keys(groups).sort((a, b) => {
      return parseDateKeyToTime(b) - parseDateKeyToTime(a)
    })

    return sortedDates.map((dateKey) => ({
      dateKey,
      lessons: groups[dateKey],
    }))
  }, [validLessons])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Danh sách video bài giảng */}
      {lessonsData.length === 0 ? (
        <EmptyState
          icon={Smile}
          title="Chưa có dữ liệu cảm xúc video bài giảng"
          description="Hãy vào học một video bài giảng và bật camera để AI ghi nhận mức độ tập trung của bạn."
          actionText="Vào khóa học của tôi"
          onAction={onNavigateCourses}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Nhóm theo Ngày học */}
          {groupedByDate.map((group) => (
            <div key={group.dateKey} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Tiêu đề Ngày (tương tự như LƯỢT GỌI trong hình mẫu) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 2px',
                  borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
                  paddingBottom: 8,
                }}
              >
                <Calendar size={14} color="var(--text-dim, #64748b)" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-dim, #475569)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  NGÀY {group.dateKey}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-dim, #94a3b8)' }}>
                  · {group.lessons.length} phiên học
                </span>
              </div>

              {/* Các thẻ phiên học của ngày đó */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.lessons.map((lesson) => {
                  const focusScore = lesson.focusScore

                  return (
                    <div
                      key={lesson.contentItemId}
                      className="card"
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        borderRadius: 'var(--radius-lg, 12px)',
                        border: '1px solid var(--border, #e2e8f0)',
                        background: 'var(--surface, #ffffff)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {/* 1. Header bài giảng: sectionCode, lessonTitle, lần học gần nhất, nút Timeline 10s */}
                      <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <div className="flex-row" style={{ gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'var(--surface-2, #f1f5f9)',
                                color: 'var(--text-dim)',
                              }}
                            >
                              {lesson.sectionCode || 'BÀI HỌC'}
                            </span>
                            <span className="text-dim text-xs">{lesson.courseTitle}</span>
                            {lesson.lastStudiedAt && (
                              <span className="text-dim text-xs">• {extractTimeOnly(lesson.lastStudiedAt)}</span>
                            )}
                            {lesson.hasReviewSegments && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: '#b45309',
                                  background: '#fffbeb',
                                  border: '1px solid #fef3c7',
                                  padding: '1px 7px',
                                  borderRadius: 5,
                                }}
                                title="Có đoạn xuất hiện dấu hiệu bối rối hoặc mất tập trung lặp lại cần xem lại"
                              >
                                <AlertTriangle size={11} color="#f59e0b" />
                                <span>Cần xem lại</span>
                              </span>
                            )}
                          </div>
                          <h4 style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: 'var(--text, #0f172a)' }}>
                            {lesson.lessonTitle}
                          </h4>
                        </div>

                        {/* Nút Timeline 10s gọn gàng với biểu tượng đặc trưng */}
                        <button
                          type="button"
                          className="btn secondary sm flex-row"
                          style={{
                            gap: 6,
                            flexShrink: 0,
                            borderRadius: 8,
                            fontSize: 12.5,
                          }}
                          onClick={() => onSelectLessonId(lesson.contentItemId)}
                          title={
                            lesson.hasReviewSegments
                              ? 'Có đoạn bối rối hoặc mất tập trung lặp lại cần xem lại'
                              : 'Xem timeline cảm xúc 10s'
                          }
                        >
                          {lesson.hasReviewSegments ? (
                            <AlertTriangle size={13} color="#f59e0b" />
                          ) : (
                            <Sparkles size={13} color="var(--accent)" />
                          )}
                          <span>Timeline 10s</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>

                      {/* 2. Dải chỉ số cốt lõi: Thời gian học, Độ tập trung & Chip gợi ý nếu có */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 20,
                          background: 'var(--surface-hover, #f8fafc)',
                          padding: '8px 14px',
                          borderRadius: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <span className="text-dim text-xs">Thời gian học: </span>
                          <strong style={{ fontSize: 13.5, color: 'var(--text)' }}>
                            {formatDuration(lesson.totalActiveSeconds)}
                          </strong>
                        </div>

                        <div>
                          <span className="text-dim text-xs">Độ tập trung: </span>
                          {focusScore != null ? (
                            <strong
                              style={{
                                fontSize: 13.5,
                                color:
                                  focusScore >= 70
                                    ? 'var(--good, #10b981)'
                                    : focusScore >= 50
                                    ? 'var(--warn, #f59e0b)'
                                    : 'var(--bad, #ef4444)',
                              }}
                            >
                              {focusScore}%
                            </strong>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: 'var(--surface-2, #f1f5f9)',
                                color: 'var(--text-dim)',
                                border: '1px solid var(--border, #e2e8f0)',
                              }}
                            >
                              Không có camera
                            </span>
                          )}
                        </div>

                        {/* Hiển thị "Gợi ý thích ứng" dưới dạng chip nhỏ ở mặt ngoài mỗi card khi suggestionsCount > 0 */}
                        {lesson.suggestionsCount > 0 && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '3px 9px',
                              borderRadius: 6,
                              background: 'rgba(99, 102, 241, 0.08)',
                              color: 'var(--accent, #6366f1)',
                              border: '1px solid rgba(99, 102, 241, 0.2)',
                            }}
                            title="Gợi ý thích ứng trong bài học"
                          >
                            <Sparkles size={12} />
                            <span>{lesson.acceptedSuggestionsCount || 0}/{lesson.suggestionsCount} gợi ý được chấp nhận</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Nhóm thu gọn: "Chưa đủ dữ liệu (n)" cho video có totalActiveSeconds <= 0 */}
          {insufficientLessons.length > 0 && (
            <div
              className="card"
              style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-lg, 12px)',
                background: 'var(--surface, #ffffff)',
                border: '1px solid var(--border, #e2e8f0)',
              }}
            >
              <button
                type="button"
                className="flex-between"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onClick={() => setShowInsufficient((prev) => !prev)}
              >
                <span className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
                  <Info size={15} color="var(--text-dim)" />
                  <strong style={{ fontSize: 13.5, color: 'var(--text)' }}>
                    Chưa đủ dữ liệu ({insufficientLessons.length})
                  </strong>
                  <span className="text-dim text-xs">
                    (Bài giảng chưa tích lũy thời gian học)
                  </span>
                </span>
                {showInsufficient ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showInsufficient && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border, #e2e8f0)',
                  }}
                >
                  {insufficientLessons.map((lesson) => (
                    <div
                      key={lesson.contentItemId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--surface-hover, #f8fafc)',
                        borderRadius: 6,
                        fontSize: 12.5,
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: 'var(--surface-2, #f1f5f9)',
                            color: 'var(--text-dim)',
                          }}
                        >
                          {lesson.sectionCode || 'BÀI HỌC'}
                        </span>
                        <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                          {lesson.lessonTitle}
                        </span>
                        {lesson.courseTitle && (
                          <span className="text-dim text-xs">• {lesson.courseTitle}</span>
                        )}
                      </div>
                      <span className="text-dim text-xs">Chưa có thời gian học</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
