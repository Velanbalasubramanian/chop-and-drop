import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BasketIcon, LeafIcon, ShieldIcon } from './Icons'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const mainLinks = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/products', label: 'Products', icon: '🥬' },
  { to: '/about', label: 'About', icon: 'ℹ️' },
  { to: '/track', label: 'Track Order', icon: '🛵' },
  { to: '/help', label: 'Help & Support', icon: '💬' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const { totalCount } = useCart()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const mobileToggleRef = useRef<HTMLButtonElement>(null)

  const adminUrl =
    import.meta.env.VITE_ADMIN_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173'
      ? 'http://localhost:5174'
      : '/admin')

  function handleLogout() {
    logout()
    navigate('/')
    setMobileOpen(false)
    setDropdownOpen(false)
  }

  function closeMobile() {
    setMobileOpen(false)
  }

  // Track scroll position for fixed header elevated state
  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 8)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Automatically close mobile menu if screen resized to desktop (> 880px)
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 880) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Lock background scrolling when mobile menu drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // Automatically close menus on route change
  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
  }, [location.pathname])

  // Close desktop dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [dropdownOpen])

  // Close mobile drawer when clicking or tapping outside
  useEffect(() => {
    function handleMobileOutsideClick(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      if (
        mobileOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        mobileToggleRef.current &&
        !mobileToggleRef.current.contains(target)
      ) {
        setMobileOpen(false)
      }
    }
    if (mobileOpen) {
      document.addEventListener('mousedown', handleMobileOutsideClick)
      document.addEventListener('touchstart', handleMobileOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleMobileOutsideClick)
      document.removeEventListener('touchstart', handleMobileOutsideClick)
    }
  }, [mobileOpen])

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        setDropdownOpen(false)
      }
    }
    if (mobileOpen || dropdownOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen, dropdownOpen])

  // Highlight 'More' dropdown if current route is inside it
  const isDropdownActive = ['/about', '/help', '/support', '/my-orders'].some(
    (path) => location.pathname === path
  )

  return (
    <header className={`nav ${isScrolled ? 'nav-scrolled' : ''}`}>
      <div className="nav-inner">
        {/* Brand */}
        <NavLink to="/" className="brand" onClick={closeMobile}>
          <LeafIcon className="brand-icon" />
          <span>Easy Foods</span>
        </NavLink>

        {/* Desktop Navigation Links (Reduced menus with sleek More dropdown) */}
        <nav className="nav-links" aria-label="Main Navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Home
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Products
          </NavLink>

          <NavLink
            to="/track"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Track Order
          </NavLink>

          {/* More Dropdown Menu */}
          <div className="nav-dropdown-wrapper" ref={dropdownRef}>
            <button
              type="button"
              className={`nav-link nav-dropdown-toggle ${dropdownOpen ? 'open' : ''} ${isDropdownActive ? 'active' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <span>More</span>
              <svg
                className={`dropdown-chevron ${dropdownOpen ? 'rotate' : ''}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="nav-dropdown-menu" role="menu">
                <NavLink
                  to="/about"
                  className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}
                  onClick={() => setDropdownOpen(false)}
                  role="menuitem"
                >
                  <span className="dropdown-item-icon">ℹ️</span>
                  <div className="dropdown-item-content">
                    <span className="dropdown-item-title">About Us</span>
                    <span className="dropdown-item-sub">Our story, farms & mission</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/help"
                  className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}
                  onClick={() => setDropdownOpen(false)}
                  role="menuitem"
                >
                  <span className="dropdown-item-icon">💬</span>
                  <div className="dropdown-item-content">
                    <span className="dropdown-item-title">Help & Support</span>
                    <span className="dropdown-item-sub">FAQs & customer care</span>
                  </div>
                </NavLink>

                {user && (
                  <NavLink
                    to="/my-orders"
                    className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}
                    onClick={() => setDropdownOpen(false)}
                    role="menuitem"
                  >
                    <span className="dropdown-item-icon">📦</span>
                    <div className="dropdown-item-content">
                      <span className="dropdown-item-title">My Orders</span>
                      <span className="dropdown-item-sub">Order history & receipts</span>
                    </div>
                  </NavLink>
                )}

                {user?.role === 'admin' && (
                  <a
                    href={adminUrl}
                    className="nav-dropdown-item nav-dropdown-item-admin"
                    onClick={() => setDropdownOpen(false)}
                    role="menuitem"
                    title="Open Dedicated Admin Portal"
                  >
                    <span className="dropdown-item-icon"><ShieldIcon size={18} /></span>
                    <div className="dropdown-item-content">
                      <span className="dropdown-item-title">
                        Admin Portal <span className="admin-status-dot" style={{ display: 'inline-block', marginLeft: 4 }} />
                      </span>
                      <span className="dropdown-item-sub">Store management</span>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Right Actions: User info, Cart, CTA, Mobile Toggle */}
        <div className="nav-actions">
          {/* Desktop User Info */}
          <div className="nav-auth-desktop">
            {user ? (
              <div className="nav-user-pill">
                <span className="nav-user-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
                <span className="nav-user-name">Hi, {user.name.split(' ')[0]}</span>
                {user.role === 'admin' && <span className="nav-role-badge">Admin</span>}
                <button
                  type="button"
                  className="nav-logout-btn"
                  onClick={handleLogout}
                  title="Sign out of your account"
                >
                  Log out
                </button>
              </div>
            ) : (
              <NavLink to="/login" className="nav-login-link">
                Log in
              </NavLink>
            )}
          </div>

          {/* Cart Icon */}
          <NavLink to="/cart" className="nav-cart" aria-label={`Cart with ${totalCount} items`} onClick={closeMobile}>
            <BasketIcon className="nav-cart-icon" />
            {totalCount > 0 && <span className="nav-cart-badge">{totalCount}</span>}
          </NavLink>

          {/* CTA Button (Hidden on small mobile screens to prevent crowding) */}
          <NavLink to="/order" className="nav-cta" onClick={closeMobile}>
            Place an order
          </NavLink>

          {/* Mobile Menu Toggle Button */}
          <button
            ref={mobileToggleRef}
            type="button"
            className={`nav-mobile-toggle ${mobileOpen ? 'open' : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu & Backdrop */}
      {mobileOpen && (
        <>
          <div className="nav-mobile-backdrop" onClick={closeMobile} aria-hidden="true" />
          <div ref={mobileMenuRef} className="nav-mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
            {/* User Profile or Login/Register buttons */}
            {user ? (
              <div className="nav-mobile-user">
                <div className="nav-user-pill">
                  <span className="nav-user-avatar">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                  <div>
                    <div className="nav-user-name">Hi, {user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>{user.phone}</div>
                  </div>
                  {user.role === 'admin' && <span className="nav-role-badge">Admin</span>}
                </div>
                <button type="button" className="nav-logout-btn" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            ) : (
              <div className="nav-mobile-auth-row">
                <NavLink to="/login" className="nav-mobile-login-btn" onClick={closeMobile}>
                  🔑 Log in
                </NavLink>
                <NavLink to="/register" className="nav-mobile-register-btn" onClick={closeMobile}>
                  Register
                </NavLink>
              </div>
            )}

            {/* Prominent Quick Order CTA inside Mobile Menu */}
            <NavLink to="/order" className="nav-mobile-cta" onClick={closeMobile}>
              <span>🛒 Place Today's Order</span>
              <span aria-hidden="true">➔</span>
            </NavLink>

            {/* Mobile Navigation Links */}
            <div className="nav-mobile-links">
              {mainLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => (isActive ? 'nav-mobile-link active' : 'nav-mobile-link')}
                  onClick={closeMobile}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{link.icon}</span>
                    <span>{link.label}</span>
                  </span>
                  <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>›</span>
                </NavLink>
              ))}

              <NavLink
                to="/cart"
                className={({ isActive }) => (isActive ? 'nav-mobile-link active' : 'nav-mobile-link')}
                onClick={closeMobile}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🧺</span>
                  <span>My Cart</span>
                </span>
                {totalCount > 0 ? (
                  <span
                    style={{
                      background: 'var(--carrot)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {totalCount} item{totalCount === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>›</span>
                )}
              </NavLink>

              {user && (
                <NavLink
                  to="/my-orders"
                  className={({ isActive }) => (isActive ? 'nav-mobile-link active' : 'nav-mobile-link')}
                  onClick={closeMobile}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📦</span>
                    <span>My Previous Orders &amp; Bills</span>
                  </span>
                  <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>›</span>
                </NavLink>
              )}

              {user?.role === 'admin' && (
                <a
                  href={adminUrl}
                  className="nav-mobile-link nav-mobile-admin"
                  onClick={closeMobile}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className="admin-status-dot" />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><ShieldIcon size={16} /> Dedicated Admin Portal</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#1b4d3e', fontWeight: 700 }}>Open ↗</span>
                </a>
              )}
            </div>

            {/* Quick Helper Info */}
            <div className="nav-mobile-footer-info">
              <span>🌾 100% Farm-Fresh Vegetables · Washed &amp; Cut</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: '2px', fontWeight: 500 }}>
                Morning Delivery 6:00 AM – 7:00 AM across Chennai
              </span>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
