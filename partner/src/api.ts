import { Partner, PartnerOrder, PartnerProduct, PartnerStats } from './types'

function getAuthHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function partnerLogin(phone: string, password: string): Promise<{ ok: boolean; token: string; partner: Partner }> {
  const res = await fetch('/api/partners/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Partner login failed.')
  }
  return data
}

export async function fetchPartnerProfile(token: string): Promise<Partner> {
  const res = await fetch('/api/partners/me', {
    headers: getAuthHeaders(token),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch profile.')
  }
  return data.partner
}

export async function fetchPartnerProducts(token: string): Promise<PartnerProduct[]> {
  const res = await fetch('/api/partners/products', {
    headers: getAuthHeaders(token),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch inventory.')
  }
  return data.products || []
}

export async function createPartnerProduct(
  token: string,
  product: {
    name: string
    tamilName?: string
    category?: string
    unit: string
    price: number
    stockQuantity: number
    description?: string
  }
): Promise<PartnerProduct> {
  const res = await fetch('/api/partners/products', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(product),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to add item.')
  }
  return data.product
}

export async function updatePartnerProduct(
  token: string,
  id: string,
  updates: Partial<PartnerProduct>
): Promise<PartnerProduct> {
  const res = await fetch(`/api/partners/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify(updates),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update item.')
  }
  return data.product
}

export async function deletePartnerProduct(token: string, id: string): Promise<void> {
  const res = await fetch(`/api/partners/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete item.')
  }
}

export async function fetchPartnerOrders(token: string): Promise<{ orders: PartnerOrder[]; partnerCategory: string }> {
  const res = await fetch('/api/partners/orders', {
    headers: getAuthHeaders(token),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load orders.')
  }
  return data
}

export async function updatePartnerOrderStatus(
  token: string,
  orderId: string,
  status: string,
  reason?: string
): Promise<{ ok: boolean; order: PartnerOrder }> {
  const res = await fetch(`/api/partners/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status, reason }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update order status.')
  }
  return data
}

export async function fetchPartnerStats(token: string): Promise<PartnerStats> {
  const res = await fetch('/api/partners/stats', {
    headers: getAuthHeaders(token),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load statistics.')
  }
  return data
}

export async function fetchActivePartners(): Promise<Partner[]> {
  try {
    const res = await fetch('/api/partners/active')
    const data = await res.json()
    if (data.ok && Array.isArray(data.partners)) {
      return data.partners
    }
    return []
  } catch (err) {
    console.error('Failed to fetch active partners:', err)
    return []
  }
}
