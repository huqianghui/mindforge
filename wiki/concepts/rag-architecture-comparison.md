---
title: "RAG Architecture Comparison"
created: "2026-04-13"
updated: "2026-04-13"
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
  - "[[enterprise-ontology]]"
  - "[[llm-wiki]]"
  - "[[continual-self-improving-ai]]"
---

# RAG Architecture Comparison

## 摘要

个人级 RAG（qmd）与企业级 RAG（Foundry IQ + Fabric IQ）在架构上有本质差异。qmd 使用 BM25 + vector + HyDE 三重混合检索实现"个人文件最佳搜索"；Foundry IQ 提供 LLM 驱动的查询分解和多源并行检索。Fabric IQ 定义数据含义（ontology + graph），Foundry IQ 检索与合成答案，两者构成互补的语义基础 + agentic 检索架构。

## Claims

### Claim: qmd 与 Foundry IQ 定位不同

- **来源**：[[qmd与Microsoft Foundry IQ的RAG能力对比——从个人知识库到企业级检索]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> qmd = "best search on your own files on your own device"（BM25 + vector + HyDE），Foundry IQ = enterprise agentic retrieval（LLM 驱动查询分解 + 多源并行检索）。

### Claim: Fabric IQ 与 Foundry IQ 互补

- **来源**：[[qmd与Microsoft Foundry IQ的RAG能力对比——从个人知识库到企业级检索]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Fabric IQ 定义数据含义（ontology + graph），Foundry IQ 检索与合成答案。

### Claim: 知识图谱是个人与企业 RAG 的关键差距

- **来源**：[[qmd与Microsoft Foundry IQ的RAG能力对比——从个人知识库到企业级检索]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> qmd 缺乏知识图谱能力，Fabric IQ 提供原生 Labeled Property Graph + ISO GQL 支持。

### Claim: Azure 企业级 LLM Wiki 架构——AI Search + CosmosDB Gremlin + OmniRAG 路由

- **来源**：[[2026-04-12-周日]]
- **首次出现**：2026-04-12
- **最近更新**：2026-04-12
- **置信度**：0.5
- **状态**：active

> 基于 Karpathy LLM Wiki 概念的 Azure 企业级方案：AI Search 做搜索主体（BM25 + Vector + 语义重排），CosmosDB Gremlin API 做 Entity/Relationship 存储与遍历（对应 Obsidian Graph View/Backlinks）。OmniRAG 路由——语义查询走 AI Search，关系查询走 Gremlin 图遍历，复合查询先图遍历缩小范围再 AI Search 精排。小规模成本 ~$80-115/月（AI Search Basic + CosmosDB Serverless）。

## 冲突与演进

（暂无）

## 关联概念

- [[enterprise-ontology]] — `uses` Ontology 是企业 RAG 的语义基础
- [[llm-wiki]] — `contrasts` LLM Wiki 是"编译式"知识而非"检索式"知识
- [[continual-self-improving-ai]] — `uses` EntiGraph + RAG 互补关系

## 来源日记

- [[qmd与Microsoft Foundry IQ的RAG能力对比——从个人知识库到企业级检索]] — RAG 对比分析
- [[2026-04-12-周日]] — Azure 企业级 LLM Wiki 架构方案探索
