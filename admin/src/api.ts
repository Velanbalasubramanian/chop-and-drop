import type { AdminOrder, OrderStatus, SupportTicket, User, VisitsSummary } from './types'

function getAdminAuthHeaders(tokenOrPassword: string): Record<string, string> {
  if (tokenOrPassword.includes('.') || tokenOrPassword.length > 30) {
    return { Authorization: `Bearer ${tokenOrPassword}` }
  }
  return {
    Authorization: `Bearer ${tokenOrPassword}`,
    'x-admin-password': tokenOrPassword,
  }
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

export async function fetchAdminRefunds(token: string): Promise<{ refunds: AdminOrder[] }> {
  const res = await fetch('/api/admin/refunds', {
    headers: getAdminAuthHeaders(token),
  })
  if (!res.ok) throw new Error('Could not load refund requests.')
  return res.json()
}

export async function approveOrderRefund(token: string, orderId: string): Promise<{ ok: boolean; message: string; order: AdminOrder }> {
  const res = await fetch(`/api/admin/orders/${orderId}/refund-approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(token),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Could not approve refund.')
  }
  return data
}

export async function rejectOrderRefund(token: string, orderId: string, rejectionReason?: string): Promise<{ ok: boolean; message: string; order: AdminOrder }> {
  const res = await fetch(`/api/admin/orders/${orderId}/refund-reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(token),
    },
    body: JSON.stringify({ rejectionReason }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Could not reject refund.')
  }
  return data
}

export async function fetchSupportTickets(token: string): Promise<{ tickets: SupportTicket[] }> {
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

export async function fetchVisitsSummary(token: string): Promise<VisitsSummary> {
  const res = await fetch('/api/visits/summary', {
    headers: getAdminAuthHeaders(token),
  })
  if (!res.ok) throw new Error('Could not load site visits.')
  return res.json()
}
