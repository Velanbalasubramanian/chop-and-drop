export type PaymentMethod = 'cod' | 'online'
export type PaymentStatus = 'pending' | 'paid' | 'refund_requested' | 'refunded'
export type OrderStatus = 'received' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'

export interface Partner {
  id: string
  name: string
  phone: string
  email?: string
  category: string
  storeName?: string
  address?: string
  status: 'active' | 'inactive'
  createdAt: string
}

export interface PartnerProduct {
  id: string
  name: string
  tamilName?: string
  category: string
  unit: string
  price: number
  description?: string
  partnerId?: string
  stockQuantity: number
  isAvailable: boolean
}

export interface PartnerOrder {
  id: string
  name: string
  phone: string
  email: string
  address: string
  deliverySlot: string
  items: string
  notes?: string
  status: OrderStatus
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  amount?: number
  transactionId?: string
  receivedAt: string
  isPartnerCategory?: boolean
  matchingItems?: string[]
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
