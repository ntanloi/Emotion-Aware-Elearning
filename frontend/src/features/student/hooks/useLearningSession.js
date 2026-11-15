import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as sessionsApi from '@student/api/sessions.js'

/**
 * useLearningSession — toàn bộ vòng đời Phiên học (mục 2.1 đặc tả):
 * (không có) -> CHỜ BẮT ĐẦU -> ĐANG HỌC <-> TẠM DỪNG -> ĐÃ KẾT THÚC/BỎ DỞ.
 * Chỉ dùng cho content_item.type = VIDEO_LECTURE (BR-19).
 *
 * LƯU Ý: phiên học CHỈ được tạo khi học viên bấm Play (respondCameraPermission tự gọi start()),
 * không tạo khi chỉ mở trang bài giảng — để báo cáo không ghi nhận "đã học" khi chưa xem.
 */
export function useLearningSession(contentItemId) {
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const startPromiseRef = useRef(null)
  const queryClient = useQueryClient()

  const invalidateReports = useCallback(() => {
    try {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['dailyReport'] })
      queryClient.invalidateQueries({ queryKey: ['studentReports'] })
    } catch (ignored) {}
  }, [queryClient])

  // Đổi sang bài khác -> quên phiên cũ, lần Play sau sẽ tạo phiên mới
  useEffect(() => {
    startPromiseRef.current = null
    setSession(null)
    setError(null)
  }, [contentItemId])

  /** Tạo phiên (chỉ 1 lần cho mỗi bài). Gọi lại sẽ trả về cùng 1 promise. */
  const start = useCallback(() => {
    if (startPromiseRef.current) return startPromiseRef.current
    const p = sessionsApi
      .startSession(contentItemId)
      .then((data) => {
        setSession(data)
        invalidateReports()
        return data
      })
      .catch((err) => {
        setError(err)
        startPromiseRef.current = null
        throw err
      })
    startPromiseRef.current = p
    return p
  }, [contentItemId, invalidateReports])

  /** Gọi khi bấm Play (hoặc bật/tắt camera): tạo phiên nếu chưa có, rồi chuyển sang ĐANG HỌC. */
  const respondCameraPermission = useCallback(
    async (granted, consentVersion = 'v1.0') => {
      const s = await start()
      const data = await sessionsApi.setCameraPermission(s.id, granted, consentVersion)
      setSession(data)
      invalidateReports()
      return data
    },
    [start, invalidateReports],
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
      invalidateReports()
      return data
    },
    [session, invalidateReports],
  )

  return { session, error, start, respondCameraPermission, pause, resume, finish }
}