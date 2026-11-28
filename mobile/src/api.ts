import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { API_BASE_URL, BACKEND_PORT } from './config'
import { fallbackProducts } from './data/products'
import type {
  AuthResult,
  DeliveryOrder,
  DeliveryStats,
  OrderPayload,
  OrderResponse,
  OtpRequestResult,
  Partner,
  PartnerAuthResult,
  PartnerOrder,
  PartnerProduct,
  PartnerStats,
  Product,
  Rider,
  RiderAuthResult,
  Store,
  SupportTicket,
  TrackedOrder,
  User,
} from './types'

const SERVER_URL_KEY = '@zippo_server_url'

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

export async function cancelOrder(
  orderId: string,
  phone: string,
  reason: string,
  token?: string | null
): Promise<{ ok: boolean; message: string; order: TrackedOrder }> {
  try {
    return await apiRequest<{ ok: boolean; message: string; order: TrackedOrder }>(
      `/api/orders/${encodeURIComponent(orderId)}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ phone, reason }),
      },
      token
    )
  } catch (err: any) {
    if (err.message && err.message.includes('404')) {
      throw new Error('Please restart the backend server (Ctrl+C and npm run dev) to activate the cancellation endpoint.')
    }
    throw err
  }
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

// ---------------- DELIVERY PARTNER / RIDER APIS ----------------
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

// ---------------- STORE MERCHANT / PARTNER APIS ----------------
export async function fetchActivePartners(): Promise<Partner[]> {
  try {
    const data = await apiRequest<{ ok: boolean; partners: Partner[] }>('/api/partners/active')
    return data.partners || []
  } catch (error) {
    console.log('Error fetching active partners:', error)
    return []
  }
}

export async function partnerLogin(phone: string, password: string): Promise<PartnerAuthResult> {
  return apiRequest<PartnerAuthResult>('/api/partners/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  })
}

export async function fetchPartnerMe(token: string): Promise<Partner> {
  const data = await apiRequest<{ partner: Partner }>('/api/partners/me', {}, token)
  return data.partner
}

export async function fetchPartnerOrders(token: string): Promise<{
  orders: PartnerOrder[]
  partnerCategory: string
}> {
  return apiRequest<{
    orders: PartnerOrder[]
    partnerCategory: string
  }>('/api/partners/orders', {}, token)
}

export async function updatePartnerOrderStatus(
  token: string,
  orderId: string,
  status: string,
  reason?: string
): Promise<{ ok: boolean; order: PartnerOrder; message: string }> {
  return apiRequest<{ ok: boolean; order: PartnerOrder; message: string }>(
    `/api/partners/orders/${orderId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    },
    token
  )
}

export async function fetchPartnerProducts(token: string): Promise<PartnerProduct[]> {
  const data = await apiRequest<{ ok: boolean; products: PartnerProduct[] }>(
    '/api/partners/products',
    {},
    token
  )
  return data.products || []
}

export async function createPartnerProduct(
  token: string,
  product: {
    name: string
    tamilName?: string
    category: string
    unit: string
    price: number
    stockQuantity: number
    description?: string
  }
): Promise<{ ok: boolean; product: PartnerProduct }> {
  return apiRequest<{ ok: boolean; product: PartnerProduct }>(
    '/api/partners/products',
    {
      method: 'POST',
      body: JSON.stringify(product),
    },
    token
  )
}

export async function updatePartnerProduct(
  token: string,
  productId: string,
  updates: Partial<PartnerProduct>
): Promise<{ ok: boolean; product: PartnerProduct }> {
  return apiRequest<{ ok: boolean; product: PartnerProduct }>(
    `/api/partners/products/${productId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    },
    token
  )
}

export async function deletePartnerProduct(
  token: string,
  productId: string
): Promise<{ ok: boolean; message: string }> {
  return apiRequest<{ ok: boolean; message: string }>(
    `/api/partners/products/${productId}`,
    {
      method: 'DELETE',
    },
    token
  )
}

export async function fetchPartnerStats(token: string): Promise<PartnerStats> {
  return apiRequest<PartnerStats>('/api/partners/stats', {}, token)
}
