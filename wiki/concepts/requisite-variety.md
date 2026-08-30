---
title: "必要多样性定律（Law of Requisite Variety）"
created: "2026-08-04"
updated: "2026-08-30"
tags:
  - wiki
  - concept
  - cybernetics
  - regulation
aliases:
  - "Requisite Variety"
  - "Ashby 定律"
  - "必要多样性"
  - "Ashby's Law"
related:
  - "[[cybernetics-agent-design]]"
  - "[[negative-feedback]]"
  - "[[forward-deployed-engineer]]"
---

# 必要多样性定律（Law of Requisite Variety）

## 摘要

控制论奠基人 W. Ross Ashby 提出的定律：**调节器的多样性必须不小于扰动的多样性**（$V_{Regulator} \geq V_{Disturbance}$），否则系统无法维持期望状态——"only variety can absorb variety"。它给"调节能力"一个可比较的量纲：面对多少种不同的扰动，你就需要多少种不同的应对手段。在本知识库中它是两条线的共同理论地基：① Harness Engineering / Vibe Coding——约束设计能力的丰富度必须匹配 Agent 任务的不确定性（Vibe Coding 系列13 的 Regulation 框架）；② [[forward-deployed-engineer]]——FDE 作为客户业务系统的外部调节器，其存在条件与天花板都由该定律决定。

## Claims

### Claim: V_Regulator ≥ V_Disturbance——调节器多样性必须匹配扰动多样性

- **来源**：[[Vibe Coding系列13：控制论如何指导Harness Engineering——用Regulation和Requisite Variety让Vibe Coding变得可控]]
- **首次出现**：2026-07-12
- **最近更新**：2026-08-04
- **置信度**：0.8
- **状态**：active

> Ashby 定律翻译为 Harness 语言：约束设计能力的"丰富度"必须匹配任务/环境的"不确定性"。Agent 面对的输入分布越广、失败模式越多，Harness 需要覆盖的约束维度（验证、护栏、回退、上下文管理）就必须相应增多——用单一手段对抗多样扰动注定失控。这是 Harness 复杂度"随任务多样性而生长"的理论依据。

### Claim: 定律决定 FDE 的存在条件——内部 Regulator 有 variety 天花板，外部调节器天然更丰富

- **来源**：[[FDE职业进化论——AI时代前线部署工程师的个人突围与团队重构]]
- **首次出现**：2026-05-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> 三个推论：① 扰动在增长——AI 时代客户面临的变化速度在加快；② 调节器必须共同进化——FDE 能力停滞，客户的扰动终将超过其调节能力（停止进化就失业）；③ 内部 Regulator 有天花板——客户自己的团队只看到自己的业务域，variety 有限；FDE 跨多个客户积累 variety，天然更丰富。跨域视角是内部团队结构性无法自产的 variety 来源。

### Claim: 只要扰动不停止，调节就不会"完成"——Regulation 是持续过程而非一次性交付

- **来源**：[[FDE职业进化论——AI时代前线部署工程师的个人突围与团队重构]]
- **首次出现**：2026-05-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> 市场在变、技术在进化、业务在扩展——被调节系统永远面对新扰动，因此调节器的需求不会消失。这条推论同时解释：Harness 不是"建好就完了"而是需要持续演进（模型升级使旧约束变死重）；FDE 的商业模式悖论（"教会客户就失业"）的前提错误——把持续的调节关系误当成一次性的知识转移。

### Claim: 调节器复杂度应匹配模型不确定性——模型变强后外层调节器降复杂度，说服替代强制

- **来源**：[[Vibe Coding系列14：Harness框架的Skill化收敛——从Agent、Command、Hook全家桶到纯Skill的架构简化]]
- **首次出现**：2026-08-20
- **最近更新**：2026-08-30
- **置信度**：0.75
- **状态**：active

> 必要多样性定律的动态推论：被调节系统（模型）的不确定性下降时，调节器（外层 harness 框架）应同步降低复杂度，否则旧约束变成死重。实证：早期框架用 command+hook 把弱模型"锁"在预设流程里，模型能力上来后硬编排成本收益倒挂——Superpowers 6.x 用 rationalization table（说服文本）替代强制机制，并以 eval campaign 实测文本效果（一处删减实测从 8/10 退化到 5/10 就重做）。这与"Harness 需要持续演进"推论同源：调节器复杂度是随被调节方差动态校准的量，不是一次性设计常数。

## 冲突与演进

- 2026-08-30：注入系列14 调节器降复杂度 Claim（模型变强 → 说服替代强制的动态校准实证）。
- 2026-08-04：建页。此前该定律的内容分散在 [[cybernetics-agent-design]]（Harness 侧应用）中；FDE 文提供第二个独立应用域（组织/商业侧），达到原子概念 2+ 引用门槛后独立建页。

## 关联概念

- [[cybernetics-agent-design]] — `grounds` 为控制论 Agent 设计的"约束维度必须匹配任务不确定性"提供定律依据
- [[forward-deployed-engineer]] — `grounds` FDE 的存在条件（跨客户 variety 优势）与持续调节商业模式的理论地基
- [[negative-feedback]] — `part-of` 同属 Ashby 控制论体系：负反馈是调节的机制，必要多样性是调节的容量条件
- [[harness-engineering]] — `constrains` Harness 的约束丰富度下限由任务扰动多样性决定

## 来源日记

- [[Vibe Coding系列13：控制论如何指导Harness Engineering——用Regulation和Requisite Variety让Vibe Coding变得可控]] — Regulation vs Optimization、定律的 Harness 侧应用
- [[FDE职业进化论——AI时代前线部署工程师的个人突围与团队重构]] — 定律的组织/商业侧应用：FDE 存在条件三推论
