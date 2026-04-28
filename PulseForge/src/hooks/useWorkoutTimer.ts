import { useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { Workout } from '@types'

export type TimerState = 'idle' | 'countdown' | 'exercise' | 'rest' | 'complete'

export interface WorkoutTimerState {
  state: TimerState
  currentExerciseIndex: number
  timeRemaining: number
  isRunning: boolean
  completedExercises: number
  totalElapsed: number
  isResting: boolean
}

interface UseWorkoutTimerProps {
  workout: Workout
  countdownDuration: number
  onExerciseStart?: (exerciseIndex: number) => void
  onRestStart?: (duration: number) => void
  onWorkoutComplete?: () => void
  audioAlert?: (count: number) => void
  hapticFeedback?: boolean
}

export const useWorkoutTimer = ({
  workout,
  countdownDuration,
  onExerciseStart,
  onRestStart,
  onWorkoutComplete,
  audioAlert,
  hapticFeedback = true,
}: UseWorkoutTimerProps) => {
  const [timerState, setTimerState] = useState<WorkoutTimerState>({
    state: 'idle',
    currentExerciseIndex: 0,
    timeRemaining: countdownDuration,
    isRunning: false,
    completedExercises: 0,
    totalElapsed: 0,
    isResting: false,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Timer tick logic
  useEffect(() => {
    if (!timerState.isRunning) return

    intervalRef.current = setInterval(() => {
      const remaining = timerState.timeRemaining - 1

      if (remaining <= 0) {
        // Time's up for current phase
        setTimerState((prev) => ({
          ...prev,
          timeRemaining: 0,
          totalElapsed: prev.totalElapsed + 1,
        }))
        handlePhaseComplete()
      } else {
        setTimerState((prev) => ({
          ...prev,
          timeRemaining: remaining,
          totalElapsed: prev.totalElapsed + 1,
        }))

        // Play sound/haptic at specific intervals
        if (remaining === 3 || remaining === 2 || remaining === 1) {
          if (audioAlert) {
            audioAlert(remaining)
          }
          if (hapticFeedback) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }
        }
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerState.isRunning, timerState.timeRemaining, timerState.state])

  const handlePhaseComplete = async () => {
    const { state, currentExerciseIndex, isResting } = timerState

    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }

    if (state === 'countdown') {
      // Start first exercise
      const firstExercise = workout.exercises[0]
      setTimerState((prev) => ({
        ...prev,
        state: 'exercise',
        timeRemaining: firstExercise.workDuration,
        isRunning: true,
      }))
      onExerciseStart?.(0)
    } else if (state === 'exercise') {
      // Check if there's a rest period
      const currentExercise = workout.exercises[currentExerciseIndex]
      if (currentExercise.restDuration > 0) {
        setTimerState((prev) => ({
          ...prev,
          state: 'rest',
          timeRemaining: currentExercise.restDuration,
          isRunning: true,
          isResting: true,
        }))
        onRestStart?.(currentExercise.restDuration)
      } else {
        // No rest, go to next exercise
        moveToNextExercise()
      }
    } else if (state === 'rest') {
      // Move to next exercise
      moveToNextExercise()
    }
  }

  const moveToNextExercise = () => {
    const nextIndex = timerState.currentExerciseIndex + 1

    if (nextIndex < workout.exercises.length) {
      const nextExercise = workout.exercises[nextIndex]
      setTimerState((prev) => ({
        ...prev,
        state: 'exercise',
        currentExerciseIndex: nextIndex,
        timeRemaining: nextExercise.workDuration,
        isRunning: true,
        completedExercises: prev.completedExercises + 1,
        isResting: false,
      }))
      onExerciseStart?.(nextIndex)
    } else {
      // Workout complete
      setTimerState((prev) => ({
        ...prev,
        state: 'complete',
        isRunning: false,
        completedExercises: workout.exercises.length,
      }))
      onWorkoutComplete?.()
    }
  }

  const startWorkout = () => {
    setTimerState((prev) => ({
      ...prev,
      state: 'countdown',
      timeRemaining: countdownDuration,
      isRunning: true,
    }))
  }

  const pauseWorkout = () => {
    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
    }))
  }

  const resumeWorkout = () => {
    setTimerState((prev) => ({
      ...prev,
      isRunning: true,
    }))
  }

  const skipExercise = () => {
    pauseWorkout()
    moveToNextExercise()
  }

  const stopWorkout = () => {
    setTimerState({
      state: 'idle',
      currentExerciseIndex: 0,
      timeRemaining: countdownDuration,
      isRunning: false,
      completedExercises: 0,
      totalElapsed: 0,
      isResting: false,
    })
  }

  return {
    ...timerState,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    skipExercise,
    stopWorkout,
  }
}
