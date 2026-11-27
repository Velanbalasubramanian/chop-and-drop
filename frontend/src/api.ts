import type {
  AdminOrder,
  AuthResult,
  OrderPayload,
  OrderResponse,
  OrderStatus,
  OtpRequestResult,
  Partner,
  PartnerAuthResult,
  PartnerStats,
  Product,
  Store,
  TrackedOrder,
  User,
  VisitsSummary,
} from './types'

// All requests go through /api, which Vite proxies to the Express backend
// in development (see vite.config.ts). In production, set VITE_API_URL in
// Vercel / Netlify environment variables (e.g. https://your-backend.onrender.com).
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

export async function submitOrder(payload: OrderPayload, token?: string | null): Promise<OrderResponse> {
  const res = await fetch(apiUrl('/api/orders'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Could not place the order. Please try again.')
  }

  return res.json()
}

export async function register(name: string, phone: string, password: string, email?: string): Promise<AuthResult> {
  const res = await fetch(apiUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, password, email }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Could not create your account.')
  }
  return res.json()
}

export async function login(phone: string, password: string): Promise<AuthResult> {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Could not log in.')
  }
  return res.json()
}

export async function fetchMe(token: string): Promise<User> {
  const res = await fetch(apiUrl('/api/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Session expired.')
  const data = await res.json()
  return data.user
}

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  const res = await fetch(apiUrl('/api/auth/otp/request'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Could not send a code. Please try again.')
  }
  return res.json()
}

export async function verifyOtp(phone: string, code: string, name?: string): Promise<AuthResult> {
  const res = await fetch(apiUrl('/api/auth/otp/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code, name }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || 'Could not verify that code.') as Error & { needsName?: boolean }
    err.needsName = body.needsName
    throw err
  }
  return res.json()
}

export async function fetchMyOrders(token: string): Promise<AdminOrder[]> {
  const res = await fetch(apiUrl('/api/orders/mine'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not load your orders.')
  const data = await res.json()
  return data.orders
}

export async function fetchMyTransactions(token: string): Promise<any[]> {
  const res = await fetch(apiUrl('/api/orders/transactions'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not load transaction history.')
  const data = await res.json()
  return data.transactions
}

export async function trackOrder(orderId: string, phone: string): Promise<TrackedOrder> {
  const params = new URLSearchParams({ orderId, phone })
  const res = await fetch(apiUrl(`/api/orders/track?${params.toString()}`))

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Could not find that order.')
  }

  return res.json()
}

export async function requestOrderRefund(
  orderId: string,
  phone: string,
  reason: string,
  amount?: number,
  upi?: string,
  token?: string | null
): Promise<{ ok: boolean; message: string; order: any }> {
  const res = await fetch(apiUrl(`/api/orders/${orderId}/refund`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ phone, reason, amount, upi }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit refund request.')
  }
  return data
}

export async function adminLogin(password: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  const res = await fetch(apiUrl('/api/admin/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.error || 'Incorrect admin password.' }
  }
  return { ok: true, token: data.token }
}

function getAdminAuthHeaders(tokenOrPassword: string): Record<string, string> {
  // If it's a JWT token (e.g. starts with eyJ or has 3 dots), send Bearer header
  if (tokenOrPassword.includes('.') || tokenOrPassword.length > 30) {
    return { Authorization: `Bearer ${tokenOrPassword}` }
  }
  // Otherwise send both for backward compatibility
  return {
    Authorization: `Bearer ${tokenOrPassword}`,
    'x-admin-password': tokenOrPassword,
  }
}

export async function fetchAdminOrders(token: string): Promise<{ orders: AdminOrder[]; statuses: OrderStatus[] }> {
  const res = await fetch(apiUrl('/api/admin/orders'), {
    headers: getAdminAuthHeaders(token),
  })
  if (!res.ok) throw new Error('Could not load orders. Admin session expired or invalid.')
  return res.json()
}

export async function updateOrderStatus(token: string, orderId: string, status: OrderStatus) {
  const res = await fetch(apiUrl(`/api/admin/orders/${orderId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(token),
    },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Could not update that order.')
  return res.json()
}

export async function fetchVisitsSummary(token: string): Promise<VisitsSummary> {
  const res = await fetch(apiUrl('/api/visits/summary'), {
    headers: getAdminAuthHeaders(token),
  })
  if (!res.ok) throw new Error('Could not load site visits.')
  return res.json()
}

export async function submitSupportTicket(ticket: {
  name: string
  phone: string
  email?: string
  orderId?: string
  issueType: string
  message: string
}): Promise<{ ok: boolean; ticketId: string; message: string }> {
  const res = await fetch(apiUrl('/api/support'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticket),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Could not submit support ticket.')
  }
  return res.json()
}

export async function fetchSupportTickets(token: string): Promise<{ tickets: any[] }> {
  const res = await fetch(apiUrl('/api/admin/tickets'), {
    headers: getAdminAuthHeaders(token),
  })
  if (!res.ok) throw new Error('Could not load support tickets.')
  return res.json()
}

export async function updateTicketStatus(token: string, ticketId: string, status: string): Promise<any> {
  const res = await fetch(apiUrl(`/api/admin/tickets/${ticketId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(token),
    },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Could not update ticket status.')
  return res.json()
}

export async function fetchAdminUsers(token: string): Promise<{ users: User[] }> {
  const res = await fetch(apiUrl('/api/admin/users'), {
    headers: getAdminAuthHeaders(token),
  })
  if (!res.ok) throw new Error('Could not load registered users.')
  return res.json()
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(apiUrl('/api/products'))
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch {}
  const { products } = await import('./data/products')
  return products
}

export async function fetchStores(): Promise<Store[]> {
  try {
    const res = await fetch(apiUrl('/api/stores'))
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.stores)) return data.stores
    }
  } catch (err) {
    console.error('Failed to fetch stores:', err)
  }
  return []
}

export async function fetchStoreById(storeId: string): Promise<{ ok: boolean; store: Store & { products: Product[] } }> {
  const res = await fetch(apiUrl(`/api/stores/${encodeURIComponent(storeId)}`))
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load store.')
  }
  return data
}

// ==========================================
// PARTNER PORTAL & MANAGEMENT APIS
// ==========================================

export async function partnerLogin(phone: string, password: string): Promise<PartnerAuthResult> {
  const res = await fetch(apiUrl('/api/partners/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Partner login failed.')
  }
  return data
}

export async function fetchPartnerMe(token: string): Promise<{ partner: Partner }> {
  const res = await fetch(apiUrl('/api/partners/me'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Partner session expired.')
  return res.json()
}

export async function fetchPartnerOrders(token: string): Promise<{ orders: AdminOrder[]; partnerCategory: string }> {
  const res = await fetch(apiUrl('/api/partners/orders'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not load partner orders.')
  return res.json()
}

export async function updatePartnerOrderStatus(token: string, orderId: string, status: string): Promise<any> {
  const res = await fetch(apiUrl(`/api/partners/orders/${orderId}/status`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not update order status.')
  return data
}

export async function fetchPartnerStats(token: string): Promise<PartnerStats> {
  const res = await fetch(apiUrl('/api/partners/stats'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not load partner metrics.')
  return res.json()
}

// Admin Partner Management
export async function fetchAdminPartners(token: string): Promise<{ partners: Partner[] }> {
  const res = await fetch(apiUrl('/api/admin/partners'), {
    headers: getAdminAuthHeaders(token),
  })
  if (!res.ok) throw new Error('Could not load partners.')
  return res.json()
}

export async function createAdminPartner(
  token: string,
  partnerData: {
    name: string
    phone: string
    password: string
    category: string
    storeName?: string
    address?: string
    email?: string
  }
): Promise<{ ok: boolean; partner: Partner; message: string }> {
  const res = await fetch(apiUrl('/api/admin/partners'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(token),
    },
    body: JSON.stringify(partnerData),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not create partner.')
  return data
}

export async function updateAdminPartner(
  token: string,
  partnerId: string,
  updates: Partial<Partner> & { password?: string }
): Promise<{ ok: boolean; partner: Partner }> {
  const res = await fetch(apiUrl(`/api/admin/partners/${partnerId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(token),
    },
    body: JSON.stringify(updates),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not update partner.')
  return data
}

export async function deleteAdminPartner(token: string, partnerId: string): Promise<{ ok: boolean }> {
  const res = await fetch(apiUrl(`/api/admin/partners/${partnerId}`), {
    method: 'DELETE',
    headers: getAdminAuthHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not delete partner.')
  return data
}

