const mongoose = require('mongoose')

const visitSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    visitedAt: { type: String, default: () => new Date().toISOString(), index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
)

module.exports = mongoose.models.Visit || mongoose.model('Visit', visitSchema)
