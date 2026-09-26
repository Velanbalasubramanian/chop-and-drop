import { LeafIcon } from '../components/Icons'

export default function About() {
  return (
    <section className="section page-section about-section">
      <p className="page-eyebrow">Why we started</p>
      <h1>The chopping board was the slowest part of dinner</h1>
      <div className="about-grid">
        <div className="about-copy">
          <p>
            Easy Foods began in a Chennai kitchen where the vegetables took longer to cut than the
            sambar took to cook. We started sourcing straight from Koyambedu each night, cleaning and
            cutting before sunrise, and dropping packs at doorsteps before the morning rush began.
          </p>
          <p>
            Today we work with families, PG hostels and small hotel kitchens who would rather spend
            their morning cooking than cutting. Every vegetable is cut the same day it's delivered —
            nothing is chopped and stored for later.
          </p>
          <ul className="about-list">
            <li>Sourced fresh from Koyambedu market each night</li>
            <li>Washed three times and hand-cut every morning</li>
            <li>Packed in resealable, reusable containers</li>
            <li>Delivered on the schedule you choose, not a fixed one</li>
          </ul>
        </div>
        <div className="about-panel">
          <LeafIcon className="about-panel-icon" />
          <p className="about-panel-quote">
            "Our cooks used to lose an hour every morning to the cutting board. Now that hour goes into
            the food itself."
          </p>
          <span className="about-panel-attribution">— A mess kitchen we supply in Velachery</span>
        </div>
      </div>
    </section>
  )
}

