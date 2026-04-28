import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@config/firebase'
import type { Workout, WorkoutHistory, Exercise, ServiceResult } from '@types'

const WORKOUTS_COLLECTION = 'workouts'
const HISTORY_COLLECTION = 'workoutHistory'

const isIndexBuildingError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes('requires an index') &&
    message.includes('currently building')
  )
}

const sortWorkoutsByCreatedAtDesc = (workouts: Workout[]): Workout[] => {
  return [...workouts].sort((a, b) => {
    const aMs = Date.parse(a.createdAt ?? '')
    const bMs = Date.parse(b.createdAt ?? '')
    return (Number.isNaN(bMs) ? 0 : bMs) - (Number.isNaN(aMs) ? 0 : aMs)
  })
}

const sortHistoryByCompletedAtDesc = (history: WorkoutHistory[]): WorkoutHistory[] => {
  return [...history].sort((a, b) => {
    const aMs = Date.parse(a.completedAt)
    const bMs = Date.parse(b.completedAt)
    return (Number.isNaN(bMs) ? 0 : bMs) - (Number.isNaN(aMs) ? 0 : aMs)
  })
}

export const workoutService = {
  // ── Workouts ───────────────────────────────────────────

  subscribeToWorkouts(
    userId: string,
    onData: (workouts: Workout[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, WORKOUTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    const fallbackQuery = query(
      collection(db, WORKOUTS_COLLECTION),
      where('userId', '==', userId)
    )

    let activeUnsubscribe: Unsubscribe = () => {}

    const mapSnapshot = (snapshot: { docs: Array<{ data: () => unknown; id: string }> }) => {
      return snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as Workout[]
    }

    activeUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        onData(mapSnapshot(snapshot))
      },
      (error) => {
        if (isIndexBuildingError(error)) {
          activeUnsubscribe = onSnapshot(
            fallbackQuery,
            (fallbackSnapshot) => {
              const unsorted = mapSnapshot(fallbackSnapshot)
              onData(sortWorkoutsByCreatedAtDesc(unsorted))
            },
            onError
          )
          return
        }

        onError(error)
      }
    )

    return () => activeUnsubscribe()
  },

  async getWorkouts(userId: string): Promise<ServiceResult<Workout[]>> {
    try {
      const q = query(
        collection(db, WORKOUTS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const workouts = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as Workout[]
      return { data: workouts, error: null }
    } catch (err: unknown) {
      if (isIndexBuildingError(err)) {
        try {
          const fallbackSnapshot = await getDocs(
            query(collection(db, WORKOUTS_COLLECTION), where('userId', '==', userId))
          )
          const unsorted = fallbackSnapshot.docs.map((d) => ({
            ...d.data(),
            id: d.id,
          })) as Workout[]
          return { data: sortWorkoutsByCreatedAtDesc(unsorted), error: null }
        } catch (fallbackErr: unknown) {
          const fallbackMessage =
            fallbackErr instanceof Error ? fallbackErr.message : 'Failed to load workouts'
          return { data: null, error: fallbackMessage }
        }
      }

      const message = err instanceof Error ? err.message : 'Failed to load workouts'
      return { data: null, error: message }
    }
  },

  async addWorkout(workout: Omit<Workout, 'id'>): Promise<ServiceResult<Workout>> {
    try {
      const ref = await addDoc(collection(db, WORKOUTS_COLLECTION), workout)
      return { data: { ...workout, id: ref.id } as Workout, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add workout'
      return { data: null, error: message }
    }
  },

  async updateWorkout(
    workoutId: string,
    updates: Partial<Workout>
  ): Promise<ServiceResult<null>> {
    try {
      const ref = doc(db, WORKOUTS_COLLECTION, workoutId)
      await updateDoc(ref, updates)
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update workout'
      return { data: null, error: message }
    }
  },

  async deleteWorkout(workoutId: string): Promise<ServiceResult<null>> {
    try {
      const ref = doc(db, WORKOUTS_COLLECTION, workoutId)
      await deleteDoc(ref)
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete workout'
      return { data: null, error: message }
    }
  },

  async addExerciseToWorkout(
    workoutId: string,
    exercises: Exercise[]
  ): Promise<ServiceResult<null>> {
    try {
      const ref = doc(db, WORKOUTS_COLLECTION, workoutId)
      await updateDoc(ref, { exercises })
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update exercises'
      return { data: null, error: message }
    }
  },

  // ── History ────────────────────────────────────────────

  subscribeToHistory(
    userId: string,
    onData: (history: WorkoutHistory[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, HISTORY_COLLECTION),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc')
    )

    const fallbackQuery = query(
      collection(db, HISTORY_COLLECTION),
      where('userId', '==', userId)
    )

    let activeUnsubscribe: Unsubscribe = () => {}

    const mapSnapshot = (snapshot: { docs: Array<{ data: () => unknown; id: string }> }) => {
      return snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as WorkoutHistory[]
    }

    activeUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        onData(mapSnapshot(snapshot))
      },
      (error) => {
        if (isIndexBuildingError(error)) {
          activeUnsubscribe = onSnapshot(
            fallbackQuery,
            (fallbackSnapshot) => {
              const unsorted = mapSnapshot(fallbackSnapshot)
              onData(sortHistoryByCompletedAtDesc(unsorted))
            },
            onError
          )
          return
        }

        onError(error)
      }
    )

    return () => activeUnsubscribe()
  },

  async addWorkoutToHistory(
    entry: Omit<WorkoutHistory, 'id'>
  ): Promise<ServiceResult<WorkoutHistory>> {
    try {
      const ref = await addDoc(collection(db, HISTORY_COLLECTION), entry)
      return { data: { ...entry, id: ref.id } as WorkoutHistory, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save history'
      return { data: null, error: message }
    }
  },
}
