import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import BottomTabs from './BottomTabs'
import ProductsScreen from '../screens/ProductsScreen'
import CartScreen from '../screens/CartScreen'
import CheckoutScreen from '../screens/CheckoutScreen'
import TrackOrderScreen from '../screens/TrackOrderScreen'
import MyOrdersScreen from '../screens/MyOrdersScreen'
import LoginScreen from '../screens/LoginScreen'
import OtpLoginScreen from '../screens/OtpLoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import SupportScreen from '../screens/SupportScreen'
import AboutScreen from '../screens/AboutScreen'

const Stack = createNativeStackNavigator()

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen name="Products" component={ProductsScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
      <Stack.Screen name="OrdersTab" component={MyOrdersScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OtpLogin" component={OtpLoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  )
}
