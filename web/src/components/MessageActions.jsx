import { useState, useRef, useEffect } from "react";

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function MessageActions({ content, messageId }) {
    const [reaction, setReaction] = useState(null); // "like" | "dislike" | null
    const [copied, setCopied] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [menuOpen]);

    function handleCopy() {
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    function handleReaction(type) {
        setReaction((prev) => (prev === type ? null : type));
    }

    function handleExportMd() {
        const timestamp = new Date().toISOString().slice(0, 10);
        downloadFile(content, `chat-reply-${timestamp}.md`);
        setMenuOpen(false);
    }

    function handleExportTxt() {
        // Strip markdown
        const plain = content
            .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, "").trim())
            .replace(/[*_~`#>]/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
        const timestamp = new Date().toISOString().slice(0, 10);
        downloadFile(plain, `chat-reply-${timestamp}.txt`);
        setMenuOpen(false);
    }

    function handleShare() {
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
        setMenuOpen(false);
    }

    return (
        <div className="message-actions">
            <button
                className={`msg-action-btn${reaction === "like" ? " active" : ""}`}
                onClick={() => handleReaction("like")}
                title="有帮助"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                </svg>
            </button>

            <button
                className={`msg-action-btn${reaction === "dislike" ? " active" : ""}`}
                onClick={() => handleReaction("dislike")}
                title="无帮助"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
                </svg>
            </button>

            <button
                className={`msg-action-btn${copied ? " active" : ""}`}
                onClick={handleCopy}
                title={copied ? "已复制" : "复制"}
            >
                {copied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                )}
            </button>

            <div className="msg-more-wrapper" ref={menuRef}>
                <button
                    className={`msg-action-btn${menuOpen ? " active" : ""}`}
                    onClick={() => setMenuOpen((v) => !v)}
                    title="更多"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                    </svg>
                </button>

                {menuOpen && (
                    <div className="msg-more-menu">
                        <button onClick={handleExportMd}>
                            <span>📄</span> 导出 Markdown
                        </button>
                        <button onClick={handleExportTxt}>
                            <span>📝</span> 导出纯文本
                        </button>
                        <button onClick={handleShare}>
                            <span>📋</span> 复制全文
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
