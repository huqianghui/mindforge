---
title: "Claude Code Agent/Subagent Architecture"
created: "2026-04-13"
updated: "2026-04-15"
tags:
  - wiki
  - concept
  - claude-code
  - agent
  - architecture
aliases:
  - "Agent/Subagent 架构"
related:
  - "[[agent-loop-architecture]]"
  - "[[harness-engineering]]"
---

# Claude Code Agent/Subagent Architecture

## 摘要

Claude Code 中 Agent 和 Subagent 是同一事物的两面——在 `.claude/agents/` 定义时叫 agent，被 Agent 工具调用运行时叫 subagent。Subagent 的 Context 与主 session 完全隔离且不可配置为共享，仅传递 prompt 参数，返回时中间过程全部丢弃仅返回摘要。"Process isolation gives context isolation for free" 是最关键的架构洞察。

## Claims

### Claim: Agent 和 Subagent 是同一个东西的两面

- **来源**：[[Claude Code的Agent与Subagent架构解析——以Superpowers为例]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 在 .claude/agents/ 定义时叫 agent，被 Agent 工具调用运行时叫 subagent，没有两个独立概念。

### Claim: Subagent Context 与主 session 完全隔离

- **来源**：[[Claude Code的Agent与Subagent架构解析——以Superpowers为例]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 仅传递 prompt 参数，无对话历史、无主 session 上下文，返回时中间过程全部丢弃仅返回摘要。

### Claim: "Process isolation gives context isolation for free"

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> Parent 维持持久 messages，Child 从空 messages 开始，交互极其克制。这是最关键的架构洞察。

## 冲突与演进

（暂无）

## 关联概念

- [[agent-loop-architecture]] — `uses` Subagent 运行独立的 Agent Loop 实例
- [[harness-engineering]] — `part-of` Context 隔离是 Harness 设计的重要机制
- [[claude-code-extension-system]] — `uses` Agent 是扩展体系的第三层
- [[code-reuse-in-agent-era]] — `constrains` Subagent 上下文隔离加剧了复用困难
- [[oh-my-claude-code]] — `uses` OMC 基于 Agent/Subagent 架构
- [[claude-code-memory-system]] — `uses` Subagent Memory 依赖进程隔离架构

## 来源日记

- [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]] — 架构解析
- [[learn-claude-code]] — 进程隔离洞察
