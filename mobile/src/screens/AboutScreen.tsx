import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Header from '../components/Header'
import { THEME } from '../config'

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Header title="About Zippo" showCart={false} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>The Zippo Story</Text>
          <Text style={styles.title}>
            Your Everyday Delivery Hub.{'\n'}Groceries, Veggies, Cakes & More.
          </Text>

          <Text style={styles.paragraph}>
            Zippo is built for Chennai's fast-moving lifestyle. Whether you need pre-cut vegetables for quick morning cooking, daily pantry groceries, celebratory cakes, 20L water cans, fresh pooja flowers, or quick electrical replacements — Zippo delivers it all in minutes.
          </Text>

          <Text style={styles.paragraph}>
            From farm-fresh produce sourced daily to trusted packaged goods and lightning-fast local logistics, Zippo connects your home with everything you need, hassle-free.
          </Text>
        </View>

        {/* 3 Pillars */}
        <View style={styles.pillarCard}>
          <View style={styles.pillarItem}>
            <Ionicons name="flash" size={24} color={THEME.colors.primary} />
            <Text style={styles.pillarTitle}>Lightning Fast Delivery</Text>
            <Text style={styles.pillarDesc}>
              Speed and reliability from local dark stores and fulfillment hubs straight to your door.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.pillarItem}>
            <Ionicons name="sparkles" size={24} color={THEME.colors.primary} />
            <Text style={styles.pillarTitle}>100% Quality & Hygiene</Text>
            <Text style={styles.pillarDesc}>
              Triple-washed vegetables, brand-sealed groceries, fresh oven-baked cakes, and sanitized water cans.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.pillarItem}>
            <Ionicons name="cube" size={24} color={THEME.colors.primary} />
            <Text style={styles.pillarTitle}>Multi-Category Convenience</Text>
            <Text style={styles.pillarDesc}>
              No need for 5 different apps. Order dinner veggies, water cans, and birthday cakes all in one single cart.
            </Text>
          </View>
        </View>

        {/* Kitchen Location */}
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>Zippo Fulfillment Hub</Text>
          <Text style={styles.locationAddress}>
            Zippo Quick-Commerce Operations{'\n'}
            14, Anna Salai, Guindy, Chennai – 600032{'\n'}
            Tamil Nadu, India
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.text,
    lineHeight: 24,
    marginVertical: 8,
  },
  paragraph: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 20,
    marginTop: 8,
  },
  pillarCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  pillarItem: {
    gap: 6,
  },
  pillarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  pillarDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  locationCard: {
    backgroundColor: THEME.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: THEME.borderRadius.md,
    padding: 16,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.badgeText,
    marginBottom: 6,
  },
  locationAddress: {
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 20,
  },
})
