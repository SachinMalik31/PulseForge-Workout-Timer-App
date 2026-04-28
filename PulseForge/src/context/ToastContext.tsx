import React, { createContext, useContext, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FONTS } from '@constants'

interface ToastContextType {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const DEFAULT_MESSAGE = 'Coming soon - stay tuned!'

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const translateY = useRef(new Animated.Value(20)).current
  const opacity = useRef(new Animated.Value(0)).current
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insets = useSafeAreaInsets()

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        speed: 20,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }

  const animateOut = (onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 20,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setVisible(false)
        onDone?.()
      }
    })
  }

  const showToast = (messageInput: string) => {
    const nextMessage = messageInput.trim() || DEFAULT_MESSAGE

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const present = () => {
      setMessage(nextMessage)
      setVisible(true)
      translateY.setValue(20)
      opacity.setValue(0)
      animateIn()

      timeoutRef.current = setTimeout(() => {
        animateOut()
      }, 2000)
    }

    if (visible) {
      animateOut(present)
      return
    }

    present()
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible ? (
        <View pointerEvents="none" style={styles.host}>
          <Animated.View
            style={[
              styles.toast,
              {
                marginBottom: Math.max(insets.bottom + 64, 84),
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <Text style={styles.toastText}>{message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    minHeight: 52,
    minWidth: 200,
    maxWidth: '90%',
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastText: {
    fontFamily: FONTS.inter600,
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
})
