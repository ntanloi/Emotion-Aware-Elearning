import { createContext, useContext, useState, useCallback } from 'react'
import * as authApi from '../api/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })

  const persist = (data) => {
    localStorage.setItem('accessToken', data.accessToken)
    const u = { id: data.userId, fullName: data.fullName, role: data.role }
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password })
    persist(data)
  }, [])

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload)
    persist(data)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
