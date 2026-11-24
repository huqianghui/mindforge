---
title: "RAG Architecture Comparison"
created: "2026-04-13"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - rag
  - search
  - qmd
  - fabric-iq
aliases:
  - "RAG"
  - "RAG 架构对比"
related:
  - "[[llm-wiki]]"
  - "[[wiki-over-rag-for-personal-knowledge]]"
  - "[[context-engineering]]"
---

# RAG Architecture Comparison

## 摘要

个人级 RAG（qmd）与企业级 RAG（Foundry IQ + Fabric IQ）在架构上有本质差异。qmd 使用 BM25 + vector + HyDE 三重混合检索实现"个人文件最佳搜索"；Foundry IQ 提供 LLM 驱动的查询分解和多源并行检索。Fabric IQ 定义数据含义（ontology + graph），Foundry IQ 检索与合成答案，两者构成互补的语义基础 + agentic 检索架构。

## Claims

### Claim: qmd 与 Foundry IQ 定位不同

- **来源**：[[qmd与Foundry-IQ的RAG能力对比]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：依据：Foundry IQ 官方说明为知识库 + agentic retrieval https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/what-is-foundry-iq ；qmd 为库内工具无外部变化

> qmd = "best search on your own files on your own device"（BM25 + vector + HyDE），Foundry IQ = enterprise agentic retrieval（LLM 驱动查询分解 + 多源并行检索）。

### Claim: Fabric IQ 与 Foundry IQ 互补

- **来源**：[[qmd与Foundry-IQ的RAG能力对比]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：依据：Fabric IQ 为语义层（ontology/graph/data agent），Foundry IQ 做检索 https://learn.microsoft.com/en-us/fabric/iq/overview 与 https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/what-is-foundry-iq ；官方还给出把 ontology 暴露为 Foundry IQ knowledge source 的互补用法

> Fabric IQ 定义数据含义（ontology + graph），Foundry IQ 检索与合成答案。

### Claim: 知识图谱是个人与企业 RAG 的关键差距

- **来源**：[[qmd与Foundry-IQ的RAG能力对比]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.6
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 修订——依据：依据：https://learn.microsoft.com/en-us/fabric/iq/overview 称 ontology 为 preview，可选生成内置 graph model；LPG 与 ISO GQL 细节本轮未在官方页核到

> **现行结论（2026-11-07 修订）**：补“Fabric IQ ontology/graph 为 preview，图模型由 ontology 可选生成”；LPG + GQL 表述待官方页核对
>
> 以下为原记录：
> qmd 缺乏知识图谱能力，Fabric IQ 提供原生 Labeled Property Graph + ISO GQL 支持。

### Claim: Azure 企业级 LLM Wiki 架构——AI Search + CosmosDB Gremlin + OmniRAG 路由

- **来源**：[[2026-04-12-周日]]
- **首次出现**：2026-04-12
- **最近更新**：2026-11-24
- **置信度**：0.4
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-24 降级——依据：[Azure Cosmos DB for Apache Gremlin](https://learn.microsoft.com/en-us/azure/cosmos-db/gremlin) 仍在维护，但 [Gremlin limits](https://learn.microsoft.com/en-us/azure/cosmos-db/gremlin/limits) 页提示新建 OLAP 图或迁移 Gremlin 应用时考虑 Graph in Microsoft Fabric；OmniRAG 的官方说明与成本数字本轮未核到

> **现行结论（2026-11-24 降级）**：这套分工（AI Search 做语义检索、图数据库做关系遍历、复合查询先缩范围再精排）作为思路仍成立，但图这一层的产品选择变了——微软在 Gremlin 文档里把新的图分析与迁移需求引向 Fabric 里的 Graph（与 [[enterprise-ontology]] 里"Fabric IQ Graph 是 LPG 引擎"一条一致）。下面每月约 80~115 美元的成本是 2026-04 的估算，未按当前价格核实，不要直接引用。单一旧来源，置信度降到 0.4。
>
> 原记录：基于 Karpathy LLM Wiki 概念的 Azure 企业级方案：AI Search 做搜索主体（BM25 + Vector + 语义重排），CosmosDB Gremlin API 做 Entity/Relationship 存储与遍历（对应 Obsidian Graph View/Backlinks）。OmniRAG 路由——语义查询走 AI Search，关系查询走 Gremlin 图遍历，复合查询先图遍历缩小范围再 AI Search 精排。小规模成本 ~$80-115/月（AI Search Basic + CosmosDB Serverless）。

### Claim: 检索质量的上限取决于让不让模型自己决定"搜什么、读哪里、什么时候够"——AgenticRAG 用 Search / Find / Open / Summarize 四个工具迭代检索，BRIGHT 上 R@1 从单次检索的 8.41% 升到 49.6%，无需训练

- **来源**：[[2026-05-28-AgenticRAG]]
- **首次出现**：2026-05-28
- **最近更新**：2026-11-16
- **置信度**：0.65
- **状态**：active
- **证据类型**：理论（长效）

> 传统 RAG 是固定 pipeline：检索一次再生成。AgenticRAG 把检索做成 agent loop：Search 广度召回（每次至多 10 条候选、默认 5 路子查询并行），Find 在指定文档内定位片段，Open 从行号起读整段原文，Summarize 在上下文接近上限时压缩并保留引用 ID。BRIGHT 数据集上 Claude Sonnet 4.5 从单次检索 8.41% R@1 提到 49.6%（Oracle 上限 94%），推理时集成、不需训练。与 Azure AI Search Agentic Retrieval 的分工对应：搜索引擎只负责召回，"读不读、读哪段、要不要再搜"交给模型。论文精读，数字为论文报告值。

### Claim: 消融说明多轮自主检索是唯一带来质变的因素——多子查询、文档内定位、上下文压缩都只是效率或可扩展性优化；落地按复杂度路由、设迭代上限

- **来源**：[[2026-05-28-AgenticRAG]]
- **首次出现**：2026-05-28
- **最近更新**：2026-11-24
- **置信度**：0.65
- **状态**：active
- **证据类型**：理论

> 消融结果（BRIGHT，R@1）：只允许一次 Search 时 8.41%，是 5.9 倍差距的来源；禁用多子查询 44.84%，召回不降但工具调用多 29%（并行子查询是"用更少轮次覆盖更多"）；禁用语义 Find 46.34%，影响很小；禁用 Summarize 43.34%，对精度没有影响，但长文档、多跳推理时不压缩会溢出 128K 上下文。代价是 token 开销 2.6~7.8 倍，换 5.9 倍召回，作者判断 ROI 为正。落地建议：简单问题仍走单次 RAG（快且便宜），复杂问题走 agentic 流程；先实现多轮检索，再加并行子查询；设迭代上限（论文是 15 轮）并监控 token。定位上它是 ReAct（自主调工具）、PlanRAG（子任务规划）、Self-RAG（自反思）的融合，区别是零训练、兼容企业搜索；Search-R1 这类要用 RL 训检索策略。Summarize 这一步就是 agent 的上下文压缩，适用条件见 [[context-engineering]]。

### Claim: Azure AI Search 的 Agentic Retrieval 只落地了论文里的查询规划与并行子查询——文档内深读、中途压缩、有界循环要自己用编排层补

- **来源**：[[2026-05-28-AgenticRAG]]
- **首次出现**：2026-05-28
- **最近更新**：2026-11-24
- **置信度**：0.55
- **状态**：active
- **证据类型**：产品与服务

> 按 2026-05 读论文时的对照：LLM 查询规划（问题拆解）和多子查询并行检索是 Agentic Retrieval 原生内置的；Find / Open 这种文档内动态定位与翻页要用 Function Calling 加 Blob 读取自己做（产品返回的是段落）；Summarize 只有对话历史摘要，没有任务中途压缩；"最多 15 轮"的有界循环要靠外部编排（Copilot agent 或 Semantic Kernel）。论文与产品可以看作同一方向的研究与产品两条线，产品先落地了召回侧。这是产品功能对照，Agentic Retrieval 之后的版本可能已补上部分能力，引用前要按官方文档复核。

## 冲突与演进

- 2026-11-24：/revalidate——"Azure 企业级 LLM Wiki 架构"降级 0.5 → 0.4（图层产品选择变化、成本未核实）。
- 2026-11-24：/extract-knowledge 补抽 AgenticRAG 论文笔记（按书、论文、文章按同一标准提取的原则补抽偏薄内容），新增消融与落地建议、Azure 产品对照两条。
- 2026-11-16：完备性补抽 [[2026-05-28-AgenticRAG]]，新增 1 条 Claim。
（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——确认 2、待定 1

## 关联概念

- [[llm-wiki]] — `contrasts` LLM Wiki 是"编译式"知识而非"检索式"知识
- [[wiki-over-rag-for-personal-knowledge]] — `contrasts` 该决策从个人知识管理角度论证 Wiki 优于 RAG 的选型逻辑
- [[context-engineering]] — `part-of` RAG 是上下文供应链里"即时检索"那一段；agentic 检索里的 Summarize 就是上下文压缩

## 来源日记

- [[2026-05-28-AgenticRAG]] — 把检索控制权交给模型：四工具迭代与消融
- [[qmd与Foundry-IQ的RAG能力对比]] — RAG 对比分析
- [[2026-04-12-周日]] — Azure 企业级 LLM Wiki 架构方案探索
