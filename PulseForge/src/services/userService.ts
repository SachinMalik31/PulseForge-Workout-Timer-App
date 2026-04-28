import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@config/firebase'
import type { FirestoreUser, AppSettings, ServiceResult } from '@types'

const USERS_COLLECTION = 'users'

export const userService = {
  async createUserDoc(user: FirestoreUser): Promise<FirestoreUser> {
    const ref = doc(db, USERS_COLLECTION, user.uid)
    await setDoc(ref, user)
    return user
  },

  async getUserDoc(uid: string): Promise<ServiceResult<FirestoreUser>> {
    try {
      const ref = doc(db, USERS_COLLECTION, uid)
      const snap = await getDoc(ref)

      if (!snap.exists()) {
        return { data: null, error: 'User document not found' }
      }

      return { data: snap.data() as FirestoreUser, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user'
      return { data: null, error: message }
    }
  },

  async updateUserDoc(
    uid: string,
    updates: Partial<Pick<FirestoreUser, 'fullName' | 'photoURL'>>
  ): Promise<ServiceResult<null>> {
    try {
      const ref = doc(db, USERS_COLLECTION, uid)
      await updateDoc(ref, { ...updates, updatedAt: new Date().toISOString() })
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user'
      return { data: null, error: message }
    }
  },

  async updateUserSettings(
    uid: string,
    settings: AppSettings
  ): Promise<ServiceResult<null>> {
    try {
      const ref = doc(db, USERS_COLLECTION, uid)
      await updateDoc(ref, {
        settings,
        updatedAt: new Date().toISOString(),
      })
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update settings'
      return { data: null, error: message }
    }
  },
}
