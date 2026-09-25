const mongoose = require('mongoose')

const supportTicketSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    orderId: { type: String, default: '' },
    issueType: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: 'open' },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
)

module.exports = mongoose.models.SupportTicket || mongoose.model('SupportTicket', supportTicketSchema)
