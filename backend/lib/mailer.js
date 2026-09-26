const nodemailer = require('nodemailer')

// Sends the customer an order confirmation email. If SMTP credentials
// are not set in .env, this quietly skips and logs why — order
// creation still succeeds either way.
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

async function sendOrderConfirmationEmail(order) {
  if (!order.email) {
    console.log(`[mailer] No email on order ${order.id}, skipping.`)
    return { sent: false, reason: 'no-email-provided' }
  }

  const transporter = getTransporter()
  if (!transporter) {
    console.log('[mailer] SMTP not configured (.env) — skipping email send.')
    return { sent: false, reason: 'smtp-not-configured' }
  }

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: order.email,
      subject: `Easy Foods — order ${order.id} received`,
      text:
        `Hi ${order.name},\n\n` +
        `We've received your order (ID: ${order.id}).\n` +
        `Items: ${order.items}\n` +
        `Delivery slot: ${order.deliverySlot}\n\n` +
        `Track it anytime at: /track (use order ID + your phone number)\n\n` +
        `— Easy Foods`,
    })
    return { sent: true }
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message)
    return { sent: false, reason: 'send-failed' }
  }
}

module.exports = { sendOrderConfirmationEmail }

