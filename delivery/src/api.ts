import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { API_BASE_URL, BACKEND_PORT } from './config'
import type { DeliveryOrder, DeliveryStats, Rider, RiderAuthResult } from './types'

const SERVER_URL_KEY = '@zippo_rider_server_url'

export async function getServerUrl(): Promise<string> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:${BACKEND_PORT}`
  }
  try {
    const custom = await AsyncStorage.getItem(SERVER_URL_KEY)
    if (custom && custom.trim().length > 0) return custom.trim()
  } catch {}
  return API_BASE_URL
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, url.trim())
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const baseUrl = await getServerUrl()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const errorMsg = data.error || `Server returned ${res.status}: ${res.statusText}`
      throw new Error(errorMsg)
    }

    return data as T
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. Check if backend server is running.')
    }
    throw err
  }
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const data = await apiRequest<{ ok: boolean }>('/api/health')
    return !!data?.ok
  } catch {
    return false
  }
}

export async function fetchDemoRiders(): Promise<Rider[]> {
  try {
    const data = await apiRequest<{ ok: boolean; riders: Rider[] }>('/api/delivery/riders')
    return data.riders || []
  } catch (error) {
    console.log('Error fetching demo riders, using defaults:', error)
    return [
      { id: 'RDR-001', name: 'Saravanan', phone: '9840123456', vehicle: 'Honda Activa (TN 01 AB 1234)', zone: 'Anna Nagar, Chennai', status: 'online', rating: 4.9 },
      { id: 'RDR-002', name: 'Karthik', phone: '9750123456', vehicle: 'Hero Splendor (TN 02 CD 5678)', zone: 'T. Nagar, Chennai', status: 'online', rating: 4.8 },
      { id: 'RDR-003', name: 'Murugan', phone: '9940123456', vehicle: 'TVS Jupiter (TN 07 EF 9012)', zone: 'Velachery, Chennai', status: 'online', rating: 4.9 },
    ]
  }
}

export async function deliveryLogin(phone: string, password: string): Promise<RiderAuthResult> {
  return apiRequest<RiderAuthResult>('/api/delivery/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  })
}

export async function deliveryRegister(
  name: string,
  phone: string,
  password: string,
  vehicle?: string,
  zone?: string
): Promise<RiderAuthResult> {
  return apiRequest<RiderAuthResult>('/api/delivery/register', {
    method: 'POST',
    body: JSON.stringify({ name, phone, password, vehicle, zone }),
  })
}

export async function fetchDeliveryMe(token: string): Promise<Rider> {
  const data = await apiRequest<{ ok: boolean; rider: Rider }>('/api/delivery/me', {}, token)
  return data.rider
}

export async function updateDutyStatus(
  token: string,
  status: 'online' | 'offline'
): Promise<{ ok: boolean; status: 'online' | 'offline'; rider: Rider }> {
  return apiRequest<{ ok: boolean; status: 'online' | 'offline'; rider: Rider }>(
    '/api/delivery/duty',
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    token
  )
}

export async function fetchDeliveryOrders(token: string): Promise<{
  available: DeliveryOrder[]
  myActive: DeliveryOrder[]
  completed: DeliveryOrder[]
}> {
  return apiRequest<{
    ok: boolean
    available: DeliveryOrder[]
    myActive: DeliveryOrder[]
    completed: DeliveryOrder[]
  }>('/api/delivery/orders', {}, token)
}

export async function acceptDeliveryOrder(
  token: string,
  orderId: string
): Promise<{ ok: boolean; message: string; order: DeliveryOrder }> {
  return apiRequest<{ ok: boolean; message: string; order: DeliveryOrder }>(
    `/api/delivery/orders/${orderId}/accept`,
    {
      method: 'PATCH',
    },
    token
  )
}

export async function pickupDeliveryOrder(
  token: string,
  orderId: string
): Promise<{ ok: boolean; message: string; order: DeliveryOrder }> {
  return apiRequest<{ ok: boolean; message: string; order: DeliveryOrder }>(
    `/api/delivery/orders/${orderId}/pickup`,
    {
      method: 'PATCH',
    },
    token
  )
}

export async function completeDeliveryOrder(
  token: string,
  orderId: string
): Promise<{ ok: boolean; message: string; order: DeliveryOrder }> {
  return apiRequest<{ ok: boolean; message: string; order: DeliveryOrder }>(
    `/api/delivery/orders/${orderId}/deliver`,
    {
      method: 'PATCH',
    },
    token
  )
}

export async function fetchDeliveryStats(token: string): Promise<DeliveryStats> {
  const data = await apiRequest<{ ok: boolean; stats: DeliveryStats }>('/api/delivery/stats', {}, token)
  return data.stats
}
