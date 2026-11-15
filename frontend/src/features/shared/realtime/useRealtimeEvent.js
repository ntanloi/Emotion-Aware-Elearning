import { useEffect, useRef } from 'react'
import { realtimeClient } from './realtimeClient.js'

/**
 * useRealtimeEvent — Hook lắng nghe sự kiện Realtime theo loại (event type).
 * Tự động đăng ký và hủy đăng ký khi component mount/unmount.
 *
 * @param {string} type Tên loại sự kiện (vd: 'notification', 'payment', 'admin-stats', 'course-status')
 * @param {function} handler Callback nhận dữ liệu sự kiện: (data, rawEvent) => void
 */
export function useRealtimeEvent(type, handler) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!type || typeof handlerRef.current !== 'function') return

    const unsubscribe = realtimeClient.subscribe(type, (data, rawEvent) => {
      if (handlerRef.current) {
        handlerRef.current(data, rawEvent)
      }
    })

    return unsubscribe
  }, [type])
}
