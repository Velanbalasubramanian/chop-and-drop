import { FormEvent, useState } from 'react'
import { submitSupportTicket } from '../api'
import { useAuth } from '../context/AuthContext'

const FAQS = [
  {
    q: 'How fresh are the chopped vegetables?',
    a: 'We source fresh farm vegetables every morning at 4:30 AM. Each batch is washed in ozonated water, sanitized, precision-chopped with food-grade stainless steel cutters, and immediately sealed in food-safe vacuum packs. No preservatives or chemicals added.',
  },
  {
    q: 'How do Online Payment & Cash on Delivery (COD) work?',
    a: "You can choose between Cash on Delivery (pay cash or scan the delivery executive's UPI QR code at your doorstep) or 100% secure Online Payment (Google Pay, PhonePe, Paytm, UPI ID, or Credit/Debit Card).",
  },
  {
    q: 'What if I am not satisfied with the quality of cut vegetables?',
    a: 'We have a 100% No-Questions-Asked replacement or instant refund guarantee. If you notice any issue, simply reach out to us on WhatsApp or submit a ticket here within 2 hours of delivery.',
  },
  {
    q: 'Can I customize how my vegetables are chopped?',
    a: 'Yes! When placing your order, use the "Cooking / Delivery Instructions" box to mention special preferences (e.g., "Fine chop for onion sambar", "Large cubes for avial", or "Julienne strips for salad").',
  },
  {
    q: 'What delivery slots are available in Chennai?',
    a: 'We currently deliver in 3 convenient time slots: 6:00 AM – 7:00 AM (for early morning cooking), 7:00 AM – 8:00 AM, and 5:00 PM – 6:00 PM (for evening dinner prep).',
  },
  {
    q: 'How can I track my order live?',
    a: 'Go to the Track Order page (/track) and enter your Order ID (e.g., CD-8K3F2A) along with your mobile number. With our real-time WebSocket connection, you will see instant status updates as your veggies are confirmed, washed, chopped, and delivered!',
  },
]

export default function HelpSupport() {
  const { user } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [email, setEmail] = useState(user?.email || '')
  const [orderId, setOrderId] = useState('')
  const [issueType, setIssueType] = useState('Order Tracking / Status')
  const [message, setMessage] = useState('')

  const [loading, setLoading] = useState(false)
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTicketSuccess(null)

    try {
      const res = await submitSupportTicket({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        orderId: orderId.trim(),
        issueType,
        message: message.trim(),
      })
      setTicketSuccess(res.ticketId)
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit support request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section page-section">
      <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 2.5rem' }}>
        <p className="page-eyebrow">Customer Care</p>
        <h1>Help &amp; Support</h1>
        <p className="page-intro">
          We're here to help you get fresh, chopped vegetables without the kitchen hassle. Reach out to our
          team directly or raise a support ticket below.
        </p>
      </div>

      {/* Quick Contact Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '3rem',
        }}
      >
        {/* WhatsApp Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid #ceead6',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
          <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.25rem 0', color: '#137333' }}>WhatsApp Support</h3>
          <p style={{ color: '#686b78', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
            Instant replies for orders &amp; custom requests
          </p>
          <a
            href="https://wa.me/919876543210?text=Hi%20Easy%20Foods%2C%20I%20need%20assistance%20with%20my%20order"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              background: '#25D366',
              color: '#ffffff',
              fontSize: '0.88rem',
              padding: '0.6rem 1.2rem',
              display: 'inline-flex',
              textDecoration: 'none',
            }}
          >
            Chat on WhatsApp ➔
          </a>
        </div>

        {/* Phone Helpline */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid #ececee',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📞</div>
          <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.25rem 0', color: '#294a2c' }}>Direct Helpline</h3>
          <p style={{ color: '#686b78', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
            Available daily 6:00 AM – 9:00 PM
          </p>
          <a
            href="tel:+919876543210"
            className="btn btn-ghost"
            style={{ fontSize: '0.88rem', padding: '0.6rem 1.2rem', textDecoration: 'none' }}
          >
            +91 98765 43210
          </a>
        </div>

        {/* Email Support */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid #ececee',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✉️ï¸</div>
          <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.25rem 0', color: '#294a2c' }}>Email Care</h3>
          <p style={{ color: '#686b78', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
            For corporate, bulk &amp; general queries
          </p>
          <a
            href="mailto:support@easyfoods.in"
            className="btn btn-ghost"
            style={{ fontSize: '0.88rem', padding: '0.6rem 1.2rem', textDecoration: 'none' }}
          >
            support@easyfoods.in
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
        {/* Support Ticket Form */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid #ececee',
          }}
        >
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: '#294a2c' }}>Raise a Support Ticket</h2>
          <p style={{ color: '#686b78', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            Submit your query or issue below. Our customer manager will contact you promptly.
          </p>

          {ticketSuccess ? (
            <div style={{ background: '#e6f4ea', border: '1px solid #ceead6', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', color: '#137333', marginBottom: '0.5rem' }}>✓</div>
              <h3 style={{ color: '#137333', margin: '0 0 0.5rem 0' }}>Ticket Created!</h3>
              <p style={{ fontSize: '0.9rem', color: '#3d4152', margin: '0 0 1rem 0' }}>
                Your ticket ID is <strong>{ticketSuccess}</strong>. Our team has received your request and will call or text you shortly.
              </p>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setTicketSuccess(null)}
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Your Name
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1.5px solid #ececee' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1.5px solid #ececee' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1.5px solid #ececee' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Order ID (if applicable)
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. CD-8K3F2A"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1.5px solid #ececee' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Issue Category
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1.5px solid #ececee', background: '#fff' }}
                >
                  <option value="Order Tracking / Status">Order Tracking / Status</option>
                  <option value="Quality / Freshness Issue">Quality / Freshness Issue</option>
                  <option value="Missing Items in Vegetable Pack">Missing Items in Vegetable Pack</option>
                  <option value="Payment / Refund Enquiry">Payment / Refund Enquiry</option>
                  <option value="Delivery Address / Slot Change">Delivery Address / Slot Change</option>
                  <option value="Custom Vegetable Cutting Request">Custom Vegetable Cutting Request</option>
                  <option value="General Feedback / Other">General Feedback / Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Explain Your Concern
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe how we can assist you..."
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1.5px solid #ececee', resize: 'vertical' }}
                />
              </div>

              {error && <p style={{ color: '#c5221f', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
              >
                {loading ? 'Submitting...' : 'Submit Support Request'}
              </button>
            </form>
          )}
        </div>

        {/* FAQs Accordion */}
        <div>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: '#294a2c' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: '#686b78', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            Quick answers to common questions about Easy Foods.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div
                  key={index}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #ececee',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isOpen ? '#fffaf5' : '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: isOpen ? '#fc8019' : '#3d4152',
                      fontSize: '0.92rem',
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ fontSize: '1.1rem', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0.75rem 1.25rem 1.25rem', color: '#686b78', fontSize: '0.88rem', lineHeight: '1.6' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

