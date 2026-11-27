export type PaymentMethod = 'cod' | 'online'
export type PaymentStatus = 'pending' | 'paid' | 'refund_requested' | 'refunded'

export type OrderStatus = 'received' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'

export interface AdminOrder {
  id: string
  name: string
  phone: string
  email: string
  address: string
  deliverySlot: string
  items: string
  notes: string
  status: OrderStatus
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  amount?: number
  transactionId?: string
  refundId?: string
  refundReason?: string
  refundAmount?: number
  refundRequestedAt?: string
  refundProcessedAt?: string
  refundUpi?: string
  receivedAt: string
  partnerId?: string
  partnerStoreName?: string
  partnerPhone?: string
  partnerName?: string
  partnerCategory?: string
  followUpNotes?: string
  riderName?: string
  riderPhone?: string
}

export interface User {
  id: string
  name: string
  phone: string
  email: string
  role?: string
  createdAt: string
}

export interface SupportTicket {
  id: string
  name: string
  phone: string
  email?: string
  orderId?: string
  issueType: string
  message: string
  status: string
  createdAt: string
}

export interface VisitsSummary {
  total: number
  today: number
  recent: { path: string; visitedAt: string }[]
}

export interface Partner {
  id: string
  name: string
  phone: string
  email?: string
  category: string
  storeName?: string
  address?: string
  rating?: number
  deliveryTime?: string
  description?: string
  bannerImage?: string
  status: 'active' | 'inactive'
  createdAt: string
}

export interface PartnerAuthResult {
  ok: boolean
  token: string
  partner: Partner
}

export interface PartnerStats {
  total: number
  received: number
  preparing: number
  outForDelivery: number
  delivered: number
  revenue: number
  category: string
}
