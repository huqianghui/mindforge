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

## 3. llama.cpp：为什么"看起来能缓存"——slot 续接 ≠ prefix caching

之二与第 4.2 节都提到"llama.cpp 上缓存正常"。但深入查证后要**修正这个说法**：llama.cpp **并不支持** Hybrid / 循环模型的**跨请求 prefix caching**，它做的是另一件事——**slot 内的单序列续接**。

### 3.1 llama.cpp 实际做的事：slot 续接
llama.cpp 给每个并发槽位（slot）维护一份**独立的循环状态**（`llama_kv_cache_recurrent`，按 `seq_id` 用 `cells[seq_id].tail` 跟踪尾部）。当**同一段对话在同一个 slot 里继续**时，历史循环状态原地保留，只需处理新增 token——所以多轮对话"看起来命中了缓存"。但这是**单序列的状态延续**，不是"把一段公共前缀的状态拿给另一条请求复用"。

一旦发生以下任一情况，状态作废、整段重算：
- **前缀偏移**（prompt 里有时间戳等变化）；
- **slot 被驱逐**（并发超过 slot 数）；
- **另一条并发序列**想复用同一前缀。

### 3.2 跨请求复用：是未实现的 feature request
真正的"跨请求循环状态复用"在 llama.cpp 里是一个**尚未实现**的提案——Discussion [#19264](https://github.com/ggml-org/llama.cpp/discussions/19264)（"Enable Partial Prompt Cache Reuse for Recurrent Models via State Checkpointing"）。现状是：checkpoint **创建**已有（约 0.47 MiB/份），但循环状态的**恢复**还没做。涉及 Mamba/Mamba2、RWKV、LFM2 等。

这个问题**不是 llama.cpp 独有**：mlx-lm 的 Issue [#980](https://github.com/ml-explore/mlx-lm/issues/980) 也确认——"prefix cache reuse is broken for all hybrid-architecture models（sliding window、SSM/Mamba）"；纯全注意力模型正常，滑窗+全注意力、SSM/Mamba 都坏。**这是 Hybrid 架构的共性难题，不是某个框架的 bug。**

### 3.3 与 SGLang 的对比

| 维度 | llama.cpp | SGLang |
|------|-----------|--------|
| Hybrid 跨请求 prefix caching | ❌ 未实现（仅 slot 内单序列续接） | ✅ MambaRadixCache 专门支持 |
| 缓存机制 | per-slot 循环状态 + tail 跟踪 | RadixAttention 基数树 + Mamba 状态节点 |
| 并发模型 | slot 数有限，超量即驱逐重算 | Elastic Memory Pool 动态分配，高并发友好 |
| 推测解码 × 缓存协同 | 无专门协同 | Cookbook 默认开 `NEXTN`/EAGLE，与缓存协同设计 |
| 多模态 | 支持有限 | 原生支持 Qwen3.5-VL |
| 内存管理 | 简单（单机够用） | Mamba pool + KV pool 分离，精细 |
| 部署门槛 | 极低（单文件、CPU 可跑） | 较高（需 GPU、FLA kernel 等） |
| 适用场景 | **单机 / 个人 / 低并发 agentic** | **生产 / 高并发 / 多模态** |
| 当前短板 | 跨请求复用缺失、并发受限 | 部署复杂、资源门槛高 |

**结论**：
- **单机 / 个人 / 低并发**：llama.cpp 的 slot 续接已经够用——同一对话连续问答自然省掉重算，省心。
- **生产 / 高并发 / 多模态**：SGLang 的 MambaRadixCache 是当前唯一为 Hybrid 跨请求复用专门设计的方案。
- **vLLM 居中**：Hybrid KV Cache Manager 仍在推进，命中率 0 时需"关掉推测解码"救场（见第 5 节）。

---

## 4. 调优清单（与框架无关的缓解策略）

无论用哪个框架，下面四条都能降低 Hybrid + 多模态带来的损失：

1. **稳定文本前缀前置**：把统一的系统指令 / 引导语（如"请分析以下图像："）放到图像**之前**，让批内请求至少共享这段文本前缀。注意保持与模型训练时的 chat 模板逻辑一致。
2. **复用图像走预处理缓存**：vLLM `--mm-processor-cache-type shm` 缓存已编码的图像 embedding——**仅当完全相同的图像重复出现**时才有效（如同一参考图反复问答）；图像普遍各异则关闭（`--mm-processor-cache-gb 0`）省内存管理开销。这是"图像复用"，不是 prefix caching。
3. **多图合并进单次 prefill**：要比较多张图，放进**一个请求的一个 user message** 里一次性预填充；**不要**跨多轮请求累积图像（破坏 mRoPE、图像混淆）。
4. **按负载选配置**：
   - 吞吐优先（高并发）：尽量制造可共享文本前缀，开 prefix caching，谨慎评估 block 对齐影响；
   - 延迟优先（低并发）：可关 prefix caching 省维护开销，开推测解码（vLLM MTP / SGLang `--speculative-algo NEXTN`）降单请求延时。
   - ⚠️ **推测解码与 prefix caching 在 Hybrid 上可能互斥**：社区实测发现，开了推测解码时命中率恒为 0，关掉后命中恢复（详见第 5 节）。两者目前难兼得，要 prefix caching 就先关推测解码。

---

## 5. 社区实测：Reddit 反馈与一个关键缓解手段

除了 vLLM issue，社区也大量复现了这个问题。一个有代表性的帖子 [vLLM Prefix caching cannot be used with Qwen 3.5 27b?](https://www.reddit.com/r/LocalLLaMA/comments/1rplb3r/vllm_prefix_caching_cannot_be_used_with_qwen_35/) 把现象、复现范围和缓解手段都摆了出来。

### 5.1 现象确认（多人、多尺寸、真实 agentic 负载）
- **OP**：Qwen3.5-27B 是 Hybrid，多轮请求拿不到 prefix-cache 复用，agentic 长对话随历史增长越来越慢——直接发问"这模型是不是不适合 agentic？"
- **复现范围广**：MoE 版、Dense-27B、甚至 0.8B（vLLM 0.17.1）都有人复现，**显式加了 `--enable-prefix-caching` 仍 `Prefix cache hit rate: 0.0%`**。
- **负载真实**：有用户的请求来自 **Claude Code**，前缀高度一致（本该命中率极高），vLLM 上仍是 0。

### 5.2 两个关键对照
- **llama.cpp 上"看起来能命中"**：同样的高度一致前缀，llama.cpp 在多轮续接时不重算。但要注意——这是 **slot 内单序列续接**，不是跨请求 prefix caching（见第 3 节修正）。它说明**不是模型"不可缓存"，而是 vLLM 当前 Hybrid 实现的问题**——架构让它*更难*做，但不是*做不到*；只是 llama.cpp 走的也不是真正的 prefix caching。
- **`--enable-prefix-caching` 不是充分条件**：MoE 变体上即使显式开启仍可能 0%，说明问题在更深的缓存管理层。

### 5.3 最实用的结论：先关掉推测解码
帖子里最有价值的一条回复——

> Are you using speculative decoding? I was running into the same issue with Qwen3.6-27B and the latest vLLM nightly and I'm seeing prefix cache hits after I disabled speculative decoding.

即：**Qwen3.6-27B + 最新 vLLM nightly，关掉 speculative decoding 后 prefix cache 命中恢复。** 这是目前最可操作的缓解手段，比调 block size 直接得多。

**为什么二者会冲突？**——直觉上 prefix caching 是 prefill 阶段、speculative decoding 是 decode 阶段，似乎井水不犯河水；纯 Transformer 上确实如此（KV 是 token 级、可逐个增删，互不干扰）。**冲突不是阶段之争，而是 Hybrid 的状态管理瓶颈**，可拆成三点：

1. **阶段分离在 Hybrid 上并不干净**：推测解码的"验证"本质是 decode 期的一次**小 prefill**——一步要并行吞 K+1 个 token，让 Mamba/GDN 的**循环状态**往前推进若干步，于是它碰到了和 prefix caching 完全相同的那套状态机器，而不只是 decode 的轻量操作。
2. **两者争用同一个稀缺能力——线性层状态的细粒度存档/回滚**：prefix caching 需要在"前缀边界"把循环状态**存档**以便复用；speculative decoding 需要在候选被拒时把循环状态**回滚**到验证前。全注意力 KV 做这两件事都容易（token 级增删），但循环状态原地更新、只能在 chunk 边界 checkpoint（见之二三障碍），细粒度存档/回滚正是它最不擅长的——两个功能同时争用这块本就稀缺的"状态可逆性"。
3. **对齐边界被叠加打乱（最可能的直接死因）**：vLLM 已为对齐把 attention block 强行对到 Mamba page（如 528 tokens）；推测解码又让每步推进的 token 数**变长且可变**（接受多少不定），几乎不可能再对齐到 prefix-cache 定义"可复用块"的 chunk 边界。对齐一破，**任何前缀块都匹配不上 → 命中恒 0**——这也解释了"开着就 0、关掉就恢复"为何如此干脆：是直接断在缓存查找环节，而非缓慢衰减。

> 置信度：第 2、3 点是从架构事实推出的硬约束；"vLLM 具体在哪段代码让缓存失效"未见官方文档明说，属合理推断。当前版本下结论很明确——**不能一边开推测解码降延时、一边指望 prefix caching 提吞吐，二选一**。

### 5.4 行动清单（落地顺序）
1. **先确认日志**：看 `Prefix cache hit rate:` / `Avg prefix hit rate:`，用数据而非感觉判断（DinoAmino 的提醒）。
2. **显式开 `--enable-prefix-caching`**：Hybrid 上默认不一定开，但这只是必要条件。
3. **关掉 speculative decoding**：当前最有效的一招，命中率 0 时优先试。
4. **仍不行 → 换 SGLang**：用 MambaRadixCache 走专门为 Hybrid 设计的路径（见第 1、3 节对比）。
5. **或退一步用 llama.cpp**：小规模 / 单机 agentic 场景，llama.cpp 的 slot 续接在这条线上反而省心（见第 3 节）。

> ⚠️ 待验证：上述均为社区 nightly 版本的观察，版本演进很快。第 6 节压测要把"开/关推测解码"作为一个独立变量纳入。

---

## 6. 实测对照计划（TODO）

针对当前客户场景（Qwen3.5 多模态），下一步压测设计：

- [ ] **基线**：vLLM 默认配置，记录 prefix cache 命中率 / TTFT / 吞吐
- [ ] **vLLM 调参**：调 block size、显式开 `--enable-prefix-caching`、对比纯文本 vs 多模态
- [ ] **SGLang 对照**：按 [Qwen3.5 Cookbook](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.5) 部署，测 MambaRadixCache 命中率
- [ ] **变量**：图像在前 vs 文本前缀前置；相同图像复用 vs 全异图像；**开 vs 关推测解码**（验证 5.3 的社区结论）
- [ ] **结论**：在该场景下选框架 + 选配置的决策依据

> 数据出来后回填本节，并视情况升级为 wiki 决策页（"Qwen3.5 多模态推理框架选型"）。

---

## 7. 系列小结

- **之一**：架构差异——Transformer（增长 KV）/ Mamba·GDN（固定状态）/ Hybrid（交错）。
- **之二**：缓存失效——循环状态原地更新、体积大、全有或全无，加多模态"图像在前"双重叠加。
- **之三（本篇）**：框架现状——vLLM block 对齐伤短请求，SGLang MambaRadixCache 更成熟，llama.cpp 只是 slot 内续接（跨请求复用尚未实现，且 mlx-lm 同样如此，是 Hybrid 共性难题）；调优靠"前缀前置 + 图像复用缓存 + 合并 prefill + 按负载选配"；社区实测给出最实用一招——**命中率 0 时先关掉推测解码**。

**当前行动建议**：vLLM 上命中率 0 时，先确认日志 → 显式开 `--enable-prefix-caching` → **关掉 speculative decoding**（社区已验证最有效）；仍不行则换 SGLang 跑对照压测。vLLM 侧持续跟踪 tracking issue [#26201](https://github.com/vllm-project/vllm/issues/26201) 的进展。

---

## 参考

- [SGLang Qwen3.5 Cookbook](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.5)
- [PyTorch Blog: Hybrid Models Meet SGLang](https://pytorch.org/blog/hybrid-models-meet-sglang-more-than-full-attention/)
- [vLLM Hybrid KV Cache Manager 文档](https://docs.vllm.ai/en/stable/design/hybrid_kv_cache_manager/)
- [Reddit r/LocalLLaMA: vLLM Prefix caching cannot be used with Qwen 3.5 27b?](https://www.reddit.com/r/LocalLLaMA/comments/1rplb3r/vllm_prefix_caching_cannot_be_used_with_qwen_35/)
- [llama.cpp Discussion #19264: Enable Partial Prompt Cache Reuse for Recurrent Models via State Checkpointing](https://github.com/ggml-org/llama.cpp/discussions/19264)
- [mlx-lm Issue #980: Prefix cache reuse is broken for hybrid-architecture models](https://github.com/ml-explore/mlx-lm/issues/980)
- vLLM issues [#43587](https://github.com/vllm-project/vllm/issues/43587)、[#36493](https://github.com/vllm-project/vllm/issues/36493)、[#40696](https://github.com/vllm-project/vllm/issues/40696)、tracking [#26201](https://github.com/vllm-project/vllm/issues/26201)
- 起点讨论：与 ChatGPT 的分析对话 [share 链接](https://chatgpt.com/share/6a38ad86-8f38-83ec-98d5-66e4b9831fc6)
- 深入对比：[[SGLang与vLLM的基因之争——为什么PrefixSharing×Hybrid这条线SGLang领先]]
