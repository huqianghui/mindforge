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
- **状态**：stale

> Sutton 刻意把 Search 和 Learning 并列为"两种利用算力的方法"。在 AlphaZero 中，Search（MCTS）和 Learning（self-play 训练神经网络）同时使用、相互增强——这种 search + learning 的结合是利用算力的最高形态。

### Claim: RL Agent 与 LLM Agent 是"同一个词，两种实体"

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-03-21
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：stale

> 两者共享观察-决策-行动-反馈循环，但 RL Agent 通过梯度更新内化经验（权重变化），LLM Agent 依赖外部 Harness 提供知识和约束（无权重更新）。这解释了为什么 LLM Agent 需要如此庞大的 Harness——它是对缺失学习能力的工程补偿。

### Claim: Bitter Lesson 不是 RL 论文而是 AI 方法论论文

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-03-21
- **最近更新**：2026-04-17
- **置信度**：0.9
- **状态**：stale

> Sutton 从 RL 研究出发，但发现"计算终将胜出"这个规律在所有 AI 子领域都成立。RL 只是他得出这个结论的起点——Bitter Lesson 的适用范围远超 RL。

### Claim: LLM RL 的四种形态——PPO/GRPO/RLHF/RLVR，最终都收敛到 rollout↔training 交替

- **来源**：[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> 大模型语境下 RL 主要四种形态：PPO（actor+critic 两套网络，RLHF 标准内核）、GRPO（组内相对优势替代独立 critic、省显存，近年主流）、RLHF（奖励来自人类偏好训练的奖励模型）、RLVR（奖励来自可自动验证规则如数学答案/代码通过测试，无需奖励模型，Agent 场景最常用）。算法层差异最终都收敛到同一工程结构：生成数据（rollout）与更新模型（training）两阶段交替。与 SFT 的本质分野：SFT 模仿正样本、便宜稳定但受限于已有能力；RL 用试错探索换更高上界，代价是最贵、最不稳。

### Claim: Rollout 与 Epoch 是两个维度——数据采集 vs 优化，不是层级关系

- **来源**：[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> Rollout 属数据采集维度（Agent 实际执行了多少次任务，一条"提问→Search→Observation→Answer"即一条 rollout，`1000 rollouts` = 采集 1000 条轨迹）；Epoch 属优化维度（采集到的数据被反复学习几遍，`epoch 3` = 这批轨迹训练 3 次）。监督学习对应物：rollout ≈ sample/trajectory 而非 epoch。标准流程先后关系：收集 rollouts（policy_v1 产 1000 条轨迹）→ 计算 reward → 训练（这 1000 条跑 epoch1→2→3）。这也是 RL 日志刻意分 `Collect Rollouts` 与 `Optimize Epochs` 两段统计的原因，是读懂"rollout 与 training 解耦"的前提。

### Claim: Agent 时代 RL 是分布式系统问题而非算法问题——单轮→多步轨迹的分水岭

- **来源**：[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> 传统 RLHF 假设单轮交互（`prompt→model→output→reward→update`，同步简单）；Agent 真实执行是多步轨迹（思考→调工具→观察→再决策→…→最终答案获 reward），具备四个传统 RL 不具备的特征：多轮、有状态、异步、依赖外部环境（API/DB/浏览器/代码执行器）。这四个特征使瓶颈从「算法」迁移到「基础设施」：rollout 占 80~90% 时间、需 training-rollout 解耦避免 GPU 互相空转。由此 Agent RL 的本质升维——不再是「怎么写 PPO loss」，而是「rollout 机制 + 训练推理解耦 + 分布式编排」的系统问题，框架选型（见 [[verl]]/[[slime-rl-framework]]）几乎必然建立在分布式基础设施架构之上。

## 冲突与演进

- 2026-03-21：从 Bitter Lesson 角度首次系统对比 RL Agent 与 LLM Agent。
- 2026-06-29：从 agent-lightning 系列 07 补充 LLM RL 四形态、Rollout vs Epoch 维度辨析、Agent RL=系统问题的分水岭，并关联 VERL/Slime 两大 RL infra 框架。

## 关联概念

- [[bitter-lesson]] — `grounds` RL 研究是 Bitter Lesson 的经验来源
- [[scaling-laws]] — `uses` RL 中 search + learning 的算力扩展遵循 Scaling Laws
- [[continual-self-improving-ai]] — `extends` 自我改进方法试图赋予 LLM Agent 类 RL 的学习能力
- [[agent-paradigms]] — `grounds` RL 的 trial-and-error 是 Agent 范式的理论起点
- [[harness-engineering]] — `contrasts` Harness 是 LLM Agent 对 RL 学习能力缺失的工程补偿
- [[rejection-sampling-finetuning]] — `contrasts` RAFT 用 reward 只过滤不进梯度，是"RL 的数据哲学 + SFT 的更新机制"，SFT 到顶后升级到 RL
- [[automatic-prompt-optimization]] — `contrasts` APO 把 reward 用于离线 prompt 搜索，RL 把 reward 当梯度信号；同属 method-agnostic 阶梯
- [[agent-lightning]] — `part-of` VERL（RL）是 agent-lightning 内置算法，三级阶梯最高级，需 SFT warmup
- [[online-learning]] — `contrasts` RL 只改参数，在线学习同时改行为+参数（双回路）；在线学习的慢回路可以是在线 policy gradient
- [[skillopt]] — `contrasts` SkillOpt 把分数当选择/门控信号（离散筛选），RL 把 reward 当梯度信号（连续参数更新）

## 来源日记

- [[2026-03-21-The-Bitter-Lesson]] — Section 二-三 RL 的核心贡献与 RL/LLM Agent 对比
