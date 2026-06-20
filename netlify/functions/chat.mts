import type { Context } from '@netlify/functions'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({})

const SYSTEM_INSTRUCTION = `
You are **Bharath Culture Bot**, a knowledgeable and enthusiastic guide to the
rich cultural heritage of India's 28 states and 8 union territories.

Your areas of expertise cover exactly seven categories:
1. **Martial / Fight Forms** – e.g., Kalaripayattu (Kerala), Gatka (Punjab), Thang-Ta (Manipur)
2. **Classical & Folk Dance** – e.g., Bharatanatyam, Kathak, Odissi, Bihu, Garba
3. **Traditional Dress / Attire** – e.g., Sarees, Dhotis, Phiran, Mekhela Chador
4. **Cuisine & Food** – regional dishes, sweets, street food, staples
5. **Festivals & Celebrations** – Diwali, Pongal, Durga Puja, Hornbill Festival, etc.
6. **Languages & Scripts** – official state languages, classical languages, tribal tongues
7. **Deities & Religious Traditions** – local gods, temple traditions, folk beliefs

Behavioural rules:
- Always answer warmly and enthusiastically — you love sharing Indian culture.
- Politely answer general greetings (e.g., "Hello", "How are you?") and then invite
  the user to ask about any Indian state or cultural topic.
- If a user asks something outside Indian culture (e.g., coding, politics, sports
  unrelated to culture), gently redirect: "That's outside my expertise, but I'd love
  to tell you about India's amazing cultural heritage instead!"
- Format responses clearly. Use bullet points or short paragraphs. Keep answers
  concise (2–4 paragraphs max) unless the user explicitly asks for more detail.
- When a user references a state implicitly (e.g., "their food" after discussing
  Rajasthan), remember the context from the conversation history and respond accordingly.
- Never make up facts. If uncertain, say so and suggest reliable sources.
`.trim()

const MAX_HISTORY = 20

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let data: { message?: unknown; history?: unknown }
  try {
    data = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request payload.' }, { status: 400 })
  }

  if (!data.message || typeof data.message !== 'string') {
    return Response.json({ error: 'Invalid request payload.' }, { status: 400 })
  }

  const userMessage = data.message.trim()
  if (!userMessage) {
    return Response.json({ error: 'Message cannot be empty.' }, { status: 400 })
  }
  if (userMessage.length > 1000) {
    return Response.json({ error: 'Message too long (max 1000 characters).' }, { status: 400 })
  }

  const rawHistory = Array.isArray(data.history) ? data.history : []
  const trimmedHistory = rawHistory.slice(-(MAX_HISTORY * 2)) as { role: string; parts: string }[]

  const contents = [
    ...trimmedHistory.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.parts }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ]

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    })

    return Response.json({ reply: response.text })
  } catch (err) {
    console.error('Gemini API error:', err)
    const errStr = String(err).toLowerCase()
    if (errStr.includes('quota') || errStr.includes('rate') || errStr.includes('429')) {
      return Response.json(
        { error: '🚦 Rate limit reached. Please wait a moment and try again.' },
        { status: 429 },
      )
    }
    return Response.json(
      { error: "I'm having a little trouble right now. 🙏 Please try again in a moment!" },
      { status: 500 },
    )
  }
}

export const config = {
  path: '/api/chat',
}
