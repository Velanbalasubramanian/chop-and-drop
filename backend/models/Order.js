const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: null, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String, default: '' },
    address: { type: String, required: true },
    deliverySlot: { type: String, default: 'Not specified' },
    items: { type: String, required: true },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'received',
      index: true,
    },
    paymentMethod: { type: String, enum: ['cod', 'online'], default: 'cod' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refund_requested', 'refunded'],
      default: 'pending',
      index: true,
    },
    amount: { type: Number, default: 0 },
    transactionId: { type: String, default: '' },
    refundId: { type: String, default: '' },
    refundReason: { type: String, default: '' },
    refundAmount: { type: Number, default: 0 },
    refundRequestedAt: { type: String, default: '' },
    refundProcessedAt: { type: String, default: '' },
    refundUpi: { type: String, default: '' },
    receivedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
)

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema)
