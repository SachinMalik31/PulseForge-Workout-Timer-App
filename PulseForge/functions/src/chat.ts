import { onCall, HttpsError } from "firebase-functions/v2/https";
import OpenAI from "openai";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

export const chat = onCall(
  {
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to use chat");
    }

    const { messages } = request.data as ChatRequest;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "Messages array is required");
    }

    // Validate message shape
    for (const msg of messages) {
      if (
        !msg.role ||
        !msg.content ||
        !["system", "user", "assistant"].includes(msg.role)
      ) {
        throw new HttpsError("invalid-argument", "Invalid message format");
      }
    }

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new HttpsError(
          "failed-precondition",
          "OPENAI_API_KEY is not configured for Cloud Functions"
        );
      }

      const openai = new OpenAI({ apiKey });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 512,
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (typeof content !== "string") {
        throw new HttpsError("internal", "Unexpected response from OpenAI");
      }

      return { message: content };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error("OpenAI error:", error);
      throw new HttpsError("internal", "Chat request failed");
    }
  }
);
