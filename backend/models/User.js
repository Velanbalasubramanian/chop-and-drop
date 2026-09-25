const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: '' },
    passwordHash: { type: String, default: null },
    role: { type: String, default: 'customer' },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
)

module.exports = mongoose.models.User || mongoose.model('User', userSchema)
