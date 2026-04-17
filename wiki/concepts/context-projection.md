---
title: "上下文投影（Context Projection）"
created: "2026-04-17"
updated: "2026-04-17"
tags:
  - wiki
  - concept
  - context-engineering
  - skill-runtime
  - architecture
aliases:
  - "上下文投影"
  - "Context Projection"
  - "按需投影"
related:
  - "[[context-explosion]]"
  - "[[skill-runtime]]"
  - "[[context-engineering]]"
---

# 上下文投影（Context Projection）

## 摘要

上下文投影（Context Projection）是解决 Context 爆炸问题的核心机制。核心洞察：context ≠ state。应将完整状态持久化存储（state → 外部存储），按需将必要部分投影为模型上下文（context → 按需投影）。

这一机制对应 Skill Runtime 三层架构中的 Selection Layer（选择层）：State Layer（持久状态）→ Selection Layer（检索/路由/依赖解析）→ Execution Layer（模型只吃必要上下文）。

## Claims

### Claim: Context 不等于 State——这是所有 Context 爆炸的根因

- **来源**：[[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]]
- **首次出现**：2026-03-22
- **最近更新**：2026-04-17
- **置信度**：0.9
- **状态**：active

> 所有 GSD / Superpowers / OpenSpec 系统都有一个隐含错误假设：context = state。正确做法：state → 外部存储（结构化），context → 按需投影（projection）。

### Claim: Selection Layer 是当前 Harness 工具生态的最大瓶颈

- **来源**：[[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]]
- **首次出现**：2026-03-22
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> State Layer 有成熟方案（数据库、文件系统），Execution Layer 有 LLM。但 Selection Layer（query → select → project → execute）目前没有通用工具——这是 Skill Runtime 需要解决的核心问题。

### Claim: 文档式加载 vs 能力式加载是范式分界线

- **来源**：[[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]]
- **首次出现**：2026-03-22
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> GSD 是文档式加载（document-centric）：plan 越多 → prompt 越大。Skill Runtime 是能力式加载（capability-centric）：按任务需求投影必要上下文。后者是 context 管理的正确方向。

## 冲突与演进

- 2026-03-22：首次提出 context ≠ state 的核心洞察，定义三层架构。

## 关联概念

- [[context-explosion]] — `constrains` 上下文投影是解决 Context 爆炸的核心机制
- [[skill-runtime]] — `implements` Skill Runtime 的 Selection Layer 实现上下文投影
- [[context-engineering]] — `extends` 投影是 Context Engineering 的高级策略
- [[conjugate-transformation]] — `uses` 投影过程本质上是一种共轭变换（选择性编码）

## 来源日记

- [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]] — Section 三 Context Projection 的完整定义
