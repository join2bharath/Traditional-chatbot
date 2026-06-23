"""
gemini_client.py
----------------
Wraps the Google Gemini API using the current google-genai SDK.
The API key is read from the GEMINI_API_KEY environment variable
(loaded by app.py via python-dotenv).
"""

import os
import logging
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Initialise the client once at import time
# ---------------------------------------------------------------------------
_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not _API_KEY:
    logger.warning("GEMINI_API_KEY is not set. Responses will be mocked.")

_client = genai.Client(api_key=_API_KEY) if _API_KEY else None

_MODEL_NAME = "gemini-2.0-flash"   # separate free-tier quota from gemini-2.0-flash

# ---------------------------------------------------------------------------
# System / persona instruction
# ---------------------------------------------------------------------------
_SYSTEM_INSTRUCTION = """
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
""".strip()

# ---------------------------------------------------------------------------
# Fallback response
# ---------------------------------------------------------------------------
_FALLBACK = (
    "I'm having a little trouble reaching my knowledge base right now. 🙏 "
    "Please try again in a moment, or ask me something else about India's incredible culture!"
)


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------
def get_response(user_message: str, history: list[dict]) -> str:
    """
    Call Gemini and return a text reply.

    Parameters
    ----------
    user_message : str
        The latest message from the user.
    history : list[dict]
        Previous turns: [{"role": "user"|"model", "parts": "<text>"}, ...]

    Returns
    -------
    str
        The model's text reply, or a friendly fallback string on error.
    """
    if not _client:
        return "⚠️ API key not configured. Please set GEMINI_API_KEY in your .env file."

    try:
        # Build conversation history in google-genai Content format
        contents: list[types.Content] = []

        for turn in history:
            role = turn["role"]   # "user" or "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part(text=turn["parts"])]
                )
            )

        # Append the latest user message
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part(text=user_message)]
            )
        )

        response = _client.models.generate_content(
            model=_MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM_INSTRUCTION,
                temperature=0.7,
                max_output_tokens=1024,
            ),
        )

        return response.text.strip()

    except Exception as exc:          # noqa: BLE001
        logger.error("Gemini API error: %s", exc, exc_info=True)

        err_str = str(exc).lower()
        if "api_key" in err_str or "invalid" in err_str:
            return "⚠️ API key issue detected. Please check your GEMINI_API_KEY in .env."
        if "quota" in err_str or "rate" in err_str or "429" in err_str:
            return "🚦 Gemini API rate limit reached. Please wait a moment and try again."
        if "timeout" in err_str:
            return "⏱️ The request timed out. Please try again."

        return _FALLBACK
