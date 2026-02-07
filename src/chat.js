async function generateReply(messages, options) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const lastUser = [...safeMessages].reverse().find(msg => msg && msg.role === "user");
  const lastText = lastUser && typeof lastUser.content === "string" ? lastUser.content : "";

  const useRemote = Boolean(options && options.useRemote && options.apiKey);
  if (useRemote) {
    const response = await fetch(options.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`
      },
      body: JSON.stringify({
        model: options.model,
        messages: safeMessages.length ? safeMessages : [{ role: "user", content: "你好" }]
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Remote API error: ${response.status} ${detail}`);
    }

    const data = await response.json();
    const remoteReply = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "抱歉，我刚才没听清。";
    return remoteReply;
  }

  if (!lastText) {
    return "你好！随便说点什么，我就能回你。";
  }

  if (lastText.includes("项目") || lastText.includes("idea") || lastText.includes("主意")) {
    return "我可以帮你做一个轻量聊天机器人、AI日程助理或知识卡片问答。你更想做哪个？";
  }

  return `收到：${lastText}\n\n我现在是本地Mock模式（无需API Key）。如果你想接入真实模型，设置OPENAI_API_KEY并把USE_REMOTE=1。`;
}

module.exports = { generateReply };
