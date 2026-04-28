import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useUser } from '@hooks/useUser'
import { useWorkout } from '@context/WorkoutContext'
import { useAppTheme } from '@context/ThemeContext'
import { BORDER_RADIUS, FONTS, SPACING } from '@constants'
import { calculateWorkoutDuration, formatMinutes } from '@utils/helpers'
import { getWorkoutImageUrl, WORKOUT_BLURHASH } from '@utils/workoutImages'
import { Workout } from '@types'

const FILTERS = ['ALL', 'CARDIO', 'STRENGTH', 'HIIT', 'BEGINNER', 'ADVANCED'] as const

function WorkoutCover({ workout }: { workout: Workout }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <View style={coverStyles.imageFallback}>
        <Text style={coverStyles.imageFallbackText}>{workout.type.charAt(0).toUpperCase()}</Text>
      </View>
    )
  }

  return (
    <Image
      source={{ uri: getWorkoutImageUrl(workout) }}
      style={coverStyles.coverImage}
      contentFit="cover"
      transition={300}
      placeholder={{ blurhash: WORKOUT_BLURHASH }}
      onError={() => setFailed(true)}
    />
  )
}

const coverStyles = StyleSheet.create({
  coverImage: { ...StyleSheet.absoluteFillObject },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFallbackText: {
    fontFamily: FONTS.condensed700,
    fontSize: 32,
    color: '#FFFFFF',
  },
})

export default function WorkoutsScreen() {
  const router = useRouter()
  const { firstName } = useUser()
  const { workouts, selectWorkout } = useWorkout()
  const { colors } = useAppTheme()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('ALL')

  const filteredWorkouts = useMemo(() => {
    return workouts.filter((workout) => {
      const queryMatch = workout.name.toLowerCase().includes(search.toLowerCase())

      if (activeFilter === 'ALL') return queryMatch
      if (activeFilter === 'CARDIO') return queryMatch && workout.type === 'Cardio'
      if (activeFilter === 'STRENGTH') return queryMatch && workout.type === 'Strength'
      if (activeFilter === 'HIIT') return queryMatch && workout.type === 'HIIT'
      if (activeFilter === 'BEGINNER') return queryMatch && workout.difficulty === 'Beginner'
      if (activeFilter === 'ADVANCED') return queryMatch && workout.difficulty === 'Advanced'

      return queryMatch
    })
  }, [workouts, search, activeFilter])

  const styles = useMemo(() => makeStyles(colors), [colors])

  const featuredWorkout = filteredWorkouts[0]
  const gridWorkouts = filteredWorkouts.slice(1)
  const cardValues = useRef<Animated.Value[]>([])

  useEffect(() => {
    const totalCards = filteredWorkouts.length
    cardValues.current = Array.from({ length: totalCards }).map(
      (_, index) => cardValues.current[index] || new Animated.Value(0)
    )

    cardValues.current.forEach((value) => value.setValue(0))

    Animated.stagger(
      60,
      cardValues.current.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        })
      )
    ).start()
  }, [filteredWorkouts])

  const handleSelectWorkout = (workout: Workout) => {
    selectWorkout(workout)
    router.push('/start-workout')
  }

  const meta = (workout: Workout) => {
    const minutes = formatMinutes(calculateWorkoutDuration(workout.exercises))
    return `${minutes.toUpperCase()} · ${workout.exercises.length} EXERCISES`
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="flash" size={14} color={colors.primary} />
            <Text style={styles.wordmark}>PULSEFORGE</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.avatar, pressed && styles.pressedScale]}>
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>

        <Text style={styles.greeting}>GOOD MORNING,</Text>
        <Text style={styles.headline}>Ready to train?</Text>

        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.grayLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search workouts..."
            placeholderTextColor={colors.grayLight}
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const selected = activeFilter === filter
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={({ pressed }) => [
                  styles.filterChip,
                  selected && styles.filterChipSelected,
                  pressed && styles.pressedScale,
                ]}
              >
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter}</Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {featuredWorkout ? (
          <Animated.View
            style={[
              styles.featuredWrap,
              {
                opacity: cardValues.current[0] || 1,
                transform: [
                  {
                    translateY: (cardValues.current[0] || new Animated.Value(1)).interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [styles.featuredCard, pressed && styles.pressedScale]}
              onPress={() => handleSelectWorkout(featuredWorkout)}
            >
              <WorkoutCover workout={featuredWorkout} />
              <LinearGradient
                colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.82)']}
                style={styles.overlay}
              >
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{featuredWorkout.difficulty.toUpperCase()}</Text>
                </View>
                <View style={styles.featuredBottom}>
                  <Text style={styles.featuredTitle}>{featuredWorkout.name.toUpperCase()}</Text>
                  <Text style={styles.featuredMeta}>{meta(featuredWorkout)}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="dumbbell" size={54} color={colors.grayLight} />
            <Text style={styles.emptyTitle}>NO WORKOUTS FOUND</Text>
            <Text style={styles.emptyBody}>Try a different search or filter.</Text>
          </View>
        )}

        <View style={styles.grid}>
          {gridWorkouts.map((workout, index) => {
            const anim = cardValues.current[index + 1] || new Animated.Value(1)
            const type = workout.type.toUpperCase()

            return (
              <Animated.View
                key={workout.id}
                style={[
                  styles.gridItem,
                  {
                    opacity: anim,
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Pressable
                  onPress={() => handleSelectWorkout(workout)}
                  style={({ pressed }) => [styles.gridCard, pressed && styles.pressedScale]}
                >
                  <WorkoutCover workout={workout} />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.82)']}
                    style={styles.overlay}
                  >
                    <View style={styles.gridBottom}>
                      <Text style={styles.gridTitle}>{workout.name.toUpperCase()}</Text>
                      <Text style={styles.gridType}>{type}</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wordmark: {
    fontFamily: FONTS.condensed700,
    fontSize: 14,
    color: colors.black,
    letterSpacing: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: FONTS.inter600,
    fontSize: 12,
    color: colors.grayMid,
  },
  greeting: {
    marginTop: SPACING.lg,
    fontFamily: FONTS.inter500,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.textSecondary,
  },
  headline: {
    marginTop: 4,
    fontFamily: FONTS.condensed800,
    fontSize: 38,
    color: colors.black,
  },
  searchBar: {
    marginTop: SPACING.lg,
    height: 52,
    borderRadius: BORDER_RADIUS.xxl,
    backgroundColor: colors.offWhite,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.inter500,
    fontSize: 14,
    color: colors.black,
  },
  filterRow: {
    paddingVertical: SPACING.md,
    gap: 10,
  },
  filterChip: {
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 12,
    backgroundColor: colors.offWhite,
    justifyContent: 'center',
  },
  filterChipSelected: {
    backgroundColor: colors.black,
  },
  filterText: {
    fontFamily: FONTS.inter500,
    fontSize: 13,
    color: colors.grayMid,
  },
  filterTextSelected: {
    fontFamily: FONTS.inter600,
    color: colors.white,
  },
  featuredWrap: {
    marginTop: 4,
  },
  featuredCard: {
    height: 220,
    borderRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'space-between',
  },
  badgePill: {
    alignSelf: 'flex-start',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgePillText: {
    fontFamily: FONTS.inter500,
    fontSize: 11,
    color: '#FFFFFF',
  },
  featuredBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  featuredTitle: {
    flex: 1,
    fontFamily: FONTS.condensed700,
    fontSize: 26,
    color: '#FFFFFF',
    lineHeight: 28,
  },
  featuredMeta: {
    fontFamily: FONTS.inter500,
    fontSize: 11,
    color: 'rgba(255,255,255,0.72)',
  },
  grid: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridItem: {
    width: '48%',
  },
  gridCard: {
    height: 160,
    borderRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
  },
  gridBottom: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  gridTitle: {
    flex: 1,
    fontFamily: FONTS.condensed700,
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  gridType: {
    fontFamily: FONTS.inter500,
    fontSize: 10,
    color: 'rgba(255,255,255,0.72)',
  },
  emptyState: {
    marginTop: 30,
    borderRadius: BORDER_RADIUS.xxl,
    backgroundColor: colors.offWhite,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontFamily: FONTS.condensed700,
    fontSize: 24,
    color: colors.grayLight,
  },
  emptyBody: {
    marginTop: 6,
    fontFamily: FONTS.inter400,
    fontSize: 14,
    color: colors.textSecondary,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
})

