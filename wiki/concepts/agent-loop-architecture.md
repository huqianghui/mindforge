---
title: "Agent Loop Architecture"
created: "2026-04-13"
updated: "2026-04-15"
tags:
  - wiki
  - concept
  - agent
  - architecture
  - claude-code
aliases:
  - "Agent Loop"
  - "Agent 循环架构"
related:
  - "[[harness-engineering]]"
  - "[[claude-code-agent-subagent]]"
---

# Agent Loop Architecture

## 摘要

Agent Loop 是所有 AI Agent 的运行时核心——一个 while 循环执行 model 调用 + 工具执行 + 结果回灌的过程。核心只需约 30 行代码，"One loop & Bash is all you need"。Claude Code 的 learn-claude-code 课程将其分为基础层、隔离层、协作层三个梯队，对应从单 Agent 到 Teams/Worktree 的完整机制。

## Claims

### Claim: Agent Loop 核心只需 30 行 Python

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> while 循环 + model 调用 + 工具执行 + 结果回灌，"One loop & Bash is all you need"。

### Claim: Tool Dispatch 模式——添加新工具只需往 dispatch map 加一行

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> agent loop 本身一字不改，这是 Tool Dispatch 模式的核心优势。

### Claim: TodoWrite 是 harness "行为纠偏"能力的首次展现

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 引入任务追踪后，model 被强制同一时间只有一个 in_progress 任务；连续 3 轮不调用 todo 工具时系统自动注入提醒。

### Claim: learn-claude-code 的 12 session 分三梯队

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 基础层（Agent 能做什么）、隔离层（怎么管理注意力）、协作层（多 Agent 怎么协同），对应 Claude Code 从 Agent Loop 到 Teams/Worktree 的完整机制。

## 冲突与演进

（暂无）

## 关联概念

- [[harness-engineering]] — `part-of` Agent Loop 是 Harness 的运行时核心
- [[claude-code-agent-subagent]] — `uses` Subagent 运行独立的 Agent Loop 实例
- [[agent-paradigms]] — `uses` Agent Loop 是范式执行的运行时载体
- [[autoresearch]] — `uses` AutoResearch 的循环结构本质上是特化的 Agent Loop
- [[openclaw-agent-gateway]] — `uses` Agent 网关的核心仍是 Agent Loop

## 来源日记

- [[learn-claude-code]] — Agent Loop 架构完整拆解
