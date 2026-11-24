---
title: "LLM Serving"
created: "2026-11-16"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - inference
  - llm-serving
  - vllm
  - sglang
aliases:
  - "LLM 推理服务"
  - "推理服务"
  - "Inference Serving"
  - "推理引擎"
  - "vLLM"
  - "SGLang"
related:
  - "[[prefix-caching]]"
  - "[[hybrid-linear-attention-architecture]]"
  - "[[hybrid-inference-framework-selection]]"
  - "[[throughput-latency-operating-point]]"
  - "[[ai-inference-asic]]"
  - "[[model-routing]]"
  - "[[cost-per-task]]"
  - "[[agent-runtime]]"
  - "[[ai-gateway]]"
---

# LLM Serving（LLM 推理服务）

## 摘要

LLM 推理服务回答"一个模型怎么以可接受的延迟和成本被大量调用"。按从下到上的顺序可以分成五层，每一层在 wiki 里各有归口：

- **模型架构**：注意力怎么存记忆，决定了缓存长什么样——全注意力的 KV 随长度增长，线性注意力与 Mamba 类是固定大小的循环状态，Hybrid 两者交错（[[hybrid-linear-attention-architecture]]）
- **单机推理引擎**：vLLM、SGLang、llama.cpp 负责批处理、显存与 KV 管理、前缀复用；引擎怎么选见 [[hybrid-inference-framework-selection]]
- **分布式编排**：Dynamo 这类控制面在多副本、多节点之上做 KV 感知路由、优先级调度、Prefill / Decode 分离（[[prefix-caching]] 的编排层一条）
- **托管 API**：prompt caching 的命中价与写入计费、缓存放在哪台机器上（[[prefix-caching]]）
- **硬件**：推理 ASIC、能效与芯片的联合设计（[[ai-inference-asic]]）

贯穿五层的是缓存，判断各层优化效果的方法是先定工作点与分母（[[throughput-latency-operating-point]]），最终要比的是每成功任务成本（[[cost-per-task]]）。在 agent runtime 里，这一整层位于模型网关后面：网关负责认会话、转协议、限流，推理服务负责把 token 算出来（[[ai-gateway]]）。

## Claims

### Claim: 推理成本按五层归因——架构定长期价格下限，引擎与系统定可售吞吐，编排守住缓存命中，API 定计费口径，硬件定能效；理论 FLOPs 降低要穿过引擎与系统层才会变成账单降价

- **来源**：[[Qwen3.8-Flash与GLM-5.3-Flash的降本解剖]]、[[Scaling-Agentic-AI-with-NVIDIA-Dynamo-on-Azure]]、[[OpenAI-Jalapeño推理芯片解读]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）

> 降本解剖里的六层（稀疏激活与减层、混合注意力、残差路由、N-gram 记忆外移、训练方法、推理系统兑现）前五层都在模型内部，第六层才落到服务：内存带宽、芯片间通信、批处理效率、长短请求干扰、集群调度每一关都可能把论文里省下的 FLOPs 吃掉。GLM-5.3-Flash 的做法是把优化延伸到整个系统——基于 SGLang 的专用引擎、混合精度缓存量化、Encode / Prefill / Decode 分离；它的"端到端 3 倍"是相对同一硬件上的初始基线，不是跨模型横比。价格上的结论分三段：模型与系统效率决定长期可持续的价格下限，限时补贴决定短期市场价，任务成功率决定用户实际付的总成本。所以读任何"降本 N 倍"先问它落在哪一层、相对什么基线。

### Claim: 缓存是贯穿五层的主线——架构决定缓存的形状，引擎决定能不能跨请求复用，编排决定请求能不能落到持有缓存的机器上，API 决定命中怎么计费；任何一层断掉，命中率都会掉到零

- **来源**：[[线性注意力时代的推理架构之二：Prefix-Caching]]、[[线性注意力时代的推理架构之三：vLLM与SGLang]]、[[SGLang与vLLM的基因之争]]、[[Scaling-Agentic-AI-with-NVIDIA-Dynamo-on-Azure]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.75
- **状态**：active
- **证据类型**：理论（长效）

> 架构层：全注意力的 KV 可以按前缀切块复用；线性注意力的循环状态原地更新、体积大、全有或全无，Hybrid 要同时管两套异构缓存，短前缀命中近零是架构迁移的副作用。引擎层：vLLM 是 token-centric、为 attention-only 的吞吐设计，Hybrid 要靠 block 对齐、伤短请求；SGLang 是 prefix-centric，RadixAttention 把 KV 组织成前缀树，再把循环状态纳入（MambaRadixCache）；llama.cpp 只是 slot 内续接，跨请求复用尚未实现。编排层：多副本下不认会话的路由会把前缀打散，要按会话路由、钉住关键前缀。API 层：托管缓存只有路由到恰好持有条目的机器才命中，命中价是独立的竞争维度。再往上，模型路由受"缓存不跨模型共享"约束（[[model-routing]]）。排查顺序因此是自下而上：架构支不支持 → 引擎开没开、对不对齐 → 路由认不认会话 → 计费口径。vLLM 上命中率为 0 时社区验证最有效的一招是先关掉推测解码。

### Claim: 服务架构在往"拆开"走——控制面与引擎分层、Prefill 与 Decode（以及多模态 Encode）拆成独立工作池分别扩缩容；推动它的是 agent 负载：长上下文、多轮复用、前后台请求并行

- **来源**：[[Scaling-Agentic-AI-with-NVIDIA-Dynamo-on-Azure]]、[[Qwen3.8-Flash与GLM-5.3-Flash的降本解剖]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.65
- **状态**：active
- **证据类型**：产品与服务

> 两个"拆"：一是分层——Dynamo 作控制面调度请求、分配 GPU、管理 KV，vLLM / SGLang 作单机数据面；二是分阶段——Prefill（吃长输入、算力密集）与 Decode（逐 token、带宽密集）资源画像不同，混在一个池里会互相干扰，GLM-5.3-Flash 进一步把多模态 Encode 单独拆出（EPD）。agent 负载让拆分更必要：多轮对话的 KV 巨大且要跨轮复用、一次任务串联多轮推理、实时对话与后台批处理同时存在且优先级不同。拆分的代价是 KV 要在池之间搬运，所以路由和缓存管理成了编排层的核心（agent hints、KV 感知路由、pinning）。来自厂商材料与模型发布说明，本库未自建验证。

### Claim: 引擎选型要带日期、带负载形态——按部署规模分档，Hybrid 与 agent 这类前缀复用重的负载 SGLang 先发；读 benchmark 先辨工作点和分母，最后落到每成功任务成本

- **来源**：[[SGLang与vLLM的基因之争]]、[[线性注意力时代的推理架构之三：vLLM与SGLang]]、[[Qwen3.8-Flash与GLM-5.3-Flash的降本解剖]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务

> 选型的具体分档（llama.cpp / SGLang / vLLM）与"SGLang 领先是设计基因"的论证在 [[hybrid-inference-framework-selection]]；这里补的是选型要带的两个前提。一是日期：SGLang 在 Hybrid 上的领先是先发优势与时间窗口，不是永久护城河，vLLM 在追（跟踪 Hybrid 前缀缓存的 tracking issue），所以选型结论要写明是哪个时间点的快照。二是读数：同一套硬件能同时给出 1.9× 与 104× 两个不矛盾的数，它们是吞吐—延迟曲线上不同工作点的读数；per-kW 与 per-chip、峰时与谷时是不同分母（[[throughput-latency-operating-point]]）。最后的口径是每成功任务成本——便宜模型重试三次就可能比一次做对的贵模型更贵（[[cost-per-task]]）。

## 冲突与演进

- 2026-11-16：层级缺口检查发现推理服务相关的四页（[[prefix-caching]]、[[hybrid-linear-attention-architecture]]、[[throughput-latency-operating-point]]、[[hybrid-inference-framework-selection]]）平铺、没有共同的上层概念，补建本伞形页。各页 Claim 不搬动，本页只放跨层判断；引擎名 vLLM、SGLang 作别名，不单独建页。

## 关联概念

- [[hybrid-linear-attention-architecture]] — `part-of` 模型架构层：注意力怎么存记忆
- [[prefix-caching]] — `part-of` 贯穿引擎、编排、API 三层的缓存机制
- [[hybrid-inference-framework-selection]] — `part-of` 单机推理引擎的选型
- [[throughput-latency-operating-point]] — `uses` 读各层性能数字的方法
- [[ai-inference-asic]] — `part-of` 硬件层
- [[model-routing]] — `constrains` 缓存不跨模型共享，限制了上层的路由粒度
- [[cost-per-task]] — `grounds` 最终比的是每成功任务成本
- [[agent-runtime]] — `contrasts` runtime 里的模型网关在前，推理服务在网关后面
- [[ai-gateway]] — `contrasts` 网关认会话与限流，推理服务负责生成

## 来源日记

- [[线性注意力时代的推理架构之一：Hybrid架构]] / [[线性注意力时代的推理架构之二：Prefix-Caching]] / [[线性注意力时代的推理架构之三：vLLM与SGLang]] — 架构、缓存失效、引擎现状
- [[SGLang与vLLM的基因之争]] — token-centric 与 prefix-centric
- [[Qwen3.8-Flash与GLM-5.3-Flash的降本解剖]] — 六层降本与每成功任务成本
- [[Scaling-Agentic-AI-with-NVIDIA-Dynamo-on-Azure]] — 控制面与引擎分层、agent 负载下的编排
- [[OpenAI-Jalapeño推理芯片解读]] — 硬件层与工作点读数
