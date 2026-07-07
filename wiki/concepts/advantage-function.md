---
title: "优势函数（Advantage Function）"
created: "2026-07-07"
updated: "2026-07-07"
tags:
  - wiki
  - concept
  - reinforcement-learning
  - advantage
  - variance-reduction
  - policy-gradient
  - ai-theory
aliases:
  - "优势函数"
  - "Advantage Function"
  - "Advantage"
  - "优势"
related:
  - "[[reinforcement-learning]]"
  - "[[rejection-sampling-finetuning]]"
  - "[[skillopt]]"
  - "[[verl]]"
  - "[[online-learning]]"
---

# 优势函数（Advantage Function）

## 摘要

优势函数 $A(s,a)=Q(s,a)-V(s)$ 是强化学习里区分「一个动作好不好」的核心构造——它把**绝对好坏**（reward/return）减掉一个**状态基线** $V(s)$，得到**相对好坏**：这个动作比当前状态下的平均动作强多少。这一步「减基线」不是可有可无的技巧，而是 RL 与 Harness 的分水岭：Harness（memory/RAG/reflection）只用绝对的 reward/结果信号（"这条轨迹成功了，记下来"），而 RL（PPO/GRPO/JitRL）用带基线的 advantage，只推高「比局部平均更好」的动作。基线对同一状态下所有动作是公共的，减掉它**不改变改进方向的期望（无偏）却大幅降低方差**——这在 RL 里的正式名字叫 variance reduction。同一个 advantage 语言可以有完全不同的实现空间：GRPO 用组内归一化把它算进梯度、PPO 用 GAE、JitRL 用非参数 kNN 平均把它加进 logits——advantage 是它们共享的语言，「进梯度还是进 logits」才是它们的分野。

## Claims

### Claim: advantage = 减掉状态基线后的「相对好坏」，与 reward/return 的绝对性相区分

- **来源**：[[2026-07-06-JitRL-无梯度测试时RL论文解读]]
- **首次出现**：2026-07-07
- **最近更新**：2026-07-07
- **置信度**：0.9
- **状态**：active

> 四个量要分清：reward $r_t$（环境/evaluator 给的原始标量，**绝对**——"这一步多好"）；return $G_t=\sum\gamma^{u-t}r_u$（从这步往后的累计折扣回报，**绝对**——"这动作之后总共流入多少 reward"）；value $V(s)$（状态期望回报，**基线**——"这个 state 平均能拿多少"）；advantage $A(s,a)=Q(s,a)-V(s)$（**相对**——"这动作比这个 state 的平均动作好多少"）。关键区别：reward/return 是绝对好坏，advantage 是减掉基线后的相对好坏。而 advantage 依赖一个 value 基线，value 基线正是 RL 的核心构造（Bellman/价值函数）——这就是为什么在 RL 之前的 harness 世界里根本没有"advantage 估计"这回事。

### Claim: 减基线的意义是 variance reduction——抵消「状态本身有多容易」这个公共偏置

- **来源**：[[2026-07-06-JitRL-无梯度测试时RL论文解读]]
- **首次出现**：2026-07-07
- **最近更新**：2026-07-07
- **置信度**：0.85
- **状态**：active

> $Q(s,a)$ 里混了两样东西：① 这个 state 整体有多好（对该 state 下所有动作都一样，故"公共"，与动作好坏无关，故"偏置"）；② 这个动作在这个 state 里比别的动作强多少。减掉 ① 才剩下真正要的 ②。用班级平均分类比：raw $Q$ 是绝对分（普通班考 80、尖子班考 30），$V(s)$ 是班级平均，advantage 是相对本班平均高/低多少——普通班的 80 可能垫底、尖子班的 30 可能第一，判断"选得好不好"要看相对本班平均而非绝对分。因为基线对所有动作公共，减掉它不改变改进方向的期望（**无偏**）却大幅**降方差**——这就是 variance reduction。对把 $\beta\hat A$ 直接加到 logits 的 JitRL 尤其要命：若用 raw $Q$，困难 state 里最该选的动作会被整体压得比简单 state 里最不该选的还低，策略被 state 难易带偏而非被动作好坏引导。

### Claim: 用不用 advantage 是 Harness 与 RL 的分水岭——reward 用法光谱

- **来源**：[[2026-07-06-JitRL-无梯度测试时RL论文解读]]
- **首次出现**：2026-07-07
- **最近更新**：2026-07-07
- **置信度**：0.8
- **状态**：active

> Harness（memory/RAG/reflection）只用 reward/结果——绝对信号、不减基线（"这条轨迹成功了，记下来"）；RL（PPO/GRPO）用 advantage——减基线，只推高"比局部平均更好"的动作。把方法排进"reward 怎么用"的光谱正好看清位置：**RAFT（reward 只当接受/拒绝的过滤阈值，无基线，选完即弃）< RWR（reward 当软权重）< JitRL / PPO / GRPO（用带基线的 advantage）**——越往右 reward 越走进决策/梯度核心。判断一个方法"是不是在做 RL 机器"的一个技术命门就是看它算不算 $Q-V$：算 advantage 的站 PPO 那边，只用 reward 结果的站 harness 这边。

### Claim: 同一个 advantage 语言，多种实现空间——进梯度 vs 进 logits

- **来源**：[[2026-07-06-JitRL-无梯度测试时RL论文解读]]、[[2026-07-07-LifeSkill-边行动边学习的参数化路径]]
- **首次出现**：2026-07-07
- **最近更新**：2026-07-07
- **置信度**：0.8
- **状态**：active

> advantage 估计有多种做法，它们共享"用带基线的相对信号做策略改进"这门语言，分野在 advantage 怎么估、以及往哪里作用：**PPO** 用 value/critic 或 GAE 估 advantage、进策略梯度改参数；**GRPO** 是 critic-less 变体，用同 prompt 多输出的组内平均 reward 当基线算 advantage、进梯度改参数；**JitRL** 用外部 memory 中相似轨迹的 kNN 蒙特卡洛平均估 $\hat Q-\hat V$（无 value network、非参数）、把 $\beta\tilde A$ 加到候选动作 logits 上、不改参数。三者共用 advantage，但 GRPO/PPO 的 advantage 进梯度、改权重，JitRL 的 advantage 进 logits、瞬时生效不改权重——"进梯度还是进 logits"是它们的真正分野。

## 冲突与演进

- 2026-07-07：从 [[2026-07-06-JitRL-无梯度测试时RL论文解读]] 抽取，把散落在 RAFT（reward 当过滤阈值）、skillopt（分数当门控信号）、reinforcement-learning（GRPO 组内相对优势）里的 advantage 相关论据归口成独立原子概念页，补齐 RL cluster 缺失的基础构造页。

## 关联概念

- [[reinforcement-learning]] — `part-of` 优势函数是 RL 策略改进的核心构造，GRPO/PPO/RLVR 都以 advantage 为梯度信号
- [[rejection-sampling-finetuning]] — `contrasts` RAFT 的 reward 只当接受/拒绝阈值（无基线、选完即弃），在 reward 用法光谱最左；advantage 在最右（减基线进梯度）
- [[skillopt]] — `contrasts` SkillOpt 把分数当离散门控信号（accept/reject），RL 把 advantage 当连续梯度信号——分数用法的两条路
- [[verl]] — `uses` verl 实现的 PPO/GRPO 训练内核以 advantage 估计为核心
- [[online-learning]] — `grounds` "算不算 advantage"是判断一个方法在做 RL 机器（而非 harness）的技术命门

## 来源日记

- [[2026-07-06-JitRL-无梯度测试时RL论文解读]] — 第四节 reward/return/value/advantage 四量辨析、减基线的 variance reduction、reward 用法光谱
- [[2026-07-07-LifeSkill-边行动边学习的参数化路径]] — advantage 的非参数（JitRL）vs 参数化（GRPO/PPO）实现对照
