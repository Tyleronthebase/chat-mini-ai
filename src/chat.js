/**
 * Chat module – supports both remote streaming (Gemini) and local mock.
 */

async function generateReply(messages, options) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const lastUser = [...safeMessages].reverse().find(msg => msg && msg.role === "user");
  const lastText = lastUser && typeof lastUser.content === "string" ? lastUser.content : "";

  const useRemote = Boolean(options && options.useRemote && options.apiKey);
  if (useRemote) {
    console.log("[generateReply] 使用远程API (non-stream)");
    const model = options.model || "gemini-2.5-flash";
    const endpoint = options.endpoint
      || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey || ""}`;

    const contents = buildContents(safeMessages);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7 } })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[generateReply] API Error:", detail);
      throw new Error(`Remote API error: ${response.status} ${detail}`);
    }

    const data = await response.json();
    const remoteReply = data && data.candidates && data.candidates[0] && data.candidates[0].content
      ? data.candidates[0].content.parts.map(part => part.text || "").join("").trim()
      : "抱歉，我刚才没听清。";
    return remoteReply || "抱歉，我刚才没听清。";
  }

  if (!lastText) {
    return "你好！随便说点什么，我就能回你。";
  }

  if (lastText.includes("项目") || lastText.includes("idea") || lastText.includes("主意")) {
    return "我可以帮你做一个轻量聊天机器人、AI日程助理或知识卡片问答。你更想做哪个？";
  }

  return `收到：${lastText}\n\n我现在是本地Mock模式（无需API Key）。如果你想接入真实模型，设置GOOGLE_API_KEY并把USE_REMOTE=1。`;
}

/**
 * Stream reply using Gemini streamGenerateContent endpoint.
 * Returns an async generator that yields text chunks.
 */
async function* streamReply(messages, options) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const useRemote = Boolean(options && options.useRemote && options.apiKey);

  if (!useRemote) {
    // Mock mode: simulate streaming by yielding the full reply
    const reply = await generateReply(safeMessages, options);
    const chunkSize = 12;
    for (let i = 0; i < reply.length; i += chunkSize) {
      yield reply.slice(i, i + chunkSize);
      // Small delay for mock streaming effect
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    return;
  }

  const model = options.model || "gemini-2.5-flash";
  const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${options.apiKey || ""}`;

  console.log("[streamReply] 使用流式API");
  console.log("[streamReply] Endpoint:", streamEndpoint);

  const contents = buildContents(safeMessages);

  const response = await fetch(streamEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, generationConfig: { temperature: 0.7 } })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[streamReply] API Error:", detail);
    throw new Error(`Remote API error: ${response.status} ${detail}`);
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

      // Parse SSE data lines
      let data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }

      if (!data) continue;

      try {
        const parsed = JSON.parse(data);
        if (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content) {
          const parts = parsed.candidates[0].content.parts || [];
          for (const part of parts) {
            if (part.text) {
              yield part.text;
            }
          }
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
}

function buildContents(messages) {
  return (messages.length ? messages : [{ role: "user", content: "你好" }])
    .filter(message => message && typeof message.content === "string")
    .map(message => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    }));
}

module.exports = { generateReply, streamReply };
