import { useState, useRef } from "react";

function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

export default function Composer({
    isStreaming,
    model,
    onModelChange,
    onSend,
    onStop,
    sendOnEnter = true
}) {
    const [text, setText] = useState("");
    const [images, setImages] = useState([]); // array of { file, dataUrl }
    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    async function addFiles(files) {
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
        const newImages = await Promise.all(
            imageFiles.map(async (file) => ({
                file,
                dataUrl: await readFileAsDataURL(file)
            }))
        );
        setImages((prev) => [...prev, ...newImages].slice(0, 4)); // max 4 images
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
        <form className="composer" onSubmit={handleSubmit}>
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

            <div
                className={`composer__input-row${dragOver ? " drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
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

            <div className="composer__actions">
                <div className="composer__state">{isStreaming ? "正在生成回复..." : images.length > 0 ? `已选择 ${images.length} 张图片` : "等待输入"}</div>
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
