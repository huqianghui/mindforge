---
title: "Enterprise Ontology"
created: "2026-04-13"
updated: "2026-08-04"
tags:
  - wiki
  - concept
  - ontology
  - data-platform
  - fabric-iq
  - palantir
aliases:
  - "企业本体论"
  - "Enterprise Ontology"
  - "Fabric IQ"
  - "Palantir Ontology"
related:
  - "[[ontology-philosophy]]"
  - "[[rag-architecture-comparison]]"
---

# Enterprise Ontology

## 摘要

企业数据在数据湖中实现了物理统一，但语义仍然碎片化——不同团队对"客户"、"订单"、"产品"的解释不一致。Ontology 作为统一语义定义层，让所有下游工具（Power BI、Notebook、AI Agent）共享同一套业务词汇。Microsoft Fabric IQ 是微软首次在数据平台产品中正式采用"Ontology"一词。Palantir Ontology 则是从静态数据地图升级为实时导航系统，具有 Action Types 的行动闭环能力。

## Claims

### Claim: 企业数据物理统一但语义碎片化

- **来源**：[[Microsoft Fabric IQ与本体论（Ontology）研究]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 不同团队对"客户"、"订单"、"产品"的解释不一致，导致报表错位和 AI 回答不准确。

### Claim: Fabric IQ 是微软首次正式采用"Ontology"

- **来源**：[[Microsoft Fabric IQ与本体论（Ontology）研究]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 首次在数据平台产品中正式使用该术语。

### Claim: Ontology 将数据从"可查询"升级为"可理解、可推理、可行动"

- **来源**：[[Microsoft Fabric IQ本体（Ontology）管理功能实操解析]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.8
- **状态**：stale

> 超越传统数据仓库的真正价值主张。

### Claim: Palantir Ontology 是操作语义层而非数据库

- **来源**：[[Palantir Ontology：从哲学本体论到企业操作系统的工程实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 不复制数据，而是编码业务逻辑。将企业数据景观从"静态地图"升级为"实时导航系统"。

### Claim: DDD 是"蓝图思维"，Palantir Ontology 超越纯数据建模

- **来源**：[[Palantir数据本体论（Ontology）：从概念到产品的深度解析]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.8
- **状态**：stale

> DDD 告诉你如何建模，Ontology 提供运行时平台——通过 Action Types 实现行动闭环。

### Claim: Ontology 为 AI/ML 模型提供结构化语义基础

- **来源**：[[Palantir数据本体论（Ontology）：从概念到产品的深度解析]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：stale

> 让模型在语义明确的对象图上推理而非原始数据表，降低幻觉风险。

### Claim: Fabric IQ Graph 是真正的 LPG 图数据库引擎——Ontology 做语义路由层、Graph 做计算层

- **来源**：[[Microsoft Fabric IQ与本体论（Ontology）研究]]
- **首次出现**：2026-07-24
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> Fabric IQ 的 Graph 与 Microsoft Graph（`graph.microsoft.com`，M365 REST API 网关）完全无关：它是原生 scale-out 图数据库引擎，实现 **Labeled Property Graph（LPG）**模型，查询语言用 ISO 标准 **GQL**（而非 Cypher/GraphQL）。与 Ontology 的分工是"语义层 + 计算层"：Ontology 作为语义路由层，把聚合类查询（KPI/DAX）路由到 Semantic Model、把多跳遍历和图算法路由到 Graph Engine。转换逻辑：关系表每行 → 节点，外键 → 带属性的边；创建 Ontology 时 Graph 作为子项目自动生成。价值边界清晰：单跳查询等价 SQL JOIN 不需要图，3 层以上关系穿越（"订单→发货→温度传感器→冷链违规"）才是 Graph 的主场。当前限制：不随上游自动刷新（需手动/定时）、不支持 Schema 演化（结构变更要重新 ingest）。

## 冲突与演进

- 2026-08-04：回补 Fabric IQ Graph 深潜章节——LPG 引擎、GQL、语义路由/计算层分工、表到图转换与当前限制；页面由 stale 注入新活跃证据。

## 关联概念

- [[rag-architecture-comparison]] — `grounds` Ontology 是企业级 RAG 的语义基础层

## 来源日记

- [[Microsoft Fabric IQ与本体论（Ontology）研究]] — Fabric IQ Ontology
- [[Microsoft Fabric IQ本体（Ontology）管理功能实操解析]] — 实操解析
- [[Palantir Ontology：从哲学本体论到企业操作系统的工程实践]] — Palantir 实践
- [[Palantir数据本体论（Ontology）：从概念到产品的深度解析]] — 深度解析
