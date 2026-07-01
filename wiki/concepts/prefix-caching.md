---
title: "前缀缓存（Prefix Caching）"
created: "2026-06-29"
updated: "2026-06-29"
tags:
  - wiki
  - concept
  - inference
  - prefix-caching
  - kv-cache
  - vllm
  - sglang
aliases:
  - "前缀缓存"
  - "Prefix Caching"
  - "Prefix Cache"
related:
  - "[[hybrid-linear-attention-architecture]]"
---

# 前缀缓存（Prefix Caching）

## 摘要

前缀缓存是 LLM 推理的核心省算优化：多条请求开头若干 token 完全相同时，这段公共前缀的 KV 只算一次、供所有请求共享，省掉重复 prefill。它隐含两条假设——缓存单位是 token 粒度的 (K,V)、且 KV prefill 后只读可任意共享——纯 Transformer 完美满足。但 2025–2026 年的架构迁移把它推到了失效边缘：Hybrid 线性注意力架构（见 [[hybrid-linear-attention-architecture]]）的线性层维护的是固定大小的循环状态，三条假设全破（原地更新无法定位前缀、状态体积大一个量级、kernel 只能 chunk 边界 checkpoint）。结果是 Qwen3.5 这类 Hybrid 模型即使显式开 `--enable-prefix-caching`，命中率也长期为 0。Hybrid 还要同时管两套异构缓存，多模态"图像在前"再截断公共前缀，speculative decoding 与之争用同一套状态存档能力——多个杀手叠加，命中趋近于零。

## Claims

### Claim: prefix caching 成立的两条隐含假设

- **来源**：[[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.9
- **状态**：active

> prefix caching 的前提是多条请求开头若干 token 完全相同，这段公共前缀的 KV 只需算一次、结果供所有请求共享，省掉重复 prefill。它成立的隐含假设有两条：① 缓存单位是**按 token 粒度**的 (K,V)；② 这些 KV 块 prefill 后**只读、可任意共享**。纯 Transformer 完美满足这两条——这正是它能跨请求复用前缀的原因。

### Claim: 线性注意力的循环状态破坏 prefix caching 的三条假设

- **来源**：[[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.85
- **状态**：active

> 线性注意力/SSM 层维护的不是 token 级 KV，而是固定大小的循环状态，带来三个结构性障碍（参考 PyTorch 博客 Hybrid Models Meet SGLang）：①**原地更新**——`S_t = f(S_{t-1}, x_t)` 是覆盖式更新，旧值被吃掉，无法回滚到第 k 个 token 的状态，而前缀复用本质要求"能定位到某前缀位置的状态"；②**体积大**——缓存一个前缀要存完整的 d_k×d_v 状态矩阵而非单 token 的 (K,V) 向量，单位前缀成本高一个量级；③**全有或全无**——前向 kernel 按 chunk 计算，只能在完整 chunk 边界 checkpoint，前缀长度不对齐到 chunk 边界就一点都复用不了。

### Claim: Hybrid 难点在同时管两套异构缓存，对齐策略牺牲短请求命中

- **来源**：[[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.85
- **状态**：active

> Hybrid 模型里全注意力层和线性层交错存在，做 prefix caching 必须**同时**维护两套缓存：全注意力层的 token 级 KV 块（可逐 token 共享）+ 线性层的 chunk 级状态快照（只能在对齐边界复用）。两套缓存的粒度、生命周期、淘汰策略都不同；更麻烦的是为了对齐，框架往往把 attention 的 block size 强行对齐到线性层的 chunk/page 大小——vLLM 因此把 block size 对齐到 528 tokens，**短请求直接落不到任何可复用边界、命中率归零**。这就是纯 Transformer 的 Qwen3 缓存正常、Hybrid 的 Qwen3.5 命中极低的根因：不是 bug，是架构迁移的必然代价。

### Claim: 多模态"图像在前"是独立叠加的命中率杀手

- **来源**：[[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.8
- **状态**：active

> 视觉语言模型（Qwen-VL 家族）再加一层问题：图像 token 被 `<|vision_start|>…<|vision_end|>` 包裹、按惯例置于用户消息最前。于是不同请求的图像各不相同 → 序列从图像区第一个 token 起就分叉；能共享的只剩 system prompt 那一小段文本前缀；图像之后即便文字相同也因前缀已分叉而无法复用。注意：Qwen2-VL 起采用**动态分辨率**，单图视觉 token 数不是固定 576，而是 4~16384 随分辨率变化——数字会变，但"图像在前 + 各请求不同"的结构事实不变。对 Qwen3.5-VL，"图像在前"（多模态杀手）和"Hybrid 架构"（架构杀手）是两个独立但叠加的杀手，两者叠加命中率自然趋近 0。此外图像 KV 不能跨请求复用——强行复用会破坏 mRoPE 位置编码导致新旧图像混淆。

### Claim: speculative decoding 与 prefix caching 在 Hybrid 上争用同一套状态存档能力

- **来源**：[[2026-06-22-周一]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.8
- **状态**：active

> 社区实测（Qwen3.6-27B + vLLM nightly）：**关掉 speculative decoding 后 prefix cache 命中恢复**——命中 0 时优先试这一招。冲突根源不是 prefill/decode 阶段之争，而是 Hybrid 状态管理瓶颈：① 推测解码的"验证"本质是 decode 期的一次小 prefill，要推进 Mamba/GDN 循环状态，碰到和 prefix caching 同一套机器；② 两者都要线性层状态的细粒度存档/回滚（prefix caching 在前缀边界存档、spec decoding 在候选被拒时回滚），而循环状态原地更新、只能 chunk 边界 checkpoint，这能力本就稀缺却被同时争用；③ 推测解码让每步推进的 token 数变长且可变，打乱 prefix-cache 块的对齐边界（叠加在 vLLM 528-token block 对齐之上）→ 任何前缀块都匹配不上 → 命中恒 0。落地顺序：查日志确认 → 显式开 `--enable-prefix-caching` → 关掉 speculative decoding → 仍不行换 SGLang（MambaRadixCache）→ 或小规模退用 llama.cpp。

## 冲突与演进

- 2026-06-22：从 Qwen3.5 缓存命中归零的真实客户问题出发，理清 prefix caching 的两条隐含假设、线性注意力循环状态如何三条全破、Hybrid 双缓存难题、多模态与 speculative decoding 两个叠加杀手。

## 关联概念


## 来源日记

- [[2026-06-22-周一]] — speculative decoding 与 prefix caching 在 Hybrid 上的冲突、客户落地分步处理
- [[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]] — 两条假设、三个障碍、双缓存难题、多模态杀手
- [[线性注意力时代的推理架构之三——vLLM与SGLang支持对比与调优]] — vLLM Hybrid KV Cache Manager 与 SGLang MambaRadixCache 框架支持对比
