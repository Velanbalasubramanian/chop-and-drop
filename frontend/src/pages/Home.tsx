import { Link } from 'react-router-dom'
import { ClockIcon, KnifeIcon, TruckIcon } from '../components/Icons'
import { products } from '../data/products'
import ProductCard from '../components/ProductCard'

const steps = [
  {
    icon: KnifeIcon,
    title: 'You pick what you need',
    body: 'Choose from ready packs — sambar mix, poriyal mix, salad mix — or tell us your regular order.',
  },
  {
    icon: ClockIcon,
    title: 'We wash and chop that morning',
    body: 'Nothing sits pre-cut overnight. Vegetables are cleaned and cut the same morning they reach you.',
  },
  {
    icon: TruckIcon,
    title: 'It reaches your door by 7 AM',
    body: 'Pick a delivery slot that fits your cooking time, daily or on the days you choose.',
  },
]

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="hero-eyebrow">Fresh-cut vegetables for your kitchen</p>
          <h1>
            Skip the chopping board.
            <br />
            Start cooking straight away.
          </h1>
          <p className="hero-sub">
            Easy Foods washes, cuts and delivers vegetables every morning — for busy homes, hostels
            and small hotel kitchens across Chennai. You save the forty minutes at the cutting board.
          </p>
          <div className="hero-actions">
            <Link to="/order" className="btn btn-primary">
              Place today's order
            </Link>
            <Link to="/products" className="btn btn-ghost">
              See what's on offer
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-floating-badge hero-badge-top">🌱 100% Farm Fresh</div>
          <div className="hero-card hero-card-1">
            <span className="hero-card-label">Today's cut</span>
            <span className="hero-card-value">Sambar Mix</span>
          </div>
          <div className="hero-card hero-card-2">
            <span className="hero-card-label">Delivery slot</span>
            <span className="hero-card-value">6:00 – 7:00 AM</span>
          </div>
          <div className="hero-floating-badge hero-badge-bottom">⚡ Ready to Cook · 0 Prep</div>
          <div className="hero-blob" />
        </div>
      </section>

      <section className="section steps-section">
        <h2>How it reaches your kitchen</h2>
        <div className="steps-grid">
          {steps.map((step) => (
            <div className="step-card" key={step.title}>
              <step.icon className="step-icon" />
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section featured-section">
        <div className="section-heading-row">
          <h2>Popular this week</h2>
          <Link to="/products" className="text-link">
            View all packs →
          </Link>
        </div>
        <div className="product-grid">
          {products.slice(0, 3).map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </section>

      <section className="section cta-section">
        <div className="cta-box">
          <h2>Cooking for a mess or small hotel?</h2>
          <p>We supply bulk cut vegetables on a standing schedule, sized to your kitchen's daily count.</p>
          <Link to="/order" className="btn btn-primary">
            Set up a bulk order
          </Link>
        </div>
      </section>
    </>
  )
}

