const chat = document.getElementById("chat");
const form = document.getElementById("chat-form");
const input = document.getElementById("message");
const sessionList = document.getElementById("session-list");
const newChatButton = document.getElementById("new-chat");
const toggleSidebarButton = document.getElementById("toggle-sidebar");
const toggleSearchButton = document.getElementById("toggle-search");
const searchWrap = document.getElementById("search-wrap");
const sessionSearchInput = document.getElementById("session-search");
const stopButton = document.getElementById("stop-button");
const modelSelect = document.getElementById("model-select");
const sessionStatus = document.getElementById("session-status");
const composerState = document.getElementById("composer-state");
const emptyState = document.getElementById("empty-state");
const quickPromptButtons = Array.from(document.querySelectorAll(".quick-chip"));

const STORAGE_KEY = "chat-mini-sessions";

const state = {
  sessions: [],
  activeSessionId: null,
  isStreaming: false,
  abortController: null,
  searchQuery: "",
  sidebarCollapsed: false
};

function setLoading(isLoading) {
  state.isStreaming = isLoading;
  input.disabled = isLoading;
  form.querySelector(".primary-button").disabled = isLoading;
  stopButton.disabled = !isLoading;
  sessionStatus.textContent = isLoading ? "生成中" : "就绪";
  composerState.textContent = isLoading ? "正在生成回复..." : "等待输入";
}

function syncEmptyState() {
  const session = getActiveSession();
  const hasMessages = Boolean(session && Array.isArray(session.messages) && session.messages.length);
  emptyState.style.display = hasMessages ? "none" : "flex";
  chat.style.display = hasMessages ? "flex" : "none";
}

function saveSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function getActiveSession() {
  return state.sessions.find(session => session.id === state.activeSessionId) || null;
}

function updateSessionMeta(session) {
  if (!session.title || session.title === "新会话") {
    const firstUser = session.messages.find(message => message.role === "user");
    session.title = firstUser ? firstUser.content.slice(0, 20) : "新会话";
  }
  session.updatedAt = Date.now();
}

function addMessage(role, content) {
  const bubble = document.createElement("div");
  bubble.className = `bubble bubble--${role}`;
  bubble.textContent = content;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

function renderSessions() {
  sessionList.innerHTML = "";
  const query = state.searchQuery.trim().toLowerCase();
  state.sessions
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter(session => {
      if (!query) {
        return true;
      }
      return session.title.toLowerCase().includes(query)
        || session.model.toLowerCase().includes(query)
        || session.messages.some(message => String(message.content || "").toLowerCase().includes(query));
    })
    .forEach(session => {
      const item = document.createElement("div");
      item.className = `session-item${session.id === state.activeSessionId ? " active" : ""}`;
      item.innerHTML = `
        <div class="session-item__title">${session.title}</div>
        <div class="session-item__meta">${session.model} · ${formatTime(session.updatedAt)}</div>
      `;
      item.addEventListener("click", () => switchSession(session.id));
      sessionList.appendChild(item);
    });
}

function renderMessages(messages) {
  chat.innerHTML = "";
  messages.forEach(message => addMessage(message.role, message.content));
}

function switchSession(sessionId) {
  state.activeSessionId = sessionId;
  const session = getActiveSession();
  if (session) {
    modelSelect.value = session.model;
    renderMessages(session.messages);
  }
  renderSessions();
  syncEmptyState();
}

function createSession() {
  const session = {
    id: crypto.randomUUID(),
    title: "新会话",
    model: "gemini-1.5-flash",
    messages: [],
    updatedAt: Date.now()
  };
  state.sessions.push(session);
  state.activeSessionId = session.id;
  saveSessions();
  renderSessions();
  renderMessages(session.messages);
  modelSelect.value = session.model;
  syncEmptyState();
}

async function streamResponse(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf("\n\n");
    while (idx !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      idx = buffer.indexOf("\n\n");

      const lines = raw.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.replace("event:", "").trim();
        } else if (line.startsWith("data:")) {
          data += line.replace("data:", "").trim();
        }
      }

      let payload = null;
      try {
        payload = data ? JSON.parse(data) : null;
      } catch (error) {
        payload = null;
      }

      onEvent(event, payload);
    }
  }
}

async function sendMessage(text) {
  const session = getActiveSession();
  if (!session) {
    return;
  }
  session.messages.push({ role: "user", content: text });
  addMessage("user", text);
  updateSessionMeta(session);
  renderSessions();
  setLoading(true);
  state.abortController = new AbortController();

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: session.messages }),
    signal: state.abortController.signal
  });

  if (!response.ok || !response.body) {
    addMessage("assistant", "服务异常，请稍后再试。");
    setLoading(false);
    return;
  }

  const assistantBubble = document.createElement("div");
  assistantBubble.className = "bubble bubble--assistant";
  assistantBubble.textContent = "";
  chat.appendChild(assistantBubble);
  chat.scrollTop = chat.scrollHeight;

  let reply = "";
  try {
    await streamResponse(response, (event, payload) => {
      if (event === "chunk" && payload && payload.text) {
        reply += payload.text;
        assistantBubble.textContent = reply;
        chat.scrollTop = chat.scrollHeight;
      }
      if (event === "error") {
        assistantBubble.textContent = "服务异常，请稍后再试。";
      }
    });
  } catch (error) {
    assistantBubble.textContent = "生成已停止。";
  }

  session.messages.push({ role: "assistant", content: reply || assistantBubble.textContent });
  updateSessionMeta(session);
  saveSessions();
  renderSessions();
  syncEmptyState();
  setLoading(false);
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    return;
  }
  input.value = "";
  sendMessage(text);
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

stopButton.addEventListener("click", () => {
  if (state.abortController) {
    state.abortController.abort();
  }
  setLoading(false);
});

modelSelect.addEventListener("change", event => {
  const session = getActiveSession();
  if (!session) {
    return;
  }
  session.model = event.target.value;
  updateSessionMeta(session);
  saveSessions();
  renderSessions();
});

newChatButton.addEventListener("click", () => {
  createSession();
});

toggleSidebarButton.addEventListener("click", () => {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  document.querySelector(".app-shell").classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
});

toggleSearchButton.addEventListener("click", () => {
  searchWrap.classList.toggle("active");
  if (searchWrap.classList.contains("active")) {
    sessionSearchInput.focus();
  } else {
    sessionSearchInput.value = "";
    state.searchQuery = "";
    renderSessions();
  }
});

sessionSearchInput.addEventListener("input", event => {
  state.searchQuery = event.target.value;
  renderSessions();
});

quickPromptButtons.forEach(button => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt || "";
    form.requestSubmit();
  });
});

async function loadHistory() {
  const response = await fetch("/api/history");
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return Array.isArray(data.messages) ? data.messages : [];
}

async function bootstrap() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (saved.length) {
    state.sessions = saved;
    state.activeSessionId = saved[0].id;
    switchSession(state.activeSessionId);
    syncEmptyState();
    return;
  }

  const history = await loadHistory();
  createSession();
  const session = getActiveSession();
  if (session && history.length) {
    session.messages = history;
    updateSessionMeta(session);
    saveSessions();
    renderMessages(session.messages);
    renderSessions();
  }
  syncEmptyState();
}

bootstrap();
