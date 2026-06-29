---
title: "在线学习（Online Learning）"
created: "2026-06-29"
updated: "2026-06-29"
tags:
  - wiki
  - concept
  - online-learning
  - control-theory
  - reinforcement-learning
  - harness-engineering
  - adaptive-control
aliases:
  - "在线学习"
  - "Online Learning"
  - "自适应控制"
  - "Adaptive Control"
related:
  - "[[reinforcement-learning]]"
  - "[[cybernetics-agent-design]]"
  - "[[negative-feedback]]"
  - "[[continual-self-improving-ai]]"
---

# 在线学习（Online Learning）

## 摘要

在线学习（Online Learning）是 AI Agent 概念辨析里最容易和「控制论 / 强化学习 / 训练优化」混为一谈的一个——它的独特之处在于**同时跑两个反馈回路**：快回路改行为（控制论范畴，不动参数）、慢回路改参数（学习范畴，延迟生效）。换句话说它把外部控制器写进了模型内部，因此**不能归为 Harness**——Harness 的定义就是「外部控制器，不改模型参数」。在控制论里它有一个精确的对应概念：**自适应控制（Adaptive Control）**——系统在运行中调整自身参数。区分一个操作是 Harness 还是在线学习只需一条硬标准：**有没有改模型参数**？prompt 改写 / tool retry / memory / RAG / self-reflection 全是「不改参数 → Harness（伪在线学习）」；LoRA 热更新 / 在线 policy gradient / weight editing 才是「改参数 → 真在线学习」。当前 LLM Agent 生态绝大多数是「纯 Harness」，这不是技术落后而是工程务实——在线学习的三个致命问题（不稳定、不可控、灾难性遗忘）让行业普遍选择 `Harness-First > Offline Training > Online Learning > RL` 的优先级。

## Claims

### Claim: 在线学习是双回路混合系统，不能归为 Harness

- **来源**：[[控制论相关概念澄清——Cybernetics、Harness、强化学习与在线学习]]
- **首次出现**：2026-04-17
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> 在线学习同时做两件事：①修改当前行为（控制论层，快回路，不改参数，即时纠偏）②修改模型本身（学习层，慢回路，改参数，延迟生效）。这不能简单归为 harness——harness 的定义是「外部控制器，不改模型参数」，而在线学习把控制器写进了模型内部。它在控制论中的精确对应概念是**自适应控制（Adaptive Control）**：系统可以在运行中调整自身参数。

### Claim: 区分 Harness 与学习的硬标准——有没有改模型参数

- **来源**：[[控制论相关概念澄清——Cybernetics、Harness、强化学习与在线学习]]
- **首次出现**：2026-04-17
- **最近更新**：2026-06-29
- **置信度**：0.9
- **状态**：active

> 区分一个操作属于 harness 还是 learning 用一条非常硬的标准：**改没改模型参数**？prompt 改写、tool retry、memory/RAG、scratchpad/context injection、self-reflection 全是「❌不改参数 → harness（控制）」；LoRA 动态更新、online policy gradient、weight editing 才是「✅改参数 → learning」。由此推出 LLM Agent 里的「伪在线学习」：Memory+RAG / Scratchpad / Self-reflection 都只改输入上下文不改权重，本质是高级 harness 而非真学习。

### Claim: 行业选择 Harness-First，因为在线学习有三个致命问题

- **来源**：[[控制论相关概念澄清——Cybernetics、Harness、强化学习与在线学习]]
- **首次出现**：2026-04-17
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> 在线学习的理想是「边用边学、持续进化」，但有三个致命问题：①**不稳定**（在线更新易发散，尤其 noisy reward 下）②**不可控**（reward/loss 噪声直接传导到参数更新）③**灾难性遗忘**（新数据覆盖旧能力）。所以行业现实路线是 `Harness-First > Offline Training > Online Learning > RL`——Layer 1 控制层可控、可解释、立刻见效。当前 LLM Agent 绝大多数只工作在 Layer 1（harness），偶尔触及 Layer 3（离线训练），极少涉及 Layer 2（在线学习）。这不是技术落后而是工程务实。

### Claim: 真正前沿的问题是用 Harness 模拟 learning

- **来源**：[[控制论相关概念澄清——Cybernetics、Harness、强化学习与在线学习]]
- **首次出现**：2026-04-17
- **最近更新**：2026-06-29
- **置信度**：0.75
- **状态**：active

> 比「在线学习是不是 harness」更有价值的问题是：**能不能用 harness 模拟 learning**？memory+retrieval ≈ 参数更新（把经验存外部而非权重）；self-reflection ≈ policy improvement（不改权重只改决策流程）；Meta-Harness ≈ automated harness optimization（用搜索替代梯度下降）。这些方向比直接做 RL 更现实，也更符合当前 LLM Agent 的工程约束。一个更狠的推论：RL 很可能只是「自动化 harness 的一种极端形式」。

## 冲突与演进

- 2026-04-17：从控制论词源辨析角度首次厘清在线学习 = 双回路混合系统 = 自适应控制，与 Harness/RL/训练的边界。

## 关联概念

- [[reinforcement-learning]] — `contrasts` RL 只改参数（慢回路），在线学习同时改行为+参数（双回路）；在线学习的慢回路可以是在线 policy gradient
- [[cybernetics-agent-design]] — `part-of` 在线学习是控制论四概念辨析（控制论/RL/优化/在线学习）的一档，对应控制论中的自适应控制
- [[negative-feedback]] — `uses` 在线学习的快回路就是负反馈控制（error → correction，不改参数）
- [[continual-self-improving-ai]] — `extends` 在线学习（LoRA 热更新/在线 policy gradient）是持续自我改进的理想形态，但受三个致命问题约束
- [[harness-engineering]] — `contrasts` Harness 是外部控制器不改参数，在线学习把控制器写进模型内部改参数；伪在线学习（memory/RAG/reflection）本质仍是 harness

## 来源日记

- [[控制论相关概念澄清——Cybernetics、Harness、强化学习与在线学习]] — 在线学习双回路、自适应控制、硬判断标准、伪在线学习、三个致命问题、Harness-First 优先级
- [[控制论与科学方法论——从控制论到AI Agent设计方法论]] — 控制论五层框架，在线学习作为运行时改参数层的定位
- [[2026-03-21-The-Bitter-Lesson]] — RL 背景下的 learning vs harness 边界
