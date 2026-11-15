import React, { useState, useEffect } from 'react'
import { Lightbulb, RotateCcw, Coffee, UserCheck, X, Sparkles, AlertCircle, HelpCircle, Play, Clock } from 'lucide-react'

/**
 * AdaptiveSuggestionToast — Giai đoạn 8 (KLTN).
 * Popup cảnh báo thích ứng khi mất tập trung hoặc bối rối:
 * - Video vẫn chạy bình thường (không dừng lại).
 * - Tự động tắt sau 15 giây nếu học viên không tương tác.
 * - Đánh dấu thời gian từ lúc bắt đầu mất tập trung đến lúc cảnh báo.
 * - Nút "Xem lại": Tua lại từ lúc bắt đầu mất tập trung.
 * - Nút "Xem tiếp": Tiếp tục xem và đóng thông báo.
 */
export default function AdaptiveSuggestionToast({ suggestion, onAccept, onDismiss }) {
  if (!suggestion) return null

  const [countdown, setCountdown] = useState(15)

  useEffect(() => {
    if (!suggestion) return
    setCountdown(15)
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [suggestion])

  useEffect(() => {
    if (countdown === 0) {
      onDismiss?.()
    }
  }, [countdown, onDismiss])

  const fmt = (sec) => {
    if (sec == null || isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = String(Math.floor(sec % 60)).padStart(2, '0')
    return `${m}:${s}`
  }

  const triggerType = suggestion.triggerType || 'BORED'

  const configMap = {
    CONFUSED: {
      title: 'Đoạn này có vẻ khó hiểu?',
      icon: <HelpCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />,
      borderColor: 'var(--emotion-confused, #d97706)',
      acceptText: 'Xem lại 30s',
      acceptIcon: <RotateCcw size={14} />,
      dismissText: 'Xem tiếp',
      defaultMsg: 'AI nhận thấy bạn đang đăm chiêu hoặc bối rối. Bạn có muốn tua lại một đoạn ngắn để xem lại lý thuyết không?',
    },
    BORED: {
      title: 'Bạn đang mất tập trung / rời camera',
      icon: <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />,
      borderColor: 'var(--emotion-bored, #dc2626)',
      acceptText: 'Xem lại',
      acceptIcon: <RotateCcw size={14} />,
      dismissText: 'Xem tiếp',
      defaultMsg: 'Hệ thống nhận thấy bạn có dấu hiệu mất tập trung hoặc rời vị trí camera. Hãy chú ý để không bỏ lỡ kiến thức quan trọng!',
    },
    NO_FACE: {
      title: 'Bạn đang mất tập trung / rời camera',
      icon: <AlertCircle size={18} style={{ color: '#f97316', flexShrink: 0 }} />,
      borderColor: 'var(--emotion-noface, #ea580c)',
      acceptText: 'Xem lại',
      acceptIcon: <RotateCcw size={14} />,
      dismissText: 'Xem tiếp',
      defaultMsg: 'Hệ thống không phát hiện khuôn mặt trước camera. Hãy chú ý để không bỏ lỡ kiến thức quan trọng!',
    },
  }

  const current = configMap[triggerType] || configMap.BORED
  const hasSegment = suggestion.videoSegmentStart != null && suggestion.videoSegmentEnd != null

  return (
    <div
      className="adaptive-suggestion-toast"
      style={{
        position: 'absolute',
        bottom: '80px',
        left: '20px',
        maxWidth: '430px',
        zIndex: 50,
        background: '#0f172a',
        border: `1px solid ${current.borderColor}`,
        borderRadius: '10px',
        padding: '14px 18px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
        animation: 'slideUpFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        color: '#f8fafc',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {current.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#f8fafc' }}>
              {current.title}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={11} style={{ color: 'var(--accent)' }} /> Cảnh báo học tập thích ứng AI
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 6,
          }}
          title="Đóng cảnh báo"
        >
          <X size={16} />
        </button>
      </div>

      <p style={{ margin: '10px 0 8px 0', fontSize: 12.5, lineHeight: 1.5, color: '#e2e8f0' }}>
        {suggestion.message || current.defaultMsg}
      </p>

      {hasSegment && (
        <div
          style={{
            marginBottom: 12,
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 11.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#fef08a',
          }}
        >
          <Clock size={12} style={{ color: '#f59e0b' }} />
          <span>
            Thời gian bắt đầu mất tập trung: <strong>{fmt(suggestion.videoSegmentStart)}</strong> (đến {fmt(suggestion.videoSegmentEnd)})
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <button
          type="button"
          className="btn secondary sm"
          onClick={onDismiss}
          style={{
            fontSize: 12,
            padding: '6px 14px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#cbd5e1',
          }}
          title={`Đóng thông báo (Tự động đóng sau ${countdown}s)`}
        >
          {current.dismissText} ({countdown}s)
        </button>

        <button
          type="button"
          className="btn primary sm"
          onClick={onAccept}
          style={{
            fontSize: 12,
            padding: '6px 16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 600,
          }}
          title="Tua lại từ thời điểm bắt đầu mất tập trung"
        >
          {current.acceptIcon}
          <span>{current.acceptText}</span>
        </button>
      </div>

      {/* Thanh tiến trình đếm ngược 15s tự động tắt */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          width: `${(countdown / 15) * 100}%`,
          background: current.borderColor,
          transition: 'width 1s linear',
          borderBottomLeftRadius: '14px',
        }}
      />
    </div>
  )
}
