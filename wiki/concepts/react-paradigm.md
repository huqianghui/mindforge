---
title: "ReAct 范式（ReAct Paradigm）"
created: "2026-04-17"
updated: "2026-04-17"
tags:
  - wiki
  - concept
  - agent
  - paradigm
  - reasoning
  - action
aliases:
  - "ReAct 范式"
  - "ReAct Paradigm"
  - "ReAct"
  - "Reason + Act"
related:
  - "[[agent-paradigms]]"
  - "[[agent-loop-architecture]]"
  - "[[feedback-loop]]"
---

# ReAct 范式（ReAct Paradigm）

## 摘要

ReAct（Reason + Act）由 Yao 等人于 2022 年提出，是 AI Agent 最基础的运行范式。核心模式为 Thought → Action → Observation 循环——Agent 边想边做，每一步的观察结果修正下一步的思考。它对应人类"试错迭代"的认知模式，是理解所有 Agent Loop 架构的入口概念。

ReAct 与 Plan-and-Solve、Reflection 构成 Agent 三种经典范式，分别对应人类的试错、规划、反思三种认知策略。

## Claims

### Claim: ReAct 对应人类"试错迭代"认知模式

- **来源**：[[Agent经典范式与人类问题处理模式的映射]]
- **首次出现**：2026-03-25
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> ReAct 就是人类日常最常用的问题处理方式——"试试看"。如调试代码：想可能原因 → 改代码 → 看结果 → 再想下一步。不需要完整计划，靠每一步的反馈推进。

### Claim: ReAct 是 Agent Loop 的最小完备形式

- **来源**：[[Agent经典范式与人类问题处理模式的映射]]
- **首次出现**：2026-03-25
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> Thought → Action → Observation 循环是 Agent 运行的最小完备单元。Plan-and-Solve 在前面加了 Planning 阶段，Reflection 在后面加了 Evaluation 阶段，但核心循环不变。

### Claim: ReAct 的 Skill 组合可由 Google 五种 Pattern 解构

- **来源**：[[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.7
- **状态**：active

> ReAct 的每一步 Action 可以看作一次 Skill 调用，Google 五种 Skill Pattern（Single-tool, Workflow, Router, Autonomous, Orchestrator）描述了 Action 内部的能力组合方式。

## 冲突与演进

- 2026-03-25：首次系统对比三种范式与人类认知模式的映射。

## 关联概念

- [[agent-paradigms]] — `part-of` ReAct 是三种经典范式之一
- [[agent-loop-architecture]] — `implements` ReAct 的 T-A-O 循环是 Agent Loop 的最小实现
- [[feedback-loop]] — `uses` ReAct 每步 Observation 构成微观反馈闭环
- [[negative-feedback]] — `uses` 每次 Observation 与预期的偏差驱动下一步 Thought

## 来源日记

- [[Agent经典范式与人类问题处理模式的映射]] — ReAct 范式完整定义与人类认知对应
- [[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]] — ReAct 与 Skill Pattern 的组合关系
