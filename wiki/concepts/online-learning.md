---
title: "在线学习（Online Learning）"
created: "2026-06-29"
updated: "2026-07-07"
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
  - "[[advantage-function]]"
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

### Claim: 「改没改参数」硬标准只判「结果存哪」，不否认 RL 计算在发生

- **来源**：[[2026-07-06-JitRL-无梯度测试时RL论文解读]]
- **首次出现**：2026-07-07
- **最近更新**：2026-07-07
- **置信度**：0.85
- **状态**：active

> JitRL 自称 "Continual Learning Without Gradient Updates"，用本页那条"改没改参数"硬标准一测，会被判成"不改参数 → harness"。但这里要修正一个误读：**硬标准只回答"改进的结果存在哪"，从不是在说"这里没有 RL 计算"**。JitRL 算 $\hat Q-\hat V$（带基线的 advantage，见 [[advantage-function]]）、做 KL 正则的策略改进，是货真价实的 RL（非参数 GPI，见 [[reinforcement-learning]]）——它只是把改进存进外部 memory、在 logits 上瞬时生效，没写回权重。所以经典 RL 焊死的"策略改进"与"参数更新"被 JitRL 拆开了：硬标准判的是后者（身体），不否认前者（大脑）在运作。结论——"改没改参数"是个有用但**粗糙的投影**，够用来区分伪在线学习（harness）与真在线学习，但不够刻画"不改参数却在做 RL"这种新物种。

### Claim: 更细的判据是「学到的知识存在哪」——存储位面

- **来源**：[[2026-07-06-JitRL-无梯度测试时RL论文解读]]
- **首次出现**：2026-07-07
- **最近更新**：2026-07-07
- **置信度**：0.8
- **状态**：active

> 比二值的"改没改参数"更有信息量的轴是「**学到的知识存哪、什么范围生效、是否持久化、跟权重耦不耦合**」。按这根"存储位面"轴排开：prompt/in-context reflection（存 context window，出窗口即丢，解耦）< RAG/长期记忆（外部向量库，持久，全局，解耦）< JitRL memory（外部 $(s,a,G)$ 库，持久，全局但只在相似 state 局部生效，解耦）< LoRA（adapter 权重，持久，全局改分布，绑 base 架构）< 全量微调/在线 policy gradient（base 权重，永久，绑死这个模型）。JitRL 那些"看起来神奇"的性质——可移植（换 base 模型 memory 照用）、可外科式删除坏经验、无灾难性遗忘（append 不 overwrite）——全都来自"知识存外部持久库、与权重解耦"这一个事实。这根轴把 JitRL / XSkill / CURATOR / LifeSkill 连成一张图：前三者在"外部库"一侧（各管存原始经验 / 双粒度技能 / 记忆治理），LifeSkill 跳到"权重"一侧（内化，故不可移植、有遗忘风险，但能内化全新能力）。

### Claim: LifeSkill「理论在线、工程离线」——真在线学习的部署形态是异步/延迟

- **来源**：[[2026-07-07-LifeSkill-边行动边学习的参数化路径]]
- **首次出现**：2026-07-07
- **最近更新**：2026-07-07
- **置信度**：0.8
- **状态**：active

> LifeSkill 是本页定义的"真在线学习"（部署后真改权重）里少见的一个实例，但它暴露了这类方法的工程真相：**理论上满足 online learning 定义（数据 streaming、test-time 更新、逐步改参数），工程上基本不可能真在线**。它的核心循环"失败 → 生成 K 个 skill → 每个 rollout N 次 → verifier 评分 → 训 skill extractor → 再训 policy"本质是一个被 test-time 触发的小型 offline RL 训练循环，成本量级 $O(K\times N\times\text{LLM}+\text{2 次训练})$：latency 爆炸（不能让用户等 rollout+训练）、compute 不可持续、且不满足 real-time CL 三要求（更新慢、无防遗忘、依赖 batch）。准确定位是"test-time triggered offline training loop"——不是 learn *while* acting，而是 learn *after* acting, in mini-batches。所以真在线学习（改参数那一侧）现实的部署形态只能是**异步/延迟在线学习**：fast path 执行 + 异步后台训练 + 周期性热更新，即"不能 real-time CL，只能 offline CL with online data"。这给本页三个致命问题（不稳定/不可控/灾难性遗忘）补了第四个工程约束：**适应延迟**——改参数这次适应能不能塞进部署的延迟预算。这根"适应延迟"轴正好分开 JitRL（不改参数、即时在线）与 LifeSkill（改参数、只能延迟离线），也指向最优架构 hybrid：短期适应用 JitRL（前台改 logits），长期沉淀用 LifeSkill（后台改权重），JitRL 的 memory 顺便当 LifeSkill 的训练数据源。

## 冲突与演进

- 2026-04-17：从控制论词源辨析角度首次厘清在线学习 = 双回路混合系统 = 自适应控制，与 Harness/RL/训练的边界。
- 2026-07-07：从 JitRL / LifeSkill 两篇论文解读补充三条 Claim——硬标准只判"结果存哪"、更细的"存储位面"判据、LifeSkill"理论在线工程离线"与"适应延迟"判据。硬标准被 stress-test 后校准为"粗糙但有用的投影"，不再是唯一判据。

## 关联概念

- [[reinforcement-learning]] — `contrasts` RL 只改参数（慢回路），在线学习同时改行为+参数（双回路）；在线学习的慢回路可以是在线 policy gradient
- [[cybernetics-agent-design]] — `part-of` 在线学习是控制论四概念辨析（控制论/RL/优化/在线学习）的一档，对应控制论中的自适应控制
- [[negative-feedback]] — `uses` 在线学习的快回路就是负反馈控制（error → correction，不改参数）
- [[harness-engineering]] — `contrasts` Harness 是外部控制器不改参数，在线学习把控制器写进模型内部改参数；伪在线学习（memory/RAG/reflection）本质仍是 harness
- [[continual-self-improving-ai]] — `contrasts` CL-RL 四篇（JitRL/XSkill/CURATOR/LifeSkill）在"存储位面"轴与"适应延迟"轴上的分工，是本页硬标准的前沿 stress-test 场

## 来源日记

- [[控制论相关概念澄清——Cybernetics、Harness、强化学习与在线学习]] — 在线学习双回路、自适应控制、硬判断标准、伪在线学习、三个致命问题、Harness-First 优先级
- [[控制论与科学方法论——从控制论到AI Agent设计方法论]] — 控制论五层框架，在线学习作为运行时改参数层的定位
- [[2026-03-21-The-Bitter-Lesson]] — RL 背景下的 learning vs harness 边界
