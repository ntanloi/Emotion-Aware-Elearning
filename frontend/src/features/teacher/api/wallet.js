import client from '@shared/api/client.js'

export const getWalletSummary = async () => {
  const { data } = await client.get('/teacher/wallet/summary')
  return data
}

export const getWalletEntries = async ({ page = 0, size = 15 } = {}) => {
  const { data } = await client.get('/teacher/wallet/entries', { params: { page, size } })
  return data
}

export const getMyPayoutRequests = async () => {
  const { data } = await client.get('/teacher/wallet/payout-requests')
  return data
}

export const requestPayout = async (amount) => {
  const { data } = await client.post('/teacher/wallet/payout-requests', { amount })
  return data
}

export const getEscrows = async ({ page = 0, size = 20 } = {}) => {
  const { data } = await client.get('/teacher/wallet/escrows', { params: { page, size } })
  return data
}
