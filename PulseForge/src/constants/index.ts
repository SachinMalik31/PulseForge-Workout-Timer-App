// Design Colors (Light Theme)
export const COLORS = {
  // Core palette
  white: '#FFFFFF',
  offWhite: '#F5F5F7',
  surface: '#EFEFEF',
  black: '#0A0A0A',
  grayDark: '#3A3A4A',
  grayMid: '#6B6B80',
  grayLight: '#C8C8D4',
  grayFaint: '#F0F0F5',
  primary: '#FF3A2D',
  primaryLight: '#FF3A2D18',

  // Status colors
  success: '#00C896',
  warning: '#FF9500',
  error: '#EF4444',
  info: '#3B82F6',

  // Backward-compatible aliases
  background: '#FFFFFF',
  text: '#0A0A0A',
  textSecondary: '#6B6B80',
  accent: '#FF9500',
  cardBg: '#FFFFFF',
  inputBg: '#F5F5F7',
  borderColor: '#EFEFEF',

  // Difficulty badges
  beginnerBg: '#DBEAFE',
  beginnerText: '#1E40AF',
  intermediateBg: '#FEF3C7',
  intermediateText: '#92400E',
  advancedBg: '#FECACA',
  advancedText: '#7F1D1D',
}

export type AppColors = typeof COLORS

// Dark Theme palette — same keys, dark values
export const DARK_COLORS: AppColors = {
  white: '#1C1C1E',
  offWhite: '#111113',
  surface: '#2C2C2E',
  black: '#FFFFFF',
  grayDark: '#D0D0D8',
  grayMid: '#8E8E9A',
  grayLight: '#48484E',
  grayFaint: '#1C1C1E',
  primary: '#FF3A2D',
  primaryLight: '#FF3A2D22',

  success: '#00C896',
  warning: '#FF9500',
  error: '#EF4444',
  info: '#3B82F6',

  background: '#000000',
  text: '#FFFFFF',
  textSecondary: '#8E8E9A',
  accent: '#FF9500',
  cardBg: '#1C1C1E',
  inputBg: '#2C2C2E',
  borderColor: '#38383A',

  beginnerBg: '#1A2F4A',
  beginnerText: '#60A5FA',
  intermediateBg: '#3A2A00',
  intermediateText: '#FCD34D',
  advancedBg: '#3A1414',
  advancedText: '#FCA5A5',
}

// Typography
export const FONTS = {
  condensed700: 'BarlowCondensed_700Bold',
  condensed800: 'BarlowCondensed_800ExtraBold',
  inter400: 'Inter_400Regular',
  inter500: 'Inter_500Medium',
  inter600: 'Inter_600SemiBold',
} as const

export const TYPOGRAPHY = {
  headingLarge: {
    fontFamily: FONTS.condensed800,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: 0.8,
  },
  headingMedium: {
    fontFamily: FONTS.condensed800,
    fontSize: 24,
    lineHeight: 28,
  },
  headingSmall: {
    fontFamily: FONTS.condensed700,
    fontSize: 20,
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily: FONTS.inter500,
    fontSize: 18,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: FONTS.inter500,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmalI: {
    fontFamily: FONTS.inter400,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontFamily: FONTS.inter500,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
  },
}

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
}

// Border radius
export const BORDER_RADIUS = {
  sm: 6,
  md: 12,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
}

// Animation durations (ms)
export const ANIMATION_DURATION = {
  fast: 200,
  normal: 300,
  slow: 500,
}

// App constants
export const APP_CONSTANTS = {
  MIN_COUNTDOWN: 0,
  MAX_COUNTDOWN: 10,
  DEFAULT_COUNTDOWN: 3,
}

// Storage keys
export const STORAGE_KEYS = {
  USER: 'pulseforge_user',
  ACCOUNTS: 'pulseforge_accounts',
  SETTINGS: 'pulseforge_settings',
  WORKOUTS: 'pulseforge_workouts',
  HISTORY: 'pulseforge_history',
  ACTIVE_WORKOUT: 'activeWorkout',
}

// Tab routes
export const TABS = [
  { name: 'workouts', label: 'Workouts', icon: 'dumbbell' },
  { name: 'history', label: 'History', icon: 'history' },
  { name: 'settings', label: 'Settings', icon: 'sliders-h' },
] as const
