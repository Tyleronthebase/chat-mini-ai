const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function getFilePath(sessionId) {
  if (!sessionId || typeof sessionId !== "string") {
    return path.join(DATA_DIR, "chat.json");
  }
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(DATA_DIR, `${safe}.json`);
}

async function loadMessages(sessionId) {
  try {
    const raw = await fs.readFile(getFilePath(sessionId), "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

async function saveMessages(sessionId, messages) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const safe = Array.isArray(messages) ? messages : [];
  await fs.writeFile(getFilePath(sessionId), JSON.stringify(safe, null, 2), "utf-8");
}

async function deleteSession(sessionId) {
  try {
    await fs.unlink(getFilePath(sessionId));
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  loadMessages,
  saveMessages,
  deleteSession
};
