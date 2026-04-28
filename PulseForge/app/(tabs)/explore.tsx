import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Easing,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { FONTS } from '@constants'
import { useAppTheme } from '@context/ThemeContext'
import { useToast } from '@context/ToastContext'
import { useWorkout } from '@context/WorkoutContext'
import { useChallenges } from '@hooks/useChallenges'
import type { Challenge, ProgramGoal, ProgramDay, Workout, WorkoutHistory } from '@types'

type WeeklyMetric = 'reps' | 'minutes' | 'sets' | 'exercises'

type WeeklyChallengePreset = {
  title: string
  target: number
  metric: WeeklyMetric
  unitLabel: string
}

const CHALLENGE_IMAGE_1 =
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
const CHALLENGE_IMAGE_2 =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
const CHALLENGE_IMAGE_3 =
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80'

const toWorkoutId = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const buildChallengeDays = (workoutNames: string[]) =>
  Array.from({ length: 30 }, (_, index) => {
    const day = index + 1
    const isRestDay = day % 7 === 0
    const workoutName = isRestDay ? 'Active Rest' : workoutNames[index % workoutNames.length]

    return {
      day,
      workoutId: isRestDay ? 'rest' : toWorkoutId(workoutName),
      workoutName,
    }
  })

const FALLBACK_CHALLENGES: Challenge[] = [
  {
    id: 'fallback-cardio-burn',
    name: 'Cardio Burn 30',
    description: 'Build stamina with steady cardio sessions and recovery days.',
    tag: 'CARDIO',
    imageUrl: CHALLENGE_IMAGE_1,
    days: buildChallengeDays(['Quick Morning Cardio', 'HIIT Blast', 'Tabata Finisher']),
    difficulty: 'Beginner',
  },
  {
    id: 'fallback-strength-foundation',
    name: 'Strength Foundation',
    description: 'Progressive upper-body and core work to build consistent strength.',
    tag: 'STRENGTH',
    imageUrl: CHALLENGE_IMAGE_2,
    days: buildChallengeDays(['Core Strength Builder', 'Upper Body Pump', 'HIIT Blast']),
    difficulty: 'Intermediate',
  },
  {
    id: 'fallback-mobility-reset',
    name: 'Mobility Reset 30',
    description: 'Mobility and cardio blend to improve movement quality every week.',
    tag: 'MIXED',
    imageUrl: CHALLENGE_IMAGE_3,
    days: buildChallengeDays(['Evening Stretch Flow', 'Quick Morning Cardio', 'HIIT Blast']),
    difficulty: 'Beginner',
  },
]

const GOAL_WORKOUT_MAP: Record<ProgramGoal, string[]> = {
  'Lose Weight': [
    'Quick Morning Cardio',
    'HIIT Blast',
    'Tabata Finisher',
    'Evening Stretch Flow',
  ],
  'Build Muscle': ['Core Strength Builder', 'Upper Body Pump', 'HIIT Blast'],
  'Get Flexible': ['Evening Stretch Flow', 'Quick Morning Cardio'],
  'Boost Cardio': ['Quick Morning Cardio', 'HIIT Blast', 'Tabata Finisher'],
}

const WEEKLY_PRESETS: WeeklyChallengePreset[] = [
  {
    title: '500,000 TOTAL REPS THIS WEEK',
    target: 500000,
    metric: 'reps',
    unitLabel: 'REPS',
  },
  {
    title: '250,000 MINUTES OF MOVEMENT',
    target: 250000,
    metric: 'minutes',
    unitLabel: 'MINUTES',
  },
  {
    title: '100,000 TOTAL SETS COMPLETED',
    target: 100000,
    metric: 'sets',
    unitLabel: 'SETS',
  },
  {
    title: '30,000 EXERCISES FINISHED',
    target: 30000,
    metric: 'exercises',
    unitLabel: 'EXERCISES',
  },
]

const COMMUNITY_PARTICIPANTS = 12847

const getDateOnlyIso = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

const startOfDay = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime()

const daysSince = (isoDate: string) => {
  const from = startOfDay(new Date(isoDate))
  const now = startOfDay(new Date())
  return Math.floor((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getCurrentChallengeDay = (startDate: string) => clamp(daysSince(startDate) + 1, 1, 30)

const getWeekStart = (date: Date) => {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

const getNextMondayMidnight = (date: Date) => {
  const monday = getWeekStart(date)
  monday.setDate(monday.getDate() + 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

const getWeekNumber = (date: Date) => {
  const target = new Date(date.valueOf())
  const dayNumber = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNumber + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3)
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000)
}

const formatWithCommas = (value: number) => value.toLocaleString('en-US')

const formatResetCountdown = (date: Date) => {
  const diff = Math.max(getNextMondayMidnight(new Date()).getTime() - date.getTime(), 0)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return `Resets in ${days}d ${hours}h`
}

const getCommunityBaseForDate = (date: Date) => {
  const increments = [0, 22000, 19500, 24100, 21800, 18900, 15200]
  const mondayIndex = (date.getDay() + 6) % 7
  let total = 48320
  for (let i = 1; i <= mondayIndex; i += 1) {
    total += increments[i]
  }
  return total
}

const sortUniqueDays = (days: number[]) => [...new Set(days)].sort((a, b) => a - b)

const getWorkoutMetric = (workout: Workout | undefined, metric: WeeklyMetric, historyItem: WorkoutHistory) => {
  if (!workout) {
    return metric === 'minutes' ? Math.max(1, Math.round(historyItem.durationSeconds / 60)) : 0
  }

  if (metric === 'minutes') {
    return Math.max(1, Math.round(historyItem.durationSeconds / 60))
  }

  if (metric === 'reps') {
    return workout.exercises.reduce((sum, ex) => sum + ex.reps * ex.sets, 0)
  }

  if (metric === 'sets') {
    return workout.exercises.reduce((sum, ex) => sum + ex.sets, 0)
  }

  return workout.exercises.length
}

const getDifficultyTint = (difficulty: Challenge['difficulty']) => {
  if (difficulty === 'Beginner') {
    return '#FFFFFF22'
  }
  if (difficulty === 'Intermediate') {
    return '#FFD54A2B'
  }
  return '#FF3A2D33'
}

export default function ExploreScreen() {
  const router = useRouter()
  const { workouts, history, selectWorkout } = useWorkout()
  const { showToast } = useToast()
  const { colors } = useAppTheme()

  const scrollRef = useRef<ScrollView | null>(null)

  const {
    templates,
    activeChallenge,
    challengeHistory,
    generatedProgram,
    loading: challengesLoading,
    error: challengesError,
    startChallenge,
    completeDay,
    quitChallenge,
    createProgram,
    updateProgram,
    deleteProgram,
  } = useChallenges()

  const styles = useMemo(() => makeStyles(colors), [colors])
  const challengeTemplates = templates.length > 0 ? templates : FALLBACK_CHALLENGES
  const [showBuilder, setShowBuilder] = useState(false)
  const [showProgramSchedule, setShowProgramSchedule] = useState(false)
  const [showChallengeComplete, setShowChallengeComplete] = useState(false)

  const [builderStep, setBuilderStep] = useState<1 | 2 | 3>(1)
  const [goalChoice, setGoalChoice] = useState<ProgramGoal | null>(null)
  const [daysPerWeekChoice, setDaysPerWeekChoice] = useState<3 | 4 | 5 | null>(null)
  const [durationChoice, setDurationChoice] = useState<2 | 4 | 6 | null>(null)
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false)

  const headerAnim = useRef(new Animated.Value(0)).current
  const sectionAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current
  const challengeCardAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current
  const calendarPopAnims = useRef(Array.from({ length: 30 }, () => new Animated.Value(0))).current
  const todayPulse = useRef(new Animated.Value(1)).current
  const weeklyProgressAnim = useRef(new Animated.Value(0)).current
  const weeklyProgressWidth = useRef(new Animated.Value(0)).current
  const loaderAnim = useRef(new Animated.Value(0)).current
  const generatedCardAnim = useRef(new Animated.Value(0)).current

  // Animate generated program card when loaded from Firestore
  useEffect(() => {
    if (generatedProgram) {
      generatedCardAnim.setValue(1)
    }
  }, [generatedProgram, generatedCardAnim])

  useEffect(() => {
    headerAnim.setValue(0)
    sectionAnims.forEach((anim) => anim.setValue(0))
    challengeCardAnims.forEach((anim) => anim.setValue(0))

    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()

    Animated.stagger(
      100,
      sectionAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start()

    Animated.stagger(
      90,
      challengeCardAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          delay: 200,
          speed: 14,
          bounciness: 8,
          useNativeDriver: true,
        })
      )
    ).start()
  }, [challengeCardAnims, headerAnim, sectionAnims])

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(todayPulse, {
          toValue: 1.05,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(todayPulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [todayPulse])

  useEffect(() => {
    if (!activeChallenge) {
      calendarPopAnims.forEach((anim) => anim.setValue(0))
      return
    }

    const completed = sortUniqueDays(activeChallenge.completedDays)
    completed.forEach((day) => {
      const target = calendarPopAnims[day - 1]
      target.setValue(0)
    })

    Animated.stagger(
      50,
      completed.map((day) =>
        Animated.spring(calendarPopAnims[day - 1], {
          toValue: 1,
          speed: 14,
          bounciness: 9,
          useNativeDriver: true,
        })
      )
    ).start()
  }, [activeChallenge, calendarPopAnims])

  useEffect(() => {
    if (!isGeneratingProgram) {
      loaderAnim.setValue(0)
      return
    }

    const loop = Animated.loop(
      Animated.timing(loaderAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [isGeneratingProgram, loaderAnim])

  useEffect(() => {
    if (!challengesError) return
    Alert.alert('Explore Sync Issue', challengesError)
  }, [challengesError])

  const activeChallengeModel = useMemo(
    () => challengeTemplates.find((challenge) => challenge.id === activeChallenge?.challengeId) || null,
    [activeChallenge, challengeTemplates]
  )

  const activeChallengeTodayDay = activeChallenge
    ? getCurrentChallengeDay(activeChallenge.startDate)
    : 1

  const activeChallengeTodayPlan =
    activeChallengeModel?.days[activeChallengeTodayDay - 1] || null

  const activeChallengeProgress = activeChallenge
    ? clamp(activeChallenge.completedDays.length / 30, 0, 1)
    : 0

  const weekStart = useMemo(() => getWeekStart(new Date()), [])
  const weekStartIso = getDateOnlyIso(weekStart)

  const weekIndex = useMemo(() => getWeekNumber(new Date()) % 4, [])
  const weeklyPreset = WEEKLY_PRESETS[weekIndex]

  const workoutLookup = useMemo(() => {
    const lookup = new Map<string, Workout>()
    workouts.forEach((workout) => {
      lookup.set(workout.id, workout)
      lookup.set(workout.name, workout)
    })
    return lookup
  }, [workouts])

  const userContribution = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 7)

    return history
      .filter((entry) => {
        const completed = new Date(entry.completedAt)
        return completed >= weekStart && completed < end
      })
      .reduce((sum, entry) => {
        const workout = workoutLookup.get(entry.workoutId) || workoutLookup.get(entry.workoutName)
        return sum + getWorkoutMetric(workout, weeklyPreset.metric, entry)
      }, 0)
  }, [history, weekStart, workoutLookup, weeklyPreset.metric])

  const communityBase = useMemo(() => getCommunityBaseForDate(new Date()), [])
  const communityTotal = communityBase + userContribution
  const weeklyProgress = clamp(communityTotal / weeklyPreset.target, 0, 1)

  useFocusEffect(
    useCallback(() => {
      weeklyProgressAnim.setValue(0)
      Animated.timing(weeklyProgressAnim, {
        toValue: weeklyProgress,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start()
    }, [weeklyProgress, weeklyProgressAnim])
  )

  const todayHistory = useMemo(
    () => history.filter((item) => isSameDay(new Date(item.completedAt), new Date())),
    [history]
  )

  const syncChallengeAndProgram = useCallback(async () => {
    if (challengesLoading) return

    if (activeChallenge && activeChallengeModel) {
      const todayDay = getCurrentChallengeDay(activeChallenge.startDate)
      const todayPlan = activeChallengeModel.days[todayDay - 1]

      if (
        todayPlan &&
        !activeChallenge.completedDays.includes(todayDay) &&
        activeChallenge.isActive
      ) {
        const didCompleteTodayWorkout =
          todayPlan.workoutId === 'rest' ||
          todayHistory.some((entry) => entry.workoutName === todayPlan.workoutName)

        if (didCompleteTodayWorkout) {
          await completeDay(todayDay)
        }
      }

      if (activeChallenge.completedDays.length === 30) {
        setShowChallengeComplete(true)
      }
    }

    if (generatedProgram) {
      const totalDays = generatedProgram.schedule.length
      if (totalDays === 0) return

      const nextSchedule = generatedProgram.schedule.map((day) => ({ ...day }))
      let nextDayCursor = generatedProgram.currentDay
      let changed = false

      while (nextDayCursor <= totalDays) {
        const current = nextSchedule[nextDayCursor - 1]
        if (!current) break

        if (current.completed) {
          nextDayCursor += 1
          changed = true
          continue
        }

        if (current.workoutName === 'Rest') {
          current.completed = true
          nextDayCursor += 1
          changed = true
          continue
        }

        const doneToday = todayHistory.some((entry) => entry.workoutName === current.workoutName)
        if (doneToday) {
          current.completed = true
          nextDayCursor += 1
          changed = true
          continue
        }

        break
      }

      if (changed) {
        await updateProgram({
          currentDay: clamp(nextDayCursor, 1, Math.max(totalDays, 1)),
          schedule: nextSchedule,
        })
      }
    }
  }, [
    activeChallenge,
    activeChallengeModel,
    challengesLoading,
    completeDay,
    generatedProgram,
    todayHistory,
    updateProgram,
  ])

  useEffect(() => {
    void syncChallengeAndProgram()
  }, [syncChallengeAndProgram])

  const selectAndOpenWorkout = (workoutName: string) => {
    const workout = workouts.find((item) => item.name === workoutName)
    if (!workout) {
      Alert.alert('Workout Not Found', 'That workout is currently unavailable.')
      return
    }
    selectWorkout(workout)
    router.push('/start-workout')
  }

  const handleJoinChallenge = (challenge: Challenge) => {
    if (activeChallenge?.isActive) {
      Alert.alert(
        'Already in a Challenge',
        'Finish or leave your current challenge before starting a new one.',
        [{ text: 'OK' }]
      )
      return
    }

    Alert.alert(
      challenge.name,
      "Start this 30-day challenge? We'll track your daily progress.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "Let's Go!",
          onPress: async () => {
            await startChallenge(challenge.id)
            setTimeout(() => {
              scrollRef.current?.scrollTo({ y: 140, animated: true })
            }, 220)
          },
        },
      ]
    )
  }

  const handleLeaveChallenge = () => {
    Alert.alert('Leave Challenge?', 'Your progress will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await quitChallenge()
        },
      },
    ])
  }

  const handleDoItNow = () => {
    if (!activeChallengeTodayPlan) return

    if (activeChallengeTodayPlan.workoutId === 'rest') {
      Alert.alert('Active Rest', 'Today is an active rest day. Recovery counts too.')
      return
    }

    selectAndOpenWorkout(activeChallengeTodayPlan.workoutName)
  }

  const resetBuilder = () => {
    setBuilderStep(1)
    setGoalChoice(null)
    setDaysPerWeekChoice(null)
    setDurationChoice(null)
    setIsGeneratingProgram(false)
  }

  const handleBuilderBack = () => {
    if (isGeneratingProgram) return

    if (builderStep === 1) {
      setShowBuilder(false)
      resetBuilder()
      return
    }

    setBuilderStep((current) => (current - 1) as 1 | 2 | 3)
  }

  const handleGenerateProgram = async () => {
    if (!goalChoice || !daysPerWeekChoice || !durationChoice) return

    setIsGeneratingProgram(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const workoutCycle = GOAL_WORKOUT_MAP[goalChoice]
    const totalDays = durationChoice * daysPerWeekChoice
    let workoutCursor = 0

    const schedule: ProgramDay[] = Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1
      const everyNthIsRest = day % (daysPerWeekChoice + 1) === 0
      const workoutName = everyNthIsRest
        ? 'Rest'
        : workoutCycle[workoutCursor++ % workoutCycle.length]

      return {
        day,
        week: Math.ceil(day / daysPerWeekChoice),
        workoutName,
        completed: false,
      }
    })

    const createdProgram = await createProgram({
      goal: goalChoice,
      daysPerWeek: daysPerWeekChoice,
      durationWeeks: durationChoice,
      generatedAt: new Date().toISOString(),
      currentDay: 1,
      schedule,
    })

    if (!createdProgram) {
      setIsGeneratingProgram(false)
      Alert.alert('Program Not Created', 'Please check your internet/Firebase setup and try again.')
      return
    }

    showToast('Program created successfully.')

    setShowBuilder(false)
    setShowProgramSchedule(false)
    setIsGeneratingProgram(false)
    resetBuilder()

    generatedCardAnim.setValue(0)
    Animated.spring(generatedCardAnim, {
      toValue: 1,
      speed: 12,
      bounciness: 8,
      useNativeDriver: true,
    }).start()
  }

  const handleResetProgram = () => {
    Alert.alert('Reset Program?', 'This will remove your generated program.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await deleteProgram()
        },
      },
    ])
  }

  const handleStartProgramWorkout = () => {
    if (!generatedProgram) return
    const today = generatedProgram.schedule[generatedProgram.currentDay - 1]
    if (!today || today.workoutName === 'Rest') {
      Alert.alert('Rest Day', 'No workout assigned for today. Recover and come back stronger.')
      return
    }
    selectAndOpenWorkout(today.workoutName)
  }

  const handleFinishChallengeCelebration = async () => {
    if (!activeChallenge || !activeChallengeModel) {
      setShowChallengeComplete(false)
      return
    }

    await quitChallenge() // marks isActive: false in Firestore
    setShowChallengeComplete(false)
  }

  const handleShareAchievement = async () => {
    if (!activeChallengeModel) return
    try {
      await Share.share({
        message: `I just completed the ${activeChallengeModel.name} 30-day challenge on PulseForge! 💪🔥`,
      })
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  const availableChallenges = challengeTemplates.filter(
    (challenge) => challenge.id !== activeChallenge?.challengeId
  )

  const completedProgramDays = generatedProgram
    ? generatedProgram.schedule.filter((day) => day.completed).length
    : 0
  const programTotalDays = generatedProgram ? generatedProgram.schedule.length : 0
  const programProgress =
    generatedProgram && programTotalDays > 0
      ? clamp(completedProgramDays / programTotalDays, 0, 1)
      : 0

  const programToday = generatedProgram
    ? generatedProgram.schedule[clamp(generatedProgram.currentDay - 1, 0, Math.max(programTotalDays - 1, 0))]
    : null

  if (challengesLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading Explore...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>EXPLORE</Text>
            <Ionicons name="flame" size={24} color="#FF3A2D" />
          </View>
          <Text style={styles.headerSubtitle}>Challenges, programs & goals.</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.sectionWrap,
            {
              opacity: sectionAnims[0],
              transform: [
                {
                  translateY: sectionAnims[0].interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.sectionLabel}>30-DAY CHALLENGES</Text>

          {activeChallenge && activeChallengeModel ? (
            <View>
              <View style={styles.activeCard}>
                <ImageBackground source={{ uri: activeChallengeModel.imageUrl }} style={styles.activeCardTop}>
                  <View style={styles.activeImageOverlay}>
                    <Text style={styles.activeChallengeTitle}>{activeChallengeModel.name}</Text>
                    <Text style={styles.activeDayCounter}>
                      DAY {clamp(activeChallenge.completedDays.length + 1, 1, 30)}/30
                    </Text>
                  </View>
                </ImageBackground>

                <View style={styles.progressTrackThin}>
                  <View style={[styles.progressFillThin, { width: `${activeChallengeProgress * 100}%` }]} />
                </View>

                <View style={styles.activeBottom}>
                  <Text style={styles.miniLabel}>TODAY'S WORKOUT</Text>
                  <Text style={styles.todayWorkoutName}>
                    {activeChallengeTodayPlan?.workoutName || 'Active Rest'}
                  </Text>

                  <View style={styles.activeActionRow}>
                    <Pressable style={styles.doNowButton} onPress={handleDoItNow}>
                      <Text style={styles.doNowButtonText}>DO IT NOW -&gt;</Text>
                    </Pressable>

                    <Pressable onPress={handleLeaveChallenge}>
                      <Text style={styles.leaveChallengeText}>Leave Challenge</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.calendarCard}>
                <Text style={styles.progressLabel}>YOUR PROGRESS</Text>
                <View style={styles.calendarGrid}>
                  {Array.from({ length: 30 }, (_, index) => {
                    const day = index + 1
                    const isCompleted = activeChallenge.completedDays.includes(day)
                    const isToday = day === activeChallengeTodayDay
                    const isPast = day < activeChallengeTodayDay
                    const dayPlan = activeChallengeModel.days[day - 1]
                    const isRestDay = dayPlan?.workoutId === 'rest'
                    const isMissed = isPast && !isCompleted && !isRestDay
                    const isFuture = day > activeChallengeTodayDay

                    const circleVariant = isCompleted
                      ? styles.dayCircleCompleted
                      : isToday
                        ? styles.dayCircleToday
                        : styles.dayCircleNeutral

                    const animatedStyle = isCompleted
                      ? {
                          transform: [{ scale: calendarPopAnims[index].interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }],
                        }
                      : isToday
                        ? { transform: [{ scale: todayPulse }] }
                        : undefined

                    return (
                      <Animated.View key={day} style={animatedStyle}>
                        <View style={[styles.dayCircle, circleVariant] as any}>
                          {isCompleted ? (
                            <Ionicons name="checkmark" size={12} color="#FF3A2D" />
                          ) : isToday ? (
                            <Text style={styles.dayTextToday}>{day}</Text>
                          ) : isRestDay ? (
                            <Ionicons name="moon" size={12} color={colors.textSecondary} />
                          ) : isMissed ? (
                            <Ionicons name="close" size={12} color={colors.grayLight} />
                          ) : (
                            <Text style={styles.dayTextFuture}>{day}</Text>
                          )}
                        </View>
                      </Animated.View>
                    )
                  })}
                </View>
              </View>
            </View>
          ) : null}

          {availableChallenges.map((challenge, index) => (
            <Animated.View
              key={challenge.id}
              style={[
                styles.challengeCardWrap,
                {
                  opacity: challengeCardAnims[index],
                  transform: [
                    {
                      scale: challengeCardAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <ImageBackground source={{ uri: challenge.imageUrl }} style={styles.challengeCardImage}>
                <View style={styles.challengeOverlay}>
                  <View style={styles.challengeTopRow}>
                    <View
                      style={[
                        styles.difficultyBadge,
                        { backgroundColor: getDifficultyTint(challenge.difficulty) },
                      ]}
                    >
                      <Text style={styles.difficultyText}>{challenge.difficulty}</Text>
                    </View>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{challenge.tag}</Text>
                    </View>
                  </View>

                  <View style={styles.challengeBottomRow}>
                    <View style={styles.challengeTextCol}>
                      <Text style={styles.challengeName}>{challenge.name}</Text>
                      <Text style={styles.challengeDescription}>{challenge.description}</Text>
                      <Text style={styles.challengeDurationLabel}>30 DAYS</Text>
                    </View>

                    <Pressable style={styles.joinButton} onPress={() => handleJoinChallenge(challenge)}>
                      <Text style={styles.joinButtonText}>JOIN -&gt;</Text>
                    </Pressable>
                  </View>
                </View>
              </ImageBackground>
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.View
          style={[
            styles.sectionWrap,
            {
              opacity: sectionAnims[1],
              transform: [
                {
                  translateY: sectionAnims[1].interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.sectionLabel}>THIS WEEK'S CHALLENGE</Text>

          <View style={styles.weeklyCard}>
            <View style={styles.weeklyTopRow}>
              <Text style={styles.weeklyKicker}>COMMUNITY CHALLENGE</Text>
              <Text style={styles.weeklyReset}>{formatResetCountdown(new Date())}</Text>
            </View>

            <Text style={styles.weeklyTitle}>{weeklyPreset.title}</Text>
            <Text style={styles.weeklySubtitle}>
              Every rep you do counts toward the community goal.
            </Text>

            <View style={styles.weeklyNumbersRow}>
              <Text style={styles.weeklyTotal}>{formatWithCommas(communityTotal)}</Text>
              <Text style={styles.weeklyTarget}>/ {formatWithCommas(weeklyPreset.target)} {weeklyPreset.unitLabel}</Text>
            </View>

            <View
              style={styles.weeklyProgressTrack}
              onLayout={(event) => {
                weeklyProgressWidth.setValue(event.nativeEvent.layout.width)
              }}
            >
              <Animated.View
                style={[
                  styles.weeklyProgressFill,
                  { width: Animated.multiply(weeklyProgressAnim, weeklyProgressWidth) },
                ]}
              />
            </View>

            <Text style={styles.weeklyFromYou}>{formatWithCommas(userContribution)} {weeklyPreset.unitLabel.toLowerCase()} from you</Text>

            <Text style={styles.yourContributionLabel}>YOUR CONTRIBUTION</Text>
            <Text style={styles.yourContributionValue}>{formatWithCommas(userContribution)}</Text>
            <Text style={styles.yourContributionUnit}>{weeklyPreset.unitLabel}</Text>

            <View style={styles.participantRow}>
              <Ionicons name="people" size={16} color={colors.textSecondary} />
              <Text style={styles.participantText}>
                {formatWithCommas(COMMUNITY_PARTICIPANTS)} people participating this week
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.sectionWrap,
            {
              opacity: sectionAnims[2],
              transform: [
                {
                  translateY: sectionAnims[2].interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.sectionLabel}>BUILD YOUR PROGRAM</Text>

          {!generatedProgram ? (
            <View style={styles.programEntryCard}>
              <MaterialCommunityIcons name="magic-staff" size={32} color="#FF3A2D" />
              <Text style={styles.programEntryTitle}>PERSONALIZED PROGRAM</Text>
              <Text style={styles.programEntrySubtitle}>
                Answer 3 questions. Get a program built for you.
              </Text>

              <Pressable
                style={styles.buildProgramButton}
                onPress={() => {
                  resetBuilder()
                  setShowBuilder(true)
                }}
              >
                <Text style={styles.buildProgramButtonText}>BUILD MY PROGRAM -&gt;</Text>
              </Pressable>
            </View>
          ) : (
            <Animated.View
              style={[
                styles.generatedProgramCard,
                {
                  opacity: generatedCardAnim,
                  transform: [
                    {
                      scale: generatedCardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.generatedHeaderRow}>
                <View style={styles.generatedGoalTag}>
                  <Text style={styles.generatedGoalTagText}>{generatedProgram.goal.toUpperCase()}</Text>
                </View>

                <Pressable onPress={handleResetProgram}>
                  <Text style={styles.resetProgramText}>Reset</Text>
                </Pressable>
              </View>

              <Text style={styles.generatedProgramTitle}>{generatedProgram.goal} Program</Text>
              <Text style={styles.generatedProgramMeta}>
                {generatedProgram.durationWeeks} weeks · {generatedProgram.daysPerWeek} days/week
              </Text>

              <View style={styles.generatedDayRow}>
                <View style={styles.generatedOverallTrack}>
                  <View style={[styles.generatedOverallFill, { width: `${programProgress * 100}%` }]} />
                </View>
                <Text style={styles.generatedDayMeta}>
                  Day {clamp(generatedProgram.currentDay, 1, Math.max(programTotalDays, 1))} of {programTotalDays}
                </Text>
              </View>

              <View style={styles.todayAssignmentCard}>
                <Text style={styles.todayAssignmentLabel}>TODAY</Text>
                <Text style={styles.todayAssignmentName}>
                  {programToday?.workoutName === 'Rest' ? 'REST DAY 🌙' : programToday?.workoutName || 'Rest'}
                </Text>

                {programToday?.workoutName !== 'Rest' ? (
                  <Pressable style={styles.startProgramWorkoutButton} onPress={handleStartProgramWorkout}>
                    <Text style={styles.startProgramWorkoutText}>START WORKOUT -&gt;</Text>
                  </Pressable>
                ) : null}
              </View>

              <Pressable
                style={styles.scheduleToggle}
                onPress={() => setShowProgramSchedule((current) => !current)}
              >
                <Text style={styles.scheduleToggleText}>
                  View full schedule {showProgramSchedule ? '▴' : '▾'}
                </Text>
              </Pressable>

              {showProgramSchedule ? (
                <View style={styles.scheduleList}>
                  {Array.from({ length: generatedProgram.durationWeeks }, (_, weekIndexItem) => {
                    const week = weekIndexItem + 1
                    const weekDays = generatedProgram.schedule.filter((day) => day.week === week)
                    if (weekDays.length === 0) return null
                    return (
                      <View key={`week-${week}`}>
                        <Text style={styles.weekLabel}>WEEK {week}</Text>
                        {weekDays.map((day) => {
                          const isToday = day.day === generatedProgram.currentDay
                          return (
                            <View key={`day-${day.day}`} style={styles.scheduleRow}>
                              <Text style={styles.scheduleDay}>Day {day.day}</Text>
                              <Text style={styles.scheduleWorkout}>{day.workoutName}</Text>
                              {day.completed ? (
                                <Ionicons name="checkmark-circle" size={16} color="#00C896" />
                              ) : isToday ? (
                                <View style={styles.todayDot} />
                              ) : (
                                <View style={styles.futureDot} />
                              )}
                            </View>
                          )
                        })}
                      </View>
                    )
                  })}
                </View>
              ) : null}
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showBuilder}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!isGeneratingProgram) setShowBuilder(false)
        }}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetStep}>STEP {builderStep} OF 3</Text>

            <Text style={styles.sheetTitle}>
              {builderStep === 1
                ? "WHAT'S YOUR GOAL?"
                : builderStep === 2
                  ? 'HOW MANY DAYS PER WEEK?'
                  : 'HOW LONG?'}
            </Text>

            <Pressable
              style={[styles.sheetBackButton, isGeneratingProgram && styles.sheetBackButtonDisabled]}
              onPress={handleBuilderBack}
              disabled={isGeneratingProgram}
            >
              <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
              <Text style={styles.sheetBackButtonText}>BACK</Text>
            </Pressable>

            {builderStep === 1 ? (
              <View style={styles.goalGrid}>
                {[
                  { emoji: '🔥', value: 'Lose Weight' as ProgramGoal },
                  { emoji: '💪', value: 'Build Muscle' as ProgramGoal },
                  { emoji: '🧘', value: 'Get Flexible' as ProgramGoal },
                  { emoji: '❤️', value: 'Boost Cardio' as ProgramGoal },
                ].map((item) => {
                  const selected = goalChoice === item.value
                  return (
                    <Pressable
                      key={item.value}
                      style={[styles.goalOption, selected && styles.goalOptionSelected]}
                      onPress={() => setGoalChoice(item.value)}
                    >
                      <Text style={styles.goalOptionEmoji}>{item.emoji}</Text>
                      <Text style={[styles.goalOptionText, selected && styles.goalOptionTextSelected]}>
                        {item.value}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : null}

            {builderStep === 2 ? (
              <View style={styles.daysRow}>
                {[3, 4, 5].map((value) => {
                  const selected = daysPerWeekChoice === value
                  return (
                    <Pressable
                      key={value}
                      style={[styles.daysOption, selected && styles.daysOptionSelected]}
                      onPress={() => setDaysPerWeekChoice(value as 3 | 4 | 5)}
                    >
                      <Text style={[styles.daysOptionText, selected && styles.daysOptionTextSelected]}>
                        {value} DAYS
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : null}

            {builderStep === 3 ? (
              <View style={styles.durationList}>
                {[
                  { value: 2 as 2 | 4 | 6, subtitle: 'Quick boost' },
                  { value: 4 as 2 | 4 | 6, subtitle: 'Most popular', badge: 'POPULAR' },
                  { value: 6 as 2 | 4 | 6, subtitle: 'Full transformation' },
                ].map((option) => {
                  const selected = durationChoice === option.value
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.durationRow, selected && styles.durationRowSelected]}
                      onPress={() => setDurationChoice(option.value)}
                    >
                      <View>
                        <Text style={styles.durationTitle}>{option.value} WEEKS</Text>
                        <Text style={styles.durationSubtitle}>{option.subtitle}</Text>
                      </View>

                      {option.badge ? (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularBadgeText}>{option.badge}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  )
                })}
              </View>
            ) : null}

            {builderStep < 3 ? (
              <Pressable
                style={[
                  styles.sheetButton,
                  ((builderStep === 1 && !goalChoice) || (builderStep === 2 && !daysPerWeekChoice)) &&
                    styles.sheetButtonDisabled,
                ]}
                disabled={(builderStep === 1 && !goalChoice) || (builderStep === 2 && !daysPerWeekChoice)}
                onPress={() => setBuilderStep((current) => (current + 1) as 1 | 2 | 3)}
              >
                <Text style={styles.sheetButtonText}>NEXT -&gt;</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.sheetButton, (!durationChoice || isGeneratingProgram) && styles.sheetButtonDisabled]}
                disabled={!durationChoice || isGeneratingProgram}
                onPress={() => {
                  void handleGenerateProgram()
                }}
              >
                {isGeneratingProgram ? (
                  <View style={styles.loaderRow}>
                    {[0, 1, 2].map((index) => (
                      <Animated.View
                        key={`dot-${index}`}
                        style={[
                          styles.loaderDot,
                          {
                            opacity: loaderAnim.interpolate({
                              inputRange: [0, 0.33, 0.66, 1],
                              outputRange:
                                index === 0
                                  ? [1, 0.35, 0.35, 1]
                                  : index === 1
                                    ? [0.35, 1, 0.35, 0.35]
                                    : [0.35, 0.35, 1, 0.35],
                            }),
                          },
                        ]}
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.sheetButtonText}>GENERATE PROGRAM -&gt;</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showChallengeComplete}
        transparent
        animationType="fade"
        onRequestClose={handleFinishChallengeCelebration}
      >
        <View style={styles.completionBackdrop}>
          <View style={styles.completionCard}>
            <MaterialCommunityIcons name="trophy-award" size={88} color="#FF3A2D" />
            <Text style={styles.completionTop}>CHALLENGE</Text>
            <Text style={styles.completionBottom}>COMPLETE!</Text>
            <Text style={styles.completionSubtitle}>30 days. You showed up every day.</Text>

            <View style={styles.completionStatsRow}>
              <View style={styles.completionStatCard}>
                <Text style={styles.completionStatValue}>30</Text>
                <Text style={styles.completionStatLabel}>DAYS COMPLETED</Text>
              </View>
              <View style={styles.completionStatCard}>
                <Text style={styles.completionStatValue}>
                  {activeChallenge?.completedDays.length || 0}
                </Text>
                <Text style={styles.completionStatLabel}>TOTAL WORKOUTS</Text>
              </View>
            </View>

            <Pressable style={styles.shareButton} onPress={() => void handleShareAchievement()}>
              <Text style={styles.shareButtonText}>SHARE ACHIEVEMENT</Text>
            </Pressable>

            <Pressable onPress={() => void handleFinishChallengeCelebration()}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FONTS.inter500,
    fontSize: 14,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: FONTS.condensed800,
    fontSize: 42,
    color: colors.black,
  },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: FONTS.inter400,
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionWrap: {
    marginTop: 16,
  },
  sectionLabel: {
    marginLeft: 20,
    fontFamily: FONTS.inter500,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 10,
  },
  challengeCardWrap: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 24,
    overflow: 'hidden',
  },
  challengeCardImage: {
    height: 200,
  },
  challengeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    padding: 14,
    justifyContent: 'space-between',
  },
  challengeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficultyBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  difficultyText: {
    fontFamily: FONTS.inter500,
    fontSize: 10,
    color: '#FFFFFF',
  },
  tagBadge: {
    borderRadius: 999,
    backgroundColor: '#FF3A2D',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  tagBadgeText: {
    fontFamily: FONTS.inter600,
    fontSize: 10,
    color: '#FFFFFF',
  },
  challengeBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  challengeTextCol: {
    flex: 1,
  },
  challengeName: {
    fontFamily: FONTS.condensed800,
    fontSize: 26,
    color: '#FFFFFF',
  },
  challengeDescription: {
    marginTop: 2,
    fontFamily: FONTS.inter400,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  challengeDurationLabel: {
    marginTop: 6,
    fontFamily: FONTS.inter600,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  joinButton: {
    height: 32,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: {
    fontFamily: FONTS.inter600,
    fontSize: 12,
    color: '#0A0A0A',
  },
  activeCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  activeCardTop: {
    height: 120,
  },
  activeImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  activeChallengeTitle: {
    flex: 1,
    paddingRight: 8,
    fontFamily: FONTS.condensed700,
    fontSize: 22,
    color: '#FFFFFF',
  },
  activeDayCounter: {
    fontFamily: FONTS.condensed800,
    fontSize: 28,
    color: '#FFFFFF',
  },
  progressTrackThin: {
    height: 6,
    backgroundColor: colors.grayFaint,
  },
  progressFillThin: {
    height: '100%',
    backgroundColor: '#FF3A2D',
  },
  activeBottom: {
    padding: 16,
    backgroundColor: colors.white,
  },
  miniLabel: {
    fontFamily: FONTS.inter500,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  todayWorkoutName: {
    marginTop: 4,
    fontFamily: FONTS.condensed700,
    fontSize: 20,
    color: colors.black,
  },
  activeActionRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  doNowButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.black,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doNowButtonText: {
    fontFamily: FONTS.condensed700,
    fontSize: 14,
    color: colors.white,
  },
  leaveChallengeText: {
    fontFamily: FONTS.inter500,
    fontSize: 13,
    color: colors.textSecondary,
  },
  calendarCard: {
    marginTop: 12,
    marginHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
  },
  progressLabel: {
    fontFamily: FONTS.inter500,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleCompleted: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FF3A2D',
  },
  dayCircleToday: {
    backgroundColor: '#FF3A2D',
    shadowColor: '#FF3A2D',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dayCircleNeutral: {
    backgroundColor: colors.offWhite,
  },
  dayTextToday: {
    fontFamily: FONTS.inter600,
    fontSize: 13,
    color: '#FFFFFF',
  },
  dayTextFuture: {
    fontFamily: FONTS.inter500,
    fontSize: 13,
    color: colors.grayLight,
  },
  weeklyCard: {
    marginHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
  },
  weeklyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weeklyKicker: {
    fontFamily: FONTS.inter600,
    fontSize: 12,
    color: '#FF3A2D',
    letterSpacing: 1,
  },
  weeklyReset: {
    fontFamily: FONTS.inter500,
    fontSize: 12,
    color: colors.textSecondary,
  },
  weeklyTitle: {
    marginTop: 10,
    fontFamily: FONTS.condensed800,
    fontSize: 24,
    color: colors.black,
  },
  weeklySubtitle: {
    marginTop: 6,
    fontFamily: FONTS.inter400,
    fontSize: 14,
    color: colors.grayMid,
  },
  weeklyNumbersRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  weeklyTotal: {
    fontFamily: FONTS.condensed700,
    fontSize: 32,
    color: '#FF3A2D',
  },
  weeklyTarget: {
    marginBottom: 5,
    fontFamily: FONTS.inter500,
    fontSize: 13,
    color: colors.textSecondary,
  },
  weeklyProgressTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.grayFaint,
    overflow: 'hidden',
  },
  weeklyProgressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#FF3A2D',
  },
  weeklyFromYou: {
    marginTop: 6,
    alignSelf: 'flex-end',
    fontFamily: FONTS.inter500,
    fontSize: 12,
    color: colors.textSecondary,
  },
  yourContributionLabel: {
    marginTop: 14,
    fontFamily: FONTS.inter500,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  yourContributionValue: {
    marginTop: 4,
    fontFamily: FONTS.condensed800,
    fontSize: 36,
    color: colors.black,
  },
  yourContributionUnit: {
    marginTop: 2,
    fontFamily: FONTS.inter500,
    fontSize: 12,
    color: colors.textSecondary,
  },
  participantRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantText: {
    fontFamily: FONTS.inter400,
    fontSize: 13,
    color: colors.textSecondary,
  },
  programEntryCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 20,
  },
  programEntryTitle: {
    marginTop: 10,
    fontFamily: FONTS.condensed800,
    fontSize: 22,
    color: colors.black,
  },
  programEntrySubtitle: {
    marginTop: 6,
    fontFamily: FONTS.inter400,
    fontSize: 14,
    color: colors.textSecondary,
  },
  buildProgramButton: {
    marginTop: 16,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buildProgramButtonText: {
    fontFamily: FONTS.condensed700,
    fontSize: 16,
    color: colors.white,
  },
  generatedProgramCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 16,
  },
  generatedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  generatedGoalTag: {
    borderRadius: 999,
    backgroundColor: '#FF3A2D',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  generatedGoalTagText: {
    fontFamily: FONTS.inter600,
    fontSize: 10,
    color: '#FFFFFF',
  },
  resetProgramText: {
    fontFamily: FONTS.inter500,
    fontSize: 13,
    color: colors.textSecondary,
  },
  generatedProgramTitle: {
    marginTop: 10,
    fontFamily: FONTS.condensed800,
    fontSize: 22,
    color: colors.black,
  },
  generatedProgramMeta: {
    marginTop: 3,
    fontFamily: FONTS.inter400,
    fontSize: 13,
    color: colors.textSecondary,
  },
  generatedDayRow: {
    marginTop: 12,
    gap: 6,
  },
  generatedOverallTrack: {
    height: 6,
    borderRadius: 99,
    backgroundColor: colors.grayFaint,
    overflow: 'hidden',
  },
  generatedOverallFill: {
    height: '100%',
    backgroundColor: '#FF3A2D',
  },
  generatedDayMeta: {
    alignSelf: 'flex-end',
    fontFamily: FONTS.inter500,
    fontSize: 12,
    color: colors.textSecondary,
  },
  todayAssignmentCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: colors.offWhite,
    padding: 12,
  },
  todayAssignmentLabel: {
    fontFamily: FONTS.inter500,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textSecondary,
  },
  todayAssignmentName: {
    marginTop: 6,
    fontFamily: FONTS.condensed700,
    fontSize: 20,
    color: colors.black,
  },
  startProgramWorkoutButton: {
    marginTop: 12,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FF3A2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startProgramWorkoutText: {
    fontFamily: FONTS.condensed700,
    fontSize: 14,
    color: '#FFFFFF',
  },
  scheduleToggle: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  scheduleToggleText: {
    fontFamily: FONTS.inter500,
    fontSize: 13,
    color: colors.grayMid,
  },
  scheduleList: {
    marginTop: 8,
  },
  weekLabel: {
    marginTop: 12,
    marginBottom: 4,
    fontFamily: FONTS.inter500,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  scheduleRow: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.offWhite,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleDay: {
    width: 46,
    fontFamily: FONTS.inter500,
    fontSize: 13,
    color: colors.textSecondary,
  },
  scheduleWorkout: {
    flex: 1,
    fontFamily: FONTS.inter600,
    fontSize: 14,
    color: colors.black,
  },
  todayDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF3A2D',
  },
  futureDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.grayLight,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignSelf: 'center',
  },
  sheetStep: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: FONTS.inter500,
    fontSize: 12,
    color: '#9A9AB0',
    letterSpacing: 1.5,
  },
  sheetTitle: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: FONTS.condensed800,
    fontSize: 32,
    color: colors.black,
  },
  sheetBackButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sheetBackButtonDisabled: {
    opacity: 0.35,
  },
  sheetBackButtonText: {
    fontFamily: FONTS.inter600,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  goalGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalOption: {
    width: '48.5%',
    height: 80,
    borderRadius: 16,
    backgroundColor: colors.offWhite,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  goalOptionSelected: {
    borderColor: '#FF3A2D',
    backgroundColor: '#FF3A2D10',
  },
  goalOptionEmoji: {
    fontSize: 20,
  },
  goalOptionText: {
    fontFamily: FONTS.inter500,
    fontSize: 14,
    color: colors.grayMid,
  },
  goalOptionTextSelected: {
    fontFamily: FONTS.inter600,
    color: '#FF3A2D',
  },
  daysRow: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
  },
  daysOption: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysOptionSelected: {
    backgroundColor: colors.black,
  },
  daysOptionText: {
    fontFamily: FONTS.inter500,
    fontSize: 14,
    color: colors.textSecondary,
  },
  daysOptionTextSelected: {
    color: colors.white,
  },
  durationList: {
    marginTop: 18,
    gap: 10,
  },
  durationRow: {
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.grayFaint,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationRowSelected: {
    borderLeftColor: '#FF3A2D',
  },
  durationTitle: {
    fontFamily: FONTS.inter600,
    fontSize: 15,
    color: colors.black,
  },
  durationSubtitle: {
    marginTop: 2,
    fontFamily: FONTS.inter400,
    fontSize: 13,
    color: colors.textSecondary,
  },
  popularBadge: {
    borderRadius: 999,
    backgroundColor: '#FF3A2D',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  popularBadgeText: {
    fontFamily: FONTS.inter600,
    fontSize: 10,
    color: '#FFFFFF',
  },
  sheetButton: {
    marginTop: 'auto',
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetButtonDisabled: {
    opacity: 0.42,
  },
  sheetButtonText: {
    fontFamily: FONTS.condensed700,
    fontSize: 16,
    color: colors.white,
  },
  loaderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  completionBackdrop: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  completionCard: {
    alignItems: 'center',
  },
  completionTop: {
    marginTop: 20,
    fontFamily: FONTS.condensed800,
    fontSize: 52,
    color: colors.black,
    lineHeight: 52,
  },
  completionBottom: {
    fontFamily: FONTS.condensed800,
    fontSize: 52,
    color: '#FF3A2D',
    lineHeight: 52,
  },
  completionSubtitle: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: FONTS.inter400,
    fontSize: 16,
    color: colors.grayMid,
  },
  completionStatsRow: {
    marginTop: 20,
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  completionStatCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.offWhite,
    padding: 14,
    alignItems: 'center',
  },
  completionStatValue: {
    fontFamily: FONTS.condensed700,
    fontSize: 34,
    color: colors.black,
  },
  completionStatLabel: {
    marginTop: 2,
    textAlign: 'center',
    fontFamily: FONTS.inter500,
    fontSize: 11,
    color: colors.textSecondary,
  },
  shareButton: {
    marginTop: 22,
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontFamily: FONTS.condensed700,
    fontSize: 16,
    color: colors.white,
  },
  doneText: {
    marginTop: 14,
    fontFamily: FONTS.inter500,
    fontSize: 15,
    color: colors.textSecondary,
  },
})
