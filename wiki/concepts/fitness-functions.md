---
title: "Fitness Functions"
created: "2026-04-23"
updated: "2026-11-07"
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
  - "[[harness-quality-gate]]"
---

# Fitness Functions

## 摘要

Fitness Functions（架构适应度函数）是 Neal Ford 等人在《Building Evolutionary Architectures》中提出的概念——用**可执行的自动化检查**持续评估架构特征。它不是一个工具，而是一种思维方式：将架构关注点（分层正确性、耦合度、重复率、性能、安全性）转化为可量化、可自动执行的检查。

实际落地中，适应度函数通常是多种工具组合为 CI pipeline 的一个 stage：ArchUnit 检查分层 + dependency-cruiser 检查循环依赖 + jscpd 检查重复率 + k6 检查性能 + Semgrep 检查安全。

## Claims

### Claim: 适应度函数是将架构关注点转化为可自动执行检查的思维方式

- **来源**：[[Vibe-Coding系列11：架构测试全景]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：grep 过 fitness function（Notes/Azure/paper/wiki），最新命中仅为 wiki 索引与学习路径页，无与之冲突的更新文章

> 概念模型：架构关注点 → 适应度函数 → 工具。例：分层是否正确 → 依赖规则测试 → ArchUnit；模块是否松耦合 → 耦合度指标 < 阈值 → ArchUnitTS LCOM；有无重复代码 → 重复率 < 5% → jscpd。

### Claim: ArchUnitTS 明确定位为 TypeScript 适应度函数框架

- **来源**：[[Vibe-Coding系列11：架构测试全景]]
- **首次出现**：2026-04-23
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：依据：GitHub LukasNiessen/ArchUnitTS README 有“Architecture Fitness Functions”章节，并说明可作为适应度函数使用 https://github.com/LukasNiessen/ArchUnitTS

> 专用工具包括 ArchFit（通用适应度函数框架）、ArchUnitTS（TypeScript 适应度函数框架，含 LCOM 内聚度指标）。

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——长效 1、确认 1

## 关联概念

- [[harness-quality-gate]] — `extends` 适应度函数将质量门禁从固定检查扩展为可演化的架构评估

## 来源日记

- [[2026-04-23-周四]] — Vibe Coding 系列11 中详细阐述适应度函数概念与工具
