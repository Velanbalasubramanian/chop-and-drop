import type {
  AdminOrder,
  AuthResult,
  OrderPayload,
  OrderResponse,
  OrderStatus,
  OtpRequestResult,
  TrackedOrder,
  User,
  VisitsSummary,
} from './types'

// All requests go through /api, which Vite proxies to the Express backend
// in development (see vite.config.ts) and which should be routed to the
// same backend by your reverse proxy / hosting setup in production.

export async function submitOrder(payload: OrderPayload, token?: string | null): Promise<OrderResponse> {
  const res = await fetch('/api/orders', {
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
  const res = await fetch('/api/auth/register', {
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
  const res = await fetch('/api/auth/login', {
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
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Session expired.')
  const data = await res.json()
  return data.user
}

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  const res = await fetch('/api/auth/otp/request', {
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
  const res = await fetch('/api/auth/otp/verify', {
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
  const res = await fetch('/api/orders/mine', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not load your orders.')
  const data = await res.json()
  return data.orders
}

export async function fetchMyTransactions(token: string): Promise<any[]> {
  const res = await fetch('/api/orders/transactions', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Could not load transaction history.')
  const data = await res.json()
  return data.transactions
}

export async function trackOrder(orderId: string, phone: string): Promise<TrackedOrder> {
  const params = new URLSearchParams({ orderId, phone })
  const res = await fetch(`/api/orders/track?${params.toString()}`)

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
  const res = await fetch(`/api/orders/${orderId}/refund`, {
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
  const res = await fetch('/api/admin/login', {
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
  const res = await fetch('/api/admin/orders', {
    headers: getAdminAuthHeaders(token),
  })
  if (!res.ok) throw new Error('Could not load orders. Admin session expired or invalid.')
  return res.json()
}

export async function updateOrderStatus(token: string, orderId: string, status: OrderStatus) {
  const res = await fetch(`/api/admin/orders/${orderId}`, {
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
  const res = await fetch('/api/visits/summary', {
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
  const res = await fetch('/api/support', {
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
  const res = await fetch('/api/admin/tickets', {
    headers: getAdminAuthHeaders(token),
  })
  if (!res.ok) throw new Error('Could not load support tickets.')
  return res.json()
}

export async function updateTicketStatus(token: string, ticketId: string, status: string): Promise<any> {
  const res = await fetch(`/api/admin/tickets/${ticketId}`, {
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
  const res = await fetch('/api/admin/users', {
    headers: getAdminAuthHeaders(token),
  })
  if (!res.ok) throw new Error('Could not load registered users.')
  return res.json()
}

