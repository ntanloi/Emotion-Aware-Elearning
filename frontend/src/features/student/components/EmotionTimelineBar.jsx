import React, { useState, useRef, useMemo } from 'react'
import { Activity, Clock, Eye, AlertCircle, HelpCircle, Sparkles, UserX, Compass, CheckCircle2 } from 'lucide-react'

/**
 * EmotionTimelineBar — Dòng thời gian cảm xúc bài giảng (KLTN).
 * - Thanh dài bằng thời lượng video bài giảng.
 * - Tô màu theo từng giây ghi nhận các cung bậc cảm xúc đáng chú ý:
 *   + BORED (Mất tập trung): Đỏ cam (#ef4444)
 *   + NO_FACE (Rời camera): Cam cảnh báo (#f97316)
 *   + CONFUSED (Bối rối): Vàng hổ phách (#f59e0b)
 *   + INTERESTED (Hứng thú): Xanh thiên thanh (#0284c7)
 *   + ENGAGED / NEUTRAL (Tập trung): Để trống không tô màu (trong suốt)
 * - Tương tác Click để tua (Seek) video trực tiếp đến mốc thời gian đó.
 * - Con trỏ thời gian thực (Playhead) di chuyển theo vị trí phát video.
 */
export default function EmotionTimelineBar({
  timelineEvents = [],
  currentTime = 0,
  duration = 0,
  onSeek,
}) {
  const containerRef = useRef(null)
  const [hoverInfo, setHoverInfo] = useState(null)

  const effectiveDuration = Math.max(1, duration || 1)

  const fmt = (sec) => {
    if (sec == null || isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = String(Math.floor(sec % 60)).padStart(2, '0')
    return `${m}:${s}`
  }

  // Thống kê tổng số giây của từng cảm xúc bất thường
  const stats = useMemo(() => {
    let bored = 0
    let noFace = 0
    let confused = 0
    let interested = 0

    timelineEvents.forEach((ev) => {
      const state = ev.state || ev.learningState
      if (state === 'BORED') bored++
      else if (state === 'NO_FACE') noFace++
      else if (state === 'CONFUSED') confused++
      else if (state === 'INTERESTED') interested++
    })

    return { bored, noFace, confused, interested }
  }, [timelineEvents])

  // Gom nhóm các giây liên tiếp cùng trạng thái để tối ưu số phần tử DOM render
  const segments = useMemo(() => {
    if (!timelineEvents || timelineEvents.length === 0) return []

    // Sắp xếp theo giây tăng dần
    const sorted = [...timelineEvents].sort((a, b) => a.second - b.second)
    const segs = []
    let currentSeg = null

    sorted.forEach((ev) => {
      const state = ev.state || ev.learningState
      // Bỏ qua trạng thái tập trung bình thường (không tô màu)
      if (state === 'ENGAGED' || state === 'NEUTRAL') {
        if (currentSeg) {
          segs.push(currentSeg)
          currentSeg = null
        }
        return
      }

      const sec = Math.floor(ev.second)

      if (currentSeg && currentSeg.state === state && (sec === currentSeg.endSec || sec === currentSeg.endSec + 1)) {
        currentSeg.endSec = sec + 1
      } else {
        if (currentSeg) segs.push(currentSeg)
        currentSeg = {
          startSec: sec,
          endSec: sec + 1,
          state,
        }
      }
    })

    if (currentSeg) segs.push(currentSeg)
    return segs
  }, [timelineEvents])

  const stateColorMap = {
    BORED: {
      color: '#ef4444',
      label: 'Mất tập trung',
      bg: 'rgba(239, 68, 68, 0.85)',
    },
    NO_FACE: {
      color: '#f97316',
      label: 'Rời camera',
      bg: 'rgba(249, 115, 22, 0.85)',
    },
    CONFUSED: {
      color: '#f59e0b',
      label: 'Bối rối',
      bg: 'rgba(245, 158, 11, 0.85)',
    },
    INTERESTED: {
      color: '#0284c7',
      label: 'Hứng thú',
      bg: 'rgba(2, 132, 199, 0.85)',
    },
  }

  // Xử lý di chuột để hiển thị tooltip
  const handleMouseMove = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const ratio = x / rect.width
    const hoverSec = Math.floor(ratio * effectiveDuration)

    // Tìm xem giây này có trạng thái bất thường nào không
    const matched = timelineEvents.find((ev) => Math.floor(ev.second) === hoverSec)
    const state = matched ? (matched.state || matched.learningState) : null
    const meta = state ? stateColorMap[state] : null

    setHoverInfo({
      x,
      ratio,
      second: hoverSec,
      meta,
    })
  }

  const handleMouseLeave = () => {
    setHoverInfo(null)
  }

  // Bấm vào thanh để tua video
  const handleClick = (e) => {
    if (!containerRef.current || !onSeek) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const ratio = x / rect.width
    const targetSec = Math.floor(ratio * effectiveDuration)
    onSeek(targetSec)
  }

  const playheadPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100))

  return (
    <div
      className="emotion-timeline-card"
      style={{
        marginTop: 14,
        padding: '14px 16px',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 10,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Header thanh lịch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'rgba(37, 99, 235, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
            }}
          >
            <Activity size={15} />
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.2px' }}>
              Dòng thời gian cảm xúc bài giảng
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
              (Bản đồ nhịp độ cảm xúc AI theo thời gian thực)
            </span>
          </div>
        </div>

        {/* Thống kê nhanh các mốc bất thường */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
          {stats.bored > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
              <AlertCircle size={12} /> Mất tập trung: <strong>{stats.bored}s</strong>
            </span>
          )}
          {stats.noFace > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.3)', color: '#fdba74' }}>
              <UserX size={12} /> Rời cam: <strong>{stats.noFace}s</strong>
            </span>
          )}
          {stats.confused > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fde047' }}>
              <HelpCircle size={12} /> Bối rối: <strong>{stats.confused}s</strong>
            </span>
          )}
          {stats.interested > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(2, 132, 199, 0.3)', color: '#7dd3fc' }}>
              <Sparkles size={12} /> Hứng thú: <strong>{stats.interested}s</strong>
            </span>
          )}
          {stats.bored === 0 && stats.noFace === 0 && stats.confused === 0 && stats.interested === 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 11.5 }}>
              <CheckCircle2 size={13} /> Đang tập trung rất tốt! Chưa phát hiện gián đoạn nào.
            </span>
          )}
        </div>
      </div>

      {/* Thanh Timeline Track chính */}
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative',
          height: 28,
          background: 'rgba(2, 6, 23, 0.75)',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          cursor: 'pointer',
          overflow: 'hidden',
          userSelect: 'none',
          boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.4)',
        }}
        title="Nhấn vào thanh để tua nhanh đến mốc thời gian bài giảng"
      >
        {/* Lưới vạch chia thời gian mờ */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', opacity: 0.15, pointerEvents: 'none' }}>
          {[...Array(11)].map((_, i) => (
            <div key={i} style={{ width: 1, height: '100%', background: '#fff' }} />
          ))}
        </div>

        {/* Các phân đoạn cảm xúc bất thường được tô màu */}
        {segments.map((seg, idx) => {
          const leftPercent = (seg.startSec / effectiveDuration) * 100
          const widthPercent = Math.max(0.35, ((seg.endSec - seg.startSec) / effectiveDuration) * 100)
          const meta = stateColorMap[seg.state] || stateColorMap.BORED

          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                top: 3,
                bottom: 3,
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                minWidth: 4,
                background: meta.bg,
                borderRadius: 3,
                transition: 'opacity 0.2s',
              }}
            />
          )
        })}

        {/* Vạch Playhead vị trí video đang phát thời gian thực */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${playheadPercent}%`,
            width: 2,
            background: '#38bdf8',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -1,
              left: -4,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#38bdf8',
            }}
          />
        </div>

        {/* Đường kẻ và Tooltip Hover */}
        {hoverInfo && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: hoverInfo.x,
                width: 1.5,
                background: 'rgba(255, 255, 255, 0.7)',
                pointerEvents: 'none',
                zIndex: 15,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 34,
                left: Math.max(70, Math.min(hoverInfo.x, (containerRef.current?.clientWidth || 300) - 70)),
                transform: 'translateX(-50%)',
                background: '#0f172a',
                border: `1.5px solid ${hoverInfo.meta ? hoverInfo.meta.color : 'rgba(255,255,255,0.2)'}`,
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 30,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Clock size={11} style={{ color: '#94a3b8' }} />
              <strong>{fmt(hoverInfo.second)}</strong>
              {hoverInfo.meta ? (
                <span style={{ color: hoverInfo.meta.color, fontWeight: 600 }}>
                  — {hoverInfo.meta.label}
                </span>
              ) : (
                <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  — <CheckCircle2 size={11} /> Tập trung
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chú thích màu sắc (Legend) & Mốc thời gian 2 đầu */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 8, fontSize: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: '#94a3b8', fontSize: 11 }}>Chú giải:</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#cbd5e1' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: stateColorMap.BORED.color }} />
            Mất tập trung
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#cbd5e1' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: stateColorMap.NO_FACE.color }} />
            Rời camera
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#cbd5e1' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: stateColorMap.CONFUSED.color }} />
            Bối rối
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#cbd5e1' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: stateColorMap.INTERESTED.color }} />
            Hứng thú
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
            (Khoảng trống: Tập trung)
          </span>
        </div>

        <div style={{ color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{fmt(currentTime)}</span>
          <span>/</span>
          <span>{fmt(effectiveDuration)}</span>
        </div>
      </div>
    </div>
  )
}
