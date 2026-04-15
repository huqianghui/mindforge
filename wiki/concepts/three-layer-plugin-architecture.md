---
title: "Three-Layer Plugin Architecture"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - gsd
  - superpowers
  - gstack
  - architecture
aliases:
  - "GSD + Superpowers + gstack 三层架构"
related:
  - "[[framework-selection]]"
  - "[[harness-engineering]]"
  - "[[claude-code-extension-system]]"
---

# Three-Layer Plugin Architecture

## 摘要

GSD + Superpowers + gstack 构成三层插件架构，各有明确定位：GSD 管"做对的事情"（Spec + Phase + State + Context），Superpowers 管"做事情的方法对"（Engineering Practices），gstack 管"做完能交付"（External World）。三者不是"装更多插件"，而是需要设计清晰的职责边界和交接协议。必须用 CLAUDE.md 声明式路由规则消除 skill 匹配歧义。

## Claims

### Claim: Superpowers 是 workflow-first，gstack 是 tool-first

- **来源**：[[Vibe Coding系列08]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> "Superpowers 是方法论、gstack 是工具箱"是伪二分——两者都是 skill/tool 集合 + workflow 编排的混合体。

### Claim: 三层定位——GSD/Superpowers/gstack

- **来源**：[[Vibe Coding系列08]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> GSD 管"做对的事情"，Superpowers 管"做事情的方法对"，gstack 管"做完能交付"。

### Claim: 没有一个框架能独立覆盖全链路

- **来源**：[[Vibe Coding系列09]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 框架融合不是"装更多插件"，而是设计清晰的职责边界和交接协议。

### Claim: 必须用 CLAUDE.md 声明式路由消除 skill 匹配歧义

- **来源**：[[Vibe Coding系列09]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Claude Code 遇到泛指令时按路由表查表执行而非随机匹配。

## 冲突与演进

（暂无）

## 关联概念

- [[framework-selection]] — `implements` 三层架构是框架选型的具体方案
- [[harness-engineering]] — `part-of` CLAUDE.md 路由是 Harness 的一部分
- [[claude-code-extension-system]] — `uses` 三层架构基于 Claude Code 扩展体系
- [[gsd-five-step-workflow]] — `produces` 实施方法：GSD 五步开发工作流

## 来源日记

- [[Vibe Coding系列08]] — GSD + Superpowers + gstack 三层分析
- [[Vibe Coding系列09]] — 框架融合与路由
