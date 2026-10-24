---
title: "A2UI Protocol"
created: "2026-10-24"
updated: "2026-10-24"
tags:
  - wiki
  - concept
  - agent
  - protocol
  - generative-ui
aliases:
  - "A2UI 协议"
  - "A2UI"
  - "Agent-to-User Interface"
  - "声明式 Generative UI"
related:
  - "[[ag-ui-protocol]]"
  - "[[a2a-protocol]]"
  - "[[mcp-vs-cli]]"
---

# A2UI Protocol（A2UI 协议）

## 摘要

A2UI（Agent-to-User Interface，Google 发起）让 Agent 用**声明式 JSON 描述界面**，由客户端只用自己注册过的组件渲染，不执行任何来自 Agent 的代码。它介于"前端写死页面"和"LLM 直接生成 HTML/JS"之间——**Agent 决定需要什么界面，客户端决定哪些界面可以被安全地渲染和操作**。四个核心概念：Surface（一块独立管理的 UI 区域）、Component（扁平列表 + id 引用的组件树）、Catalog（客户端允许 Agent 使用的组件契约）、Data Model（与结构分离、按路径绑定的数据），外加 Renderer 回传给 Agent 的 Action。

在四协议拼图中：A2UI 描述界面应该是什么样子，AG-UI 处理 Agent 与用户应用之间的交互（也是 A2UI 消息的主要承载通道），A2A 处理 Agent 之间的协作，MCP 处理 Agent 对工具与数据的调用。生产稳定版为 v0.9.1，v1.0 处于 Candidate。

## Claims

### Claim: A2UI 传界面描述而非界面代码——UI 灵活性由 Catalog 决定，安全审查重点从生成代码转到组件白名单与操作授权

- **来源**：[[A2UI协议解析]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.75
- **状态**：active

> 三种做法对比：传统前端灵活性取决于预先实现的页面；LLM 生成 HTML/JS 灵活但往往需要执行任意代码、需额外沙箱；A2UI 协议禁止执行任意代码，同一份描述交给各端 Renderer。Action 是"声明一个操作名 + 上下文"，组件也只能调用客户端预注册的 `functionCall`，Agent 无法注入新脚本。价值在"换成按团队聚合""改成折线图"这类**动态组合 UI** 的场景；永远只有一个固定 Dashboard 的应用，直接写组件最简单。

### Claim: 结构与数据分离——组件扁平列表 + id 引用便于流式与局部更新，Data Model 改动只发数据不动结构

- **来源**：[[A2UI协议解析]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.8
- **状态**：active

> v0.9 消息：`createSurface`（强制 `catalogId`）、`updateComponents`、`updateDataModel`、`deleteSurface`，回传 `action`；v0.8 消息名完全不同（`beginRendering`、`surfaceUpdate`、`userAction`），不同版本示例不能混用。组件以邻接表形式下发，可逐个流式、局部更新而不必重发整棵树；用户输入只改本地 Data Model、不触发网络请求，直到 action 触发时 `context` 按 path 取值发回。Top 10 柱状图案例里"只看上海团队"只需再发 `updateDataModel`，图表就地刷新；排序切换这类纯展示交互留在前端，不必绕回 Agent。

### Claim: Renderer 是协议运行时而非组件库——有组件库 ≠ 有 A2UI Renderer，协议追求交互语义互操作而非像素一致

- **来源**：[[A2UI协议解析]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.75
- **状态**：active

> 三层逻辑划分：Protocol Runtime（解析、校验、Surface 生命周期、按序增量更新）、Component Adapter（协议组件映射到框架组件、数据绑定、操作转 action）、View Library（企业 Design System 真正绘制）。官方 Web 实现把前两层共性抽成 `@a2ui/web_core`，React / Angular / Lit 复用——协议逻辑共享、UI 适配分开，减少 Renderer 间行为差异。已有 React 组件库的企业：选定协议版本 → 挑适合动态组合的组件定义自有 Catalog → 基于 web_core 写适配 → 建测试。A2UI 不要求重做组件，要求一层能理解协议的 Renderer。

### Claim: 展示 ≠ 授权——UI 的 Data Model 不是业务数据的权威来源，客户端回传的数据不可信

- **来源**：[[A2UI协议解析]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.75
- **状态**：active

> 要分清三件事：Agent 能不能展示这个按钮、当前用户能不能看到它、当前用户能不能真正执行操作。点击按钮只证明用户触发了一个 UI 操作，"按钮不显示"也不能当授权机制；Data Model 里带回来的客户 ID 后端要重新校验。`sendDataModel` 开启后整个 Surface 数据模型随 action 发给 Agent 及中间编排层，不该让 Agent 看到的数据不要放进去。A2UI 限制了组件与交互能力，但不单独解决 Prompt Injection；Catalog 里若放了 `ExecuteCommand` 这类组件，协议也救不了。

### Claim: A2UI 与传输无关，AG-UI 是最常见的承载——装了 AG-UI ≠ 有 A2UI Renderer，反之亦然

- **来源**：[[A2UI协议解析]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.7
- **状态**：active

> 传输状态：A2A（扩展，稳定）、AG-UI（稳定，CopilotKit 自动把 A2UI 消息转成 AG-UI 事件）、MCP（v1.0 定义了绑定）、REST（规划中）、WebSocket/SSE（提案）。常见误解"A2UI 只管 Agent→UI、AG-UI 管 UI→Agent"不准确：A2UI 自己就定义了 action 回传。两个易混边界：AG-UI 的 Tool Call 事件只是把调用过程**展示**给前端，≠ MCP；AG-UI 的应用状态 ≠ A2UI 的 Data Model，不要默认完全同步。类比：A2UI 类似 HTML，Renderer 类似浏览器，AG-UI 是面向 Agent 应用的事件通信协议。

## 冲突与演进

- 2026-10-24：建页（用户 AskUserQuestion 裁决）。深入定义只在 A2UI 协议解析一文，A2A 与 AG-UI 两文引用其定位，补全 MCP / A2A / AG-UI / A2UI 四协议拼图（与 08-04 AG-UI 破例单篇建页同理）。基于官方规范与文档整理，未经自建项目验证，置信度 0.7~0.8。版本快速演进（v1.0 Candidate），版本相关 Claim 需在官方 Renderer 支持 v1.0 后复核。

## 关联概念

- [[ag-ui-protocol]] — `contrasts` A2UI 管"画什么"（组件、结构、数据绑定），AG-UI 管"怎么交互"（运行生命周期、文本流、工具调用、状态同步），并承载 A2UI 载荷
- [[a2a-protocol]] — `uses` A2UI 可经 A2A 扩展传输，让远端 Agent 直接回 UI
- [[mcp-vs-cli]] — `contrasts` MCP 只交付经授权的业务数据、不决定 UI，A2UI 只描述界面、不取数

## 来源日记

- [[2026-10-20-周二]] — 熟悉和对比 A2UI，成文 A2UI 协议解析
- [[A2UI协议解析]] — 核心概念与 v0.9 消息、Renderer 与 Catalog、Top 10 柱状图案例、A2UI vs AG-UI 边界、三协议发起方与组合（2026-10-20）
