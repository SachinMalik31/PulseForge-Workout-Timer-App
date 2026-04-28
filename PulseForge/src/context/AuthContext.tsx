import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { User } from '@types'
import { STORAGE_KEYS } from '@constants'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (fullName: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER)
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      } catch (error) {
        console.error('Failed to load user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      // In a real app, this would authenticate with a backend
      // For now, we just create a user object with the email
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        fullName: email.split('@')[0],
        email,
      }

      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser))
      setUser(newUser)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const signup = async (fullName: string, email: string, password: string) => {
    try {
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        fullName,
        email,
      }

      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser))
      setUser(newUser)
    } catch (error) {
      console.error('Signup failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER)
      setUser(null)
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
