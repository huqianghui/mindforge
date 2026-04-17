---
title: "基于论断的知识模式（Claim-Based Schema）"
created: "2026-04-17"
updated: "2026-04-17"
tags:
  - wiki
  - concept
  - knowledge-management
  - schema
  - personal-knowledge
aliases:
  - "基于论断的知识模式"
  - "Claim-Based Schema"
  - "Claim Schema"
related:
  - "[[personal-knowledge-compiler]]"
  - "[[llm-wiki]]"
  - "[[feedback-loop]]"
---

# 基于论断的知识模式（Claim-Based Schema）

## 摘要

Claim-Based Schema 是 Personal Knowledge Compiler 的核心数据模型——知识库"不存事实，只存论断"。每条 Claim 包含：论断内容、证据来源、置信度（0.0~1.0）和生命周期状态（active/conflicting/outdated/stale）。这种设计承认知识的不确定性和演进性，区别于传统的"是/否"知识存储。

设计哲学：知识不是固定的事实集合，而是带证据的论断的演化系统。

## Claims

### Claim: "不存事实只存论断"是知识系统的设计哲学

- **来源**：[[PKC系列02：个人知识编译器进化——从三层知识模型到持续迭代的知识系统]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-17
- **置信度**：0.9
- **状态**：active

> 传统知识库存储"X 是 Y"（事实），Claim-Based Schema 存储"根据来源 A，X 可能是 Y（置信度 0.8）"（论断）。这承认了知识的不确定性——同一个问题可以有多个置信度不同的论断共存。

### Claim: Claim 生命周期驱动知识自动演进

- **来源**：[[PKC系列02：个人知识编译器进化——从三层知识模型到持续迭代的知识系统]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> active → conflicting（发现矛盾证据）→ outdated（被新证据取代）→ stale（60+ 天未更新）。生命周期状态使知识库能自动标记需要关注的论断，而非被动等待人工检查。

### Claim: 置信度由证据数量和一致性决定

- **来源**：[[PKC系列02：个人知识编译器进化——从三层知识模型到持续迭代的知识系统]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 3+ 独立来源支持 → 置信度 +0.1；有实验/实践验证 → 置信度 0.7+；来源间矛盾 → 标记 conflicting 待人工裁决。

## 冲突与演进

- 2026-04-13：PKC 系列 02 中首次完整定义 Claim-Based Schema 及其自动演进规则。

## 关联概念

- [[personal-knowledge-compiler]] — `part-of` Claim-Based Schema 是 PKC 的核心数据模型
- [[llm-wiki]] — `implements` LLM Wiki 理念通过 Claim-Based Schema 落地
- [[feedback-loop]] — `uses` 实践反馈驱动 Claim 置信度更新

## 来源日记

- [[PKC系列02：个人知识编译器进化——从三层知识模型到持续迭代的知识系统]] — Section 2.1 Claim-Based Schema 完整定义
