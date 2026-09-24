---
title: "缩放定律（Scaling Laws）"
created: "2026-04-17"
updated: "2026-09-25"
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
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：stale

> Bitter Lesson 是定性方法论（70 年历史归纳），Scaling Laws 是定量经验公式（性能 ∝ 计算^α 的幂律）。两者的区别：Bitter Lesson 只说"计算终将胜出"，Scaling Laws 具体量化"多少计算换多少性能"。

### Claim: 训练数据需求呈幂律增长

- **来源**：[[2026-03-22-Continually-Self-Improving-AI论文精读笔记]]
- **首次出现**：2026-03-22
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：stale

> 模型能力提升所需的训练数据量呈幂律增长——这是 Scaling Laws 的实际约束，也是合成数据和自我改进方法出现的驱动力。

### Claim: 数据规模-多样性 scaling 在具身域三种数据形态上成立——人类视频预训练、跨平台机器人数据、天然带 action 的驾驶数据

- **来源**：[[落地实践系列01：数据飞轮与VITRA——把人类视频变成机器人的互联网语料]]、[[VLA系列05：π0.5、知识绝缘与实时分块——开放世界泛化、梯度隔离与异步执行]]、[[落地实践系列02：自动驾驶与世界模型的路线交汇——传感器之争、数据飞轮与世界基础模型]]
- **首次出现**：2026-09-17
- **最近更新**：2026-09-25
- **置信度**：0.7
- **状态**：active

> ① VITRA：人类第一视角视频转 VLA 预训练语料，视频数据越多越多样、真机成功率越高（未见物体约 70% 零样本）——scaling law 在人类视频预训练路线成立；② π0.5：97.6% 预训练数据来自非目标平台、环境数 3→104 性能单调上升、去掉跨平台数据则分布外指令遵循崩坏——多样性维度的真机续证；③ 驾驶数据的形态对照：天然自带 observation→action→consequence 三元组 vs VITRA 需伪标注 action——数据形态决定它能喂 policy 还是 dynamics。三者合起来：具身域的 scaling 杠杆在数据多样性与数据形态，不只是规模。

## 冲突与演进

- 2026-03-21：从 Bitter Lesson 角度首次系统对比 Scaling Laws。

## 关联概念

- [[bitter-lesson]] — `implements` Scaling Laws 是 Bitter Lesson 的定量化实现
- [[continual-self-improving-ai]] — `constrains` 数据幂律增长约束驱动了自我改进方法
- [[reinforcement-learning]] — `grounds` RL 中 search + learning 的算力扩展遵循 Scaling Laws

## 来源日记

- [[2026-03-21-The-Bitter-Lesson]] — Section 五 Scaling Laws 与 Bitter Lesson 的精确对比
- [[2026-03-22-Continually-Self-Improving-AI论文精读笔记]] — 训练数据幂律增长约束
