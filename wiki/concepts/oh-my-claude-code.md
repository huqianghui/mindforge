---
title: "oh-my-claude-code (OMC)"
created: "2026-04-13"
updated: "2026-04-15"
tags:
  - wiki
  - concept
  - claude-code
  - multi-agent
  - orchestration
aliases:
  - "OMC"
  - "oh-my-claude-code"
related:
  - "[[claude-code-agent-subagent]]"
  - "[[harness-engineering]]"
  - "[[one-person-team]]"
---

# oh-my-claude-code (OMC)

## 摘要

oh-my-claude-code（OMC）是一个多 Agent 编排框架，核心命题是"不是让一个 Claude 扮演不同角色，而是让多个 Agent（包括不同模型）真正并行协作"。与 Superpowers/gstack/GSD 的"结构化 prompt + workflow 模板在同一实例切换角色"本质不同。其 Domain 车道和 Autopilot 全自动执行是最独特的设计。

## Claims

### Claim: OMC 的核心命题是多 Agent 真正并行协作

- **来源**：[[Vibe Coding系列10]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 不是让一个 Claude 扮演不同角色，而是让多个 Agent（包括不同模型）真正并行协作。

### Claim: Domain 车道是 OMC 最独特的设计

- **来源**：[[Vibe Coding系列10]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> 解决"AI 缺的不是编码能力而是专业判断标准"的问题，其他框架都没有系统化的领域判断注入机制。

### Claim: OMC Autopilot 与 Superpowers 的核心体验差异

- **来源**：[[Vibe Coding系列10]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Superpowers 要求人类在每个阶段参与，OMC 的 autopilot 可以一句话跑完全程（全自动连续执行）。

### Claim: Autopilot 运行时动态决策四大能力

- **来源**：[[Vibe Coding系列10]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> Shared State 追踪、Role Routing 自动选模型、Persistent Execution Loop 反复验证、Parallel Task Distribution 多 worker 并行。

## 冲突与演进

（暂无）

## 关联概念

- [[claude-code-agent-subagent]] — `uses` OMC 基于 Claude Code 的 Agent/Subagent 架构
- [[harness-engineering]] — `implements` OMC 是 Harness Engineering 理念的高层封装
- [[one-person-team]] — `uses` OMC Autopilot 助力一人团队模式
- [[terminal-multiplexer-for-ai]] — `uses` tmux/cmux 为 OMC 多 Agent 并行提供终端基础设施

## 来源日记

- [[Vibe Coding系列10]] — OMC 多 Agent 编排深度分析
