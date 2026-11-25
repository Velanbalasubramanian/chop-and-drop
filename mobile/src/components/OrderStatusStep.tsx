import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../config'
import type { OrderStatus } from '../types'

const STEP_LABELS: Record<OrderStatus, { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }> = {
  received: {
    title: 'Order Received',
    subtitle: 'We have received your Zippo order',
    icon: 'receipt-outline',
  },
  confirmed: {
    title: 'Order Confirmed',
    subtitle: 'Assigned to nearest fulfillment center',
    icon: 'checkmark-circle-outline',
  },
  preparing: {
    title: 'Packing & Quality Check',
    subtitle: 'Items picked, verified and carefully packed',
    icon: 'cube-outline',
  },
  out_for_delivery: {
    title: 'Out for Delivery',
    subtitle: 'Our delivery partner is on the way to your door',
    icon: 'bicycle-outline',
  },
  delivered: {
    title: 'Delivered',
    subtitle: 'Your order has been safely delivered!',
    icon: 'home-outline',
  },
  cancelled: {
    title: 'Order Cancelled',
    subtitle: 'Order has been cancelled / refunded',
    icon: 'close-circle-outline',
  },
}

const ORDERED_STEPS: OrderStatus[] = [
  'received',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
]

interface OrderStatusStepProps {
  currentStatus: OrderStatus
}

export default function OrderStatusStep({ currentStatus }: OrderStatusStepProps) {
  if (currentStatus === 'cancelled') {
    return (
      <View style={styles.cancelledBox}>
        <Ionicons name="alert-circle" size={32} color={THEME.colors.danger} />
        <Text style={styles.cancelledTitle}>This order was cancelled</Text>
        <Text style={styles.cancelledSub}>If you requested a refund, it will be processed shortly.</Text>
      </View>
    )
  }

  const currentIndex = ORDERED_STEPS.indexOf(currentStatus)

  return (
    <View style={styles.container}>
      {ORDERED_STEPS.map((step, index) => {
        const isDone = currentIndex > index
        const isCurrent = currentIndex === index
        const isPending = currentIndex < index
        const info = STEP_LABELS[step]
        const isLast = index === ORDERED_STEPS.length - 1

        return (
          <View key={step} style={styles.stepRow}>
            {/* Left column: circle indicator + connecting line */}
            <View style={styles.indicatorCol}>
              <View
                style={[
                  styles.circle,
                  isDone && styles.circleDone,
                  isCurrent && styles.circleCurrent,
                  isPending && styles.circlePending,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                ) : (
                  <Ionicons
                    name={info.icon}
                    size={15}
                    color={isCurrent ? '#ffffff' : THEME.colors.textMuted}
                  />
                )}
              </View>

              {!isLast && (
                <View
                  style={[
                    styles.line,
                    isDone ? styles.lineDone : styles.linePending,
                  ]}
                />
              )}
            </View>

            {/* Right column: text */}
            <View style={styles.textCol}>
              <View style={styles.labelRow}>
                <Text
                  style={[
                    styles.title,
                    isCurrent && styles.titleCurrent,
                    isPending && styles.titlePending,
                  ]}
                >
                  {info.title}
                </Text>
                {isCurrent && (
                  <View style={styles.liveTag}>
                    <Text style={styles.liveTagText}>IN PROGRESS</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.subtitle,
                  isPending && styles.subtitlePending,
                ]}
              >
                {info.subtitle}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 64,
  },
  indicatorCol: {
    alignItems: 'center',
    width: 36,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleDone: {
    backgroundColor: THEME.colors.vegGreen,
  },
  circleCurrent: {
    backgroundColor: THEME.colors.primary,
    borderWidth: 2,
    borderColor: '#ffedd5',
  },
  circlePending: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: THEME.colors.vegGreen,
  },
  linePending: {
    backgroundColor: THEME.colors.border,
  },
  textCol: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 4,
    paddingBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  titleCurrent: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  titlePending: {
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  liveTag: {
    backgroundColor: THEME.colors.badge,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveTagText: {
    color: THEME.colors.badgeText,
    fontSize: 9,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  subtitlePending: {
    color: '#94a3b8',
  },
  cancelledBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
  cancelledSub: {
    fontSize: 12,
    color: '#991b1b',
    textAlign: 'center',
  },
})
