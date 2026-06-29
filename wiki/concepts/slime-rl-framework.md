---
title: "Slime（数据流式 RL 框架）"
created: "2026-06-29"
updated: "2026-06-29"
tags:
  - wiki
  - concept
  - slime
  - RL-infra
  - reinforcement-learning
  - dataflow
  - framework
aliases:
  - "Slime"
  - "slime"
  - "数据流 RL 框架"
related:
  - "[[verl]]"
  - "[[reinforcement-learning]]"
  - "[[agent-lightning]]"
  - "[[distributed-training-parallelism]]"
---

# Slime（数据流式 RL 框架）

## 摘要

Slime 是一个面向大语言模型后训练的强化学习框架，由清华 THUDM（GLM 模型团队）开发，核心目标是 **RL Scaling**——让 RL 在大规模、多轮 Agent 场景下跑得又快又稳。它与 [[verl]] 同档（infra 级），可理解为 VERL 的另一种架构路线：**VERL 是"调度系统"，Slime 是"数据流系统"。**

Slime 的核心哲学是一句话：**训练（training）与采样（rollout）彻底解耦，用一个 Data Buffer 把二者连接成数据流。** 其设计本质是对 VERL 这类框架"系统化过度"的反思——不把系统拆成 trainer + rollout service + agent framework 三套并存（易陷 glue 代码地狱），而是统一成一个数据流系统。它与 [[agent-lightning]] 的 store 飞轮哲学高度同构。

## Claims

### Claim: 核心哲学是训练与采样彻底解耦、用 Data Buffer 连成数据流闭环

- **来源**：[[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> 三大组件构成闭环：Training（Megatron）→ weight update → Data Buffer（连接训练与采样的数据流中枢）→ rollout data → Rollout（SGLang）→ 回到 Training。最关键的设计理念是 **"Agent workflow = data generation"**：把 Agent RL 直接当作"数据生成问题"处理，而非像 VERL 那样建模成一套 RL workflow 编排系统。这是它出现的动机——作者认为 VERL 过于系统化/抽象，Slime 的解法是统一成单一数据流 pipeline。

### Claim: 技术选型 = Megatron（训练）+ SGLang（推理）+ Ray（轻量调度）

- **来源**：[[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> Slime 的组件选型相当 opinionated（强约束）：训练后端只用 Megatron（支持 TP/PP/EP/MoE，超大模型能力强）；rollout 后端只选 SGLang 一个（看重高吞吐、continuous batching、prefix caching、routing）——这与 VERL 支持 vLLM/SGLang 多 backend 形成鲜明对比，是关键差异点；调度仅用 Ray 的 actor + placement group 做轻量粘合，而非重型中心调度系统。本质是**强制 server-based rollout 架构**——既是简洁来源，也是约束来源。

### Claim: 适合 MoE/超大模型与高吞吐 Agent RL，不适合已在 HF/vLLM 体系或需多 backend 的团队

- **来源**：[[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.75
- **状态**：active

> 适合：Agent RL（多轮）、MoE 大模型训练、高吞吐 rollout、已有 Megatron 体系的团队。不适合：已在 HF/vLLM 体系、需要多 inference backend、想做通用 RL 平台。一句话画像——Slime 是"server-first + dataflow-first"框架，通过将训练/rollout/agent 交互统一到一个数据流水线实现高吞吐大模型 RL；相比 VERL 牺牲部分通用性，换取更简单的系统结构与更强性能。

## 冲突与演进

- 2026-06-29：首次建页，从 Slime vs VERL 深度对比视角厘清其数据流哲学、Megatron+SGLang 强绑定与适用边界。

## 关联概念

- [[verl]] — `contrasts` 同档 RL 框架两条路线：Slime 数据流系统（Training-Buffer-Rollout）vs VERL 调度系统（Controller+Workers）
- [[reinforcement-learning]] — `implements` Slime 是面向 RL Scaling 的大模型 RL 工业实现
- [[agent-lightning]] — `contrasts` agent-lightning 的 store 飞轮与 Slime 的 Data Buffer 数据流哲学同构，比其实际绑定的 VERL 更近
- [[distributed-training-parallelism]] — `uses` 强绑定 Megatron（TP/PP/EP/MoE）做训练后端
- [[prefix-caching]] — `uses` rollout 强绑定 SGLang，倚重其 RadixAttention 前缀复用

## 来源日记

- [[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]] — Slime 定位/哲学/选型/动机、Slime vs VERL 架构级对比、迁移决策
- [[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]] — §六把 Slime 列为 VERL 主要替代品
