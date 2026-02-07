const http = require("http");
const fs = require("fs");
const path = require("path");
const { generateReply } = require("./src/chat");

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

function sendFile(res, filePath) {
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
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

async function handleChat(req, res) {
  let rawBody = "";
  req.on("data", chunk => {
    rawBody += chunk;
  });
  req.on("end", async () => {
    try {
      const payload = rawBody ? JSON.parse(rawBody) : {};
      const messages = Array.isArray(payload.messages) ? payload.messages : [];
      const reply = await generateReply(messages, {
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: process.env.OPENAI_API_BASE || "https://api.openai.com/v1/chat/completions",
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        useRemote: process.env.USE_REMOTE === "1"
      });
      sendJson(res, 200, { reply });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid request", detail: error.message });
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/chat" && req.method === "POST") {
    handleChat(req, res);
    return;
  }

  if (req.method !== "GET") {
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

  sendFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
