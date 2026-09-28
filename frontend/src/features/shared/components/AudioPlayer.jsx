import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { resolveMediaUrl } from '@config/media.js'

/**
 * AudioPlayer — Giai đoạn 5, component #3.
 * Wrap wavesurfer.js, nút play/pause, tốc độ phát. Dùng lại ở Part 1/2/3/4, vocab, dictation.
 *
 * Props:
 *  - src: url audio
 *  - compact: bool (bỏ waveform, chỉ nút play — dùng khi audio ngắn kiểu 1 từ vựng)
 *
 * BUGFIX (nút Play không phát được âm thanh):
 * wavesurfer.js chỉ emit 'ready' SAU KHI nó fetch toàn bộ file về để giải mã vẽ waveform
 * (Fetcher.fetchBlob) — việc này bắt buộc phải có CORS hợp lệ và tốn thời gian tải hết file.
 * Trong khi đó việc PHÁT NHẠC thực sự (play()/pause()) lại thao tác thẳng lên thẻ <audio> gốc,
 * KHÔNG phụ thuộc vào việc giải mã waveform có thành công hay không.
 * Code cũ gate nút Play bằng disabled={!ready} => nếu việc tải waveform bị lỗi/chậm (CORS,
 * URL sai, mạng chậm...) thì nút Play bị khoá vĩnh viễn dù về bản chất có thể phát được.
 * => Ở đây dùng 1 thẻ <audio> "thật" làm nguồn phát chính cho CẢ 2 chế độ (compact lẫn
 * waveform), nút Play luôn thao tác thẳng lên thẻ <audio> này. WaveSurfer chỉ dùng để VẼ
 * waveform trang trí (qua option `media`), không còn được phép chặn khả năng bấm Play nữa.
 */
export default function AudioPlayer({ src, compact = false }) {
  const containerRef = useRef(null)
  const wsRef = useRef(null)
  const audioElRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [canPlay, setCanPlay] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // BUGFIX: backend co the tra audioUrl dang duong dan TUONG DOI (vd "/uploads/audio/...").
  // Neu dung thang, trinh duyet resolve theo origin cua FRONTEND -> 404. resolveMediaUrl
  // ghep them origin backend khi can.
  const resolvedSrc = resolveMediaUrl(src)

  // Waveform (chỉ trang trí, KHÔNG dùng để bật/tắt nút Play) — gắn vào chính thẻ <audio>
  // native bên dưới qua option `media` để không phải tải/giải mã file audio 2 lần.
  useEffect(() => {
    if (!resolvedSrc || compact || !audioElRef.current) return
    const ws = WaveSurfer.create({
      container: containerRef.current,
      media: audioElRef.current,
      height: 40,
      waveColor: '#4a5064',
      progressColor: '#5b8cff',
      cursorColor: '#5b8cff',
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      url: resolvedSrc,
    })
    wsRef.current = ws
    // 'error' ở đây chỉ là lỗi vẽ waveform (thường do CORS khi fetch để giải mã) — KHÔNG
    // được phép ảnh hưởng tới khả năng phát nhạc, nên chỉ log lại, không set loadError.
    ws.on('error', (err) => {
      console.warn('AudioPlayer: không vẽ được waveform (không ảnh hưởng phát audio)', err)
    })
    return () => {
      ws.destroy()
      wsRef.current = null
    }
  }, [resolvedSrc, compact])

  const togglePlay = async () => {
    const el = audioElRef.current
    if (!el) return
    try {
      if (playing) {
        el.pause()
      } else {
        await el.play()
      }
    } catch (err) {
      console.error('AudioPlayer: không phát được audio', resolvedSrc, err)
      setLoadError(true)
    }
  }

  const changeRate = (e) => {
    const value = Number(e.target.value)
    setRate(value)
    if (audioElRef.current) audioElRef.current.playbackRate = value
  }

  if (!resolvedSrc) return <span className="text-dim text-sm">Không có audio</span>

  return (
    <div className="audio-player">
      <button
        className="play-btn"
        onClick={togglePlay}
        disabled={loadError}
        aria-label={playing ? 'Tạm dừng' : 'Phát'}
      >
        {playing ? '⏸' : '▶'}
      </button>

      <audio
        ref={audioElRef}
        src={resolvedSrc}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onCanPlay={() => setCanPlay(true)}
        onError={() => setLoadError(true)}
        style={{ display: 'none' }}
      />

      {!compact && <div className="waveform" ref={containerRef} />}

      <select className="speed-select" value={rate} onChange={changeRate}>
        <option value={0.75}>0.75x</option>
        <option value={1}>1x</option>
        <option value={1.25}>1.25x</option>
        {!compact && <option value={1.5}>1.5x</option>}
      </select>

      {loadError && (
        <span className="text-sm" style={{ color: 'var(--bad)' }}>
          Không tải được file audio — vui lòng kiểm tra lại đường dẫn hoặc thử lại sau
        </span>
      )}
      {!canPlay && !loadError && (
        <span className="text-dim text-sm">Đang tải...</span>
      )}
    </div>
  )
}