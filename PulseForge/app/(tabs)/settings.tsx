import React, { useMemo } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useUser } from '@hooks/useUser'
import { useSettings } from '@context/SettingsContext'
import { useAppTheme } from '@context/ThemeContext'
import { BORDER_RADIUS, FONTS, SPACING } from '@constants'

export default function SettingsScreen() {
  const router = useRouter()
  const { settings, updateSetting } = useSettings()
  const { firstName, logout } = useUser()
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const handleLogout = () => {
    Alert.alert('Log Out', `Are you sure you want to log out, ${firstName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/login')
        },
      },
    ])
  }

  const themeOptions: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>SETTINGS</Text>
        <Text style={styles.subTitle}>Hi, {firstName}</Text>

        <Text style={styles.sectionLabel}>AUDIO & ALERTS</Text>
        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Audio Alerts</Text>
            <Switch
              value={settings.audioAlerts}
              onValueChange={(value) => updateSetting('audioAlerts', value)}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.innerDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Voice Guidance</Text>
            <Switch
              value={settings.voiceGuidance}
              onValueChange={(value) => updateSetting('voiceGuidance', value)}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.innerDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Vibration</Text>
            <Switch
              value={settings.vibration}
              onValueChange={(value) => updateSetting('vibration', value)}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>DISPLAY</Text>
        <View style={styles.sectionCard}>
          <View style={styles.themeContainer}>
            {themeOptions.map((theme) => {
              const selected = settings.theme === theme
              return (
                <Pressable
                  key={theme}
                  onPress={() => updateSetting('theme', theme)}
                  style={({ pressed }) => [
                    styles.themeSegment,
                    selected && styles.themeSegmentSelected,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <Text style={[styles.themeText, selected && styles.themeTextSelected]}>
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <View style={styles.innerDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Keep Screen On</Text>
            <Switch
              value={settings.keepScreenOn}
              onValueChange={(value) => updateSetting('keepScreenOn', value)}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>COUNTDOWN BEFORE START</Text>
        <View style={styles.sectionCard}>
          <Text style={styles.sliderValue}>{settings.countdownBeforeStart}s</Text>
          <View style={styles.sliderTrack}>
            {Array.from({ length: 11 }).map((_, value) => {
              const active = value <= settings.countdownBeforeStart
              return (
                <Pressable
                  key={value}
                  onPress={() => updateSetting('countdownBeforeStart', value)}
                  style={({ pressed }) => [
                    styles.sliderDot,
                    active && styles.sliderDotActive,
                    pressed && styles.pressedScale,
                  ]}
                />
              )
            })}
          </View>
          <Text style={styles.sliderHint}>How long to count down before exercise starts.</Text>
        </View>

        <Pressable style={({ pressed }) => [styles.logoutButton, pressed && styles.pressedScale]} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </Pressable>

        <Text style={styles.versionText}>PulseForge v1.0.0</Text>
        <Text style={styles.madeWithText}>Made with ❤️ at UTA</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  title: {
    marginTop: SPACING.sm,
    fontFamily: FONTS.condensed800,
    fontSize: 42,
    color: colors.black,
  },
  subTitle: {
    marginTop: 2,
    fontFamily: FONTS.inter500,
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionLabel: {
    marginTop: SPACING.xl,
    marginLeft: 16,
    fontFamily: FONTS.inter500,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  sectionCard: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontFamily: FONTS.inter500,
    fontSize: 16,
    color: colors.black,
  },
  innerDivider: {
    height: 1,
    backgroundColor: colors.offWhite,
  },
  themeContainer: {
    marginVertical: 14,
    height: 44,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: colors.offWhite,
    flexDirection: 'row',
    padding: 3,
    gap: 2,
  },
  themeSegment: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeSegmentSelected: {
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  themeText: {
    fontFamily: FONTS.inter500,
    fontSize: 14,
    color: colors.textSecondary,
  },
  themeTextSelected: {
    fontFamily: FONTS.inter600,
    color: colors.black,
  },
  sliderValue: {
    marginTop: 16,
    fontFamily: FONTS.condensed700,
    fontSize: 32,
    color: colors.black,
  },
  sliderTrack: {
    marginTop: 10,
    marginBottom: 12,
    height: 34,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.grayFaint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  sliderDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  sliderDotActive: {
    backgroundColor: colors.primary,
  },
  sliderHint: {
    marginBottom: 16,
    fontFamily: FONTS.inter400,
    fontSize: 13,
    color: colors.textSecondary,
  },
  logoutButton: {
    marginTop: 32,
    height: 52,
    borderRadius: BORDER_RADIUS.xxl,
    backgroundColor: '#FF3A2D18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: FONTS.condensed700,
    fontSize: 17,
    letterSpacing: 1,
    color: '#FF3A2D',
  },
  versionText: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: FONTS.inter400,
    fontSize: 12,
    color: colors.grayLight,
  },
  madeWithText: {
    marginTop: 2,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: FONTS.inter400,
    fontSize: 11,
    color: colors.grayLight,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
})

