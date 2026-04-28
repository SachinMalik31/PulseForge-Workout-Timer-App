import { useCallback, useEffect, useState } from 'react'
import { challengeService } from '@services/challengeService'
import { useUser } from '@context/UserContext'
import type { Challenge, UserChallenge, GeneratedProgram } from '@types'

export function useChallenges() {
  const { user } = useUser()
  const userId = user?.uid ?? null

  // Challenge templates (global)
  const [templates, setTemplates] = useState<Challenge[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)

  // Active user challenge
  const [activeChallenge, setActiveChallenge] = useState<UserChallenge | null>(null)
  const [challengeLoading, setChallengeLoading] = useState(true)

  // Challenge history
  const [challengeHistory, setChallengeHistory] = useState<UserChallenge[]>([])

  // Generated program
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedProgram | null>(null)
  const [programLoading, setProgramLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  // Subscribe to challenge templates
  useEffect(() => {
    setTemplatesLoading(true)
    const unsub = challengeService.subscribeToTemplates(
      (data) => {
        setTemplates(data)
        setTemplatesLoading(false)
      },
      (err) => {
        setError(err.message)
        setTemplatesLoading(false)
      }
    )
    return unsub
  }, [])

  // Subscribe to active user challenge + history
  useEffect(() => {
    if (!userId) {
      setChallengeLoading(false)
      setProgramLoading(false)
      return
    }

    setChallengeLoading(true)
    const unsubActive = challengeService.subscribeToUserChallenge(
      userId,
      (data) => {
        setActiveChallenge(data)
        setChallengeLoading(false)
      },
      (err) => {
        setError(err.message)
        setChallengeLoading(false)
      }
    )

    // Load challenge history once
    void challengeService.getUserChallengeHistory(userId).then((result) => {
      if (result.data) setChallengeHistory(result.data)
    })

    // Subscribe to generated program
    setProgramLoading(true)
    const unsubProgram = challengeService.subscribeToProgram(
      userId,
      (data) => {
        setGeneratedProgram(data)
        setProgramLoading(false)
      },
      (err) => {
        setError(err.message)
        setProgramLoading(false)
      }
    )

    return () => {
      unsubActive()
      unsubProgram()
    }
  }, [userId])

  const startChallenge = useCallback(
    async (challengeId: string) => {
      if (!userId) return
      const result = await challengeService.startChallenge(userId, challengeId)
      if (result.error) setError(result.error)
    },
    [userId]
  )

  const completeDay = useCallback(
    async (day: number) => {
      if (!activeChallenge) return
      const nextDays = [...new Set([...activeChallenge.completedDays, day])].sort(
        (a, b) => a - b
      )
      await challengeService.updateUserChallenge(activeChallenge.id, {
        completedDays: nextDays,
        isActive: nextDays.length < 30,
      })
    },
    [activeChallenge]
  )

  const quitChallenge = useCallback(async () => {
    if (!activeChallenge) return
    await challengeService.quitChallenge(activeChallenge.id)
  }, [activeChallenge])

  const createProgram = useCallback(
    async (program: Omit<GeneratedProgram, 'id' | 'userId'>) => {
      if (!userId) {
        setError('You must be signed in to create a program.')
        return null
      }
      const result = await challengeService.createProgram({
        ...program,
        userId,
      })
      if (result.error) {
        setError(result.error)
        return null
      }
      if (result.data) {
        setGeneratedProgram(result.data)
      }
      return result.data
    },
    [userId]
  )

  const updateProgram = useCallback(
    async (updates: Partial<Pick<GeneratedProgram, 'currentDay' | 'schedule'>>) => {
      if (!generatedProgram) return
      await challengeService.updateProgram(generatedProgram.id, updates)
    },
    [generatedProgram]
  )

  const deleteProgram = useCallback(async () => {
    if (!generatedProgram) return
    await challengeService.deleteProgram(generatedProgram.id)
  }, [generatedProgram])

  const loading = templatesLoading || challengeLoading || programLoading

  return {
    // data
    templates,
    activeChallenge,
    challengeHistory,
    generatedProgram,

    // loading / error
    loading,
    error,

    // actions
    startChallenge,
    completeDay,
    quitChallenge,
    createProgram,
    updateProgram,
    deleteProgram,
  }
}
