import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Connection status levels:
 * - "online"    → Browser online + backend reachable
 * - "degraded"  → Browser online but backend unreachable or API key missing
 * - "offline"   → Browser reports navigator.onLine = false
 * - "streaming" → Currently streaming an AI response
 * - "error"     → Last chat request failed
 */

const CHECK_INTERVAL = 30_000; // 30s

export default function useConnectionStatus({ isStreaming, lastError }) {
    const [backendOk, setBackendOk] = useState(true);
    const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
    const [serverInfo, setServerInfo] = useState(null);
    const timerRef = useRef(null);

    const checkHealth = useCallback(async () => {
        try {
            const res = await fetch("/api/health", { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
                const data = await res.json();
                setServerInfo(data);
                setBackendOk(true);
            } else {
                setBackendOk(false);
            }
        } catch {
            setBackendOk(false);
        }
    }, []);

    // Browser online/offline events
    useEffect(() => {
        const onOnline = () => setBrowserOnline(true);
        const onOffline = () => setBrowserOnline(false);
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
        };
    }, []);

    // Periodic health check
    useEffect(() => {
        checkHealth();
        timerRef.current = setInterval(checkHealth, CHECK_INTERVAL);
        return () => clearInterval(timerRef.current);
    }, [checkHealth]);

    // Re-check when coming back online
    useEffect(() => {
        if (browserOnline) checkHealth();
    }, [browserOnline, checkHealth]);

    // Derive status
    let status, label, color;

    if (!browserOnline) {
        status = "offline";
        label = "离线";
        color = "#9aa0a6";
    } else if (isStreaming) {
        status = "streaming";
        label = "生成中";
        color = "#1a73e8";
    } else if (lastError) {
        status = "error";
        label = "请求失败";
        color = "#d93025";
    } else if (!backendOk) {
        status = "degraded";
        label = "服务不可用";
        color = "#ea8600";
    } else if (serverInfo && !serverInfo.hasApiKey) {
        status = "degraded";
        label = "缺少 API Key";
        color = "#ea8600";
    } else {
        status = "online";
        label = "就绪";
        color = "#0d904f";
    }

    return { status, label, color, serverInfo, checkHealth };
}
