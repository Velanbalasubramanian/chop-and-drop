export interface Store {
  id: string
  storeName: string
  ownerName?: string
  phone?: string
  category: string
  address: string
  rating: number
  deliveryTime: string
  description?: string
  bannerImage?: string
  itemCount?: number
  sampleItems?: string[]
}

export interface Product {
  id: string
  name: string
  tamilName: string
  description: string
  unit: string
  price: number
  category?: string
  partnerId?: string
  storeName?: string
  storeRating?: number
  storeDeliveryTime?: string
  storeAddress?: string
  stockQuantity?: number
  isAvailable?: boolean
}

export type PaymentMethod = 'cod' | 'online'
export type PaymentStatus = 'pending' | 'paid' | 'refund_requested' | 'refunded'

export interface OrderPayload {
  name: string
  phone: string
  email?: string
  address: string
  deliverySlot: string
  items: string
  notes?: string
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  amount?: number
  transactionId?: string
  cartItems?: { productId: string; name: string; quantity: number }[]
}

export interface OrderResponse {
  ok: boolean
  orderId: string
  status: string
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  amount?: number
  transactionId?: string
  notifications: {
    email: { sent: boolean; reason?: string }
    sms: { sent: boolean; reason?: string }
  }
}

export type OrderStatus = 'received' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'

export interface TrackedOrder {
  id: string
  status: OrderStatus
  deliverySlot: string
  items: string
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
  riderName?: string
  riderPhone?: string
  partnerStoreName?: string
  cancelReason?: string
  cancelledBy?: string
  cancelledAt?: string
  receivedAt: string
  steps: OrderStatus[]
}

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
  riderName?: string
  riderPhone?: string
  partnerStoreName?: string
  cancelReason?: string
  cancelledBy?: string
  cancelledAt?: string
  receivedAt: string
  matchingItems?: string[]
  isPartnerCategory?: boolean
}

export interface User {
  id: string
  name: string
  phone: string
  email: string
  role?: string
  createdAt: string
}

export interface AuthResult {
  token: string
  user: User
}

export interface OtpRequestResult {
  ok: boolean
  isNewUser: boolean
  devOtp?: string
}

export interface VisitsSummary {
  total: number
  today: number
  recent: { path: string; visitedAt: string }[]
}

export interface CartItem {
  productId: string
  quantity: number
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

export interface Transaction {
  id: string
  orderId: string
  amount: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  refundId?: string
  refundReason?: string
  refundAmount?: number
  refundRequestedAt?: string
  refundProcessedAt?: string
  date: string
  items: string
}

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
