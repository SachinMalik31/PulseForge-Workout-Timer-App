import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import Svg, { Path } from 'react-native-svg'
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useWorkout } from '@context/WorkoutContext'
import { useToast } from '@context/ToastContext'
import { useUser } from '@hooks/useUser'
import { useAppTheme } from '@context/ThemeContext'
import { STORAGE_KEYS, FONTS } from '@constants'
import { formatTime } from '@utils/helpers'
import { getWorkoutImageUrl, WORKOUT_BLURHASH } from '@utils/workoutImages'

const QUOTES = [
  "THE ONLY BAD WORKOUT IS THE ONE THAT DIDN'T HAPPEN.",
  'SHOW UP. EVERY. SINGLE. DAY.',
  "YOUR FUTURE SELF IS WATCHING. DON'T LET THEM DOWN.",
  'DISCIPLINE BEATS MOTIVATION. ALWAYS.',
  'ONE MORE REP. ONE MORE SET. ONE MORE DAY.',
]

const MS_IN_DAY = 24 * 60 * 60 * 1000

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / MS_IN_DAY)
}

function getGreetingBucket(hour: number) {
  if (hour >= 5 && hour <= 11) return 'GOOD MORNING,'
  if (hour >= 12 && hour <= 16) return 'GOOD AFTERNOON,'
  if (hour >= 17 && hour <= 20) return 'GOOD EVENING,'
  return 'REST UP,'
}

function toDateOnlyKey(iso: string) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function calculateStreaks(history: { completedAt: string }[]) {
  if (!history.length) {
    return { currentStreak: 0, bestStreak: 0 }
  }

  const dateKeys = Array.from(new Set(history.map((item) => toDateOnlyKey(item.completedAt))))
  const dates = dateKeys
    .map((key) => {
      const [year, month, day] = key.split('-').map(Number)
      return new Date(year, month - 1, day)
    })
    .sort((a, b) => b.getTime() - a.getTime())

  let currentStreak = 1
  let bestStreak = 1

  for (let i = 1; i < dates.length; i += 1) {
    const diffDays = Math.round((dates[i - 1].getTime() - dates[i].getTime()) / MS_IN_DAY)
    if (diffDays === 1) {
      currentStreak += 1
      bestStreak = Math.max(bestStreak, currentStreak)
      continue
    }
    if (diffDays > 1) {
      if (i === 1) currentStreak = 0
      bestStreak = Math.max(bestStreak, currentStreak)
      currentStreak = i === 1 ? 0 : 1
    }
  }

  return { currentStreak, bestStreak }
}

function getThisWeekCount(history: { completedAt: string }[]) {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? 6 : day - 1
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(now.getDate() - diffToMonday)

  return history.filter((item) => new Date(item.completedAt) >= weekStart).length
}

export default function IndexScreen() {
  const router = useRouter()
  const { firstName } = useUser()
  const { workouts, history, selectWorkout } = useWorkout()
  const { showToast } = useToast()
  const { colors, isDark } = useAppTheme()

  const now = new Date()
  const dayIndex = dayOfYear(now)
  const greeting = getGreetingBucket(now.getHours())

  const featuredWorkout = workouts.length ? workouts[dayIndex % workouts.length] : null
  const quote = QUOTES[dayIndex % QUOTES.length]

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()),
    [history]
  )

  const { currentStreak, bestStreak } = useMemo(() => calculateStreaks(sortedHistory), [sortedHistory])
  const weeklyWorkouts = useMemo(() => getThisWeekCount(sortedHistory), [sortedHistory])
  const totalMinutes = useMemo(
    () => Math.round(sortedHistory.reduce((sum, item) => sum + item.durationSeconds, 0) / 60),
    [sortedHistory]
  )

  const [activeWorkout, setActiveWorkout] = useState<{ workoutId: string; name: string } | null>(null)
  const [weekValue, setWeekValue] = useState(0)
  const [minutesValue, setMinutesValue] = useState(0)
  const [bestStreakValue, setBestStreakValue] = useState(0)

  const weekProgress = useSharedValue(0)
  const minutesProgress = useSharedValue(0)
  const streakProgress = useSharedValue(0)

  useAnimatedReaction(
    () => weekProgress.value,
    (value) => {
      runOnJS(setWeekValue)(Math.floor(value))
    }
  )

  useAnimatedReaction(
    () => minutesProgress.value,
    (value) => {
      runOnJS(setMinutesValue)(Math.floor(value))
    }
  )

  useAnimatedReaction(
    () => streakProgress.value,
    (value) => {
      runOnJS(setBestStreakValue)(Math.floor(value))
    }
  )

  useFocusEffect(
    useCallback(() => {
      let mounted = true
      const load = async () => {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_WORKOUT)
        if (!mounted) return
        if (!raw) {
          setActiveWorkout(null)
          return
        }
        try {
          const parsed = JSON.parse(raw) as { workoutId?: string; name?: string }
          if (parsed.workoutId && parsed.name) {
            setActiveWorkout({ workoutId: parsed.workoutId, name: parsed.name })
          } else {
            setActiveWorkout(null)
          }
        } catch {
          setActiveWorkout(null)
        }
      }

      load()
      weekProgress.value = 0
      minutesProgress.value = 0
      streakProgress.value = 0

      weekProgress.value = withTiming(weeklyWorkouts, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      })
      minutesProgress.value = withTiming(totalMinutes, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      })
      streakProgress.value = withTiming(bestStreak, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      })

      return () => {
        mounted = false
      }
    }, [weeklyWorkouts, totalMinutes, bestStreak, weekProgress, minutesProgress, streakProgress])
  )

  const headerAnim = useRef(new Animated.Value(0)).current
  const featuredAnim = useRef(new Animated.Value(0)).current
  const statCardAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current
  const activityAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current
  const flameScale = useRef(new Animated.Value(1)).current
  const resumeOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    headerAnim.setValue(0)
    featuredAnim.setValue(0)
    statCardAnims.forEach((value) => value.setValue(0))
    activityAnims.forEach((value) => value.setValue(0))

    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start()

    Animated.timing(featuredAnim, {
      toValue: 1,
      duration: 400,
      delay: 300,
      useNativeDriver: true,
    }).start()

    Animated.stagger(
      60,
      statCardAnims.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 280,
          delay: 500,
          useNativeDriver: true,
        })
      )
    ).start()

    Animated.stagger(
      50,
      activityAnims.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 280,
          delay: 600,
          useNativeDriver: true,
        })
      )
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(flameScale, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(flameScale, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(resumeOpacity, { toValue: 0.85, duration: 1000, useNativeDriver: true }),
        Animated.timing(resumeOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start()
  }, [
    history.length,
    workouts.length,
    headerAnim,
    featuredAnim,
    statCardAnims,
    activityAnims,
    flameScale,
    resumeOpacity,
  ])

  const recent = sortedHistory.slice(0, 3)
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])

  const onOpenFeatured = () => {
    if (!featuredWorkout) return
    selectWorkout(featuredWorkout)
    router.push('/start-workout')
  }

  const onResume = () => {
    if (!activeWorkout) return
    const workout = workouts.find((item) => item.id === activeWorkout.workoutId)
    if (!workout) {
      showToast('Saved workout not found.')
      return
    }
    selectWorkout(workout)
    router.push('/timer')
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Animated.View style={[styles.headerWrap, { opacity: headerAnim }]}>
          <View style={styles.brandHeaderRow}>
            <View style={styles.wordmarkRow}>
              <MaterialCommunityIcons name="flash" size={14} color={colors.primary} />
              <Text style={styles.wordmark}>PULSEFORGE</Text>
            </View>
            <Pressable onPress={() => showToast('Notifications coming soon.')}>
              <Ionicons name="notifications-outline" size={24} color={colors.black} />
            </Pressable>
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.greetingLabel}>{greeting}</Text>
            <Text style={styles.greetingName}>{firstName}.</Text>
          </View>

          {currentStreak > 0 ? (
            <View style={styles.streakRow}>
              <Animated.View style={{ transform: [{ scale: flameScale }] }}>
                <MaterialCommunityIcons name="fire" size={18} color={colors.primary} />
              </Animated.View>
              <Text style={styles.streakTitle}>{currentStreak}-DAY STREAK</Text>
              <Text style={styles.streakSub}>Keep it up!</Text>
            </View>
          ) : (
            <View style={styles.streakRow}>
              <MaterialCommunityIcons name="fire" size={18} color={colors.grayLight} />
              <Text style={styles.streakEmpty}>START YOUR STREAK TODAY</Text>
              <Pressable onPress={() => router.push('/(tabs)/workouts')}>
                <Text style={styles.streakAction}>{'-> Do a workout'}</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>

        <View style={styles.headerDivider} />

        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>{"TODAY'S WORKOUT"}</Text>
          <Pressable onPress={() => router.push('/(tabs)/workouts')}>
            <Text style={styles.seeAll}>{'See all ->'}</Text>
          </Pressable>
        </View>

        {featuredWorkout ? (
          <Animated.View
            style={[
              styles.featureCardWrap,
              {
                opacity: featuredAnim,
                transform: [
                  {
                    translateY: featuredAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
                  },
                ],
              },
            ]}
          >
            <Pressable style={({ pressed }) => [styles.featureCard, pressed && styles.cardPressed]} onPress={onOpenFeatured}>
              <Image
                source={{ uri: getWorkoutImageUrl(featuredWorkout) }}
                style={styles.featureImage}
                contentFit="cover"
                placeholder={{ blurhash: WORKOUT_BLURHASH }}
                transition={300}
              />
              <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']} style={styles.featureOverlay}>
                <View style={styles.featureTopRow}>
                  <View style={styles.frostBadge}>
                    <Text style={styles.frostText}>{featuredWorkout.difficulty.toUpperCase()}</Text>
                  </View>
                  <View style={styles.frostBadge}>
                    <Text style={styles.frostText}>{Math.round((featuredWorkout.totalDuration ?? 20))} MIN</Text>
                  </View>
                </View>

                <View>
                  <Text style={styles.typeTag}>{featuredWorkout.type.toUpperCase()}</Text>
                  <Text style={styles.featureTitle} numberOfLines={2}>
                    {featuredWorkout.name}
                  </Text>
                  <Text style={styles.featureMeta}>{featuredWorkout.exercises.length} exercises</Text>
                  <View style={styles.featureBottomRow}>
                    <Text style={styles.startNow}>{'START NOW ->'}</Text>
                    <View style={styles.playCircle}>
                      <Ionicons name="play" size={18} color={colors.primary} />
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : null}

        <View style={styles.statsRow}>
          {[
            { labelTop: 'THIS WEEK', value: weekValue, labelBottom: 'WORKOUTS' },
            { labelTop: 'TOTAL TIME', value: minutesValue, labelBottom: 'MINUTES' },
            { labelTop: 'BEST STREAK', value: bestStreakValue, labelBottom: 'DAYS' },
          ].map((item, index) => (
            <Animated.View
              key={item.labelTop}
              style={[
                styles.statCard,
                {
                  opacity: statCardAnims[index],
                  transform: [
                    {
                      translateY: statCardAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.statTop}>{item.labelTop}</Text>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statBottom}>{item.labelBottom}</Text>
            </Animated.View>
          ))}
        </View>

        {activeWorkout ? (
          <Animated.View style={[styles.resumeCard, { opacity: resumeOpacity }]}> 
            <Pressable style={styles.resumeInner} onPress={onResume}>
              <MaterialCommunityIcons name="flash" size={20} color="#FFFFFF" />
              <View style={styles.resumeTextWrap}>
                <Text style={styles.resumeTitle}>CONTINUE WORKOUT</Text>
                <Text style={styles.resumeName}>{activeWorkout.name}</Text>
              </View>
              <Text style={styles.resumeArrow}>{'->'}</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        <Text style={styles.recentLabel}>RECENT ACTIVITY</Text>

        {recent.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="dumbbell" size={32} color={colors.surface} />
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptyBody}>Complete your first workout to start tracking.</Text>
          </View>
        ) : (
          recent.map((item, index) => (
            <Animated.View
              key={item.id}
              style={[
                styles.activityCard,
                {
                  opacity: activityAnims[index],
                  transform: [
                    {
                      translateY: activityAnims[index].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.activityCircle}>
                <Text style={styles.activityCircleText}>{item.workoutName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.activityMiddle}>
                <Text style={styles.activityName}>{item.workoutName}</Text>
                <Text style={styles.activityMeta}>
                  {new Date(item.completedAt).toLocaleDateString()} · {formatTime(item.durationSeconds)}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#00C896" />
            </Animated.View>
          ))
        )}

        <View style={styles.motivationCard}>
          <View style={styles.motivationLeft}>
            <Text style={styles.quoteText}>{quote}</Text>
          </View>
          <View style={styles.motivationRight}>
            <Svg width={90} height={90} viewBox="0 0 90 90">
              <Path d="M20 10 L85 5 L60 42 L90 64 L45 90 L12 66 L36 40 Z" fill="#FF3A2D" />
            </Svg>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors'], isDark: boolean) =>
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
    paddingBottom: 100,
  },
  headerWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  brandHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wordmark: {
    fontFamily: FONTS.condensed800,
    fontSize: 16,
    color: colors.black,
    letterSpacing: 0.6,
  },
  greetingBlock: {
    marginTop: 8,
  },
  greetingLabel: {
    fontFamily: FONTS.inter500,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.textSecondary,
  },
  greetingName: {
    marginTop: 2,
    fontFamily: FONTS.condensed800,
    fontSize: 42,
    color: colors.black,
    lineHeight: 44,
  },
  streakRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakTitle: {
    fontFamily: FONTS.inter600,
    fontSize: 13,
    color: colors.black,
  },
  streakSub: {
    fontFamily: FONTS.inter400,
    fontSize: 12,
    color: colors.textSecondary,
  },
  streakEmpty: {
    fontFamily: FONTS.inter500,
    fontSize: 12,
    color: colors.textSecondary,
  },
  streakAction: {
    fontFamily: FONTS.inter600,
    fontSize: 12,
    color: colors.primary,
  },
  headerDivider: {
    height: 1,
    backgroundColor: colors.surface,
  },
  sectionLabelRow: {
    marginTop: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontFamily: FONTS.inter500,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  seeAll: {
    fontFamily: FONTS.inter500,
    fontSize: 12,
    color: colors.primary,
  },
  featureCardWrap: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  featureCard: {
    height: 230,
    borderRadius: 24,
    overflow: 'hidden',
  },
  featureImage: {
    ...StyleSheet.absoluteFillObject,
  },
  featureOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'space-between',
  },
  featureTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frostBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  frostText: {
    fontFamily: FONTS.inter600,
    fontSize: 10,
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  typeTag: {
    fontFamily: FONTS.inter500,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.primary,
  },
  featureTitle: {
    marginTop: 4,
    fontFamily: FONTS.condensed800,
    fontSize: 28,
    lineHeight: 28,
    color: '#FFFFFF',
  },
  featureMeta: {
    marginTop: 2,
    fontFamily: FONTS.inter400,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  featureBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startNow: {
    fontFamily: FONTS.inter600,
    fontSize: 13,
    color: '#FFFFFF',
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statTop: {
    fontFamily: FONTS.inter500,
    fontSize: 10,
    color: colors.textSecondary,
  },
  statValue: {
    marginTop: 3,
    fontFamily: FONTS.condensed800,
    fontSize: 32,
    color: colors.black,
    lineHeight: 34,
  },
  statBottom: {
    fontFamily: FONTS.inter500,
    fontSize: 10,
    color: colors.textSecondary,
  },
  resumeCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  resumeInner: {
    height: 72,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resumeTextWrap: {
    flex: 1,
  },
  resumeTitle: {
    fontFamily: FONTS.condensed700,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  resumeName: {
    fontFamily: FONTS.inter400,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  resumeArrow: {
    fontFamily: FONTS.inter600,
    fontSize: 20,
    color: '#FFFFFF',
  },
  recentLabel: {
    marginTop: 18,
    marginLeft: 20,
    fontFamily: FONTS.inter500,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 8,
    fontFamily: FONTS.inter500,
    fontSize: 14,
    color: colors.grayMid,
  },
  emptyBody: {
    marginTop: 4,
    fontFamily: FONTS.inter400,
    fontSize: 13,
    color: colors.textSecondary,
  },
  activityCard: {
    marginHorizontal: 20,
    marginTop: 8,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}18`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityCircleText: {
    fontFamily: FONTS.inter600,
    fontSize: 14,
    color: colors.primary,
  },
  activityMiddle: {
    flex: 1,
  },
  activityName: {
    fontFamily: FONTS.inter600,
    fontSize: 15,
    color: colors.black,
  },
  activityMeta: {
    marginTop: 2,
    fontFamily: FONTS.inter400,
    fontSize: 12,
    color: colors.textSecondary,
  },
  motivationCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: isDark ? '#252525' : '#0A0A0A',
    borderRadius: 24,
    minHeight: 90,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  motivationLeft: {
    width: '70%',
    justifyContent: 'center',
  },
  quoteText: {
    fontFamily: FONTS.condensed700,
    fontSize: 19,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  motivationRight: {
    width: '30%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginRight: -20,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
})

