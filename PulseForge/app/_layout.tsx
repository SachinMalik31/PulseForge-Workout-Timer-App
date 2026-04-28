import React, { useEffect } from 'react'
import { Appearance, ColorSchemeName } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter'
import { useFonts } from 'expo-font'
import { UserProvider, useUser } from '@context/UserContext'
import { WorkoutProvider } from '@context/WorkoutContext'
import { SettingsProvider, useSettings } from '@context/SettingsContext'
import { ThemeProvider } from '@context/ThemeContext'
import { ToastProvider } from '@context/ToastContext'
import { COLORS } from '@constants'

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
  const router = useRouter()
  const segments = useSegments()
  const { user, isLoading } = useUser()
  const { settings } = useSettings()

  // Keep screen on if setting enabled
  useEffect(() => {
    if (settings.keepScreenOn) {
      void activateKeepAwakeAsync()
    } else {
      deactivateKeepAwake()
    }
  }, [settings.keepScreenOn])

  // Apply theme to the OS color scheme
  useEffect(() => {
    const schemeMap: Record<'light' | 'dark' | 'system', ColorSchemeName | null> = {
      light: 'light',
      dark: 'dark',
      system: null,
    }
    Appearance.setColorScheme(schemeMap[settings.theme])
  }, [settings.theme])

  const statusBarStyle =
    settings.theme === 'dark' ? 'light' : settings.theme === 'light' ? 'dark' : 'auto'

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync()
    }
  }, [isLoading])

  useEffect(() => {
    if (isLoading) return

    const topSegment = segments[0]
    const inAuthRoute = topSegment === 'login'
    const inTabs = topSegment === '(tabs)'
    const inWorkoutFlow = topSegment === 'start-workout' || topSegment === 'timer'
    const inProtectedRoute = inTabs || inWorkoutFlow

    if (!user && !inAuthRoute) {
      router.replace('/login')
      return
    }

    if (user && inAuthRoute) {
      router.replace('/(tabs)')
      return
    }

    if (user && !inProtectedRoute) {
      router.replace('/(tabs)')
    }
  }, [user, segments, isLoading, router])

  return (
    <>
      <StatusBar style={statusBarStyle} backgroundColor={COLORS.white} />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
      <Stack.Screen
        name="login"
        options={{
          title: 'Auth',
        }}
      />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="start-workout"
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="timer"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
    </Stack>
    </>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  })

  if (!fontsLoaded) {
    return null
  }

  return (
    <SafeAreaProvider>
      <UserProvider>
        <WorkoutProvider>
          <SettingsProvider>
            <ThemeProvider>
              <ToastProvider>
                <RootLayoutNav />
              </ToastProvider>
            </ThemeProvider>
          </SettingsProvider>
        </WorkoutProvider>
      </UserProvider>
    </SafeAreaProvider>
  )
}
