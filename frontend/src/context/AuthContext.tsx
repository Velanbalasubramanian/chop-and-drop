import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import type { User } from '../types'
import { fetchMe, login as apiLogin, register as apiRegister } from '../api'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (name: string, phone: string, password: string, email?: string) => Promise<void>
  setSession: (result: { token: string; user: User }) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 'chopanddrop_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const [loading, setLoading] = useState(true)

  // On first load, if a token was saved from a previous visit, verify it
  // and restore the session — so the customer doesn't have to log in every time.
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    fetchMe(token)
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  async function login(phone: string, password: string) {
    const result = await apiLogin(phone, password)
    localStorage.setItem(STORAGE_KEY, result.token)
    setToken(result.token)
    setUser(result.user)
  }

  async function register(name: string, phone: string, password: string, email?: string) {
    const result = await apiRegister(name, phone, password, email)
    localStorage.setItem(STORAGE_KEY, result.token)
    setToken(result.token)
    setUser(result.user)
  }

  function setSession(result: { token: string; user: User }) {
    localStorage.setItem(STORAGE_KEY, result.token)
    setToken(result.token)
    setUser(result.user)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider')
  return ctx
}
