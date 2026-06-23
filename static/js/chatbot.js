/**
 * chatbot.js — Bharath Culture Bot Widget
 * Self-contained chatbot widget logic.
 * All API calls go through Flask /api/chat — never direct from browser.
 */

(function () {
  "use strict";

  /* ── DOM refs ── */
  const fab        = document.getElementById("chat-fab");
  const chatWin    = document.getElementById("chat-window-page") || document.getElementById("chat-window");
  const closeBtn   = document.getElementById("chat-close");
  const msgArea    = document.getElementById("chat-messages");
  const inputEl    = document.getElementById("chat-input");
  const sendBtn    = document.getElementById("chat-send");
  const charCount  = document.getElementById("char-count");
  const fabBadge   = document.querySelector(".fab-badge");

  const MAX_CHARS  = 1000;
  let   isOpen     = false;
  let   isBusy     = false;
  let   typingEl   = null;

  /* ── Open / Close ── */
  function openChat() {
    isOpen = true;
    if (chatWin) chatWin.classList.add("open");
    if (fab) fab.classList.add("active");
    if (fabBadge) fabBadge.style.display = "none";
    setTimeout(() => { if (inputEl) inputEl.focus(); }, 350);
    scrollToBottom();
  }

  function closeChat() {
    isOpen = false;
    if (chatWin) chatWin.classList.remove("open");
    if (fab) fab.classList.remove("active");
  }

  if (fab) {
    fab.addEventListener("click", () => (isOpen ? closeChat() : openChat()));
  }
  if (closeBtn && !closeBtn.getAttribute("href")) {
    closeBtn.addEventListener("click", closeChat);
  }

  /* Close on Escape key */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closeChat();
  });

  /* ── Scroll helper ── */
  function scrollToBottom() {
    requestAnimationFrame(() => {
      msgArea.scrollTop = msgArea.scrollHeight;
    });
  }

  /* ── Create message bubble ── */
  function appendMessage(text, role, isError = false) {
    const wrap = document.createElement("div");
    wrap.className = `message ${role}`;

    if (role === "bot") {
      const icon = document.createElement("div");
      icon.className = "msg-icon";
      icon.textContent = "🪷";
      wrap.appendChild(icon);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble" + (isError ? " error" : "");

    // Render basic markdown-like formatting
    bubble.innerHTML = formatText(text);
    wrap.appendChild(bubble);

    msgArea.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  /* ── Lightweight markdown formatter ── */
  function formatText(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>")
      // bullet points
      .replace(/^• (.+)$/gm, "<li>$1</li>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
      .replace(/(<li>.*<\/li>)+/g, (m) => `<ul>${m}</ul>`);
  }

  /* ── Typing indicator ── */
  function showTyping() {
    const wrap = document.createElement("div");
    wrap.className = "message bot";
    wrap.id = "typing-wrap";

    const icon = document.createElement("div");
    icon.className = "msg-icon";
    icon.textContent = "🪷";
    wrap.appendChild(icon);

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = `
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>`;
    wrap.appendChild(bubble);

    msgArea.appendChild(wrap);
    typingEl = wrap;
    scrollToBottom();
  }

  function hideTyping() {
    if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  /* ── Send message ── */
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isBusy) return;
    if (text.length > MAX_CHARS) {
      appendMessage("⚠️ Message too long. Please keep it under 1000 characters.", "bot", true);
      return;
    }

    inputEl.value = "";
    updateCharCount();
    isBusy = true;
    sendBtn.disabled = true;

    appendMessage(text, "user");
    showTyping();

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: text }),
      });

      hideTyping();

      if (res.status === 429) {
        appendMessage("🚦 You're sending messages a bit too fast. Please wait a moment and try again.", "bot", true);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        appendMessage(err.error || "Something went wrong. Please try again. 🙏", "bot", true);
        return;
      }

      const data = await res.json();
      appendMessage(data.reply || "I received an empty response. Please try again.", "bot");

    } catch (err) {
      hideTyping();
      console.error("[BharathBot] fetch error:", err);
      appendMessage("⚡ Network error — please check your connection and try again.", "bot", true);
    } finally {
      isBusy = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  /* ── Input events ── */
  sendBtn.addEventListener("click", sendMessage);

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function updateCharCount() {
    const len = inputEl.value.length;
    charCount.textContent = `${len}/${MAX_CHARS}`;
    charCount.style.color = len > MAX_CHARS * 0.9 ? "#b91c1c" : "";
  }

  inputEl.addEventListener("input", updateCharCount);

  /* Auto-grow textarea */
  inputEl.addEventListener("input", () => {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + "px";
  });

  /* ── Pre-fill from state card click ── */
  window.prefillChat = function (stateName) {
    if (inputEl) {
      openChat();
      inputEl.value = `Tell me about the culture of ${stateName}`;
      updateCharCount();
      inputEl.focus();
    } else {
      window.location.href = stateName ? `/chat?state=${encodeURIComponent(stateName)}` : '/chat';
    }
  };

  /* ── Welcome message ── */
  window.addEventListener("DOMContentLoaded", () => {
    appendMessage(
      "🙏 **Namaste!** I'm **Bharath Culture Bot** — your guide to the rich heritage of India's 28 states.\n\nAsk me about *Dance, Food, Festivals, Martial Arts, Dress, Languages* or *Deities* of any state. You can also click a state card below to get started!",
      "bot"
    );

    // Auto-prefill and auto-submit if state query param is present
    const urlParams = new URLSearchParams(window.location.search);
    const stateParam = urlParams.get("state");
    if (stateParam && inputEl) {
      inputEl.value = `Tell me about the culture of ${stateParam}`;
      updateCharCount();
      // Auto-send after a short delay so the user sees it type/send
      setTimeout(() => {
        sendMessage();
      }, 600);
    }
  });

  /* ── Scroll-reveal for sections ── */
  const revealEls = document.querySelectorAll(".reveal");
  const observer  = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observer.unobserve(e.target);
        }
      }),
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => observer.observe(el));

})();
