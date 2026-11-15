import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import apiClient from '@shared/api/client.js'

/**
 * useEventStream — Hook quản lý kết nối SSE tới backend (Giai đoạn 4).
 * Hỗ trợ:
 * - Gửi token Authorization Bearer
 * - Tự động tạm dừng khi tab trình duyệt bị ẩn (visibilitychange) và mở lại khi hiện
 * - Tự động kết nối lại với Exponential Backoff + Jitter
 * - Chuyển sang chế độ dự phòng Polling sau 3 lần lỗi liên tiếp
 * - Throttle cập nhật state <= 1 lần / giây
 */
export function useEventStream({ enabled = true, onAlert } = {}) {
  const [snapshot, setSnapshot] = useState(null)
  const [latestAlert, setLatestAlert] = useState(null)
  const [status, setStatus] = useState('CONNECTING') // 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'FALLBACK'
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  const abortControllerRef = useRef(null)
  const onAlertRef = useRef(onAlert)
  onAlertRef.current = onAlert

  const retryCountRef = useRef(0)
  const lastUpdateRef = useRef(0)
  const pendingSnapshotRef = useRef(null)
  const throttleTimeoutRef = useRef(null)
  const pollingIntervalRef = useRef(null)
  const fallbackRetryTimerRef = useRef(null)
  const connectSSERef = useRef(null)
  const isTabHiddenRef = useRef(false)

  // Cập nhật state có giới hạn tần suất (throttle 1s)
  const scheduleUpdateSnapshot = useCallback((newSnapshot) => {
    pendingSnapshotRef.current = newSnapshot
    const now = Date.now()
    const remaining = 1000 - (now - lastUpdateRef.current)

    if (remaining <= 0) {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current)
        throttleTimeoutRef.current = null
      }
      setSnapshot(pendingSnapshotRef.current)
      setLastUpdatedAt(new Date())
      lastUpdateRef.current = now
    } else if (!throttleTimeoutRef.current) {
      throttleTimeoutRef.current = setTimeout(() => {
        setSnapshot(pendingSnapshotRef.current)
        setLastUpdatedAt(new Date())
        lastUpdateRef.current = Date.now()
        throttleTimeoutRef.current = null
      }, remaining)
    }
  }, [])

  // Chế độ dự phòng: Polling mỗi 5 giây, kèm tự động thử phục hồi lại SSE sau 60s (có jitter)
  const startFallbackPolling = useCallback(() => {
    setStatus('FALLBACK')

    if (!pollingIntervalRef.current) {
      const poll = async () => {
        if (isTabHiddenRef.current) return
        try {
          const res = await apiClient.get('/teacher/live/snapshot')
          if (res.data) {
            scheduleUpdateSnapshot(res.data)
          }
        } catch (err) {
          console.warn('[useEventStream] Polling error:', err)
        }
      }

      poll()
      pollingIntervalRef.current = setInterval(poll, 5000)
    }

    // Tự động thử kết nối lại SSE sau 60 giây (jitter ±5s) thay vì kẹt vĩnh viễn ở polling
    if (!fallbackRetryTimerRef.current) {
      const retryDelay = 60000 + (Math.random() * 10000 - 5000)
      fallbackRetryTimerRef.current = setTimeout(() => {
        fallbackRetryTimerRef.current = null
        if (!isTabHiddenRef.current) {
          console.info('[useEventStream] Đang thử kết nối lại SSE từ chế độ FALLBACK...')
          connectSSERef.current?.()
        }
      }, retryDelay)
    }
  }, [scheduleUpdateSnapshot])

  const stopFallbackPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    if (fallbackRetryTimerRef.current) {
      clearTimeout(fallbackRetryTimerRef.current)
      fallbackRetryTimerRef.current = null
    }
  }, [])

  const connectSSE = useCallback(() => {
    if (!enabled || isTabHiddenRef.current) return

    const token = localStorage.getItem('accessToken')
    if (!token) {
      setStatus('FALLBACK')
      return
    }

    // Hủy kết nối cũ nếu có
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
    const streamUrl = `${baseUrl}/teacher/live/stream`

    setStatus(retryCountRef.current > 0 ? 'RECONNECTING' : 'CONNECTING')

    fetchEventSource(streamUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal: abortControllerRef.current.signal,
      openWhenHidden: false, // Dừng xử lý khi tab ẩn

      async onopen(response) {
        if (response.ok) {
          retryCountRef.current = 0
          stopFallbackPolling()
          setStatus('LIVE')
          return
        }

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('accessToken')
          window.location.href = '/login'
          throw new Error('Xác thực thất bại, phiên đăng nhập đã hết hạn')
        }

        throw new Error(`SSE Open Error: status ${response.status}`)
      },

      onmessage(event) {
        if (event.event === 'snapshot') {
          try {
            const data = JSON.parse(event.data)
            scheduleUpdateSnapshot(data)
          } catch (e) {
            console.error('[useEventStream] Lỗi parse snapshot:', e)
          }
        } else if (event.event === 'alert') {
          try {
            const alertData = JSON.parse(event.data)
            setLatestAlert(alertData)
            if (onAlertRef.current) onAlertRef.current(alertData)
          } catch (e) {
            console.error('[useEventStream] Lỗi parse alert:', e)
          }
        }
      },

      onclose() {
        if (!isTabHiddenRef.current && !abortControllerRef.current?.signal?.aborted) {
          handleDisconnect()
        }
      },

      onerror(err) {
        if (abortControllerRef.current?.signal?.aborted || err?.name === 'AbortError') {
          return
        }
        console.warn('[useEventStream] Kết nối SSE gặp lỗi:', err?.message || err)
        handleDisconnect()
        throw err // Để thư viện dừng loop mặc định và nhường quyền cho backoff tùy chỉnh
      },
    }).catch(() => {
      // Bắt exception từ onerror
    })
  }, [enabled, scheduleUpdateSnapshot, stopFallbackPolling])

  connectSSERef.current = connectSSE

  const handleDisconnect = useCallback(() => {
    if (isTabHiddenRef.current || abortControllerRef.current?.signal?.aborted) return

    retryCountRef.current += 1

    if (retryCountRef.current >= 3) {
      console.warn('[useEventStream] SSE lỗi 3 lần liên tiếp, chuyển sang chế độ dự phòng Polling 5s')
      startFallbackPolling()
      return
    }

    setStatus('RECONNECTING')
    // Exponential backoff 1s -> 30s kèm jitter ngẫu nhiên
    const delay = Math.min(30000, 1000 * Math.pow(1.5, retryCountRef.current) + Math.random() * 500)
    setTimeout(() => {
      if (!isTabHiddenRef.current) {
        connectSSE()
      }
    }, delay)
  }, [connectSSE, startFallbackPolling])

  // Xử lý ẩn/hiện tab (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isTabHiddenRef.current = true
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        stopFallbackPolling()
      } else {
        isTabHiddenRef.current = false
        retryCountRef.current = 0
        stopFallbackPolling()
        connectSSE()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connectSSE, stopFallbackPolling])

  // Khởi tạo kết nối khi mount
  useEffect(() => {
    if (enabled) {
      connectSSE()
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      stopFallbackPolling()
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current)
      }
    }
  }, [enabled, connectSSE, stopFallbackPolling])

  const reconnect = useCallback(() => {
    retryCountRef.current = 0
    stopFallbackPolling()
    connectSSE()
  }, [connectSSE, stopFallbackPolling])

  return {
    snapshot,
    latestAlert,
    status,
    lastUpdatedAt,
    reconnect,
  }
}
