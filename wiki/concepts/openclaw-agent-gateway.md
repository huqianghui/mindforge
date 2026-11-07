---
title: "OpenClaw Agent Gateway"
created: "2026-04-13"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - agent
  - gateway
  - architecture
  - multi-agent
aliases:
  - "OpenClaw"
  - "claw0"
  - "Agent 网关"
related:
  - "[[agent-loop-architecture]]"
  - "[[agent-zero]]"
  - "[[hermes-agent]]"
  - "[[skill-hub-ecosystem]]"
---

# OpenClaw Agent Gateway

## 摘要

OpenClaw / claw0 是一个教学级 Agent 网关架构，揭示了生产级 Agent 系统的五个递进阶段：基础循环 + 工具 → 网络层（session + channel + routing）→ 智能层（8 层 prompt 组装 + 混合记忆）→ 自主层（heartbeat + 可靠投递）→ 生产硬化（retry onion + 并发车道）。Agent 本质上是一个循环，模型通过 stop_reason 决定何时停止。

## Claims

### Claim: Agent 本质上是一个循环，不是单次推理

- **来源**：[[OpenClaw架构解读]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（grep wiki/Notes/paper 关键词，未见相反表述）；关键词 agent loop / stop_reason

> 模型通过 stop_reason 决定何时停止，工具调用是简单 dispatch table（name-to-function mapping）。这种简洁性常被框架抽象掩盖。

### Claim: 生产 Agent 网关需要五个递进阶段

- **来源**：[[OpenClaw架构解读]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（grep wiki/Notes/paper 关键词，未见相反表述）；五阶段为作者归纳的架构模式，非产品事实

> 基础循环 + 工具 → 网络层 → 智能层（8 层 prompt 组装 + 混合记忆）→ 自主层 → 生产硬化。

### Claim: Channel、Peer、Session 是三个常混淆的不同概念

- **来源**：[[OpenClaw架构解读]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.6
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：OpenClaw 官方文档 Nested sub-agents https://docs.openclaw.ai/tools/subagents/nesting ：Gateway 之外由 orchestrator agent 通过 sessions_spawn 编排

> Channel = 平台（Telegram, Slack），Peer = 通信端点身份，Session = 会话状态容器。

### Claim: OpenClaw 多 Agent 协作采用 Orchestrator Pattern，Gateway 不参与编排

- **来源**：[[Hermes-Agent与OpenClaw对比]]
- **首次出现**：2026-05-07
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：OpenClaw 官方文档 https://docs.openclaw.ai/tools/subagents/nesting ：orchestrator 通过 sessions_spawn 派生子 agent

> Gateway 是纯通讯层（消息路由 + 心跳 + WebSocket API），不做任务编排。多 Agent 编排由用户指定的 Orchestrator Agent（一个普通 Node）通过 sessions_spawn 工具实现分层委托。来源：OpenClaw 官方 Sub-agents 文档。

### Claim: 单个 Agent Node 内可通过 sessions_spawn 包含多个 Sub-Agent（嵌套最深 5 层）

- **来源**：[[Hermes-Agent与OpenClaw对比]]
- **首次出现**：2026-05-07
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 修订——依据：OpenClaw 官方文档 https://docs.openclaw.ai/tools/subagents/nesting

> **现行结论（2026-11-07 修订）**：maxSpawnDepth 默认已是 5（范围 1-5），非原文的 1；maxChildrenPerAgent 默认 5（范围 1-20），maxConcurrent 默认 8 且是每个派生会话的并发。正文把「默认 1 / 设 2 启用」改为「默认 5，可调 1-5」；「全局并发上限 8」改为「每个派生会话 8」
>
> 以下为原记录：
> Sub-Agent 是从 parent session 衍生的后台 worker，独立上下文和工具权限。maxSpawnDepth 默认 1（无嵌套），设为 2 即启用 Orchestrator Pattern。每 session 最多 5 个活跃子 Agent，全局并发上限 8。Sub-Agent 间逻辑隔离（独立 workspace、memory、skills、auth）。

### Claim: OpenClaw 支持 Persistent Agents 和 Sub-Agents 两种多 Agent 模式

- **来源**：[[Hermes-Agent与OpenClaw对比]]
- **首次出现**：2026-05-07
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：OpenClaw 官方文档 Sub-agents https://docs.openclaw.ai/tools/subagents ：sessions_spawn 支持 thread 绑定会话与按需 sub-agent

> Persistent Agents：多个独立 Agent 绑定到不同 Channel，各自持久运行。Sub-Agents：从对话中按需 spawn 的后台 worker。两者可组合：Persistent Orchestrator + 按需 spawn Sub-Agents。

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——长效 2、确认 3

## 关联概念

- [[agent-loop-architecture]] — `uses` Agent 网关的核心仍是 Agent Loop
- [[skill-hub-ecosystem]] — `part-of` OpenClaw 也是 Skill Hub 生态的一部分
- [[hermes-agent]] — `contrasts` 单体自主进程 vs Gateway+Node 分布式架构
- [[agent-zero]] — `contrasts` 三种 Agent 哲学光谱中的极端自主端

## 关联方法


## 来源日记

- [[OpenClaw架构解读]] — claw0 架构解读
- [[Hermes-Agent与OpenClaw对比]] — Hermes vs OpenClaw 深度技术对比
