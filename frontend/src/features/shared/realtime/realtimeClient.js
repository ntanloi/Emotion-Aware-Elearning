import { fetchEventSource } from '@microsoft/fetch-event-source'

/**
 * RealtimeClient — Quản lý duy nhất 1 kết nối SSE /api/realtime/stream cho mỗi tab trình duyệt.
 * Hỗ trợ:
 * - Đăng ký lắng nghe sự kiện theo type: subscribe(type, callback)
 * - Tự động reconnect với exponential backoff (1s - 30s) + jitter
 * - Header Last-Event-ID để lấy lại các sự kiện bị lỡ khi rớt mạng
 * - Xử lý token hết hạn (401/403)
 * - Tạm ngắt / nối lại khi tab visibility thay đổi
 */
class RealtimeClient {
  constructor() {
    this.status = 'DISCONNECTED' // 'DISCONNECTED' | 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'DISABLED'
    this.listeners = new Map() // type -> Set<callback>
    this.statusListeners = new Set() // Set<callback(status)>
    this.lastEventId = null
    this.abortController = null
    this.retryCount = 0
    this.reconnectTimer = null
    this.isManualClosed = false
    this.isTabHidden = false
  }

  getStatus() {
    return this.status
  }

  isLive() {
    return this.status === 'LIVE'
  }

  onStatusChange(cb) {
    this.statusListeners.add(cb)
    return () => this.statusListeners.delete(cb)
  }

  _setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus
      this.statusListeners.forEach((cb) => {
        try {
          cb(newStatus)
        } catch (e) {
          console.error('[RealtimeClient] Status callback error:', e)
        }
      })
    }
  }

  /**
   * Đăng ký lắng nghe 1 loại sự kiện (hoặc '*' cho mọi sự kiện).
   * @param {string} type Tên sự kiện (vd: 'notification', 'payment', 'admin-stats', 'course-status')
   * @param {function} handler Callback nhận dữ liệu: (data, rawEvent) => void
   * @returns {function} Hàm hủy đăng ký unsubscribe
   */
  subscribe(type, handler) {
    if (!type || typeof handler !== 'function') return () => {}
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type).add(handler)

    return () => {
      const set = this.listeners.get(type)
      if (set) {
        set.delete(handler)
        if (set.size === 0) {
          this.listeners.delete(type)
        }
      }
    }
  }

  _emit(type, data, rawEvent) {
    // Gọi handler của type cụ thể
    const handlers = this.listeners.get(type)
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data, rawEvent)
        } catch (e) {
          console.error(`[RealtimeClient] Error handling event ${type}:`, e)
        }
      })
    }
    // Gọi handler '*' nếu có
    const wildcard = this.listeners.get('*')
    if (wildcard) {
      wildcard.forEach((h) => {
        try {
          h(data, rawEvent)
        } catch (e) {
          console.error('[RealtimeClient] Error in wildcard handler:', e)
        }
      })
    }
  }

  connect() {
    // Kiểm tra feature flag phía frontend
    const realtimeEnabled = import.meta.env.VITE_REALTIME_ENABLED !== 'false'
    if (!realtimeEnabled) {
      this._setStatus('DISABLED')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) {
      this._setStatus('DISCONNECTED')
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()
    this.isManualClosed = false

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
    const streamUrl = `${baseUrl}/realtime/stream`

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    }
    if (this.lastEventId) {
      headers['Last-Event-ID'] = this.lastEventId
    }

    this._setStatus(this.retryCount > 0 ? 'RECONNECTING' : 'CONNECTING')
    const self = this

    fetchEventSource(streamUrl, {
      method: 'GET',
      headers,
      signal: this.abortController.signal,
      openWhenHidden: true, // Duy trì kết nối nhẹ để không lỡ sự kiện quan trọng khi chuyển tab

      onopen: async (response) => {
        if (response.ok) {
          self.retryCount = 0
          self._setStatus('LIVE')
          return
        }

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('accessToken')
          window.location.href = '/login'
          throw new Error('Phiên đăng nhập đã hết hạn')
        }

        if (response.status === 503) {
          self._setStatus('DISABLED')
          throw new Error('Kênh Realtime SSE phía máy chủ đang tắt')
        }

        throw new Error(`SSE Open Error: status ${response.status}`)
      },

      onmessage: (event) => {
        if (event.id) {
          self.lastEventId = event.id
        }
        if (!event.event || event.event === 'ping') {
          return // Heartbeat comment hoặc event ping
        }

        let parsedData = null
        try {
          parsedData = event.data ? JSON.parse(event.data) : null
        } catch (e) {
          parsedData = event.data
        }

        self._emit(event.event, parsedData, event)
      },

      onclose: () => {
        if (!self.isManualClosed && !self.abortController?.signal?.aborted) {
          self._handleDisconnect()
        }
      },

      onerror: (err) => {
        if (self.isManualClosed || self.abortController?.signal?.aborted || err?.name === 'AbortError') {
          return
        }
        console.warn('[RealtimeClient] Lỗi kết nối SSE:', err?.message || err)
        self._handleDisconnect()
        throw err // Dừng loop fetchEventSource mặc định để nhường cho retry có backoff tùy chỉnh
      },
    }).catch(() => {
      // Bắt exception từ onerror
    })
  }

  _handleDisconnect() {
    if (this.isManualClosed || this.abortController?.signal?.aborted) return

    this._setStatus('RECONNECTING')
    this.retryCount += 1

    // Exponential backoff từ 1s đến tối đa 30s kèm jitter ±500ms
    const delay = Math.min(30000, 1000 * Math.pow(1.5, this.retryCount) + Math.random() * 500)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  disconnect() {
    this.isManualClosed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this._setStatus('DISCONNECTED')
  }
}

export const realtimeClient = new RealtimeClient()
