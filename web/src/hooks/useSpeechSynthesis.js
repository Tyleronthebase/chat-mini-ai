import { useState, useRef, useCallback } from "react";

export default function useSpeechSynthesis({ lang = "zh-CN" } = {}) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakingId, setSpeakingId] = useState(null);
    const utteranceRef = useRef(null);

    const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

    const speak = useCallback((text, messageId) => {
        if (!isSupported) return;

        // Stop current speech first
        window.speechSynthesis.cancel();

        // If clicking the same message that's speaking, just stop
        if (speakingId === messageId && isSpeaking) {
            setIsSpeaking(false);
            setSpeakingId(null);
            return;
        }

        // Strip markdown for cleaner TTS
        const clean = text
            .replace(/```[\s\S]*?```/g, "（代码块已跳过）")
            .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
            .replace(/[*_~#>|]/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/\n{2,}/g, "。")
            .trim();

        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to pick a Chinese voice if available
        const voices = window.speechSynthesis.getVoices();
        const zhVoice = voices.find((v) => v.lang.startsWith("zh"));
        if (zhVoice) utterance.voice = zhVoice;

        utterance.onstart = () => {
            setIsSpeaking(true);
            setSpeakingId(messageId);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setSpeakingId(null);
        };

        utterance.onerror = () => {
            setIsSpeaking(false);
            setSpeakingId(null);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [lang, isSupported, speakingId, isSpeaking]);

    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setSpeakingId(null);
    }, []);

    return { isSpeaking, speakingId, isSupported, speak, stop };
}
