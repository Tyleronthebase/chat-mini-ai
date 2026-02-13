# 迷你聊天AI

一个本地可跑的聊天小项目，默认使用Mock回复，不需要API Key；也支持可选接入远程模型。
支持聊天记录持久化与流式回复。

## 快速开始

```zsh
npm install
npm start
```

你也可以复制 `.env.example` 为 `.env` 并填入自己的配置。

浏览器打开：`http://localhost:5173`

聊天记录会保存在 `data/chat.json`。

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

可自定义：
- `OPENAI_API_BASE` 默认 `https://api.openai.com/v1/chat/completions`
- `OPENAI_MODEL` 默认 `gpt-4o-mini`

## 测试

```zsh
npm test
```
