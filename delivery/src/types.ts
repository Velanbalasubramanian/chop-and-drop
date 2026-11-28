export type PaymentMethod = 'cod' | 'online'
export type PaymentStatus = 'pending' | 'paid' | 'refund_requested' | 'refunded'
export type OrderStatus = 'received' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'

export interface Rider {
  id: string
  name: string
  phone: string
  vehicle: string
  zone: string
  status: 'online' | 'offline'
  rating: number
  createdAt?: string
}

export interface DeliveryOrder {
  id: string
  name: string
  phone: string
  email?: string
  address: string
  deliverySlot: string
  items: string
  notes?: string
  status: OrderStatus
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  amount?: number
  receivedAt: string
  partnerStoreName?: string
  partnerAddress?: string
  partnerPhone?: string
  riderName?: string
  riderPhone?: string
  cancelReason?: string
  cancelledBy?: string
  cancelledAt?: string
}

export interface DeliveryStats {
  completedCount: number
  activeCount: number
  totalEarnings: number
  codCashCollected: number
  rating: number
  vehicle: string
  zone: string
  payoutRate: number
}

export interface RiderAuthResult {
  ok: boolean
  token: string
  rider: Rider
}
