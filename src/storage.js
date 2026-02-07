const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "chat.json");

async function loadMessages() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

async function saveMessages(messages) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const safe = Array.isArray(messages) ? messages : [];
  await fs.writeFile(DATA_FILE, JSON.stringify(safe, null, 2), "utf-8");
}

module.exports = {
  loadMessages,
  saveMessages
};
