export default function About() {
  return (
    <section className="section page-section about-section">
      <p className="page-eyebrow">Why we started</p>
      <h1>Your Everyday Delivery Hub across Chennai</h1>
      <div className="about-grid">
        <div className="about-copy">
          <p>
            Zippo was created to make everyday essentials accessible in minutes. Whether you need pre-cut vegetables to save cooking time, daily pantry groceries, fresh cakes for celebrations, 20L water cans, pooja flowers, or quick electrical hardware — Zippo brings everything right to your doorstep.
          </p>
          <p>
            Today we serve households, PG hostels, messes, and local communities who rely on speed and verified quality. Everything is packed fresh, sanitized, and delivered through our local fulfillment network.
          </p>
          <ul className="about-list">
            <li>Multi-category catalog: groceries, veggies, cakes, water &amp; electricals</li>
            <li>Triple-washed, fresh morning vegetable cuts</li>
            <li>Lightning fast delivery across Chennai neighborhoods</li>
            <li>Live real-time order tracking and prompt customer assistance</li>
          </ul>
        </div>
        <div className="about-panel">
          <span className="brand-badge-z" style={{ width: 44, height: 44, fontSize: '1.5rem', marginBottom: '1rem' }}>Z</span>
          <p className="about-panel-quote">
            "From morning cooking veggies to 20L water cans and emergency bulbs, Zippo has replaced multiple app orders with one seamless delivery."
          </p>
          <span className="about-panel-attribution">— Customer in Velachery, Chennai</span>
        </div>
      </div>
    </section>
  )
}

