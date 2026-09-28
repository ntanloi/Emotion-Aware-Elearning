import { create } from 'zustand'
import * as authApi from '@auth/api/auth.js'

/**
 * useAuthStore — thay cho AuthContext cũ (theo đúng lộ trình Giai đoạn 6 mục 2.3).
 * Giữ nguyên hợp đồng lưu trữ (localStorage keys) để không phải migrate dữ liệu cũ.
 */
const readUser = () => {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}

export const useAuthStore = create((set, get) => ({
  user: readUser(),
  isAuthenticated: !!readUser(),

  login: async (email, password) => {
    const data = await authApi.login({ email, password })
    persist(data, set)
  },

  register: async (payload) => {
    const data = await authApi.register(payload)
    persist(data, set)
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    set({ user: null, isAuthenticated: false })
  },
}))

function persist(data, set) {
  localStorage.setItem('accessToken', data.accessToken)
  const u = { id: data.userId, fullName: data.fullName, role: data.role }
  localStorage.setItem('user', JSON.stringify(u))
  set({ user: u, isAuthenticated: true })
}
