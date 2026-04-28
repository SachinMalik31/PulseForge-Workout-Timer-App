import React, { useEffect, useMemo, useRef } from 'react'
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { useWorkout } from '@context/WorkoutContext'
import { useSettings } from '@context/SettingsContext'
import { useAppTheme } from '@context/ThemeContext'
import { useWorkoutTimer } from '@hooks/useWorkoutTimer'
import { useAudioFeedback } from '@hooks/useAudioFeedback'
import { useUser } from '@hooks/useUser'
import { BORDER_RADIUS, FONTS, SPACING, STORAGE_KEYS } from '@constants'
import { formatTime } from '@utils/helpers'
import { Workout } from '@types'
import ExerciseAnimation from '@/components/ExerciseAnimation'

const RING_SIZE = 160
const STROKE_WIDTH = 10
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const EMPTY_WORKOUT: Workout = {
  id: 'empty-workout',
  name: 'Quick Session',
  difficulty: 'Beginner',
  type: 'Cardio',
  exercises: [],
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export default function TimerScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { firstName } = useUser()
  const { currentWorkout, addWorkoutToHistory } = useWorkout()
  const { settings } = useSettings()
  const { colors } = useAppTheme()
  const activeWorkout = currentWorkout ?? EMPTY_WORKOUT
  const styles = useMemo(() => makeStyles(colors, insets.top), [colors, insets.top])

  const ringProgress = useRef(new Animated.Value(0)).current
  const completeScale = useRef(new Animated.Value(0)).current
  const startedWorkoutIdRef = useRef<string | null>(null)
  const startWorkoutRef = useRef<() => void>(() => {})

  const { speakCountdown, announceGo, announceExercise, announceRest, announceComplete, stopSpeaking } =
    useAudioFeedback({
      audioAlerts: settings.audioAlerts,
      voiceGuidance: settings.voiceGuidance,
    })

  const timer = useWorkoutTimer({
    workout: activeWorkout,
    countdownDuration: settings.countdownBeforeStart,
    onExerciseStart: async (exerciseIndex: number) => {
      if (settings.vibration) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      }
      announceGo()
      const exerciseName = activeWorkout.exercises[exerciseIndex]?.name
      if (exerciseName) announceExercise(exerciseName)
    },
    onRestStart: async () => {
      if (settings.vibration) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
      announceRest()
    },
    onWorkoutComplete: async () => {
      if (settings.vibration) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      announceComplete()
      Animated.sequence([
        Animated.spring(completeScale, {
          toValue: 1.2,
          useNativeDriver: true,
          speed: 16,
          bounciness: 8,
        }),
        Animated.spring(completeScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 16,
          bounciness: 6,
        }),
      ]).start()
    },
    audioAlert: speakCountdown,
    hapticFeedback: settings.vibration,
  })

  useEffect(() => {
    startWorkoutRef.current = timer.startWorkout
  }, [timer.startWorkout])

  useEffect(() => {
    const workoutId = currentWorkout?.id

    if (!workoutId) {
      startedWorkoutIdRef.current = null
      return
    }

    if (startedWorkoutIdRef.current === workoutId) {
      return
    }

    startedWorkoutIdRef.current = workoutId
    startWorkoutRef.current()
  }, [currentWorkout?.id])

  const stateDuration = useMemo(() => {
    if (timer.state === 'countdown') return Math.max(settings.countdownBeforeStart, 1)

    const exercise = activeWorkout.exercises[timer.currentExerciseIndex]
    if (!exercise) return 1

    return timer.state === 'rest'
      ? Math.max(exercise.restDuration, 1)
      : Math.max(exercise.workDuration, 1)
  }, [
    timer.state,
    timer.currentExerciseIndex,
    settings.countdownBeforeStart,
    activeWorkout.exercises,
  ])

  const progress = 1 - timer.timeRemaining / stateDuration
  const clampedProgress = Math.min(Math.max(progress, 0), 1)

  useEffect(() => {
    Animated.timing(ringProgress, {
      toValue: clampedProgress,
      duration: 250,
      useNativeDriver: false,
    }).start()
  }, [clampedProgress, ringProgress])

  const ringOffset = ringProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  })

  const currentExercise = activeWorkout.exercises[timer.currentExerciseIndex]
  const nextExercise = activeWorkout.exercises[timer.currentExerciseIndex + 1]
  const exerciseCountLabel = `${Math.min(timer.currentExerciseIndex + 1, Math.max(activeWorkout.exercises.length, 1))} OF ${Math.max(activeWorkout.exercises.length, 1)}`
  const completionRatio = activeWorkout.exercises.length
    ? timer.completedExercises / activeWorkout.exercises.length
    : 0
  const progressBarWidth = `${Math.round(completionRatio * 100)}%` as `${number}%`

  const handleStop = () => {
    Alert.alert('Stop Workout', 'Are you sure you want to stop this workout?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Stop',
        onPress: () => {
          stopSpeaking()
          void AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKOUT)
          timer.stopWorkout()
          router.back()
        },
      },
    ])
  }

  const handleCompleteWorkout = async () => {
    try {
      await addWorkoutToHistory({
        id: Math.random().toString(36).substr(2, 9),
        workoutId: activeWorkout.id,
        workoutName: activeWorkout.name,
        completedAt: new Date().toISOString(),
        durationSeconds: timer.totalElapsed,
        exercisesCompleted: timer.completedExercises,
      })

      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKOUT)

      router.replace('/(tabs)/history')
    } catch (error) {
      console.error('Error saving workout:', error)
      Alert.alert('Error', 'Failed to save workout')
    }
  }

  const isRest = timer.state === 'rest'
  const isComplete = timer.state === 'complete'
  const isPaused = !timer.isRunning && !isComplete
  const ringColor = isRest ? colors.warning : colors.primary

  if (!currentWorkout) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>NO WORKOUT SELECTED</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        {!isComplete ? (
          <>
            <View style={styles.topBar}>
              <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && styles.pressedScale]}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.black} />
              </Pressable>
              <Text style={styles.topTitle} numberOfLines={1}>
                {activeWorkout.name.toUpperCase()}
              </Text>
              <Text style={styles.topMeta}>{exerciseCountLabel}</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressBarWidth }]} />
            </View>

            <View style={styles.mainBody}>
              <Text style={[styles.phaseLabel, isRest && styles.phaseLabelRest]}>
                {isRest ? 'REST' : timer.state === 'countdown' ? 'COUNTDOWN' : 'EXERCISE'}
              </Text>

              {isRest && nextExercise ? (
                <>
                  <Text style={styles.nextUpLabel}>NEXT UP</Text>
                  <Text style={styles.exerciseNameLarge} numberOfLines={2}>
                    {nextExercise.name.toUpperCase()}
                  </Text>
                </>
              ) : (
                <Text style={styles.exerciseNameLarge} numberOfLines={2}>
                  {(currentExercise?.name || 'GET READY').toUpperCase()}
                </Text>
              )}

              <View style={styles.animationWrap}>
                <ExerciseAnimation
                  exerciseName={currentExercise?.name || 'GET READY'}
                  isRest={isRest}
                  isPaused={isPaused}
                  size={220}
                />
              </View>

              <View style={styles.ringWrap}>
                <View
                  style={[
                    styles.ringGlow,
                    {
                      backgroundColor: isRest ? '#FF950022' : '#FF3A2D22',
                    },
                  ]}
                />
                <Svg width={RING_SIZE} height={RING_SIZE}>
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={colors.grayFaint}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                  />
                  <AnimatedCircle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={ringColor}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    rotation={-90}
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  />
                </Svg>
                <View style={styles.ringCenter}>
                  <Text style={styles.countdownText}>{timer.timeRemaining}</Text>
                </View>
              </View>

              <View style={styles.metaChipRow}>
                {currentExercise?.reps > 1 ? (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>{currentExercise.reps} REPS</Text>
                  </View>
                ) : null}
                {currentExercise?.sets > 1 ? (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>{currentExercise.sets} SETS</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.controlsWrap}>
              <Pressable
                onPress={() => (timer.isRunning ? timer.pauseWorkout() : timer.resumeWorkout())}
                style={({ pressed }) => [styles.pauseButton, pressed && styles.pressedScale]}
              >
                <Text style={styles.pauseButtonText}>{timer.isRunning ? 'PAUSE' : 'RESUME'}</Text>
              </Pressable>

              <View style={styles.secondaryRow}>
                <Pressable
                  onPress={() => timer.skipExercise()}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressedScale]}
                >
                  <Text style={styles.secondaryButtonText}>SKIP</Text>
                </Pressable>

                <Pressable
                  onPress={handleStop}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressedScale]}
                >
                  <Text style={styles.stopText}>STOP</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.completeScreen}>
            <View style={styles.completeTop}>
              <Animated.View style={{ transform: [{ scale: completeScale }] }}>
                <MaterialCommunityIcons name="check-circle" size={92} color={colors.primary} />
              </Animated.View>

              <Text style={styles.completeWorkout}>WORKOUT</Text>
              <Text style={styles.completeDone}>COMPLETE</Text>
              <Text style={styles.completePersonal}>Great work, {firstName}!</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatTime(timer.totalElapsed)}</Text>
                <Text style={styles.statLabel}>TOTAL TIME</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{timer.completedExercises}</Text>
                <Text style={styles.statLabel}>EXERCISES</Text>
              </View>
            </View>

            <View style={styles.completeButtons}>
              <Pressable onPress={handleCompleteWorkout} style={({ pressed }) => [styles.finishButton, pressed && styles.pressedScale]}>
                <Text style={styles.finishButtonText}>SAVE & FINISH</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKOUT)
                  router.replace('/(tabs)/workouts')
                }}
              >
                <Text style={styles.discardText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors'], insetTop: number) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  topBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: Math.max(insetTop, SPACING.sm) + SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.condensed700,
    fontSize: 18,
    color: colors.black,
  },
  topMeta: {
    fontFamily: FONTS.inter500,
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressTrack: {
    marginTop: SPACING.sm,
    height: 3,
    backgroundColor: colors.grayFaint,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  mainBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  phaseLabel: {
    fontFamily: FONTS.inter500,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.textSecondary,
  },
  phaseLabelRest: {
    color: colors.primary,
  },
  nextUpLabel: {
    marginTop: 12,
    fontFamily: FONTS.inter500,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textSecondary,
  },
  exerciseNameLarge: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: FONTS.condensed800,
    fontSize: 42,
    lineHeight: 42,
    color: colors.black,
  },
  animationWrap: {
    marginTop: SPACING.lg,
  },
  metaChipRow: {
    marginTop: SPACING.lg,
    minHeight: 32,
    flexDirection: 'row',
    gap: 8,
  },
  metaChip: {
    backgroundColor: colors.offWhite,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaChipText: {
    fontFamily: FONTS.inter500,
    fontSize: 12,
    color: colors.grayMid,
  },
  ringWrap: {
    marginTop: SPACING.lg,
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringGlow: {
    position: 'absolute',
    width: RING_SIZE + 24,
    height: RING_SIZE + 24,
    borderRadius: (RING_SIZE + 24) / 2,
    opacity: 0.65,
  },
  ringCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontFamily: FONTS.condensed800,
    fontSize: 56,
    color: colors.black,
  },
  controlsWrap: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: 10,
  },
  pauseButton: {
    height: 56,
    borderRadius: BORDER_RADIUS.xxl,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButtonText: {
    fontFamily: FONTS.condensed700,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: colors.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: FONTS.inter600,
    fontSize: 14,
    color: colors.black,
  },
  stopText: {
    fontFamily: FONTS.inter600,
    fontSize: 14,
    color: colors.primary,
  },
  completeScreen: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xl,
  },
  completeTop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeWorkout: {
    marginTop: SPACING.lg,
    fontFamily: FONTS.condensed800,
    fontSize: 56,
    lineHeight: 56,
    color: colors.black,
  },
  completeDone: {
    fontFamily: FONTS.condensed800,
    fontSize: 56,
    lineHeight: 56,
    color: colors.primary,
  },
  completePersonal: {
    marginTop: 6,
    fontFamily: FONTS.inter500,
    fontSize: 15,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.offWhite,
    borderRadius: BORDER_RADIUS.xxl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.condensed700,
    fontSize: 36,
    color: colors.black,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: FONTS.inter500,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.textSecondary,
  },
  completeButtons: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    gap: 14,
  },
  finishButton: {
    width: '100%',
    height: 56,
    borderRadius: BORDER_RADIUS.xxl,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishButtonText: {
    fontFamily: FONTS.condensed700,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.white,
  },
  discardText: {
    fontFamily: FONTS.inter500,
    fontSize: 14,
    color: colors.textSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.condensed700,
    fontSize: 30,
    color: colors.grayLight,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
})