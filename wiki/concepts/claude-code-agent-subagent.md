---
title: "Claude Code Agent/Subagent/Teammate Architecture"
created: "2026-04-13"
updated: "2026-04-16"
tags:
  - wiki
  - concept
  - claude-code
  - agent
  - architecture
  - teammate
aliases:
  - "Agent/Subagent 架构"
  - "Teammate 架构"
related:
  - "[[agent-loop-architecture]]"
  - "[[harness-engineering]]"
  - "[[meta-harness]]"
---

# Claude Code Agent/Subagent/Teammate Architecture

## 摘要

Claude Code 中 Agent 和 Subagent 是同一事物的两面——在 `.claude/agents/` 定义时叫 agent，被 Agent 工具调用运行时叫 subagent。Subagent 的 Context 与主 session 完全隔离且不可配置为共享，仅传递 prompt 参数，返回时中间过程全部丢弃仅返回摘要。"Process isolation gives context isolation for free" 是最关键的架构洞察。2026 年 Claude Code 进一步引入 Teammate 架构——具有名字、独立收件箱（JSONL）和持久 Agent Loop 的长期协作者，通过 TeamConfig + MessageEnvelope 实现结构化通信，形成 Subagent（一次性委派）→ Runtime Task（后台槽位）→ Teammate（长期协作）的三层 Agent 架构。

## Claims

### Claim: Agent 和 Subagent 是同一个东西的两面

- **来源**：[[Claude Code系列03：Agent、Subagent与Teammate架构解析——从一次性委派到长期协作]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 在 .claude/agents/ 定义时叫 agent，被 Agent 工具调用运行时叫 subagent，没有两个独立概念。

### Claim: Subagent Context 与主 session 完全隔离

- **来源**：[[Claude Code系列03：Agent、Subagent与Teammate架构解析——从一次性委派到长期协作]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 仅传递 prompt 参数，无对话历史、无主 session 上下文，返回时中间过程全部丢弃仅返回摘要。

### Claim: "Process isolation gives context isolation for free"

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> Parent 维持持久 messages，Child 从空 messages 开始，交互极其克制。这是最关键的架构洞察。

### Claim: Teammate 是具有名字、收件箱和独立 Agent Loop 的长期协作者

- **来源**：[[Claude Code系列03：Agent、Subagent与Teammate架构解析——从一次性委派到长期协作]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：stale

> Teammate 与 Subagent 的本质区别：Subagent 是一次性委派（fire-and-forget），执行完即销毁；Teammate 有持久身份（name）、独立收件箱（JSONL inbox）和长期运行的 Agent Loop，通过 TeamConfig（`.team/config.json`）注册，通过 MessageEnvelope（type/from/content/timestamp）通信。

### Claim: Claude Code 形成三层 Agent 架构——Subagent / Runtime Task / Teammate

- **来源**：[[Claude Code系列03：Agent、Subagent与Teammate架构解析——从一次性委派到长期协作]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：stale

> 三层对比：① Subagent——一次性助手，空白 context 启动，仅返回摘要；② Runtime Task——后台槽位，异步执行长时间任务（npm install/pytest），完成后通知；③ Teammate——长期协作者，有名字和收件箱，可被 SendMessage 唤醒，支持 Shutdown/Plan Approval 等 FSM 协议。三者分别对应 learn-claude-code 的 S04、S08、S09-S12。

## 冲突与演进

（暂无）

## 关联概念

- [[agent-loop-architecture]] — `uses` Subagent 和 Teammate 都运行独立的 Agent Loop 实例
- [[harness-engineering]] — `part-of` Context 隔离是 Harness 设计的重要机制
- [[claude-code-extension-system]] — `uses` Agent 是扩展体系的第三层
- [[code-reuse-in-agent-era]] — `constrains` Subagent 上下文隔离加剧了复用困难
- [[oh-my-claude-code]] — `uses` OMC 基于 Agent/Subagent/Teammate 架构
- [[claude-code-memory-system]] — `uses` Subagent Memory 依赖进程隔离架构
- [[meta-harness]] — `uses` Meta-Harness 论文选用 Claude Code Agent 作为 Proposer

## 来源日记

- [[Claude Code系列03：Agent、Subagent与Teammate架构解析——从一次性委派到长期协作]] — 架构解析（含 Teammate 详解）
- [[learn-claude-code]] — 进程隔离洞察
- [[2026-04-16-周四]] — 再次学习 Claude Code 原理，Teammate 概念补充
