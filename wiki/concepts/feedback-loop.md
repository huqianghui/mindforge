---
title: "反馈闭环（Feedback Loop）"
created: "2026-04-17"
updated: "2026-04-17"
tags:
  - wiki
  - concept
  - systems-thinking
  - control-theory
  - harness-engineering
  - knowledge-management
aliases:
  - "反馈闭环"
  - "Feedback Loop"
  - "闭环控制"
related:
  - "[[negative-feedback]]"
  - "[[harness-engineering]]"
  - "[[meta-harness]]"
  - "[[personal-knowledge-compiler]]"
---

# 反馈闭环（Feedback Loop）

## 摘要

反馈闭环是系统将输出结果回传为输入、驱动持续修正的结构性机制。区分"线性工具链"和"控制系统"的关键判据就是：是否有闭环。在 AI Agent 领域，反馈闭环横跨 Harness 工程（执行-评估-修正）、知识管理（实践-提取-验证-更新）和 Meta-Harness（Propose → Evaluate → Log → Repeat）三大领域。

收敛性公式：收敛性 = 约束强度 × 反馈频率 / 执行自由度。没有闭环的系统只能"跑"，不能"收敛"。

## Claims

### Claim: 反馈闭环是区分线性工具链和控制系统的关键

- **来源**：[[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.9
- **状态**：active

> "能跑"和"能收敛"是两回事。没有反馈闭环的 Agent 是线性工具链——执行完就结束；有反馈闭环的 Agent 是控制系统——能根据结果自我修正。

### Claim: Meta-Harness 的四步闭环是自动化 Harness 优化的核心

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> Propose → Evaluate → Log → Repeat 搜索循环将手工 Harness 迭代自动化。完整执行 trace 是不可替代的诊断信号（50.0% vs 仅分数的 34.6%）。

### Claim: 知识管理也需要反馈闭环——日记到 wiki 的循环

- **来源**：[[PKC系列02：个人知识编译器进化——从三层知识模型到持续迭代的知识系统]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 知识流不能是单向的（日记 → wiki）。实践反馈必须回流到知识库——应用方法后的成功/失败应更新 Claims 置信度，形成：日记 → 提取 → wiki → 应用 → 反馈 → wiki 的完整闭环。

## 冲突与演进

- 2026-04-17：反馈闭环概念在三个领域（Agent 工程、知识管理、Meta-Harness）的统一视角首次建立。

## 关联概念

- [[negative-feedback]] — `uses` 负反馈是反馈闭环的驱动机制
- [[harness-engineering]] — `grounds` 反馈闭环是 Harness 认知系统（L6 Eval）的核心
- [[meta-harness]] — `implements` Meta-Harness 是反馈闭环的自动化形式
- [[personal-knowledge-compiler]] — `uses` PKC 的知识迭代依赖实践反馈闭环
- [[generation-evaluation-separation]] — `uses` 分离的评估环节是闭环的关键节点

## 来源日记

- [[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读]] — 线性工具链 vs 控制系统的区分
- [[2026-04-16-Meta-Harness论文解读与实践思考]] — Steering Loop 四步闭环
- [[PKC系列02：个人知识编译器进化——从三层知识模型到持续迭代的知识系统]] — 知识管理反馈闭环
