import React, { useEffect } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import RiderHomeScreen from './src/screens/RiderHomeScreen'

const isWeb = Platform.OS === 'web'

export default function App() {
  useEffect(() => {
    if (isWeb && typeof document !== 'undefined') {
      document.title = 'Zippo Rider — Delivery Partner App'

      const styleId = 'rider-web-viewport-fix'
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style')
        style.id = styleId
        style.textContent = `
          html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background-color: #020617 !important;
          }
          #root {
            display: flex !important;
            height: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            justify-content: center !important;
            align-items: center !important;
          }
        `
        document.head.appendChild(style)
      }
    }
  }, [])

  return (
    <View style={styles.outerContainer}>
      <View style={styles.mobileShell}>
        <SafeAreaProvider style={styles.shellInner}>
          <StatusBar style="light" />
          <RiderHomeScreen />
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
    justifyContent: 'center',
    backgroundColor: isWeb ? '#020617' : '#0f172a',
  },
  mobileShell: {
    flex: 1,
    width: '100%',
    maxWidth: isWeb ? 500 : '100%',
    height: '100%',
    backgroundColor: '#0f172a',
    borderLeftWidth: isWeb ? 1 : 0,
    borderRightWidth: isWeb ? 1 : 0,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  shellInner: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
})
