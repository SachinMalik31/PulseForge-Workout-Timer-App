import { useCallback, useState } from 'react'
import { sendOpenAIMessage } from '@utils/groqClient'
import type { ChatMessage } from '@types'

const SYSTEM_PROMPT: ChatMessage = {
  role: 'system',
  content: `You are PulseCoach, an expert AI fitness trainer inside the PulseForge workout app. Your job is to give clear, motivating, and safe fitness advice.

Guidelines:
- Be concise and direct — mobile users prefer short answers
- Use bullet points for lists of exercises or steps
- Always emphasize proper form and safety first
- If asked about injury or medical conditions, recommend seeing a doctor
- Support topics: workout programming, exercise technique, nutrition basics, recovery, goal setting, and motivation
- If off-topic, gently redirect: "I'm best at fitness questions — let me help you crush your goals!"
- Use an encouraging but professional tone`,
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openAIKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? ''

  const sendMessage = useCallback(async (content: string) => {
    if (!openAIKey || openAIKey === 'your_openai_api_key_here') {
      setError('Missing EXPO_PUBLIC_OPENAI_API_KEY in .env. Add it and restart the app.')
      return
    }

    const userMessage: ChatMessage = { role: 'user', content }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)
    setError(null)

    try {
      const reply = await sendOpenAIMessage([
        SYSTEM_PROMPT,
        ...updatedMessages,
      ], openAIKey)

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: reply,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send message'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [messages, openAIKey])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, isLoading, error, sendMessage, clearChat }
}
