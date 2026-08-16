import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import EmotionCameraCapture from '../components/EmotionCameraCapture.jsx'
import * as sessionsApi from '../api/sessions.js'

export default function LessonPlayerPage() {
  const { lessonId } = useParams()
  const [session, setSession] = useState(null)
  const [playing, setPlaying] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    sessionsApi.startSession(lessonId).then(setSession)
  }, [lessonId])

  const handlePermissionResult = useCallback((granted) => {
    if (!session) return
    sessionsApi.setCameraPermission(session.id, granted).then(setSession)
    setPlaying(true)
  }, [session])

  const togglePause = async () => {
    if (!session) return
    const updated = playing
      ? await sessionsApi.pauseSession(session.id)
      : await sessionsApi.resumeSession(session.id)
    setSession(updated)
    setPlaying(!playing)
  }

  const finish = async () => {
    if (!session) return
    const updated = await sessionsApi.finishSession(session.id, false)
    setSession(updated)
    setPlaying(false)
  }

  return (
    <div>
      <h2>Bài giảng</h2>
      <div className="video-wrap" style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-dim)' }}>[ trình phát video ở đây ]</p>
        {session && (
          <EmotionCameraCapture
            sessionId={session.id}
            active={playing}
            onPermissionResult={handlePermissionResult}
          />
        )}
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn secondary" onClick={togglePause} disabled={!session}>
          {playing ? 'Tạm dừng' : 'Tiếp tục'}
        </button>
        <button className="btn" onClick={finish} disabled={!session}>Hoàn thành bài học</button>
        {session?.status && <span className="emotion-badge">Trạng thái: {session.status}</span>}
        {session?.focusScore != null && <span className="emotion-badge">Focus score: {session.focusScore.toFixed(0)}%</span>}
      </div>
    </div>
  )
}
