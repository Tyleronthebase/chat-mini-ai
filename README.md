# Chat Mini AI

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-Ready-646CFF?logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-HTTP-339933?logo=node.js)
![Gemini](https://img.shields.io/badge/Google-Gemini-8E75B2?logo=google-gemini)

一个基于 **React** + **Node.js** 的全栈极简聊天应用。摒弃复杂的后端框架，回归原生 HTTP 手撸 API，配合现代化的 React 前端，打造轻量级 AI 对话体验。

---

## ✨ 功能亮点

- 💬 **流畅对话**：基于 Server-Sent Events (SSE) 的打字机流式回复体验。
- 🤖 **智能模型**：默认集成 **Google Gemini 2.5 Flash**，极速响应。
- 💾 **双端持久化**：服务端 JSON 文件存储 + 客户端 LocalStorage 同步。
- 🛠️ **会话管理**：支持多会话创建、搜索、重命名及删除。
- ⚡ **零依赖后端**：Node.js 后端不依赖 Express / Koa，仅使用原生 `http` 模块。

## 🛠 技术栈

### Frontend
- **Framework**: [React 18](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI/Effects**: [react-bits](https://github.com/DavidHDev/react-bits) (提供部分动效组件支持)
- **Styling**: Pure CSS (Minimalist design)

### Backend
- **Runtime**: Node.js
- **API**: Native `http` module
- **Streaming**: Server-Sent Events (SSE)
- **Database**: Native File System (JSON)

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的 Google API Key：

```bash
cp .env.example .env
```

配置项：
```dotenv
GOOGLE_API_KEY=your_api_key_here
USE_REMOTE=1
GOOGLE_MODEL=gemini-2.5-flash  # 默认使用 2.5 Flash
PORT=5173
```

### 3. 开发与运行

**开发模式（推荐）：**
```bash
# 终端 1：启动 Vite 前端热更新
npm run dev

# 终端 2：启动后端服务
npm start
```

**生产部署：**
```bash
# 构建前端资源到 public/ 目录
npm run build

# 启动全栈服务
npm start
```

访问地址：`http://localhost:5173`

## 📂 项目结构

```text
.
├── web/                    # React 前端源文件 (Vite Root)
│   ├── src/                # 组件与逻辑 (App.jsx)
│   └── index.html          # 入口 HTML
├── public/                 # 构建产物 (由 server.js 托管)
├── src/                    # 后端逻辑
│   ├── chat.js             # Gemini 模型调用封装
│   └── storage.js          # 本地 JSON 数据读写
├── data/                   # 数据存储目录
├── server.js               # Node.js 原生 HTTP服务器
└── vite.config.mjs         # Vite 构建配置
```

## ❤️ 致谢 (Credits)

本项目参考或使用了以下优秀的开源技术与资源：

- **[React](https://react.dev/)** - 用于构建用户界面的 JavaScript 库
- **[Vite](https://vitejs.dev/)** - 下一代前端构建工具
- **[Google Gemini](https://ai.google.dev/)** - 提供强大的生成式 AI 模型支持
- **[react-bits](https://github.com/DavidHDev/react-bits)** - 提供精美的 React UI 动效组件库
- **[Node.js](https://nodejs.org/)** - JavaScript 运行时

---

Designed with ❤️ by Tyler
