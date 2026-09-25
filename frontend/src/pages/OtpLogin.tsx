import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requestOtp, verifyOtp } from '../api'
import { useAuth } from '../context/AuthContext'

type Step = 'phone' | 'code'

export default function OtpLogin() {
  const { setSession } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [needsName, setNeedsName] = useState(false)
  const [devOtp, setDevOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSendCode(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await requestOtp(phone.trim())
      setNeedsName(result.isNewUser)
      setDevOtp(result.devOtp || '')
      setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a code.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await verifyOtp(phone.trim(), code.trim(), needsName ? name.trim() : undefined)
      setSession(result)
      navigate('/my-orders')
    } catch (err) {
      const e = err as Error & { needsName?: boolean }
      if (e.needsName) {
        setNeedsName(true)
        setError('You\u2019re new here — please add your name below and try again.')
      } else {
        setError(e.message || 'Could not verify that code.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setCode('')
    setLoading(true)
    try {
      const result = await requestOtp(phone.trim())
      setDevOtp(result.devOtp || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section page-section auth-section">
      <p className="page-eyebrow">Quick login</p>
      <h1>Log in with OTP</h1>

      {step === 'phone' && (
        <form className="order-form auth-form" onSubmit={handleSendCode}>
          <label>
            Phone number
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending code…' : 'Send OTP'}
          </button>
          {error && <p className="form-status form-status-error">{error}</p>}
        </form>
      )}

      {step === 'code' && (
        <form className="order-form auth-form" onSubmit={handleVerify}>
          <p className="page-intro" style={{ marginTop: 0 }}>
            Code sent to {phone}.{' '}
            <button type="button" className="nav-link-button" onClick={() => setStep('phone')}>
              Change number
            </button>
          </p>

          {devOtp && (
            <p className="cart-hint">
              SMS isn't configured yet, so here's your code for testing: <strong>{devOtp}</strong>
            </p>
          )}

          <label>
            6-digit code
            <input
              required
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </label>

          {needsName && (
            <label>
              Your name (first time here)
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify & log in'}
          </button>
          <button type="button" className="nav-link-button" onClick={handleResend} disabled={loading}>
            Resend code
          </button>
          {error && <p className="form-status form-status-error">{error}</p>}
        </form>
      )}

      <p className="auth-switch">
        Prefer a password? <Link to="/login">Log in with password</Link>
      </p>
    </section>
  )
}
