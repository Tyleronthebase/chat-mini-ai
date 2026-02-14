import { useState } from "react";
import * as PlatformModule from "react-bits/lib/modules/Platform";
import useSessions from "./hooks/useSessions";
import useChat from "./hooks/useChat";
import useSettings from "./hooks/useSettings";
import Sidebar from "./components/Sidebar";
import ChatPane from "./components/ChatPane";
import Composer from "./components/Composer";
import SettingsModal from "./components/SettingsModal";

function getPlatformName() {
  return PlatformModule?.default?.OS || PlatformModule?.OS || "web";
}

export default function App() {
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    handleCreateSession,
    handleRenameSession,
    handleDeleteSession,
    handleModelChange,
    addMessageToSession,
    clearAllSessions
  } = useSessions();

  const { isStreaming, streamingReply, sendMessage, stopStreaming } = useChat({
    activeSession,
    addMessageToSession
  });

  const { settings, updateSetting, resetSettings } = useSettings();

  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        isStreaming={isStreaming}
        onSelectSession={setActiveSessionId}
        onCreateSession={handleCreateSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="chat-pane">
        <header className="topbar">
          <h1>mini chat</h1>
          <span className="platform-badge">react-bits: {getPlatformName()}</span>
        </header>

        <ChatPane
          activeSession={activeSession}
          isStreaming={isStreaming}
          streamingReply={streamingReply}
          onSendMessage={sendMessage}
        />

        <Composer
          isStreaming={isStreaming}
          model={activeSession?.model || settings.defaultModel}
          onModelChange={handleModelChange}
          onSend={sendMessage}
          onStop={stopStreaming}
          sendOnEnter={settings.sendOnEnter}
        />
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSetting={updateSetting}
        onResetSettings={resetSettings}
        onClearAll={() => {
          if (window.confirm("确认清除所有对话？此操作不可撤销。")) {
            clearAllSessions();
            setSettingsOpen(false);
          }
        }}
      />
    </div>
  );
}
