/**
 * Chat module – supports:
 * 1. Google Gemini native API (default)
 * 2. OpenAI-compatible API (e.g. VoAPI, OneAPI, etc.)
 * 3. Local mock mode (no API key)
 *
 * Set GOOGLE_API_BASE to switch between providers:
 *   - empty / not set → Google Gemini native API
 *   - https://demo.voapi.top → OpenAI-compatible relay
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Detect if the API base is an OpenAI-compatible endpoint.
 */
function isOpenAICompatible(apiBase) {
  if (!apiBase) return false;
  // Gemini native endpoints are NOT OpenAI-compatible
  if (apiBase.includes("generativelanguage.googleapis.com")) return false;
  return true;
}

// ─── Gemini Native Format ───

function buildGeminiContents(messages) {
  return (messages.length ? messages : [{ role: "user", content: "你好" }])
    .filter(message => message && typeof message.content === "string")
    .map(message => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    }));
}

async function* streamGemini(messages, options) {
  const model = options.model || "gemini-2.5-flash";
  const apiBase = options.apiBase || GEMINI_BASE;
  const endpoint = `${apiBase}/models/${model}:streamGenerateContent?alt=sse&key=${options.apiKey || ""}`;

  console.log("[streamGemini] Endpoint:", endpoint);

  const contents = buildGeminiContents(messages);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, generationConfig: { temperature: 0.7 } })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[streamGemini] API Error:", detail);
    throw new Error(`Gemini API error: ${response.status} ${detail}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let idx = buffer.indexOf("\n\n");
    while (idx !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      idx = buffer.indexOf("\n\n");

      let data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }

      if (!data || data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        if (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content) {
          const parts = parsed.candidates[0].content.parts || [];
          for (const part of parts) {
            if (part.text) yield part.text;
          }
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
}

// ─── OpenAI-Compatible Format ───

function buildOpenAIMessages(messages) {
  return (messages.length ? messages : [{ role: "user", content: "你好" }])
    .filter(msg => msg && typeof msg.content === "string")
    .map(msg => ({
      role: msg.role === "model" ? "assistant" : msg.role,
      content: msg.content
    }));
}

async function* streamOpenAI(messages, options) {
  const model = options.model || "gemini-2.5-flash";
  const apiBase = (options.apiBase || "").replace(/\/+$/, "");
  const endpoint = `${apiBase}/v1/chat/completions`;

  console.log("[streamOpenAI] Endpoint:", endpoint);
  console.log("[streamOpenAI] Model:", model);

  const openaiMessages = buildOpenAIMessages(messages);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${options.apiKey || ""}`
    },
    body: JSON.stringify({
      model,
      messages: openaiMessages,
      stream: true,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[streamOpenAI] API Error:", detail);
    throw new Error(`OpenAI-compatible API error: ${response.status} ${detail}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let idx = buffer.indexOf("\n");
    while (idx !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      idx = buffer.indexOf("\n");

      if (!line.startsWith("data:")) continue;

      const data = line.slice(5).trim();
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) {
          yield delta.content;
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
}

// ─── Public API ───

async function* streamReply(messages, options) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const useRemote = Boolean(options && options.useRemote && options.apiKey);

  if (!useRemote) {
    // Mock mode
    const reply = await generateMockReply(safeMessages);
    const chunkSize = 12;
    for (let i = 0; i < reply.length; i += chunkSize) {
      yield reply.slice(i, i + chunkSize);
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    return;
  }

  const apiBase = options.apiBase || "";

  if (isOpenAICompatible(apiBase)) {
    console.log("[streamReply] 使用 OpenAI 兼容格式 (VoAPI/OneAPI)");
    yield* streamOpenAI(safeMessages, options);
  } else {
    console.log("[streamReply] 使用 Gemini 原生格式");
    yield* streamGemini(safeMessages, options);
  }
}

async function generateReply(messages, options) {
  let result = "";
  for await (const chunk of streamReply(messages, options)) {
    result += chunk;
  }
  return result || "抱歉，我刚才没听清。";
}

async function generateMockReply(messages) {
  const lastUser = [...messages].reverse().find(msg => msg && msg.role === "user");
  const lastText = lastUser && typeof lastUser.content === "string" ? lastUser.content : "";

  if (!lastText) return "你好！随便说点什么，我就能回你。";

  if (lastText.includes("项目") || lastText.includes("idea") || lastText.includes("主意")) {
    return "我可以帮你做一个轻量聊天机器人、AI日程助理或知识卡片问答。你更想做哪个？";
  }

  return `收到：${lastText}\n\n我现在是本地Mock模式（无需API Key）。如果你想接入真实模型，设置GOOGLE_API_KEY并把USE_REMOTE=1。`;
}

module.exports = { generateReply, streamReply };
