import { useState } from "react";
import * as PlatformModule from "react-bits/lib/modules/Platform";
import useSessions from "./hooks/useSessions";
import useChat from "./hooks/useChat";
import Sidebar from "./components/Sidebar";
import ChatPane from "./components/ChatPane";
import Composer from "./components/Composer";

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
    addMessageToSession
  } = useSessions();

  const { isStreaming, streamingReply, sendMessage, stopStreaming } = useChat({
    activeSession,
    addMessageToSession
  });

  const [searchQuery, setSearchQuery] = useState("");

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
          model={activeSession?.model || "gemini-2.5-flash"}
          onModelChange={handleModelChange}
          onSend={sendMessage}
          onStop={stopStreaming}
        />
      </main>
    </div>
  );
}
