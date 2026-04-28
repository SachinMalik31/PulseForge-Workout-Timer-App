import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Workout, WorkoutHistory, Exercise } from '@types'
import { workoutService } from '@services/workoutService'
import { getSampleWorkouts } from '@utils/sampleWorkouts'
import { useUser } from '@context/UserContext'

interface WorkoutContextType {
  workouts: Workout[]
  history: WorkoutHistory[]
  currentWorkout: Workout | null
  isLoading: boolean

  // Workout management
  loadWorkouts: () => Promise<void>
  addWorkout: (workout: Workout) => Promise<void>
  updateWorkout: (workout: Workout) => Promise<void>
  deleteWorkout: (workoutId: string) => Promise<void>
  selectWorkout: (workout: Workout) => void

  // Workout execution
  addExerciseToWorkout: (workoutId: string, exercise: Exercise) => Promise<void>
  updateExerciseInWorkout: (
    workoutId: string,
    exerciseId: string,
    exercise: Exercise
  ) => Promise<void>
  deleteExerciseFromWorkout: (workoutId: string, exerciseId: string) => Promise<void>

  // History
  addWorkoutToHistory: (history: WorkoutHistory) => Promise<void>
  getWorkoutStats: () => { total: number; totalMinutes: number; thisWeek: number; thisMonth: number }
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined)

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useUser()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [history, setHistory] = useState<WorkoutHistory[]>([])
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [seeded, setSeeded] = useState(false)

  const userId = user?.uid ?? null

  // Subscribe to workouts in real-time
  useEffect(() => {
    if (!userId) {
      setWorkouts([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const unsubscribe = workoutService.subscribeToWorkouts(
      userId,
      async (data) => {
        // Seed sample workouts for new users with no workouts
        if (data.length === 0 && !seeded) {
          setSeeded(true)
          const samples = getSampleWorkouts().map((w) => ({
            ...w,
            userId,
            createdAt: new Date().toISOString(),
          }))
          for (const sample of samples) {
            const { id: _id, ...rest } = sample
            await workoutService.addWorkout(rest)
          }
          // Real-time listener will fire again with seeded data
          return
        }
        setWorkouts(data)
        setIsLoading(false)
      },
      (error) => {
        console.error('Workout subscription error:', error)
        setIsLoading(false)
      }
    )

    return unsubscribe
  }, [userId, seeded])

  // Subscribe to history in real-time
  useEffect(() => {
    if (!userId) {
      setHistory([])
      return
    }

    const unsubscribe = workoutService.subscribeToHistory(
      userId,
      (data) => setHistory(data),
      (error) => console.error('History subscription error:', error)
    )

    return unsubscribe
  }, [userId])

  const loadWorkouts = useCallback(async () => {
    if (!userId) return
    const result = await workoutService.getWorkouts(userId)
    if (result.data) {
      setWorkouts(result.data)
    }
  }, [userId])

  const addWorkout = useCallback(async (workout: Workout) => {
    if (!userId) return
    const { id: _id, ...rest } = workout
    const result = await workoutService.addWorkout({
      ...rest,
      userId,
      createdAt: new Date().toISOString(),
    })
    if (result.error) {
      throw new Error(result.error)
    }
  }, [userId])

  const updateWorkout = useCallback(async (workout: Workout) => {
    const result = await workoutService.updateWorkout(workout.id, {
      name: workout.name,
      difficulty: workout.difficulty,
      type: workout.type,
      exercises: workout.exercises,
    })
    if (result.error) {
      throw new Error(result.error)
    }
    if (currentWorkout?.id === workout.id) {
      setCurrentWorkout(workout)
    }
  }, [currentWorkout])

  const deleteWorkout = useCallback(async (workoutId: string) => {
    const result = await workoutService.deleteWorkout(workoutId)
    if (result.error) {
      throw new Error(result.error)
    }
    if (currentWorkout?.id === workoutId) {
      setCurrentWorkout(null)
    }
  }, [currentWorkout])

  const selectWorkout = useCallback((workout: Workout) => {
    setCurrentWorkout(workout)
  }, [])

  const addExerciseToWorkout = useCallback(async (workoutId: string, exercise: Exercise) => {
    const target = workouts.find((w) => w.id === workoutId)
    if (!target) return
    const updatedExercises = [...target.exercises, exercise]
    const result = await workoutService.addExerciseToWorkout(workoutId, updatedExercises)
    if (result.error) {
      throw new Error(result.error)
    }
    if (currentWorkout?.id === workoutId) {
      setCurrentWorkout({ ...target, exercises: updatedExercises })
    }
  }, [workouts, currentWorkout])

  const updateExerciseInWorkout = useCallback(async (
    workoutId: string,
    exerciseId: string,
    exercise: Exercise
  ) => {
    const target = workouts.find((w) => w.id === workoutId)
    if (!target) return
    const updatedExercises = target.exercises.map((e) =>
      e.id === exerciseId ? exercise : e
    )
    const result = await workoutService.addExerciseToWorkout(workoutId, updatedExercises)
    if (result.error) {
      throw new Error(result.error)
    }
    if (currentWorkout?.id === workoutId) {
      setCurrentWorkout({ ...target, exercises: updatedExercises })
    }
  }, [workouts, currentWorkout])

  const deleteExerciseFromWorkout = useCallback(async (
    workoutId: string,
    exerciseId: string
  ) => {
    const target = workouts.find((w) => w.id === workoutId)
    if (!target) return
    const updatedExercises = target.exercises.filter((e) => e.id !== exerciseId)
    const result = await workoutService.addExerciseToWorkout(workoutId, updatedExercises)
    if (result.error) {
      throw new Error(result.error)
    }
    if (currentWorkout?.id === workoutId) {
      setCurrentWorkout({ ...target, exercises: updatedExercises })
    }
  }, [workouts, currentWorkout])

  const addWorkoutToHistory = useCallback(async (workoutHistory: WorkoutHistory) => {
    if (!userId) return
    const { id: _id, ...rest } = workoutHistory
    const result = await workoutService.addWorkoutToHistory({
      ...rest,
      userId,
    })
    if (result.error) {
      throw new Error(result.error)
    }
  }, [userId])

  const getWorkoutStats = useCallback(() => {
    const now = new Date()
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    return {
      total: history.length,
      totalMinutes: Math.round(
        history.reduce((sum, h) => sum + h.durationSeconds, 0) / 60
      ),
      thisWeek: history.filter(
        (h) => new Date(h.completedAt) > thisWeekStart
      ).length,
      thisMonth: history.filter(
        (h) => new Date(h.completedAt) > thisMonthStart
      ).length,
    }
  }, [history])

  return (
    <WorkoutContext.Provider
      value={{
        workouts,
        history,
        currentWorkout,
        isLoading,
        loadWorkouts,
        addWorkout,
        updateWorkout,
        deleteWorkout,
        selectWorkout,
        addExerciseToWorkout,
        updateExerciseInWorkout,
        deleteExerciseFromWorkout,
        addWorkoutToHistory,
        getWorkoutStats,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  )
}

export const useWorkout = () => {
  const context = useContext(WorkoutContext)
  if (!context) {
    throw new Error('useWorkout must be used within WorkoutProvider')
  }
  return context
}
