---
title: 线性注意力时代的推理架构 · 之一——Transformer / Mamba / GDN 与 Hybrid 架构
created: 2026-06-22
tags: [inference, architecture, transformer, mamba, ssm, gated-deltanet, hybrid-attention, qwen3.5, moe]
---

# 线性注意力时代的推理架构 · 之一——Transformer / Mamba / GDN 与 Hybrid 架构

> 系列开篇。从一个"升级后缓存命中率归零"的生产问题切入，理清 LLM 架构正在发生的范式迁移：从纯 Transformer 走向 **Hybrid（线性注意力 + 全注意力）**。
>
> 本篇聚焦**架构本身**；缓存机制为何失效见 [[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]]，框架支持对比见 [[线性注意力时代的推理架构之三——vLLM与SGLang支持对比与调优]]。
>
> 系列持续更新。

---

## 0. 引子：Qwen3 能缓存，Qwen3.5 命中率为 0

一个真实的客户问题：多模态场景下，Qwen3 的 prefix cache 命中正常，**升级到 Qwen3.5 后命中率一直是 0**。对应 vLLM issue [#43587](https://github.com/vllm-project/vllm/issues/43587)（Mamba-Attention 混合模型上多模态增量请求的 prefix caching 失效）、[#36493](https://github.com/vllm-project/vllm/issues/36493)（Qwen3.5 35B-A3B 命中率长期 <0.1%）。

第一反应容易归因到"多模态"——图像 embedding 放在提示序列最前端，不同请求图像各异，从第一个 token 就分叉，没有公共前缀。这个解释**对，但不完整**：Qwen3（纯文本/文本 MoE）相同条件下不会归零，而 Qwen3.5 即使**纯文本**命中率也极低。

真正的分水岭是**架构变了**：Qwen3.5 不再是纯 Transformer，而是 **Gated DeltaNet（线性注意力）+ Gated Attention（全注意力）的 Hybrid 架构**。要讲清楚命中率为何归零，得先讲清楚这三类架构的差异——这就是本篇的任务。

---

## 1. Transformer（全注意力）

标准 self-attention，每个 token 与之前所有 token 做注意力。

- **计算复杂度**：prefill O(n²)，decode 每步 O(n)。
- **缓存**：KV cache 随序列**线性增长**——每个 token 留下一对 (K, V) 向量。
- **关键性质**：KV 块在 prefill 后**只读、可按 token 粒度共享**。

最后这条性质是后文一切的关键：它让 prefix caching（公共前缀只算一次）成为可能。Transformer 是这套缓存机制的"原生土壤"。

---

## 2. Mamba / SSM（状态空间模型）

Mamba、Mamba-2 用 selective state space 取代注意力。

- **计算复杂度**：序列长度上**线性**（prefill O(n)，decode O(1)/步）。
- **缓存**：不是增长的 KV cache，而是一个**固定大小的循环状态**——每个 head 维护一个 d_k × d_v 的状态矩阵 S，随 token 流式更新。
- **长上下文优势**：状态大小恒定，32k+ 上下文下显存远低于全注意力，吞吐可高一个量级。
- **代价**：固定状态是对历史的**有损压缩**，精确召回（大海捞针类任务）不如全注意力。

一句话：Transformer 用"无限增长的精确记忆"换算力，Mamba 用"固定大小的压缩记忆"换显存。

---

## 3. Gated DeltaNet（GDN）——Qwen3-Next / Qwen3.5 的线性注意力

GDN = **DeltaNet（delta rule：用预测误差更新状态）+ 指数门控（gating / decay）**（论文 [arXiv:2412.06464](https://arxiv.org/abs/2412.06464)）。

本质仍属线性注意力家族（固定大小循环状态），但用 delta rule 改善"写入什么"、用 gating 改善"遗忘多少"，提升了记忆质量。状态更新的直观形式：

```
S_t = g_t · S_{t-1} + k_t ⊗ [ β_t · (v_t − (g_t · S_{t-1})ᵀ k_t) ]
```

- `g_t`：门控/衰减，控制旧状态保留多少；
- `β_t · (v_t − …)`：delta rule，用"新值与当前预测的误差"来更新，而非简单覆盖。

对推理框架而言，GDN 与 Mamba 共享同一个关键属性：**循环状态、原地更新、无 token 级 KV** —— 这就是缓存难题的根源（详见之二）。

---

## 4. Hybrid：把线性与全注意力交错堆叠

纯线性注意力召回差，纯全注意力长上下文显存爆炸——主流解法是**交错堆叠**：大部分层用线性注意力（省显存），少数层用全注意力（保精确召回与全局上下文）。

| 模型 | 混合方式 | 备注 |
|------|---------|------|
| **Qwen3-Next**（2025-09） | GDN : Gated Attention = **3:1**（75% 线性 + 25% 全注意力） | MoE 80B / 3B active，首个旗舰级 Hybrid |
| **Qwen3.5**（2026） | 同样 **3:1** GDN + Gated Attention | MoE：397B-A17B、35B-A3B；Dense：27B |
| **NVIDIA Nemotron-H / Nemotron 3** | Mamba-2 + Self-Attention + MLP | 推理快至 3× |
| **Jamba**（AI21） | Transformer-Mamba 交错 | |
| **Falcon-H1 / Zamba / Bamba（IBM）** | Mamba(-2) + attention 混合 | |

**动机总结**：线性层把 KV cache 显存压成常数，少数全注意力层把精确召回找回来——在长上下文下逼近全注意力的质量，却只花零头的显存。

> 额外复杂度：Qwen3.5 还叠加了 **MoE**（稀疏激活）。架构层面这是另一条正交的优化轴，但它进一步增加了缓存/状态管理与对齐的工程难度（见之三）。

---

## 5. 小结与下篇预告

- 三类架构的本质差异在**"记忆怎么存"**：Transformer = 增长的 KV cache；Mamba/GDN = 固定大小循环状态；Hybrid = 两者交错。
- Qwen3 → Qwen3.5 的"缓存归零"不是 bug，而是架构从纯 Transformer 迁到 Hybrid 的**必然副作用**——prefix caching 这套为 token 级 KV 设计的机制，遇到循环状态就失效了。

下一篇 [[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]] 展开三个根本障碍，以及多模态如何再叠加一层命中率杀手。

---

## 参考

- [Gated DeltaNet 论文 arXiv:2412.06464](https://arxiv.org/abs/2412.06464)
- [Nemotron-H 论文 arXiv:2504.03624](https://arxiv.org/abs/2504.03624)
- [Sebastian Raschka: LLM Architecture Gallery — Hybrid Attention](https://sebastianraschka.com/llm-architecture-gallery/hybrid-attention/)
- [Qwen3-Next 官方博客](https://qwen.ai/blog?id=4074cca80393150c248e508aa62983f9cb7d27cd)
- 起点讨论：与 ChatGPT 的分析对话 [share 链接](https://chatgpt.com/share/6a38ad86-8f38-83ec-98d5-66e4b9831fc6)
