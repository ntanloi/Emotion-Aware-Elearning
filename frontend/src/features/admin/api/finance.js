import client from '@shared/api/client.js'

export const getAdminFinanceSummary = async () => {
  const { data } = await client.get('/admin/finance/summary')
  return data
}

export const getAdminOrders = async ({ status, q, page = 0, size = 15 } = {}) => {
  const { data } = await client.get('/admin/finance/orders', { params: { status, q, page, size } })
  return data
}

export const getAdminTransactions = async ({ status, page = 0, size = 15 } = {}) => {
  const { data } = await client.get('/admin/finance/transactions', { params: { status, page, size } })
  return data
}

export const manualMatchTransaction = async (txId, { orderCode, adminNote }) => {
  const { data } = await client.post(`/admin/finance/transactions/${txId}/manual-match`, { orderCode, adminNote })
  return data
}

export const getAdminPayouts = async ({ status, page = 0, size = 15 } = {}) => {
  const { data } = await client.get('/admin/finance/payouts', { params: { status, page, size } })
  return data
}

export const approvePayout = async (payoutId, { transactionRef, adminNote }) => {
  const { data } = await client.post(`/admin/finance/payouts/${payoutId}/approve`, { transactionRef, adminNote })
  return data
}

export const rejectPayout = async (payoutId, { reason }) => {
  const { data } = await client.post(`/admin/finance/payouts/${payoutId}/reject`, { reason })
  return data
}

// Student Wallet, Withdrawals & Escrow Admin APIs
export const getAdminWithdrawals = async ({ status = 'PENDING', page = 0, size = 15 } = {}) => {
  const { data } = await client.get('/admin/wallet/withdrawals', { params: { status, page, size } })
  return data
}

export const payAdminWithdrawal = async (id, { transactionRef }) => {
  const { data } = await client.post(`/admin/wallet/withdrawals/${id}/pay`, { transactionRef })
  return data
}

export const rejectAdminWithdrawal = async (id, { note }) => {
  const { data } = await client.post(`/admin/wallet/withdrawals/${id}/reject`, { note })
  return data
}

export const manualTopupWallet = async ({ transactionId, userId, note }) => {
  const { data } = await client.post('/admin/wallet/topup-manual', { transactionId, userId, note })
  return data
}

export const adjustWalletBalance = async ({ userId, bucket, amount, note }) => {
  const { data } = await client.post('/admin/wallet/adjust', { userId, bucket, amount, note })
  return data
}

export const getAdminEscrows = async ({ status, page = 0, size = 15 } = {}) => {
  const { data } = await client.get('/admin/wallet/escrows', { params: { status, page, size } })
  return data
}

export const getAdminRewardConfig = async () => {
  const { data } = await client.get('/admin/wallet/reward-config')
  return data
}

export const getAdminReconcileReport = async () => {
  const { data } = await client.get('/admin/wallet/reconcile')
  return data
}

export const runAdminReconcile = async () => {
  const { data } = await client.post('/admin/wallet/reconcile')
  return data
}
