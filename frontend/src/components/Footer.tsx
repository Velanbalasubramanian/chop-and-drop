import { Link } from 'react-router-dom'

export default function Footer() {
  const adminUrl =
    import.meta.env.VITE_ADMIN_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173'
      ? 'http://localhost:5174'
      : '/admin')

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand">Chop &amp; Drop</div>
          <p className="footer-tagline">Vegetables, cut and delivered before your kadai heats up.</p>
          <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="footer-admin-link">
            Staff Portal ↗
          </a>
        </div>
        <div className="footer-col">
          <span className="footer-heading">Service area</span>
          <p>Chennai — Adyar, T. Nagar, Velachery, Anna Nagar and nearby zones.</p>
        </div>
        <div className="footer-col">
          <span className="footer-heading">Talk to us</span>
          <p>+91 98765 43210</p>
          <p>hello@chopanddrop.in</p>
          <Link to="/help" style={{ color: '#fc8019', fontWeight: 600, fontSize: '0.88rem' }}>
            Help &amp; Support ➔
          </Link>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} Chop &amp; Drop. All rights reserved.</div>
    </footer>
  )
}
