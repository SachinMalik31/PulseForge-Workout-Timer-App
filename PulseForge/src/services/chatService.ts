import { httpsCallable } from 'firebase/functions'
import { functions } from '@config/firebase'
import type { ChatMessage, ServiceResult } from '@types'

interface ChatRequest {
  messages: ChatMessage[]
}

interface ChatCloudResponse {
  message: string
}

export const chatService = {
  async sendMessage(
    messages: ChatMessage[]
  ): Promise<ServiceResult<string>> {
    try {
      const callable = httpsCallable<ChatRequest, ChatCloudResponse>(functions, 'chat')
      const result = await callable({ messages })
      return { data: result.data.message, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Chat request failed'
      return { data: null, error: message }
    }
  },
}
