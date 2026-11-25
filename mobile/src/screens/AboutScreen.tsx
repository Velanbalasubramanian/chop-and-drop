import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Header from '../components/Header'
import { THEME } from '../config'

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Header title="About Easy Foods" showCart={false} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>The Easy Foods Story</Text>
          <Text style={styles.title}>
            Skip the chopping board.{'\n'}Save forty minutes every morning.
          </Text>

          <Text style={styles.paragraph}>
            Easy Foods was born out of a simple reality in Chennai households and messes: cooking tasty, healthy food isn't what eats up time — it's the peeling, washing, and chopping.
          </Text>

          <Text style={styles.paragraph}>
            We start at 4:00 AM every morning. Vegetables arrive fresh from Koyambedu and local farms. They are washed three times in ozonated water, diced by precision food-grade machinery, packed in sealed eco-pouches, and delivered to your doorstep before 7:00 AM.
          </Text>
        </View>

        {/* 3 Pillars */}
        <View style={styles.pillarCard}>
          <View style={styles.pillarItem}>
            <Ionicons name="sparkles" size={24} color={THEME.colors.primary} />
            <Text style={styles.pillarTitle}>Zero Overnight Pre-Cut</Text>
            <Text style={styles.pillarDesc}>
              Nothing sits in cold storage overnight. Every piece is cut the very morning it reaches your cooking pan.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.pillarItem}>
            <Ionicons name="water" size={24} color={THEME.colors.primary} />
            <Text style={styles.pillarTitle}>Triple Washed & Cleaned</Text>
            <Text style={styles.pillarDesc}>
              No mud, no pesticide residue, and no rotten leaves. Ready to drop directly into your kadai or cooker.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.pillarItem}>
            <Ionicons name="bicycle" size={24} color={THEME.colors.primary} />
            <Text style={styles.pillarTitle}>Early Morning 6-7 AM Drop</Text>
            <Text style={styles.pillarDesc}>
              Scheduled around Chennai morning school and office cooking routines.
            </Text>
          </View>
        </View>

        {/* Kitchen Location */}
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>Central Prep Kitchen</Text>
          <Text style={styles.locationAddress}>
            Easy Foods Processing Facility{'\n'}
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
