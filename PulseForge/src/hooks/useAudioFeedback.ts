import { useCallback } from 'react'
import * as Speech from 'expo-speech'

interface UseAudioFeedbackOptions {
  audioAlerts: boolean
  voiceGuidance: boolean
}

export const useAudioFeedback = ({ audioAlerts, voiceGuidance }: UseAudioFeedbackOptions) => {
  const speak = useCallback(
    (text: string, options?: Speech.SpeechOptions) => {
      Speech.stop()
      Speech.speak(text, { rate: 1.1, pitch: 1.0, ...options })
    },
    []
  )

  /** Says "3", "2", "1" during the countdown phase (audio alerts setting) */
  const speakCountdown = useCallback(
    (count: number) => {
      if (!audioAlerts) return
      speak(String(count), { rate: 1.2, pitch: 1.05 })
    },
    [audioAlerts, speak]
  )

  /** Says "Go!" when an exercise phase starts (audio alerts setting) */
  const announceGo = useCallback(() => {
    if (!audioAlerts) return
    speak('Go!', { rate: 1.2, pitch: 1.1 })
  }, [audioAlerts, speak])

  /** Announces the exercise name and a short description (voice guidance setting) */
  const announceExercise = useCallback(
    (name: string) => {
      if (!voiceGuidance) return
      speak(`Next up: ${name}`)
    },
    [voiceGuidance, speak]
  )

  /** Says "Rest" when a rest phase starts (voice guidance setting) */
  const announceRest = useCallback(() => {
    if (!voiceGuidance) return
    speak('Rest')
  }, [voiceGuidance, speak])

  /** Says "Workout complete!" at the end (voice guidance setting) */
  const announceComplete = useCallback(() => {
    if (!voiceGuidance) return
    speak('Workout complete! Great job!', { rate: 1.0, pitch: 1.0 })
  }, [voiceGuidance, speak])

  /** Stops any ongoing speech */
  const stopSpeaking = useCallback(() => {
    Speech.stop()
  }, [])

  return {
    speakCountdown,
    announceGo,
    announceExercise,
    announceRest,
    announceComplete,
    stopSpeaking,
  }
}
