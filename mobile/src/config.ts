import { Platform } from 'react-native'

const getHost = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname
  }
  return Platform.select({
    android: '192.168.29.143', // Works for both physical phone on Wi-Fi and emulator
    ios: '192.168.29.143',
    default: 'localhost',
  })
}

export const APP_NAME = 'Zippo'
export const APP_TAGLINE = 'Your Everyday Delivery Hub'
export const BACKEND_PORT = 4000

// Production backend cloud URL (Change this to your deployed Render/Railway domain)
export const PROD_API_URL = 'https://zippo-api.onrender.com'

// Automatically selects LAN IP in local Expo development, or cloud URL in production APK / app builds.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname
    ? `http://${window.location.hostname}:${BACKEND_PORT}`
    : __DEV__
    ? `http://${getHost()}:${BACKEND_PORT}`
    : PROD_API_URL)

export const THEME = {
  colors: {
    primary: '#d85d2a',
    primaryDark: '#b34618',
    primaryLight: '#fef3ec',
    vegGreen: '#16a34a',
    vegGreenBg: '#f0fdf4',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    cardBorder: '#f1f5f9',
    accent: '#ea580c',
    danger: '#ef4444',
    badge: '#ffedd5',
    badgeText: '#9a3412',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 18,
    full: 9999,
  },
}
