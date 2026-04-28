import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { type User as FirebaseUser } from 'firebase/auth'
import { authService } from '@services/authService'
import { userService } from '@services/userService'
import type { FirestoreUser } from '@types'

interface UserContextType {
  user: FirestoreUser | null
  firebaseUser: FirebaseUser | null
  isLoading: boolean
  name: string
  firstName: string
  email: string
  photoURL: string | null
  login: (email: string, password: string) => Promise<boolean>
  loginWithGoogle: (idToken: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

const DEFAULT_FIRST_NAME = 'Athlete'

const getFirstName = (name: string | undefined) => {
  if (!name) return DEFAULT_FIRST_NAME
  const trimmed = name.trim()
  if (!trimmed) return DEFAULT_FIRST_NAME
  return trimmed.split(' ')[0]
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser)

      if (fbUser) {
        const result = await userService.getUserDoc(fbUser.uid)
        if (result.data) {
          setFirestoreUser(result.data)
        } else {
          // Auth user exists but no Firestore doc — create one
          const newDoc: FirestoreUser = {
            uid: fbUser.uid,
            fullName: fbUser.displayName ?? '',
            email: fbUser.email ?? '',
            photoURL: fbUser.photoURL,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          await userService.createUserDoc(newDoc)
          setFirestoreUser(newDoc)
        }
      } else {
        setFirestoreUser(null)
      }

      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  const refreshUser = async () => {
    if (!firebaseUser) return
    const result = await userService.getUserDoc(firebaseUser.uid)
    if (result.data) {
      setFirestoreUser(result.data)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    const result = await authService.signIn(email.trim().toLowerCase(), password)
    if (result.error) {
      return false
    }
    return true
  }

  const loginWithGoogle = async (idToken: string): Promise<boolean> => {
    const result = await authService.signInWithGoogle(idToken)
    if (result.error) {
      return false
    }
    return true
  }

  const signup = async (name: string, email: string, password: string): Promise<void> => {
    const result = await authService.signUp(email.trim().toLowerCase(), password, name.trim())
    if (result.error) {
      if (result.error.includes('email-already-in-use')) {
        throw new Error('ACCOUNT_EXISTS')
      }
      throw new Error(result.error)
    }
  }

  const logout = async () => {
    await authService.signOut()
  }

  const value = useMemo(
    () => ({
      user: firestoreUser,
      firebaseUser,
      isLoading,
      name: firestoreUser?.fullName ?? '',
      firstName: getFirstName(firestoreUser?.fullName),
      email: firestoreUser?.email ?? '',
      photoURL: firestoreUser?.photoURL ?? null,
      login,
      loginWithGoogle,
      signup,
      logout,
      refreshUser,
    }),
    [firestoreUser, firebaseUser, isLoading]
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
