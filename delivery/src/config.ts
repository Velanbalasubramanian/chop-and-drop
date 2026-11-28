import { Platform } from 'react-native'

const getHost = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname
  }
  return Platform.select({
    android: '192.168.29.143',
    ios: '192.168.29.143',
    default: 'localhost',
  })
}

export const APP_NAME = 'Zippo Rider'
export const APP_TAGLINE = 'Delivery Partner Mobile App'
export const BACKEND_PORT = 4000

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname
    ? `http://${window.location.hostname}:${BACKEND_PORT}`
    : `http://${getHost()}:${BACKEND_PORT}`)

export const THEME = {
  colors: {
    primary: '#f97316',
    primaryDark: '#ea580c',
    primaryLight: '#fff7ed',
    background: '#0f172a',
    card: '#1e293b',
    border: '#334155',
    text: '#ffffff',
    textMuted: '#94a3b8',
    success: '#22c55e',
    successBg: '#052e16',
    danger: '#ef4444',
    warning: '#f59e0b',
  },
}
