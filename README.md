# Bharat Culture Bot 🪷

An AI-powered cultural guide to India's 28 states, built with **Flask** + **Google Gemini API**.

## Features

- 🏛️ Rich landing page with cultural aesthetic (saffron / maroon / gold theme)
- 🗺️ Clickable grid of all 28 Indian states — click to pre-fill a chat question
- 💬 Floating chatbot widget (no page reload) with typing indicator & markdown support
- 🧠 Context-aware multi-turn conversations (session memory, last 20 turns)
- 🔒 API key strictly server-side — never exposed to the browser
- 🚦 Built-in rate limiting (20 requests / 60 s per IP)
- 📱 Fully responsive (mobile + desktop)

---

## Project Structure

```
bharat-culture-bot/
├── app.py                  # Flask app — routes, session management, rate limiting
├── gemini_client.py        # Gemini API wrapper with system prompt & multi-turn history
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── .env                    # Your real keys (never commit this!)
├── templates/
│   └── index.html          # Landing page + embedded chat widget
└── static/
    ├── css/style.css       # Full stylesheet (warm cultural theme)
    ├── js/chatbot.js       # Self-contained widget logic
    └── images/hero_bg.png  # Generated hero background
```

---

## Quick Setup

### 1 — Clone / download the project

```bash
cd bharat-culture-bot
```

### 2 — Create a virtual environment (recommended)

```bash
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### 4 — Configure your API key

```bash
# Copy the example file
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
```

Open `.env` and replace the placeholder:

```env
GEMINI_API_KEY=AIza...your_actual_key...
FLASK_SECRET_KEY=some-long-random-string-for-sessions
```

> 🔑 **Get a free Gemini API key** at [Google AI Studio](https://aistudio.google.com/app/apikey)

### 5 — Run the app

```bash
python app.py
```

Open your browser at **http://localhost:5000** 🎉

---

## Environment Variables

| Variable           | Required        | Description                                   |
|--------------------|-----------------|-----------------------------------------------|
| `GEMINI_API_KEY`   | ✅ Yes          | Your Google Gemini API key                    |
| `FLASK_SECRET_KEY` | ✅ Recommended  | Random string for Flask session signing       |

---

## API Endpoints

| Method | Route        | Description                                              |
|--------|--------------|----------------------------------------------------------|
| GET    | `/`          | Renders the landing page with chat widget                |
| POST   | `/api/chat`  | Accepts `{"message":"..."}`, returns `{"reply":"..."}` |

### `/api/chat` validation rules
| Rule               | HTTP Code | Message returned                         |
|--------------------|-----------|------------------------------------------|
| Missing body/key   | 400       | `"Invalid request payload."`             |
| Empty message      | 400       | `"Message cannot be empty."`             |
| > 1000 characters  | 400       | `"Message too long (max 1000 chars)."`   |
| Rate limit hit     | 429       | `"Too many requests. Please slow down."` |

---

## Rate Limiting

The `/api/chat` endpoint is protected:
- **20 requests per 60 seconds** per IP address
- Exceeding the limit returns `HTTP 429` with a friendly message
- Uses a simple in-memory rolling-window counter (no Redis needed)

---

## Conversation Memory

Each browser session is tracked via a secure Flask session cookie.  
The last **20 conversation turns** are stored in memory and passed back to Gemini on every request, enabling natural follow-up questions like:

> _"Tell me about Kerala"_ → _"What about their food?"_ → _"And the festivals?"_

---

## How It Works

```
Browser → POST /api/chat {"message":"..."}
           ↓
        app.py  (rate-limit check → input validation → session history lookup)
           ↓
    gemini_client.py  (system prompt + history → Gemini 2.0 Flash API)
           ↓
        {"reply": "..."} ← JSON response
           ↓
    chatbot.js renders bubble in chat window
```

---

## Chatbot Coverage — 7 Categories × 28 States

| # | Category               | Examples                                      |
|---|------------------------|-----------------------------------------------|
| 1 | Martial / Fight Forms  | Kalaripayattu, Gatka, Thang-Ta               |
| 2 | Classical & Folk Dance | Bharatanatyam, Kathak, Bihu, Garba           |
| 3 | Traditional Dress      | Saree, Dhoti, Phiran, Mekhela Chador         |
| 4 | Cuisine & Food         | Biryani, Dhokla, Rogan Josh, Pongal          |
| 5 | Festivals              | Diwali, Durga Puja, Hornbill, Onam           |
| 6 | Languages & Scripts    | Tamil, Meitei Mayek, Gondi, Khasi            |
| 7 | Deities & Traditions   | Lord Jagannath, Kamakhya Devi, Murugan       |

---

## Security Notes

- ❌ The Gemini API key is **never** sent to the browser
- ✅ All LLM calls happen server-side in `gemini_client.py`
- ✅ Input length validated server-side (max 1 000 characters)
- ✅ Flask sessions use a cryptographically secure secret key
- ✅ Rate limiting prevents API abuse
- ✅ `.env` is listed in `.gitignore` — never commit real keys!

---

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Backend   | Python 3.12 + Flask 3.x     |
| LLM       | Google Gemini 2.0 Flash     |
| SDK       | `google-genai` >= 1.0.0     |
| Frontend  | Vanilla HTML / CSS / JS     |
| Fonts     | Google Fonts (Cinzel, Inter, Playfair Display) |
| Config    | `python-dotenv`             |

---

## License

MIT — free for educational and personal use.
