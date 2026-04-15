---
title: "Context Explosion"
created: "2026-04-13"
updated: "2026-04-13"
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
  - "[[skill-runtime]]"
  - "[[harness-engineering]]"
---

# Context Explosion

## 摘要

Context 爆炸是当前所有 Spec/Workflow 框架（GSD、Superpowers、OpenSpec）面临的核心 scaling 问题。根因是一个错误的隐含假设：context = state。GSD 采用全量上下文拼接导致线性增长；Superpowers 的 subagent context 在大功能时也会爆炸；OpenSpec 的 Delta 模式只是将一次性爆 context 变成多次局部爆。正确做法是 state 外部存储 + context 按需投影（projection）。

## Claims

### Claim: GSD 采用全量上下文拼接模式

- **来源**：[[Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> document-centric 不是 bug 而是设计，但导致 context 随 plan 数线性增长、无选择加载、模型被迫同时做业务推理和文档解析。

### Claim: GSD 本质是 AI 驱动的 checklist pipeline 而非 skill system

- **来源**：[[Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 优化的是可理解性和可审查性，牺牲的是 token efficiency 和 scalable context。

### Claim: Superpowers 的核心错位是"用文本分解解决计算分解问题"

- **来源**：[[Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> subagent 的 context 在单个大功能时也会爆炸。

### Claim: OpenSpec Delta 模式只是改变了爆炸时间分布

- **来源**：[[Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> LLM 并不会真的"只看 delta"，delta 仍需还原语义上下文，从"一次性爆 context"变成"多次局部爆 context"。

### Claim: 所有框架共享错误假设 context = state

- **来源**：[[Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 正确做法应是 state 外部存储 + context 按需投影（projection）。

## 冲突与演进

（暂无）

## 关联概念

- [[context-engineering]] — `constrains` Context Engineering 的核心挑战之一
- [[skill-runtime]] — `produces` Skill Runtime 的按需投影是 Context 爆炸的解法方向
- [[harness-engineering]] — `constrains` Context 管理是 Harness 的关键能力

## 来源日记

- [[Vibe Coding系列05]] — Context 爆炸问题的系统分析
