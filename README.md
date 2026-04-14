<div align="center">

# cc-multi-api

*像配置路由一样简单，本地 Anthropic 兼容代理，支持多 Provider 路由 + React Web UI。*

[![Bun](https://img.shields.io/badge/Bun-%3E%3D_1.0-black?logo=bun)](https://bun.sh/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D_18-green?logo=nodedotjs)](https://nodejs.org/)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Supported-blue?logo=anthropic)](https://claude.com/claude-code)

> **Anthropic 协议透传** | **OpenAI 双向翻译** | **可视化配置面板** | **响应式日志流**

</div>

---

通过单一 `http://localhost:3456` 端点暴露，拦截 Claude Code 请求，根据 `model` 字段智能路由到不同 Provider。

## 系统要求

- **Bun** >= 1.0
- **Node.js** >= 18 (仅用于 Vite 构建)
- Claude Code 已安装

## 安装

```bash
# 克隆或进入项目目录
cd cc-multi-api

# 安装依赖（若 node_modules 不存在）
bun install

# 构建前端 UI
bun run build
```

## 配置

配置文件位于 `~/.cc-multi-api/config.json`（首次运行自动创建）。

### 基本配置示例

```json
{
  "port": 3456,
  "providers": [
    {
      "name": "deepseek",
      "protocol": "anthropic",
      "baseUrl": "https://api.deepseek.com",
      "apiKey": "sk-xxxxxxxxxxxxxxxx"
    }
  ],
  "routes": {
    "claude-sonnet-4-5": {
      "provider": "deepseek",
      "model": "deepseek-chat"
    },
    "default": {
      "provider": "deepseek",
      "model": "deepseek-chat"
    }
  }
}
```

### 支持的 Provider 协议

| 协议 | 说明 | Provider 示例 |
|------|------|-------------|
| `anthropic` | 直接透传，不做请求/响应转换 | DeepSeek, Minimax, Kimi, GLM, Claude |
| `openai` | Anthropic ↔ OpenAI 双向翻译 | Gemini, Qwen, 本地 Ollama |

### 路由规则

路由按以下顺序匹配：

1. **精确匹配** — 请求 model 名 == 路由表 key
2. **最长前缀匹配** — 请求 model 以某 key 为前缀，匹配最长
3. **default 兜底** — 使用 `default` 路由（需配置）

> 将 `model` 设为 `"default"` 即配置默认路由。

## 启动

```bash
bun run start
```

启动后：
- 代理端点: `http://localhost:3456`
- Web UI: `http://localhost:3456/ui/`

## Claude Code 接入

修改settings.json

```
{
  "env":{
    ...
    "ANTHROPIC_BASE_URL": "http://localhost:3456",
    ...
  }
}
```

Claude Code 所有请求都会经过本地代理，按 `model` 字段路由到对应 Provider。

## Web UI

访问 `http://localhost:3456/ui/`，共 5 个页面：

| 页面 | 功能 |
|------|------|
| **Dashboard** | 服务器状态、Provider 列表、路由表概览 |
| **Providers** | 添加/编辑/删除 Provider，支持 anthropic/openai 协议 |
| **Routes** | 管理 model → Provider → Target Model 映射 |
| **Logs** | 实时 SSE 日志，显示每条请求的路由/延迟/状态 |
| **Test** | 单个或批量测试 Provider 连接状态 |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config` | 获取配置（包含真实 API Key，仅本地使用） |
| PUT | `/api/config` | 更新配置 |
| GET | `/api/status` | 服务器运行状态 |
| GET | `/api/logs` | 获取最近 500 条日志 |
| GET | `/api/logs/stream` | SSE 实时日志流 |
| POST | `/api/test/:name` | 测试 Provider 连通性 |
| POST | `/v1/messages` | Anthropic 消息代理端点 |

## 项目结构

```
cc-multi-api/
├── src/
│   ├── server/
│   │   ├── index.ts          # 入口，Bun.serve + Hono
│   │   ├── config.ts         # 配置读写
│   │   ├── router.ts         # 路由解析（精确/前缀/default）
│   │   ├── proxy.ts          # 代理核心，dispatch 到 adapters
│   │   ├── logger.ts         # 环形缓冲日志
│   │   ├── api.ts            # REST API 路由
│   │   └── adapters/
│   │       ├── anthropic.ts   # Anthropic 协议透传
│   │       ├── openai.ts     # OpenAI ↔ Anthropic 翻译
│   │       └── ulid.ts       # ID 生成
│   └── ui/                   # React 前端（Vite + Tailwind）
│       ├── pages/            # Dashboard, Providers, Routes, Logs, Test
│       └── hooks/            # useConfig, useLogs
├── dist/ui/                  # 构建产物（由 Vite 输出）
├── scripts/
│   └── e2e-smoke.sh          # 端到端冒烟测试
└── package.json
```

## 测试

```bash
# 单元测试（47 个测试，全部通过）
bun test

# 端到端冒烟测试
bash scripts/e2e-smoke.sh

# 生产构建
bun run build
```

## 常见问题

**Q: Claude Code 请求返回 401？**
A: Provider 的 API Key 配置错误，或 Provider 账户余额不足。

**Q: 某个 model 总是走 default 而不是精确匹配？**
A: 检查 `~/.cc-multi-api/config.json` 中的 routes 键名是否与 Claude Code 发送的 model 名完全一致。

**Q: OpenAI 协议 Provider 流式输出卡顿？**
A: 部分 Provider 对 SSE 分块大小敏感，可检查浏览器 Network 面板确认是否正常接收流。
