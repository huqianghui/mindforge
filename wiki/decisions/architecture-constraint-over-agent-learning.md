---
title: "架构约束优于 Agent 自主学习：代码复用策略"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - decision
  - agent
  - code-reuse
decision_status: "active"
related_concepts:
  - "[[code-reuse-in-agent-era]]"
  - "[[harness-engineering]]"
related_methods:
  - "[[code-reuse-four-layer-defense]]"
---

# 架构约束优于 Agent 自主学习：代码复用策略

## 背景

Coding Agent 每次会话倾向从头实现功能而非复用已有代码，因为 agent 缺乏项目全局视角。需要决定解决策略：教 agent 学会复用，还是用架构约束强制复用？

## 选项分析

### 选项 A: 让 Agent 自己学会复用

- **优势**：不需要额外配置；理论上更灵活
- **劣势**：Agent 每次会话上下文有限，无法保证跨会话一致性；依赖模型能力提升
- **适用条件**：未来模型具备可靠的长期记忆和项目全局理解时

### 选项 B: 用架构约束强制复用

- **优势**：确定性高——规则一旦声明就生效；不依赖模型能力；CLAUDE.md 是现成机制
- **劣势**：需要人工维护架构规则；规则可能滞后于代码变化
- **适用条件**：当前模型能力下的务实方案

## 决策结论

- **选择**：架构约束强制复用（选项 B），通过四层防线实施
- **理由**：不让 agent 自己学会复用，而是用架构约束让它不得不复用。确定性优于概率性
- **放弃理由**：Agent 自主学习在当前模型能力下不可靠，跨会话上下文丢失严重
- **前提假设**：CLAUDE.md 等机制足够表达架构约束——如果约束表达力不足需寻找更强机制

## 影响范围

- **受影响的概念**：[[code-reuse-in-agent-era]]、[[harness-engineering]]
- **受影响的方法**：[[code-reuse-four-layer-defense]] 完全基于此决策

## 验证状态

- **验证方式**：在项目中配置 CLAUDE.md 架构约束，观察 Agent 是否遵守复用规则
- **当前状态**：未验证（分析充分，实践待开展）
- **验证证据**：待补充

## Claims

### Claim: 四层防线是代码复用的真正解法

- **来源**：[[Vibe Coding系列07]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 不让 agent 自己学会复用，而是用架构约束让它不得不复用。

## 关联概念

- [[code-reuse-in-agent-era]] — `grounds` 问题定义
- [[harness-engineering]] — `uses` CLAUDE.md 约束是 Harness 的核心

## 关联方法

- [[code-reuse-four-layer-defense]] — `produces` 此决策的实施方法

## 来源

- [[Vibe Coding系列07]] — 代码复用问题深度分析
