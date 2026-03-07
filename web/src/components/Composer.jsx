import { useState, useRef, useCallback } from "react";

function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

// Keywords that trigger auto-send via voice
const SEND_KEYWORDS = ["发送", "send", "发送消息"];

export default function Composer({
    isStreaming,
    model,
    onModelChange,
    onSend,
    onStop,
    sendOnEnter = true,
    speechRecognition
}) {
    const [text, setText] = useState("");
    const [images, setImages] = useState([]);
    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const formRef = useRef(null);

    const sr = speechRecognition || {};

    // Voice-to-send: check if final text ends with a send keyword
    const handleVoiceResult = useCallback((finalText) => {
        const trimmed = finalText.trim();
        const lower = trimmed.toLowerCase();

        // Check if the text ends with a send command
        for (const keyword of SEND_KEYWORDS) {
            if (lower.endsWith(keyword)) {
                // Strip the keyword from the text
                const content = trimmed.slice(0, trimmed.length - keyword.length).trim();
                if (content) {
                    // Set text and trigger send
                    setText("");
                    sr.stop?.();
                    onSend(content, images.map((img) => img.dataUrl));
                    setImages([]);
                    return;
                }
            }
        }

        // Normal: just append text
        setText((prev) => prev + finalText);
    }, [onSend, images, sr]);

    async function addFiles(files) {
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
        const newImages = await Promise.all(
            imageFiles.map(async (file) => ({
                file,
                dataUrl: await readFileAsDataURL(file)
            }))
        );
        setImages((prev) => [...prev, ...newImages].slice(0, 4));
    }

    function removeImage(index) {
        setImages((prev) => prev.filter((_, i) => i !== index));
    }

    function handleSubmit(event) {
        event.preventDefault();
        const trimmed = text.trim();
        if ((!trimmed && images.length === 0) || isStreaming) return;
        onSend(trimmed, images.map((img) => img.dataUrl));
        setText("");
        setImages([]);
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    }

    return (
        <form className="composer" ref={formRef} onSubmit={handleSubmit}>
            {/* Image previews */}
            {images.length > 0 && (
                <div className="composer__previews">
                    {images.map((img, i) => (
                        <div key={i} className="composer__preview">
                            <img src={img.dataUrl} alt={`预览 ${i + 1}`} />
                            <button
                                type="button"
                                className="composer__preview-remove"
                                onClick={() => removeImage(i)}
                            >✕</button>
                        </div>
                    ))}
                </div>
            )}

            {sr.isListening ? (
                /* Google-style voice wave overlay */
                <div className="voice-wave-overlay" onClick={() => sr.stop()}>
                    <div className="voice-wave">
                        <span className="voice-wave__bar" style={{ background: "#4285F4" }} />
                        <span className="voice-wave__bar" style={{ background: "#EA4335" }} />
                        <span className="voice-wave__bar" style={{ background: "#FBBC05" }} />
                        <span className="voice-wave__bar" style={{ background: "#34A853" }} />
                    </div>
                    <div className="voice-wave__hint">
                        {sr.interim || "请说话... 说「发送」自动发送"}
                    </div>
                </div>
            ) : (
                <div
                    className={`composer__input-row${dragOver ? " drag-over" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                >
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
                </div>
            )}

            <div className="composer__actions">
                <div className="composer__left-actions">
                    {/* Attach button */}
                    <button
                        type="button"
                        className="composer__attach"
                        onClick={() => fileInputRef.current?.click()}
                        title="添加图片"
                        disabled={isStreaming}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="M8 12h8" />
                        </svg>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                    />
                </div>

                <div className="toolbar">
                    <label className="select-field model-picker">
                        <select value={model} onChange={(e) => onModelChange(e.target.value)}>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        </select>
                    </label>

                    {/* Mic button — in toolbar like Gemini */}
                    {sr.isSupported && (
                        <button
                            type="button"
                            className={`composer__mic${sr.isListening ? " listening" : ""}`}
                            onClick={() => {
                                if (sr.isListening) {
                                    sr.stop();
                                } else {
                                    sr.start(handleVoiceResult);
                                }
                            }}
                            title={sr.isListening ? "停止录音" : "语音输入（说「发送」自动发送）"}
                            disabled={isStreaming}
                        >
                            {sr.isListening ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="6" width="12" height="12" rx="2" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" x2="12" y1="19" y2="22" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}
