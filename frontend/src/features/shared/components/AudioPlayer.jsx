import { useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  RotateCcw,
  RotateCw,
  Headphones,
  AlertCircle,
  RefreshCw,
  Gauge
} from 'lucide-react'
import { resolveMediaUrl } from '@config/media.js'

/**
 * Định dạng số giây thành chuỗi mm:ss an toàn tuyệt đối.
 * Xử lý triệt để các trường hợp Infinity, NaN, undefined hoặc số âm từ browser.
 */
function formatTime(sec) {
  if (!sec || !Number.isFinite(sec) || isNaN(sec) || sec < 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Định dạng thời gian còn lại đếm ngược -mm:ss.
 * Trả về '--:--' nếu chưa xác định được thời lượng tổng (tránh Infinity:NaN).
 */
function formatRemaining(curr, dur) {
  if (!dur || !Number.isFinite(dur) || isNaN(dur) || dur <= 0) return '--:--'
  const remaining = Math.max(0, dur - curr)
  return `-${formatTime(remaining)}`
}

/**
 * AudioPlayer — Trình phát âm thanh chuyên nghiệp dành cho học viên luyện đề TOEIC/IELTS.
 * Giao diện hiện đại lấy cảm hứng từ Study4 & các nền tảng thi trực tuyến quốc tế:
 *  - Header: Thẻ pill "Recording", trạng thái phát (Equalizer sóng động), nút tua nhanh +/- 5s.
 *  - Thân: Nút Play/Pause lớn nổi bật, thanh tiến trình timeline kéo thả mượt mà,
 *    hiển thị thời gian hiện tại và thời gian còn lại đếm ngược (chuẩn hóa không bị Infinity:NaN).
 *  - Footer/Action: Điều chỉnh âm lượng (slider + mute/unmute), chọn tốc độ phát (0.75x -> 1.5x), tua lại từ đầu.
 *
 * Props:
 *  - src: URL audio
 *  - compact: bool (chế độ mini 1 nút dùng cho từ vựng / flashcard)
 *  - label: string (nhãn trong compact mode, vd 'US' | 'UK')
 *  - title: string (tiêu đề bài nghe, mặc định 'Recording')
 */
export default function AudioPlayer({ src, compact = false, label, title }) {
  const audioElRef = useRef(null)
  const progressBarRef = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false) // Chỉ tải audio khi người dùng bấm Play để tiết kiệm credit Cloudinary
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [canPlay, setCanPlay] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [showRemaining, setShowRemaining] = useState(true) // true: hiển thị -06:13 (như Study4), false: hiển thị tổng 09:19
  const [hoverTooltip, setHoverTooltip] = useState(null) // { timeStr, xPercent }

  const resolvedSrc = resolveMediaUrl(src)

  // Cập nhật duration khi audio element trả về giá trị hợp lệ (hữu hạn > 0)
  const updateDuration = (el) => {
    if (!el) return false
    const d = el.duration
    if (Number.isFinite(d) && d > 0) {
      setDuration((prev) => (prev !== d ? d : prev))
      return true
    }
    return false
  }

  // Reset state khi đổi source audio
  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
    setHasStarted(false)
    setCanPlay(false)
    setLoadError(false)
    if (audioElRef.current) {
      audioElRef.current.currentTime = 0
    }
  }, [resolvedSrc])

  const togglePlay = async () => {
    const el = audioElRef.current
    if (!el) return
    try {
      if (!hasStarted) {
        setHasStarted(true)
      }
      if (playing) {
        el.pause()
      } else {
        await el.play()
      }
    } catch (err) {
      console.error('AudioPlayer: Lỗi phát audio', resolvedSrc, err)
      setLoadError(true)
    }
  }

  const handleTimeUpdate = () => {
    const el = audioElRef.current
    if (!el) return
    setCurrentTime(el.currentTime)
    // Nếu duration chưa được lấy hoặc đang là 0/Infinity thì thử cập nhật lại
    if (!Number.isFinite(duration) || duration <= 0) {
      updateDuration(el)
    }
  }

  const handleDurationChange = () => {
    updateDuration(audioElRef.current)
  }

  const handleLoadedMetadata = () => {
    const el = audioElRef.current
    if (!el) return
    setCanPlay(true)
    setLoadError(false)

    // Nếu duration đã là số hợp lệ thì gán luôn
    if (updateDuration(el)) return

    // Fix lỗi Chromium / Chrome VBR:
    // Với một số file MP3 VBR hoặc stream từ CDN Cloudinary chưa đọc hết frame,
    // Chromium ban đầu gán audio.duration = Infinity.
    // Thủ thuật: seek nhẹ tới cuối stream (1e101), trình duyệt đọc được header độ dài rồi nhảy về 0.
    if (el.duration === Infinity && el.currentTime === 0) {
      const onSeeked = () => {
        el.removeEventListener('seeked', onSeeked)
        updateDuration(el)
        el.currentTime = 0
      }
      el.addEventListener('seeked', onSeeked, { once: true })
      try {
        el.currentTime = 1e101
      } catch {
        // Một số trình duyệt chặn set currentTime ngoài dải, bỏ qua
      }
    }
  }

  const handleSeek = (e) => {
    const el = audioElRef.current
    if (!el || !Number.isFinite(duration) || duration <= 0) return
    const newTime = Number(e.target.value)
    el.currentTime = newTime
    setCurrentTime(newTime)
  }

  const skipSeconds = (sec) => {
    const el = audioElRef.current
    if (!el) return
    const maxDur = (Number.isFinite(duration) && duration > 0) ? duration : (el.duration || 0)
    const target = Math.min(Math.max(0, el.currentTime + sec), maxDur || 0)
    el.currentTime = target
    setCurrentTime(target)
  }

  const restartAudio = () => {
    const el = audioElRef.current
    if (!el) return
    el.currentTime = 0
    setCurrentTime(0)
    if (!playing) {
      el.play().catch(() => {})
    }
  }

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value)
    setVolume(val)
    if (audioElRef.current) {
      audioElRef.current.volume = val
      audioElRef.current.muted = val === 0
    }
    setMuted(val === 0)
  }

  const toggleMute = () => {
    const el = audioElRef.current
    if (!el) return
    if (muted) {
      el.muted = false
      setMuted(false)
      el.volume = volume || 0.5
    } else {
      el.muted = true
      setMuted(true)
    }
  }

  const changeRate = (newRate) => {
    const val = Number(newRate)
    setRate(val)
    if (audioElRef.current) {
      audioElRef.current.playbackRate = val
    }
  }

  // Hover xem trước timestamp trên thanh tiến trình
  const handleProgressMouseMove = (e) => {
    if (!progressBarRef.current || !Number.isFinite(duration) || duration <= 0) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const percent = (offsetX / rect.width) * 100
    const timeAtPos = (offsetX / rect.width) * duration
    setHoverTooltip({
      timeStr: formatTime(timeAtPos),
      xPercent: percent,
    })
  }

  const handleProgressMouseLeave = () => {
    setHoverTooltip(null)
  }

  if (!resolvedSrc) {
    if (compact) {
      return (
        <span className="compact-audio-empty" title="Chưa có file phát âm">
          <Volume2 size={13} style={{ opacity: 0.4 }} />
          {label && <span>{label}</span>}
        </span>
      )
    }
    return (
      <div className="pro-audio-card empty">
        <span className="text-dim text-sm">Chưa có file âm thanh</span>
      </div>
    )
  }

  // ==========================================
  // CHẾ ĐỘ COMPACT: Dành cho từ vựng & flashcards
  // ==========================================
  if (compact) {
    return (
      <div className="audio-player-compact-wrap">
        <button
          type="button"
          className={`compact-audio-btn ${playing ? 'playing' : ''} ${loadError ? 'error' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            togglePlay()
          }}
          disabled={loadError}
          title={loadError ? 'Không tải được file âm thanh' : (playing ? 'Tạm dừng' : `Phát âm ${label || ''}`)}
          aria-label={label ? `Phát âm ${label}` : (playing ? 'Tạm dừng' : 'Phát')}
        >
          {playing ? (
            <Pause size={13} />
          ) : loadError ? (
            <AlertCircle size={13} style={{ color: 'var(--bad)' }} />
          ) : (
            <Volume2 size={13} />
          )}
          {label && <span className="compact-audio-label">{label}</span>}
        </button>

        <audio
          ref={audioElRef}
          src={resolvedSrc}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onCanPlay={() => setCanPlay(true)}
          onError={() => setLoadError(true)}
          style={{ display: 'none' }}
        />
      </div>
    )
  }

  // ==========================================
  // CHẾ ĐỘ CHUYÊN NGHIỆP: Study4 Format
  // ==========================================
  const hasValidDuration = Number.isFinite(duration) && duration > 0
  const progressPercent = hasValidDuration ? (currentTime / duration) * 100 : 0
  const displayTitle = title || 'Recording'

  return (
    <div className={`pro-audio-card ${playing ? 'is-playing' : ''}`}>
      {/* HTML5 Audio ẩn - preload="none" để KHÔNG tải trước ngầm, tiết kiệm 100% băng thông Cloudinary khi chưa bấm nghe */}
      <audio
        ref={audioElRef}
        src={resolvedSrc}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onCanPlay={() => {
          setCanPlay(true)
          setLoadError(false)
          updateDuration(audioElRef.current)
        }}
        onCanPlayThrough={() => updateDuration(audioElRef.current)}
        onProgress={() => updateDuration(audioElRef.current)}
        onError={() => setLoadError(true)}
        style={{ display: 'none' }}
      />

      {/* 1. Header Bar: Pill Badge + Trạng thái phát + Nút tua nhanh 5s */}
      <div className="pro-audio-header">
        <div className="pro-audio-badge-group">
          <div className="pro-audio-badge">
            <Headphones size={13} className="pro-audio-badge-icon" />
            <span>{displayTitle}</span>
          </div>

          <div className="pro-audio-status">
            {playing ? (
              <span className="status-indicator playing">
                <span className="equalizer-bars">
                  <span className="bar" />
                  <span className="bar" />
                  <span className="bar" />
                </span>
                Đang phát
              </span>
            ) : !hasStarted ? (
              <span className="status-indicator ready">Sẵn sàng (Bấm nghe)</span>
            ) : canPlay ? (
              <span className="status-indicator paused">Tạm dừng</span>
            ) : loadError ? (
              <span className="status-indicator error">Lỗi tải audio</span>
            ) : (
              <span className="status-indicator loading">Đang tải...</span>
            )}
          </div>
        </div>

        <div className="pro-audio-quick-actions">
          <button
            type="button"
            className="pro-audio-icon-btn"
            onClick={() => skipSeconds(-5)}
            title="Lùi 5 giây"
            disabled={!canPlay || loadError}
          >
            <RotateCcw size={14} />
            <span className="btn-label">-5s</span>
          </button>
          <button
            type="button"
            className="pro-audio-icon-btn"
            onClick={() => skipSeconds(5)}
            title="Tiến 5 giây"
            disabled={!canPlay || loadError}
          >
            <RotateCw size={14} />
            <span className="btn-label">+5s</span>
          </button>
          <button
            type="button"
            className="pro-audio-icon-btn"
            onClick={restartAudio}
            title="Phát lại từ đầu"
            disabled={!canPlay || loadError}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* 2. Main Player: Nút Play/Pause + Timeline Slider + Thời gian */}
      <div className="pro-audio-body">
        {/* Nút Play/Pause chuẩn Study4: nút bo tròn mềm hoặc squircle nổi bật */}
        <button
          type="button"
          className={`pro-audio-play-btn ${playing ? 'playing' : ''}`}
          onClick={togglePlay}
          disabled={loadError}
          title={playing ? 'Tạm dừng (Phím Space)' : 'Phát audio (Phím Space)'}
          aria-label={playing ? 'Tạm dừng' : 'Phát'}
        >
          {playing ? (
            <Pause size={18} strokeWidth={2.5} />
          ) : (
            <Play size={18} strokeWidth={2.5} style={{ marginLeft: 2 }} />
          )}
        </button>

        {/* Cụm thanh tiến trình Timeline Scrubber */}
        <div
          className="pro-audio-timeline-wrap"
          ref={progressBarRef}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
        >
          {/* Tooltip hiển thị thời gian khi rê chuột qua timeline */}
          {hoverTooltip && (
            <div
              className="pro-audio-hover-tooltip"
              style={{ left: `${hoverTooltip.xPercent}%` }}
            >
              {hoverTooltip.timeStr}
            </div>
          )}

          <div className="pro-audio-slider-container">
            <input
              type="range"
              min="0"
              max={hasValidDuration ? duration : 100}
              step="0.1"
              value={hasValidDuration ? currentTime : 0}
              onChange={handleSeek}
              disabled={!canPlay || loadError || !hasValidDuration}
              className="pro-audio-range"
              style={{
                background: hasValidDuration
                  ? `linear-gradient(to right, var(--accent, #2563eb) ${progressPercent}%, var(--surface-3, #e2e8f0) ${progressPercent}%)`
                  : 'var(--surface-3, #e2e8f0)'
              }}
              aria-label="Thanh tiến trình phát"
            />
          </div>

          <div className="pro-audio-time-row">
            <span className="time-curr">{hasStarted ? formatTime(currentTime) : '00:00'}</span>
            <button
              type="button"
              className="time-total-toggle"
              onClick={() => setShowRemaining((v) => !v)}
              title="Bấm để chuyển đổi giữa thời gian còn lại và tổng thời lượng"
            >
              {hasStarted && hasValidDuration
                ? (showRemaining ? formatRemaining(currentTime, duration) : formatTime(duration))
                : '--:--'}
            </button>
          </div>
        </div>

        {/* 3. Controls bên phải: Volume + Tốc độ phát (Speed) */}
        <div className="pro-audio-extra-controls">
          {/* Âm lượng: Icon Loa + Thanh trượt */}
          <div className="pro-audio-volume-group">
            <button
              type="button"
              className="pro-audio-vol-icon-btn"
              onClick={toggleMute}
              title={muted ? 'Bật âm thanh' : 'Tắt tiếng'}
            >
              {muted || volume === 0 ? (
                <VolumeX size={16} />
              ) : volume < 0.5 ? (
                <Volume1 size={16} />
              ) : (
                <Volume2 size={16} />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="pro-audio-vol-slider"
              style={{
                background: `linear-gradient(to right, var(--accent, #2563eb) ${(muted ? 0 : volume) * 100}%, var(--surface-3, #cbd5e1) ${(muted ? 0 : volume) * 100}%)`
              }}
              title={`Âm lượng: ${Math.round((muted ? 0 : volume) * 100)}%`}
              aria-label="Điều chỉnh âm lượng"
            />
          </div>

          {/* Tốc độ phát (Speed pill dropdown) */}
          <div className="pro-audio-speed-group">
            <Gauge size={13} className="speed-icon" />
            <select
              className="pro-audio-speed-select"
              value={rate}
              onChange={(e) => changeRate(e.target.value)}
              title="Tốc độ phát âm thanh"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="pro-audio-error-banner">
          <AlertCircle size={14} />
          <span>Không thể tải file âm thanh từ máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.</span>
        </div>
      )}
    </div>
  )
}