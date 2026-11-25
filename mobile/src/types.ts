export interface Product {
  id: string
  name: string
  tamilName: string
  description: string
  unit: string
  price: number
  category?: string
}

export type PaymentMethod = 'cod' | 'online'
export type PaymentStatus = 'pending' | 'paid' | 'refund_requested' | 'refunded'
export type OrderStatus = 'received' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'

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

export interface TrackedOrder {
  id: string
  phone?: string
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
  receivedAt: string
  steps: OrderStatus[]
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

export interface CartItem {
  productId: string
  quantity: number
  product?: Product
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
