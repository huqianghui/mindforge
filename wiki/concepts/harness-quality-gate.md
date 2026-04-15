---
title: "Harness Quality Gate"
created: "2026-04-11"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - devops
  - ci-cd
  - harness
  - quality
aliases:
  - "Harness 质量门禁"
  - "Quality Gate"
related:
  - "[[testcontainers]]"
  - "[[harness-engineering]]"
---

# Harness Quality Gate

## 摘要

Harness 工程质量门禁体系是通过 pre-commit hook + Harness CI pipeline 构建的全链路质量保障方案，涵盖 5 个维度：代码格式 → 架构验证 → 代码检查 → CI 编译/集成测试 → 性能测试。每个维度覆盖 Java、Python、JavaScript/TypeScript 三种主要语言的工具链。

## Claims

### Claim: 质量门禁应覆盖 5 个递进维度——代码格式、架构验证、代码检查、CI 编译、性能测试

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-12
- **置信度**：0.5
- **状态**：active

> 核心思路：通过 pre-commit hook + Harness CI pipeline，从 5 个维度构建质量门禁：① 代码格式检查（pre-commit hook）② 架构测试验证（ArchUnit 及同类工具）③ 代码检查器（Lint / Static Analysis）④ CI 编译与集成测试（Testcontainers）⑤ 性能测试。每个维度对应一组多语言工具链。

### Claim: ArchUnit 是 Java 架构测试的标准工具，Python/JS 有对应替代

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-11
- **置信度**：0.8
- **状态**：active

> Java 用 ArchUnit（包依赖规则、分层架构约束、命名规范、循环依赖检测），Python 用 import-linter / pytestarch，JavaScript/TypeScript 用 dependency-cruiser / eslint-plugin-boundaries。在 Harness CI 中作为测试 step 执行，失败即阻断 pipeline。

## 冲突与演进

（暂无）

## 关联概念

- [[testcontainers]] — `uses` 质量门禁第 4 层的核心集成测试工具
- [[harness-engineering]] — `contrasts` 名称类似但不同概念：Harness Quality Gate 是 DevOps 质量门禁，Harness Engineering 是 AI Agent 系统工程范式
- [[harness-five-dimension-quality-gate]] — `produces` 实施方法：五维质量门禁的详细步骤和工具链

## 来源日记

- [[2026-04-11-周六]] — Harness 工程质量门禁体系的完整 5 维度设计
- [[2026-04-12-周日]] — 追踪任务延续
