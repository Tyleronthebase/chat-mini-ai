# chat-mini-ai

一个基于 **React** + **Node.js** 的全栈极简聊天应用。

- **前端**：`React 18` + `Vite` 构建
- **后端**：`Node.js` 原生 `http` 模块 (无 Express/Koa 依赖)
- **核心**：会话管理、流式回复 (SSE)、本地 JSON 持久化

## 功能亮点

- React 前端界面（会话列表、搜索、重命名、删除、停止生成）
- 流式响应（`/api/chat` 使用 SSE 按块返回）
- 本地持久化（服务端 `data/chat.json` + 浏览器 `localStorage`）
- 支持 Mock 模式（无 Key 可直接跑）
- 支持接入 Google Generative Language API

## 技术栈

- `react` / `react-dom`
- `vite` / `@vitejs/plugin-react`
- `node`（CommonJS）
- `dotenv`
- `react-bits`（当前项目使用其可兼容子模块）

## 项目结构

```text
.
├─ server.js               # Node 服务入口（静态托管 + API）
├─ src/
│  ├─ chat.js              # 模型调用与回复生成逻辑
│  └─ storage.js           # 聊天记录读写
├─ web/                    # React 源码（Vite root）
│  ├─ index.html
│  └─ src/
│     ├─ App.jsx
│     ├─ main.jsx
│     └─ styles.css
├─ public/                 # Vite 构建产物（由 server.js 托管）
├─ data/chat.json          # 服务端持久化聊天记录
└─ tests/                  # smoke / storage 测试
```

## 快速开始

### 1) 安装依赖

```zsh
npm install
```

### 2) 可选：配置环境变量

```zsh
cp .env.example .env
```

`.env` 示例：

```dotenv
GOOGLE_API_KEY=
USE_REMOTE=1
GOOGLE_MODEL=gemini-1.5-flash
GOOGLE_API_BASE=
PORT=5173
```

说明：
- `USE_REMOTE=1` 且 `GOOGLE_API_KEY` 有值时，走远程模型
- 其余情况默认走本地 Mock

### 3) 开发模式（前端）

```zsh
npm run dev
```

### 4) 生产构建 + 本地服务

```zsh
npm run build
npm start
```

默认访问：`http://localhost:5173`

## 可用脚本

```zsh
npm run dev      # 启动 Vite 开发服务
npm run build    # 构建 web/ 到 public/
npm run preview  # 预览 Vite 构建产物
npm start        # 启动 Node 服务（托管 public/）
npm test         # 运行 smoke + storage 测试
```

## API 简述

- `POST /api/chat`
	- 入参：`{ messages: [{ role, content }, ...] }`
	- 出参：SSE 事件流（`start/chunk/done/error`）
- `GET /api/history`
	- 返回：`{ messages: [...] }`

## 测试

```zsh
npm test
```

## 备注

- 聊天记录会写入 `data/chat.json`
- 当前服务已支持 `HEAD /` 健康检查（用于探活场景）
