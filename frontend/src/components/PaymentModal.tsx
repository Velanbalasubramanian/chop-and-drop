import { useState } from 'react'
import PasswordInput from './PasswordInput'

interface PaymentModalProps {
  amount: number
  customerName: string
  onSuccess: (transactionId: string) => void
  onCancel: () => void
}

type PaymentTab = 'upi' | 'card' | 'netbanking'

export default function PaymentModal({ amount, customerName, onSuccess, onCancel }: PaymentModalProps) {
  const [tab, setTab] = useState<PaymentTab>('upi')
  const [upiId, setUpiId] = useState('')
  const [selectedApp, setSelectedApp] = useState<'gpay' | 'phonepe' | 'paytm' | null>('gpay')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [txnId, setTxnId] = useState('')

  function handleAuthorizePayment() {
    setProcessing(true)
    const generatedTxn = 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    setTxnId(generatedTxn)

    setTimeout(() => {
      setProcessing(false)
      setSuccess(true)
      setTimeout(() => {
        onSuccess(generatedTxn)
      }, 1200)
    }, 1500)
  }

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '480px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #294a2c, #1a331c)',
            color: '#fff',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85 }}>
              Easy Foods Secure Pay · {customerName}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '2px' }}>₹{amount}</div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing || success}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {processing ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #dfe9d6',
                  borderTopColor: '#fc8019',
                  borderRadius: '50%',
                  margin: '0 auto 1.5rem',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#294a2c' }}>Processing Secure Payment</h3>
              <p style={{ color: '#686b78', fontSize: '0.9rem', margin: 0 }}>
                Communicating with your UPI / Bank gateway...
              </p>
            </div>
          ) : success ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#e6f4ea',
                  color: '#137333',
                  fontSize: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                ✓
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#137333' }}>Payment Verified!</h3>
              <p style={{ color: '#686b78', fontSize: '0.88rem', margin: '0 0 0.5rem 0' }}>
                Transaction ID: <strong>{txnId}</strong>
              </p>
              <p style={{ color: '#0f8a3d', fontSize: '0.9rem', fontWeight: 600 }}>Placing your order...</p>
            </div>
          ) : (
            <div>
              {/* Payment Methods Tabs */}
              <div
                style={{
                  display: 'flex',
                  background: '#f5f5f7',
                  borderRadius: '10px',
                  padding: '4px',
                  marginBottom: '1.25rem',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setTab('upi')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: tab === 'upi' ? '#fff' : 'transparent',
                    color: tab === 'upi' ? '#fc8019' : '#686b78',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  UPI Apps &amp; QR
                </button>
                <button
                  type="button"
                  onClick={() => setTab('card')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: tab === 'card' ? '#fff' : 'transparent',
                    color: tab === 'card' ? '#fc8019' : '#686b78',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setTab('netbanking')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: tab === 'netbanking' ? '#fff' : 'transparent',
                    color: tab === 'netbanking' ? '#fc8019' : '#686b78',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Net Banking
                </button>
              </div>

              {tab === 'upi' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                    {[
                      { id: 'gpay', label: 'Google Pay', icon: '●' },
                      { id: 'phonepe', label: 'PhonePe', icon: '●' },
                      { id: 'paytm', label: 'Paytm', icon: '●' },
                    ].map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSelectedApp(app.id as any)}
                        style={{
                          padding: '0.75rem 0.5rem',
                          borderRadius: '10px',
                          border: selectedApp === app.id ? '2px solid #fc8019' : '1px solid #ececee',
                          background: selectedApp === app.id ? '#fff9f4' : '#fff',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{app.icon}</span>
                        <span>{app.label}</span>
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      background: '#f9f9fb',
                      border: '1px dashed #d0d0d8',
                      borderRadius: '12px',
                      padding: '1rem',
                      textAlign: 'center',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: '#686b78', marginBottom: '4px' }}>
                      Scan QR Code using any UPI App
                    </div>
                    {/* Visual QR Code placeholder */}
                    <div
                      style={{
                        width: '120px',
                        height: '120px',
                        margin: '0.5rem auto',
                        background: '#ffffff',
                        border: '2px solid #3d4152',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.5rem',
                      }}
                    >
                      📱
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#0f8a3d', fontWeight: 600 }}>
                      ✓ Verified Merchant: Easy Foods Fresh
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                      Or Enter UPI ID / VPA
                    </label>
                    <input
                      type="text"
                      placeholder="mobile@upi or user@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem',
                        borderRadius: '8px',
                        border: '1.5px solid #ececee',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>
                </div>
              )}

              {tab === 'card' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="4532 •••• •••• 8910"
                      defaultValue="4532 8901 2345 6789"
                      style={{
                        width: '100%',
                        padding: '0.7rem',
                        borderRadius: '8px',
                        border: '1.5px solid #ececee',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        placeholder="12/28"
                        defaultValue="08/29"
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          borderRadius: '8px',
                          border: '1.5px solid #ececee',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                        CVV
                      </label>
                      <PasswordInput
                        placeholder="123"
                        defaultValue="888"
                        maxLength={4}
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          borderRadius: '8px',
                          border: '1.5px solid #ececee',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {tab === 'netbanking' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Punjab National Bank'].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      style={{
                        padding: '0.75rem',
                        border: '1px solid #ececee',
                        borderRadius: '8px',
                        background: '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                      }}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAuthorizePayment}
                style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem', padding: '0.9rem' }}
              >
                Pay ₹{amount} Securely
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#686b78' }}>
                  🔒 256-Bit Encrypted Payment Simulation
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

