import { useState } from "react";

export default function Composer({
    isStreaming,
    model,
    onModelChange,
    onSend,
    onStop,
    sendOnEnter = true
}) {
    const [text, setText] = useState("");

    function handleSubmit(event) {
        event.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || isStreaming) return;
        onSend(trimmed);
        setText("");
    }

    return (
        <form className="composer" onSubmit={handleSubmit}>
            <textarea
                name="message"
                rows={2}
                placeholder={sendOnEnter ? "输入消息，回车发送，Shift+Enter换行" : "输入消息，点击发送按钮"}
                value={text}
                disabled={isStreaming}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                    if (sendOnEnter && e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                    }
                }}
            />

            <div className="composer__actions">
                <div className="composer__state">{isStreaming ? "正在生成回复..." : "等待输入"}</div>
                <div className="toolbar">
                    <label className="select-field model-picker">
                        <select value={model} onChange={(e) => onModelChange(e.target.value)}>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        </select>
                    </label>
                    <button type="button" className="ghost-button" disabled={!isStreaming} onClick={onStop}>
                        停止生成
                    </button>
                    <button type="submit" className="primary-button" disabled={isStreaming}>发送</button>
                </div>
            </div>
        </form>
    );
}
