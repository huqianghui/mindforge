---
title: "LLM Wiki"
created: "2026-04-12"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - llm
  - knowledge-management
  - rag
aliases:
  - "LLM Wiki"
  - "Personal Knowledge Compiler"
  - "PKC"
related:
  - "[[azure-copilot-ecosystem]]"
  - "[[harness-quality-gate]]"
  - "[[personal-knowledge-compiler]]"
  - "[[rag-architecture-comparison]]"
---

# LLM Wiki

## 摘要

LLM Wiki 是 Karpathy 提出的知识管理范式：用 LLM 将原始资料"编译"为结构化的 wiki 文章，知识"compiled once and kept current, not re-derived on every query"。与传统 RAG 的根本区别在于：RAG 在每次查询时从原始文档重新检索碎片 chunk，而 LLM Wiki 预先编译好结构化知识，形成可自增长的知识复利循环。

在个人实践中，LLM Wiki 演化为 Personal Knowledge Compiler（PKC）——以 Obsidian 日记为输入，通过 Claude Code + OMC 编排，将散落在日记中的经验提炼为持久化的 wiki 概念页。

## Claims

### Claim: Azure 企业级 LLM Wiki 应采用 AI Search（主体）+ CosmosDB Gremlin（图数据库补充）的双层架构

- **来源**：[[2026-04-12-周日]]
- **首次出现**：2026-04-12
- **最近更新**：2026-04-13
- **置信度**：0.5
- **状态**：active

> AI Search 承担文档/向量存储 + 混合检索（BM25 + Vector）+ 语义重排的搜索主体角色；CosmosDB Gremlin API 专注于 Entity + Relationship 的存储与多跳遍历——对应 Obsidian 的 Graph View / Backlinks / `[[wikilinks]]`。CosmosDB 不做文档/向量主存储。

### Claim: OmniRAG 路由根据查询类型自动选择最优检索路径

- **来源**：[[2026-04-12-周日]]
- **首次出现**：2026-04-12
- **最近更新**：2026-04-12
- **置信度**：0.5
- **状态**：active

> 语义/关键词查询走 AI Search（主路径），关系/遍历查询走 CosmosDB Gremlin（补充路径），复合查询先 Gremlin 图遍历缩小范围再 AI Search 精排。比单一 Vector RAG 能回答更广泛的问题。

### Claim: LLM Wiki 的知识复利效应优于传统 RAG

- **来源**：[[2026-04-12-周日]]、[[2026-04-13-周一]]
- **首次出现**：2026-04-12
- **最近更新**：2026-04-13
- **置信度**：0.5
- **状态**：active

> 传统 RAG 的 chunk 质量依赖分块策略，每次查询从原始文档重新检索碎片。LLM Wiki 的文章由 LLM 编译保证质量（已综合、交叉引用），好的回答可写回 wiki 形成自增长循环——Karpathy 所说的 "the wiki compounds over time"。

### Claim: 个人知识编译实践的核心流程是 Obsidian 日记 → OMC 编排 → Wiki 概念页

- **来源**：[[2026-04-13-周一]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 已完成文章 → 从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践。核心理念：Vault 是 Source of Truth，OMC 是编排调度层（维护者），不是记忆本身。知识以 Concept + Claims 形式结构化。

### Claim: LLM Wiki 模型——"RAG = search, LLM Wiki = writing a book"

- **来源**：[[从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Karpathy 的 LLM Wiki 模型将 LLM 视为知识维护者（像 Wikipedia 编辑）而非问答者。

## 冲突与演进

初始设计中 CosmosDB 被定位为 NoSQL 文档存储 + 向量索引，后经讨论修正为 Gremlin 图数据库角色，AI Search 承担搜索主体。这是一个架构认知的演进过程。

## 关联概念

- [[azure-copilot-ecosystem]] — `uses` Azure 企业级实现的基础设施层
- [[personal-knowledge-compiler]] — `produces` PKC 是 LLM Wiki 的实践方法论
- [[rag-architecture-comparison]] — `contrasts` LLM Wiki 是"编译式"知识，RAG 是"检索式"知识

## 来源日记

- [[2026-04-12-周日]] — RAG 与 LLM Wiki 的 Azure 企业级方案设计
- [[2026-04-13-周一]] — Obsidian × OMC × LLM Wiki 实践文章完成；Knowledge Layer 重构
