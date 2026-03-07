import { useState, useRef, useCallback } from "react";

const SpeechRecognition = typeof window !== "undefined"
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

export default function useSpeechRecognition({ lang = "zh-CN" } = {}) {
    const [isListening, setIsListening] = useState(false);
    const [interim, setInterim] = useState("");
    const recognitionRef = useRef(null);
    const callbackRef = useRef(null);

    const isSupported = !!SpeechRecognition;

    const start = useCallback((onResult) => {
        if (!SpeechRecognition) return;
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }

        callbackRef.current = onResult;

        const recognition = new SpeechRecognition();
        recognition.lang = lang;
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event) => {
            let finalText = "";
            let interimText = "";

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interimText += result[0].transcript;
                }
            }

            setInterim(interimText);

            if (finalText && callbackRef.current) {
                callbackRef.current(finalText);
            }
        };

        recognition.onerror = (event) => {
            console.warn("[SpeechRecognition] error:", event.error);
            if (event.error !== "aborted") {
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterim("");
            recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [lang]);

    const stop = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    }, []);

    return { isListening, isSupported, interim, start, stop };
}
