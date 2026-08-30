---
title: "Agent Loop Architecture"
created: "2026-04-13"
updated: "2026-08-30"
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
  - "[[cybernetics-agent-design]]"
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
- **状态**：stale

> while 循环 + model 调用 + 工具执行 + 结果回灌，"One loop & Bash is all you need"。

### Claim: Tool Dispatch 模式——添加新工具只需往 dispatch map 加一行

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> agent loop 本身一字不改，这是 Tool Dispatch 模式的核心优势。

### Claim: TodoWrite 是 harness "行为纠偏"能力的首次展现

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 引入任务追踪后，model 被强制同一时间只有一个 in_progress 任务；连续 3 轮不调用 todo 工具时系统自动注入提醒。

### Claim: learn-claude-code 的 12 session 分三梯队

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 基础层（Agent 能做什么）、隔离层（怎么管理注意力）、协作层（多 Agent 怎么协同），对应 Claude Code 从 Agent Loop 到 Teams/Worktree 的完整机制。

### Claim: action loop 是 agent loop 在 GUI 操作域的实例化——观察对象换成屏幕状态、动作换成 UI 事件

- **来源**：[[Computer Use与Browser Use系列三：自己实现——action loop协议、双执行器路线与跨平台adapter矩阵]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-30
- **置信度**：0.75
- **状态**：active

> Computer Use 的 action loop（截图 → 模型返回 action JSON → handler 执行 → 截取新状态回传）与 agent loop 的 while 循环同构：都是"模型判断 + 执行 + 结果回灌"。区别仅在实例化域——观察从工具返回值变成截图/DOM/Accessibility Tree，动作从 API 调用变成 click/type/scroll。关键分层认知：模型返回的 action 只是协议（不会自己执行），**action handler 是使用者要写的翻译层**，Playwright/xdotool 只是 handler 背后的执行环境。"One loop & Bash is all you need" 在 GUI 域的对应物是 "One loop & screenshot+click is all you need"——loop 骨架不变，工具面变了。

## 冲突与演进

- 2026-08-30：注入 action loop 实例化 Claim（Computer Use 系列三），4 月 stale 页注入 active 新证据——agent loop 范式获得 GUI 操作域的跨域验证。

## 关联概念

- [[harness-engineering]] — `part-of` Agent Loop 是 Harness 的运行时核心
- [[cybernetics-agent-design]] — `implements` Agent Loop 是控制论负反馈机制的工程载体

## 来源日记

- [[learn-claude-code]] — Agent Loop 架构完整拆解
