---
title: "前缀缓存（Prefix Caching）"
created: "2026-06-29"
updated: "2026-09-25"
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
  - "[[distributed-training-parallelism]]"
---

# 前缀缓存（Prefix Caching）

## 摘要

前缀缓存是 LLM 推理的核心省算优化：多条请求开头若干 token 完全相同时，这段公共前缀的 KV 只算一次、供所有请求共享，省掉重复 prefill。它隐含两条假设——缓存单位是 token 粒度的 (K,V)、且 KV prefill 后只读可任意共享——纯 Transformer 完美满足。但 2025–2026 年的架构迁移把它推到了失效边缘：Hybrid 线性注意力架构（见 [[hybrid-linear-attention-architecture]]）的线性层维护的是固定大小的循环状态，三条假设全破（原地更新无法定位前缀、状态体积大一个量级、kernel 只能 chunk 边界 checkpoint）。结果是 Qwen3.5 这类 Hybrid 模型即使显式开 `--enable-prefix-caching`，命中率也长期为 0。Hybrid 还要同时管两套异构缓存，多模态"图像在前"再截断公共前缀，speculative decoding 与之争用同一套状态存档能力——多个杀手叠加，命中趋近于零。

在服务化封装层（OpenAI/Azure OpenAI 的 prompt caching），同一机制于 GPT-5.6 起从透明后台优化变为**可控制、可计量、单独计费的一等机制**：断点可显式指定、写入按 1.25× 计费、命中按精确边界报告、缓存驻留单机靠智能路由命中——命中本质是概率事件，缓存经济学进入"在哪断、写多少、复用几次"的精算维度。

## Claims

### Claim: prefix caching 成立的两条隐含假设

- **来源**：[[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.9
- **状态**：stale

> prefix caching 的前提是多条请求开头若干 token 完全相同，这段公共前缀的 KV 只需算一次、结果供所有请求共享，省掉重复 prefill。它成立的隐含假设有两条：① 缓存单位是**按 token 粒度**的 (K,V)；② 这些 KV 块 prefill 后**只读、可任意共享**。纯 Transformer 完美满足这两条——这正是它能跨请求复用前缀的原因。

### Claim: 线性注意力的循环状态破坏 prefix caching 的三条假设

- **来源**：[[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.85
- **状态**：stale

> 线性注意力/SSM 层维护的不是 token 级 KV，而是固定大小的循环状态，带来三个结构性障碍（参考 PyTorch 博客 Hybrid Models Meet SGLang）：①**原地更新**——`S_t = f(S_{t-1}, x_t)` 是覆盖式更新，旧值被吃掉，无法回滚到第 k 个 token 的状态，而前缀复用本质要求"能定位到某前缀位置的状态"；②**体积大**——缓存一个前缀要存完整的 d_k×d_v 状态矩阵而非单 token 的 (K,V) 向量，单位前缀成本高一个量级；③**全有或全无**——前向 kernel 按 chunk 计算，只能在完整 chunk 边界 checkpoint，前缀长度不对齐到 chunk 边界就一点都复用不了。

### Claim: Hybrid 难点在同时管两套异构缓存，对齐策略牺牲短请求命中

- **来源**：[[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.85
- **状态**：stale

> Hybrid 模型里全注意力层和线性层交错存在，做 prefix caching 必须**同时**维护两套缓存：全注意力层的 token 级 KV 块（可逐 token 共享）+ 线性层的 chunk 级状态快照（只能在对齐边界复用）。两套缓存的粒度、生命周期、淘汰策略都不同；更麻烦的是为了对齐，框架往往把 attention 的 block size 强行对齐到线性层的 chunk/page 大小——vLLM 因此把 block size 对齐到 528 tokens，**短请求直接落不到任何可复用边界、命中率归零**。这就是纯 Transformer 的 Qwen3 缓存正常、Hybrid 的 Qwen3.5 命中极低的根因：不是 bug，是架构迁移的必然代价。

### Claim: 多模态"图像在前"是独立叠加的命中率杀手

- **来源**：[[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.8
- **状态**：stale

> 视觉语言模型（Qwen-VL 家族）再加一层问题：图像 token 被 `<|vision_start|>…<|vision_end|>` 包裹、按惯例置于用户消息最前。于是不同请求的图像各不相同 → 序列从图像区第一个 token 起就分叉；能共享的只剩 system prompt 那一小段文本前缀；图像之后即便文字相同也因前缀已分叉而无法复用。注意：Qwen2-VL 起采用**动态分辨率**，单图视觉 token 数不是固定 576，而是 4~16384 随分辨率变化——数字会变，但"图像在前 + 各请求不同"的结构事实不变。对 Qwen3.5-VL，"图像在前"（多模态杀手）和"Hybrid 架构"（架构杀手）是两个独立但叠加的杀手，两者叠加命中率自然趋近 0。此外图像 KV 不能跨请求复用——强行复用会破坏 mRoPE 位置编码导致新旧图像混淆。

### Claim: speculative decoding 与 prefix caching 在 Hybrid 上争用同一套状态存档能力

- **来源**：[[2026-06-22-周一]]
- **首次出现**：2026-06-22
- **最近更新**：2026-06-22
- **置信度**：0.8
- **状态**：stale

> 社区实测（Qwen3.6-27B + vLLM nightly）：**关掉 speculative decoding 后 prefix cache 命中恢复**——命中 0 时优先试这一招。冲突根源不是 prefill/decode 阶段之争，而是 Hybrid 状态管理瓶颈：① 推测解码的"验证"本质是 decode 期的一次小 prefill，要推进 Mamba/GDN 循环状态，碰到和 prefix caching 同一套机器；② 两者都要线性层状态的细粒度存档/回滚（prefix caching 在前缀边界存档、spec decoding 在候选被拒时回滚），而循环状态原地更新、只能 chunk 边界 checkpoint，这能力本就稀缺却被同时争用；③ 推测解码让每步推进的 token 数变长且可变，打乱 prefix-cache 块的对齐边界（叠加在 vLLM 528-token block 对齐之上）→ 任何前缀块都匹配不上 → 命中恒 0。落地顺序：查日志确认 → 显式开 `--enable-prefix-caching` → 关掉 speculative decoding → 仍不行换 SGLang（MambaRadixCache）→ 或小规模退用 llama.cpp。

### Claim: 缓存经济学首次有跨厂商价格实证——缓存命中价是独立竞争维度，prompt 结构越稳定越占优

- **来源**：[[国内大模型新一轮架构与价格优化——Qwen3.8-Flash与GLM-5.3-Flash的六层降本解剖]]
- **首次出现**：2026-08-31
- **最近更新**：2026-09-04
- **置信度**：0.8
- **状态**：active

> 截至 2026-08-31 的跨厂商缓存输入价（美元/百万 token）：DeepSeek V4 Flash 空闲时段 **$0.007**（高峰 $0.014）vs Qwen3.8-Flash $0.016 vs GLM-5.3-Flash 限时 $0.015（原价 $0.03）——DeepSeek 未缓存单价被两家击穿，但缓存命中价仍是最低的一半，前缀缓存成为独立于"token 单价"的竞争维度。选型含义：**多轮 Agent 复用相同 system prompt、代码仓库反复出现、长文档固定前缀、多用户共享知识库前缀——prompt 结构越稳定 DeepSeek 越占优**；每次大量新输入、缓存命中率低、请求落在 DeepSeek 高峰时段（工作日 9–12/14–18 北京时间，峰谷价差 2×）则 Qwen/GLM 占优。峰谷分时计费本身也是新变量：缓存经济学从"开不开"变成"何时命中、命中多少、什么时段"三维账。

### Claim: GPT-5.6 把 prompt caching 变为一等机制——控制权/计费/报告三换轨，128N 是报告取整口径而非放置规则

- **来源**：[[Prompt Cache系列01：两代缓存框架——GPT-5.6前后的机制、计费与路由差异]]
- **首次出现**：2026-09-13
- **最近更新**：2026-09-16
- **置信度**：0.8（官方文档 2026-09-13 抓取 + Azure gpt-5.6-luna 实测印证）
- **状态**：active

> 服务化封装层的两代框架分野（GPT-5.6 前后）体现为三个换轨：**控制权**——从服务按固定间隔（GPT-5.5 为 2,048 tokens）自动放断点，变为开发者可用 `prompt_cache_breakpoint` 显式指定（每请求最多 4 个写入槽位，implicit 断点占其一）或 implicit 模式在最新 eligible 消息末尾放断点；**计费**——写入从免费变为 1.25× 单独计费、读取 0.1×；**报告**——`cached_tokens` 从向下取整 128 倍数变为精确 eligible 边界。旧"128N"规律是**报告取整口径**，不是断点放置规则、更不是图片计量规则——GPT-5.6+ 上隐式缓存同样非 128N（实测读取值 5,677/5,678/4,797 无一是 128 倍数）。两代的本质差别是切分依据：旧框架**按 token 计数切**（结构无关，边界可落消息中间），新框架**按内容结构切**（eligible 消息末尾或显式 content block 边界）——代价是结构敏感：原地扩写一条旧消息会让缓存端点从"消息末尾"变"消息中间"而失效，这在旧框架反而不是问题。混用两代经验是实际排错中最常见的坑。

### Claim: 写入计费经济学——三类费率互斥非附加费、写入是增量 delta、explicit-only 免掉永不复用尾部的写入费

- **来源**：[[Prompt Cache系列02：GPT-5.6显式断点与Cache Write计费——从断点槽位到诊断工具]]
- **首次出现**：2026-09-13
- **最近更新**：2026-09-16
- **置信度**：0.8（官方计费公式 + Azure 实测 usage 双证据）
- **状态**：active

> 每个输入 token 按且仅按三类之一计费：普通 1× / 写入 1.25× / 读取 0.1×，官方明确 "not an additive fee"。写入是**增量（delta）**不是整套重写——同一请求可同时 `cached_tokens>0` 且 `cache_write_tokens>0`（实测：固定长文首次写 5,676，换新图后读 5,676 写 0；纯文字第二轮读 4,797 只为新增段写 63~71）。经济性：前缀只用一次写入是净亏（1.25× vs 1×）、用两次回本（1.35× vs 2×）、用十次 2.15×（vs 10×），复用免费刷新 TTL；前缀不足 1,024 可见 token 门槛时"扩到门槛"的 break-even 原始长度 = 102.4 + 1177.6/N。**explicit-only 模式让最后一个显式断点之后的动态尾部（如每次一张新图）不产生写入**——"固定前缀+永不复用尾部"负载下隐式兜底是反向优化（每次为尾部付 1.25× 纯浪费），实测 explicit 配置第二轮写入为 0。另一个易反的方向性：槽位是上限不是配额——explicit-only 把隐式断点整体关掉，不标断点=该请求不用缓存，绝不会自动补隐式断点。因果三层也要分清：读取以此前实际保存过状态为前提（旧模型 in_memory 同样有写入动作、只是不收费）；当前命中≠当前写入；写过也不保证命中。字段缺失≠0：Chat API 未返回 cache write 字段时不能认定写入量或费用为 0，计费口径待厂商澄清。

### Claim: 单机缓存+智能路由是规模化服务的工程选择——命中本质是概率事件，15 RPM 是溢出经验阈值非硬限

- **来源**：[[Prompt Cache系列01：两代缓存框架——GPT-5.6前后的机制、计费与路由差异]]
- **首次出现**：2026-09-13
- **最近更新**：2026-09-16
- **置信度**：0.8（缓存位置为官方原文；Redis 之问四点为已标注的工程推断）
- **状态**：active

> 官方原文：缓存状态（encrypted KV tensors）存放在 **GPU-local storage 的单台机器**上，请求只有被路由到"恰好持有未过期匹配条目"的机器才能命中；单一前缀流量超过 15 requests/min 可能触发 overflow routing——不是配额、不报错不拒绝，代价是命中率下降，且官方未给出随 GPU/显存/模型/context 变化的参数化公式，不要自行外推。为什么不用 Redis 类分布式缓存（**推断，非官方结论**）：① 缓存对象是 KV 张量，几千 token 前缀可达 GB 级，非 Redis 典型 KB~MB 对象；② prefill 需以显存带宽量级供给 GPU，跨网搬运 GB 张量的时间会吃掉计算节省——工程选择是"把请求路由到数据所在机器"而非搬数据；③ 不是做不到是权衡——业界存在分布式方案（NVIDIA Dynamo KV-aware routing + 显存→内存→SSD→对象存储多级 offload）；④ 隐私不是主因（加密/组织隔离/区域边界是策略层手段）。推论：任何"配置对了就保证命中"的说法都不成立——实测同图偶发 miss、新副本首次 miss 后续命中（`routing.serving_pipereplica` 字段旁证预热模型）。GPT-5.6+ 后 `prompt_cache_key` 语义从优化路由变为**计量隔离**（key 变化可能让 usage 报 miss 而物理上没 miss），旧时代"按流量拆 key"的最佳实践不能原样搬。

### Claim: 隐式断点的结构敏感性与 API 层分叉——"共享前缀≠缓存前缀"的多模态实测复刻，API 是缓存能力差异的独立变量

- **来源**：[[Prompt Cache系列03：Luna图文实测——1899次请求的Benchmark与Chat API零读取异常]]
- **首次出现**：2026-09-13
- **最近更新**：2026-09-16
- **置信度**：0.75（1,899 次请求实测；Chat 图文异常未获厂商根因确认，限本资源本部署）
- **状态**：active

> 客户"固定长文字+每次新图"零命中要分两层剥离。**第一层是机制预期非 bug**：一条 user 消息内「文字块+图片块」结构下，唯一的隐式断点在消息末尾（图片之后），文字/图片交界处没有 lookup 边界——请求写入的是「文字+图A」整体，换图即在分叉点之前查无可查，这是官方 Gotcha #1（共享前缀≠缓存前缀）的多模态版本。修复实证：user 位置固定文字打显式断点把命中从 **0/69 拉到 62/68**；或把固定文字放进 developer/system 消息（初始连续 developer 块末尾是天然 lookup 边界，10~11/12 命中）。**第二层才是异常**：施加同样修复后 Responses API 行为与机制预测严丝合缝，而 **Chat API 在本资源全部修复配置下依然全零**（新图 0/421；串行 15s 复测 0/144 且 explicit 组连写入都为 0），同资源纯文字两轮 Chat 正常（44/48）、同图重复正常——**API 层是缓存能力差异的独立变量**：官方 GPT-5.6+ 断点/诊断文档通篇围绕 Responses 写，Chat 对图文消息断点语义是否完整实现文档未明说。定性措辞纪律：只能说"本资源/本部署持续复现、疑似实现或部署差异、待厂商确认"，不能推广为"Chat 缓存不可用"或"所有 Azure 部署都有此问题"。配套排查工具 `prompt_cache_diagnostics`（九种 miss 原因枚举）在本资源实测 6/6 字段整体缺失，能力差异同样待服务方确认。

### Claim: 推理基建判据跨域成立——VLA 的 prefill/decode 类比与视频 token 自回归的 KV cache 继承

- **来源**：[[VLA系列02：扩散与Transformer在VLA中的分工——动作块并行去噪与闭环重规划]]、[[世界模型系列05：像素路线与Cosmos——扩散与自回归双轨WFM、预训练到后训练的场景分工及全模态Cosmos 3]]
- **首次出现**：2026-09-17
- **最近更新**：2026-09-25
- **置信度**：0.65
- **状态**：active

> VLA 架构里 VLM 骨干只做一次 prefill 当编码器（一次编码+十步去噪），"decode 慢"的根源同为显存带宽——与 speculative decoding 的加速动机一致；Cosmos 双轨的离散 token 自回归轨天然继承 LLM 全套推理基建（KV cache、投机解码），这正是 tokenizer 选离散的核心收益之一（连续潜变量扩散轨则拿画质上限）。缓存与解码经济学的判据在动作、视频两个新模态域复现。

## 冲突与演进

- 2026-09-16：注入 Prompt Cache 系列01~03 四条 Claims（两代框架三换轨/写入计费经济学/单机缓存+智能路由/结构敏感性与 API 层分叉）——页面从推理引擎层扩展到服务化封装层，C 类 83% stale 获最强 active 回填；摘要补服务层一段。
- 2026-09-04：注入六层降本文 Claim——缓存经济学获得首个跨厂商价格实证维度（此前 Claims 聚焦命中率机制，本条补商业面）。页面脱离 stale（08-21 曾跨线）。
- 2026-06-22：从 Qwen3.5 缓存命中归零的真实客户问题出发，理清 prefix caching 的两条隐含假设、线性注意力循环状态如何三条全破、Hybrid 双缓存难题、多模态与 speculative decoding 两个叠加杀手。

## 关联概念

- [[distributed-training-parallelism]] — `contrasts` 推理并行（vLLM/SGLang TP/PP，无 backward）与训练并行的本质区别

## 来源日记

- [[2026-06-22-周一]] — speculative decoding 与 prefix caching 在 Hybrid 上的冲突、客户落地分步处理
- [[线性注意力时代的推理架构之二——为什么Hybrid模型难做PrefixCaching]] — 两条假设、三个障碍、双缓存难题、多模态杀手
- [[线性注意力时代的推理架构之三——vLLM与SGLang支持对比与调优]] — vLLM Hybrid KV Cache Manager 与 SGLang MambaRadixCache 框架支持对比
- [[国内大模型新一轮架构与价格优化——Qwen3.8-Flash与GLM-5.3-Flash的六层降本解剖]] — 跨厂商缓存命中价对比、峰谷分时计费、prompt 结构稳定性选型判据
- [[Prompt Cache系列01：两代缓存框架——GPT-5.6前后的机制、计费与路由差异]] — 两代框架总对照、缓存位置与路由、Redis 之问
- [[Prompt Cache系列02：GPT-5.6显式断点与Cache Write计费——从断点槽位到诊断工具]] — 断点槽位规则、计费公式与 break-even、诊断工具
- [[Prompt Cache系列03：Luna图文实测——1899次请求的Benchmark与Chat API零读取异常]] — 1,899 次请求实测、Gotcha #1 多模态复刻、Chat API 异常定性
