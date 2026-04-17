---
title: "缩放定律（Scaling Laws）"
created: "2026-04-17"
updated: "2026-04-17"
tags:
  - wiki
  - concept
  - ai-theory
  - scaling
  - computation
  - deep-learning
aliases:
  - "缩放定律"
  - "Scaling Laws"
  - "Scaling Law"
related:
  - "[[bitter-lesson]]"
  - "[[continual-self-improving-ai]]"
  - "[[reinforcement-learning]]"
---

# 缩放定律（Scaling Laws）

## 摘要

Scaling Laws（缩放定律）是描述模型性能与计算资源（参数量、数据量、训练计算量）之间幂律关系的经验公式。它是 Bitter Lesson 的"数学证明"——量化回答了"投入更多计算到底能换来多少性能"这个问题。

Scaling Laws 与 Bitter Lesson 的关系：后者是定性方法论（"计算终将胜出"），前者是定量经验公式（"性能与计算的具体关系"）。两者互补但层次不同。

## Claims

### Claim: Scaling Laws 是 Bitter Lesson 的定量化证明

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-03-21
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> Bitter Lesson 是定性方法论（70 年历史归纳），Scaling Laws 是定量经验公式（性能 ∝ 计算^α 的幂律）。两者的区别：Bitter Lesson 只说"计算终将胜出"，Scaling Laws 具体量化"多少计算换多少性能"。

### Claim: 训练数据需求呈幂律增长

- **来源**：[[2026-03-22-Continually-Self-Improving-AI论文精读笔记]]
- **首次出现**：2026-03-22
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 模型能力提升所需的训练数据量呈幂律增长——这是 Scaling Laws 的实际约束，也是合成数据和自我改进方法出现的驱动力。

## 冲突与演进

- 2026-03-21：从 Bitter Lesson 角度首次系统对比 Scaling Laws。

## 关联概念

- [[bitter-lesson]] — `implements` Scaling Laws 是 Bitter Lesson 的定量化实现
- [[continual-self-improving-ai]] — `constrains` 数据幂律增长约束驱动了自我改进方法
- [[reinforcement-learning]] — `uses` RL 中 search + learning 的算力扩展遵循类似规律

## 来源日记

- [[2026-03-21-The-Bitter-Lesson]] — Section 五 Scaling Laws 与 Bitter Lesson 的精确对比
- [[2026-03-22-Continually-Self-Improving-AI论文精读笔记]] — 训练数据幂律增长约束
