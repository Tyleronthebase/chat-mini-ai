import { useState } from "react";

const TABS = [
    { id: "general", icon: "⚙️", label: "通用" },
    { id: "shortcuts", icon: "⌨️", label: "快捷键" },
    { id: "about", icon: "ℹ️", label: "关于" }
];

const SHORTCUTS = [
    { keys: "Enter", desc: "发送消息" },
    { keys: "Shift + Enter", desc: "换行" },
    { keys: "Esc", desc: "停止生成" }
];

export default function SettingsModal({
    open,
    onClose,
    settings,
    onUpdateSetting,
    onResetSettings,
    onClearAll
}) {
    const [activeTab, setActiveTab] = useState("general");

    if (!open) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal__header">
                    <h2 className="modal__title">设置</h2>
                    <button className="modal__close" onClick={onClose}>✕</button>
                </div>

                {/* Tab Bar */}
                <div className="modal__tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`modal__tab${activeTab === tab.id ? " active" : ""}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="modal__tab-icon">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="modal__body">
                    {activeTab === "general" && (
                        <div className="settings-section">
                            {/* Theme */}
                            <div className="setting-row">
                                <div className="setting-info">
                                    <div className="setting-label">主题</div>
                                    <div className="setting-desc">选择应用的外观主题</div>
                                </div>
                                <div className="setting-control">
                                    <div className="theme-switcher">
                                        {[
                                            { value: "light", icon: "☀️", label: "浅色" },
                                            { value: "dark", icon: "🌙", label: "深色" }
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                className={`theme-option${settings.theme === opt.value ? " active" : ""}`}
                                                onClick={() => onUpdateSetting("theme", opt.value)}
                                            >
                                                <span>{opt.icon}</span>
                                                <span>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Default Model */}
                            <div className="setting-row">
                                <div className="setting-info">
                                    <div className="setting-label">默认模型</div>
                                    <div className="setting-desc">新会话使用的 AI 模型</div>
                                </div>
                                <div className="setting-control">
                                    <select
                                        className="setting-select"
                                        value={settings.defaultModel}
                                        onChange={(e) => onUpdateSetting("defaultModel", e.target.value)}
                                    >
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                    </select>
                                </div>
                            </div>

                            {/* Font Size */}
                            <div className="setting-row">
                                <div className="setting-info">
                                    <div className="setting-label">字体大小</div>
                                    <div className="setting-desc">聊天消息的字体大小</div>
                                </div>
                                <div className="setting-control">
                                    <select
                                        className="setting-select"
                                        value={settings.fontSize}
                                        onChange={(e) => onUpdateSetting("fontSize", e.target.value)}
                                    >
                                        <option value="small">小</option>
                                        <option value="medium">中（默认）</option>
                                        <option value="large">大</option>
                                    </select>
                                </div>
                            </div>

                            {/* Send on Enter */}
                            <div className="setting-row">
                                <div className="setting-info">
                                    <div className="setting-label">回车发送</div>
                                    <div className="setting-desc">按 Enter 直接发送消息</div>
                                </div>
                                <div className="setting-control">
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.sendOnEnter}
                                            onChange={(e) => onUpdateSetting("sendOnEnter", e.target.checked)}
                                        />
                                        <span className="toggle__slider"></span>
                                    </label>
                                </div>
                            </div>

                            {/* System Prompt */}
                            <div className="setting-row setting-row--vertical">
                                <div className="setting-info">
                                    <div className="setting-label">系统提示词</div>
                                    <div className="setting-desc">自定义 AI 的行为和角色设定，留空使用默认</div>
                                </div>
                                <textarea
                                    className="setting-textarea"
                                    rows={4}
                                    placeholder="例如：你是一个友善的助手，擅长用简洁的中文回答问题..."
                                    value={settings.systemPrompt}
                                    onChange={(e) => onUpdateSetting("systemPrompt", e.target.value)}
                                />
                            </div>

                            {/* Divider */}
                            <div className="setting-divider" />

                            {/* Danger Zone */}
                            <div className="setting-row">
                                <div className="setting-info">
                                    <div className="setting-label setting-label--danger">清除所有对话</div>
                                    <div className="setting-desc">删除本地保存的所有会话数据，此操作不可撤销</div>
                                </div>
                                <div className="setting-control">
                                    <button className="danger-button" onClick={onClearAll}>清除</button>
                                </div>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <div className="setting-label">恢复默认设置</div>
                                    <div className="setting-desc">将所有设置恢复为默认值</div>
                                </div>
                                <div className="setting-control">
                                    <button className="ghost-button ghost-button--sm" onClick={onResetSettings}>重置</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "shortcuts" && (
                        <div className="settings-section">
                            <div className="shortcuts-list">
                                {SHORTCUTS.map((s) => (
                                    <div key={s.keys} className="shortcut-row">
                                        <span className="shortcut-desc">{s.desc}</span>
                                        <div className="shortcut-keys">
                                            {s.keys.split(" + ").map((k) => (
                                                <kbd key={k} className="kbd">{k}</kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="shortcuts-tip">
                                💡 更多快捷键将在后续版本中添加
                            </div>
                        </div>
                    )}

                    {activeTab === "about" && (
                        <div className="settings-section about-section">
                            <div className="about-hero">
                                <div className="about-icon">💬</div>
                                <h3 className="about-name">Mini Chat AI</h3>
                                <div className="about-version">v0.1.0</div>
                            </div>

                            <div className="about-desc">
                                一个轻量级 AI 聊天应用，基于 React + Node.js 构建，
                                使用 Google Gemini API 提供智能对话能力。
                            </div>

                            <div className="about-stack">
                                <div className="about-stack__title">技术栈</div>
                                <div className="about-badges">
                                    {["React 18", "Vite", "Node.js", "Gemini API", "SSE Streaming"].map((t) => (
                                        <span key={t} className="about-badge">{t}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="about-links">
                                <a href="https://github.com/Tyleronthebase/chat-mini-ai" target="_blank" rel="noopener noreferrer" className="about-link">
                                    📦 GitHub 仓库
                                </a>
                                <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="about-link">
                                    🤖 Google AI Studio
                                </a>
                            </div>

                            <div className="about-footer">
                                Made with ❤️ by Tyler
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
