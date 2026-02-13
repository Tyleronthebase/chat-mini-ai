async function generateReply(messages, options) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const lastUser = [...safeMessages].reverse().find(msg => msg && msg.role === "user");
  const lastText = lastUser && typeof lastUser.content === "string" ? lastUser.content : "";

  const useRemote = Boolean(options && options.useRemote && options.apiKey);
  if (useRemote) {
    console.log("[generateReply] 使用远程API");
    console.log("[generateReply] Endpoint:", options.endpoint);
    
    const contents = (safeMessages.length ? safeMessages : [{ role: "user", content: "你好" }])
      .filter(message => message && typeof message.content === "string")
      .map(message => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }]
      }));

    console.log("[generateReply] Request contents:", JSON.stringify(contents, null, 2));

    const response = await fetch(options.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    console.log("[generateReply] Response status:", response.status);

    if (!response.ok) {
      const detail = await response.text();
      console.error("[generateReply] API Error:", detail);
      throw new Error(`Remote API error: ${response.status} ${detail}`);
    }

    const data = await response.json();
    console.log("[generateReply] Response data:", JSON.stringify(data, null, 2));
    
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

module.exports = { generateReply };
