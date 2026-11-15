import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuthStore } from '@auth/store/authStore.js'
import { realtimeClient } from './realtimeClient.js'

export const RealtimeContext = createContext({
  status: 'DISCONNECTED',
  isLive: false,
  client: realtimeClient,
})

export function RealtimeProvider({ children }) {
  const { isAuthenticated } = useAuthStore()
  const [status, setStatus] = useState(realtimeClient.getStatus())

  useEffect(() => {
    const unsub = realtimeClient.onStatusChange((newStatus) => {
      setStatus(newStatus)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      realtimeClient.connect()
    } else {
      realtimeClient.disconnect()
    }

    return () => {
      // Khi Provider unmount (vd đăng xuất)
      realtimeClient.disconnect()
    }
  }, [isAuthenticated])

  const value = {
    status,
    isLive: status === 'LIVE',
    client: realtimeClient,
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeStatus() {
  const ctx = useContext(RealtimeContext)
  return {
    status: ctx?.status || 'DISCONNECTED',
    isLive: !!ctx?.isLive,
  }
}
