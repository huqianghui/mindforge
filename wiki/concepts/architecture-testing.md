---
title: "Architecture Testing"
created: "2026-04-23"
updated: "2026-04-23"
tags:
  - wiki
  - concept
  - architecture
  - testing
  - vibe-coding
aliases:
  - "架构测试"
  - "可执行架构约束"
  - "Executable Architecture Constraints"
related:
  - "[[harness-quality-gate]]"
  - "[[fitness-functions]]"
  - "[[harness-engineering]]"
---

# Architecture Testing

## 摘要

Architecture Testing（架构测试）是通过可执行的规则引擎对代码结构施加约束的工程实践。其代表工具 ArchUnit 本质上不是测试框架，而是**可执行的架构约束系统**——借用 JUnit 运行环境的静态分析规则引擎，更接近 ESLint 之于 JavaScript 的关系。在 AI Agent 辅助编码（Vibe Coding）时代，LLM 高速生成代码加速了架构腐蚀，架构测试成为 Harness Engineering 质量门禁中不可或缺的一环。

多语言工具生态已形成：Java（ArchUnit/Taikai）、TypeScript（ArchUnitTS/dependency-cruiser/Sheriff）、Python（PyTestArch/Tach）、.NET（NetArchTest/ArchUnitNET）、跨语言（Semgrep/Baseline）。

## Claims

### Claim: ArchUnit 不是测试框架，而是借用 JUnit 运行环境的静态分析规则引擎

- **来源**：[[Vibe Coding系列11：架构测试全景——从ArchUnit到AI辅助架构Review的工具链实践]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.8
- **状态**：active

> ArchUnit 读取编译后的 bytecode，构建依赖图，应用规则，返回违规结果。JUnit 只是它的"运行壳"——伪装成测试是为了零成本接入现有 CI 体系。其本质更接近 ESLint 之于 JavaScript。

### Claim: Vibe Coding 时代架构腐蚀加速，架构约束从可选变为刚需

- **来源**：[[Vibe Coding系列11：架构测试全景——从ArchUnit到AI辅助架构Review的工具链实践]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：active

> 传统开发中架构腐蚀是缓慢过程，但 Coding Agent 每次生成几百行代码时，架构违规速度成倍增长。ArchUnit 类工具是 Harness Engineering 质量门禁中不可或缺的一环。

### Claim: 完整架构质量体系需要四层协作——从格式到约束到分析到 AI Review

- **来源**：[[Vibe Coding系列11：架构测试全景——从ArchUnit到AI辅助架构Review的工具链实践]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：active

> ArchUnit 只覆盖 Layer 2（分层约束）。完整体系：Layer 1 代码格式与 Lint → Layer 2 架构约束执行 → Layer 3 模块化与复用分析 → Layer 4 AI 辅助 Review。在 Vibe Coding 时代，Layer 4 和 Baseline MCP Server 正在成为最有价值的新增层。

### Claim: Baseline MCP Server 是专为 Vibe Coding 时代设计的架构门禁

- **来源**：[[Vibe Coding系列11：架构测试全景——从ArchUnit到AI辅助架构Review的工具链实践]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.5
- **状态**：active

> Baseline 能作为 MCP Server 运行，让 Coding Agent（Cursor、Claude Code 等）在生成代码时直接查询架构规则，实现"生成时即遵守"。

## 冲突与演进

（暂无）

## 关联概念

- [[harness-quality-gate]] — `part-of` 架构测试是 Harness 质量门禁第 2 维度（架构验证）
- [[fitness-functions]] — `implements` 架构测试是适应度函数的具体实现手段之一
- [[harness-engineering]] — `uses` 架构约束是 Harness Engineering 约束系统的重要组成

## 来源日记

- [[2026-04-23-周四]] — Vibe Coding 系列11：架构测试全景文章撰写
