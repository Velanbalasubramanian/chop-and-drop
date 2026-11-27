import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from './config'
import { fallbackProducts } from './data/products'
import type {
  AuthResult,
  OrderPayload,
  OrderResponse,
  OtpRequestResult,
  Product,
  Store,
  SupportTicket,
  TrackedOrder,
  User,
} from './types'

const SERVER_URL_KEY = '@zippo_server_url'

export async function getServerUrl(): Promise<string> {
  try {
    const custom = await AsyncStorage.getItem(SERVER_URL_KEY)
    if (custom && custom.trim().length > 0) return custom.trim()
  } catch {}
  return API_BASE_URL
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, url.trim())
}

// Helper to make fetch requests with timeout and proper error reporting
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
    ...(options.headers as Record<string, string> || {}),
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
      const err = new Error(errorMsg) as Error & { needsName?: boolean; alreadyRegistered?: boolean }
      if (data.needsName) err.needsName = true
      if (data.alreadyRegistered || data.alreadyExists || res.status === 409) err.alreadyRegistered = true
      throw err
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

// ---------------- PRODUCTS ----------------
export async function getProducts(): Promise<Product[]> {
  try {
    const data = await apiRequest<Product[]>('/api/products')
    if (Array.isArray(data) && data.length > 0) {
      return data
    }
    return fallbackProducts
  } catch (error) {
    console.log('Using fallback local catalog:', error)
    return fallbackProducts
  }
}

export async function getStores(): Promise<Store[]> {
  try {
    const data = await apiRequest<{ ok: boolean; stores: Store[] }>('/api/stores')
    if (data && Array.isArray(data.stores)) {
      return data.stores
    }
    return []
  } catch (error) {
    console.log('Failed to fetch stores:', error)
    return []
  }
}

export async function getStoreById(storeId: string): Promise<{ ok: boolean; store: Store & { products: Product[] } }> {
  return await apiRequest<{ ok: boolean; store: Store & { products: Product[] } }>(`/api/stores/${encodeURIComponent(storeId)}`)
}

// ---------------- ORDERS ----------------
export async function submitOrder(payload: OrderPayload, token?: string | null): Promise<OrderResponse> {
  return apiRequest<OrderResponse>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
}

export async function trackOrder(orderId: string, phone: string): Promise<TrackedOrder> {
  const params = new URLSearchParams({
    orderId: orderId.trim(),
    phone: phone.trim(),
  })
  return apiRequest<TrackedOrder>(`/api/orders/track?${params.toString()}`)
}

export async function fetchMyOrders(token: string): Promise<any[]> {
  const data = await apiRequest<{ ok: boolean; orders: any[] }>('/api/orders/mine', {}, token)
  return data.orders || []
}

export async function requestOrderRefund(
  orderId: string,
  token: string,
  reason: string,
  phone?: string,
  upiId?: string
): Promise<any> {
  return apiRequest(`/api/orders/${encodeURIComponent(orderId)}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason, phone, upi: upiId }),
  }, token)
}

// ---------------- AUTH ----------------
export async function register(
  name: string,
  phone: string,
  password: string,
  email?: string
): Promise<AuthResult> {
  return apiRequest<AuthResult>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, phone, password, email }),
  })
}

export async function login(phone: string, password: string): Promise<AuthResult> {
  return apiRequest<AuthResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  })
}

export async function fetchMe(token: string): Promise<User> {
  const data = await apiRequest<{ ok: boolean; user: User }>('/api/auth/me', {}, token)
  return data.user
}

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  return apiRequest<OtpRequestResult>('/api/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  })
}

export async function verifyOtp(phone: string, code: string, name?: string): Promise<AuthResult> {
  return apiRequest<AuthResult>('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code, name }),
  })
}

// ---------------- SUPPORT ----------------
export async function submitSupportTicket(ticket: {
  name: string
  phone: string
  email?: string
  orderId?: string
  issueType: string
  message: string
}): Promise<{ ok: boolean; ticketId: string }> {
  return apiRequest<{ ok: boolean; ticketId: string }>('/api/support', {
    method: 'POST',
    body: JSON.stringify(ticket),
  })
}

// ---------------- HEALTH CHECK ----------------
export async function checkServerHealth(): Promise<boolean> {
  try {
    const data = await apiRequest<{ ok: boolean }>('/api/health')
    return !!data?.ok
  } catch {
    return false
  }
}
