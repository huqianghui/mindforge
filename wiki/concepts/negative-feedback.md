---
title: "负反馈（Negative Feedback）"
created: "2026-04-17"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - cybernetics
  - control-theory
  - agent
  - harness-engineering
aliases:
  - "负反馈"
  - "Negative Feedback"
  - "反馈控制"
related:
  - "[[agent-loop-architecture]]"
  - "[[cybernetics-agent-design]]"
  - "[[feedback-loop]]"
  - "[[harness-engineering]]"
  - "[[loop-engineering]]"
---

# 负反馈（Negative Feedback）

## 摘要

负反馈是控制论的核心机制，定义为系统通过比较当前状态与目标状态的偏差（error = goal - current_state）来驱动修正行为。在 AI Agent 设计中，负反馈是评估-修正循环的理论基础——没有可计算的 error function，就没有可收敛的系统。

负反馈不等于"失败后重试"，而是一个结构化的控制机制：定义误差、量化偏差、驱动修正、逐步收敛。反馈的强度和频率直接决定系统的收敛速度和稳定性。

## Claims

### Claim: 负反馈是 Agent 的"灵魂"——没有 error function 就没有系统

- **来源**：[[控制论与科学方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> 核心公式：error = goal - current_state。没有可计算的 error，就没有系统。不要追求一次成功，要允许逐步逼近。

### Claim: 反馈有三个等级——越结构化越稳定

- **来源**：[[控制论与科学方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> binary（pass/fail，弱）→ scalar（score 分值，中）→ structured（多维指标，强）。越往后越稳定。

### Claim: Agent 设计中正面示范优于反面约束

- **来源**：[[控制论与科学方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> 不能给太多反面例子（"不要做 X"），否则 Agent 变得患得患失。需要正面示范引导收敛方向，这与控制论中"目标函数应该是正向定义的"一致。

### Claim: 收敛性公式中反馈频率是关键因子

- **来源**：[[Claude-Code系列07：Harness分层架构]]
- **首次出现**：2026-04-17
- **最近更新**：2026-11-16
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-16 确认——依据：来源 [[Claude-Code系列07：Harness分层架构]]（2026-10-14 修订），修订后原文仍含本条的数字与结论

> 收敛性 = 约束强度 × 反馈频率 / 执行自由度。反馈频率不足会导致系统 drift，频率越高越容易收敛。

### Claim: 负反馈和 reward 不是"两种反馈形式"——负反馈是纠偏信号、改的是输入、当步生效，reward 是训练信号、改的是参数、影响未来的行为分布

- **来源**：[[控制论相关概念澄清]]
- **首次出现**：2026-04-17
- **最近更新**：2026-11-24
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论

> 常见误解是"控制论 = 负反馈、RL = 奖励函数，都是反馈"。差异在作用层级：负反馈是 error → correction（`u = -K × error`），修正 prompt、工具、流程这些系统输入，当前 step 立即生效，不改模型；reward 是标量信号 → 策略梯度（`θ ← θ + ∇reward`），修正参数，作用在未来的行为分布上。一个在外面纠偏，一个在里面改脑子。实际系统里两者分两层：快回路是运行时控制（prompt shaping、tool routing、eval 反馈、retry、guardrails），目标是当前任务成功；慢回路是训练优化（reward modeling、policy optimization），目标是模型本身变强。所以 memory、RAG、self-reflection 都不改参数，属于快回路的高级 harness，不是学习。

## 冲突与演进

- 2026-11-24：/extract-knowledge 补抽《控制论相关概念澄清》，新增"负反馈与 reward 的区别"一条。

- 2026-04-17：首次从控制论视角系统定义负反馈在 Agent 设计中的角色。
- 2026-11-07：/revalidate 全库复核（证据分类）——长效 4

## 关联概念

- [[cybernetics-agent-design]] — `part-of` 负反馈是控制论三大机制之一
- [[harness-engineering]] — `grounds` 负反馈是 Harness 约束系统的理论基础
- [[feedback-loop]] — `part-of` 负反馈是反馈闭环的核心驱动机制
- [[agent-loop-architecture]] — `uses` Agent Loop 的每次迭代都是一次负反馈修正
- [[loop-engineering]] — `grounds` verifier 上限 = 控制器上限是负反馈控制论的直接推论

## 来源日记

- [[控制论与科学方法论]] — Section 3.3 负反馈的完整定义
- [[控制论相关概念澄清]] — 负反馈与 reward 的作用层级、快慢两层回路
- [[Claude-Code系列07：Harness分层架构]] — 三层控制模型中的负反馈角色
