import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { requestOtp, verifyOtp } from '../api'
import PasswordInput from './PasswordInput'

type Tab = 'login' | 'otp' | 'register'

interface AuthCardProps {
  title?: string
  subtitle?: string
  onSuccess?: () => void
}

export default function AuthCard({
  title = 'Login Required to Place Order',
  subtitle = 'Please log in to your account or register to confirm your fresh chopped-vegetable order and track live delivery.',
  onSuccess,
}: AuthCardProps) {
  const { login, register, setSession } = useAuth()
  const [tab, setTab] = useState<Tab>('login')

  // Password Login state
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // OTP Login state
  const [otpPhone, setOtpPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpName, setOtpName] = useState('')
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone')
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [otpNeedsName, setOtpNeedsName] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  // Register state
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  // Handlers
  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      await login(loginPhone.trim(), loginPassword)
      onSuccess?.()
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleOtpRequest(e: FormEvent) {
    e.preventDefault()
    setOtpError('')
    setOtpLoading(true)
    try {
      const res = await requestOtp(otpPhone.trim())
      setOtpNeedsName(res.isNewUser)
      setDevOtp(res.devOtp || null)
      setOtpStep('code')
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Could not send verification code.')
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleOtpVerify(e: FormEvent) {
    e.preventDefault()
    setOtpError('')
    setOtpLoading(true)
    try {
      const res = await verifyOtp(otpPhone.trim(), otpCode.trim(), otpNeedsName ? otpName.trim() : undefined)
      setSession(res)
      onSuccess?.()
    } catch (err: any) {
      if (err.needsName) {
        setOtpNeedsName(true)
        setOtpError('Please enter your name to complete registration.')
      } else {
        setOtpError(err instanceof Error ? err.message : 'Invalid verification code.')
      }
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setRegError('')
    setRegLoading(true)
    try {
      await register(regName.trim(), regPhone.trim(), regPassword, regEmail.trim())
      onSuccess?.()
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div
      className="auth-card-animated"
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '520px',
        margin: '2rem auto',
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        border: '1px solid #ececee',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: '#fff4eb',
            color: '#fc8019',
            fontSize: '1.6rem',
            marginBottom: '0.75rem',
          }}
        >
          🔒
        </div>
        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: '#294a2c' }}>{title}</h2>
        <p style={{ color: '#686b78', fontSize: '0.92rem', margin: 0 }}>{subtitle}</p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          background: '#f5f5f7',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '1.5rem',
          gap: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => setTab('login')}
          style={{
            flex: 1,
            padding: '0.6rem 0.5rem',
            border: 'none',
            borderRadius: '8px',
            background: tab === 'login' ? '#ffffff' : 'transparent',
            color: tab === 'login' ? '#fc8019' : '#686b78',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: tab === 'login' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setTab('otp')}
          style={{
            flex: 1,
            padding: '0.6rem 0.5rem',
            border: 'none',
            borderRadius: '8px',
            background: tab === 'otp' ? '#ffffff' : 'transparent',
            color: tab === 'otp' ? '#fc8019' : '#686b78',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: tab === 'otp' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          Instant OTP
        </button>
        <button
          type="button"
          onClick={() => setTab('register')}
          style={{
            flex: 1,
            padding: '0.6rem 0.5rem',
            border: 'none',
            borderRadius: '8px',
            background: tab === 'register' ? '#ffffff' : 'transparent',
            color: tab === 'register' ? '#fc8019' : '#686b78',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: tab === 'register' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          Register
        </button>
      </div>

      {/* Tab 1: Password Login */}
      {tab === 'login' && (
        <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
              Mobile Phone
            </label>
            <input
              required
              type="tel"
              value={loginPhone}
              onChange={(e) => setLoginPhone(e.target.value)}
              placeholder="10-digit mobile number"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1.5px solid #ececee',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
              Password
            </label>
            <PasswordInput
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1.5px solid #ececee',
                fontSize: '0.95rem',
              }}
            />
          </div>

          {loginError && (
            <p style={{ color: '#c5221f', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>{loginError}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loginLoading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
          >
            {loginLoading ? 'Logging in…' : 'Log In & Proceed to Order'}
          </button>
        </form>
      )}

      {/* Tab 2: OTP Login */}
      {tab === 'otp' && (
        <div>
          {otpStep === 'phone' ? (
            <form onSubmit={handleOtpRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
                  Mobile Phone Number
                </label>
                <input
                  required
                  type="tel"
                  value={otpPhone}
                  onChange={(e) => setOtpPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #ececee',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {otpError && (
                <p style={{ color: '#c5221f', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>{otpError}</p>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={otpLoading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {otpLoading ? 'Sending OTP…' : 'Send 6-Digit OTP Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#f5fbf7', border: '1px solid #ceead6', padding: '0.75rem', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#137333' }}>
                  Code sent to <strong>{otpPhone}</strong>.{' '}
                  <button
                    type="button"
                    onClick={() => { setOtpStep('phone'); setDevOtp(null); }}
                    style={{ background: 'transparent', border: 'none', color: '#fc8019', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Change
                  </button>
                </p>
                {devOtp && (
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', fontWeight: 600, color: '#e35c00' }}>
                    Dev Mode Code: <span style={{ letterSpacing: '2px', background: '#fff', padding: '2px 6px', borderRadius: '4px' }}>{devOtp}</span>
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
                  6-Digit OTP Code
                </label>
                <input
                  required
                  maxLength={6}
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #ececee',
                    fontSize: '1.2rem',
                    textAlign: 'center',
                    letterSpacing: '4px',
                  }}
                />
              </div>

              {otpNeedsName && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
                    Your Name (First-time user)
                  </label>
                  <input
                    required
                    type="text"
                    value={otpName}
                    onChange={(e) => setOtpName(e.target.value)}
                    placeholder="e.g. Priya Ramesh"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1.5px solid #ececee',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              )}

              {otpError && (
                <p style={{ color: '#c5221f', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>{otpError}</p>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={otpLoading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {otpLoading ? 'Verifying…' : 'Verify & Continue'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab 3: Register */}
      {tab === 'register' && (
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
              Full Name
            </label>
            <input
              required
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. Priya Ramesh"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1.5px solid #ececee',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
              Mobile Phone
            </label>
            <input
              required
              type="tel"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="10-digit mobile number"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1.5px solid #ececee',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
              Email (Optional)
            </label>
            <input
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1.5px solid #ececee',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>
              Create Password (min 6 chars)
            </label>
            <PasswordInput
              required
              minLength={6}
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1.5px solid #ececee',
                fontSize: '0.95rem',
              }}
            />
          </div>

          {regError && (
            <p style={{ color: '#c5221f', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>{regError}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={regLoading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {regLoading ? 'Creating Account…' : 'Register & Proceed'}
          </button>
        </form>
      )}

      <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid #ececee', paddingTop: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#686b78' }}>
          Need assistance? <Link to="/help" style={{ color: '#fc8019', fontWeight: 600 }}>Help &amp; Support</Link>
        </p>
      </div>
    </div>
  )
}
