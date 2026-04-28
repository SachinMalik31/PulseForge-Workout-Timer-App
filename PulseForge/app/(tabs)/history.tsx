import React, { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useWorkout } from '@context/WorkoutContext'
import { useAppTheme } from '@context/ThemeContext'
import { BORDER_RADIUS, FONTS, SPACING } from '@constants'
import { formatTime } from '@utils/helpers'

export default function HistoryScreen() {
  const router = useRouter()
  const { history, getWorkoutStats } = useWorkout()
  const { colors } = useAppTheme()
  const stats = getWorkoutStats()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const sortedHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ),
    [history]
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const cards = [
    { icon: 'chart-box-outline', value: stats.total, label: 'TOTAL WORKOUTS' },
    { icon: 'clock-outline', value: stats.totalMinutes, label: 'TOTAL MINUTES' },
    { icon: 'calendar-week', value: stats.thisWeek, label: 'THIS WEEK' },
    { icon: 'calendar-month', value: stats.thisMonth, label: 'THIS MONTH' },
  ]

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>ACTIVITY</Text>

        <View style={styles.statsGrid}>
          {cards.map((card) => (
            <View key={card.label} style={styles.statCard}>
              <MaterialCommunityIcons name={card.icon as any} size={20} color={colors.primary} />
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {sortedHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="dumbbell" size={64} color={colors.surface} />
            <Text style={styles.emptyTitle}>NO HISTORY YET</Text>
            <Text style={styles.emptyBody}>Complete your first workout to get started.</Text>
            <Pressable
              onPress={() => router.replace('/(tabs)/workouts')}
              style={({ pressed }) => [styles.ghostButton, pressed && styles.pressedScale]}
            >
              <Text style={styles.ghostButtonText}>BROWSE WORKOUTS</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.historyList}>
            {sortedHistory.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.leftAccent} />
                <View style={styles.historyTextWrap}>
                  <Text style={styles.workoutName}>{item.workoutName}</Text>
                  <Text style={styles.workoutMeta}>
                    {formatDate(item.completedAt)} Â· {formatTime(item.durationSeconds)}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.grayLight} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  title: {
    marginTop: SPACING.sm,
    fontFamily: FONTS.condensed800,
    fontSize: 42,
    color: colors.black,
  },
  statsGrid: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: BORDER_RADIUS.xxl,
    padding: 16,
  },
  statValue: {
    marginTop: 8,
    fontFamily: FONTS.condensed800,
    fontSize: 40,
    color: colors.black,
    lineHeight: 42,
  },
  statLabel: {
    marginTop: 4,
    fontFamily: FONTS.inter500,
    fontSize: 12,
    letterSpacing: 1.3,
    color: colors.textSecondary,
  },
  emptyState: {
    marginTop: 56,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: SPACING.lg,
    fontFamily: FONTS.condensed700,
    fontSize: 24,
    color: colors.grayLight,
  },
  emptyBody: {
    marginTop: 8,
    fontFamily: FONTS.inter400,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  ghostButton: {
    marginTop: SPACING.lg,
    height: 48,
    borderRadius: BORDER_RADIUS.xxl,
    borderWidth: 1,
    borderColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ghostButtonText: {
    fontFamily: FONTS.condensed700,
    fontSize: 16,
    color: colors.black,
    letterSpacing: 1,
  },
  historyList: {
    marginTop: SPACING.xl,
    gap: 12,
  },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: BORDER_RADIUS.xxl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftAccent: {
    width: 4,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.primary,
    marginRight: 12,
  },
  historyTextWrap: {
    flex: 1,
  },
  workoutName: {
    fontFamily: FONTS.inter600,
    fontSize: 16,
    color: colors.black,
  },
  workoutMeta: {
    marginTop: 4,
    fontFamily: FONTS.inter400,
    fontSize: 13,
    color: colors.textSecondary,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
})
