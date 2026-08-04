---
title: "The Bitter Lesson"
created: "2026-04-13"
updated: "2026-08-04"
tags:
  - wiki
  - concept
  - ai-theory
  - sutton
  - scaling
aliases:
  - "Bitter Lesson"
  - "苦涩的教训"
related:
  - "[[continual-self-improving-ai]]"
  - "[[harness-engineering]]"
  - "[[reinforcement-learning]]"
  - "[[scaling-laws]]"
  - "[[method-agnostic]]"
  - "[[agent-lightning]]"
---

# The Bitter Lesson

## 摘要

Rich Sutton 的元原则：利用计算的通用方法（search + learning）最终胜过依赖手工编码人类领域知识的方法——这一规律在国际象棋、围棋、语音识别、计算机视觉等所有 AI 领域反复得到验证。"苦涩"在于心理层面：研究者精心打造的领域知识被简单的"更多计算"碾压，这个模式已重复了 70 年。

## Claims

### Claim: 通用计算方法最终胜过手工领域知识

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> search + learning 最终击败所有 hand-coded human domain knowledge，跨越所有 AI 领域。

### Claim: "苦涩"是心理层面的

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.8
- **状态**：active

> 研究者精心打造的领域知识被简单暴力的"更多计算"碾压，70 年来反复发生。

### Claim: Sutton 不是在推广 RL

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> 是一个跨领域元原则："让计算（search + learning）替代人类知识"，不限于强化学习。

### Claim: 存在四阶段循环

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.8
- **状态**：active

> (1) 编码人类知识 → (2) 短期有效 → (3) 长期停滞 → (4) 对立的计算扩展方法实现突破。

### Claim: 职业版 Bitter Lesson——操作性知识被模型能力吞噬，问题定义/约束设计/跨域迁移存活

- **来源**：[[FDE职业进化论——AI时代前线部署工程师的个人突围与团队重构]]
- **首次出现**：2026-05-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> Bitter Lesson 投射到个人职业层面：凡是"操作性知识"（怎么写某框架代码、某工具的使用步骤）都会被更强模型 + 更多算力吞噬——教 AI 做的每件事都在为自己的替代计时。存活的是三元能力：① **问题定义**——把客户模糊痛点翻译成可解问题（模型只能解已定义的问题）；② **约束设计**——为 AI 划定行为边界与验收标准（Harness 侧工作，见 [[forward-deployed-engineer]]）；③ **跨域迁移**——把 A 领域的解决模式搬到 B 领域（模式识别的输入来自跨现场经验，模型没有你的现场）。个人策略不是和算力赛跑，而是站到算力曲线的乘法位置上。

## 冲突与演进

- 2026-08-04：从 FDE 职业进化论补充职业层投射——操作知识被吞噬、三元能力存活。

## 关联概念

- [[harness-engineering]] — `contrasts` Harness Engineering 是人类知识编码的现代形式，可能面临 Bitter Lesson 挑战
- [[forward-deployed-engineer]] — `grounds` Bitter Lesson 是 FDE 价值锚从操作知识迁移到三元能力的理论依据

## 来源日记

- [[2026-03-21-The-Bitter-Lesson]] — 论文精读笔记
- [[FDE职业进化论——AI时代前线部署工程师的个人突围与团队重构]] — 职业层投射：三元能力存活（2026-05-30）
