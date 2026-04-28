const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const FITNESS_SYSTEM_PROMPT = `You are PulseCoach, an expert AI fitness trainer inside the PulseForge workout app. Your job is to give clear, motivating, and safe fitness advice.

Guidelines:
- Be concise and direct — mobile users prefer short answers
- Use bullet points for lists of exercises or steps
- Always emphasize proper form and safety first
- If asked about injury or medical conditions, recommend seeing a doctor
- Support topics: workout programming, exercise technique, nutrition basics, recovery, goal setting, and motivation
- If off-topic, gently redirect: "I'm best at fitness questions — let me help you crush your goals!"
- Use an encouraging but professional tone`

export async function sendOpenAIMessage(
  messages: ChatMessage[],
  apiKey: string
): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 512,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('Unexpected response format from OpenAI API')
  }
  return content
}
