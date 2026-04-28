import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '@config/firebase'
import { userService } from '@services/userService'
import type { FirestoreUser, ServiceResult } from '@types'

export const authService = {
  async signUp(
    email: string,
    password: string,
    fullName: string
  ): Promise<ServiceResult<FirestoreUser>> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName: fullName })

      const firestoreUser = await userService.createUserDoc({
        uid: credential.user.uid,
        fullName,
        email: credential.user.email ?? email,
        photoURL: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      return { data: firestoreUser, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed'
      return { data: null, error: message }
    }
  },

  async signIn(
    email: string,
    password: string
  ): Promise<ServiceResult<FirebaseUser>> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      return { data: credential.user, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      return { data: null, error: message }
    }
  },

  async signInWithGoogle(idToken: string): Promise<ServiceResult<FirebaseUser>> {
    try {
      const credential = GoogleAuthProvider.credential(idToken)
      const result = await signInWithCredential(auth, credential)
      return { data: result.user, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign in failed'
      return { data: null, error: message }
    }
  },

  async signOut(): Promise<ServiceResult<null>> {
    try {
      await signOut(auth)
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign out failed'
      return { data: null, error: message }
    }
  },

  async resetPassword(email: string): Promise<ServiceResult<null>> {
    try {
      const callable = httpsCallable<{ email: string }, { success: boolean }>(
        functions,
        'sendPasswordReset'
      )
      await callable({ email })
      return { data: null, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset failed'
      return { data: null, error: message }
    }
  },

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback)
  },
}
