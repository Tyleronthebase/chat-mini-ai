# 迷你聊天AI

一个本地可跑的聊天小项目，前端使用 React + Vite，后端是 Node 原生 HTTP。
默认使用 Mock 回复（不需要 API Key），也支持可选接入 Google 模型；支持聊天记录持久化与流式回复。

## 快速开始

```zsh
npm install
npm run build
npm start
```

你也可以复制 `.env.example` 为 `.env` 并填入自己的配置。

浏览器打开：`http://localhost:5173`

聊天记录会保存在 `data/chat.json`。

## 前端开发（React）

```zsh
npm run dev
```

Vite 开发服务默认地址通常为 `http://localhost:5173`（若端口冲突会自动切换）。

## 可选：接入 Google AI Studio

在 `.env` 中设置：

```bash
GOOGLE_API_KEY=你的KEY
GOOGLE_MODEL=gemini-1.5-flash
USE_REMOTE=1
```

然后运行：

```zsh
npm start
```

如需自定义接口地址，可设置 `GOOGLE_API_BASE`。

生产部署前端静态文件时，使用：

```zsh
npm run build
```

构建产物会输出到 `public/`，由 `server.js` 直接托管。

## 测试

```zsh
npm test
```
