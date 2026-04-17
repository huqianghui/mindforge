---
title: "强化学习（Reinforcement Learning）"
created: "2026-04-17"
updated: "2026-04-17"
tags:
  - wiki
  - concept
  - ai-theory
  - reinforcement-learning
  - machine-learning
  - agent
aliases:
  - "强化学习"
  - "Reinforcement Learning"
  - "RL"
related:
  - "[[bitter-lesson]]"
  - "[[scaling-laws]]"
  - "[[continual-self-improving-ai]]"
  - "[[agent-paradigms]]"
---

# 强化学习（Reinforcement Learning）

## 摘要

强化学习（Reinforcement Learning, RL）是机器学习的一个分支，核心思想是 Agent 通过与环境交互（trial-and-error）自主学习策略。Rich Sutton 是 RL 领域最重要的奠基人，其核心贡献包括 TD Learning、Policy Gradient、Dyna 架构。

RL Agent 与 LLM Agent 共享"观察 → 决策 → 行动 → 反馈 → 循环"的基本骨架，但在学习机制、环境假设和决策方式上有本质差异。理解这种差异是理解"Harness 本质是对缺失学习能力的工程补偿"这一洞察的基础。

## Claims

### Claim: RL 的核心贡献是 Search + Learning 的统一

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-03-21
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> Sutton 刻意把 Search 和 Learning 并列为"两种利用算力的方法"。在 AlphaZero 中，Search（MCTS）和 Learning（self-play 训练神经网络）同时使用、相互增强——这种 search + learning 的结合是利用算力的最高形态。

### Claim: RL Agent 与 LLM Agent 是"同一个词，两种实体"

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-03-21
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 两者共享观察-决策-行动-反馈循环，但 RL Agent 通过梯度更新内化经验（权重变化），LLM Agent 依赖外部 Harness 提供知识和约束（无权重更新）。这解释了为什么 LLM Agent 需要如此庞大的 Harness——它是对缺失学习能力的工程补偿。

### Claim: Bitter Lesson 不是 RL 论文而是 AI 方法论论文

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-03-21
- **最近更新**：2026-04-17
- **置信度**：0.9
- **状态**：active

> Sutton 从 RL 研究出发，但发现"计算终将胜出"这个规律在所有 AI 子领域都成立。RL 只是他得出这个结论的起点——Bitter Lesson 的适用范围远超 RL。

## 冲突与演进

- 2026-03-21：从 Bitter Lesson 角度首次系统对比 RL Agent 与 LLM Agent。

## 关联概念

- [[bitter-lesson]] — `grounds` RL 研究是 Bitter Lesson 的经验来源
- [[scaling-laws]] — `uses` RL 中 search + learning 的算力扩展遵循 Scaling Laws
- [[continual-self-improving-ai]] — `extends` 自我改进方法试图赋予 LLM Agent 类 RL 的学习能力
- [[agent-paradigms]] — `grounds` RL 的 trial-and-error 是 Agent 范式的理论起点
- [[harness-engineering]] — `contrasts` Harness 是 LLM Agent 对 RL 学习能力缺失的工程补偿

## 来源日记

- [[2026-03-21-The-Bitter-Lesson]] — Section 二-三 RL 的核心贡献与 RL/LLM Agent 对比
