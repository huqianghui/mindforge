---
title: "Context Explosion"
created: "2026-04-13"
updated: "2026-09-25"
tags:
  - wiki
  - concept
  - context
  - scaling
  - agent
aliases:
  - "Context 爆炸"
  - "上下文爆炸"
related:
  - "[[context-engineering]]"
  - "[[framework-selection]]"
  - "[[gsd-project-scale-selection]]"
  - "[[harness-engineering]]"
  - "[[spec-driven-vs-methodology-framework]]"
---

# Context Explosion

## 摘要

Context 爆炸是当前所有 Spec/Workflow 框架（GSD、Superpowers、OpenSpec）面临的核心 scaling 问题。根因是一个错误的隐含假设：context = state。GSD 采用全量上下文拼接导致线性增长；Superpowers 的 subagent context 在大功能时也会爆炸；OpenSpec 的 Delta 模式只是将一次性爆 context 变成多次局部爆。正确做法是 state 外部存储 + context 按需投影（projection）。

## Claims

### Claim: GSD 采用全量上下文拼接模式

- **来源**：[[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移|Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> document-centric 不是 bug 而是设计，但导致 context 随 plan 数线性增长、无选择加载、模型被迫同时做业务推理和文档解析。

### Claim: GSD 在 L3+ 项目中面临 context 爆炸，本质是 checklist pipeline 而非 skill system

- **来源**：[[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移|Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：stale

> 优化的是可理解性和可审查性，牺牲的是 token efficiency 和 scalable context。L2 项目是 GSD 的"甜蜜点"（见 [[framework-selection]]），L3+ 项目需要补充 Skill Runtime。

### Claim: Superpowers 的核心错位是"用文本分解解决计算分解问题"

- **来源**：[[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移|Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> subagent 的 context 在单个大功能时也会爆炸。

### Claim: OpenSpec Delta 模式只是改变了爆炸时间分布

- **来源**：[[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移|Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> LLM 并不会真的"只看 delta"，delta 仍需还原语义上下文，从"一次性爆 context"变成"多次局部爆 context"。

### Claim: 所有框架共享错误假设 context = state

- **来源**：[[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移|Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 正确做法应是 state 外部存储 + context 按需投影（projection）。

### Claim: CoT 软回溯是推理模型烧 token 与"陷在错误框架出不来"的机制根源

- **来源**：[[2026-09-22-Dream-RSI-递归自我改进论文初读]]
- **首次出现**：2026-09-22
- **最近更新**：2026-09-25
- **置信度**：0.6
- **状态**：active

> 推理模型的思维链只能软回溯：说"等等，前面不对"之后，错误 token 仍留在 context 里继续作为条件分布的一部分，只能靠注意力压低权重、无法像真搜索那样硬回溯（把状态弹出、换分支重来）——搜索状态存在 context window 而非外部结构。这是 CoT 越长越烧 token、且容易陷在错误框架里出不来的机制解释；"CoT 把网络深度换成序列长度"——上下文膨胀在推理模型上的新形态。（论文初读，置信度留低）

## 冲突与演进

（暂无）

## 关联概念

- [[context-engineering]] — `constrains` Context Engineering 的核心挑战之一
- [[harness-engineering]] — `part-of` Context 管理是 Harness 的关键能力
- [[framework-selection]] — `constrains` Context 爆炸影响框架选型决策
- [[gsd-project-scale-selection]] — `constrains` Context 爆炸是 L3/L4 项目的核心挑战
- [[spec-driven-vs-methodology-framework]] — `constrains` Context 爆炸影响框架选型的关键约束

## 来源日记

- [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移|Vibe Coding系列05]] — Context 爆炸问题的系统分析
