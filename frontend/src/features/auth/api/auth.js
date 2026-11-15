import apiClient from '@shared/api/client.js'

export const sendRegisterOtp = (payload) => apiClient.post('/auth/register/send-otp', payload).then(r => r.data)
export const register = (payload) => apiClient.post('/auth/register', payload).then(r => r.data)
export const login = (payload) => apiClient.post('/auth/login', payload).then(r => r.data)
export const forgotPassword = (payload) => apiClient.post('/auth/forgot-password', payload).then(r => r.data)
export const resetPassword = (payload) => apiClient.post('/auth/reset-password', payload).then(r => r.data)
export const getProfile = () => apiClient.get('/auth/profile').then(r => r.data)
export const updateProfile = (payload) => apiClient.put('/auth/profile', payload).then(r => r.data)
