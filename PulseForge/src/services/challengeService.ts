import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@config/firebase'
import type {
  Challenge,
  UserChallenge,
  GeneratedProgram,
  ProgramDay,
  ServiceResult,
} from '@types'

const CHALLENGES_COLLECTION = 'challenges'
const USER_CHALLENGES_COLLECTION = 'userChallenges'
const PROGRAMS_COLLECTION = 'generatedPrograms'

// ── Challenge templates (global, read-only for users) ────

export const challengeService = {
  subscribeToTemplates(
    onData: (challenges: Challenge[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(collection(db, CHALLENGES_COLLECTION), orderBy('name'))

    return onSnapshot(
      q,
      (snapshot) => {
        const challenges = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as Challenge[]
        onData(challenges)
      },
      onError
    )
  },

  async getAll(): Promise<ServiceResult<Challenge[]>> {
    try {
      const q = query(collection(db, CHALLENGES_COLLECTION), orderBy('name'))
      const snapshot = await getDocs(q)
      const challenges = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as Challenge[]
      return { data: challenges, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load challenges'
      return { data: null, error: message }
    }
  },

  async getById(id: string): Promise<ServiceResult<Challenge>> {
    try {
      const ref = doc(db, CHALLENGES_COLLECTION, id)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        return { data: null, error: 'Challenge not found' }
      }
      return { data: { ...snap.data(), id: snap.id } as Challenge, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load challenge'
      return { data: null, error: message }
    }
  },

  async create(challenge: Omit<Challenge, 'id'>): Promise<ServiceResult<Challenge>> {
    try {
      const ref = await addDoc(collection(db, CHALLENGES_COLLECTION), challenge)
      return { data: { ...challenge, id: ref.id } as Challenge, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create challenge'
      return { data: null, error: message }
    }
  },

  async update(id: string, updates: Partial<Challenge>): Promise<ServiceResult<null>> {
    try {
      const ref = doc(db, CHALLENGES_COLLECTION, id)
      await updateDoc(ref, updates)
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update challenge'
      return { data: null, error: message }
    }
  },

  async delete(id: string): Promise<ServiceResult<null>> {
    try {
      const ref = doc(db, CHALLENGES_COLLECTION, id)
      await deleteDoc(ref)
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete challenge'
      return { data: null, error: message }
    }
  },

  // ── User challenge enrollment ──────────────────────────

  subscribeToUserChallenge(
    userId: string,
    onData: (challenge: UserChallenge | null) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, USER_CHALLENGES_COLLECTION),
      where('userId', '==', userId),
      where('isActive', '==', true),
      limit(1)
    )

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          onData(null)
          return
        }
        const d = snapshot.docs[0]
        onData({ ...d.data(), id: d.id } as UserChallenge)
      },
      onError
    )
  },

  async getUserChallengeHistory(userId: string): Promise<ServiceResult<UserChallenge[]>> {
    try {
      const q = query(
        collection(db, USER_CHALLENGES_COLLECTION),
        where('userId', '==', userId),
        orderBy('startDate', 'desc')
      )
      const snapshot = await getDocs(q)
      const entries = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as UserChallenge[]
      return { data: entries, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load challenge history'
      return { data: null, error: message }
    }
  },

  async startChallenge(
    userId: string,
    challengeId: string
  ): Promise<ServiceResult<UserChallenge>> {
    try {
      const entry: Omit<UserChallenge, 'id'> = {
        userId,
        challengeId,
        startDate: new Date().toISOString(),
        completedDays: [],
        isActive: true,
      }
      const ref = await addDoc(collection(db, USER_CHALLENGES_COLLECTION), entry)
      return { data: { ...entry, id: ref.id } as UserChallenge, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start challenge'
      return { data: null, error: message }
    }
  },

  async updateUserChallenge(
    id: string,
    updates: Partial<Pick<UserChallenge, 'completedDays' | 'isActive'>>
  ): Promise<ServiceResult<null>> {
    try {
      const ref = doc(db, USER_CHALLENGES_COLLECTION, id)
      await updateDoc(ref, updates)
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update challenge progress'
      return { data: null, error: message }
    }
  },

  async quitChallenge(id: string): Promise<ServiceResult<null>> {
    try {
      const ref = doc(db, USER_CHALLENGES_COLLECTION, id)
      await updateDoc(ref, { isActive: false })
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to quit challenge'
      return { data: null, error: message }
    }
  },

  // ── Generated programs ─────────────────────────────────

  subscribeToProgram(
    userId: string,
    onData: (program: GeneratedProgram | null) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, PROGRAMS_COLLECTION),
      where('userId', '==', userId),
      orderBy('generatedAt', 'desc'),
      limit(1)
    )

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          onData(null)
          return
        }
        const d = snapshot.docs[0]
        onData({ ...d.data(), id: d.id } as GeneratedProgram)
      },
      onError
    )
  },

  async createProgram(
    program: Omit<GeneratedProgram, 'id'>
  ): Promise<ServiceResult<GeneratedProgram>> {
    try {
      const ref = await addDoc(collection(db, PROGRAMS_COLLECTION), program)
      return { data: { ...program, id: ref.id } as GeneratedProgram, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create program'
      return { data: null, error: message }
    }
  },

  async updateProgram(
    id: string,
    updates: Partial<Pick<GeneratedProgram, 'currentDay' | 'schedule'>>
  ): Promise<ServiceResult<null>> {
    try {
      const ref = doc(db, PROGRAMS_COLLECTION, id)
      await updateDoc(ref, updates)
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update program'
      return { data: null, error: message }
    }
  },

  async deleteProgram(id: string): Promise<ServiceResult<null>> {
    try {
      const ref = doc(db, PROGRAMS_COLLECTION, id)
      await deleteDoc(ref)
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete program'
      return { data: null, error: message }
    }
  },
}
