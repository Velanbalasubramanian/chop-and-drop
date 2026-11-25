import React, { useEffect } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from './src/context/AuthContext'
import { CartProvider } from './src/context/CartContext'
import RootNavigator from './src/navigation/RootNavigator'

const isWeb = Platform.OS === 'web'

export default function App() {
  // Inject global CSS and dynamic theme favicon for web
  useEffect(() => {
    if (isWeb && typeof document !== 'undefined') {
      document.title = 'Easy Foods - Fresh Cut Vegetables'

      // Clean, theme-based Orange + Pure White SVG Favicon Data URI (no green)
      const svgIconData = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23ea580c%22%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23b34618%22%2F%3E%0A%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%3C%2Fdefs%3E%0A%20%20%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2216%22%20fill%3D%22url(%23g)%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M16%2038%20C16%2022%2028%2014%2048%2014%20C48%2034%2040%2048%2026%2048%20C20%2048%2016%2044%2016%2038%20Z%22%20fill%3D%22%23ffffff%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M20%2044%20C28%2036%2036%2026%2046%2016%22%20stroke%3D%22%23ea580c%22%20stroke-width%3D%222.8%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%2243%22%20cy%3D%2239%22%20r%3D%224.5%22%20fill%3D%22%23ffffff%22%2F%3E%0A%3C%2Fsvg%3E'

      // Remove any stale or default Metro favicons
      const staleIcons = document.querySelectorAll("link[rel*='icon']")
      staleIcons.forEach((el) => el.remove())

      // Inject theme favicon dynamically
      const link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/svg+xml'
      link.href = svgIconData
      document.head.appendChild(link)

      const styleId = 'mobile-web-viewport-fix'
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style')
        style.id = styleId
        style.textContent = `
          html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background-color: #0f172a !important;
          }
          #root {
            display: flex !important;
            height: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
        `
        document.head.appendChild(style)
      }
    }
  }, [])

  return (
    <View style={styles.outerContainer}>
      <View style={styles.mobileShell}>
        <SafeAreaProvider>
          <AuthProvider>
            <CartProvider>
              <NavigationContainer>
                <StatusBar style="dark" />
                <RootNavigator />
              </NavigationContainer>
            </CartProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    backgroundColor: isWeb ? '#0f172a' : '#ffffff',
  },
  mobileShell: {
    flex: 1,
    width: '100%',
    maxWidth: isWeb ? 460 : '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    ...(isWeb
      ? {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 28,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: '#1e293b',
        }
      : {}),
  },
})
