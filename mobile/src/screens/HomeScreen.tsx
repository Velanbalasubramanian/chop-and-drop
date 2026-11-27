import React from 'react'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import Header from '../components/Header'
import ProductCard from '../components/ProductCard'
import CartBar from '../components/CartBar'
import { THEME } from '../config'
import { useCart } from '../context/CartContext'
import { getStores } from '../api'
import type { Store } from '../types'

const HOME_CATEGORIES = [
  { id: 'cut_veggies', title: 'Cut Veggies', target: 'Cut Veggies', icon: 'nutrition-outline', color: '#16a34a', bg: '#f0fdf4' },
  { id: 'grocery', title: 'Groceries', target: 'Groceries', icon: 'cart-outline', color: '#ea580c', bg: '#fff7ed' },
  { id: 'cakes', title: 'Cakes & Bakes', target: 'Cakes & Bakery', icon: 'gift-outline', color: '#db2777', bg: '#fdf2f8' },
  { id: 'water', title: '20L Water', target: '20L Water Cans', icon: 'water-outline', color: '#0284c7', bg: '#f0f9ff' },
  { id: 'flowers', title: 'Pooja Flowers', target: 'Pooja Flowers', icon: 'flower-outline', color: '#d97706', bg: '#fffbeb' },
  { id: 'electricals', title: 'Electricals', target: 'Electricals', icon: 'flash-outline', color: '#7c3aed', bg: '#f5f3ff' },
]

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const { products, refreshProducts } = useCart()
  const [stores, setStores] = React.useState<Store[]>([])
  const [refreshing, setRefreshing] = React.useState(false)

  const loadStores = React.useCallback(async () => {
    try {
      const data = await getStores()
      if (data && data.length > 0) {
        setStores(data)
      }
    } catch {}
  }, [])

  React.useEffect(() => {
    loadStores()
  }, [loadStores])

  const handleCategoryPress = (targetCategory: string) => {
    navigation.navigate('ProductsTab', {
      category: targetCategory,
      timestamp: Date.now(),
    })
  }

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refreshProducts(), loadStores()])
    setRefreshing(false)
  }, [refreshProducts, loadStores])

  const popular = products.slice(0, 3)

  return (
    <View style={styles.container}>
      <Header showBack={false} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.primary]}
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroBox}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>⚡ 10-Min Fast Delivery</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>🛒 All-In-One Super App</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Groceries, Veggies, Cakes & More.{'\n'}
            <Text style={{ color: THEME.colors.primary }}>Delivered in minutes with Zippo.</Text>
          </Text>

          <Text style={styles.heroSub}>
            Fresh cut vegetables, pantry groceries, celebration cakes, 20L water cans, pooja flowers, and electrical essentials delivered fast to your doorstep.
          </Text>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroPrimaryBtn}
              onPress={() => navigation.navigate('ProductsTab')}
              activeOpacity={0.85}
            >
              <Text style={styles.heroPrimaryBtnText}>Explore All Products</Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroSecondaryBtn}
              onPress={() => navigation.navigate('TrackTab')}
              activeOpacity={0.85}
            >
              <Text style={styles.heroSecondaryBtnText}>Track Order</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SWIGGY STYLE: FEATURED STORES & BAKERIES */}
        {stores.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>🏪 Top Stores &amp; Bakeries</Text>
                <Text style={styles.sectionSub}>Tap to explore direct outlet menus &amp; bakes</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingTop: 4, paddingBottom: 6 }}
            >
              {stores.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('ProductsTab', {
                      store: st.storeName,
                      category:
                        st.category === 'cakes'
                          ? 'Cakes & Bakery'
                          : st.category === 'grocery'
                          ? 'Groceries'
                          : 'Cut Veggies',
                      timestamp: Date.now(),
                    })
                  }
                  style={styles.storeCard}
                >
                  <View
                    style={[
                      styles.storeCardHeader,
                      {
                        backgroundColor:
                          st.category === 'cakes'
                            ? '#e11d48'
                            : st.category === 'grocery'
                            ? '#ea580c'
                            : '#059669',
                      },
                    ]}
                  >
                    <View style={styles.storeBadgeRow}>
                      <Text style={styles.storeCatBadge}>{st.category.toUpperCase()}</Text>
                      <Text style={styles.storeRatingBadge}>★ {st.rating || 4.9}</Text>
                    </View>
                    <Text style={styles.storeCardName} numberOfLines={1}>
                      {st.storeName}
                    </Text>
                    <Text style={styles.storeCardMeta}>
                      ⚡ {st.deliveryTime || '20-25 mins'} • 📍 {st.address}
                    </Text>
                  </View>
                  <View style={styles.storeCardBody}>
                    <Text style={styles.storePopularItems} numberOfLines={1}>
                      {st.sampleItems && st.sampleItems.length > 0
                        ? `Items: ${st.sampleItems.slice(0, 2).join(', ')}`
                        : `${st.itemCount || 0} items available`}
                    </Text>
                    <Text style={styles.storeExploreLink}>Open Menu →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Shop By Category Grid */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Shop By Category</Text>
            <Text style={styles.sectionSub}>Everything delivered right to your door</Text>
          </View>
        </View>

        <View style={styles.categoryGrid}>
          {HOME_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryTile, { backgroundColor: cat.bg }]}
              onPress={() => handleCategoryPress(cat.target)}
              activeOpacity={0.8}
            >
              <View style={[styles.catIconWrap, { backgroundColor: '#ffffff' }]}>
                <Ionicons name={cat.icon as any} size={22} color={cat.color} />
              </View>
              <Text style={styles.catTileTitle}>{cat.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feature Steps */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>How Zippo Works</Text>
          <Text style={styles.sectionSub}>Speed & quality guaranteed</Text>
        </View>

        <View style={styles.stepsContainer}>
          <View style={styles.stepItem}>
            <View style={styles.stepIconBox}>
              <Ionicons name="basket-outline" size={20} color={THEME.colors.primary} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>1. Choose From 100+ Products</Text>
              <Text style={styles.stepDesc}>Groceries, fresh cuts, bakery cakes, water cans & home hardware.</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIconBox}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color={THEME.colors.primary} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>2. Packed With Care & Hygiene</Text>
              <Text style={styles.stepDesc}>Triple-checked, sanitized and packaged right at your local hub.</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIconBox}>
              <Ionicons name="bicycle-outline" size={20} color={THEME.colors.primary} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>3. Fast Doorstep Delivery</Text>
              <Text style={styles.stepDesc}>Delivered right on time with real-time live order tracking.</Text>
            </View>
          </View>
        </View>

        {/* Popular Packs */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Popular This Week</Text>
            <Text style={styles.sectionSub}>Chennai kitchens' favorite mixes</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ProductsTab')}>
            <Text style={styles.seeAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        {popular.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}

        {/* Bulk Catering Promo */}
        <View style={styles.bulkBox}>
          <View style={styles.bulkIconCircle}>
            <Ionicons name="business-outline" size={24} color="#ffffff" />
          </View>
          <Text style={styles.bulkTitle}>Cooking for a Hostel or Mess?</Text>
          <Text style={styles.bulkDesc}>
            We provide custom bulk vegetable cuts (5kg to 50kg) for caterers and restaurants at wholesale rates.
          </Text>
          <TouchableOpacity
            style={styles.bulkBtn}
            onPress={() => navigation.navigate('ProductsTab')}
          >
            <Text style={styles.bulkBtnText}>Explore Bulk Kitchen Pack</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      <CartBar />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroBox: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  heroBadge: {
    backgroundColor: THEME.colors.vegGreenBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.vegGreen,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.text,
    lineHeight: 28,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: 18,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  heroPrimaryBtn: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  heroPrimaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  heroSecondaryBtn: {
    flex: 1,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  heroSecondaryBtnText: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  categoryTile: {
    width: '30%',
    flexGrow: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  catTileTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  sectionSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  seeAllText: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  stepsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    gap: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  stepDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  bulkBox: {
    backgroundColor: '#1e293b',
    margin: 16,
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
  },
  bulkIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bulkTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  bulkDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  bulkBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bulkBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  storeCard: {
    width: 250,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 6,
  },
  storeCardHeader: {
    padding: 12,
  },
  storeBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  storeCatBadge: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  storeRatingBadge: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  storeCardName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  storeCardMeta: {
    color: '#f8fafc',
    fontSize: 11,
    marginTop: 2,
    opacity: 0.9,
  },
  storeCardBody: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storePopularItems: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
    marginRight: 6,
  },
  storeExploreLink: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
})
