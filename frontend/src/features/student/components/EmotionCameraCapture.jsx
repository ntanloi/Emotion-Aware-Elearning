import { useEffect, useRef, useState, useCallback } from 'react'
import { sendFrameBatch } from '@student/api/emotions.js'
import { Camera, ShieldCheck, Eye, AlertCircle, Sparkles, GripHorizontal, CheckCircle2, HelpCircle, UserX, Minus } from 'lucide-react'

// Chụp dày (5 ảnh/giây) nhưng chỉ gửi 1 lô/giây: AI cần nhiều khung/giây thì mới phân biệt được
// chớp mắt, cau mày... với hành vi thật (giống bản emotion_demo chạy webcam trực tiếp).
const FRAME_INTERVAL_MS = 200
const SEND_INTERVAL_MS = 1_000
const MAX_BATCH = 6          // BR-04: backend nhận tối đa 6 ảnh/lô
const BATCH_SIZE = 1

// Bảng thanh cảm xúc (giống emotion_demo) để test. Tắt bằng VITE_EMOTION_DEBUG=false trong .env của frontend.
const DEBUG_DEFAULT = import.meta.env.VITE_EMOTION_DEBUG !== 'false'
// Vạch ngưỡng minh họa (khớp mặc định ai-service; nếu bạn đổi AI_*_THRESHOLD thì sửa số ở đây)
const DEBUG_BARS = [
  { key: 'focused', label: 'Tập trung', color: '#2e9d5b', mark: 0.65 },
  { key: 'interested', label: 'Hứng thú', color: '#3b82f6', mark: 0.60 },
  { key: 'confused', label: 'Bối rối', color: '#e0a100', mark: 0.25 },
  { key: 'bored', label: 'Chán', color: '#d64545', mark: 0.38 },
]

export default function EmotionCameraCapture({
  sessionId,
  active,
  permissionGranted,
  getVideoTimeSec,
  onPredictionUpdate,
  focusScore,
  onSuggestionTrigger,
  getExtra,
  onBatchResult,
  onSessionConflict,
}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const bufferRef = useRef([])
  const streamRef = useRef(null)

  const [streamActive, setStreamActive] = useState(false)
  const [lastPrediction, setLastPrediction] = useState(null)
  const [capturingCount, setCapturingCount] = useState(0)
  const [debugInfo, setDebugInfo] = useState(null)
  const [showDebug, setShowDebug] = useState(DEBUG_DEFAULT)

  // Tọa độ kéo thả của khung camera
  const [position, setPosition] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const wrapperRef = useRef(null)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 })

  const getVideoTimeSecRef = useRef(getVideoTimeSec)
  getVideoTimeSecRef.current = getVideoTimeSec

  const onPredictionUpdateRef = useRef(onPredictionUpdate)
  onPredictionUpdateRef.current = onPredictionUpdate

  const onSuggestionTriggerRef = useRef(onSuggestionTrigger)
  onSuggestionTriggerRef.current = onSuggestionTrigger

  const getExtraRef = useRef(getExtra)
  getExtraRef.current = getExtra

  const onBatchResultRef = useRef(onBatchResult)
  onBatchResultRef.current = onBatchResult

  const onSessionConflictRef = useRef(onSessionConflict)
  onSessionConflictRef.current = onSessionConflict

  // Xử lý kéo thả bằng chuột
  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    e.preventDefault()

    const wrapper = wrapperRef.current
    const parent = wrapper?.offsetParent
    if (!wrapper || !parent) return

    const parentRect = parent.getBoundingClientRect()
    const wrapperRect = wrapper.getBoundingClientRect()

    const currentX = wrapperRect.left - parentRect.left
    const currentY = wrapperRect.top - parentRect.top

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: currentX,
      posY: currentY,
      parentWidth: parentRect.width,
      parentHeight: parentRect.height,
      wrapperWidth: wrapperRect.width,
      wrapperHeight: wrapperRect.height,
    }

    setIsDragging(true)

    const handleMouseMove = (moveEvent) => {
      const { mouseX, mouseY, posX, posY, parentWidth, parentHeight, wrapperWidth, wrapperHeight } =
        dragStartRef.current

      const dx = moveEvent.clientX - mouseX
      const dy = moveEvent.clientY - mouseY

      const minX = 8
      const maxX = parentWidth - wrapperWidth - 8
      const minY = 8
      const maxY = parentHeight - wrapperHeight - 8

      const newX = Math.max(minX, Math.min(maxX, posX + dx))
      const newY = Math.max(minY, Math.min(maxY, posY + dy))

      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Xử lý kéo thả trên màn hình cảm ứng
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    const wrapper = wrapperRef.current
    const parent = wrapper?.offsetParent
    if (!wrapper || !parent) return

    const parentRect = parent.getBoundingClientRect()
    const wrapperRect = wrapper.getBoundingClientRect()

    const currentX = wrapperRect.left - parentRect.left
    const currentY = wrapperRect.top - parentRect.top

    dragStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      posX: currentX,
      posY: currentY,
      parentWidth: parentRect.width,
      parentHeight: parentRect.height,
      wrapperWidth: wrapperRect.width,
      wrapperHeight: wrapperRect.height,
    }

    setIsDragging(true)

    const handleTouchMove = (moveEvent) => {
      if (moveEvent.touches.length !== 1) return
      const t = moveEvent.touches[0]
      const { mouseX, mouseY, posX, posY, parentWidth, parentHeight, wrapperWidth, wrapperHeight } =
        dragStartRef.current

      const dx = t.clientX - mouseX
      const dy = t.clientY - mouseY

      const minX = 8
      const maxX = parentWidth - wrapperWidth - 8
      const minY = 8
      const maxY = parentHeight - wrapperHeight - 8

      const newX = Math.max(minX, Math.min(maxX, posX + dx))
      const newY = Math.max(minY, Math.min(maxY, posY + dy))

      setPosition({ x: newX, y: newY })
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }

    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)
  }

  // Bật camera khi được cấp quyền
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: 15 }
      })
      streamRef.current = stream
      setStreamActive(true)
    } catch (err) {
      console.warn('Học viên từ chối hoặc không tìm thấy camera:', err)
      setStreamActive(false)
    }
  }

  // Tắt camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setStreamActive(false)
  }

  // Lắng nghe thay đổi quyền camera từ prop permissionGranted
  useEffect(() => {
    if (permissionGranted === true) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [permissionGranted])

  // Gán stream vào phần tử <video> khi stream và videoRef sẵn sàng
  useEffect(() => {
    if (streamActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch((err) => console.warn('Camera play warning:', err))
    }
  }, [streamActive])

  const isSendingRef = useRef(false)

  // Chụp 1 khung hình trong bộ nhớ canvas (480x360, jpeg 0.7 ~25KB): đủ nét để MediaPipe đọc mắt/miệng/mày
  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    const targetW = 480
    const targetH = 360
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, targetW, targetH)
    return canvas.toDataURL('image/jpeg', 0.6)
  }, [])

  // Vòng lặp: chụp mỗi 200ms vào bộ đệm, mỗi 1s gửi cả lô lên backend
  useEffect(() => {
    if (!permissionGranted || !streamActive || !active || !sessionId) {
      bufferRef.current = []
      setCapturingCount(0)
      isSendingRef.current = false
      return
    }

    console.log('[AI Emotion] Bắt đầu chụp 5 ảnh/giây, gửi lô mỗi 1s cho session:', sessionId)

    const captureTimer = setInterval(() => {
      if (!active) return
      const frame = captureFrame()
      if (!frame) return
      bufferRef.current.push(frame)
      if (bufferRef.current.length > MAX_BATCH) bufferRef.current.shift()   // bỏ ảnh cũ nhất nếu gửi chậm
    }, FRAME_INTERVAL_MS)

    const sendTimer = setInterval(async () => {
      if (!active || isSendingRef.current || bufferRef.current.length === 0) return

      const frames = bufferRef.current.splice(0, MAX_BATCH)
      const videoTime = getVideoTimeSecRef.current ? getVideoTimeSecRef.current() : null
      const extra = getExtraRef.current ? getExtraRef.current() : {}

      isSendingRef.current = true
      try {
        const res = await sendFrameBatch(sessionId, frames, videoTime, extra)
        onBatchResultRef.current?.(res)
        const logs = Array.isArray(res) ? res : res?.logs
        if (res?.debug) setDebugInfo(res.debug)
        if (logs && logs.length > 0) {
          const latest = logs[logs.length - 1]
          setLastPrediction(latest)
          onPredictionUpdateRef.current?.(latest)
        }
        if (res?.suggestion && onSuggestionTriggerRef.current) {
          console.log('[AI Emotion] Nhận gợi ý thích ứng:', res.suggestion)
          onSuggestionTriggerRef.current(res.suggestion)
        }
      } catch (err) {
        console.error('[AI Emotion] Lỗi gửi khung hình lên backend:', err?.response?.data || err?.message || err)
        if (err?.response?.status >= 400 && err?.response?.status < 500) {
          onSessionConflictRef.current?.(err?.response?.data?.message || 'Phiên học không hợp lệ hoặc đã mở ở tab khác')
        }
      } finally {
        isSendingRef.current = false
      }
    }, SEND_INTERVAL_MS)

    return () => {
      console.log('[AI Emotion] Tạm dừng vòng lặp chụp ảnh')
      clearInterval(captureTimer)
      clearInterval(sendTimer)
      bufferRef.current = []
      setCapturingCount(0)
      isSendingRef.current = false
    }
  }, [permissionGranted, streamActive, active, sessionId, captureFrame])

  // Nhãn trạng thái hiển thị
  const renderLearningStateBadge = () => {
    if (!active) {
      return (
        <div className="learning-state-pill" style={{ borderColor: '#64748b' }}>
          <span className="state-pulse-dot" style={{ background: '#94a3b8' }} />
          <span>Video tạm dừng — AI tạm nghỉ</span>
        </div>
      )
    }
    if (!lastPrediction) {
      return (
        <div className="learning-state-pill" style={{ borderColor: '#64748b' }}>
          <span className="state-pulse-dot" style={{ background: '#64748b' }} />
          <span>Đang kết nối AI...</span>
        </div>
      )
    }
    const state = lastPrediction.learningState || 'ENGAGED'

    const stateMap = {
      ENGAGED: { label: 'Tập trung', Icon: CheckCircle2, color: 'var(--emotion-engaged, #059669)' },
      INTERESTED: { label: 'Hứng thú', Icon: Sparkles, color: 'var(--color-primary, #2563eb)' },
      CONFUSED: { label: 'Bối rối', Icon: HelpCircle, color: 'var(--emotion-confused, #d97706)' },
      BORED: { label: 'Mất tập trung', Icon: AlertCircle, color: 'var(--emotion-bored, #dc2626)' },
      NEUTRAL: { label: 'Điềm tĩnh', Icon: Minus, color: 'var(--emotion-neutral, #64748b)' },
      NO_FACE: { label: 'Rời camera', Icon: UserX, color: 'var(--emotion-noface, #ea580c)' },
    }

    const current = stateMap[state] || stateMap.ENGAGED
    const CurrentIcon = current.Icon

    return (
      <div className="learning-state-pill" style={{ borderColor: current.color }}>
        <span className="state-pulse-dot" style={{ background: current.color }} />
        <CurrentIcon size={12} style={{ color: current.color, flexShrink: 0 }} />
        <span>{current.label}</span>
      </div>
    )
  }

  // Bảng thanh cảm xúc: điểm 0-100% của 4 trạng thái + dấu hiệu đang kích hoạt (giống cửa sổ emotion_demo)
  const renderDebugPanel = () => {
    if (!DEBUG_DEFAULT || !permissionGranted || !streamActive) return null
    const stateColor = { ENGAGED: '#2e9d5b', INTERESTED: '#3b82f6', CONFUSED: '#e0a100', BORED: '#d64545', NO_FACE: '#94a3b8' }
    return (
      <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 11, pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}>
        <button
          type="button"
          onClick={() => setShowDebug((v) => !v)}
          style={{ pointerEvents: 'auto', cursor: 'pointer', background: 'rgba(15,23,42,0.85)', color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, fontSize: 11, padding: '3px 8px', marginBottom: 6 }}
        >
          {showDebug ? '▾ Thanh cảm xúc' : '▸ Thanh cảm xúc'}
        </button>
        {showDebug && (
          <div style={{ width: 230, padding: '8px 10px', background: 'rgba(15,23,42,0.82)', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.15)', color: '#f1f5f9', fontSize: 11.5 }}>
            {!debugInfo ? (
              <div style={{ opacity: 0.8 }}>{active ? 'Đang hiệu chỉnh / chờ AI... (ngồi nhìn màn hình tự nhiên ~5 giây đầu)' : 'Video tạm dừng'}</div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: stateColor[debugInfo.state] || '#fff' }}>
                  {debugInfo.state}
                  <span style={{ fontWeight: 400, opacity: 0.75, marginLeft: 6 }}>
                    tin cậy {Math.round((debugInfo.confidence ?? 0) * 100)}%
                  </span>
                </div>
                {DEBUG_BARS.map(({ key, label, color, mark }) => {
                  const v = Math.max(0, Math.min(1, Number(debugInfo[key]) || 0))
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 56, opacity: 0.9 }}>{label}</span>
                      <div style={{ position: 'relative', flex: 1, height: 9, background: 'rgba(255,255,255,0.18)', borderRadius: 3 }}>
                        <div style={{ width: `${v * 100}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.25s' }} />
                        <div title={`Ngưỡng ${Math.round(mark * 100)}%`} style={{ position: 'absolute', left: `${mark * 100}%`, top: -2, bottom: -2, width: 1.5, background: '#fff', opacity: 0.8 }} />
                      </div>
                      <span style={{ width: 34, textAlign: 'right' }}>{Math.round(v * 100)}%</span>
                    </div>
                  )
                })}
                {Array.isArray(debugInfo.cues) && debugInfo.cues.length > 0 && (
                  <div style={{ marginTop: 6, opacity: 0.85 }}>cues: {debugInfo.cues.slice(0, 3).join(', ')}</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {renderDebugPanel()}
      {/* 1. Khung Camera hiển thị và có thể kéo thả di chuyển tự do */}
      <div
        ref={wrapperRef}
        className={`camera-preview-wrapper ${isDragging ? 'is-dragging' : ''}`}
        style={{
          display: permissionGranted && streamActive ? 'block' : 'none',
          ...(position
            ? { left: `${position.x}px`, top: `${position.y}px` }
            : { bottom: '56px', right: '14px' }),
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        title="Nhấn giữ và kéo để di chuyển camera"
      >
        <div className="camera-preview-handle">
          <GripHorizontal size={14} />
        </div>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="camera-preview-video"
        />
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 2. Badge hiển thị trạng thái AI thời gian thực */}
      {permissionGranted && streamActive && (
        <div className="camera-status-overlay">
          {renderLearningStateBadge()}
          {focusScore != null && (
            <div className="learning-state-pill" style={{ borderColor: 'rgba(255,255,255,0.2)', fontSize: '11px', color: '#e2e8f0' }}>
              <span>Độ tập trung: <strong>{focusScore.toFixed(0)}%</strong></span>
            </div>
          )}
          {active && capturingCount > 0 && (
            <span className="capturing-indicator">● AI Đang phân tích ({capturingCount}/{BATCH_SIZE})</span>
          )}
        </div>
      )}
    </>
  )
}
