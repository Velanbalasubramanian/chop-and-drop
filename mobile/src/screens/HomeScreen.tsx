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

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const { products, refreshProducts } = useCart()
  const [refreshing, setRefreshing] = React.useState(false)

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await refreshProducts()
    setRefreshing(false)
  }, [refreshProducts])

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
              <Text style={styles.heroBadgeText}>🌱 100% Farm Fresh</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>⚡ 0 Prep Time</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Skip the chopping board.{'\n'}
            <Text style={{ color: THEME.colors.primary }}>Start cooking right away.</Text>
          </Text>

          <Text style={styles.heroSub}>
            Washed, hygienic, and finely chopped vegetables delivered every morning to your doorstep across Chennai.
          </Text>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroPrimaryBtn}
              onPress={() => navigation.navigate('ProductsTab')}
              activeOpacity={0.85}
            >
              <Text style={styles.heroPrimaryBtnText}>Order Today's Cut</Text>
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

        {/* Feature Steps */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>How It Reaches Your Kitchen</Text>
          <Text style={styles.sectionSub}>Morning freshness guarantee</Text>
        </View>

        <View style={styles.stepsContainer}>
          <View style={styles.stepItem}>
            <View style={styles.stepIconBox}>
              <Ionicons name="restaurant-outline" size={20} color={THEME.colors.primary} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>1. You pick your packs</Text>
              <Text style={styles.stepDesc}>Sambar mix, poriyal mix, cleaned greens, or daily salads.</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIconBox}>
              <Ionicons name="water-outline" size={20} color={THEME.colors.primary} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>2. Washed & cut at 4 AM</Text>
              <Text style={styles.stepDesc}>Triple-washed and freshly diced the same morning.</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIconBox}>
              <Ionicons name="bicycle-outline" size={20} color={THEME.colors.primary} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>3. Doorstep by 7 AM</Text>
              <Text style={styles.stepDesc}>Delivered right on time before your morning cooking begins.</Text>
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
})
