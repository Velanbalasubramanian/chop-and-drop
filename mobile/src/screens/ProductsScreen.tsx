import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRoute } from '@react-navigation/native'
import Header from '../components/Header'
import ProductCard from '../components/ProductCard'
import CartBar from '../components/CartBar'
import { THEME } from '../config'
import { useCart } from '../context/CartContext'
import type { Product } from '../types'

const CATEGORIES = [
  'All',
  'Cut Veggies',
  'Groceries',
  'Cakes & Bakery',
  '20L Water Cans',
  'Pooja Flowers',
  'Electricals',
]

const CATEGORY_MAP: Record<string, string> = {
  all: 'All',
  All: 'All',
  cut_veggies: 'Cut Veggies',
  'Cut Veggies': 'Cut Veggies',
  grocery: 'Groceries',
  groceries: 'Groceries',
  'Groceries': 'Groceries',
  cakes: 'Cakes & Bakery',
  'Cakes & Bakes': 'Cakes & Bakery',
  'Cakes & Bakery': 'Cakes & Bakery',
  water: '20L Water Cans',
  '20L Water': '20L Water Cans',
  '20L Water Cans': '20L Water Cans',
  flowers: 'Pooja Flowers',
  'Pooja Flowers': 'Pooja Flowers',
  electricals: 'Electricals',
  'Electricals': 'Electricals',
}

export default function ProductsScreen() {
  const route = useRoute<any>()
  const { products, refreshProducts, stockAlert, clearStockAlert } = useCart()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [refreshing, setRefreshing] = useState(false)

  const productsListRef = useRef<FlatList>(null)
  const categoryListRef = useRef<FlatList>(null)

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await refreshProducts()
    setRefreshing(false)
  }, [refreshProducts])

  const scrollToTop = () => {
    try {
      productsListRef.current?.scrollToOffset({ offset: 0, animated: false })
      requestAnimationFrame(() => {
        productsListRef.current?.scrollToOffset({ offset: 0, animated: false })
      })
      setTimeout(() => {
        productsListRef.current?.scrollToOffset({ offset: 0, animated: false })
      }, 50)
      setTimeout(() => {
        productsListRef.current?.scrollToOffset({ offset: 0, animated: false })
      }, 150)
    } catch {
      // Safe fallback
    }
  }

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName)
    scrollToTop()

    // Scroll horizontal category bar to the active pill
    const catIndex = CATEGORIES.indexOf(catName)
    if (catIndex >= 0) {
      setTimeout(() => {
        try {
          categoryListRef.current?.scrollToIndex({
            index: catIndex,
            animated: true,
            viewPosition: 0.5,
          })
        } catch {
          // Safe fallback if items layout pending
        }
      }, 50)
    }
  }

  // Auto-select category and scroll to top when navigated with params
  useEffect(() => {
    const rawTarget = route.params?.category
    if (rawTarget) {
      const resolved = CATEGORY_MAP[rawTarget] || rawTarget
      if (CATEGORIES.includes(resolved)) {
        setSearch('')
        handleSelectCategory(resolved)
        scrollToTop()
      }
    }
    if (route.params?.store) {
      setSearch(route.params.store)
      scrollToTop()
    }
  }, [route.params?.category, route.params?.store, route.params?.timestamp])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (p.name?.toLowerCase() || '').includes(q) ||
        (p.tamilName?.toLowerCase() || '').includes(q) ||
        (p.description?.toLowerCase() || '').includes(q) ||
        (p.storeName?.toLowerCase() || '').includes(q) ||
        ((p as any).partnerName?.toLowerCase() || '').includes(q) ||
        ((p as any).ownerName?.toLowerCase() || '').includes(q)

      if (!matchesSearch) return false

      const cat = (p.category || '').toLowerCase()
      if (selectedCategory === 'All') return true
      if (selectedCategory === 'Cut Veggies') {
        return cat === 'cut_veggies' || cat.includes('veg') || (!p.category && (p.id.includes('mix') || p.id.includes('bulk')))
      }
      if (selectedCategory === 'Groceries') return cat === 'grocery' || cat === 'groceries'
      if (selectedCategory === 'Cakes & Bakery') return cat === 'cakes' || cat.includes('cake') || cat.includes('bake')
      if (selectedCategory === '20L Water Cans') return cat === 'water' || cat.includes('water')
      if (selectedCategory === 'Pooja Flowers') return cat === 'flowers' || cat.includes('flower')
      if (selectedCategory === 'Electricals') return cat === 'electricals' || cat.includes('elect')
      return true
    })
  }, [products, search, selectedCategory])

  return (
    <View style={styles.container}>
      <Header title="Zippo Store" />

      {/* Search Input */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={THEME.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search veggies, groceries, cakes, water..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Horizontal Scroll */}
      <View style={styles.categoryBar}>
        <FlatList
          ref={categoryListRef}
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          keyExtractor={(item) => item}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item }) => {
            const isSelected = item === selectedCategory
            return (
              <TouchableOpacity
                style={[styles.catPill, isSelected && styles.catPillActive]}
                onPress={() => handleSelectCategory(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catText, isSelected && styles.catTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {/* Real-time Red Stock Alert Toast Banner */}
      {stockAlert && (
        <View style={styles.stockAlertBanner}>
          <Ionicons name="alert-circle" size={18} color="#dc2626" />
          <Text style={styles.stockAlertText}>{stockAlert}</Text>
          <TouchableOpacity onPress={clearStockAlert} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      )}

      {/* Products List */}
      <FlatList
        ref={productsListRef}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        extraData={products}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.primary]}
          />
        }
        renderItem={({ item }) => <ProductCard product={item} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="leaf-outline" size={48} color={THEME.colors.textMuted} />
            <Text style={styles.emptyTitle}>No packs found</Text>
            <Text style={styles.emptySub}>Try searching with different keywords</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      <CartBar />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: THEME.colors.surface,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.text,
  },
  categoryBar: {
    paddingVertical: 10,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catPillActive: {
    backgroundColor: THEME.colors.primaryLight,
    borderColor: THEME.colors.primary,
  },
  catText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  catTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: 10,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  stockAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 8,
  },
  stockAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
    lineHeight: 16,
  },
})
