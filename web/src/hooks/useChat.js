import { useCallback, useRef, useState } from "react";

// ─── Mock streaming for testing frontend rendering ───
const MOCK_REPLY = `你好！我是 **Mock 模式**，用于测试前端渲染效果。

这是一段示例回复，包含各种 Markdown 元素：

## 代码块
\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## 列表
1. 第一项 ✅
2. 第二项 🚀
3. 第三项 💡

> 这是一段引用文字，用于测试引用块渲染。

流式输出测试完成！每个 chunk 会逐步显示。`;

async function* mockStream() {
    const chunkSize = 8;
    for (let i = 0; i < MOCK_REPLY.length; i += chunkSize) {
        yield MOCK_REPLY.slice(i, i + chunkSize);
        await new Promise((r) => setTimeout(r, 50));
    }
}

// ─── OpenAI-compatible streaming (direct from browser) ───
async function* openaiStream(messages, { apiBase, apiKey, model, systemPrompt, signal }) {
    const base = (apiBase || "").replace(/\/+$/, "");
    const endpoint = `${base}/v1/chat/completions`;

    const openaiMessages = [];

    if (systemPrompt) {
        openaiMessages.push({ role: "system", content: systemPrompt });
    }

    for (const msg of messages) {
        if (msg && typeof msg.content === "string") {
            openaiMessages.push({
                role: msg.role === "model" ? "assistant" : msg.role,
                content: msg.content
            });
        }
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey || ""}`
        },
        body: JSON.stringify({
            model: model || "gemini-2.5-flash",
            messages: openaiMessages,
            stream: true,
            temperature: 0.7
        }),
        signal
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`API 错误 ${response.status}: ${detail.slice(0, 200)}`);
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
                if (delta?.content) yield delta.content;
            } catch {
                // skip
            }
        }
    }
}

// ─── Backend proxy streaming (original SSE format) ───
async function* backendStream(messages, { sessionId, signal }) {
    const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, sessionId }),
        signal
    });

    if (!response.ok || !response.body) {
        throw new Error("服务异常，请稍后再试。");
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

            const lines = raw.split("\n");
            let event = "message";
            let data = "";
            for (const line of lines) {
                if (line.startsWith("event:")) event = line.replace("event:", "").trim();
                else if (line.startsWith("data:")) data += line.replace("data:", "").trim();
            }

            if (event === "chunk") {
                try {
                    const payload = JSON.parse(data);
                    if (payload?.text) yield payload.text;
                } catch { /* skip */ }
            }
            if (event === "error") {
                throw new Error("服务异常，请稍后再试。");
            }
        }
    }
}

// ─── Main hook ───
export default function useChat({ activeSession, addMessageToSession, settings }) {
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingReply, setStreamingReply] = useState("");
    const [lastError, setLastError] = useState(null);
    const abortRef = useRef(null);

    const sendMessage = useCallback(async (text) => {
        if (!activeSession || !text.trim()) return;

        const userMessage = { id: crypto.randomUUID(), role: "user", content: text, createdAt: Date.now() };
        addMessageToSession(activeSession.id, userMessage);

        setIsStreaming(true);
        setStreamingReply("");
        setLastError(null);

        const abortController = new AbortController();
        abortRef.current = abortController;

        const allMessages = [...activeSession.messages, userMessage];
        const mode = settings?.apiMode || "direct";

        try {
            let stream;

            if (mode === "mock") {
                stream = mockStream();
            } else if (mode === "direct") {
                stream = openaiStream(allMessages, {
                    apiBase: settings.apiBase,
                    apiKey: settings.apiKey,
                    model: activeSession.model || settings.defaultModel,
                    systemPrompt: settings.systemPrompt,
                    signal: abortController.signal
                });
            } else {
                // backend mode
                stream = backendStream(allMessages, {
                    sessionId: activeSession.id,
                    signal: abortController.signal
                });
            }

            let reply = "";
            for await (const chunk of stream) {
                reply += chunk;
                setStreamingReply(reply);
            }

            addMessageToSession(activeSession.id, {
                id: crypto.randomUUID(),
                role: "assistant",
                content: reply || "抱歉，我刚才没听清。",
                createdAt: Date.now()
            });
        } catch (err) {
            const wasCancelled = err?.name === "AbortError";
            setLastError(wasCancelled ? null : (err?.message || "请求失败"));
            addMessageToSession(activeSession.id, {
                id: crypto.randomUUID(),
                role: "assistant",
                content: wasCancelled ? "生成已停止。" : `请求失败：${err?.message || "未知错误"}`,
                createdAt: Date.now()
            });
            if (!wasCancelled) setTimeout(() => setLastError(null), 10_000);
        } finally {
            setIsStreaming(false);
            setStreamingReply("");
            abortRef.current = null;
        }
    }, [activeSession, addMessageToSession, settings]);

    const stopStreaming = useCallback(() => {
        if (abortRef.current) abortRef.current.abort();
    }, []);

    return { isStreaming, streamingReply, lastError, sendMessage, stopStreaming };
}
