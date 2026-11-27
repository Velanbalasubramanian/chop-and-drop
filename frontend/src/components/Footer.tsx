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
          <div className="footer-brand">Zippo</div>
          <p className="footer-tagline">Your Everyday Delivery Hub. Groceries, Veggies, Cakes & More.</p>
          <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="footer-admin-link">
            Admin Portal ↗
          </a>
          <Link to="/partner" className="footer-admin-link" style={{ marginLeft: '0.85rem', color: '#ea580c', fontWeight: 700 }}>
            Partner Portal ↗
          </Link>
        </div>
        <div className="footer-col">
          <span className="footer-heading">Service area</span>
          <p>Chennai — Adyar, T. Nagar, Velachery, Anna Nagar, Guindy and all major zones.</p>
        </div>
        <div className="footer-col">
          <span className="footer-heading">Talk to us</span>
          <p>+91 98765 43210</p>
          <p>support@zippo.in</p>
          <Link to="/help" style={{ color: '#fc8019', fontWeight: 600, fontSize: '0.88rem' }}>
            Help &amp; Support ➔
          </Link>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} Zippo Delivery Technologies. All rights reserved.</div>
    </footer>
  )
}
