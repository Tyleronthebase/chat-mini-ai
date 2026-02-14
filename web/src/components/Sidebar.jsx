import { useMemo, useState } from "react";

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export default function Sidebar({
    sessions,
    activeSessionId,
    isStreaming,
    onSelectSession,
    onCreateSession,
    onRenameSession,
    onDeleteSession,
    searchQuery,
    onSearchChange,
    onOpenSettings
}) {
    const [collapsed, setCollapsed] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const filteredSessions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return sessions
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .filter((session) => {
                if (!query) return true;
                return (
                    session.title.toLowerCase().includes(query)
                    || session.model.toLowerCase().includes(query)
                    || session.messages.some((msg) => String(msg.content || "").toLowerCase().includes(query))
                );
            });
    }, [sessions, searchQuery]);

    return (
        <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
            <div className="sidebar__header">
                <div className="icon-row">
                    <button className="icon-btn" title="展开/收起" onClick={() => setCollapsed((v) => !v)}>☰</button>
                    <button
                        className="icon-btn"
                        title="搜索会话"
                        onClick={() => {
                            if (searchOpen) onSearchChange("");
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
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <button className="ghost-button" onClick={onCreateSession}>✎ 发送新对话</button>
            </div>

            {!collapsed && (
                <>
                    <h3 className="sidebar__title">对话</h3>
                    <nav className="session-list">
                        {filteredSessions.map((session) => (
                            <div
                                key={session.id}
                                className={`session-item${session.id === activeSessionId ? " active" : ""}`}
                                onClick={() => onSelectSession(session.id)}
                            >
                                <div className="session-item__head">
                                    <div className="session-item__title">{session.title}</div>
                                    <div className="session-actions">
                                        <button
                                            className="session-action"
                                            title="重命名"
                                            onClick={(e) => { e.stopPropagation(); onRenameSession(session.id); }}
                                        >
                                            ✎
                                        </button>
                                        <button
                                            className="session-action"
                                            title="删除"
                                            onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
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
                        <button className="sidebar__settings-btn" onClick={onOpenSettings}>
                            <span>⚙️</span>
                            <span>设置和帮助</span>
                        </button>
                    </div>
                </>
            )}
        </aside>
    );
}
