const chat = document.getElementById("chat");
const form = document.getElementById("chat-form");
const input = document.getElementById("message");

const state = {
  messages: []
};

function setLoading(isLoading) {
  input.disabled = isLoading;
  form.querySelector("button").disabled = isLoading;
}

function addMessage(role, content) {
  const bubble = document.createElement("div");
  bubble.className = `bubble bubble--${role}`;
  bubble.textContent = content;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
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
  state.messages.push({ role: "user", content: text });
  addMessage("user", text);
  setLoading(true);

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: state.messages })
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

  state.messages.push({ role: "assistant", content: reply || assistantBubble.textContent });
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

async function loadHistory() {
  const response = await fetch("/api/history");
  if (!response.ok) {
    addMessage("assistant", "你好！这是本地Mock聊天。直接输入消息试试。\n想接入API的话我也能帮你配。");
    return;
  }
  const data = await response.json();
  const history = Array.isArray(data.messages) ? data.messages : [];
  if (!history.length) {
    addMessage("assistant", "你好！这是本地Mock聊天。直接输入消息试试。\n想接入API的话我也能帮你配。");
    return;
  }
  state.messages = history;
  history.forEach(message => addMessage(message.role, message.content));
}

loadHistory();
