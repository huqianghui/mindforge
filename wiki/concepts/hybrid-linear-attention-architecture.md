---
title: "Hybrid 线性注意力架构（Hybrid Linear-Attention Architecture）"
created: "2026-06-29"
updated: "2026-09-04"
tags:
  - wiki
  - concept
  - inference
  - architecture
  - transformer
  - mamba
  - hybrid-attention
aliases:
  - "Hybrid 架构"
  - "Hybrid Linear-Attention Architecture"
  - "线性注意力+全注意力混合"
  - "Gated DeltaNet"
related:
  - "[[prefix-caching]]"
---

# Hybrid 线性注意力架构（Hybrid Linear-Attention Architecture）

## 摘要

Hybrid 线性注意力架构是 2025–2026 年 LLM 推理架构的范式迁移方向——从纯 Transformer 走向**线性注意力（Mamba/SSM、Gated DeltaNet）与全注意力交错堆叠**。三类架构的本质差异在"记忆怎么存"：Transformer 用随序列线性增长的 KV cache（精确但显存爆炸），Mamba/GDN 用固定大小的循环状态（省显存但有损压缩），Hybrid 把两者交错——大部分层用线性注意力压显存、少数层用全注意力保精确召回。代表模型是 Qwen3-Next 与 Qwen3.5（GDN : Gated Attention = 3:1）、NVIDIA Nemotron-H、Jamba、Falcon-H1 等。这一迁移有一个被低估的工程副作用：为 token 级 KV 设计的 prefix caching 机制遇到循环状态会失效（见 [[prefix-caching]]）。

## Claims

### Claim: 三类架构的本质差异在"记忆怎么存"

- **来源**：[[线性注意力时代的推理架构之一——Transformer-Mamba-GDN与Hybrid架构]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.85
- **状态**：active

> Transformer（全注意力）= 随序列线性增长的 KV cache，每 token 留一对 (K,V)，prefill 后只读、可按 token 粒度共享；prefill O(n²)、decode 每步 O(n)。Mamba/SSM = 固定大小的循环状态矩阵 S（d_k×d_v），流式更新，prefill O(n)、decode O(1)/步，长上下文显存远低但精确召回（大海捞针）弱于全注意力。一句话：Transformer 用"无限增长的精确记忆"换算力，Mamba 用"固定大小的压缩记忆"换显存。

### Claim: GDN（Gated DeltaNet）= delta rule + 指数门控，仍属线性注意力家族

- **来源**：[[线性注意力时代的推理架构之一——Transformer-Mamba-GDN与Hybrid架构]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.8
- **状态**：active

> GDN = DeltaNet（用预测误差更新状态：`S_t = g_t·S_{t-1} + k_t⊗[β_t·(v_t − (g_t·S_{t-1})ᵀk_t)]`）+ 指数门控（gating/decay 控制旧状态保留多少）。delta rule 改善"写入什么"、gating 改善"遗忘多少"，提升记忆质量。但对推理框架而言，GDN 与 Mamba 共享同一关键属性：**循环状态、原地更新、无 token 级 KV**——这正是缓存难题的根源。

### Claim: Hybrid 交错堆叠——多数线性层省显存，少数全注意力层保召回

- **来源**：[[线性注意力时代的推理架构之一——Transformer-Mamba-GDN与Hybrid架构]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.85
- **状态**：active

> 纯线性注意力召回差、纯全注意力长上下文显存爆炸，主流解法是交错堆叠。Qwen3-Next（2025-09，首个旗舰级 Hybrid）与 Qwen3.5（2026）都用 GDN : Gated Attention = 3:1（75% 线性 + 25% 全注意力）；NVIDIA Nemotron-H（Mamba-2 + Self-Attention + MLP，推理快至 3×）、Jamba、Falcon-H1/Zamba/Bamba 同属此类。动机：线性层把 KV cache 显存压成常数，少数全注意力层把精确召回找回来——长上下文下逼近全注意力质量却只花零头显存。Qwen3.5 还叠加 MoE（稀疏激活），是另一条正交优化轴，进一步增加缓存/状态管理难度。

### Claim: Qwen3.5 缓存命中率归零是架构迁移的必然副作用，不是 bug

- **来源**：[[线性注意力时代的推理架构之一——Transformer-Mamba-GDN与Hybrid架构]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.85
- **状态**：active

> 真实客户问题：多模态场景 Qwen3 prefix cache 命中正常，升级 Qwen3.5 后命中率长期为 0（vLLM issue #43587、#36493）。容易误归因到"多模态图像在前导致无公共前缀"——这对但不完整：Qwen3.5 即使纯文本命中率也极低。真正分水岭是架构从纯 Transformer 变成 GDN + Gated Attention 的 Hybrid——prefix caching 这套为 token 级 KV 设计的机制遇到循环状态就失效。详见 [[prefix-caching]]。

### Claim: Hybrid 路线进入商用兑现期——Qwen GDN+QSA 3:1 与 GLM 线性+稀疏+IndexPool 双实现同构；内核级读数 ≠ 端到端读数

- **来源**：[[国内大模型新一轮架构与价格优化——Qwen3.8-Flash与GLM-5.3-Flash的六层降本解剖]]
- **首次出现**：2026-08-31
- **最近更新**：2026-09-04
- **置信度**：0.8
- **状态**：active

> 2026-08-26 同日发布的两款 Flash 模型把 Hybrid 架构推进到"降价武器"阶段：**Qwen3.8-Flash-Next** 每四层一周期（三层 GDN + 一层 Qwen Sparse Attention——轻量索引器把历史序列压成 micro-block 四倍压缩、块级筛相关性、注意力 token 预算约 2048）；**GLM-5.3-Flash** 线性注意力管局部连续 + 稀疏注意力管全局检索 + IndexPool 加权池化压索引 key。两家独立收敛到"多数线性层 + 少数稀疏全局层"，续证交错堆叠主线。读数口径警示：Qwen 官方"1M 上下文 Prefill 快 7.6×/Decode 快 4.9×"是**注意力模块的内核级加速，不代表完整 API 请求同比例快**（还有 MoE、输出层、通信、调度）；GLM"注意力计算量 1/3.01、KV Cache 1/4.44"同为组件级读数，且官方承认 KV Cache 仍大于 Kimi-K3 / DeepSeek-V4-Flash。混合注意力最大的商业价值不是单次请求便宜几分钱，而是**让长时间运行的 Agent 不至于在后半程成本失控**。

## 冲突与演进

- 2026-09-04：注入六层降本文 Claim——Hybrid 从"架构方向"进入"商用兑现"（Qwen/GLM 双 Flash 同日发布），补内核级 vs 端到端读数口径警示。页面脱离 stale（08-21 曾跨线）。
- 2026-06-22：从"Qwen3.5 升级后缓存命中率归零"的生产问题切入，理清 Transformer/Mamba/GDN/Hybrid 四类架构的"记忆怎么存"差异，定位缓存失效是架构迁移的必然代价。

## 关联概念

- [[prefix-caching]] — `constrains` Hybrid 的循环状态破坏了 prefix caching 的三条隐含假设，导致命中率归零
- [[cascaded-pipeline]] — `contrasts` 推理架构选型与级联/端到端管线选型同属"为约束选架构"的工程决策family

## 来源日记

- [[2026-06-22-周一]] — Qwen3.5 Prefix Caching 失效调研、Hybrid 架构与三篇系列文章
- [[线性注意力时代的推理架构之一——Transformer-Mamba-GDN与Hybrid架构]] — Transformer/Mamba/GDN/Hybrid 架构差异
- [[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]] — 循环状态为何破坏前缀缓存
- [[线性注意力时代的推理架构之三——vLLM与SGLang支持对比与调优]] — 框架支持对比与调优
- [[国内大模型新一轮架构与价格优化——Qwen3.8-Flash与GLM-5.3-Flash的六层降本解剖]] — Qwen GDN+QSA 与 GLM 线性+稀疏双实现、内核级读数口径
