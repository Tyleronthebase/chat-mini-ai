import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "chat-mini-sessions";

function createSession() {
    return {
        id: crypto.randomUUID(),
        title: "新会话",
        model: "gemini-2.5-flash",
        messages: [],
        updatedAt: Date.now()
    };
}

function updateSessionMeta(session) {
    if (!session.title || session.title === "新会话") {
        const firstUser = session.messages.find((msg) => msg.role === "user");
        session.title = firstUser ? firstUser.content.slice(0, 20) : "新会话";
    }
    session.updatedAt = Date.now();
}

export default function useSessions() {
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);

    const activeSession = useMemo(
        () => sessions.find((s) => s.id === activeSessionId) || null,
        [sessions, activeSessionId]
    );

    // Bootstrap: load from localStorage or fetch from API
    useEffect(() => {
        (async () => {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            if (Array.isArray(saved) && saved.length) {
                setSessions(saved);
                setActiveSessionId(saved[0].id);
                return;
            }

            let history = [];
            try {
                const res = await fetch("/api/history");
                if (res.ok) {
                    const data = await res.json();
                    history = Array.isArray(data.messages) ? data.messages : [];
                }
            } catch {
                history = [];
            }

            const session = createSession();
            if (history.length) {
                session.messages = history;
                updateSessionMeta(session);
            }
            setSessions([session]);
            setActiveSessionId(session.id);
        })();
    }, []);

    // Persist to localStorage
    useEffect(() => {
        if (sessions.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        }
    }, [sessions]);

    const handleCreateSession = useCallback(() => {
        const session = createSession();
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        return session;
    }, []);

    const handleRenameSession = useCallback((sessionId) => {
        setSessions((prev) => {
            const target = prev.find((s) => s.id === sessionId);
            if (!target) return prev;
            const nextTitle = window.prompt("请输入新的会话名称", target.title || "新会话");
            if (!nextTitle) return prev;
            return prev.map((s) =>
                s.id === sessionId
                    ? { ...s, title: nextTitle.trim() || s.title || "新会话", updatedAt: Date.now() }
                    : s
            );
        });
    }, []);

    const handleDeleteSession = useCallback((sessionId) => {
        setSessions((prev) => {
            const target = prev.find((s) => s.id === sessionId);
            if (!target) return prev;
            const confirmed = window.confirm(`确认删除会话「${target.title || "新会话"}」？`);
            if (!confirmed) return prev;

            const next = prev.filter((s) => s.id !== sessionId);
            if (!next.length) {
                const newSession = createSession();
                setActiveSessionId(newSession.id);
                return [newSession];
            }
            return next;
        });
        setActiveSessionId((prevId) => {
            if (prevId !== sessionId) return prevId;
            // Will be resolved after setSessions updates
            return null;
        });
    }, []);

    // Fix activeSessionId when it becomes null after deletion
    useEffect(() => {
        if (activeSessionId === null && sessions.length) {
            setActiveSessionId(sessions[0].id);
        }
    }, [activeSessionId, sessions]);

    const handleModelChange = useCallback((model) => {
        setSessions((prev) => prev.map((s) =>
            s.id === activeSessionId
                ? { ...s, model, updatedAt: Date.now() }
                : s
        ));
    }, [activeSessionId]);

    const addMessageToSession = useCallback((sessionId, message) => {
        setSessions((prev) => prev.map((s) => {
            if (s.id !== sessionId) return s;
            const updated = { ...s, messages: [...s.messages, message] };
            updateSessionMeta(updated);
            return updated;
        }));
    }, []);

    const updateMessages = useCallback((sessionId, messages) => {
        setSessions((prev) => prev.map((s) => {
            if (s.id !== sessionId) return s;
            const updated = { ...s, messages };
            updateSessionMeta(updated);
            return updated;
        }));
    }, []);

    return {
        sessions,
        activeSession,
        activeSessionId,
        setActiveSessionId,
        handleCreateSession,
        handleRenameSession,
        handleDeleteSession,
        handleModelChange,
        addMessageToSession,
        updateMessages
    };
}
