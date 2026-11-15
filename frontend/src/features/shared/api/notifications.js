import apiClient from '@shared/api/client.js'

export const getNotifications = (limit = 20) =>
  apiClient.get('/me/notifications', { params: { limit } }).then((r) => r.data)

export const markNotificationAsRead = (id) =>
  apiClient.patch(`/me/notifications/${id}/read`).then((r) => r.data)

export const markAllNotificationsAsRead = () =>
  apiClient.patch('/me/notifications/read-all').then((r) => r.data)
