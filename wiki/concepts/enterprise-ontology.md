---
title: "Enterprise Ontology"
created: "2026-04-13"
updated: "2026-11-07"
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
  - "[[rag-architecture-comparison]]"
---

# Enterprise Ontology

## 摘要

企业数据在数据湖中实现了物理统一，但语义仍然碎片化——不同团队对"客户"、"订单"、"产品"的解释不一致。Ontology 作为统一语义定义层，让所有下游工具（Power BI、Notebook、AI Agent）共享同一套业务词汇。Microsoft Fabric IQ 是微软首次在数据平台产品中正式采用"Ontology"一词。Palantir Ontology 则是从静态数据地图升级为实时导航系统，具有 Action Types 的行动闭环能力。

## Claims

### Claim: 企业数据物理统一但语义碎片化

- **来源**：[[Microsoft-Fabric-IQ与本体论]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过 语义碎片化、Fabric IQ、ontology：wiki/concepts/enterprise-ontology.md）

> 不同团队对"客户"、"订单"、"产品"的解释不一致，导致报表错位和 AI 回答不准确。

### Claim: Fabric IQ 是微软首次正式采用"Ontology"

- **来源**：[[Microsoft-Fabric-IQ与本体论]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 修订——依据：Fabric IQ 文档 https://learn.microsoft.com/en-us/fabric/iq/overview 显示 Ontology 为 Fabric IQ 的核心 item，但仍标注 (preview)；'首次'一词本轮无官方佐证

> **现行结论（2026-11-07 修订）**：Fabric IQ 及 Ontology 目前仍为 preview（预览），并去掉或弱化'首次'的断言
>
> 以下为原记录：
> 首次在数据平台产品中正式使用该术语。

### Claim: Ontology 将数据从"可查询"升级为"可理解、可推理、可行动"

- **来源**：[[Fabric-IQ本体管理实操]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过 enterprise-ontology、Fabric IQ、Palantir）

> 超越传统数据仓库的真正价值主张。

### Claim: Palantir Ontology 是操作语义层而非数据库

- **来源**：[[Palantir-Ontology的工程实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 修订——依据：Palantir 文档 https://palantir.com/docs/foundry/ontology/overview 称 Ontology 是 operational layer 并含 semantic 与 kinetic 两类要素；https://palantir.com/docs/foundry/object-backend/overview 另有 Object databases 为对象建索引

> **现行结论（2026-11-07 修订）**：'不复制数据'过于绝对：Ontology 通过 backing datasource 映射，运行时由 object databases 索引对象数据；应改为'语义+动作的操作层，而非单纯数据库'
>
> 以下为原记录：
> 不复制数据，而是编码业务逻辑。将企业数据景观从"静态地图"升级为"实时导航系统"。

### Claim: DDD 是"蓝图思维"，Palantir Ontology 超越纯数据建模

- **来源**：[[Palantir数据本体论：从概念到产品]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Palantir Action Types 文档 https://palantir.com/docs/foundry/action-types/overview ：action 是修改对象/属性/链接的事务，逻辑与校验跨应用一致；Ontology 含 kinetic 要素

> DDD 告诉你如何建模，Ontology 提供运行时平台——通过 Action Types 实现行动闭环。

### Claim: Ontology 为 AI/ML 模型提供结构化语义基础

- **来源**：[[Palantir数据本体论：从概念到产品]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过 enterprise-ontology、Ontology 语义基础、AI/ML）

> 让模型在语义明确的对象图上推理而非原始数据表，降低幻觉风险。

### Claim: Fabric IQ Graph 是真正的 LPG 图数据库引擎——Ontology 做语义路由层、Graph 做计算层

- **来源**：[[Microsoft-Fabric-IQ与本体论]]
- **首次出现**：2026-07-24
- **最近更新**：2026-11-07
- **置信度**：0.75
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Fabric graph 文档 https://learn.microsoft.com/en-us/fabric/graph/overview ：labeled property graph，用 ISO GQL；Fabric IQ overview https://learn.microsoft.com/en-us/fabric/iq/overview ：Ontology 创建后可选生成内置 graph model。路由到 Semantic Model 的细节与 'scale-out' 措辞本轮未逐句核对

> Fabric IQ 的 Graph 与 Microsoft Graph（`graph.microsoft.com`，M365 REST API 网关）完全无关：它是原生 scale-out 图数据库引擎，实现 **Labeled Property Graph（LPG）**模型，查询语言用 ISO 标准 **GQL**（而非 Cypher/GraphQL）。与 Ontology 的分工是"语义层 + 计算层"：Ontology 作为语义路由层，把聚合类查询（KPI/DAX）路由到 Semantic Model、把多跳遍历和图算法路由到 Graph Engine。转换逻辑：关系表每行 → 节点，外键 → 带属性的边；创建 Ontology 时 Graph 作为子项目自动生成。价值边界清晰：单跳查询等价 SQL JOIN 不需要图，3 层以上关系穿越（"订单→发货→温度传感器→冷链违规"）才是 Graph 的主场。当前限制：不随上游自动刷新（需手动/定时）、不支持 Schema 演化（结构变更要重新 ingest）。

## 冲突与演进

- 2026-08-04：回补 Fabric IQ Graph 深潜章节——LPG 引擎、GQL、语义路由/计算层分工、表到图转换与当前限制；页面由 stale 注入新活跃证据。
- 2026-11-07：/revalidate 全库复核（证据分类）——长效 3、确认 2

## 关联概念

- [[rag-architecture-comparison]] — `grounds` Ontology 是企业级 RAG 的语义基础层

## 来源日记

- [[Microsoft-Fabric-IQ与本体论]] — Fabric IQ Ontology
- [[Fabric-IQ本体管理实操]] — 实操解析
- [[Palantir-Ontology的工程实践]] — Palantir 实践
- [[Palantir数据本体论：从概念到产品]] — 深度解析
