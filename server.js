require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");
const { streamReply } = require("./src/chat");
const { loadMessages, saveMessages, deleteSession } = require("./src/storage");

const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
const PUBLIC_DIR = path.join(__dirname, "public");

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, body) {
  const data = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data)
  });
  res.end(data);
}

const MIME_MAP = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".map": "application/json; charset=utf-8"
};

function sendFile(res, filePath, method = "GET") {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

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

async function handleChat(req, res) {
  let rawBody = "";
  const MAX_BODY = 1024 * 1024; // 1MB limit

  req.on("data", chunk => {
    rawBody += chunk;
    if (Buffer.byteLength(rawBody) > MAX_BODY) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Request body too large" }));
      req.destroy();
    }
  });
  req.on("end", async () => {
    if (res.writableEnded) return;

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });

    try {
      const payload = rawBody ? JSON.parse(rawBody) : {};
      const sessionId = payload.sessionId || null;
      const incoming = Array.isArray(payload.messages) ? payload.messages : [];
      const history = await loadMessages(sessionId);
      const messages = incoming.length ? incoming : history;

      console.log("[Chat API] USE_REMOTE:", process.env.USE_REMOTE);
      console.log("[Chat API] GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY ? "已设置" : "未设置");
      console.log("[Chat API] GOOGLE_MODEL:", process.env.GOOGLE_MODEL || "gemini-2.5-flash");

      const opts = {
        apiKey: process.env.GOOGLE_API_KEY,
        model: process.env.GOOGLE_MODEL || "gemini-2.5-flash",
        useRemote: process.env.USE_REMOTE === "1"
      };

      writeSse(res, "start", { ok: true });

      let fullReply = "";
      for await (const chunk of streamReply(messages, opts)) {
        fullReply += chunk;
        writeSse(res, "chunk", { text: chunk });
      }

      const nextMessages = [...messages, { role: "assistant", content: fullReply || "抱歉，我刚才没听清。" }];
      await saveMessages(sessionId, nextMessages);

      writeSse(res, "done", { ok: true });
      res.end();
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

  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (url.pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      status: "ok",
      uptime: process.uptime(),
      model: process.env.GOOGLE_MODEL || "gemini-2.5-flash",
      hasApiKey: !!process.env.GOOGLE_API_KEY
    });
    return;
  }

  if (url.pathname === "/api/chat" && req.method === "POST") {
    handleChat(req, res);
    return;
  }

  if (url.pathname === "/api/history" && req.method === "GET") {
    const sessionId = url.searchParams.get("sessionId") || null;
    loadMessages(sessionId)
      .then(messages => sendJson(res, 200, { messages }))
      .catch(error => sendJson(res, 500, { error: error.message }));
    return;
  }

  // DELETE /api/session?id=xxx
  if (url.pathname === "/api/session" && req.method === "DELETE") {
    const sessionId = url.searchParams.get("id");
    if (!sessionId) {
      sendJson(res, 400, { error: "Missing session id" });
      return;
    }
    deleteSession(sessionId)
      .then(ok => sendJson(res, ok ? 200 : 404, { ok }))
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
