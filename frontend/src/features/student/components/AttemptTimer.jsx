import { useEffect, useState, useRef } from 'react'

/**
 * AttemptTimer — Giai đoạn 6.
 * Đồng hồ đếm ngược theo content_item.timeLimitMinutes (Part 1–7). Tự nộp bài khi hết giờ.
 *
 * Props: timeLimitMinutes (null = không giới hạn), onTimeUp()
 */
export default function AttemptTimer({ timeLimitMinutes, onTimeUp }) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMinutes ? timeLimitMinutes * 60 : null)
  const firedRef = useRef(false)

  useEffect(() => {
    if (secondsLeft == null) return
    if (secondsLeft <= 0) {
      if (!firedRef.current) {
        firedRef.current = true
        onTimeUp?.()
      }
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft, onTimeUp])

  if (secondsLeft == null) return null

  const mm = Math.floor(secondsLeft / 60)
  const ss = secondsLeft % 60
  const cls = secondsLeft <= 60 ? 'danger' : secondsLeft <= 300 ? 'warning' : ''

  return (
    <span className={`attempt-timer ${cls}`}>
      ⏱ {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
    </span>
  )
}
