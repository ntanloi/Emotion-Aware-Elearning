import React, { useState, useEffect, useMemo, useRef } from 'react'
import { getVideoEmotionTimeline } from '@teacher/api/teacher.js'
import { useRealtimeEvent } from '@shared/realtime/index.js'
import {
  Brain,
  AlertCircle,
  Frown,
  CheckCircle,
  Lightbulb,
  X,
  Clock,
  Sparkles,
  BarChart3,
  TrendingUp,
  Sliders,
  Check,
  Video,
  Filter,
  Circle,
} from 'lucide-react'

/**
 * VideoEmotionTimelineModal — Giai đoạn 8 (Teacher Analytics).
 * Biểu đồ trực quan từng mốc thời gian của toàn bộ video bài giảng (00:00 -> hết video).
 * Kết nối dữ liệu thời gian thực từ cơ sở dữ liệu (session_bucket_stats & emotion_logs).
 */
export default function VideoEmotionTimelineModal({
  isOpen,
  onClose,
  contentItemId,
  lessonTitle,
  initialStartSec = null,
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [selectedSegment, setSelectedSegment] = useState(null)
  const [filterMode, setFilterMode] = useState('ALL') // 'ALL' | 'PROBLEM' | 'GOOD' | 'UNWATCHED'
  const [isEditingDuration, setIsEditingDuration] = useState(false)
  const [customMinutesInput, setCustomMinutesInput] = useState('')
  const [savingDuration, setSavingDuration] = useState(false)
  const segmentListRef = useRef(null)

  const loadTimelineData = (durationSecParam = null) => {
    if (!contentItemId) return
    setLoading(true)
    setError(null)

    getVideoEmotionTimeline(contentItemId, durationSecParam)
      .then((res) => {
        setData(res)
        if (res?.segments?.length > 0) {
          let targetSeg = null
          if (initialStartSec !== null && initialStartSec !== undefined) {
            targetSeg = res.segments.find(
              (s) => initialStartSec >= s.startSec && initialStartSec < s.endSec
            )
          }
          if (!targetSeg) {
            targetSeg = res.segments.find((s) => s.isProblematic) || res.segments[0]
          }
          setSelectedSegment(targetSeg)
        }
      })
      .catch((err) => {
        console.error('Lỗi tải timeline cảm xúc:', err)
        setError(err.response?.data?.message || 'Không thể tải biểu đồ mốc thời gian')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isOpen || !contentItemId) return
    setSelectedSegment(null)
    setIsEditingDuration(false)
    loadTimelineData()

    // Tự động làm mới mỗi 10 giây khi modal đang mở để cập nhật dữ liệu mới nhất
    const interval = setInterval(() => {
      getVideoEmotionTimeline(contentItemId)
        .then((res) => {
          if (res) setData(res)
        })
        .catch(() => {})
    }, 10000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contentItemId])

  // Realtime: có mẫu cảm xúc mới của chính bài giảng này -> làm mới ngầm biểu đồ ngay (không chờ chu kỳ 10 giây)
  useRealtimeEvent('emotion-stats', (payload) => {
    if (!isOpen || !contentItemId) return
    const ids = payload?.contentItemIds ?? payload?.data?.contentItemIds
    if (Array.isArray(ids) && !ids.includes(contentItemId)) return
    getVideoEmotionTimeline(contentItemId)
      .then((res) => {
        if (res) setData(res)
      })
      .catch(() => {})
  })

  // Tính toán số lượng cho từng bộ lọc
  const statsCounts = useMemo(() => {
    if (!data?.segments) return { all: 0, problem: 0, good: 0, unwatched: 0 }
    let problem = 0
    let good = 0
    let unwatched = 0

    data.segments.forEach((s) => {
      if (s.totalSamples === 0) {
        unwatched++
      } else if (s.isProblematic) {
        problem++
      } else {
        good++
      }
    })

    return {
      all: data.segments.length,
      problem,
      good,
      unwatched,
    }
  }, [data?.segments])

  // Lọc các mốc hiển thị theo tab
  const filteredSegments = useMemo(() => {
    if (!data?.segments) return []
    if (filterMode === 'PROBLEM') return data.segments.filter((s) => s.isProblematic)
    if (filterMode === 'GOOD') return data.segments.filter((s) => s.totalSamples > 0 && !s.isProblematic)
    if (filterMode === 'UNWATCHED') return data.segments.filter((s) => s.totalSamples === 0)
    return data.segments
  }, [data?.segments, filterMode])

  // Cuộn đến mốc được chọn khi click trên thanh Heat Track
  const handleSelectSegment = (seg) => {
    setSelectedSegment(seg)
    // Nếu mốc này không nằm trong filter hiện tại, tự động chuyển về 'ALL' để giảng viên xem được
    if (filterMode === 'PROBLEM' && !seg.isProblematic) setFilterMode('ALL')
    if (filterMode === 'GOOD' && (seg.totalSamples === 0 || seg.isProblematic)) setFilterMode('ALL')
    if (filterMode === 'UNWATCHED' && seg.totalSamples > 0) setFilterMode('ALL')

    setTimeout(() => {
      const el = document.getElementById(`timeline-seg-${seg.startSec}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 50)
  }

  // Cập nhật lại thời lượng video thủ công (nếu video link Google Drive / ngoài chưa có thời lượng)
  const handleSaveCustomDuration = async (e) => {
    e.preventDefault()
    const minutes = parseFloat(customMinutesInput)
    if (isNaN(minutes) || minutes <= 0) return
    const seconds = Math.round(minutes * 60)

    try {
      setSavingDuration(true)
      await loadTimelineData(seconds)
      setIsEditingDuration(false)
      setCustomMinutesInput('')
    } catch (err) {
      console.error('Lỗi cập nhật thời lượng:', err)
    } finally {
      setSavingDuration(false)
    }
  }

  // Format giây thành mm:ss
  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return '00:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  if (!isOpen) return null

  // Tính tổng thời lượng video từ mốc cuối cùng hoặc videoDurationSec
  const totalVideoDurationSec =
    data?.videoDurationSec && data.videoDurationSec > 0
      ? data.videoDurationSec
      : data?.segments?.length > 0
      ? data.segments[data.segments.length - 1].endSec
      : 0

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(6px)', zIndex: 1100 }}>
      <div
        className="modal-panel"
        style={{
          maxWidth: 960,
          width: '95%',
          maxHeight: '92vh',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius, 8px)',
                background: 'var(--accent-soft, rgba(37, 99, 235, 0.08))',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <BarChart3 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                  Biểu đồ Mốc Thời gian Cảm xúc Video
                </h3>
                {data?.videoDurationSec ? (
                  <span
                    className="badge"
                    style={{
                      background: 'var(--accent-soft, rgba(37, 99, 235, 0.08))',
                      color: 'var(--accent)',
                      fontWeight: 600,
                      fontSize: 12,
                      border: '1px solid rgba(37, 99, 235, 0.2)',
                    }}
                  >
                    <Clock size={11} style={{ marginRight: 3 }} /> {formatSeconds(data.videoDurationSec)} ({data.segments?.length || 0} mốc 30s)
                  </span>
                ) : null}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
                {lessonTitle || data?.lessonTitle || 'Bài giảng Video'} •{' '}
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{data?.courseTitle || 'Khóa học'}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Nút điều chỉnh thời lượng video */}
            {!isEditingDuration ? (
              <button
                type="button"
                className="btn sm secondary"
                onClick={() => {
                  setCustomMinutesInput(totalVideoDurationSec > 0 ? (totalVideoDurationSec / 60).toFixed(1) : '23')
                  setIsEditingDuration(true)
                }}
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                title="Thay đổi thời lượng video nếu video link ngoài hiển thị chưa đúng"
              >
                <Sliders size={12} />
                <span>Thời lượng video</span>
              </button>
            ) : (
              <form onSubmit={handleSaveCustomDuration} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="180"
                  value={customMinutesInput}
                  onChange={(e) => setCustomMinutesInput(e.target.value)}
                  placeholder="Phút (VD: 23)"
                  style={{
                    width: 90,
                    padding: '4px 8px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid var(--accent)',
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={savingDuration}
                  className="btn sm primary"
                  style={{ padding: '4px 8px', fontSize: 12 }}
                >
                  <Check size={12} /> {savingDuration ? 'Lưu...' : 'Lưu'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDuration(false)}
                  className="btn sm secondary"
                  aria-label="Hủy chỉnh sửa thời lượng"
                  style={{ padding: '4px 6px' }}
                >
                  <X size={12} />
                </button>
              </form>
            )}

            <button onClick={onClose} className="modal-close" aria-label="Đóng">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            background: 'var(--bg)',
          }}
        >
          {loading ? (
            <div style={{ padding: '70px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
              <Sparkles size={36} className="spin" style={{ marginBottom: 12, color: 'var(--accent)' }} />
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                Đang tổng hợp dữ liệu mốc thời gian...
              </div>
              <div style={{ fontSize: 14, marginTop: 4 }}>
                Đọc dữ liệu cảm xúc từ các phiên học sinh viên trong cơ sở dữ liệu.
              </div>
            </div>
          ) : error ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--bad)' }}>
              <AlertCircle size={36} style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>{error}</div>
              <button
                type="button"
                className="btn sm secondary"
                onClick={() => loadTimelineData()}
                style={{ marginTop: 14 }}
              >
                Thử lại
              </button>
            </div>
          ) : !data || !data.segments || data.segments.length === 0 ? (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                background: 'var(--surface)',
                borderRadius: 12,
                border: '1px solid var(--border)',
              }}
            >
              <Brain size={44} style={{ marginBottom: 12, color: 'var(--accent)', opacity: 0.6 }} />
              <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>
                Chưa có dữ liệu cảm xúc cho bài giảng này
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-dim)', maxWidth: 440, marginInline: 'auto' }}>
                Khi học viên bật camera và học qua video này, AI sẽ tự động ghi nhận cảm xúc và lập bản đồ thời gian trực quan tại đây.
              </p>
            </div>
          ) : (
            <>
              {/* 3 Thẻ chỉ số tổng quan */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                {/* 1. Mức độ tập trung & hứng thú */}
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: 3, position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--emotion-engaged)' }} />
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                    <TrendingUp size={14} style={{ color: 'var(--emotion-engaged)' }} /> Tập trung trung bình
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--emotion-engaged)', letterSpacing: '-0.02em' }}>
                      {data.avgFocusScore}%
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: data.avgFocusScore >= 70 ? 'var(--good-soft)' : 'var(--warn-soft)',
                        color: data.avgFocusScore >= 70 ? 'var(--emotion-engaged)' : 'var(--emotion-confused)',
                        fontSize: 12,
                      }}
                    >
                      {data.avgFocusScore >= 70 ? 'Tốt' : (data.avgFocusScore >= 50 ? 'Bình thường' : 'Cần chú ý')}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                    Tổng hợp tập trung cao & hứng thú ({data.totalSessions} phiên học)
                  </div>
                </div>

                {/* 2. Điểm bối rối cao nhất */}
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: 3, position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--emotion-confused)' }} />
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                    <AlertCircle size={14} style={{ color: 'var(--emotion-confused)' }} /> Mốc Bối rối cao nhất
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--emotion-confused)', letterSpacing: '-0.02em' }}>
                      {data.peakConfusedTimestamp}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--emotion-confused)' }}>
                      {Math.round(data.peakConfusedPercent * 10) / 10}%
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                    Điểm nghi vấn khó hiểu nhất
                  </div>
                </div>

                {/* 3. Điểm mất tập trung cao nhất */}
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: 3, position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--emotion-bored)' }} />
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                    <Frown size={14} style={{ color: 'var(--emotion-bored)' }} /> Mốc Mất tập trung nhất
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--emotion-bored)', letterSpacing: '-0.02em' }}>
                      {data.peakBoredTimestamp}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--emotion-bored)' }}>
                      {Math.round(data.peakBoredPercent * 10) / 10}%
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                    Điểm học viên dễ phân tâm
                  </div>
                </div>
              </div>

              {/* Khung hợp nhất: Chi tiết Mốc (trên) -> Toàn cảnh Phân bổ Cảm xúc (giữa) -> Lọc & Danh sách mốc (dưới) */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: '16px 20px',
                  marginBottom: 16,
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {/* 1. Chi tiết mốc đang chọn (Segment Inspector) */}
                {selectedSegment && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={16} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                          Chi tiết Mốc {selectedSegment.timeLabel}
                        </span>
                        {selectedSegment.totalSamples === 0 ? (
                          <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}>
                            Chưa có lượt xem
                          </span>
                        ) : selectedSegment.studentCount !== undefined && selectedSegment.studentCount < 5 ? (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(148, 163, 184, 0.15)',
                              color: 'var(--text-dim)',
                              border: '1px solid rgba(148, 163, 184, 0.3)',
                            }}
                          >
                            Chưa đủ dữ liệu ({selectedSegment.studentCount}/5 học viên)
                          </span>
                        ) : selectedSegment.isProblematic ? (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: 'var(--bad)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                            }}
                          >
                            <AlertCircle size={12} style={{ marginRight: 3 }} /> Cần cải thiện
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--good)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                            }}
                          >
                            <CheckCircle size={12} style={{ marginRight: 3 }} /> Tiếp thu tốt
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        {selectedSegment.totalSamples > 0 ? (
                          <span>Thu nhận <strong>{selectedSegment.totalSamples}</strong> mẫu khung hình</span>
                        ) : (
                          <span>Học viên chưa xem đến đoạn này</span>
                        )}
                      </div>
                    </div>

                    {selectedSegment.totalSamples > 0 ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: 10,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ background: 'var(--emotion-engaged-soft)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--emotion-engaged-border)' }}>
                          <div style={{ color: 'var(--emotion-engaged)', fontSize: 12, fontWeight: 600 }}>TẬP TRUNG CAO</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--emotion-engaged)', marginTop: 2 }}>
                            {selectedSegment.engagedPercent.toFixed(1)}%
                          </div>
                        </div>
                        <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                          <div style={{ color: '#0891b2', fontSize: 12, fontWeight: 600 }}>HỨNG THÚ</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#0891b2', marginTop: 2 }}>
                            {selectedSegment.interestedPercent.toFixed(1)}%
                          </div>
                        </div>
                        <div style={{ background: 'var(--emotion-confused-soft)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--emotion-confused-border)' }}>
                          <div style={{ color: 'var(--emotion-confused)', fontSize: 12, fontWeight: 600 }}>BỐI RỐI / KHÓ HIỂU</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--emotion-confused)', marginTop: 2 }}>
                            {selectedSegment.confusedPercent.toFixed(1)}%
                          </div>
                        </div>
                        <div style={{ background: 'var(--emotion-bored-soft)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--emotion-bored-border)' }}>
                          <div style={{ color: 'var(--emotion-bored)', fontSize: 12, fontWeight: 600 }}>MẤT TẬP TRUNG</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--emotion-bored)', marginTop: 2 }}>
                            {selectedSegment.boredPercent.toFixed(1)}%
                          </div>
                        </div>
                        <div style={{ background: 'var(--emotion-noface-soft)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--emotion-noface-border)' }}>
                          <div style={{ color: 'var(--emotion-noface)', fontSize: 12, fontWeight: 600 }}>RỜI CAMERA</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--emotion-noface)', marginTop: 2 }}>
                            {selectedSegment.noFacePercent.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, color: 'var(--text-dim)', padding: '8px 0' }}>
                        Mốc thời gian này chưa có học viên nào xem hoặc đã bỏ dở video trước thời điểm này.
                      </div>
                    )}
                  </div>
                )}

                {/* Đường phân cách giữa Chi tiết mốc và Toàn cảnh */}
                <div style={{ height: 1, background: 'var(--border-subtle, rgba(0, 0, 0, 0.06))' }} />

                {/* 2. Thanh Toàn cảnh Video (Heat Track) 00:00 -> hết video */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Video size={16} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                        Toàn cảnh Phân bổ Cảm xúc dọc theo Video (00:00 - {formatSeconds(totalVideoDurationSec)})
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      Nhấn vào từng vạch để nhảy đến mốc đó
                    </div>
                  </div>

                  {/* Dải vạch trực quan từng mốc 30s */}
                  <div
                    style={{
                      display: 'flex',
                      height: 24,
                      gap: 2,
                      background: 'var(--surface-2)',
                      padding: 3,
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    {data.segments.map((seg, idx) => {
                      const isSelected = selectedSegment?.startSec === seg.startSec
                      let bg = 'var(--border)' // Chưa xem
                      if (seg.totalSamples > 0) {
                        if (seg.studentCount !== undefined && seg.studentCount < 5) {
                          bg = 'var(--text-muted)' // Chưa đủ cỡ mẫu 5 học viên
                        } else if (seg.isProblematic) {
                          bg = seg.confusedPercent >= seg.boredPercent ? 'var(--warn)' : 'var(--bad)'
                        } else {
                          bg = 'var(--good)'
                        }
                      }

                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectSegment(seg)}
                          title={`Mốc ${seg.timeLabel}: ${
                            seg.totalSamples === 0
                              ? 'Chưa có lượt xem'
                              : seg.studentCount !== undefined && seg.studentCount < 5
                              ? `Chưa đủ dữ liệu (${seg.studentCount}/5 học viên)`
                              : seg.isProblematic
                              ? `Cần cải thiện (Bối rối: ${seg.confusedPercent}%, Mất tập trung: ${seg.boredPercent}%)`
                              : `Tốt (${Math.round((seg.engagedPercent + seg.interestedPercent) * 10) / 10}%)`
                          }`}
                          style={{
                            flex: 1,
                            height: '100%',
                            background: bg,
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            transform: isSelected ? 'scaleY(1.2)' : 'none',
                            boxShadow: isSelected ? '0 0 0 2px var(--accent)' : 'none',
                            opacity: isSelected ? 1 : 0.85,
                          }}
                        />
                      )
                    })}
                  </div>

                  {/* Các mốc thời gian đánh dấu phía dưới dải vạch */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 6,
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <span>00:00</span>
                    <span>{formatSeconds(Math.round(totalVideoDurationSec * 0.25))}</span>
                    <span>{formatSeconds(Math.round(totalVideoDurationSec * 0.5))}</span>
                    <span>{formatSeconds(Math.round(totalVideoDurationSec * 0.75))}</span>
                    <span>{formatSeconds(totalVideoDurationSec)}</span>
                  </div>
                </div>

                {/* Đường phân cách giữa Toàn cảnh và Lọc & Danh sách mốc */}
                <div style={{ height: 1, background: 'var(--border-subtle, rgba(0, 0, 0, 0.06))' }} />

                {/* 3. Danh sách từng mốc 30 giây kèm bộ lọc */}
                <div>
                  {/* Bộ lọc tab */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <Filter size={14} style={{ color: 'var(--text-dim)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>Lọc mốc:</span>
                      <button
                        type="button"
                        onClick={() => setFilterMode('ALL')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          background: filterMode === 'ALL' ? 'var(--accent)' : 'var(--surface-2)',
                          color: filterMode === 'ALL' ? 'var(--surface)' : 'var(--text)',
                          fontWeight: filterMode === 'ALL' ? 600 : 400,
                        }}
                      >
                        Tất cả ({statsCounts.all})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode('PROBLEM')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          background: filterMode === 'PROBLEM' ? 'var(--bad)' : 'rgba(239, 68, 68, 0.08)',
                          color: filterMode === 'PROBLEM' ? 'var(--surface)' : 'var(--bad)',
                          fontWeight: filterMode === 'PROBLEM' ? 600 : 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <AlertCircle size={12} /> Cần cải thiện ({statsCounts.problem})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode('GOOD')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          background: filterMode === 'GOOD' ? 'var(--good)' : 'rgba(16, 185, 129, 0.08)',
                          color: filterMode === 'GOOD' ? 'var(--surface)' : 'var(--good)',
                          fontWeight: filterMode === 'GOOD' ? 600 : 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <CheckCircle size={12} /> Tiếp thu tốt ({statsCounts.good})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode('UNWATCHED')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          background: filterMode === 'UNWATCHED' ? 'var(--text-dim)' : 'var(--surface-2)',
                          color: filterMode === 'UNWATCHED' ? 'var(--surface)' : 'var(--text-dim)',
                          fontWeight: filterMode === 'UNWATCHED' ? 600 : 400,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Circle size={10} /> Chưa xem ({statsCounts.unwatched})
                      </button>
                    </div>

                    {/* Chú thích màu sắc các thanh phân bổ */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--good, #10b981)' }} /> Tập trung
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: '#06b6d4' }} /> Hứng thú
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--warn, #f59e0b)' }} /> Bối rối
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--bad, #ef4444)' }} /> Phân tâm
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--emotion-noface, #8b5cf6)' }} /> Rời cam
                      </span>
                    </div>
                  </div>

                  {/* Danh sách các mốc thời gian dạng cuộn mượt */}
                  <div
                    ref={segmentListRef}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      maxHeight: 280,
                      overflowY: 'auto',
                      paddingRight: 6,
                    }}
                  >
                  {filteredSegments.length === 0 ? (
                    <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
                      Không có mốc thời gian nào phù hợp với bộ lọc hiện tại.
                    </div>
                  ) : (
                    filteredSegments.map((seg, idx) => {
                      const isSelected = selectedSegment?.startSec === seg.startSec
                      const positiveTotal = Math.round(((seg.engagedPercent || 0) + (seg.interestedPercent || 0)) * 10) / 10

                      return (
                        <div
                          key={idx}
                          id={`timeline-seg-${seg.startSec}`}
                          onClick={() => setSelectedSegment(seg)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '120px 1fr 140px',
                            alignItems: 'center',
                            gap: 14,
                            padding: '8px 12px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            background: isSelected
                              ? 'var(--accent-soft, rgba(37, 99, 235, 0.08))'
                              : seg.isProblematic
                              ? 'rgba(239, 68, 68, 0.04)'
                              : 'var(--surface)',
                            border: isSelected
                              ? '1.5px solid var(--accent)'
                              : seg.isProblematic
                              ? '1px solid rgba(239, 68, 68, 0.2)'
                              : '1px solid var(--border)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Cột 1: Thời gian */}
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? 'var(--accent)' : 'var(--text)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            <Clock size={13} style={{ color: isSelected ? 'var(--accent)' : 'var(--text-dim)' }} />
                            <span>{seg.timeLabel}</span>
                          </div>

                          {/* Cột 2: Thanh phân bổ tỷ lệ phần trăm */}
                          {seg.totalSamples > 0 ? (
                            <div
                              style={{
                                height: 16,
                                borderRadius: 5,
                                background: 'var(--surface-2)',
                                overflow: 'hidden',
                                display: 'flex',
                              }}
                            >
                              {seg.engagedPercent > 0 && (
                                <div
                                  style={{ width: `${seg.engagedPercent}%`, background: 'var(--good, #10b981)' }}
                                  title={`Tập trung cao: ${seg.engagedPercent}%`}
                                />
                              )}
                              {seg.interestedPercent > 0 && (
                                <div
                                  style={{ width: `${seg.interestedPercent}%`, background: '#06b6d4' }}
                                  title={`Hứng thú: ${seg.interestedPercent}%`}
                                />
                              )}
                              {seg.confusedPercent > 0 && (
                                <div
                                  style={{ width: `${seg.confusedPercent}%`, background: 'var(--warn, #f59e0b)' }}
                                  title={`Bối rối: ${seg.confusedPercent}%`}
                                />
                              )}
                              {seg.boredPercent > 0 && (
                                <div
                                  style={{ width: `${seg.boredPercent}%`, background: 'var(--bad, #ef4444)' }}
                                  title={`Phân tâm: ${seg.boredPercent}%`}
                                />
                              )}
                              {seg.noFacePercent > 0 && (
                                <div
                                  style={{ width: `${seg.noFacePercent}%`, background: 'var(--emotion-noface, #8b5cf6)' }}
                                  title={`Rời camera: ${seg.noFacePercent}%`}
                                />
                              )}
                            </div>
                          ) : (
                            <div
                              style={{
                                height: 16,
                                borderRadius: 5,
                                background: 'repeating-linear-gradient(45deg, var(--surface-2), var(--surface-2) 6px, var(--border) 6px, var(--border) 12px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                color: 'var(--text-muted)',
                                fontWeight: 500,
                              }}
                            >
                              Chưa có dữ liệu học viên xem đoạn này
                            </div>
                          )}

                          {/* Cột 3: Trạng thái & nhãn */}
                          <div style={{ textAlign: 'right' }}>
                            {seg.totalSamples === 0 ? (
                              <span
                                className="badge"
                                style={{
                                  background: 'var(--surface-2)',
                                  color: 'var(--text-muted)',
                                  fontSize: 12,
                                }}
                              >
                                Chưa có lượt xem
                              </span>
                            ) : seg.studentCount !== undefined && (!seg.hasEnoughData || seg.studentCount < (data?.minStudentsRequired || 5)) ? (
                              <span
                                className="badge"
                                style={{
                                  background: 'rgba(148, 163, 184, 0.15)',
                                  color: 'var(--text-dim)',
                                  fontSize: 12,
                                  fontWeight: 500,
                                }}
                              >
                                Chưa đủ dữ liệu ({seg.studentCount}/{data?.minStudentsRequired || 5})
                              </span>
                            ) : seg.isProblematic ? (
                              <span
                                className="badge"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: 'var(--bad)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <AlertCircle size={11} /> Cần cải thiện
                              </span>
                            ) : (
                              <span
                                className="badge"
                                style={{
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: 'var(--good)',
                                  border: '1px solid rgba(16, 185, 129, 0.25)',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <CheckCircle size={11} /> Tốt ({positiveTotal}%)
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

              {/* Khuyến nghị Sư phạm AI */}
              <div
                style={{
                  background: 'rgba(37, 99, 235, 0.04)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: 14,
                  padding: '16px 20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--accent)',
                    fontWeight: 700,
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  <Lightbulb size={18} /> Khuyến nghị Sư phạm từ AI Analytics:
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    fontSize: 14,
                    color: 'var(--text)',
                    lineHeight: 1.6,
                  }}
                >
                  {data.pedagogicalRecommendations.map((rec, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'var(--surface)',
          }}
        >
          <button type="button" className="btn secondary sm" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}