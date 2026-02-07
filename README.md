# 迷你聊天AI

一个本地可跑的聊天小项目，默认使用Mock回复，不需要API Key；也支持可选接入远程模型。

## 快速开始

```zsh
npm install
npm start
```

浏览器打开：`http://localhost:5173`

## 可选：接入远程模型

```zsh
export OPENAI_API_KEY="你的KEY"
export USE_REMOTE=1
npm start
```

可自定义：
- `OPENAI_API_BASE` 默认 `https://api.openai.com/v1/chat/completions`
- `OPENAI_MODEL` 默认 `gpt-4o-mini`

## 测试

```zsh
npm test
```
