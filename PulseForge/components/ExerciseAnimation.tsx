import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import LottieView from 'lottie-react-native'
import type { AnimationObject } from 'lottie-react-native'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Svg, { Circle, Line } from 'react-native-svg'

type Props = {
  exerciseName: string
  isRest?: boolean
  isPaused?: boolean
  size?: number
}

type AnimationSource = string | AnimationObject | { uri: string }

const ANIMATIONS = {
  burpees: require('../assets/animations/burpees.json') as AnimationSource,
  sprint: require('../assets/animations/sprint.json') as AnimationSource,
  boxJumps: require('../assets/animations/box-jumps.json') as AnimationSource,
  squats: require('../assets/animations/squats.json') as AnimationSource,
  pushups: require('../assets/animations/pushups.json') as AnimationSource,
  fallback: require('../assets/animations/default-exercise.json') as AnimationSource,
}

const getAnimationSource = (name: string): AnimationSource | null => {
  try {
    const n = name.toLowerCase()

    if (n.includes('burpee')) return ANIMATIONS.burpees
    if (n.includes('sprint')) return ANIMATIONS.sprint
    if (n.includes('box jump')) return ANIMATIONS.boxJumps
    if (n.includes('squat')) return ANIMATIONS.squats
    if (n.includes('push') || n.includes('pushup')) return ANIMATIONS.pushups

    return ANIMATIONS.fallback
  } catch (error) {
    console.warn('Failed to resolve Lottie source:', error)
    return null
  }
}

const ExercisePlaceholder = ({ size }: { size: number }) => {
  const iconSize = Math.round(size * 0.26)

  return (
    <View style={styles.placeholderWrap}>
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 120 120">
        <Circle cx="60" cy="18" r="12" stroke="#0A0A0A" strokeWidth="6" fill="none" />
        <Line x1="60" y1="30" x2="60" y2="70" stroke="#0A0A0A" strokeWidth="7" strokeLinecap="round" />
        <Line x1="60" y1="42" x2="34" y2="58" stroke="#0A0A0A" strokeWidth="7" strokeLinecap="round" />
        <Line x1="60" y1="42" x2="86" y2="58" stroke="#0A0A0A" strokeWidth="7" strokeLinecap="round" />
        <Line x1="60" y1="70" x2="38" y2="102" stroke="#0A0A0A" strokeWidth="7" strokeLinecap="round" />
        <Line x1="60" y1="70" x2="82" y2="102" stroke="#0A0A0A" strokeWidth="7" strokeLinecap="round" />
      </Svg>
      <MaterialCommunityIcons name="alert-circle-outline" size={iconSize} color="#6B6B80" />
    </View>
  )
}

const ExerciseAnimation = ({
  exerciseName,
  isRest = false,
  isPaused = false,
  size = 220,
}: Props) => {
  const lottieRef = useRef<LottieView>(null)
  const targetName = isRest ? 'rest' : exerciseName
  const [activeName, setActiveName] = useState(targetName)
  const [source, setSource] = useState<AnimationSource | null>(() => getAnimationSource(targetName))
  const [useFallback, setUseFallback] = useState(source === null)

  const opacity = useSharedValue(1)
  const translateX = useSharedValue(0)
  const pausedContainerOpacity = useSharedValue(isPaused ? 0.5 : 1)

  const restartAnimation = useCallback(() => {
    if (!lottieRef.current || useFallback) return

    if (isPaused) {
      lottieRef.current.pause()
      return
    }

    lottieRef.current.reset()
    lottieRef.current.play()
  }, [isPaused, useFallback])

  const swapAnimation = useCallback((nextName: string) => {
    const nextSource = getAnimationSource(nextName)
    setActiveName(nextName)
    setSource(nextSource)
    setUseFallback(nextSource === null)

    translateX.value = 40
    opacity.value = 0
    translateX.value = withSpring(0, { damping: 18, stiffness: 170 })
    opacity.value = withSpring(1, { damping: 22, stiffness: 170 })
  }, [opacity, translateX])

  useEffect(() => {
    if (targetName === activeName) return

    opacity.value = withTiming(0, { duration: 200 })
    translateX.value = withTiming(-40, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(swapAnimation)(targetName)
      }
    })
  }, [activeName, opacity, swapAnimation, targetName, translateX])

  useEffect(() => {
    pausedContainerOpacity.value = withTiming(isPaused ? 0.5 : 1, { duration: 150 })
    restartAnimation()
  }, [isPaused, pausedContainerOpacity, restartAnimation])

  useEffect(() => {
    restartAnimation()
  }, [activeName, restartAnimation])

  const wrapperStyle = useMemo(
    () => [
      styles.container,
      {
        width: size,
        height: size,
        backgroundColor: isRest ? '#FFF7ED' : 'transparent',
      },
    ],
    [isRest, size],
  )

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }))

  const pauseStyle = useAnimatedStyle(() => ({
    opacity: pausedContainerOpacity.value,
  }))

  return (
    <Animated.View style={[wrapperStyle, pauseStyle]}>
      <Animated.View style={animatedStyle}>
        {useFallback || !source ? (
          <ExercisePlaceholder size={size * 0.85} />
        ) : (
          <LottieView
            ref={lottieRef}
            key={activeName}
            source={source}
            autoPlay={!isPaused}
            loop
            speed={isRest ? 0.6 : 1.0}
            style={{ width: size, height: size }}
            onAnimationFailure={() => setUseFallback(true)}
          />
        )}
      </Animated.View>

      {isPaused ? (
        <View style={styles.pauseOverlay}>
          <MaterialCommunityIcons name="pause-circle" size={34} color="#0A0A0A" />
        </View>
      ) : null}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
})

export default ExerciseAnimation