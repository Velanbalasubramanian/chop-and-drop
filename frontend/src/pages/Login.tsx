import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import PasswordInput from '../components/PasswordInput'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(phone.trim(), password)
      navigate('/my-orders')
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
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
        {error && <p className="form-status form-status-error">{error}</p>}
      </form>

      <p className="auth-switch">
        New here? <Link to="/register">Create an account</Link>
        <br />
        Or <Link to="/otp-login">log in with OTP</Link> instead of a password.
      </p>
    </section>
  )
}
