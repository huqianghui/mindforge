---
title: "负反馈（Negative Feedback）"
created: "2026-04-17"
updated: "2026-04-17"
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
  - "[[cybernetics-agent-design]]"
  - "[[harness-engineering]]"
  - "[[feedback-loop]]"
---

# 负反馈（Negative Feedback）

## 摘要

负反馈是控制论的核心机制，定义为系统通过比较当前状态与目标状态的偏差（error = goal - current_state）来驱动修正行为。在 AI Agent 设计中，负反馈是评估-修正循环的理论基础——没有可计算的 error function，就没有可收敛的系统。

负反馈不等于"失败后重试"，而是一个结构化的控制机制：定义误差、量化偏差、驱动修正、逐步收敛。反馈的强度和频率直接决定系统的收敛速度和稳定性。

## Claims

### Claim: 负反馈是 Agent 的"灵魂"——没有 error function 就没有系统

- **来源**：[[控制论与科学方法论——从控制论到AI Agent设计方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 核心公式：error = goal - current_state。没有可计算的 error，就没有系统。不要追求一次成功，要允许逐步逼近。

### Claim: 反馈有三个等级——越结构化越稳定

- **来源**：[[控制论与科学方法论——从控制论到AI Agent设计方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> binary（pass/fail，弱）→ scalar（score 分值，中）→ structured（多维指标，强）。越往后越稳定。

### Claim: Agent 设计中正面示范优于反面约束

- **来源**：[[控制论与科学方法论——从控制论到AI Agent设计方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.7
- **状态**：active

> 不能给太多反面例子（"不要做 X"），否则 Agent 变得患得患失。需要正面示范引导收敛方向，这与控制论中"目标函数应该是正向定义的"一致。

### Claim: 收敛性公式中反馈频率是关键因子

- **来源**：[[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 收敛性 = 约束强度 × 反馈频率 / 执行自由度。反馈频率不足会导致系统 drift，频率越高越容易收敛。

## 冲突与演进

- 2026-04-17：首次从控制论视角系统定义负反馈在 Agent 设计中的角色。

## 关联概念

- [[cybernetics-agent-design]] — `part-of` 负反馈是控制论三大机制之一
- [[harness-engineering]] — `grounds` 负反馈是 Harness 约束系统的理论基础
- [[feedback-loop]] — `part-of` 负反馈是反馈闭环的核心驱动机制
- [[agent-loop-architecture]] — `uses` Agent Loop 的每次迭代都是一次负反馈修正

## 来源日记

- [[控制论与科学方法论——从控制论到AI Agent设计方法论]] — Section 3.3 负反馈的完整定义
- [[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读]] — 三层控制模型中的负反馈角色
