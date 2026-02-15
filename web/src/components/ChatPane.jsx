import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MessageActions from "./MessageActions";

const QUICK_PROMPTS = [
    "帮我做一份今天的待办安排",
    "教我快速上手这个项目",
    "随便聊点有趣的话题"
];

function UserImages({ images }) {
    if (!images || images.length === 0) return null;
    return (
        <div className="bubble__images">
            {images.map((img, i) => (
                <img key={i} src={img} alt={`上传图片 ${i + 1}`} className="bubble__image" />
            ))}
        </div>
    );
}

export default function ChatPane({
    activeSession,
    isStreaming,
    streamingReply,
    onSendMessage
}) {
    const chatRef = useRef(null);
    const messages = activeSession?.messages || [];
    const hasMessages = messages.length > 0;

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages, streamingReply]);

    return (
        <>
            {!hasMessages && (
                <section className="empty-state">
                    <div className="empty-state__hello">你好</div>
                    <h2>需要我为你做些什么？</h2>
                    <div className="quick-prompts">
                        {QUICK_PROMPTS.map((prompt) => (
                            <button
                                key={prompt}
                                className="quick-chip"
                                onClick={() => { if (!isStreaming) onSendMessage(prompt); }}
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {hasMessages && (
                <section ref={chatRef} className="chat">
                    {messages.map((message, index) => (
                        <div key={message.id || `${message.role}-${index}`} className={`bubble bubble--${message.role}`}>
                            {message.role === "user" && message.images && (
                                <UserImages images={message.images} />
                            )}
                            {message.role === "assistant" ? (
                                <>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                                    <MessageActions content={message.content} messageId={message.id} />
                                </>
                            ) : (
                                message.content
                            )}
                        </div>
                    ))}
                    {isStreaming && streamingReply && (
                        <div className="bubble bubble--assistant">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingReply}</ReactMarkdown>
                        </div>
                    )}
                    {isStreaming && !streamingReply && (
                        <div className="bubble bubble--assistant">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </>
    );
}
