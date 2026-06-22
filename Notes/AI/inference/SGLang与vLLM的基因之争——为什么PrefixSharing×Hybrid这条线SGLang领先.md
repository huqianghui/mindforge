---
title: SGLang 与 vLLM 的基因之争——为什么 Prefix Sharing × Hybrid 这条线 SGLang 领先
created: 2026-06-22
tags: [inference, sglang, vllm, radixattention, pagedattention, mamba-radix-cache, prefix-caching, hybrid-attention, qwen3.5, architecture]
---

# SGLang 与 vLLM 的基因之争——为什么 Prefix Sharing × Hybrid 这条线 SGLang 领先

> 承接 [[线性注意力时代的推理架构之三——vLLM与SGLang支持对比与调优]] 的框架对比，把一个更本质的问题讲透：**为什么在"共享前缀 + Hybrid（Attention + Mamba/线性）"这条线上，SGLang 比 vLLM 领先一步？** 这不是巧合，而是两套框架**设计基因**的差异在 Hybrid 时代被放大。
---

## 1. 一个尖锐的问题

客户场景（智能设备 / 共享长 system prompt / 多图 / 高并发，见之三）逼出一个选型问题：换 Qwen3.5 后 vLLM 的 prefix cache 命中归零，而 SGLang 有专门的 MambaRadixCache。**为什么是 SGLang 先把这条路走通？**直觉答案"SGLang 团队动作快"是错的。真正的原因是：**SGLang 从 2024 年初诞生那天起，核心命题就是"跨请求共享前缀"**，而 vLLM 的核心命题是"单模型吞吐最大化"。Hybrid 模型把"状态管理"从 KV cache 扩展到"KV + 循环状态"，恰好踩在两套基因的分野上。

---

## 2. 时间线：从 RadixAttention 到 MambaRadixCache（有公开证据）

| 时间            | 事件                                                                                                  | 证据                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2023-12       | SGLang tech report 上线，提出 **RadixAttention**                                                         | [arXiv:2312.07104](https://arxiv.org/abs/2312.07104)                                                                             |
| 2024-01-17    | LMSYS 博客《Fast and Expressive LLM Inference with RadixAttention and SGLang》——RadixAttention 作为一等公民发布 | [LMSYS blog](https://lmsys.org/blog/2024-01-17-sglang)                                                                           |
| 2024（NeurIPS） | 论文《SGLang: Efficient Execution of Structured Language Model Programs》正式发表                           | [NeurIPS 2024](https://proceedings.neurips.cc/paper_files/paper/2024/file/724be4472168f31ba1c9ac630f15dec8-Paper-Conference.pdf) |
| 2025 下半年      | 支持 **Qwen3-Next**（Hybrid 线性 attention），引入 **MambaRadixCache** 把 prefix caching 扩展到 Mamba 状态         | SGLang Issue [#10438](https://github.com/sgl-project/sglang/issues/10438)「support prefix caching for qwen 3 next」                |
| 2025-12       | PyTorch 官方博客《Hybrid Models Meet SGLang: More than Full Attention》系统化输出 Hybrid serving 方案            | [PyTorch blog](https://pytorch.org/blog/hybrid-models-meet-sglang-more-than-full-attention)                                      |
| 2026          | 完善到 **Qwen3.5 / DeltaNet / 多模态 Hybrid**，官方称用 **mamba radix cache v2 + MTP** 高效运行                    | [SGLang Qwen3.5 Cookbook](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.5)                                           |

> 关键认知：**SGLang 不是"最早支持 Qwen3.5"，而是最早支持"DeltaNet / linear hybrid 这一类模型"**（Qwen3-Next 阶段就铺好了 MambaRadixCache），Qwen3.5 只是自然延续。

---

## 3. 两套基因：Token-centric vs Prefix-centric

### vLLM 的基因——为 attention-only 世界的吞吐而生
- **核心目标**：最大化单模型 throughput。
- **标志设计**：**PagedAttention**（[Kwon et al., SOSP 2023, arXiv:2309.06180](https://arxiv.org/abs/2309.06180)）+ 连续 batching + KV cache 虚拟内存化。
- **隐含假设**：`state = KV cache`，token-level、append-only、可分页。

### SGLang 的基因——为复杂请求结构的复用而生
- **核心目标**：最大化"复杂请求结构（prefix / program / agent）"的系统效率。
- **标志设计**：**RadixAttention**（把 KV cache 组织成**基数树/Trie**，自动检测最长公共前缀并复用）+ structured generation + request-level memory。
- **隐含假设**：请求之间**大量共享前缀**（RAG、agent、system prompt、多轮对话），复用比单纯吞吐更值钱。

> 一句话：**vLLM 是 token-centric，SGLang 是 prefix-centric。** 在纯 Transformer 时代两者还能正面竞争吞吐；Hybrid 一出现，分野就被放大了。

---

## 4. Hybrid 出现后的分水岭：state ≠ KV cache

纯 Transformer 时代，"状态"就等于 KV cache——token 级、append-only、可任意分页和复用。两套框架都能处理。

Hybrid（Attention + Mamba/DeltaNet）把等式改写成：

```
state = KV cache（token 级，可分页）  +  recurrent memory（request 级，原地更新、不可回滚）
```

这一改，两套基因的命运分叉：

| | vLLM（token-centric） | SGLang（prefix-centric） |
|---|---|---|
| 面对循环状态 | KV 的分页假设不成立——循环状态固定大小、原地覆盖、不能 partial reuse，**prefix sharing 逻辑直接崩** | 本来就有 tree-based cache + request-state 管理，**自然扩展**出 MambaRadixCache |
| 工程动作 | 要为 Hybrid **补**一套状态管理（block 对齐 Mamba page，短请求命中归零，见之三） | 把"前缀树"从 KV 维度**延伸**到"request state"维度即可 |
| 内存模型 | 围绕 KV 分页 | **双池化**：KV cache pool（token 级）+ Mamba/SSM state pool（request 级）+ Elastic Memory Pool 弹性分配 |

PyTorch 博客原话印证了 SGLang 的双池设计："*in SGLang, hybrid linear models separate the memory pool into two parts: Mamba pool and KV cache pool*"，并通过 **hybrid radix tree** 实现 prefix caching、为每个 draft token 分配独立 cache slot 来支持推测解码。

**MambaRadixCache 的本质**：不是简单的 KV 共享，而是把"前缀树"扩展到"request state"维度——KV → tree node，SSM state → 绑定 request lifecycle。这正是 vLLM 当前最吃力、SGLang 顺手就能做的事。

---

## 5. 为什么 RadixAttention 天然适配 Qwen3.5 这类 workload

RadixAttention 从第一天就是为"多请求前缀重叠"设计的，而 Qwen3.5 的典型负载恰好全中：

| workload 特征 | Qwen3.5 场景 | RadixAttention 适配点 |
|---------------|-------------|----------------------|
| 超长 system prompt | ✅ 事件分级规则 / 工具说明 | 共享前缀只算一次 |
| 多轮共享 context | ✅ agentic 多轮 | 基数树复用历史前缀 |
| reasoning 前缀重复 | ✅ Thinking 模式 | 思维链前缀可复用 |
| agent 树状展开 | ✅ tool calling 分支 | 树结构天然表达分支共享 |

> 一个可以写进 paper 的视角：**agent workload 的本质是 prefix DAG，而不是 sequence。** RadixAttention 的树结构比 PagedAttention 的线性分页更贴合这种"多分支共享前缀"的形态。

---

## 6. 平衡视角：vLLM 也在追，这是"先发"不是"护城河"

不要把这讲成"SGLang 永远赢"。客观事实是：

- vLLM 也发布了 **Hybrid Models as First-Class Citizens in vLLM** 的工作，正在补齐 Hybrid KV Cache Manager；
- vLLM 在 attention-only 的纯吞吐场景仍有强竞争力，生态和部署成熟度更广；
- SGLang 的领先是**设计基因带来的先发优势**——它不需要"改基因"就能接住 Hybrid，而 vLLM 需要补课。补课需要时间，但不是不可能。

所以诚实的结论是：**当下（2026 上半年）选型，Prefix Sharing × Hybrid × 高并发这条线 SGLang 更稳；但这是时间窗口，不是永久壁垒。** 选型决策要带版本和日期。

---

## 7. 小结

> SGLang 从设计上就是围绕"共享前缀和复杂请求结构"构建的，通过 RadixAttention 将 KV cache 组织为前缀树（基数树）。在 Hybrid 模型出现后，它进一步将 Mamba/SSM 的 request-level state 纳入 radix 体系，形成 MambaRadixCache。因此它天然比 vLLM 更早、更容易支持 Qwen3.5 这类 Attention + DeltaNet 的混合架构。vLLM 则是 token-centric、为 attention-only KV 缓存优化的引擎，面对 Hybrid 需要补一套状态管理，这是基因差异，不是团队速度差异。

**一句话对比（建议记住）**：
- **vLLM** = Token-centric, throughput-first engine for attention models.
- **SGLang** = Prefix-centric, request-structured engine for agent / hybrid workloads.

1. SGLang 领先不是"动作快"，是**基因对路**——RadixAttention 从 2024 年初就是"前缀复用优先"。
2. Hybrid 把"状态"从 `KV` 扩成 `KV + 循环状态`，踩在 token-centric（vLLM）与 prefix-centric（SGLang）的分野上。
3. MambaRadixCache = 把前缀树从 KV 维度延伸到 request-state 维度，SGLang 顺手，vLLM 要补课。
4. 这是**先发优势 + 时间窗口**，不是永久护城河；vLLM 也在追，选型要带日期。

---

## 参考

- [LMSYS: Fast and Expressive LLM Inference with RadixAttention and SGLang（2024-01-17）](https://lmsys.org/blog/2024-01-17-sglang)
- [SGLang tech report arXiv:2312.07104](https://arxiv.org/abs/2312.07104)
- [NeurIPS 2024: SGLang: Efficient Execution of Structured Language Model Programs](https://proceedings.neurips.cc/paper_files/paper/2024/file/724be4472168f31ba1c9ac630f15dec8-Paper-Conference.pdf)
- [vLLM PagedAttention arXiv:2309.06180（SOSP 2023）](https://arxiv.org/abs/2309.06180)
- [PyTorch Blog: Hybrid Models Meet SGLang — More than Full Attention（2025-12）](https://pytorch.org/blog/hybrid-models-meet-sglang-more-than-full-attention)
- [SGLang Issue #10438: support prefix caching for qwen 3 next](https://github.com/sgl-project/sglang/issues/10438)
- [SGLang Qwen3.5 Cookbook](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.5)
- [阿里云 Tair × SGLang: Hybrid Model Support 方案解析](https://www.alibabacloud.com/blog/hybrid-model-support-%7C-sglangs-support-scheme-for-hybrid-architecture-models-like-mamba-transformer_602857)
- 系列文章：[[线性注意力时代的推理架构之三——vLLM与SGLang支持对比与调优]]
