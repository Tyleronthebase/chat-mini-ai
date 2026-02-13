require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");
const { generateReply } = require("./src/chat");
const { loadMessages, saveMessages } = require("./src/storage");

const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
const PUBLIC_DIR = path.join(__dirname, "public");

function sendJson(res, statusCode, body) {
  const data = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data)
  });
  res.end(data);
}

function sendFile(res, filePath, method = "GET") {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === ".html"
    ? "text/html; charset=utf-8"
    : ext === ".js"
      ? "text/javascript; charset=utf-8"
      : ext === ".css"
        ? "text/css; charset=utf-8"
        : "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": Buffer.byteLength(data)
    });
    if (method === "HEAD") {
      res.end();
      return;
    }
    res.end(data);
  });
}

function writeSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function streamText(res, text, onDone) {
  const chunkSize = 12;
  let index = 0;
  const timer = setInterval(() => {
    const chunk = text.slice(index, index + chunkSize);
    if (!chunk) {
      clearInterval(timer);
      onDone();
      return;
    }
    index += chunkSize;
    writeSse(res, "chunk", { text: chunk });
  }, 40);
}

async function handleChat(req, res) {
  let rawBody = "";
  req.on("data", chunk => {
    rawBody += chunk;
  });
  req.on("end", async () => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });

    try {
      const payload = rawBody ? JSON.parse(rawBody) : {};
      const incoming = Array.isArray(payload.messages) ? payload.messages : [];
      const history = await loadMessages();
      const messages = incoming.length ? incoming : history;
      
      console.log("[Chat API] USE_REMOTE:", process.env.USE_REMOTE);
      console.log("[Chat API] GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY ? "已设置" : "未设置");
      console.log("[Chat API] GOOGLE_MODEL:", process.env.GOOGLE_MODEL || "gemini-1.5-flash");
      
      const reply = await generateReply(messages, {
        apiKey: process.env.GOOGLE_API_KEY,
        endpoint: process.env.GOOGLE_API_BASE
          || `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GOOGLE_MODEL || "gemini-1.5-flash"}:generateContent?key=${process.env.GOOGLE_API_KEY || ""}`,
        model: process.env.GOOGLE_MODEL || "gemini-1.5-flash",
        useRemote: process.env.USE_REMOTE === "1"
      });
      const nextMessages = [...messages, { role: "assistant", content: reply }];
      await saveMessages(nextMessages);
      writeSse(res, "start", { ok: true });
      streamText(res, reply, () => {
        writeSse(res, "done", { ok: true });
        res.end();
      });
    } catch (error) {
      console.error("[Chat API] Error:", error.message);
      console.error("[Chat API] Stack:", error.stack);
      writeSse(res, "error", { message: error.message || "Invalid request" });
      res.end();
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/chat" && req.method === "POST") {
    handleChat(req, res);
    return;
  }

  if (url.pathname === "/api/history" && req.method === "GET") {
    loadMessages()
      .then(messages => sendJson(res, 200, { messages }))
      .catch(error => sendJson(res, 500, { error: error.message }));
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  const filePath = url.pathname === "/"
    ? path.join(PUBLIC_DIR, "index.html")
    : path.join(PUBLIC_DIR, url.pathname);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  sendFile(res, filePath, req.method);
});

server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
