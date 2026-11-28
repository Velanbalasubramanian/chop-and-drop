import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import PasswordInput from '../components/PasswordInput'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [phone, setPhone] = useState(params.get('phone') || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await login(phone.trim(), password)
      setSuccess('Logged in successfully! 👋 Taking you to your orders...')
      setTimeout(() => {
        navigate('/my-orders')
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section page-section auth-section">
      <p className="page-eyebrow">Welcome back</p>
      <h1>Log in</h1>

      <form className="order-form auth-form" onSubmit={handleSubmit}>
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
        <label>
          Password
          <PasswordInput
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading || !!success} style={success ? { backgroundColor: '#059669', borderColor: '#059669' } : undefined}>
          {loading ? 'Logging in…' : success ? '✓ Success! Taking you in...' : 'Log in'}
        </button>
        {success && (
          <div style={{ backgroundColor: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: '8px', padding: '12px 16px', color: '#065f46', marginTop: '12px', fontWeight: 'bold' }}>
            {success}
          </div>
        )}
        {error && (
          <div className="form-status form-status-error">
            {error}
            {/OTP/i.test(error) && (
              <div style={{ marginTop: '8px' }}>
                <Link to={`/otp-login?phone=${encodeURIComponent(phone)}`} style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                  👉 Click here to Log in with OTP
                </Link>
              </div>
            )}
          </div>
        )}
      </form>

      <p className="auth-switch">
        New here? <Link to="/register">Create an account</Link>
        <br />
        Or <Link to="/otp-login">log in with OTP</Link> instead of a password.
      </p>
    </section>
  )
}
