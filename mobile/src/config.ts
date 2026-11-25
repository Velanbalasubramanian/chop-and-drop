import { Platform } from 'react-native'

// Default LAN IP for physical device testing on local network (192.168.29.143)
// For Android emulator, 10.0.2.2 points to host machine
export const DEFAULT_HOST = Platform.select({
  android: '192.168.29.143', // Works for both physical phone on Wi-Fi and emulator
  ios: '192.168.29.143',
  default: 'localhost',
})

export const BACKEND_PORT = 4000
export const API_BASE_URL = `http://${DEFAULT_HOST}:${BACKEND_PORT}`

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
