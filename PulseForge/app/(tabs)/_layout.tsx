import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { Tabs, usePathname, useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { FONTS } from '@constants'
import { useAppTheme } from '@context/ThemeContext'

export default function TabLayout() {
  const { colors } = useAppTheme()
  const router = useRouter()
  const pathname = usePathname()
  const pulse = useRef(new Animated.Value(1)).current
  const isCoachRoute = pathname === '/coach'

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start()
  }, [pulse])

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.grayLight,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.surface,
          borderTopWidth: 1,
          shadowOpacity: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.inter600,
          fontSize: 11,
          letterSpacing: 0.4,
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Index',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name="view-dashboard-outline"
              size={focused ? 22 : 24}
              color={color}
            />
          ),
          tabBarLabel: ({ focused }) =>
            focused ? <Text style={{ fontFamily: FONTS.inter600 }}>Index</Text> : null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name="compass-outline"
              size={focused ? 22 : 24}
              color={color}
            />
          ),
          tabBarLabel: ({ focused }) =>
            focused ? <Text style={{ fontFamily: FONTS.inter600 }}>Explore</Text> : null,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name="dumbbell"
              size={focused ? 22 : 24}
              color={color}
            />
          ),
          tabBarLabel: ({ focused }) =>
            focused ? <Text style={{ fontFamily: FONTS.inter600 }}>Workouts</Text> : null,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name="chart-line"
              size={focused ? 22 : 24}
              color={color}
            />
          ),
          tabBarLabel: ({ focused }) =>
            focused ? <Text style={{ fontFamily: FONTS.inter600 }}>History</Text> : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name="tune-variant"
              size={focused ? 22 : 24}
              color={color}
            />
          ),
          tabBarLabel: ({ focused }) =>
            focused ? <Text style={{ fontFamily: FONTS.inter600 }}>Settings</Text> : null,
        }}
      />
    </Tabs>

      {/* Floating AI Coach button */}
      {!isCoachRoute && (
        <Animated.View style={[fabStyles.fabWrap, { transform: [{ scale: pulse }] }]}>
          <Pressable
            style={({ pressed }) => [
              fabStyles.fab,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.88, transform: [{ scale: 0.93 }] },
            ]}
            onPress={() => router.push('/coach')}
            accessibilityLabel="Open AI Coach"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="robot-happy-outline" size={22} color="#FFFFFF" />
            <Text style={fabStyles.fabLabel}>ASK COACH</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  )
}

const fabStyles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 20,
    bottom: 76,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 50,
    elevation: 10,
    shadowColor: '#FF3A2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  fabLabel: {
    fontFamily: FONTS.inter600,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
})
