import apiClient from '@shared/api/client.js'

export const fetchLiveSnapshot = async () => {
  const res = await apiClient.get('/teacher/live/snapshot')
  return res.data
}

export const seedDemoViewers = async (count = 5) => {
  const res = await apiClient.post(`/teacher/live/demo-viewers?count=${count}`)
  return res.data
}
