const chat = document.getElementById("chat");
const form = document.getElementById("chat-form");
const input = document.getElementById("message");

const state = {
  messages: []
};

function addMessage(role, content) {
  const bubble = document.createElement("div");
  bubble.className = `bubble bubble--${role}`;
  bubble.textContent = content;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage(text) {
  state.messages.push({ role: "user", content: text });
  addMessage("user", text);

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: state.messages })
  });

  if (!response.ok) {
    addMessage("assistant", "服务异常，请稍后再试。");
    return;
  }

  const data = await response.json();
  const reply = data.reply || "";
  state.messages.push({ role: "assistant", content: reply });
  addMessage("assistant", reply);
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

addMessage("assistant", "你好！这是本地Mock聊天。直接输入消息试试。\n想接入API的话我也能帮你配。");
