import { create } from 'zustand'
import * as authApi from '@auth/api/auth.js'

/**
 * useAuthStore — Quản lý trạng thái xác thực và người dùng đăng nhập.
 * Giữ nguyên hợp đồng lưu trữ (localStorage keys) để tương thích toàn hệ thống.
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

  refreshProfile: async () => {
    try {
      const p = await authApi.getProfile()
      const current = get().user || {}
      const updated = { ...current, id: p.id, fullName: p.fullName, role: p.role, status: p.status }
      localStorage.setItem('user', JSON.stringify(updated))
      set({ user: updated })
      return updated
    } catch {
      // Bỏ qua nếu phiên đăng nhập không khả dụng
    }
  },
}))

function persist(data, set) {
  localStorage.setItem('accessToken', data.accessToken)
  const u = { id: data.userId, fullName: data.fullName, role: data.role, status: data.status }
  localStorage.setItem('user', JSON.stringify(u))
  set({ user: u, isAuthenticated: true })
}
