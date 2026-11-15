import client from '@shared/api/client.js'

export const createOrder = async (courseId) => {
  const { data } = await client.post('/orders', { courseId })
  return data
}

export const getOrder = async (orderId) => {
  const { data } = await client.get(`/orders/${orderId}`)
  return data
}

export const getMyOrders = async () => {
  const { data } = await client.get('/orders/mine')
  return data
}

export const cancelOrder = async (orderId) => {
  const { data } = await client.post(`/orders/${orderId}/cancel`)
  return data
}
