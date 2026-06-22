---
title: 线性注意力时代的推理架构 · 之三——vLLM 与 SGLang 支持对比与调优
created: 2026-06-22
tags: [inference, vllm, sglang, prefix-caching, radixattention, mamba-cache, qwen3.5, tuning, benchmark]
---

# 线性注意力时代的推理架构 · 之三——vLLM 与 SGLang 支持对比与调优

> 系列收尾篇（持续更新）。承接 [[线性注意力时代的推理架构之一——Transformer-Mamba-GDN与Hybrid架构]] 与 [[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]]，落到工程：**两大推理框架当前对 Hybrid + 多模态模型支持到什么程度，怎么调，怎么压测。**

---

## 1. vLLM vs SGLang 支持对比（2026-06 快照）

| 维度 | vLLM | SGLang |
|------|------|--------|
| Hybrid / Mamba 模型支持 | ✅ Qwen3-Next/3.5、Jamba 等，**Hybrid KV Cache Manager**（对齐 block size） | ✅ 内存池分离：**Mamba pool + KV pool + Elastic Memory Pool** |
| Hybrid 的 prefix caching | ⚠️ 默认 **Mamba "align" 模式**——attention block 对齐到 Mamba page（如 528 tokens），短 prompt（<528）命中率 0；需手动 `--enable-prefix-caching`，仍标 experimental | ✅ **MambaRadixCache**——把 RadixAttention 扩展到 Hybrid，对两类状态分别 match / insert / evict |
| 核心缓存机制 | PagedAttention + Hybrid KV Cache Manager | RadixAttention（基数树索引前缀）+ MambaRadixCache |
| Qwen3.5 专门支持 | issue 跟踪中：[#43587](https://github.com/vllm-project/vllm/issues/43587)、[#36493](https://github.com/vllm-project/vllm/issues/36493)、[#40696](https://github.com/vllm-project/vllm/issues/40696)、tracking [#26201](https://github.com/vllm-project/vllm/issues/26201) | 有官方 [Qwen3.5 Cookbook](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.5) |
| 关键参数 | `--enable-prefix-caching`、Mamba cache mode、block size、`--mm-processor-cache-type`、`--mm-processor-cache-gb` | `--mamba-scheduler-strategy`（no_buffer / extra_buffer）、`--page-size`（需满足 `FLA_CHUNK_SIZE % page_size == 0`）、`--speculative-algo NEXTN` |

**初步判断**：对 Qwen3.5 这类 **Hybrid + 多模态** 模型，**SGLang 当前在 prefix caching 上的成熟度领先**——MambaRadixCache 是为此专门设计的。vLLM 的 Hybrid KV Cache Manager 仍在推进，默认 block 对齐策略会让短请求命中率归零。**值得用 SGLang 做一组对照压测再下结论。**

---

## 2. 两个机制的核心区别

### vLLM：Hybrid KV Cache Manager + block 对齐
为了让全注意力层和线性层缓存对齐，vLLM 把 attention 的 block size 拉到 Mamba page 大小（如 528）。代价是：**短于一个 block 的 prompt 落不到任何可复用边界**，命中率直接 0（[#40696](https://github.com/vllm-project/vllm/issues/40696)）。这解释了客户观察到的"命中率一直为 0"。

### SGLang：MambaRadixCache（RadixAttention 的 Hybrid 扩展）
SGLang 的 [RadixAttention](https://docs.sglang.io/) 用**基数树**索引 KV 前缀，天然支持任意长度前缀的共享。MambaRadixCache 在此基础上把"线性层状态"作为第二类节点纳入树中，对两类状态分别做 match / insert / evict，并用 Elastic Memory Pool 在 Mamba 状态与 KV 之间动态分配显存——更贴合"线性层只能在 chunk 边界 checkpoint"的现实。

---

## 3. 调优清单（与框架无关的缓解策略）

无论用哪个框架，下面四条都能降低 Hybrid + 多模态带来的损失：

1. **稳定文本前缀前置**：把统一的系统指令 / 引导语（如"请分析以下图像："）放到图像**之前**，让批内请求至少共享这段文本前缀。注意保持与模型训练时的 chat 模板逻辑一致。
2. **复用图像走预处理缓存**：vLLM `--mm-processor-cache-type shm` 缓存已编码的图像 embedding——**仅当完全相同的图像重复出现**时才有效（如同一参考图反复问答）；图像普遍各异则关闭（`--mm-processor-cache-gb 0`）省内存管理开销。这是"图像复用"，不是 prefix caching。
3. **多图合并进单次 prefill**：要比较多张图，放进**一个请求的一个 user message** 里一次性预填充；**不要**跨多轮请求累积图像（破坏 mRoPE、图像混淆）。
4. **按负载选配置**：
   - 吞吐优先（高并发）：尽量制造可共享文本前缀，开 prefix caching，谨慎评估 block 对齐影响；
   - 延迟优先（低并发）：可关 prefix caching 省维护开销，开推测解码（vLLM MTP / SGLang `--speculative-algo NEXTN`）降单请求延时。

---

## 4. 实测对照计划（TODO）

针对当前客户场景（Qwen3.5 多模态），下一步压测设计：

- [ ] **基线**：vLLM 默认配置，记录 prefix cache 命中率 / TTFT / 吞吐
- [ ] **vLLM 调参**：调 block size、显式开 `--enable-prefix-caching`、对比纯文本 vs 多模态
- [ ] **SGLang 对照**：按 [Qwen3.5 Cookbook](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.5) 部署，测 MambaRadixCache 命中率
- [ ] **变量**：图像在前 vs 文本前缀前置；相同图像复用 vs 全异图像
- [ ] **结论**：在该场景下选框架 + 选配置的决策依据

> 数据出来后回填本节，并视情况升级为 wiki 决策页（"Qwen3.5 多模态推理框架选型"）。

---

## 5. 系列小结

- **之一**：架构差异——Transformer（增长 KV）/ Mamba·GDN（固定状态）/ Hybrid（交错）。
- **之二**：缓存失效——循环状态原地更新、体积大、全有或全无，加多模态"图像在前"双重叠加。
- **之三（本篇）**：框架现状——vLLM block 对齐伤短请求，SGLang MambaRadixCache 更成熟；调优靠"前缀前置 + 图像复用缓存 + 合并 prefill + 按负载选配"。

**当前行动建议**：客户场景优先用 SGLang 跑一组对照压测；vLLM 侧持续跟踪 tracking issue [#26201](https://github.com/vllm-project/vllm/issues/26201) 的进展。

---

## 参考

- [SGLang Qwen3.5 Cookbook](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.5)
- [PyTorch Blog: Hybrid Models Meet SGLang](https://pytorch.org/blog/hybrid-models-meet-sglang-more-than-full-attention/)
- [vLLM Hybrid KV Cache Manager 文档](https://docs.vllm.ai/en/stable/design/hybrid_kv_cache_manager/)
- vLLM issues [#43587](https://github.com/vllm-project/vllm/issues/43587)、[#36493](https://github.com/vllm-project/vllm/issues/36493)、[#40696](https://github.com/vllm-project/vllm/issues/40696)、tracking [#26201](https://github.com/vllm-project/vllm/issues/26201)
- 起点讨论：与 ChatGPT 的分析对话 [share 链接](https://chatgpt.com/share/6a38ad86-8f38-83ec-98d5-66e4b9831fc6)
