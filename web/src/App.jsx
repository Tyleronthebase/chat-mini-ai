import { useEffect, useMemo, useRef, useState } from "react";
import * as PlatformModule from "react-bits/lib/modules/Platform";

const STORAGE_KEY = "chat-mini-sessions";

function getPlatformName() {
  return PlatformModule?.default?.OS || PlatformModule?.OS || "web";
}

function createSession() {
  return {
    id: crypto.randomUUID(),
    title: "新会话",
    model: "gemini-2.5-flash",
    messages: [],
    updatedAt: Date.now()
  };
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function updateSessionMeta(session) {
  if (!session.title || session.title === "新会话") {
    const firstUser = session.messages.find((message) => message.role === "user");
    session.title = firstUser ? firstUser.content.slice(0, 20) : "新会话";
  }
  session.updatedAt = Date.now();
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
      } catch {
        payload = null;
      }

      onEvent(event, payload);
    }
  }
}

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [streamingReply, setStreamingReply] = useState("");
  const abortRef = useRef(null);
  const chatRef = useRef(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sessions
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((session) => {
        if (!query) {
          return true;
        }
        return (
          session.title.toLowerCase().includes(query)
          || session.model.toLowerCase().includes(query)
          || session.messages.some((message) => String(message.content || "").toLowerCase().includes(query))
        );
      });
  }, [sessions, searchQuery]);

  useEffect(() => {
    const bootstrap = async () => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved) && saved.length) {
        setSessions(saved);
        setActiveSessionId(saved[0].id);
        return;
      }

      let history = [];
      try {
        const response = await fetch("/api/history");
        if (response.ok) {
          const data = await response.json();
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
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (sessions.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (!chatRef.current) {
      return;
    }
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [activeSession?.messages, streamingReply]);

  const hasMessages = Boolean(activeSession?.messages?.length);

  function handleCreateSession() {
    const session = createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setComposerText("");
    setStreamingReply("");
  }

  function handleRenameSession(sessionId) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) {
      return;
    }
    const nextTitle = window.prompt("请输入新的会话名称", session.title || "新会话");
    if (!nextTitle) {
      return;
    }
    setSessions((prev) => prev.map((item) => {
      if (item.id !== sessionId) {
        return item;
      }
      return {
        ...item,
        title: nextTitle.trim() || item.title || "新会话",
        updatedAt: Date.now()
      };
    }));
  }

  function handleDeleteSession(sessionId) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) {
      return;
    }
    const confirmed = window.confirm(`确认删除会话「${session.title || "新会话"}」？`);
    if (!confirmed) {
      return;
    }

    const next = sessions.filter((item) => item.id !== sessionId);
    if (!next.length) {
      const newSession = createSession();
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      return;
    }

    setSessions(next);
    if (activeSessionId === sessionId) {
      setActiveSessionId(next[0].id);
    }
  }

  function handleModelChange(event) {
    const value = event.target.value;
    setSessions((prev) => prev.map((item) => {
      if (item.id !== activeSessionId) {
        return item;
      }
      return {
        ...item,
        model: value,
        updatedAt: Date.now()
      };
    }));
  }

  async function handleSendMessage(text) {
    if (!activeSession) {
      return;
    }

    const userMessage = { role: "user", content: text };
    const nextSession = {
      ...activeSession,
      messages: [...activeSession.messages, userMessage]
    };
    updateSessionMeta(nextSession);

    const nextSessions = sessions.map((item) => (item.id === nextSession.id ? nextSession : item));
    setSessions(nextSessions);
    setComposerText("");
    setIsStreaming(true);
    setStreamingReply("");

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextSession.messages }),
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

      const assistantMessage = { role: "assistant", content: reply || "服务异常，请稍后再试。" };
      setSessions((prev) => prev.map((item) => {
        if (item.id !== nextSession.id) {
          return item;
        }
        const updated = {
          ...item,
          messages: [...item.messages, assistantMessage]
        };
        updateSessionMeta(updated);
        return updated;
      }));
    } catch {
      const failMessage = { role: "assistant", content: "生成已停止。" };
      setSessions((prev) => prev.map((item) => {
        if (item.id !== nextSession.id) {
          return item;
        }
        const updated = {
          ...item,
          messages: [...item.messages, failMessage]
        };
        updateSessionMeta(updated);
        return updated;
      }));
    } finally {
      setIsStreaming(false);
      setStreamingReply("");
      abortRef.current = null;
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const text = composerText.trim();
    if (!text || isStreaming) {
      return;
    }
    handleSendMessage(text);
  }

  function handleStop() {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }

  const quickPrompts = [
    "帮我做一份今天的待办安排",
    "教我快速上手这个项目",
    "随便聊点有趣的话题"
  ];

  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar__header">
          <div className="icon-row">
            <button className="icon-btn" title="展开/收起" onClick={() => setSidebarCollapsed((v) => !v)}>☰</button>
            <button
              className="icon-btn"
              title="搜索会话"
              onClick={() => {
                if (searchOpen) {
                  setSearchQuery("");
                }
                setSearchOpen((v) => !v);
              }}
            >
              ⌕
            </button>
          </div>

          <div className={`search-wrap${searchOpen ? " active" : ""}`}>
            <input
              className="search-input"
              placeholder="搜索会话"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <button className="ghost-button" onClick={handleCreateSession}>✎ 发送新对话</button>
        </div>

        <h3 className="sidebar__title">对话</h3>
        <nav className="session-list">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`session-item${session.id === activeSessionId ? " active" : ""}`}
              onClick={() => setActiveSessionId(session.id)}
            >
              <div className="session-item__head">
                <div className="session-item__title">{session.title}</div>
                <div className="session-actions">
                  <button
                    className="session-action"
                    title="重命名"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRenameSession(session.id);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    className="session-action"
                    title="删除"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
              <div className="session-item__meta">{session.model} · {formatTime(session.updatedAt)}</div>
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="status-pill">{isStreaming ? "生成中" : "就绪"}</div>
          <span className="sidebar__hint">设置和帮助</span>
        </div>
      </aside>

      <main className="chat-pane">
        <header className="topbar">
          <h1>mini chat</h1>
          <span className="platform-badge">react-bits: {getPlatformName()}</span>
        </header>

        {!hasMessages && (
          <section className="empty-state">
            <div className="empty-state__hello">你好</div>
            <h2>需要我为你做些什么？</h2>
            <div className="quick-prompts">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="quick-chip"
                  onClick={() => {
                    if (isStreaming) {
                      return;
                    }
                    setComposerText(prompt);
                    handleSendMessage(prompt);
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        )}

        {hasMessages && (
          <section ref={chatRef} className="chat">
            {activeSession.messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`bubble bubble--${message.role}`}>
                {message.content}
              </div>
            ))}
            {isStreaming && (
              <div className="bubble bubble--assistant">{streamingReply}</div>
            )}
          </section>
        )}

        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            name="message"
            rows={2}
            placeholder="输入消息，回车发送，Shift+Enter换行"
            value={composerText}
            disabled={isStreaming}
            onChange={(event) => setComposerText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />

          <div className="composer__actions">
            <div className="composer__state">{isStreaming ? "正在生成回复..." : "等待输入"}</div>
            <div className="toolbar">
              <label className="select-field model-picker">
                <select value={activeSession?.model || "gemini-2.5-flash"} onChange={handleModelChange}>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                </select>
              </label>
              <button type="button" className="ghost-button" disabled={!isStreaming} onClick={handleStop}>
                停止生成
              </button>
              <button type="submit" className="primary-button" disabled={isStreaming}>发送</button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
