import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppSettings } from '@types'
import { STORAGE_KEYS, APP_CONSTANTS } from '@constants'

interface SettingsContextType {
  settings: AppSettings
  isLoading: boolean
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => Promise<void>
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const DEFAULT_SETTINGS: AppSettings = {
  audioAlerts: true,
  voiceGuidance: false,
  vibration: true,
  theme: 'dark',
  keepScreenOn: true,
  countdownBeforeStart: APP_CONSTANTS.DEFAULT_COUNTDOWN,
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings from storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS)
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings))
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    try {
      const updated = { ...settings, [key]: value }
      setSettings(updated)
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to update setting:', error)
      throw error
    }
  }

  const updateSettings = async (updates: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...updates }
      setSettings(updated)
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to update settings:', error)
      throw error
    }
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSetting,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
