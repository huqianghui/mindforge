---
title: "AutoResearch"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - ai-research
  - automation
  - karpathy
aliases:
  - "AutoResearch"
  - "自动化研究"
related:
  - "[[agent-loop-architecture]]"
  - "[[bitter-lesson]]"
---

# AutoResearch

## 摘要

AutoResearch（Karpathy 提出）不是"AI 做研究"，而是在受控搜索空间中的自动化爬坡——更接近 AutoML 和进化搜索。与 Ralph Loop 的核心区别在于选择机制：Ralph Loop 只有 done/not-done（可行解查找），AutoResearch 有分数比较、历史最优和回滚（优化搜索）。其五约束设计模式（单一可变面、固定评估、强制预算、diff 迭代、自动回滚）是最可复用的模式。

## Claims

### Claim: AutoResearch 是受控搜索空间中的自动化爬坡

- **来源**：[[AutoResearch概念澄清——与Ralph-Loop和AutoML的本质区别]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 不是"AI 做研究"，而是自动化 hill-climbing，更接近 AutoML 和进化搜索。

### Claim: Ralph Loop 与 AutoResearch 的核心区别是选择机制

- **来源**：[[AutoResearch概念澄清——与Ralph-Loop和AutoML的本质区别]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> Ralph Loop 只有 done/not-done（fixed-point iteration），AutoResearch 有 score comparison + history of best + rollback（evolutionary search）。

### Claim: AutoResearch vs AutoML 的区别在搜索空间动态性

- **来源**：[[AutoResearch概念澄清——与Ralph-Loop和AutoML的本质区别]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> AutoML 搜索静态人定义参数空间，AutoResearch 允许 agent 通过修改训练代码创建全新搜索维度。

### Claim: 五约束设计模式是最可复用的模式

- **来源**：[[AutoResearch概念澄清——与Ralph-Loop和AutoML的本质区别]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 单一可变面、固定评估、强制预算、diff 迭代、自动回滚——满足全部五条即可在任意领域进行安全的 autonomous agent 实验。

### Claim: AutoResearch 结构映射到 Agent Runtime

- **来源**：[[AutoResearch概念澄清——与Ralph-Loop和AutoML的本质区别]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> program.md = Skill, train.py = Tool/MCP, prepare.py = Harness, metric = Eval/Feedback, git = Memory, loop = Agent Runtime Loop。

## 冲突与演进

（暂无）

## 关联概念

- [[agent-loop-architecture]] — `uses` AutoResearch 的循环结构本质上是特化的 Agent Loop
- [[bitter-lesson]] — `grounds` AutoResearch 体现了 Bitter Lesson 的"计算胜过人工知识"原则

## 来源日记

- [[AutoResearch概念澄清——与Ralph-Loop和AutoML的本质区别]] — 概念辨析与架构映射
