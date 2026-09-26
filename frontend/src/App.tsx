import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CartBar from './components/CartBar'
import { ShieldIcon } from './components/Icons'
import { useTrackVisit } from './hooks/useTrackVisit'
import Home from './pages/Home'
import Products from './pages/Products'
import About from './pages/About'
import Order from './pages/Order'
import Cart from './pages/Cart'
import TrackOrder from './pages/TrackOrder'
import Login from './pages/Login'
import OtpLogin from './pages/OtpLogin'
import Register from './pages/Register'
import MyOrders from './pages/MyOrders'
import HelpSupport from './pages/HelpSupport'

function AdminRedirect() {
  useEffect(() => {
    // Automatically redirect to dedicated Admin portal on port 5174
    window.location.href = 'http://localhost:5174'
  }, [])

  return (
    <div style={{ maxWidth: 500, margin: '5rem auto', textAlign: 'center', padding: '2.5rem 1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid var(--line)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', color: '#294a2c' }}><ShieldIcon size={44} /></div>
      <h2 style={{ color: 'var(--leaf-deep)', margin: '0 0 0.5rem' }}>Opening Dedicated Admin Portal…</h2>
      <p style={{ color: 'var(--ink-soft)', margin: '0 0 1.5rem', fontSize: '0.95rem' }}>
        Admin is in its own separate folder running independently on <strong>port 5174</strong>.
      </p>
      <a href="http://localhost:5174" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
        Open Admin Portal (port 5174) ➔
      </a>
    </div>
  )
}

export default function App() {
  useTrackVisit()

  return (
    <div className="app-shell">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/about" element={<About />} />
          <Route path="/order" element={<Order />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/login" element={<Login />} />
          <Route path="/otp-login" element={<OtpLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/help" element={<HelpSupport />} />
          <Route path="/support" element={<HelpSupport />} />
          <Route path="/admin/*" element={<AdminRedirect />} />
        </Routes>
      </main>
      <Footer />
      <CartBar />
    </div>
  )
}
