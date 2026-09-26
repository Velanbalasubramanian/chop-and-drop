// Sends the customer an order confirmation SMS via Twilio. If Twilio
// credentials are not set in .env, this quietly skips — order
// creation still succeeds either way.
async function sendOrderConfirmationSms(order) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.log('[sms] Twilio not configured (.env) — skipping SMS send.')
    return { sent: false, reason: 'twilio-not-configured' }
  }

  try {
    const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    await twilio.messages.create({
      from: TWILIO_FROM_NUMBER,
      to: order.phone.startsWith('+') ? order.phone : `+91${order.phone}`,
      body: `Easy Foods: order ${order.id} received for slot ${order.deliverySlot}. Track it with your order ID + phone number.`,
    })
    return { sent: true }
  } catch (err) {
    console.error('[sms] Failed to send SMS:', err.message)
    return { sent: false, reason: 'send-failed' }
  }
}

// Sends a one-time login code by SMS. Returns { sent, devCode? } — when
// Twilio isn't configured, the code is returned so the backend can log it
// to the console for local testing instead of silently failing.
async function sendOtpSms(phone, code) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env
  const toNumber = phone.startsWith('+') ? phone : `+91${phone}`

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.log(`[otp] Twilio not configured — OTP for ${phone} is: ${code}`)
    return { sent: false, reason: 'twilio-not-configured' }
  }

  try {
    const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    await twilio.messages.create({
      from: TWILIO_FROM_NUMBER,
      to: toNumber,
      body: `Your Easy Foods login code is ${code}. It expires in 5 minutes.`,
    })
    return { sent: true }
  } catch (err) {
    console.error('[otp] Failed to send OTP SMS:', err.message)
    console.log(`[otp] Falling back to console — OTP for ${phone} is: ${code}`)
    return { sent: false, reason: 'send-failed' }
  }
}

module.exports = { sendOrderConfirmationSms, sendOtpSms }

