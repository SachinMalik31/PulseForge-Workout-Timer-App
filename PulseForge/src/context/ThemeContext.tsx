import React, { createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { COLORS, DARK_COLORS, AppColors } from '@constants'
import { useSettings } from './SettingsContext'

interface ThemeContextType {
  colors: AppColors
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  colors: COLORS,
  isDark: false,
})

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings()
  const systemScheme = useColorScheme()

  const isDark = useMemo(() => {
    if (settings.theme === 'dark') return true
    if (settings.theme === 'light') return false
    return systemScheme === 'dark'
  }, [settings.theme, systemScheme])

  const colors = isDark ? DARK_COLORS : COLORS

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useAppTheme = () => useContext(ThemeContext)
