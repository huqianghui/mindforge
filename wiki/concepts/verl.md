---
title: "VERL（Volcano Engine RL）"
created: "2026-06-29"
updated: "2026-06-29"
tags:
  - wiki
  - concept
  - VERL
  - RL-infra
  - reinforcement-learning
  - rollout
  - framework
aliases:
  - "VERL"
  - "verl"
  - "Volcano Engine RL"
  - "HybridFlow"
related:
  - "[[reinforcement-learning]]"
  - "[[agent-lightning]]"
  - "[[slime-rl-framework]]"
  - "[[distributed-training-parallelism]]"
---

# VERL（Volcano Engine RL）

## 摘要

VERL（`github.com/volcengine/verl`）是一套面向大规模 LLM 强化学习的**分布式基础设施系统**，而非训练脚本库。它由 ByteDance Seed Team 发起、以火山引擎（Volcano Engine）品牌开源，是论文 *HybridFlow: A Flexible and Efficient RLHF Framework* 的开源实现，近年成为国内外 RLHF / RL-for-LLM 社区使用最广的训练框架之一。

VERL 的设计目标可一句话概括：**让 GPU 利用率最大化，哪怕代价是工程复杂度上升。** 它是 [[agent-lightning]] `algorithm/` 槽位里负责 RL（三级阶梯最高级）的内置算法后端——agent-lightning 选 VERL 不是偏好，而是被 Agent RL"系统问题而非算法问题"的本质所决定。它与 [[slime-rl-framework]] 是同档（infra 级）RL 框架的两条架构路线。

## Claims

### Claim: VERL = Volcano Engine RL，ByteDance Seed Team 发起、HybridFlow 的开源实现

- **来源**：[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.9
- **状态**：active

> 命名拆解为 VE + RL：VE = Volcano Engine（字节跳动对外云服务品牌火山引擎），RL = Reinforcement Learning，把品牌名整体前置（同 AWS SageMaker / Azure ML 命名逻辑）故缩写为 VERL 而非 VRL。出身需区分研发团队与项目归属：最初由 ByteDance Seed Team 发起，后以 Volcano Engine 品牌开源、社区维护（官方 README："verl is a RL training library initiated by ByteDance Seed team and maintained by the verl community"）。技术血缘上 VERL 是论文 HybridFlow 的开源实现，其"单控制器 + 多控制器"混合编排正是该论文核心设计的落地。

### Claim: 三大核心特征——HybridFlow 控制器、training/rollout 解耦、Ray 集群调度

- **来源**：[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> ① HybridFlow 控制器模型：中央 Driver 全流程调度 + 多个 Worker（actor / critic / rollout）并行执行，本质是"小型调度系统 + 一堆分布式 worker"；② training 与 rollout 解耦（核心竞争力）——Engine mode（默认，rollout 与 training 共存同集群、权重共享）与 Server mode（rollout 独立成服务、经 RPC 调用、训练推理彻底分离便于横向扩展）双模式；③ 基于 Ray 的集群级调度（FSDP/Megatron 训练 + vLLM 推理）。此外算法与执行引擎解耦——PPO/GRPO/RLHF/RLVR 皆为可插拔配置项，"让算法替换成为一个配置问题"，与 agent-lightning 上层的 method-agnostic 一脉相承。

### Claim: agent-lightning 对 VERL 是架构锁定，而非简单依赖

- **来源**：[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> agent-lightning 不是"兼容 VERL"，而是"建立在 VERL 类架构的假设之上"，隐式依赖四项能力：多步 Agent→trajectory RL、工具调用→async rollout、高吞吐→分布式 rollout worker、RLVR/自动奖励→自定义 reward pipeline。这套"rollout abstraction + reward pipeline + actor/critic/rollout/reward worker 模型 + Ray runtime"正是 agent-lightning 的 Triplet 轨迹、reward span、store 控制平面在 RL 这一级能落地的前提。本质升维：在 Agent 时代强化学习不再是算法问题而是分布式系统问题，VERL 被选中是因为它解决"系统级 RL"的瓶颈。

### Claim: 最大瓶颈在 rollout 而非训练，理想态是 rollout/training overlap

- **来源**：[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> 经验上 rollout 占 80~90% 时间，training 次要。优化重点是 rollout 是否异步、是否批处理、是否用 vLLM serving；理想状态是"生成第 n+1 批轨迹"与"训练第 n 批"并行（VERL 强项）。三个健康指标：GPU 利用率（rollout/training 是否互相空转）、rollout 吞吐（trajectory/sec）、reward 稳定性（variance 是否发散）。两个典型坑：工具延迟（需 caching/async/mock env）与 reward 设计（Agent 场景 reward 极难设计，重要性甚至高于算法本身）。

### Claim: SFT 与 RL 是两个独立入口，RL 冷启动靠配置 `model.path` 而非自动 SFT

- **来源**：[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> VERL 的 SFT Trainer 与 RL Trainer 是平级、独立的入口（`verl.trainer.fsdp_sft_trainer` vs `verl.trainer.main_ppo`），共享下层 Model Engine（FSDP/Megatron/VeOmni）与 CheckpointEngine，但 RL 启动时**不会自动先做 SFT**。所谓"SFT 冷启动"不是开关而是配置：把 `actor_rollout_ref.model.path` 指向一个已 SFT/Instruct 的 checkpoint。该配置组把 actor/rollout/reference 打包共享同一 `model.path`，故 SFT 模型同时充当 actor 初始权重与 reference policy（KL 锚点）。两种来路：① 直接用现成 Instruct 模型（多数实践，如 Qwen2.5-Instruct）；② 先用 fsdp_sft_trainer 产出 checkpoint 再喂给 main_ppo（SFT→RL 两段式，checkpoint 格式天然衔接）。最佳实践：通用任务直接用 Instruct 模型冷启动；domain gap 大或复刻 R1 式推理才自做 SFT，甚至 SFT→RL→SFT→RL 多轮交替。这与 agent-lightning 跨框架解耦 SFT(unsloth)/RL(verl) 同构——VERL 内部本就把两步解耦。

## 冲突与演进

- 2026-06-29：首次建页，从 agent-lightning 选型视角系统厘清 VERL 的命名出身、三大特征与架构锁定本质。
- 2026-06-29：补充 SFT/RL 双入口与 RL 冷启动配置机制（`model.path` 指向 SFT checkpoint、actor/ref 共享、最佳实践），回应"VERL 是否自动 SFT 冷启动"的疑问。

## 关联概念

- [[reinforcement-learning]] — `implements` VERL 是 LLM RL（PPO/GRPO/RLHF/RLVR）的工业级分布式实现
- [[agent-lightning]] — `part-of` VERL 是 agent-lightning 内置算法（RL 三级阶梯最高级）的后端
- [[slime-rl-framework]] — `contrasts` 同档 RL 框架两条路线：VERL 是调度系统（Controller+Workers），Slime 是数据流系统
- [[distributed-training-parallelism]] — `uses` VERL 训练后端可在 FSDP / Megatron 间二选一，推理用 vLLM / SGLang
- [[prefix-caching]] — `uses` Server mode 下 rollout 用 vLLM/SGLang serving，受益于前缀缓存

## 来源日记

- [[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]] — VERL 命名出身、三大特征、TRL/OpenRLHF 对比、选型逻辑、标准架构数据流
- [[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]] — VERL 的 Controller+Workers 范式、Ray 底座、组件选型对比
