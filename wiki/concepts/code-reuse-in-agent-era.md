---
title: "Code Reuse in Agent Era"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - agent
  - code-reuse
  - architecture
aliases:
  - "Agent 时代的代码复用"
related:
  - "[[harness-engineering]]"
  - "[[claude-code-agent-subagent]]"
---

# Code Reuse in Agent Era

## 摘要

Coding Agent 存在结构性复用缺陷：每次会话倾向从头实现功能而非复用已有代码，因为 agent 缺乏项目全局视角。现有框架（Superpowers、gstack、Compound Engineering）均未直接解决此问题。真正的解法是"用架构约束让 agent 不得不复用"——四层防线：CLAUDE.md 架构约束 > FEATURE.md 依赖边界 > Superpowers 流程嵌入复用检查 > Plugin 协作。

## Claims

### Claim: Coding Agent 有结构性代码复用缺陷

- **来源**：[[Vibe Coding系列07]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 每次会话倾向于从头实现功能而非复用已有代码，因为 agent 缺乏项目全局视角——它看到的是当前会话上下文，不是架构蓝图。

### Claim: 现有框架均未直接解决代码复用

- **来源**：[[Vibe Coding系列07]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Superpowers、gstack、Compound Engineering 没有一个直接解决代码复用——CE 是知识复用不是代码复用，单人场景下 CE 与 Claude Code memory 基本等价。

### Claim: 四层防线是代码复用的真正解法

- **来源**：[[Vibe Coding系列07]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 不让 agent 自己学会复用，而是用架构约束让它不得不复用。四层：CLAUDE.md 架构约束（最关键）> FEATURE.md 依赖边界 > Superpowers 流程嵌入复用检查 > Plugin 协作。

## 冲突与演进

（暂无）

## 关联概念

- [[harness-engineering]] — `part-of` CLAUDE.md 架构约束是 Harness Engineering 的一部分
- [[claude-code-agent-subagent]] — `constrains` Subagent 上下文隔离加剧了复用困难
- [[code-reuse-four-layer-defense]] — `produces` 实施方法：四层防线的详细步骤和决策点

## 来源日记

- [[Vibe Coding系列07]] — Coding Agent 代码复用问题分析与解法
