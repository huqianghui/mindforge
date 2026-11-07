---
title: "RAG Architecture Comparison"
created: "2026-04-13"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - rag
  - search
  - qmd
  - fabric-iq
aliases:
  - "RAG 架构对比"
related:
  - "[[llm-wiki]]"
  - "[[wiki-over-rag-for-personal-knowledge]]"
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
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：stale

> qmd 缺乏知识图谱能力，Fabric IQ 提供原生 Labeled Property Graph + ISO GQL 支持。

### Claim: Azure 企业级 LLM Wiki 架构——AI Search + CosmosDB Gremlin + OmniRAG 路由

- **来源**：[[2026-04-12-周日]]
- **首次出现**：2026-04-12
- **最近更新**：2026-04-12
- **置信度**：0.5
- **状态**：stale
- **证据类型**：产品与服务
- **复核**：2026-11-07 待定——依据：依据：Tavily 限流(429)，未能核到 AI Search Basic 与 Cosmos Gremlin 的当前价格和状态，~$80-115/月不能下结论

> 基于 Karpathy LLM Wiki 概念的 Azure 企业级方案：AI Search 做搜索主体（BM25 + Vector + 语义重排），CosmosDB Gremlin API 做 Entity/Relationship 存储与遍历（对应 Obsidian Graph View/Backlinks）。OmniRAG 路由——语义查询走 AI Search，关系查询走 Gremlin 图遍历，复合查询先图遍历缩小范围再 AI Search 精排。小规模成本 ~$80-115/月（AI Search Basic + CosmosDB Serverless）。

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——确认 2、待定 1

## 关联概念

- [[llm-wiki]] — `contrasts` LLM Wiki 是"编译式"知识而非"检索式"知识
- [[wiki-over-rag-for-personal-knowledge]] — `contrasts` 该决策从个人知识管理角度论证 Wiki 优于 RAG 的选型逻辑

## 来源日记

- [[qmd与Foundry-IQ的RAG能力对比]] — RAG 对比分析
- [[2026-04-12-周日]] — Azure 企业级 LLM Wiki 架构方案探索
