import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@auth/store/authStore.js'
import * as notifApi from '@shared/api/notifications.js'
import { useRealtimeEvent, useRealtimeStatus } from '@shared/realtime/index.js'

export function useNotifications(limit = 20) {
  const { isAuthenticated } = useAuthStore()
  const { isLive } = useRealtimeStatus()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', limit],
    queryFn: () => notifApi.getNotifications(limit),
    enabled: isAuthenticated,
    // Khi Realtime LIVE: nới rộng polling lên 120s làm dự phòng; khi đứt mạng quay về 30s
    refetchInterval: isLive ? 120_000 : 30_000,
  })

  // Lắng nghe sự kiện push notification thời gian thực
  useRealtimeEvent('notification', (payload) => {
    if (payload?.notification) {
      // Cập nhật lạc quan cache query data để chuông và popover phản hồi tức thì (< 1s)
      qc.setQueryData(['notifications', limit], (old) => {
        if (!old) return old
        const currentList = old.notifications || []
        const exists = currentList.some((n) => n.id === payload.notification.id)
        if (exists) return old

        const updatedList = [payload.notification, ...currentList].slice(0, limit)
        return {
          ...old,
          notifications: updatedList,
          unreadCount: typeof payload.unreadCount === 'number' ? payload.unreadCount : (old.unreadCount || 0) + 1,
        }
      })
    }
    // Invalidate để đảm bảo tính nhất quán hoàn toàn với cơ sở dữ liệu
    qc.invalidateQueries({ queryKey: ['notifications'] })
  })

  const markAsRead = useMutation({
    mutationFn: (id) => notifApi.markNotificationAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllAsRead = useMutation({
    mutationFn: () => notifApi.markAllNotificationsAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return {
    ...query,
    notifications: query.data?.notifications || [],
    unreadCount: query.data?.unreadCount || 0,
    markAsRead,
    markAllAsRead,
  }
}
