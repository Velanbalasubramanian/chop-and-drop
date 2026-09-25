import { products } from '../data/products'
import ProductCard from '../components/ProductCard'

export default function Products() {
  return (
    <section className="section page-section">
      <p className="page-eyebrow">Our packs</p>
      <h1>Cut the way your recipe needs it</h1>
      <p className="page-intro">
        Every pack is washed, cut and packed the same morning. Quantities below are for one pack —
        tell us your household or kitchen size when you order and we'll scale it.
      </p>
      <div className="product-grid product-grid-wide">
        {products.map((product) => (
          <ProductCard product={product} key={product.id} />
        ))}
      </div>
    </section>
  )
}
