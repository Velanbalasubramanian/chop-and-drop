import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { THEME } from '../config'
import { useCart } from '../context/CartContext'

interface HeaderProps {
  title?: string
  showCart?: boolean
  showBack?: boolean
}

export default function Header({
  title = 'Easy Foods',
  showCart = true,
  showBack,
}: HeaderProps) {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { totalCount } = useCart()

  const isHomeScreen = title === 'Easy Foods' || title === 'Chop & Drop' || route?.name === 'Home' || route?.name === 'HomeTab'
  const displayBack = showBack !== undefined ? showBack : !isHomeScreen

  function handleBack() {
    // 1. If a specific previous route was passed in params, go there
    if (route.params?.from) {
      const from = route.params.from
      if (['HomeTab', 'ProductsTab', 'CartTab', 'TrackTab', 'ProfileTab'].includes(from)) {
        navigation.navigate('MainTabs', { screen: from })
        return
      }
      navigation.navigate(from)
      return
    }

    // 2. If on Cart page, always return to Packs (ProductsTab)
    if (title === 'Your Cart') {
      navigation.navigate('MainTabs', { screen: 'ProductsTab' })
      return
    }

    // 3. If navigation history can go back, go back
    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }

    const parent = navigation.getParent()
    if (parent && parent.canGoBack()) {
      parent.goBack()
      return
    }

    // 4. Fallback to Home
    navigation.navigate('MainTabs', { screen: 'HomeTab' })
  }

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {displayBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
          </TouchableOpacity>
        )}

        {/* Brand Logo on Home Screen */}
        {isHomeScreen && (
          <View style={styles.brandLogo}>
            <Ionicons name="leaf" size={17} color="#ffffff" />
          </View>
        )}

        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {isHomeScreen ? 'Fresh Cut Vegetables · Delivered Daily' : 'Easy Foods · Daily Fresh'}
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        {showCart && (
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'CartTab', params: { from: route?.name || 'HomeTab' } })}
            activeOpacity={0.8}
          >
            <Ionicons name="bag-handle-outline" size={22} color={THEME.colors.primary} />
            {totalCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalCount > 99 ? '99+' : totalCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  cartButton: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: THEME.colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
})
