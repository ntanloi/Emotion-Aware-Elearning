import { useCallback, useRef, useState } from 'react'
import * as sessionsApi from '@student/api/sessions.js'

/**
 * useLearningSession — toàn bộ vòng đời Phiên học (mục 2.1 đặc tả):
 * (không có) -> CHỜ BẮT ĐẦU -> ĐANG HỌC <-> TẠM DỪNG -> ĐÃ KẾT THÚC/BỎ DỞ.
 * Chỉ dùng cho content_item.type = VIDEO_LECTURE (BR-19).
 */
export function useLearningSession(contentItemId) {
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const startedRef = useRef(false)

  const start = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    try {
      const data = await sessionsApi.startSession(contentItemId)
      setSession(data)
      return data
    } catch (err) {
      setError(err)
      startedRef.current = false
      throw err
    }
  }, [contentItemId])

  const respondCameraPermission = useCallback(
    async (granted) => {
      if (!session) return
      const data = await sessionsApi.setCameraPermission(session.id, granted)
      setSession(data)
      return data
    },
    [session],
  )

  const pause = useCallback(async () => {
    if (!session) return
    const data = await sessionsApi.pauseSession(session.id)
    setSession(data)
    return data
  }, [session])

  const resume = useCallback(async () => {
    if (!session) return
    const data = await sessionsApi.resumeSession(session.id)
    setSession(data)
    return data
  }, [session])

  const finish = useCallback(
    async (abandoned = false) => {
      if (!session) return
      const data = await sessionsApi.finishSession(session.id, abandoned)
      setSession(data)
      return data
    },
    [session],
  )

  return { session, error, start, respondCameraPermission, pause, resume, finish }
}
