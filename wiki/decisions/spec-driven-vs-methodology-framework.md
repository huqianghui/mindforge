---
title: "规范驱动 vs 方法论框架：Vibe Coding 工具选型"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - decision
  - vibe-coding
  - framework
decision_status: "active"
related_concepts:
  - "[[framework-selection]]"
  - "[[three-layer-plugin-architecture]]"
  - "[[context-explosion]]"
related_methods:
  - "[[gsd-project-scale-selection]]"
  - "[[gsd-five-step-workflow]]"
---

# 规范驱动 vs 方法论框架：Vibe Coding 工具选型

## 背景

Vibe Coding 生态中存在多个框架（GSD、SpecKit、OpenSpec、Superpowers），容易陷入"装更多插件"的陷阱。需要明确每类框架的定位和选型原则。

## 选项分析

### 选项 A: 只用规范驱动框架（GSD/SpecKit/OpenSpec）

- **优势**：解决"做什么"，提供 Spec 管理
- **劣势**：不管"怎么做"，缺少工程实践引导
- **适用条件**：需求管理是主要瓶颈时

### 选项 B: 只用方法论框架（Superpowers）

- **优势**：解决"怎么做"，工程最佳实践
- **劣势**：不管"做什么"，缺少需求结构化
- **适用条件**：需求已清晰，执行质量是瓶颈时

### 选项 C: 规范驱动 + 方法论互补

- **优势**："做什么" + "怎么做"完整覆盖
- **劣势**：需要设计清晰的职责边界和路由规则，否则 skill 匹配产生歧义
- **适用条件**：L2+ 项目

## 决策结论

- **选择**：规范驱动 + 方法论互补（选项 C），且 GSD/SpecKit/OpenSpec 只能三选一
- **理由**：两类框架解决不同问题，互补不可互替。三个规范驱动框架功能高度重叠，只能选一个
- **放弃理由**：单独使用任何一类都有覆盖盲区
- **前提假设**：必须用 CLAUDE.md 声明式路由消除 skill 匹配歧义——如果路由规则不明确，多框架共存会导致混乱

## 影响范围

- **受影响的概念**：[[framework-selection]]、[[three-layer-plugin-architecture]]
- **受影响的方法**：[[gsd-project-scale-selection]]（框架选型决策框架）、[[gsd-five-step-workflow]]（GSD 具体流程）

## 验证状态

- **验证方式**：在 L2 级项目中使用 GSD + Superpowers 组合，对比单独使用的效果
- **当前状态**：部分验证（Vibe Coding 系列文章中有分析，个人实践有限）
- **验证证据**：Vibe Coding 系列 04/08/09 的分析支持此决策

## Claims

### Claim: 规范驱动与方法论框架互补不可互替

- **来源**：[[Vibe Coding系列04]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 规范驱动（GSD/SpecKit/OpenSpec）解决"做什么"，方法论（Superpowers）解决"怎么做"。

### Claim: GSD/SpecKit/OpenSpec 只能三选一

- **来源**：[[Vibe Coding系列04]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 三者功能高度重叠（都管"做什么"），Superpowers 管"怎么做"几乎必选搭配。

## 关联概念

- [[framework-selection]] — `grounds` 此决策的概念基础
- [[three-layer-plugin-architecture]] — `produces` 决策产物：GSD + Superpowers + gstack 三层架构

## 关联方法

- [[gsd-project-scale-selection]] — `produces` 基于此决策的框架选型方法
- [[gsd-five-step-workflow]] — `produces` 基于此决策的 GSD 执行流程

## 来源

- [[Vibe Coding系列04]] — 框架选型分析
- [[Vibe Coding系列08]] — 三层架构定位
- [[Vibe Coding系列09]] — 框架融合与路由
