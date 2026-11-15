import apiClient from '@shared/api/client.js'

export const getWallet = (amount) =>
  apiClient.get('/me/wallet', { params: amount ? { amount } : {} }).then((r) => r.data)

export const getWalletEntries = (page = 0, size = 20) =>
  apiClient.get('/me/wallet/entries', { params: { page, size } }).then((r) => r.data)

export const purchaseWithWallet = (courseId, acceptRewardTerms) =>
  apiClient.post('/orders/wallet-purchase', { courseId, acceptRewardTerms }).then((r) => r.data)

export const getMyRewards = (courseId) =>
  apiClient.get('/me/rewards', { params: courseId ? { courseId } : {} }).then((r) => r.data)

export const requestWithdrawal = (payload) =>
  apiClient.post('/me/wallet/withdrawals', payload).then((r) => r.data)

export const getWithdrawals = () =>
  apiClient.get('/me/wallet/withdrawals').then((r) => r.data)
