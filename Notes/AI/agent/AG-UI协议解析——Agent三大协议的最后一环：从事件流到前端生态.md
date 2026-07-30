---
title: AG-UI协议解析——Agent三大协议的最后一环：从事件流到前端生态
created: 2026-07-30
tags:
  - AI/Agent
  - AG-UI
  - MCP
  - A2A
  - Protocol
  - CopilotKit
---

# AG-UI 协议解析——Agent 三大协议的最后一环：从事件流到前端生态

> 源起：阅读 Azure AI Foundry 文档时看到 "custom protocols (webhooks, voice, AG-UI)" 这一表述，其中 AG-UI 是三大 Agent 协议（MCP、A2A、AG-UI）中我最陌生的一个。本文基于 [与 ChatGPT 的讨论](https://chatgpt.com/share/6a6af04b-04e4-83ec-9a75-6043e9c97483) 整理，梳理 AG-UI 的定位、分层设计与生态现状，为后续可能的 AG-UI 开发做准备。

## 一、AG-UI 在 Agent 协议栈中的位置

AG-UI（Agent-User Interaction Protocol）是 2025 年以来兴起的一个开放协议，目标是**标准化 Agent Backend 与 Frontend 之间的通信**。它不是 Agent Framework，也不是 UI 框架，而是一个协议（Protocol）。

官方给出的定位非常清楚：

```
           User
             │
         AG-UI
             │
         Agent Runtime
         /            \
      MCP             A2A
      │                │
 Tools/Data      Other Agents
```

三大协议职责完全不同：

| Protocol | 负责什么 | 一句话 |
|----------|---------|--------|
| MCP | Agent ↔ Tool | Agent 如何调用外部能力 |
| A2A | Agent ↔ Agent | Agent 之间如何协作 |
| AG-UI | Agent ↔ User（UI） | UI 如何驱动和展示 Agent |

MCP 解决的是 Agent 向下连接工具和数据，A2A 解决的是 Agent 横向连接其他 Agent，而 AG-UI 补上了最后一环——Agent 向上连接用户界面。

## 二、为什么需要 AG-UI

传统的 AI Chat 是典型的 Request → Response 模式：

```
Browser → POST /chat → Backend → Response
```

但 Agent 早已不是这样。一个 Agent 运行过程中会：

- Streaming 输出
- 调用 Tool
- 等待用户确认（Human-in-the-Loop）
- 修改共享状态（State）
- 多 Agent 协作
- 长时间运行（几分钟甚至更久）

前端需要不停接收各种事件：`thinking...` → `tool started` → `tool finished` → `need user approval` → `continue` → `final answer`。

如果没有统一协议，LangGraph 一套 JSON、OpenAI Agent 一套 JSON、CrewAI 又一套 JSON，前端就要为每个 Backend 写一套 Adapter。AG-UI 就是把这层事件流标准化。

以「帮我订机票」为例，AG-UI 的事件流大致是：

```
RunStarted
  ↓
AssistantMessageDelta（"好的"）
  ↓
ToolCallStarted（SearchFlights）
  ↓
ToolResult
  ↓
RenderApprovalCard      ← 前端渲染确认卡片，等待用户点击
  ↓
UserAction（Confirm）    ← 用户操作作为事件传回 Backend
  ↓
ContinueRun → PurchaseTool → FinalMessage
```

整个过程是**双向的事件流（Event Stream）**，而不是一次 HTTP Response。这也是 AG-UI 与传统 REST API 最本质的区别。

## 三、AG-UI 的三层设计：协议、传输、SDK

理解 AG-UI 的关键是把它拆成三层。它首先是一个协议，其次官方提供 SDK 来实现这个协议——**它既不是浏览器协议（如 HTTP、WebSocket），也不是某个前端框架的专属库**。

### 第一层：协议（最核心）

协议定义的是：

- Event 的类型与格式（`TextMessageStart`、`TextMessageDelta`、`ToolCallStart`、`ToolCallEnd`、`StateUpdate`、`RunFinished` 等）
- 双向通信流程
- Agent State 如何同步
- Tool Call 与 UI Action 如何表示

它不规定必须用 React、必须在浏览器、必须走 HTTP——只规定「这些 Event 长什么样」。这个性质与 MCP、A2A 一致，都是**协议规范（Specification）**。

### 第二层：Transport（有意不绑定）

AG-UI 故意不绑定传输层，官方明确表述为 "Works with any event transport"：

- SSE
- WebSocket
- Webhook
- HTTP Streaming
- 甚至 CLI 的 stdin/stdout

浏览器只是众多 Client 中的一个。浏览器本身根本不知道 AG-UI 的存在——就像浏览器也不知道 MCP 一样。浏览器只负责通过 WebSocket/SSE 收 JSON，AG-UI SDK 负责解释「这是一个 `TEXT_MESSAGE_DELTA`」并驱动 UI 更新。

### 第三层：SDK（官方提供）

为了不用手工解析 Event，官方提供了一系列 npm 包：

- `@ag-ui/core` — 协议的数据结构：Event Types、Message、Tool、State
- `@ag-ui/client` — 连接建立、Event 接收、State 管理、Streaming/Abort 处理
- `@ag-ui/langgraph`、`@ag-ui/vercel-ai-sdk`、`@ag-ui/openai-server` — 各 Runtime 的适配层

一个贴切的分层类比（类似 gRPC 的位置）：

| 层级 | 类比 |
|------|------|
| HTTP / WebSocket / SSE | 网络传输层 |
| AG-UI | 应用层协议 |
| `@ag-ui/client` | SDK |
| React / Vue / Flutter | UI 框架 |

## 四、为什么官方集成列表里没有 React、Vue

看 [AG-UI 官方文档](https://docs.ag-ui.com/introduction) 的 Integrations 页面会发现，分类是 Agent Framework（LangGraph、CrewAI、Microsoft Agent Framework…）、SDK（Kotlin、Go、Dart、Java、Rust）和 Clients（CopilotKit、Terminal、React Native），唯独没有 React、Vue、Angular、Svelte。

这不是遗漏，而是设计如此：**AG-UI 关心的是 Client（客户端），而不是 View Library（视图库）**。

React 只是 UI Rendering Library，而 AG-UI 要标准化的链路是：

```
Agent Runtime → Client → UI
```

真正的 Client 是 CopilotKit、自建 Chat Client、VSCode Extension、Slack App、CLI、React Native App 这一类「能接收、展示并响应 AG-UI Event 的系统」。React 只是这些 Client 的实现技术之一：

```
React（负责 render）
    │
CopilotKit（负责理解 AG-UI Event）
    │
AG-UI Client
    │
Agent
```

两个细节值得注意：

1. **React Native 单独列出**是因为它不是 View Library，而是一个完整的 Client Runtime（含生命周期、网络、Native Bridge），官方需要有人维护这个 Client，所以标注了 Help Wanted。
2. **Clients 里只有 CopilotKit 成熟**，这透露了 AG-UI 的历史——协议最早就是 CopilotKit 团队从自家产品中提炼并推动的，后来 Microsoft、Google、AWS、LangChain、CrewAI 等陆续加入支持。CopilotKit 内置了 Chat UI、Tool Approval、State Sync、Human-in-the-Loop、Streaming，直接消费 AG-UI Event。

## 五、生态缺口：还差一层 Frontend SDK

AG-UI 目前的成熟度可以分两层看：

**第一层：Backend 可互换（已基本做到）。** 各大 Agent Framework 正在逐步支持 AG-UI，前端不改代码就能对接 LangGraph、CrewAI、Microsoft Agent Framework、Google ADK、Mastra 等任意 Backend。官方当前的投入也集中在这里：Agent Framework Adapter、Server SDK、Protocol、Event。

**第二层：Frontend SDK（目前缺失）。** 理想状态下，React 开发者只需要：

```tsx
const { messages, sendMessage } = useAgent();
```

而不需要理解 AG-UI Event、SSE、`ToolCallStart`、`StateDelta` 这些协议细节。这正是现代 SDK 的普遍发展规律——GraphQL 用户不手工解析 response 而是用 Apollo 的 `useQuery`，Firebase 用户不自己管 WebSocket 重连而是用 `useAuthState`，TanStack Query 用户不自己维护 loading/cache/retry。

未来合理的生态形态应该是：

```
React          Vue           Angular        Svelte
  │              │              │              │
@ag-ui/react  @ag-ui/vue   @ag-ui/angular  @ag-ui/svelte
  └──────────────┴──────┬───────┴──────────────┘
                 @ag-ui/client（连接、事件解析、状态同步、重连）
                        │
                  AG-UI Protocol
```

每个前端开发者只学自己框架习惯的 API（React Hooks、Vue Composables、Flutter Widgets），协议被完全隐藏在 SDK 后面。**这也是判断 AG-UI 能否像 MCP 一样成为事实标准的关键**：MCP 已经形成大量 Server 和 SDK 生态，而 AG-UI 目前更多完成了 Agent Runtime 侧的统一，距离形成 React Query 那样成熟的跨框架前端生态还有距离——这个缺口同时也是社区贡献和二次开发的机会所在。

## 六、与 Azure AI Foundry 的关系

回到最初的疑问：为什么 Foundry 文档把 AG-UI 与 voice、webhook 并列为 "custom protocols"？

因为它们都是 **Agent 对外通信和交互的方式**，而非 Agent 内部推理或工具调用机制。如果不想用 Foundry 自带的 Chat UI，而是自己写 React、Blazor、移动端甚至 Voice UI，那么 Hosted Agent 输出 AG-UI Event 后，所有前端都可以复用同一条事件流。

Voice Agent 本质上也是一种 UI——它需要 interrupt、partial transcript、speaking started/stopped、barge-in 这些事件，同样可以放进 AG-UI 的 Event Flow。

Microsoft Agent Framework 已宣布支持 AG-UI，整个生态串起来就是：

```
                User
                  │
            React / Blazor
                  │
               AG-UI
                  │
      Microsoft Agent Framework
                  │
        Azure AI Foundry Agent
                  │
        MCP Servers / Tools
                  │
      GitHub、Database、SAP...
```

## 七、面向开发的要点小结

为后续 AG-UI 开发准备的速查：

1. **心智模型**：AG-UI 是应用层协议，跑在 SSE/WebSocket 之上；前端框架不需要「内置支持」，用官方 SDK 或按规范自己实现 Client 即可。
2. **核心包**：`@ag-ui/core`（类型定义）+ `@ag-ui/client`（连接与事件处理）；Backend 侧用对应 Framework 的 adapter（如 `@ag-ui/langgraph`）。
3. **Web 前端两条路**：要开箱即用选 CopilotKit（唯一成熟的 Client，含 Chat UI 和 HITL 组件）；要完全自控则基于 `@ag-ui/core` 自建 Client。
4. **事件驱动思维**：UI 状态由事件流驱动（`ToolCallStarted` → 显示 Loading，`ToolCallFinished` → 刷新），而不是等待一次性 Response。
5. **生态机会**：`@ag-ui/react`、`@ag-ui/vue` 这类框架适配层官方尚未提供，是当前最值得关注的建设方向。

## 相关文章

- [[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]] — MCP 在 Agent 架构中的位置
- [[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]] — Azure Foundry Hosted Agent 的执行环境
