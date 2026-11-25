import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from '../types'
import { fetchMe, login as apiLogin, register as apiRegister } from '../api'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (name: string, phone: string, password: string, email?: string) => Promise<void>
  setSession: (result: { token: string; user: User }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = '@zippo_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadToken() {
      try {
        const savedToken = await AsyncStorage.getItem(STORAGE_KEY)
        if (!savedToken) {
          setLoading(false)
          return
        }
        setToken(savedToken)
        const me = await fetchMe(savedToken)
        setUser(me)
      } catch (err) {
        await AsyncStorage.removeItem(STORAGE_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    loadToken()
  }, [])

  async function login(phone: string, password: string) {
    const result = await apiLogin(phone, password)
    await AsyncStorage.setItem(STORAGE_KEY, result.token)
    setToken(result.token)
    setUser(result.user)
  }

  async function register(name: string, phone: string, password: string, email?: string) {
    const result = await apiRegister(name, phone, password, email)
    await AsyncStorage.setItem(STORAGE_KEY, result.token)
    setToken(result.token)
    setUser(result.user)
  }

  async function setSession(result: { token: string; user: User }) {
    await AsyncStorage.setItem(STORAGE_KEY, result.token)
    setToken(result.token)
    setUser(result.user)
  }

  async function logout() {
    await AsyncStorage.removeItem(STORAGE_KEY)
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
