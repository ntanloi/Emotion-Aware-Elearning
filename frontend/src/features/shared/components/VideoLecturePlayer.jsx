import { useEffect, useRef, useState } from 'react'
import EmotionCameraCapture from '@student/components/EmotionCameraCapture.jsx'
import RichTextViewer from '@shared/components/RichTextViewer.jsx'
import { useLearningSession } from '@student/hooks/useLearningSession.js'

/**
 * VideoLecturePlayer — Giai đoạn 6, Bước 9.
 * Player video + xin quyền camera + gắn EmotionCameraCapture.
 * Vòng đời: WAITING -> LEARNING <-> PAUSED -> FINISHED/ABANDONED (mục 2.1/2.2 đặc tả).
 * CHƯA gắn camera AI thật (dùng <video> thường trước) — đúng kế hoạch để AI lại cuối cùng,
 * nhưng phần capture khung hình + gọi API vẫn hoạt động qua EmotionCameraCapture có sẵn.
 *
 * Props: contentItem: ContentItemDto (type=VIDEO_LECTURE)
 */
export default function VideoLecturePlayer({ contentItem }) {
  const { session, error, start, respondCameraPermission, pause, resume, finish } =
    useLearningSession(contentItem.id)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)
  const finishedRef = useRef(false)

  useEffect(() => {
    start().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentItem.id])

  // BỎ DỞ: đóng tab/thoát trang giữa lúc đang học -> báo cho backend biết (best-effort)
  useEffect(() => {
    const handleUnload = () => {
      if (session && !finishedRef.current && (session.status === 'LEARNING' || session.status === 'PAUSED')) {
        // fire-and-forget, không await được trong beforeunload
        finish(true).catch(() => {})
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [session, finish])

  const handlePermissionResult = async (granted) => {
    if (!session) return
    await respondCameraPermission(granted)
  }

  const handlePlay = async () => {
    setPlaying(true)
    if (session?.status === 'PAUSED') await resume()
  }

  const handlePause = async () => {
    setPlaying(false)
    if (session?.status === 'LEARNING') await pause()
  }

  const handleEnded = async () => {
    setPlaying(false)
    finishedRef.current = true
    await finish(false)
  }

  const handleFinishClick = async () => {
    setPlaying(false)
    videoRef.current?.pause()
    finishedRef.current = true
    await finish(false)
  }

  if (error) {
    return <p style={{ color: 'var(--bad)' }}>Không thể bắt đầu phiên học: {String(error.message || error)}</p>
  }

  return (
    <div>
      <h2>{contentItem.title}</h2>
      <div className="video-wrap">
        {contentItem.videoUrl ? (
          <video
            ref={videoRef}
            className="video-el"
            src={contentItem.videoUrl}
            controls
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
          />
        ) : (
          <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="text-dim">Chưa có video</p>
          </div>
        )}
        {session && session.status !== 'FINISHED' && session.status !== 'ABANDONED' && (
          <EmotionCameraCapture
            sessionId={session.id}
            active={playing && session.status === 'LEARNING'}
            onPermissionResult={handlePermissionResult}
          />
        )}
      </div>

      {contentItem.bodyHtml && (
        <div className="card mt-16">
          <RichTextViewer html={contentItem.bodyHtml} />
        </div>
      )}

      <div className="flex-row mt-16">
        {session?.status && <span className="emotion-badge">Trạng thái: {statusLabel(session.status)}</span>}
        {session?.focusScore != null && (
          <span className="emotion-badge">
            <span className="dot" /> Focus score: {session.focusScore.toFixed(0)}%
          </span>
        )}
        {!session?.hasCameraPermission && session?.status && session.status !== 'WAITING' && (
          <span className="emotion-badge">Không dùng camera — vẫn học bình thường</span>
        )}
        {session && session.status !== 'FINISHED' && session.status !== 'ABANDONED' && (
          <button className="btn secondary sm" onClick={handleFinishClick}>Hoàn thành bài học</button>
        )}
      </div>
    </div>
  )
}

function statusLabel(status) {
  return {
    WAITING: 'Chờ bắt đầu',
    LEARNING: 'Đang học',
    PAUSED: 'Tạm dừng',
    FINISHED: 'Đã kết thúc',
    ABANDONED: 'Bỏ dở',
  }[status] || status
}