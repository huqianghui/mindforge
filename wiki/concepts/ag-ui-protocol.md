---
title: "AG-UI 协议：Agent 三大协议的最后一环"
created: "2026-08-04"
updated: "2026-08-04"
tags:
  - wiki
  - concept
  - agent
  - protocol
  - frontend
aliases:
  - "AG-UI"
  - "Agent-User Interaction Protocol"
related:
  - "[[mcp-vs-cli]]"
  - "[[azure-copilot-ecosystem]]"
  - "[[voice-live-agent]]"
---

# AG-UI 协议：Agent 三大协议的最后一环

## 摘要

AG-UI（Agent-User Interaction Protocol）标准化 **Agent Backend 与 Frontend 之间的通信**，补上三大 Agent 协议的最后一环：MCP 管 Agent↔Tool（向下），A2A 管 Agent↔Agent（横向），AG-UI 管 Agent↔User/UI（向上）。动机：Agent 早已不是 Request→Response——streaming、tool 调用、HITL 确认、状态同步、长时运行都需要前端持续接收事件；没有统一协议，前端要为每个 Backend（LangGraph/OpenAI/CrewAI）各写一套 Adapter。AG-UI 把这层**双向事件流**标准化（`TextMessageDelta`、`ToolCallStart`、`StateUpdate`、`RunFinished` 等），三层设计：协议（Event 规范）、传输（有意不绑定——SSE/WebSocket/Webhook 皆可）、SDK（`@ag-ui/core`/`@ag-ui/client` + 各 Runtime 适配层）。协议由 CopilotKit 团队提炼推动，Microsoft、Google、AWS、LangChain 等陆续加入。

## Claims

### Claim: 三大协议分工——MCP 向下连工具、A2A 横向连 Agent、AG-UI 向上连 UI

- **来源**：[[AG-UI协议解析——Agent三大协议的最后一环：从事件流到前端生态]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> 官方定位图：User —AG-UI— Agent Runtime —MCP— Tools/Data，—A2A— Other Agents。AG-UI 不是 Agent Framework 也不是 UI 框架，与 MCP、A2A 一样是协议规范（Specification）。与传统 REST 的本质区别：整个交互是双向事件流（RunStarted → MessageDelta → ToolCallStarted → RenderApprovalCard → UserAction(Confirm) → ContinueRun → FinalMessage），而非一次 HTTP Response。

### Claim: 三层设计——协议 / 传输（有意不绑定）/ SDK；关心 Client 而非 View Library

- **来源**：[[AG-UI协议解析——Agent三大协议的最后一环：从事件流到前端生态]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> 类比 gRPC 的位置：HTTP/WebSocket/SSE 是传输层，AG-UI 是应用层协议，`@ag-ui/client` 是 SDK，React/Vue 是 UI 框架。官方集成列表没有 React/Vue 不是遗漏而是设计：AG-UI 标准化的链路是 Agent Runtime → Client → UI，真正的 Client 是 CopilotKit、VSCode 扩展、Slack App、CLI 这类"能接收展示并响应 AG-UI Event 的系统"，React 只是 Client 的实现技术。浏览器根本不知道 AG-UI 存在——就像它不知道 MCP 一样。

### Claim: 生态缺口在 Frontend SDK 层——Backend 可互换已基本做到，`@ag-ui/react` 类框架适配层缺失

- **来源**：[[AG-UI协议解析——Agent三大协议的最后一环：从事件流到前端生态]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.7
- **状态**：active

> 第一层（Backend 可互换）已基本做到：LangGraph、CrewAI、Microsoft Agent Framework、Google ADK 等逐步支持，前端不改代码即可换 Backend。第二层（Frontend SDK）缺失：理想状态是 `const { messages, sendMessage } = useAgent()`，协议细节被 SDK 隐藏（如 Apollo `useQuery` 之于 GraphQL）；目前 Clients 中只有 CopilotKit 成熟（协议本就出自其团队）。这层缺口是判断 AG-UI 能否像 MCP 一样成为事实标准的关键，也是社区二次开发的机会所在。

### Claim: Voice Agent 本质也是一种 UI——interrupt/partial transcript/barge-in 可放进 AG-UI Event Flow

- **来源**：[[AG-UI协议解析——Agent三大协议的最后一环：从事件流到前端生态]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.7
- **状态**：active

> Foundry 文档把 AG-UI 与 voice、webhook 并列为 "custom protocols"，因为它们都是 Agent 对外交互方式而非内部推理机制。Voice UI 需要的事件（interrupt、partial transcript、speaking started/stopped、barge-in）与 AG-UI 的事件流模型同构。Hosted Agent 输出 AG-UI Event 后，React/Blazor/移动端/Voice UI 可复用同一条事件流——Microsoft Agent Framework 已宣布支持 AG-UI。

## 冲突与演进

- 2026-08-04：建页。单来源专文但内容完整（定位/分层/生态），且用户明确"为后续 AG-UI 开发做准备"——工程准备型页面。置信度 0.7~0.75（基于官方文档 + ChatGPT 讨论整理，未经自建项目验证）。

## 关联概念

- [[azure-copilot-ecosystem]] — `part-of` AG-UI 是 Foundry "custom protocols" 之一，Microsoft Agent Framework 已支持
- [[mcp-vs-cli]] — `contrasts` MCP 解决 Agent 向下的工具集成，AG-UI 解决向上的 UI 集成——同为协议路线但方向相反
- [[voice-live-agent]] — `extends` Voice UI 的事件需求（barge-in、partial transcript）可纳入 AG-UI 事件流，为语音层提供协议化出口

## 来源日记

- [[AG-UI协议解析——Agent三大协议的最后一环：从事件流到前端生态]] — 三大协议定位、三层设计、生态缺口、Foundry 关系（2026-07-30）
