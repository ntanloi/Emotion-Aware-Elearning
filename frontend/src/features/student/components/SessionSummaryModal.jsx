import React from 'react'
import { Trophy, CheckCircle, Clock, Eye, Sparkles, Brain, Lightbulb, X, ArrowRight, RotateCcw } from 'lucide-react'

/**
 * SessionSummaryModal — Báo cáo học tập sau buổi học (Giai đoạn 8 KLTN).
 * Hiển thị điểm tập trung trung bình (engagement_score) dựa trên tỷ lệ ENGAGED + INTERESTED,
 * biểu đồ phân bổ trạng thái học tập và khuyến nghị sư phạm thông minh từ AI.
 */
export default function SessionSummaryModal({ isOpen, onClose, summary, onReplay }) {
  if (!isOpen || !summary) return null

  const formatDuration = (sec) => {
    if (!sec || isNaN(sec)) return '0 giây'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    if (m === 0) return `${s} giây`
    return `${m} phút ${s > 0 ? `${s} giây` : ''}`
  }

  const score = Math.round((summary.engagementScore || 0) * 10) / 10
  const isHigh = score >= 80
  const isMedium = score >= 60 && score < 80

  const theme = isHigh
    ? { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', label: 'Xuất sắc — Tập trung cao độ' }
    : isMedium
    ? { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.3)', label: 'Khá tốt — Tiếp thu ổn định' }
    : { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', label: 'Cần chú ý — Có dấu hiệu mệt mỏi' }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface-1, #ffffff)',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: 20,
          maxWidth: 580,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.25)',
          animation: 'scaleUpFade 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: theme.bg,
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.color,
              }}
            >
              {isHigh ? <Trophy size={20} /> : <Brain size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Báo cáo Tổng kết Buổi học</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-dim, #94a3b8)' }}>
                {summary.lessonTitle || 'Bài giảng Video'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Banner điểm tập trung */}
          <div
            style={{
              background: theme.bg,
              border: `1.5px solid ${theme.border}`,
              borderRadius: 16,
              padding: '20px',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {theme.label}
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, color: theme.color, margin: '8px 0 4px', lineHeight: 1 }}>
              {score}%
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim, #94a3b8)' }}>
              Điểm tập trung trung bình (ENGAGED + INTERESTED)
            </div>
          </div>

          {/* Grid thống kê nhanh */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div
              style={{
                background: 'var(--surface-2, rgba(255,255,255,0.04))',
                borderRadius: 12,
                padding: '12px 14px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                <Clock size={13} /> Thời lượng
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formatDuration(summary.durationSeconds)}</div>
            </div>

            <div
              style={{
                background: 'var(--surface-2, rgba(255,255,255,0.04))',
                borderRadius: 12,
                padding: '12px 14px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                <Eye size={13} /> Khung hình
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{summary.totalFrames || 0} ảnh</div>
            </div>

            <div
              style={{
                background: 'var(--surface-2, rgba(255,255,255,0.04))',
                borderRadius: 12,
                padding: '12px 14px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                <Sparkles size={13} /> Gợi ý thích ứng
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{summary.suggestionsCount || 0} lần</div>
            </div>
          </div>

          {/* Biểu đồ phân bổ thanh tiến trình các trạng thái học tập */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
              <span>Phân bổ Trạng thái Học tập:</span>
              <span style={{ color: '#10b981' }}>{score}% tích cực</span>
            </div>

            {/* Thanh tiến trình nhiều màu */}
            <div
              style={{
                height: 12,
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                display: 'flex',
                marginBottom: 10,
              }}
            >
              <div style={{ width: `${summary.engagedPercent || 0}%`, background: '#10b981' }} title={`Tập trung: ${summary.engagedPercent}%`} />
              <div style={{ width: `${summary.interestedPercent || 0}%`, background: '#6366f1' }} title={`Hứng thú: ${summary.interestedPercent}%`} />
              <div style={{ width: `${summary.confusedPercent || 0}%`, background: '#f59e0b' }} title={`Bối rối: ${summary.confusedPercent}%`} />
              <div style={{ width: `${summary.boredPercent || 0}%`, background: '#ef4444' }} title={`Mất tập trung: ${summary.boredPercent}%`} />
              <div style={{ width: `${summary.noFacePercent || 0}%`, background: '#f97316' }} title={`Rời camera: ${summary.noFacePercent}%`} />
            </div>

            {/* Chú thích màu sắc */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11.5, color: '#94a3b8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Tập trung ({summary.engagedPercent}%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} /> Hứng thú ({summary.interestedPercent}%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Bối rối ({summary.confusedPercent}%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Phân tâm ({summary.boredPercent}%)
              </span>
              {summary.noFacePercent > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} /> Rời cam ({summary.noFacePercent}%)
                </span>
              )}
            </div>
          </div>

          {/* Lời khuyên sư phạm AI */}
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <Lightbulb size={20} style={{ color: '#818cf8', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#e2e8f0' }}>
              <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: 2 }}>Nhận xét từ AI Trợ lý Học tập:</div>
              {summary.aiAdvice}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            background: 'var(--surface-2, rgba(255, 255, 255, 0.02))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {onReplay ? (
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => {
                onClose()
                onReplay()
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RotateCcw size={14} /> Xem lại video
            </button>
          ) : <div />}

          <button
            type="button"
            className="btn primary"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>Đóng báo cáo</span>
            <CheckCircle size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
