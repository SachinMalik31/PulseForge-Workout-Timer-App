import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'
import Svg, { Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { FONTS } from '@constants'
import { useAppTheme } from '@context/ThemeContext'
import { useUser } from '@hooks/useUser'
import { useToast } from '@context/ToastContext'

const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80'

const TAB_WIDTH = 124

WebBrowser.maybeCompleteAuthSession()

function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.7 0 7 1.3 9.6 3.4l7.2-7.2C36.4 1.9 30.6 0 24 0 14.6 0 6.4 5.4 2.5 13.2l8.4 6.5C12.8 13.5 17.9 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.8-2.1 5.2-4.5 6.8l7.3 5.6c4.2-3.9 6.9-9.6 6.9-16.4z"
      />
      <Path
        fill="#FBBC05"
        d="M10.9 28.8C10.3 27.2 10 25.6 10 24s.3-3.2.9-4.8L2.5 12.7A23.7 23.7 0 000 24c0 3.8.9 7.3 2.5 10.5l8.4-5.7z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.5 0 12-2.1 16-5.8l-7.3-5.6c-2 1.4-4.6 2.2-8.7 2.2-6.1 0-11.2-4-13.1-9.6l-8.4 6.5C6.4 42.6 14.6 48 24 48z"
      />
    </Svg>
  )
}

export default function LoginScreen() {
  const router = useRouter()
  const { login, loginWithGoogle, signup } = useUser()
  const { showToast } = useToast()
  const { colors } = useAppTheme()

  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null)
  const styles = useMemo(() => makeStyles(colors), [colors])
  const isExpoGo = Constants.appOwnership === 'expo'
  const expoOwner =
    Constants.expoConfig?.owner ??
    (Array.isArray((Constants.expoConfig as typeof Constants.expoConfig & { owners?: string[] })?.owners)
      ? (Constants.expoConfig as typeof Constants.expoConfig & { owners?: string[] }).owners?.[0]
      : undefined)
  const expoSlug = Constants.expoConfig?.slug
  const expoProxyRedirectUri =
    expoOwner && expoSlug ? `https://auth.expo.io/@${expoOwner}/${expoSlug}` : undefined

  const imageOpacity = useRef(new Animated.Value(0)).current
  const sheetOpacity = useRef(new Animated.Value(0)).current
  const sheetTranslateY = useRef(new Animated.Value(60)).current
  const fieldsOpacity = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current
  const tabX = useRef(new Animated.Value(0)).current
  const screenOpacity = useRef(new Animated.Value(1)).current
  const buttonShake = useRef(new Animated.Value(0)).current

  const [, , promptAsync] = Google.useAuthRequest({
    clientId:
      process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ??
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    responseType: 'id_token',
    redirectUri: isExpoGo ? expoProxyRedirectUri : undefined,
  })

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  useEffect(() => {
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()

    Animated.parallel([
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        speed: 16,
        bounciness: 7,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 350,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start()

    Animated.stagger(
      80,
      fieldsOpacity.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 260,
          delay: 400,
          useNativeDriver: true,
        })
      )
    ).start()
  }, [fieldsOpacity, imageOpacity, sheetOpacity, sheetTranslateY])

  const setMode = (signupMode: boolean) => {
    setIsSignUp(signupMode)
    setError('')
    Animated.spring(tabX, {
      toValue: signupMode ? TAB_WIDTH : 0,
      speed: 15,
      bounciness: 6,
      useNativeDriver: true,
    }).start()
  }

  const runInvalidAnimation = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    Animated.sequence([
      Animated.timing(buttonShake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(buttonShake, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(buttonShake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(buttonShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }

  const transitionToApp = () => {
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      router.replace('/(tabs)')
    })
  }

  const onSubmit = async () => {
    if (loading) return

    setError('')
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLoading(true)

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError('Please enter your full name.')
          runInvalidAnimation()
          return
        }

        if (!emailRegex.test(email.trim().toLowerCase())) {
          setError('Please enter a valid email address.')
          runInvalidAnimation()
          return
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters.')
          runInvalidAnimation()
          return
        }

        try {
          await signup(name, email, password)
          transitionToApp()
          return
        } catch (signupError) {
          if ((signupError as Error).message === 'ACCOUNT_EXISTS') {
            setError('An account with this email already exists.')
          } else {
            setError('Could not create account. Please try again.')
          }
          runInvalidAnimation()
          return
        }
      }

      if (!email.trim() || !password.trim()) {
        setError('Invalid email or password.')
        runInvalidAnimation()
        return
      }

      const ok = await login(email, password)
      if (!ok) {
        setError('Invalid email or password.')
        runInvalidAnimation()
        return
      }

      transitionToApp()
    } finally {
      setLoading(false)
    }
  }

  const onGoogleContinue = async () => {
    if (loading) return

    const hasGoogleClientId =
      process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID

    if (!hasGoogleClientId) {
      showToast('Google Sign-In is not configured yet. Add Google OAuth client IDs to .env.')
      return
    }

    if (isExpoGo && !process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      showToast('Expo Go requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID for Google Sign-In.')
      return
    }

    if (isExpoGo && !expoProxyRedirectUri) {
      setError('Expo owner is missing. Add "owner" in app.json so Google Sign-In can use the Expo proxy redirect URI.')
      runInvalidAnimation()
      return
    }

    setError('')
    setLoading(true)

    try {
      const result = await promptAsync()
      if (result.type !== 'success') {
        if (result.type !== 'dismiss' && result.type !== 'cancel') {
          setError('Google sign-in was cancelled. Please try again.')
        }
        return
      }

      const idToken = result.authentication?.idToken
      if (!idToken) {
        setError('Google sign-in failed. No ID token returned.')
        runInvalidAnimation()
        return
      }

      const ok = await loginWithGoogle(idToken)
      if (!ok) {
        setError('Could not sign in with Google. Please try again.')
        runInvalidAnimation()
        return
      }

      transitionToApp()
    } catch (googleError) {
      const message = googleError instanceof Error ? googleError.message : ''
      if (message.toLowerCase().includes('invalid_request')) {
        setError('Google OAuth is misconfigured. In Expo Go, set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to a Web client ID from Google Cloud.')
      } else {
        setError('Could not sign in with Google. Please try again.')
      }
      runInvalidAnimation()
    } finally {
      setLoading(false)
    }
  }

  const dividerLabel = useMemo(() => 'or continue with', [])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Animated.View style={[styles.screen, { opacity: screenOpacity }]}> 
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.heroWrap, { opacity: imageOpacity }]}>
              <Image source={{ uri: HERO_IMAGE_URL }} style={styles.heroImage} contentFit="cover" transition={300} />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
                style={styles.heroOverlay}
              >
                <View>
                  <Text style={styles.heroTitle}>PULSEFORGE</Text>
                  <Text style={styles.heroSubtitle}>Train smarter. Finish stronger.</Text>
                </View>
              </LinearGradient>
            </Animated.View>

            <Animated.View
              style={[
                styles.sheet,
                {
                  opacity: sheetOpacity,
                  transform: [{ translateY: sheetTranslateY }],
                },
              ]}
            >
              <View style={styles.toggleWrap}>
                <Pressable onPress={() => setMode(false)} style={styles.toggleItem}>
                  <Text style={[styles.toggleText, !isSignUp ? styles.toggleActive : styles.toggleInactive]}>
                    LOG IN
                  </Text>
                </Pressable>
                <Pressable onPress={() => setMode(true)} style={styles.toggleItem}>
                  <Text style={[styles.toggleText, isSignUp ? styles.toggleActive : styles.toggleInactive]}>
                    SIGN UP
                  </Text>
                </Pressable>
                <Animated.View style={[styles.underline, { transform: [{ translateX: tabX }] }]} />
              </View>

              {isSignUp ? (
                <Animated.View style={{ opacity: fieldsOpacity[0] }}>
                  <Text style={styles.label}>FULL NAME</Text>
                  <TextInput
                    style={[styles.input, focusedField === 'name' && styles.focusedInput]}
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="John Doe"
                    placeholderTextColor={colors.textSecondary}
                    editable={!loading}
                  />
                </Animated.View>
              ) : null}

              <Animated.View style={{ opacity: fieldsOpacity[1] }}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  style={[styles.input, focusedField === 'email' && styles.focusedInput]}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textSecondary}
                  editable={!loading}
                />
              </Animated.View>

              <Animated.View style={{ opacity: fieldsOpacity[2] }}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={[styles.passwordWrap, focusedField === 'password' && styles.focusedInput]}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    placeholder="........"
                    placeholderTextColor={colors.textSecondary}
                    editable={!loading}
                  />
                  <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
                {isSignUp ? (
                  <Text style={styles.helperText}>Password must be at least 6 characters</Text>
                ) : (
                  <Pressable onPress={() => showToast('Password reset coming soon.')}>
                    <Text style={styles.forgot}>Forgot Password?</Text>
                  </Pressable>
                )}
              </Animated.View>

              <Animated.View style={{ transform: [{ translateX: buttonShake }] }}>
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressedScale]}
                  onPress={onSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryText}>{isSignUp ? 'CREATE ACCOUNT' : 'LOG IN'}</Text>
                  )}
                </Pressable>
              </Animated.View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{dividerLabel}</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={({ pressed }) => [styles.googleButton, pressed && styles.pressedScale]}
                onPress={onGoogleContinue}
                disabled={loading}
              >
                <View style={styles.googleIconWrap}>
                  <GoogleMark />
                </View>
                <Text style={styles.googleText}>Continue with Google</Text>
              </Pressable>

              {isSignUp ? (
                <Text style={styles.termsLine}>
                  By signing up, you agree to our{' '}
                  <Text style={styles.termsLink} onPress={() => showToast('Coming soon.')}>Terms of Service</Text>{' '}
                  and{' '}
                  <Text style={styles.termsLink} onPress={() => showToast('Coming soon.')}>Privacy Policy</Text>.
                </Text>
              ) : null}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  )
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.white,
  },
  heroWrap: {
    width: '100%',
    height: '42%',
    minHeight: 320,
    maxHeight: 420,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroTitle: {
    fontFamily: FONTS.condensed800,
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  heroSubtitle: {
    marginTop: 2,
    fontFamily: FONTS.inter400,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  sheet: {
    marginTop: -24,
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 6,
  },
  toggleWrap: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    position: 'relative',
    marginBottom: 20,
  },
  toggleItem: {
    width: TAB_WIDTH,
    paddingBottom: 10,
    alignItems: 'flex-start',
  },
  toggleText: {
    fontFamily: FONTS.condensed700,
    fontSize: 18,
  },
  toggleActive: {
    color: colors.black,
  },
  toggleInactive: {
    color: colors.textSecondary,
  },
  underline: {
    position: 'absolute',
    left: 0,
    bottom: -1,
    width: 74,
    height: 2,
    backgroundColor: '#FF3A2D',
  },
  label: {
    marginBottom: 8,
    fontFamily: FONTS.inter500,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  input: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.offWhite,
    paddingHorizontal: 16,
    marginBottom: 14,
    fontFamily: FONTS.inter400,
    fontSize: 15,
    color: colors.black,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordWrap: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.offWhite,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordInput: {
    flex: 1,
    fontFamily: FONTS.inter400,
    fontSize: 15,
    color: colors.black,
  },
  focusedInput: {
    borderColor: '#FF3A2D',
  },
  helperText: {
    marginBottom: 12,
    fontFamily: FONTS.inter400,
    fontSize: 12,
    color: colors.textSecondary,
  },
  forgot: {
    marginBottom: 12,
    fontFamily: FONTS.inter500,
    fontSize: 13,
    color: '#FF3A2D',
    textAlign: 'right',
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: FONTS.condensed700,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 1.5,
  },
  error: {
    marginTop: 8,
    fontFamily: FONTS.inter400,
    fontSize: 13,
    color: '#FF3A2D',
  },
  dividerRow: {
    marginTop: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surface,
  },
  dividerText: {
    fontFamily: FONTS.inter400,
    fontSize: 13,
    color: colors.textSecondary,
  },
  googleButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.offWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  googleIconWrap: {
    position: 'absolute',
    left: 16,
  },
  googleText: {
    fontFamily: FONTS.inter600,
    fontSize: 15,
    color: colors.black,
  },
  termsLine: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: FONTS.inter400,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  termsLink: {
    color: '#FF3A2D',
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
})
