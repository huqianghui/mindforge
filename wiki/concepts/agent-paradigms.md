---
title: "Agent Paradigms"
created: "2026-04-13"
updated: "2026-04-15"
tags:
  - wiki
  - concept
  - agent
  - paradigm
  - react
aliases:
  - "Agent 经典范式"
  - "ReAct"
  - "Plan-and-Solve"
related:
  - "[[agent-loop-architecture]]"
  - "[[harness-engineering]]"
---

# Agent Paradigms

## 摘要

AI Agent 的三种经典范式——ReAct（试错迭代）、Plan-and-Solve（系统规划）、Reflection（自我批评）——直接映射到人类认知策略。成熟的 Agent 系统（如 Claude Code）总是混合使用多种范式并自适应切换。所有 Agent 框架（LangChain、LlamaIndex、AutoGen）本质上只做三件事：定义循环结构、管理上下文、处理异常。

## Claims

### Claim: 三种经典范式映射人类认知策略

- **来源**：[[Agent经典范式与人类问题处理模式的映射]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> ReAct = 试错迭代（"try and see"），Plan-and-Solve = 系统规划（"think before act"），Reflection = 自我批评（"review and improve"）。

### Claim: 成熟 Agent 系统总是混合使用多种范式

- **来源**：[[Agent经典范式与人类问题处理模式的映射]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Claude Code 示例：ReAct 用于简单任务，Plan Mode 用于复杂任务，Reflection loop 用于测试失败时。选择不是非此即彼而是自适应切换。

### Claim: 所有 Agent 框架本质只做三件事

- **来源**：[[Agent经典范式与人类问题处理模式的映射]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 定义循环结构（Thought-Action-Observation）、管理上下文（trajectory 累积）、处理异常（解析错误、重试、无限循环预防）。理解范式原理可以从框架"用户"进阶为 Agent"创造者"。

## 冲突与演进

（暂无）

## 关联概念

- [[agent-loop-architecture]] — `uses` Agent Loop 是范式执行的运行时载体
- [[harness-engineering]] — `uses` Harness 提供范式切换的系统级支撑
- [[skill-pattern]] — `contrasts` Agent Pattern 与 Skill Pattern 正交互补

## 来源日记

- [[Agent经典范式与人类问题处理模式的映射]] — Agent 范式与人类认知的系统对比
