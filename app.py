import os
import uuid
import time
import logging
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv

# IMPORTANT: load .env BEFORE importing gemini_client so that
# GEMINI_API_KEY is in os.environ when the module-level client is created.
load_dotenv()
print("API KEY:", os.getenv("GEMINI_API_KEY"))

from gemini_client import get_response  # noqa: E402
# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", os.urandom(32))

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s  %(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Simple in-memory rate-limiter  (IP → list of timestamps)
# ---------------------------------------------------------------------------
RATE_LIMIT_REQUESTS = 20   # max requests
RATE_LIMIT_WINDOW   = 60   # per second window

_rate_store: dict[str, list[float]] = {}


def _is_rate_limited(ip: str) -> bool:
    now = time.time()
    timestamps = _rate_store.get(ip, [])
    # keep only timestamps inside the rolling window
    timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(timestamps) >= RATE_LIMIT_REQUESTS:
        _rate_store[ip] = timestamps
        return True
    timestamps.append(now)
    _rate_store[ip] = timestamps
    return False


# ---------------------------------------------------------------------------
# In-memory conversation store  (session_id → list of message dicts)
# ---------------------------------------------------------------------------
_conversations: dict[str, list[dict]] = {}

MAX_HISTORY = 20   # keep last N turns per session


def _get_or_create_session() -> str:
    """Return a stable session id for this browser session."""
    if "sid" not in session:
        session["sid"] = str(uuid.uuid4())
    return session["sid"]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/chat")
def chat_page():
    return render_template("chat.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    # --- rate limiting ---
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    if _is_rate_limited(client_ip):
        logger.warning("Rate limit hit for IP: %s", client_ip)
        return jsonify({"error": "Too many requests. Please slow down."}), 429

    # --- input validation ---
    data = request.get_json(silent=True)
    if not data or "message" not in data:
        return jsonify({"error": "Invalid request payload."}), 400

    user_message = str(data["message"]).strip()
    if not user_message:
        return jsonify({"error": "Message cannot be empty."}), 400
    if len(user_message) > 1000:
        return jsonify({"error": "Message too long (max 1000 characters)."}), 400

    # --- conversation history ---
    sid = _get_or_create_session()
    history = _conversations.setdefault(sid, [])

    # --- call Gemini ---
    logger.info("Session %s | User: %s", sid[:8], user_message[:80])
    reply = get_response(user_message, history)

    # --- update history (keep last MAX_HISTORY turns) ---
    history.append({"role": "user",  "parts": user_message})
    history.append({"role": "model", "parts": reply})
    if len(history) > MAX_HISTORY * 2:
        _conversations[sid] = history[-(MAX_HISTORY * 2):]

    logger.info("Session %s | Bot: %s", sid[:8], reply[:80])
    return jsonify({"reply": reply})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
