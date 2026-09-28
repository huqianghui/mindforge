---
title: "过程奖励模型（PRM, Process Reward Model）"
created: "2026-08-04"
updated: "2026-09-28"
tags:
  - wiki
  - concept
  - reinforcement-learning
  - reward
  - evaluation
aliases:
  - "PRM"
  - "Process Reward Model"
  - "过程奖励"
  - "ORM vs PRM"
related:
  - "[[advantage-function]]"
  - "[[generation-evaluation-separation]]"
  - "[[reinforcement-learning]]"
  - "[[rejection-sampling-finetuning]]"
---

# 过程奖励模型（PRM, Process Reward Model）

## 摘要

Reward 设计的一个基础分野：**ORM（Outcome Reward Model）给最终结果打分，PRM（Process Reward Model）给推理轨迹的每一步打分**。ORM 数据便宜（偏好对即可）但有"碰运气"风险——结果对了中间过程可能不可靠；PRM 泛化和可信度更好但步骤级标注昂贵。代表工作：OpenAI《Let's Verify Step by Step》（步骤级人工标注）与 Math-Shepherd（用"这一步之后能否走到正确答案"自动生成步骤标签，把标注成本降下来）。在专家知识编译的语境下，PRM 恰是领域专家（如内容工程师）不可替代性的所在：普通标注员只能判断最终结果好坏，专家能标出"这一步想歪了"。

## Claims

### Claim: ORM vs PRM——打分对象、数据成本与风险的三重权衡

- **来源**：[[与AI相处之道二——内容工程师：把只可意会的品味编译成AI可执行的逻辑]]
- **首次出现**：2026-07-28
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> ORM 打分对象是最终结果，数据需求是偏好对（便宜），风险是模型"碰运气"——中间过程不可靠但结果侥幸正确的轨迹会被强化；PRM 打分对象是推理轨迹的每一步，数据需求是步骤级标注（贵），换来泛化和可信度。实操路径通常是 ORM 起步、关键步骤补 PRM。代表工作：《Let's Verify Step by Step》用步骤级人工标注；Math-Shepherd 用"这一步之后能否走到正确答案"的 rollout 结果自动生成步骤标签，绕开人工标注成本。

### Claim: PRM 的标注瓶颈定义了领域专家的不可替代性——"这一步想歪了"只有专家能标

- **来源**：[[与AI相处之道二——内容工程师：把只可意会的品味编译成AI可执行的逻辑]]
- **首次出现**：2026-07-28
- **最近更新**：2026-08-04
- **置信度**：0.7
- **状态**：active

> 内容工程师（及一切领域专家）在 reward 侧的核心价值：普通标注员只能判断最终产出好坏（ORM 级信号），专家能在轨迹中间指出"第③步发散时角度就选错了"（PRM 级信号）。过程隐性、依赖情境判断的能力（"什么时候该沉默、什么时候追问"）无法写成 pipeline，只能靠带步骤级标注的过程样本让模型统计出来——这正是 PRM 数据贵的原因，也是专家经验变现为训练信号的通道。

### Claim: RLVR 信号在真实业务里延迟且稀疏（税务结论几个月后才回来、只在终点给分），PRM 与规则校验、抽样人工复核是三种近端代理——决定哪些右栏任务能靠飞轮迁栏

- **来源**：[[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]]
- **首次出现**：2026-09-26
- **最近更新**：2026-09-28
- **置信度**：0.65
- **状态**：active

> FinOps 系列 02 把 RLVR 的两个工程限制对应到任务级字段表最难填的两项：覆盖面（只有写得出验证器的任务才有 RLVR 信号）与延迟/稀疏（真实验证滞后且终点给分）。后者的工程解法是近端代理：对源单据的规则校验、中间步骤的 PRM、抽样人工复核——[[reward-design-three-inputs]]"确定性规则分白送零噪声信号"说的就是在主观分之外尽可能多接客观分。含义：PRM 的价值不只在数学/代码推理链，在右栏业务任务里它是把"几个月后才知道对错"变成"每一步可即时打分"的手段，是任务能否进入优化阶梯 L2 与内圈 RSI 的门槛条件之一。（FinOps 语境下的推论，单篇）

## 冲突与演进

- 2026-08-04：建页。1 篇深入展开 + 2 处浅引（reward-design-three-inputs、内容工程师文），接近但未满 2+ 深引门槛，经人工裁决建页——PRM/ORM 是 RL reward 侧基础概念，RL cluster 后续文章大概率持续引用。
- 2026-09-28：注入 FinOps 系列 02 Claim——PRM 从训练侧步骤级信号扩展为业务侧"延迟稀疏 RLVR 信号的近端代理"，与规则校验、抽样复核并列。

## 关联概念

- [[reinforcement-learning]] — `part-of` PRM/ORM 是 RL reward 信号设计的基础分类
- [[rejection-sampling-finetuning]] — `uses` 拒绝采样按 reward 筛轨迹，用 ORM 筛结果、用 PRM 可同时筛过程（"过程和结果都好的轨迹才进训练集"）
- [[generation-evaluation-separation]] — `implements` PRM 把评估从"终点验收"细化到"逐步评估"，是评估侧的粒度升级
- [[advantage-function]] — `contrasts` advantage 是从 outcome 反推每步相对贡献（免标注但高方差），PRM 是直接标注每步质量（高成本但低方差）——同一"步骤级信号"问题的两种解法

## 关联方法

- [[reward-design-three-inputs]] — `part-of` ORM/PRM 选择是 reward 设计的输入之一（信噪比与标注预算的权衡）

## 来源日记

- [[与AI相处之道二——内容工程师：把只可意会的品味编译成AI可执行的逻辑]] — ORM vs PRM 对比表、Let's Verify Step by Step / Math-Shepherd、专家标注价值（2026-07-28）
- [[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]] — RLVR 两个工程限制（覆盖面 / 延迟与稀疏）与近端代理三件（2026-09-26）
