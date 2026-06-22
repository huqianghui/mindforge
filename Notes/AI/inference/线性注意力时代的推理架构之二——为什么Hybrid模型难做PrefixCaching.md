---
title: 线性注意力时代的推理架构 · 之二——为什么 Hybrid 模型难做 Prefix Caching
created: 2026-06-22
tags: [inference, prefix-caching, kv-cache, ssm-state, mamba, gated-deltanet, hybrid-attention, multimodal, qwen-vl]
---

# 线性注意力时代的推理架构 · 之二——为什么 Hybrid 模型难做 Prefix Caching

> 系列第二篇。承接 [[线性注意力时代的推理架构之一——Transformer-Mamba-GDN与Hybrid架构]] 的架构差异，回答核心问题：**为什么 Qwen3.5 这类 Hybrid 模型的 prefix cache 会命中率归零？**
>
> 框架层面如何应对见 [[线性注意力时代的推理架构之三——vLLM与SGLang支持对比与调优]]。系列持续更新。

---

## 1. 先回顾：prefix caching 靠什么工作

prefix caching（前缀缓存）的前提是**多条请求开头若干 token 完全相同**，那这段公共前缀的 KV 只需计算一次，结果供所有请求共享，省掉重复 prefill。

它成立的隐含假设有两条：
1. 缓存单位是**按 token 粒度**的 (K, V)；
2. 这些 KV 块 prefill 后**只读、可任意共享**。

纯 Transformer 完美满足这两条。问题出在 Hybrid 模型里的线性注意力层。

---

## 2. 三个根本障碍

线性注意力 / SSM 层维护的不是 token 级 KV，而是一个**固定大小的循环状态**。这带来三个结构性障碍（参考 [PyTorch 博客：Hybrid Models Meet SGLang](https://pytorch.org/blog/hybrid-models-meet-sglang-more-than-full-attention/)）：

### 障碍一：状态是原地更新（in-place）
循环状态 `S_t = f(S_{t-1}, x_t)` 是**覆盖式**更新，旧值被新值吃掉。无法像 KV cache 那样"回滚到第 k 个 token 的状态"——历史没有被逐 token 保留下来，只剩一个压缩后的当前状态。前缀复用本质要求"能定位到某个前缀位置的状态"，而原地更新让这件事做不到。

### 障碍二：状态比单 token 的 KV 大得多
要缓存一个前缀的状态，存的是完整的 d_k × d_v **状态矩阵**，而不是一个 token 的 (K, V) 向量。单位前缀的缓存成本高出一个量级，缓存大量前缀状态在显存上不划算。

### 障碍三：kernel 复用"全有或全无"
SSM / 线性注意力的前向 kernel 按 **chunk** 计算，只能在**完整 chunk 边界**做 checkpoint，没法像 KV 那样逐 token 切分共享。前缀长度不对齐到 chunk 边界，就一点都复用不了。

---

## 3. Hybrid 的真正难点：同时管两种异构缓存

一个 Hybrid 模型里，全注意力层和线性注意力层**交错存在**。要给它做 prefix caching，框架必须**同时**维护：

- 全注意力层的**token 级 KV 块**（可逐 token 共享）；
- 线性层的 **chunk 级状态快照**（只能在对齐边界复用）。

两套缓存的粒度、生命周期、淘汰策略都不同。更麻烦的是：为了让两者对齐，框架往往要把 attention 的 block size 强行对齐到线性层的 chunk/page 大小——这会让**短请求**直接落不到任何可复用边界（之三会看到 vLLM 因此把 block size 对齐到 528 tokens，短 prompt 命中率归零）。

这就是为什么纯 Transformer 的 Qwen3 缓存正常、而 Hybrid 的 Qwen3.5 命中率极低——**不是 bug，是架构迁移的必然代价**。

---

## 4. 多模态：再叠加一层命中率杀手

如果模型还是**视觉语言模型**（Qwen-VL 家族），问题再加一层。

视觉编码后的图像 token 被 `<|vision_start|> … <|vision_end|>` 包裹，按惯例**置于用户消息最前**（图像在前、文本在后）。于是：

- 不同请求的图像各不相同 → 序列从图像区第一个 token 起就分叉；
- 图像之前能共享的，只剩 system prompt 那一小段文本前缀；
- 图像之后的内容即使文字相同，也因前缀已分叉而无法复用。

> **修正一个常见说法**：Qwen2-VL 起采用**动态分辨率**，单图视觉 token 数**不是固定 576**，而是随分辨率在 4 ~ 16384 之间变化（720p 大致 1000~1500，缩略图可能 <100）。数字会变，但"图像在前 + 各请求不同"这个结构事实不变。

所以对 Qwen3.5-VL，**"图像在前"和"Hybrid 架构"是两个独立但叠加的杀手**：
- 多模态杀手：公共前缀被图像截断在很靠前的位置；
- 架构杀手：即便前缀相同，线性层的状态也难以复用。

两者叠加，命中率自然趋近于 0。

---

## 5. 一个常被误解的点：能不能跨请求复用"图像 KV"？

不能。Qwen-VL 的推理是**"一次视觉预填充 + 纯文本解码"**：所有图像必须在 prefill 阶段一次性进入，解码阶段不接受新图像。强行把某请求算出的图像 KV/状态拿给另一个请求复用，会破坏 mRoPE 位置编码、导致**新旧图像混淆**、输出错误。

唯一安全的图像复用，是**完全相同的图像再次出现**时走多模态预处理缓存（省掉重复视觉编码），这跟 prefix caching 是两回事（之三细说）。

---

## 6. 小结与下篇预告

- prefix caching 假设"token 级、只读、可共享的 KV"，线性注意力的循环状态三条都不满足（原地更新 / 体积大 / 全有或全无）。
- Hybrid 模型要同时管两套异构缓存，且对齐策略会牺牲短请求命中率。
- 多模态再把公共前缀截断到图像之前，与架构问题叠加。

下一篇 [[线性注意力时代的推理架构之三——vLLM与SGLang支持对比与调优]]：看 vLLM 的 Hybrid KV Cache Manager 与 SGLang 的 MambaRadixCache 各自做到哪一步，以及实战调优与压测计划。

---

## 参考

- [PyTorch Blog: Hybrid Models Meet SGLang — More Than Full Attention](https://pytorch.org/blog/hybrid-models-meet-sglang-more-than-full-attention/)
- vLLM issue [#43587](https://github.com/vllm-project/vllm/issues/43587)、[#36493](https://github.com/vllm-project/vllm/issues/36493)
- [Qwen2-VL 论文 arXiv:2409.12191](https://arxiv.org/abs/2409.12191)
- [HuggingFace 论坛：多模态 prefix caching 讨论](https://discuss.huggingface.co/t/multimodal-prefix-caching-with-qwen3-vl/170849)
