---
title: "Framework Selection"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - vibe-coding
  - framework
  - gsd
  - superpowers
aliases:
  - "Vibe Coding 框架选型"
related:
  - "[[three-layer-plugin-architecture]]"
  - "[[context-explosion]]"
  - "[[ai-native-pipeline]]"
---

# Framework Selection

## 摘要

Vibe Coding 框架选型的核心原则：规范驱动框架（GSD/SpecKit/OpenSpec）解决"做什么"，方法论框架（Superpowers）解决"怎么做"——两者互补不可互替。GSD/SpecKit/OpenSpec 功能高度重叠只能三选一。项目复杂度应按"需要同时保持在 Context 中的关联信息量"而非代码行数来定级。

## Claims

### Claim: 规范驱动与方法论框架互补不可互替

- **来源**：[[Vibe Coding系列04]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 规范驱动（GSD/SpecKit/OpenSpec）解决"做什么"，方法论（Superpowers）解决"怎么做"。

### Claim: GSD/SpecKit/OpenSpec 只能三选一

- **来源**：[[Vibe Coding系列04]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 三者功能高度重叠（都管"做什么"），Superpowers 管"怎么做"几乎必选搭配。

### Claim: 项目复杂度应按 Context 信息量而非代码行数定级

- **来源**：[[Vibe Coding系列06]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 50 行 LangGraph 编排文件可能比 500 行 CRUD 更复杂。

### Claim: L1 项目不存在 Context Rot，GSD 是纯开销

- **来源**：[[Vibe Coding系列06]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 单文件/脚本级项目应跳过 GSD 直接执行。

### Claim: L2 项目是 GSD 的"甜蜜点"

- **来源**：[[Vibe Coding系列06]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 项目足够复杂需要结构化，但又没复杂到触发 Context 上限。

## 冲突与演进

（暂无）

## 关联概念

- [[three-layer-plugin-architecture]] — `produces` 框架选型的三层架构方案
- [[context-explosion]] — `constrains` Context 爆炸影响框架选型决策
- [[ai-native-pipeline]] — `uses` Pipeline 各阶段需要不同框架
- [[gsd-project-scale-selection]] — `produces` 实施方法：项目规模分级与工具选择决策框架

## 来源日记

- [[Vibe Coding系列04]] — 框架选型分析
- [[Vibe Coding系列06]] — 项目复杂度分级
