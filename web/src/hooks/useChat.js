import { useCallback, useRef, useState } from "react";

async function streamResponse(response, onEvent) {
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
                if (line.startsWith("event:")) {
                    event = line.replace("event:", "").trim();
                } else if (line.startsWith("data:")) {
                    data += line.replace("data:", "").trim();
                }
            }

            let payload = null;
            try {
                payload = data ? JSON.parse(data) : null;
            } catch {
                payload = null;
            }

            onEvent(event, payload);
        }
    }
}

export default function useChat({ activeSession, addMessageToSession }) {
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

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: allMessages, sessionId: activeSession.id }),
                signal: abortController.signal
            });

            if (!response.ok || !response.body) {
                throw new Error("服务异常，请稍后再试。");
            }

            let reply = "";
            await streamResponse(response, (event, payload) => {
                if (event === "chunk" && payload?.text) {
                    reply += payload.text;
                    setStreamingReply(reply);
                }
                if (event === "error") {
                    reply = "服务异常，请稍后再试。";
                    setStreamingReply(reply);
                }
            });

            addMessageToSession(activeSession.id, {
                id: crypto.randomUUID(),
                role: "assistant",
                content: reply || "服务异常，请稍后再试。",
                createdAt: Date.now()
            });
        } catch (err) {
            const wasCancelled = err?.name === "AbortError";
            setLastError(wasCancelled ? null : (err?.message || "请求失败"));
            addMessageToSession(activeSession.id, {
                id: crypto.randomUUID(),
                role: "assistant",
                content: wasCancelled ? "生成已停止。" : "请求失败，请稍后再试。",
                createdAt: Date.now()
            });
            // Auto-clear error after 10s
            if (!wasCancelled) setTimeout(() => setLastError(null), 10_000);
        } finally {
            setIsStreaming(false);
            setStreamingReply("");
            abortRef.current = null;
        }
    }, [activeSession, addMessageToSession]);

    const stopStreaming = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
    }, []);

    return {
        isStreaming,
        streamingReply,
        lastError,
        sendMessage,
        stopStreaming
    };
}
