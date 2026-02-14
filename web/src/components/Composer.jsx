import { useState } from "react";

export default function Composer({
    isStreaming,
    model,
    onModelChange,
    onSend,
    onStop
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
                placeholder="输入消息，回车发送，Shift+Enter换行"
                value={text}
                disabled={isStreaming}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
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
