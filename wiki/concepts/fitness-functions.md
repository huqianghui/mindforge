---
title: "Fitness Functions"
created: "2026-04-23"
updated: "2026-04-23"
tags:
  - wiki
  - concept
  - architecture
  - evolutionary-architecture
  - testing
aliases:
  - "架构适应度函数"
  - "适应度函数"
related:
  - "[[architecture-testing]]"
  - "[[harness-quality-gate]]"
---

# Fitness Functions

## 摘要

Fitness Functions（架构适应度函数）是 Neal Ford 等人在《Building Evolutionary Architectures》中提出的概念——用**可执行的自动化检查**持续评估架构特征。它不是一个工具，而是一种思维方式：将架构关注点（分层正确性、耦合度、重复率、性能、安全性）转化为可量化、可自动执行的检查。

实际落地中，适应度函数通常是多种工具组合为 CI pipeline 的一个 stage：ArchUnit 检查分层 + dependency-cruiser 检查循环依赖 + jscpd 检查重复率 + k6 检查性能 + Semgrep 检查安全。

## Claims

### Claim: 适应度函数是将架构关注点转化为可自动执行检查的思维方式

- **来源**：[[Vibe Coding系列11：架构测试全景——从ArchUnit到AI辅助架构Review的工具链实践]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：active

> 概念模型：架构关注点 → 适应度函数 → 工具。例：分层是否正确 → 依赖规则测试 → ArchUnit；模块是否松耦合 → 耦合度指标 < 阈值 → ArchUnitTS LCOM；有无重复代码 → 重复率 < 5% → jscpd。

### Claim: ArchUnitTS 明确定位为 TypeScript 适应度函数框架

- **来源**：[[Vibe Coding系列11：架构测试全景——从ArchUnit到AI辅助架构Review的工具链实践]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：active

> 专用工具包括 ArchFit（通用适应度函数框架）、ArchUnitTS（TypeScript 适应度函数框架，含 LCOM 内聚度指标）。

## 冲突与演进

（暂无）

## 关联概念

- [[architecture-testing]] — `grounds` 架构测试工具是适应度函数的具体实现
- [[harness-quality-gate]] — `extends` 适应度函数将质量门禁从固定检查扩展为可演化的架构评估

## 来源日记

- [[2026-04-23-周四]] — Vibe Coding 系列11 中详细阐述适应度函数概念与工具
