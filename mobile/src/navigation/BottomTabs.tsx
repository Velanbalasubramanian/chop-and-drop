import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import HomeScreen from '../screens/HomeScreen'
import ProductsScreen from '../screens/ProductsScreen'
import CartScreen from '../screens/CartScreen'
import TrackOrderScreen from '../screens/TrackOrderScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { THEME } from '../config'
import { useCart } from '../context/CartContext'

const Tab = createBottomTabNavigator()

export default function BottomTabs() {
  const { totalCount } = useCart()

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelPosition: 'beside-icon',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          height: Platform.OS === 'ios' ? 74 : 56,
          paddingBottom: Platform.OS === 'ios' ? 18 : 6,
          paddingTop: 6,
          paddingHorizontal: 2,
        },
        tabBarItemStyle: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginLeft: 2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <View style={styles.activeIconCircle}>
                <Ionicons name="home" size={12} color="#ffffff" />
              </View>
            ) : (
              <Ionicons name="home-outline" size={18} color={color} />
            ),
        }}
      />

      <Tab.Screen
        name="ProductsTab"
        component={ProductsScreen}
        options={{
          tabBarLabel: 'Store',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <View style={styles.activeIconCircle}>
                <Ionicons name="grid" size={12} color="#ffffff" />
              </View>
            ) : (
              <Ionicons name="grid-outline" size={18} color={color} />
            ),
        }}
      />

      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarBadge: totalCount > 0 ? totalCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: THEME.colors.primary,
            fontSize: 9,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <View style={styles.activeIconCircle}>
                <Ionicons name="bag-handle" size={12} color="#ffffff" />
              </View>
            ) : (
              <Ionicons name="bag-handle-outline" size={18} color={color} />
            ),
        }}
      />

      <Tab.Screen
        name="TrackTab"
        component={TrackOrderScreen}
        options={{
          tabBarLabel: 'Track',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <View style={styles.activeIconCircle}>
                <Ionicons name="navigate" size={12} color="#ffffff" />
              </View>
            ) : (
              <Ionicons name="navigate-outline" size={18} color={color} />
            ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <View style={styles.activeIconCircle}>
                <Ionicons name="person" size={12} color="#ffffff" />
              </View>
            ) : (
              <Ionicons name="person-circle-outline" size={18} color={color} />
            ),
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  activeIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
