import { useCallback, useEffect, useState } from "react";

const SETTINGS_KEY = "chat-mini-settings";

const DEFAULTS = {
    theme: "light",
    defaultModel: "gemini-2.5-flash",
    systemPrompt: "",
    sendOnEnter: true,
    fontSize: "medium"
};

export default function useSettings() {
    const [settings, setSettings] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
            return { ...DEFAULTS, ...saved };
        } catch {
            return { ...DEFAULTS };
        }
    });

    // Persist
    useEffect(() => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }, [settings]);

    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", settings.theme);
    }, [settings.theme]);

    // Apply font size
    useEffect(() => {
        const sizes = { small: "14px", medium: "15px", large: "17px" };
        document.documentElement.style.setProperty("--chat-font-size", sizes[settings.fontSize] || "15px");
    }, [settings.fontSize]);

    const updateSetting = useCallback((key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    }, []);

    const resetSettings = useCallback(() => {
        setSettings({ ...DEFAULTS });
    }, []);

    return { settings, updateSetting, resetSettings };
}
