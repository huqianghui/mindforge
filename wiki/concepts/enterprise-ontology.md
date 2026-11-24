---
title: "Enterprise Ontology"
created: "2026-04-13"
updated: "2026-11-24"
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

### Claim: Palantir Ontology 的四类构件分语义层与动力层——Object Type、Link Type、Interface 描述"有什么、怎么关联、有什么共性"，Action Type 与 Function 描述"能做什么、怎么变"；能读也能写，是它与 BI 语义层的根本区别

- **来源**：[[Palantir-Ontology的工程实践]]
- **首次出现**：2026-03-18
- **最近更新**：2026-11-24
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务

> Object Type 背后对应一个或多个数据集，要定主键、从数据列映射属性（含共享属性、派生属性、结构体）、设细粒度安全控制；Link Type 让本体成为图而不是扁平表，用户能沿关系链导航；Interface 做多态，多个类型共享同一形状时统一描述。Action Type 是写端：参数与校验、提交条件、副作用（通知、Webhook）、由 Function 支撑的批量逻辑，把每一个运营动作（调阀门、批工单、调库存）建模、关联、治理；Function 用 TypeScript 或 Python 写任意复杂的业务逻辑。传统架构里表和视图面向存储、ETL 管道随需求丛生、API 点对点集成 N(N-1)/2、数据湖解决存储没解决语义、BI 语义层只读不写；本体作为单一逻辑层，新应用只需引用已有的对象与动作类型，权限跟着对象走而不是在每个应用里重做。这几类构件和哲学本体论的问题一一对应：有什么存在（Object Type）、之间什么关系（Link Type）、有什么属性（Property）、能对它做什么（Action Type）、怎么变化（Function）、有什么共性（Interface），对照 [[ontology-philosophy]] 的五组范畴映射，Palantir 多出来的正是"动作"这一组。

### Claim: 本体在 AI 平台里承担三件事——把 LLM 的回答锚定在定义好的实体与关系上、把已有业务流程变成 AI 可调用的工具、把 AI 决策带着人工审核与审计写回业务系统

- **来源**：[[Palantir-Ontology的工程实践]]
- **首次出现**：2026-03-18
- **最近更新**：2026-11-24
- **置信度**：0.6
- **状态**：active
- **证据类型**：产品与服务

> Palantir AIP 的主张是把 LLM 锚定在企业本体上。三重角色：① 数据锚定，回答基于本体里的实体、属性和关系而不是自由联想，减少幻觉；② 逻辑绑定，已有的业务流程、机器学习模型、优化工具成为 AI 能调用的工具，比如分析供应链风险时直接调用已定义的"重新平衡库存"动作，不用另开接口；③ 动作同步，把决策写回 ERP、排程平台或边缘设备，内置人工审核和完整审计。配套能力是执行前的情景分析、限定边界内的受限自动化、人和 AI 活动的完整记录。这和 agent 平台里"边界内自主 + 审批 + 追溯"是同一套要求，区别是边界由本体里的动作类型定义。

### Claim: Palantir 与 Fabric IQ 都用本体，但定位不同——前者是企业操作系统的核心抽象、读写统一，后者是数据平台的语义统一层、偏重读端

- **来源**：[[Palantir-Ontology的工程实践]]
- **首次出现**：2026-03-18
- **最近更新**：2026-11-24
- **置信度**：0.5
- **状态**：active
- **证据类型**：产品与服务

> 按 2026-03 的对照：Palantir 读写统一（Action Type），AIP 深度集成，可写回操作系统，平台封闭、通过 OSDK 对外，客户偏政府、国防和大型企业；Fabric IQ 偏重为分析和 agent 提供语义，Copilot 与 agent 通过本体取上下文，写回能力较弱（Operations Agent 当时在预览），生态开放、与 Power BI 和 Notebook 集成，面向更广的企业用户。这是产品对照，Fabric IQ 的动作能力在之后的版本里可能已经变化，引用前按官方文档复核。

### Claim: 本体、DDD、Data Mesh 回答的是三个不同问题——DDD 教你怎么正确描述一个领域，Data Mesh 决定谁拥有数据、谁对质量负责，本体管数据如何被理解和操作；三者互补而不是替代

- **来源**：[[Palantir数据本体论：从概念到产品]]
- **首次出现**：2026-03-18
- **最近更新**：2026-11-24
- **置信度**：0.65
- **状态**：active
- **证据类型**：理论

> DDD 是方法论、聚焦领域模型、没有行动能力、要工程团队自己实现，产出是领域模型文档和代码结构；Data Mesh 是去中心化架构，领域团队各自拥有数据产品、联邦治理、领域自治，适合大型分布式组织；Palantir 本体是集中式语义层加操作闭环、统一模型、对象级权限的集中治理，适合需要全局视图和统一决策的组织。一句话类比：DDD 是设计图纸的思想，Data Mesh 是团队分工与治理的组织架构，本体是把"数据 → 语义 → 决策 → 行动"全链路放在一个平台上的集中式引擎。上面"DDD 是蓝图思维"一条只比了前两者。

### Claim: 从数据到业务的落地是三步——把表重塑成对象与链接、让全组织对同一个对象说同一种语言、定义可执行的操作形成"决策再录入"的闭环；统一语言靠数据、逻辑、操作三层的活模型，而不是一份数据字典

- **来源**：[[Palantir数据本体论：从概念到产品]]
- **首次出现**：2026-03-18
- **最近更新**：2026-11-24
- **置信度**：0.65
- **状态**：active
- **证据类型**：理论

> 第一步把 `tbl_customer`、`tbl_order` 这类表和 JOIN 换成 Customer、Order 对象和它们之间的语义关系，产出一张数据地图；第二步让销售、财务、客服说的"客户"指向同一个对象、同一套属性和关系——数据字典只是名词解释，本体还定义了关系、当前状态和行为模式，是数字孪生；第三步通过动作类型让人和 AI 能直接执行操作（调库存、批工单、重新分配资源），结果实时写回本体，形成"决策 → 执行 → 数据更新 → 新分析 → 新决策"的闭环。统一语言的实现依赖三层：数据层整合清洗并映射为对象，逻辑层定义规则与计算，操作层连回业务系统。逻辑层再按粒度分三档：定义层面的小模型（订单金额 = 单价 × 数量）、关系层面的中模型（供应商评级低于阈值时关联采购单要额外审批）、分析判断层面的大模型（按历史预测需求波动、自动调安全库存）。

### Claim: 本体不是买来就能用的产品，而是要深度实施的方案——派驻前线部署工程师手工梳理每个对象类型和关系，AI 能辅助但业务理解靠人；全组织共享后还要解决变更冲突、版本发布与权限隔离

- **来源**：[[Palantir数据本体论：从概念到产品]]
- **首次出现**：2026-03-18
- **最近更新**：2026-11-24
- **置信度**：0.6
- **状态**：active
- **证据类型**：产品与服务

> 把一个组织的业务完整映射成本体是极其复杂的工程。Palantir 的做法是向客户派驻 FDE，深入业务流程、手工建模；AIP 推出后部分建模可以由 AI 辅助，但核心的业务理解和决策仍依赖人类专家——这种重度定制化本身就是它的壁垒之一。本体被全组织共享以后的挑战是灵活性与版本冲突，对应手段是 AI 实时监测本体变更并预警冲突、自研的部署与版本管理平台（版本控制、灰度、回滚）、军工级的权限与密级隔离。这一条和 [[forward-deployed-engineer]] 的"FDE 是外部调节器"互相印证：本体越深，越需要持续的人在客户现场调节。

## 冲突与演进

- 2026-11-24：/extract-knowledge 厚度补抽第二批：Palantir 数据本体论 +3（与 DDD、Data Mesh 的分工，三步落地路径与三层活模型，深度实施与版本协调）。
- 2026-11-24：/extract-knowledge 厚度补抽 Palantir Ontology 工程实践：新增四类构件与读写统一、在 AI 平台里的三重角色、与 Fabric IQ 的定位差别三条。
- 2026-08-04：回补 Fabric IQ Graph 深潜章节——LPG 引擎、GQL、语义路由/计算层分工、表到图转换与当前限制；页面由 stale 注入新活跃证据。
- 2026-11-07：/revalidate 全库复核（证据分类）——长效 3、确认 2

## 关联概念

- [[ontology-philosophy]] — `implements` 本体论在企业数据语义层的落地
- [[rag-architecture-comparison]] — `grounds` Ontology 是企业级 RAG 的语义基础层

## 来源日记

- [[Microsoft-Fabric-IQ与本体论]] — Fabric IQ Ontology
- [[Fabric-IQ本体管理实操]] — 实操解析
- [[Palantir-Ontology的工程实践]] — Palantir 实践
- [[Palantir数据本体论：从概念到产品]] — 深度解析
