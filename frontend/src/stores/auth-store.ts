import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  brandId: string
}

interface AuthState {
  token: string | null
  user: User | null
  brandId: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const storedToken = localStorage.getItem('brandos_token')
const storedUser = (() => {
  try {
    const raw = localStorage.getItem('brandos_user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
})()

export const useAuthStore = create<AuthState>()((set) => ({
  token: storedToken,
  user: storedUser,
  brandId: storedUser?.brandId ?? null,
  isAuthenticated: !!storedToken && !!storedUser,

  login: (token, user) => {
    localStorage.setItem('brandos_token', token)
    localStorage.setItem('brandos_user', JSON.stringify(user))
    set({ token, user, brandId: user.brandId, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('brandos_token')
    localStorage.removeItem('brandos_user')
    set({ token: null, user: null, brandId: null, isAuthenticated: false })
  },
}))
