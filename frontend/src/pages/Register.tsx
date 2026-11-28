import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/PasswordInput'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setIsAlreadyRegistered(false)
    setSuccess('')
    setLoading(true)
    try {
      await register(name.trim(), phone.trim(), password, email.trim() || undefined)
      setSuccess(`Account Created Successfully! 🎉 Welcome to Zippo, ${name.trim()}! Taking you to your orders...`)
      setTimeout(() => {
        navigate('/my-orders')
      }, 1500)
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Could not create your account.'
      if (/already (exists|registered)/i.test(msg)) {
        setIsAlreadyRegistered(true)
        setError('This phone number is already registered.')
      } else {
        setIsAlreadyRegistered(false)
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section page-section auth-section">
      <p className="page-eyebrow">New here?</p>
      <h1>Create an account</h1>
      <p className="page-intro">
        Save your details once and we'll fill them in every time you order, plus you can see your order
        history any time.
      </p>

      <form className="order-form auth-form" onSubmit={handleSubmit}>
        <label>
          Your name
          <input required type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
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
          Email (optional)
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <PasswordInput
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading || !!success} style={success ? { backgroundColor: '#059669', borderColor: '#059669' } : undefined}>
          {loading ? 'Creating account…' : success ? '✓ Success! Taking you in...' : 'Create account'}
        </button>
        {success && (
          <div style={{ backgroundColor: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: '8px', padding: '12px 16px', color: '#065f46', marginTop: '12px', fontWeight: 'bold' }}>
            {success}
          </div>
        )}
        {isAlreadyRegistered && (
          <div style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '8px', padding: '14px', marginTop: '14px', color: '#92400e' }}>
            <div style={{ fontWeight: '800', marginBottom: '4px' }}>Account Already Created ⚠️</div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>
              An account with mobile number <strong>{phone}</strong> already exists in Zippo.
            </p>
            <Link to={`/login?phone=${encodeURIComponent(phone)}`} className="btn btn-secondary" style={{ display: 'inline-block', fontSize: '0.88rem', padding: '6px 14px' }}>
              👉 Sign In with Password Now ➔
            </Link>
          </div>
        )}
        {error && !isAlreadyRegistered && <p className="form-status form-status-error">{error}</p>}
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  )
}
