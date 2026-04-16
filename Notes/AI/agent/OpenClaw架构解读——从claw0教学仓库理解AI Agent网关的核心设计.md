---
title: OpenClaw架构解读——从claw0教学仓库理解AI Agent网关的核心设计
created: 2026-03-31
tags:
  - AI
  - Agent
  - OpenClaw
  - claw0
  - Gateway
  - 架构设计
---

# OpenClaw架构解读——从claw0教学仓库理解AI Agent网关的核心设计

## 引言

大多数 AI Agent 教程止步于"调一次 API"。但一个真正能投入生产的 Agent 系统，需要解决的问题远不止推理本身——多渠道接入、会话隔离、消息路由、可靠投递、并发控制，每一层都是工程硬仗。

[claw0](https://github.com/shareAI-lab/claw0) 是一个教学仓库，用 10 个渐进式章节（约 7000 行 Python）带你从一个 `while True` 循环走到生产级 AI Agent 网关，最终目标是能顺畅阅读 [OpenClaw](https://docs.openclaw.ai/) 的生产代码。本文基于 claw0 的学习过程，梳理 OpenClaw 的核心架构设计和关键概念。

---

## 一、整体架构：十层递进

claw0 将一个完整的 Agent 网关拆成 10 层，每层只引入一个新概念：

```
Phase 1: 基础         Phase 2: 连接            Phase 3: 智能
┌────────────────┐    ┌───────────────────┐    ┌──────────────────┐
│ s01: Agent Loop │    │ s03: Sessions     │    │ s06: Intelligence│
│ s02: Tool Use   │ →  │ s04: Channels     │ →  │   灵魂、记忆、   │
│                 │    │ s05: Gateway      │    │   技能、提示词   │
└────────────────┘    └───────────────────┘    └──────────────────┘

Phase 4: 自治                Phase 5: 生产
┌──────────────────┐        ┌──────────────────┐
│ s07: Heartbeat   │        │ s09: Resilience  │
│      & Cron      │  →     │ s10: Concurrency │
│ s08: Delivery    │        │                  │
└──────────────────┘        └──────────────────┘
```

这个分层有一个清晰的演进逻辑：

- **Phase 1**（s01-s02）：最小可运行的 Agent——一个循环 + 工具分发表
- **Phase 2**（s03-s05）：从单机走向网络——会话持久化、多渠道接入、路由分发
- **Phase 3**（s06）：赋予 Agent "人格"——8 层提示词组装 + 混合记忆检索
- **Phase 4**（s07-s08）：从被动变主动——心跳定时任务 + 可靠消息投递
- **Phase 5**（s09-s10）：生产加固——三层重试洋葱 + 命名车道并发控制

---

## 二、核心概念深度解析

### 2.1 Agent Loop：一切的起点

Agent 的本质出奇地简单：

```python
while True:
    response = call_model(messages)
    if response.stop_reason == "end_turn":
        break
    elif response.stop_reason == "tool_use":
        result = dispatch(tool_name, tool_input)
        messages.append(result)
```

关键洞察：**Agent 不是一次推理，而是一个循环。** 模型决定何时停止（`stop_reason`），而不是代码硬编码。Tool Use 的实现也很朴素——一个 dispatch table（名字→处理函数的映射），模型选名字，代码查表执行。

### 2.2 Channel、Peer、Session：三个最容易混淆的概念

这是理解 OpenClaw 路由机制的核心，也是学习过程中花时间最多的部分。

#### Channel（渠道）= 平台

Channel 是消息接入的平台层，比如 Telegram、飞书、WhatsApp、Slack。每个平台的协议不同（webhook、WebSocket、轮询），但 Channel 层的职责是将它们统一转换为相同的 `InboundMessage` 格式。

#### Peer（对话端点）= 通信对象标识

**Peer 是整个路由机制中最反直觉的概念。** 它不是"用户"，不是"实体"，而是：

> **一个可以独立进行对话的通信端点（communication endpoint）**

| 场景 | peer.kind | peer.id |
|------|-----------|---------|
| 私聊 | dm / direct | 用户 ID |
| 群聊 | group | 群 ID |
| 频道 | channel | 频道 ID |

**为什么不叫 user？** 因为在群聊场景下，peer 是整个群，不是某个发消息的人。如果用 `user` 来建模，群聊的逻辑就会崩掉——你无法确定应该以 A、B 还是 C 的身份来路由。

**为什么不叫 entity？** 因为 entity 太泛了，没有"通信"的语义。Peer 这个词来自分布式系统中的 P2P 网络，天然表达"对等通信的一方"。

**Peer 的本质作用**：它是 Gateway 用来标识"这条消息属于哪个对话容器"的 key，也是路由的最小单位。

#### Session（会话）= 上下文状态容器

Session 是最关键的概念。它不是 peer 的实例，也不是 agent 的属性，而是：

> **Agent 与 Peer 之间的一段持续交互状态（关系实例）**

Session 的 key 是一个三元组：

```
session_key = (agent_id, channel, peer)
```

**为什么必须是三元组？**

- 只有 peer → 不同 agent 会共享上下文，persona 混乱
- 只有 agent → 所有人共享一个脑子（灾难）
- 只有 (agent, peer) → 同一个人在不同平台的上下文无法隔离

三元组保证了：用户隔离 + Agent 隔离 + 渠道隔离。

#### 三者的关系链

```
用户发消息
    ↓
(channel + peer)         ← 外部世界：通信系统
    ↓
Gateway 识别 peer
    ↓
Routing → agent_id       ← 路由层：规则匹配
    ↓
session(agent, channel, peer)  ← 内部世界：状态层
    ↓
Agent 在 session 上执行   ← 执行层：推理引擎
    ↓
Response
```

### 2.3 Gateway Routing：纯规则驱动的多 Agent 分流器

Gateway 的路由机制是 **100% 静态匹配（rule-based routing）**，不是 LLM 决定，不是 embedding 相似度匹配，而是一个确定性的 if-else 配置引擎。

#### 五级绑定匹配（优先级从高到低）

1. **peer**（最精确）——精确匹配某个用户或群
2. **guild / team**——匹配团队/组织
3. **accountId**——匹配账号
4. **channel**——匹配整个平台
5. **default agent**——兜底

配置示例：

```json
{
  "bindings": [
    { "peer": "+6591234567", "agent": "vip-assistant" },
    { "channel": "telegram", "agent": "general-bot" },
    { "agent": "fallback" }
  ]
}
```

匹配行为：
- **确定性**（deterministic）
- **first match wins**（第一个命中的规则生效）
- **AND 匹配**（写了多个字段必须都满足）

#### 为什么是静态路由？

这是一个有意的设计选择。Gateway 做的是 **infra routing**（基础设施级路由），不是 AI routing（智能路由）。它不关心消息内容，只关心消息来自哪里。这保证了：

- 路由结果可预测、可调试
- 没有 LLM 调用开销
- 不会因为模型幻觉导致消息发错 agent

如果需要基于内容的智能路由（semantic routing），那应该在 Agent 层内部实现，而不是在 Gateway 层。

### 2.4 以 Session 为中心的系统设计

一个常见的误解是：既然 Gateway 负责路由，那系统是"以 Gateway 为中心"的。

**错。系统是以 Session 为中心的（Session-Oriented System）。**

验证方法很简单：
- Gateway 挂了 → 可以重启、可以替换（无状态）
- Session Store 没了 → 系统直接失忆，等于废了

Gateway 只是流量分发器，Session 才是系统的核心状态。所有请求最终都是为了找到并操作一个 session。可以类比操作系统：

| 类比 | OpenClaw |
|------|----------|
| 网络中断处理 | Gateway |
| CPU 执行单元 | Agent |
| 进程状态（Process State） | Session |

真正的核心永远是 Process（Session），不是 Interrupt Handler（Gateway）。

---

## 三、Intelligence 层：8 层提示词组装

s06 引入了 OpenClaw 最具特色的设计之一：**系统提示词 = 磁盘上的文件**。

Workspace 目录结构：

```
workspace/
  SOUL.md          ← 灵魂/人格定义
  IDENTITY.md      ← 身份信息
  TOOLS.md         ← 工具使用指南
  USER.md          ← 用户画像
  HEARTBEAT.md     ← 心跳行为定义
  BOOTSTRAP.md     ← 启动引导
  AGENTS.md        ← 多 Agent 配置
  MEMORY.md        ← 记忆策略
  skills/          ← 技能目录
    example-skill/
      SKILL.md     ← 技能定义
```

关键设计哲学：**换文件 = 换人格，不改代码。** 这让 Agent 的行为完全由配置驱动，非开发者也能调整 Agent 的表现。

---

## 四、生产级加固

### 4.1 Heartbeat & Cron（s07）：主动型 Agent

传统 Agent 是被动的——用户说话，Agent 回应。Heartbeat 机制让 Agent 能主动行动：

- 定时线程判断"该不该跑"
- 心跳消息和用户消息共用同一管线
- 使用 Lane 锁避免心跳和用户消息冲突

### 4.2 Delivery（s08）：可靠消息投递

核心策略：**先写磁盘，再尝试发送。** 即使系统崩溃，消息也不会丢失。配合退避策略（exponential backoff），处理网络抖动和限流。

### 4.3 Resilience（s09）：三层重试洋葱

```
外层：认证轮换（API key 过期 → 自动切换）
中层：溢出压缩（context 超长 → 自动总结压缩）
内层：工具循环重试（工具调用失败 → 重试）
```

### 4.4 Concurrency（s10）：命名车道系统

解决并发消息的序列化问题。核心概念：

- **命名车道（Named Lanes）**：每个 session 一个 FIFO 队列
- **Generation 追踪**：标记每次推理的版本号，避免过期响应
- **Future 返回**：异步等待结果，不阻塞其他车道

---

## 五、关键架构洞察

### 5.1 三层身份模型

```
Identity Layer  → peer        （外部世界身份）
Routing Layer   → agent_id    （内部 AI 实例）
State Layer     → session     （交互状态边界）
```

Peer 是"外部世界的通信端点"，Agent 是"内部的认知单元"，Session 是两者之间的"边界状态"。

### 5.2 Session 决定 Memory 隔离

Session key 不仅用于路由，还决定了记忆隔离：

```
session:agent:main:telegram:group:-100123
```

Peer 不只是 routing key，还是 memory shard key（分片键）。这意味着同一个群在不同 agent 下有完全独立的记忆。

### 5.3 Routing 变更的"失忆"问题

如果把 peer 从 Agent A 改为路由到 Agent B：

- Session A 还在（但不再使用）
- Session B 新建（没有历史）
- **用户感觉 AI 失忆了**

这是静态路由的固有局限，也是未来可能需要 session 迁移机制的原因。

### 5.4 静态路由的演进方向

当前系统是 static routing，未来的演进方向是 semantic routing：

```
static routing（当前）
    ↓
semantic routing（未来）
  - 根据 intent → agent
  - 根据任务类型 → agent
  - 根据 memory 状态 → agent
```

这才是 Agent 系统真正的 evolution——从基础设施级路由走向智能路由。

---

## 六、claw0 与 learn-claude-code 的互补关系

claw0 有一个姊妹仓库 [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)，两者的关注点不同但互补：

| 维度 | claw0 | learn-claude-code |
|------|-------|-------------------|
| 聚焦 | 网关路由、多通道接入、主动行为 | Agent 内部设计 |
| 核心概念 | Channel、Peer、Session、Gateway | TodoManager、Context 压缩、任务依赖图 |
| 目标产品 | OpenClaw（多 Agent 网关） | Claude Code（单元 Agent 框架） |
| 关键能力 | 多渠道统一、路由分发、消息投递 | 结构化规划、自治式自组织、并行执行 |

如果说 claw0 教你如何把 Agent 连接到外部世界，learn-claude-code 则教你如何构建 Agent 的内部大脑。

---

## 七、总结

OpenClaw 的架构设计有几个值得学习的关键决策：

1. **Peer 而非 User**：用"通信端点"而非"用户"来建模，天然支持群聊、频道等多人场景
2. **三元组 Session**：`(agent, channel, peer)` 保证了全维度的状态隔离
3. **静态路由**：Gateway 层故意不做智能路由，保持确定性和可调试性
4. **Session-Oriented**：整个系统以 Session 为核心，而非 Gateway 或 Agent
5. **文件即配置**：提示词、人格、技能全部用 Markdown 文件定义，换文件换行为
6. **渐进式复杂度**：从 while 循环到生产级网关，每步只加一个概念

对于想深入理解 AI Agent 系统工程的人来说，claw0 提供了一条从概念到生产的清晰路径。

---

## 参考资料

- [claw0 GitHub 仓库](https://github.com/shareAI-lab/claw0)
- [OpenClaw 官方文档](https://docs.openclaw.ai/)
- [OpenClaw Agent Runtime 概念](https://docs.openclaw.ai/concepts/agent)
- [OpenClaw 多 Agent 路由](https://docs.openclaw.ai/concepts/multi-agent)
- [learn-claude-code 姊妹仓库](https://github.com/shareAI-lab/learn-claude-code)

## 相关文章

- [[Agent-Reach与OpenCLI——命令编排型Agent框架的两条路线]] — 命令编排型 Agent 框架对比
- [[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]] — Agent Skill 架构模式
- [[Claude Code系列02：learn-claude-code——打开Coding Agent黑盒]] — Coding Agent 内部机制
