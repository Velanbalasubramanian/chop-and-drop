import React, { useMemo, useState } from 'react'
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
import Header from '../components/Header'
import ProductCard from '../components/ProductCard'
import CartBar from '../components/CartBar'
import { THEME } from '../config'
import { useCart } from '../context/CartContext'
import type { Product } from '../types'

const CATEGORIES = ['All Packs', 'Daily Gravy', 'Greens & Salads', 'Bulk Packs']

export default function ProductsScreen() {
  const { products, refreshProducts } = useCart()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Packs')
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await refreshProducts()
    setRefreshing(false)
  }, [refreshProducts])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.tamilName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (selectedCategory === 'All Packs') return true
      if (selectedCategory === 'Daily Gravy') {
        return p.id.includes('onion') || p.id.includes('sambar') || p.id.includes('poriyal')
      }
      if (selectedCategory === 'Greens & Salads') {
        return p.id.includes('salad') || p.id.includes('greens')
      }
      if (selectedCategory === 'Bulk Packs') {
        return p.id.includes('bulk')
      }
      return true
    })
  }, [products, search, selectedCategory])

  return (
    <View style={styles.container}>
      <Header title="Vegetable Packs" />

      {/* Search Input */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={THEME.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sambar mix, keerai, onion..."
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
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = item === selectedCategory
            return (
              <TouchableOpacity
                style={[styles.catPill, isSelected && styles.catPillActive]}
                onPress={() => setSelectedCategory(item)}
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

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
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
})
