---
title: "Continually Self-Improving AI"
created: "2026-04-13"
updated: "2026-07-07"
tags:
  - wiki
  - concept
  - ai-research
  - entigraph
  - sbp
  - self-improving
  - continual-learning
  - test-time-adaptation
aliases:
  - "持续自我改进 AI"
  - "EntiGraph"
  - "SBP"
related:
  - "[[bitter-lesson]]"
  - "[[rag-architecture-comparison]]"
  - "[[scaling-laws]]"
  - "[[rejection-sampling-finetuning]]"
  - "[[online-learning]]"
  - "[[reinforcement-learning]]"
  - "[[advantage-function]]"
---

# Continually Self-Improving AI

## 摘要

当前 LLM 面临三个根本限制：静态权重、有限人类数据依赖、人类设计的训练算法。EntiGraph 通过实体-关系合成语料 + 持续预训练，用比传统 CPT 小约 10,000 倍的源语料实现接近 RAG 的性能。SBP（Synthesis-Based Pretraining）使用高熵训练目标提升跨文档关系建模能力。EntiGraph + RAG 优于纯 RAG，证明知识内化与检索增强互补而非竞争。

## Claims

### Claim: LLM 面临三个根本限制

- **来源**：[[2026-03-22-Continually-Self-Improving-AI论文精读笔记]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.8
- **状态**：active

> 静态权重（有限 context 记忆）、有限人类数据（power-law scaling 触顶）、人类设计的训练算法。

### Claim: EntiGraph 用极小源语料实现接近 RAG 的性能

- **来源**：[[2026-03-22-Continually-Self-Improving-AI论文精读笔记]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.8
- **状态**：active

> 通过实体-关系合成语料 + 持续预训练，源语料可比传统 CPT 小约 10,000 倍。

### Claim: EntiGraph + RAG 优于纯 RAG

- **来源**：[[2026-03-22-Continually-Self-Improving-AI论文精读笔记]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.8
- **状态**：active

> 知识内化与检索增强互补而非竞争。

### Claim: SBP 用高熵训练目标提升跨文档关系建模

- **来源**：[[2026-03-22-Continually-Self-Improving-AI论文精读笔记]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.8
- **状态**：active

> 一个文档映射到多个相关文档，强制模型提炼共享抽象概念。

### Claim: CL-RL 四篇全景——一刀切在「改不改 base 参数」

- **来源**：[[2026-07-06-JitRL-无梯度测试时RL论文解读]]
- **首次出现**：2026-07-07
- **最近更新**：2026-07-07
- **置信度**：0.8
- **状态**：active

> 「持续学习 × LLM Agent」的一批 arXiv 前沿论文共享一个动机：**离线训完的模型部署后不再进化，浪费了部署期海量真实交互的学习信号**。差别全在"怎么把信号用起来"，最锋利的一刀切在**改不改 base 模型参数**。四篇里只有 LifeSkill 真动权重：JitRL（2601.18510，外部 $(s,a,G)$ 经验库 → kNN advantage 重排 logits，不改参数）、XSkill（2603.12056，经验流+技能流双库，不改参数）、CURATOR（2606.25115，预算受限记忆治理+抗投毒，不改参数）都把学到的东西存外部持久记忆；LifeSkill（2606.04815，verifier 引导 + 在线内化，**refines the policy model's parameters**）内化回权重。摆到二维平面看：X 轴=改不改参数、Y 轴=何时适应，"部署后+改参数"这个历来空着的象限被 LifeSkill 独占，"部署后+不改参数"象限则由前三者证明远不止朴素 memory/RAG（还能做 RL-style 策略改进）。（详见 [[online-learning]] 的"存储位面"与"适应延迟"两条判据 Claim。）

### Claim: skill 应「用完即消失」——Agent 应「成为技能」而非「依赖技能」

- **来源**：[[2026-07-07-LifeSkill-边行动边学习的参数化路径]]
- **首次出现**：2026-07-07
- **最近更新**：2026-07-07
- **置信度**：0.8
- **状态**：active

> LifeSkill 对 skill 生命周期的判断比它的算法更有启发：主流 skill-library/skill-injection 默认 skill 是持久外部资产（抽出→存库→检索注入 context，agent 一直依赖它）；LifeSkill 反过来主张 **skill 不该一直存在于 prompt 中，而应最终消失**。机制是 OSI（Online Skill Internalization）：用一条有效 skill 成功完成任务后，**把 skill 从输入里移除**，再用这条"已去掉提示"的成功轨迹训练 policy——skill 描述的本领被内化成模型自己的能力。类比人学开车：初学默念"离合、油门、看后视镜"（skill 在 prompt 里），熟练后消融进肌肉记忆（内化进权重）。这是它和整簇"不改参数"方法的分水岭：那三篇优化"如何更好地用外部拐杖"，LifeSkill 优化"如何把拐杖变成腿"。代价：不可移植、不可外科删除、有灾难性遗忘风险。

### Claim: 持续学习的最优架构很可能是 hybrid——短期 JitRL + 长期 LifeSkill

- **来源**：[[2026-07-07-LifeSkill-边行动边学习的参数化路径]]
- **首次出现**：2026-07-07
- **最近更新**：2026-07-07
- **置信度**：0.8
- **状态**：active

> 非参数（JitRL：即时、低成本、不改参数、能力天花板锁在 base 候选覆盖）与参数化（LifeSkill：延迟、高成本、改参数、能内化全新能力）不是二选一，而可分工到不同时间尺度：**短期适应交给 JitRL**（前台、零延迟、改 logits，把交互结果先写进 memory），**长期沉淀交给 LifeSkill**（后台、异步、把反复复现的模式内化进权重、周期热更新）。JitRL 的 memory 恰好可当 LifeSkill 的训练数据源——两者在数据流上天然衔接。前台负责"现在就变聪明"，后台负责"慢慢真变强"，这是对"AI 应该真正变强（Learning）还是更聪明地用已有能力（Acting）"这个根问题的工程回答：两者兼得。

## 冲突与演进

- 2026-07-07：从 JitRL / LifeSkill 两篇论文解读补充 CL-RL 四篇全景（一刀切在改不改参数）、skill 内化（用完即消失）、hybrid 最优架构三条 Claim，把本页从 EntiGraph/SBP（离线合成语料）延伸到部署后持续学习的 test-time 前沿。

## 关联概念

- [[bitter-lesson]] — `extends` 持续自我改进是 Bitter Lesson（计算胜过人工知识）向部署期学习信号的延伸
- [[rag-architecture-comparison]] — `uses` EntiGraph + RAG 互补关系
- [[online-learning]] — `extends` CL-RL 四篇在"存储位面/适应延迟"轴上的分工，是在线学习硬标准的前沿实例
- [[reinforcement-learning]] — `uses` JitRL 是非参数 GPI、LifeSkill 用 verifier 引导的 RL loop 抽 skill，两者都以 RL 机器为内核
- [[advantage-function]] — `uses` JitRL 用非参数 kNN 估 advantage 做 test-time 策略改进

## 来源日记

- [[2026-03-22-Continually-Self-Improving-AI论文精读笔记]] — 论文精读
