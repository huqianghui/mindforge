---
title: "Hybrid 模型推理框架选型——llama.cpp vs vLLM vs SGLang"
created: "2026-06-29"
updated: "2026-06-29"
tags:
  - wiki
  - decision
  - inference
  - framework-selection
  - vllm
  - sglang
decision_status: "active"
related_concepts:
  - "[[prefix-caching]]"
  - "[[hybrid-linear-attention-architecture]]"
related_methods: []
---

# Hybrid 模型推理框架选型——llama.cpp vs vLLM vs SGLang

## 背景

真实客户场景（智能设备 / 固定不变的长 system prompt / 每分钟多图判断 / 高并发多用户）：vLLM + Qwen3 缓存命中正常，换 Qwen3.5（Hybrid，GDN + Gated Attention）后 prefix cache 命中率恒为 0。Hybrid 架构把"状态"从纯 KV cache 扩展为"KV + 循环状态"（见 [[hybrid-linear-attention-architecture]]、[[prefix-caching]]），三个推理框架对这一变化的支持能力分化明显，需要按部署规模与负载特征选型。

## 选项分析

### 选项 A: llama.cpp

- **优势**：部署省心，单机/个人/低并发场景够用；同一对话在同一 slot 内续接时循环状态原地保留，只算新增 token。
- **劣势**：**不支持 Hybrid/循环模型的跨请求 prefix caching**——所谓"能缓存"只是 slot 内单序列续接，一旦前缀偏移 / slot 被驱逐 / 另一并发序列想复用同一前缀就整段重算。跨请求复用是未实现的 feature request（Discussion #19264：checkpoint 创建已有约 0.47 MiB/份，但循环状态恢复还没做）。
- **适用条件**：单机 / 个人 / 低并发。

### 选项 B: vLLM

- **优势**：attention-only 纯吞吐场景强竞争力，生态与部署成熟度最广；正在补齐 Hybrid KV Cache Manager（Hybrid Models as First-Class Citizens）。
- **劣势**：token-centric 基因（PagedAttention，假设 state = KV cache，token 级、append-only、可分页）面对循环状态崩溃——要为 Hybrid 补一套状态管理，且为对齐把 attention block size 强行对齐到线性层 chunk（528 tokens），短请求命中归零。
- **适用条件**：居中方案；命中率 0 时优先"关掉 speculative decoding"救场（见 [[prefix-caching]]）。

### 选项 C: SGLang

- **优势**：prefix-centric 基因（RadixAttention，把 KV cache 组织成基数树自动检测最长公共前缀复用），从 2024 年初诞生起核心命题就是"跨请求共享前缀"。Hybrid 出现后自然扩展出 **MambaRadixCache**——把前缀树从 KV 维度延伸到 request-state 维度（双池化：KV pool + Mamba/SSM state pool + Elastic Memory Pool）。是当前唯一为 Hybrid 跨请求复用专门设计的方案。
- **劣势**：相比 vLLM 生态/部署成熟度窄一些。
- **适用条件**：生产 / 高并发 / 多模态 / 共享长前缀（RAG、agent、多轮）。

## 决策结论

- **选择**：单机/个人/低并发 → **llama.cpp**；生产/高并发/多模态/共享长前缀 → **SGLang**（MambaRadixCache）；vLLM 居中（命中 0 时关推测解码救场）。
- **理由**：SGLang 领先 Prefix Sharing × Hybrid 这条线不是"团队动作快"，而是**设计基因对路**——RadixAttention 从第一天就是前缀复用优先，接 Hybrid 只需把前缀树延伸到 request-state 维度（顺手）；vLLM 是 token-centric、为 attention-only 优化，面对 Hybrid 需要补课（要时间）。agent workload 的本质是 prefix DAG 而非 sequence，树结构比线性分页更贴合。
- **放弃理由**：llama.cpp 跨请求复用未实现，高并发出局；vLLM 当前 Hybrid 实现命中归零，但可作居中过渡。
- **前提假设**：① 这是 2026 上半年的先发优势 + 时间窗口，不是永久护城河——vLLM 也在追，**选型决策要带版本和日期**；② 模型是 Hybrid 架构（纯 Transformer 不适用此决策）；③ 负载确实有可观共享前缀，否则 prefix caching 收益本就有限。

## 影响范围

- **受影响的概念**：[[prefix-caching]]（框架支持差异是命中率结论的落点）、[[hybrid-linear-attention-architecture]]（架构迁移驱动选型）。
- **受影响的方法**：无。

## 验证状态

- **验证方式**：按 SGLang cookbook 部署，开/关推测解码各测，压测 并发(10/50/100) × 命中率/TTFT/吞吐。
- **当前状态**：部分验证——架构层逻辑清晰（基因差异有公开证据：RadixAttention 时间线、PyTorch 博客双池设计、vLLM issue #43587/#36493），但客户场景的压测数据待回填。
- **验证证据**：社区实测 llama.cpp 缓存正常（slot 续接）而 vLLM Qwen3.5 恒 0；关 speculative decoding 后命中恢复；mlx-lm #980 确认 Hybrid prefix cache reuse 是跨框架共性难题。

## Claims

### Claim: 框架按部署规模选型——llama.cpp/SGLang/vLLM 三档

- **来源**：[[2026-06-22-周一]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.8
- **状态**：active

> 单机/个人/低并发 → llama.cpp（slot 续接够用，部署省心，但无法跨并发共享）；生产/高并发/多模态 → SGLang（MambaRadixCache 是当前唯一为 Hybrid 跨请求复用专门设计的方案）；vLLM 居中——命中率 0 时"关掉推测解码"救场。落地顺序：查日志 `Prefix cache hit rate:` 定基线 → vLLM 显式 `--enable-prefix-caching` + 关 MTP 推测解码再测 → 仍为 0 上 SGLang 按 cookbook 部署 → 压测并发 × 命中率/TTFT/吞吐。收益预期：只省 system prompt 的 prefill，占比 ≈ `prompt token /(prompt + 图片 token)`，prompt 越长收益越大。

### Claim: SGLang 领先是设计基因（prefix-centric）而非团队速度

- **来源**：[[SGLang与vLLM的基因之争——为什么PrefixSharing×Hybrid这条线SGLang领先]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.85
- **状态**：active

> vLLM = token-centric（PagedAttention，为 attention-only 吞吐而生，隐含 state = KV cache）；SGLang = prefix-centric（RadixAttention，把 KV cache 组织成基数树，从 2024 年初核心命题就是跨请求共享前缀）。纯 Transformer 时代两者还能正面竞争吞吐；Hybrid 把 `state` 从 `KV` 扩成 `KV + 循环状态`，恰好踩在两套基因的分野上。MambaRadixCache 的本质 = 把前缀树从 KV 维度延伸到 request-state 维度（KV → tree node，SSM state → 绑定 request lifecycle），SGLang 顺手扩展、vLLM 要补课。这是先发优势 + 时间窗口，不是永久护城河——选型要带日期（2026 上半年 SGLang 更稳）。

## 关联概念

- [[prefix-caching]] — `produces` 本决策是 prefix caching 在 Hybrid 模型上失效后的框架应对方案
- [[hybrid-linear-attention-architecture]] — `constrains` Hybrid 架构的循环状态是触发本选型的根因，约束了哪些框架能用

## 来源

- [[2026-06-22-周一]] — llama.cpp vs SGLang 支持对比、客户场景落地分步处理、收益预期
- [[SGLang与vLLM的基因之争——为什么PrefixSharing×Hybrid这条线SGLang领先]] — token-centric vs prefix-centric 基因、RadixAttention 时间线、MambaRadixCache 本质
- [[线性注意力时代的推理架构之三——vLLM与SGLang支持对比与调优]] — 框架支持对比与调优、压测计划
