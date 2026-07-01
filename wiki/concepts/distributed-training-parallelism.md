---
title: "分布式训练并行（TP/PP/DP/FSDP/Megatron）"
created: "2026-06-29"
updated: "2026-06-29"
tags:
  - wiki
  - concept
  - distributed-training
  - tensor-parallel
  - pipeline-parallel
  - FSDP
  - Megatron
  - PyTorch
aliases:
  - "分布式训练并行"
  - "模型并行"
  - "FSDP"
  - "Megatron"
  - "Tensor Parallelism"
  - "Pipeline Parallelism"
related:
  - "[[verl]]"
  - "[[slime-rl-framework]]"
  - "[[prefix-caching]]"
  - "[[hybrid-linear-attention-architecture]]"
---

# 分布式训练并行（TP/PP/DP/FSDP/Megatron）

## 摘要

分布式训练并行是"当一个模型大到单卡/单机放不下时如何拆开高效训练"的一组策略与系统实现。它是 RL infra（[[verl]] / [[slime-rl-framework]]）脚下的**训练后端层**，也是读懂"为什么 vLLM 有 TP 还需要 Megatron""为什么 PyTorch 本身分布式却还要 FSDP"等高频困惑的钥匙。

核心认知是一条垂直分层：硬件（GPU/NCCL）→ PyTorch（autograd + `torch.distributed` 基础通信原语）→ FSDP / Megatron（建在其上的分布式训练策略）→ RL 框架（VERL / Slime）。**"分布式"不是一个功能，而是一整套系统设计；PyTorch 只是基础，FSDP / Megatron 才是把这套系统真正跑起来的工程实现。**

## Claims

### Claim: FSDP 切的是"存储"，TP/PP 切的是"计算"——这是数据并行与模型并行的分野

- **来源**：[[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> FSDP（Fully Sharded Data Parallel）本质仍是数据并行（DP）+ 参数分片，没有 TP 也没有 PP。以 `y=xW` 为例：TP（切计算）把 W 按列切成 W1|W2，GPU0 只算 y1=xW1、GPU1 只算 y2=xW2 再拼回，每张卡只完成一半矩阵乘；FSDP（切存储）平时各存半个 W 省显存，真要算时先 all-gather 把完整 W 临时拼到每张卡、各自独立算出完整 y（喂不同数据批），算完立即释放。一句话：TP 让多卡"合作完成一次计算"，FSDP 让每卡"独立完成全部计算、只是平时不囤全部参数"。

### Claim: FSDP 逐层 all-gather + 释放，故"拼回全参数"也不 OOM

- **来源**：[[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> FSDP 不是一次性拼回整个模型，而是逐层（layer by layer）"拼—算—丢"：每层 all-gather 凑齐该层完整参数→forward→立即 release 只留分片。例：60GB 模型、单层峰值 2GB、单卡 16GB——一次性拼全需 60GB 必 OOM，而 FSDP 任一时刻只拼当前层（峰值 2GB）+ 长期分片，16GB 卡能跑。本质是"通信换显存/时间换空间"：代价是每层多一次 all-gather，收益是单卡不必长期持有完整模型。"每张卡做完整计算"指在时间上顺序走完所有层，而非某瞬间攥着整个模型。

### Claim: FSDP 多卡是"提效的副本"，TP/PP 多卡是"否则算不了的协作"

- **来源**：[[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> FSDP 下每卡逻辑上都能跑完整模型，多卡动机是提效（显存分片到 1/N、吞吐撑 batch 1024/2048、算力压 wall-clock 到 1/N），卡间互为副本各喂不同数据、最后同步梯度——去掉冗余卡仍能跑只是更慢。TP/PP 多卡是"否则根本算不了"（单卡放不下一层/一次计算），卡间协同组成一个模型缺一不可。这条区别是 FSDP 归属"数据并行家族"而非"模型并行家族"的判定依据。切换边界：只要单卡还能逐层跑完一次前向/反向 FSDP 就够用；一旦连单层都放不下，才必须上 TP/PP。

### Claim: FSDP 是 PyTorch 官方内置，Megatron 是外部项目；适用规模接力而非优劣

- **来源**：[[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> FSDP 来自 `torch.distributed.fsdp`（`FSDP(model)` 即可），无独立 repo；DDP 同为 PyTorch 官方；Megatron（NVIDIA，手动 TP/PP/EP）与 DeepSpeed（ZeRO/显存优化）是外部项目。Megatron = TP + PP + DP + MoE，面向 100B+/超大 MoE/极致吞吐（DeepSeek-V3/R1、GLM、Qwen3 MoE 等都依赖 Megatron 类体系）。二者同处训练层但哲学迥异：FSDP 自动参数分片、抽象高、易用、≤70B；Megatron 手动模型并行、控制细、性能高、100B+。类比：FSDP 像 Python 标准库（官方自带开箱即用），Megatron 像高性能第三方框架。它们是适用规模的接力——FSDP 覆盖"单卡放得下一层"的中段，Megatron 接管"单层都放不下"的顶端。

### Claim: 同名 TP/PP 在推理与训练是两回事——推理只 forward，训练带 backward+梯度+optimizer

- **来源**：[[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> 推理系统（vLLM/SGLang）的 TP/PP 不需反向传播、不同步梯度、无 optimizer，故可轻量高吞吐（推理本质 `输入→forward→输出`）；训练系统（Megatron）的 TP/PP 还要 backward 梯度、all-reduce、1F1B 交错调度、bubble 优化、activation 传递、optimizer state/梯度累积/checkpoint，是完整分布式计算系统、复杂度高一个数量级（训练本质 `forward→loss→backward→gradient→optimizer`）。由此引出常踩的坑："既然 vLLM 都支持 TP 是不是就不需要 Megatron 了？"——错。vLLM 只解决"模型怎么跑（推理）"，Megatron 才解决"模型怎么学（训练）"，只用 vLLM 无法训练（没 optimizer/backward）。

## 冲突与演进

- 2026-06-29：首次建页，整合 Slime vs VERL 栈分层中关于 FSDP/Megatron/PyTorch/推理-训练并行的辨析。

## 关联概念

- [[reinforcement-learning]] — `grounds` 大模型 RL 必须大规模训练，并行策略是其物理前提
- [[prefix-caching]] — `contrasts` 推理并行（vLLM/SGLang TP/PP，无 backward）与训练并行的本质区别
- [[hybrid-linear-attention-architecture]] — `uses` MoE / 超大 Hybrid 模型训练依赖 Megatron 的 EP/TP/PP

## 来源日记

- [[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]] — §三栈分层（Ray/Megatron/FSDP/PyTorch/推理-训练并行）、§3.4 FSDP 深度机制
