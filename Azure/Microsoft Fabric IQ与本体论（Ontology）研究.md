---
title: Microsoft Fabric IQ 与本体论（Ontology）研究
created: 2026-03-18
tags: [ontology, microsoft-fabric, fabric-iq, semantic-model, data-platform, azure, knowledge-graph]
---

# Microsoft Fabric IQ 与本体论（Ontology）研究

## 一、Microsoft Fabric IQ 是什么？

**Fabric IQ（预览版）** 是 Microsoft Fabric 平台中的一个全新工作负载（Workload），其定位是**统一企业数据语义层**——将分散在 OneLake 各处的数据，按照业务语言组织起来，为分析、AI Agent 和应用程序提供一致的语义含义和上下文。

### 核心定位

IQ 的核心目标是解决一个关键问题：**企业数据虽然在 OneLake 中实现了物理统一，但语义上仍然是碎片化的**。不同团队对"客户"、"订单"、"产品"等概念的理解不一致，导致报表口径不统一、AI 回答不准确、跨部门协作困难。

IQ 的解决方案是引入一个**业务概念的统一定义层**，让所有下游工具（Power BI、Notebook、AI Agent）共享同一套业务语言。

### IQ 工作负载包含的核心项目

| 项目 | 说明 |
|------|------|
| **Ontology（本体，预览版）** | 企业词汇表和语义层，定义实体类型、属性、关系和规则 |
| **Graph（图，预览版）** | 原生图存储和计算，支持节点、边和图遍历 |
| **Data Agent（数据代理，预览版）** | 基于生成式 AI 的对话式问答系统，可连接 Ontology 作为数据源 |
| **Operations Agent（运维代理，预览版）** | AI 代理监控实时数据并推荐业务操作 |
| **Power BI Semantic Model** | 面向报表和交互分析的语义模型 |

### IQ 的核心价值

- **数据统一**：将分析数据和运营数据（来自 Lakehouse、Eventhouse、Power BI 语义模型）整合到单一一致模型
- **跨工具一致语言**：对"客户"、"物料"、"资产"等概念只定义一次，Power BI、Notebook、Agent 共用
- **AI 就绪**：为 Copilot 和 Agent 提供结构化的企业语言锚定，使 AI 回答能反映企业术语
- **跨域推理**：通过图链接表达概念间关系，支持"订单 → 发货 → 温度传感器 → 冷链违规"这样的链式推理
- **治理和信任**：减少团队间重复和不一致的定义，通过约束提升数据质量

---

## 二、Fabric IQ 中的 Ontology：一个真正的本体论实现

**答案是明确的：Microsoft Fabric IQ 不仅使用了本体论的概念，而且直接将核心项目命名为 "Ontology"（本体）。** 这是微软在数据平台产品中首次正式、显式地采用本体论这一术语和理念。

### Ontology 的定义

官方定义：*Ontology 是一个共享的、机器可理解的企业业务词汇表。它由环境中的"事物"（实体类型）、它们的"事实"（属性）以及它们的"连接方式"（关系）组成，同时提供保持表示一致性的约束和规则。*

### Ontology 的核心概念

#### 1. 实体类型（Entity Type）

实体类型是现实世界概念（如"发货"、"产品"、"传感器"）的可复用逻辑模型。它标准化了该概念的名称、描述、标识符、属性和约束，确保企业中每个团队在说"发货"时含义一致。实体类型将概念提升到单一数据表之上，消除了不同数据源之间列级定义的冲突。

#### 2. 实体实例（Entity Instance）

实体实例是实体类型的具体实现，通过数据绑定从真实数据中填充（类似语义行）。实体实例追踪创建它的数据源和时间，并可参与关系。

#### 3. 属性（Property）

属性是关于实体的命名事实，带有声明的数据类型。可以包含到源数据的绑定和语义注释（如标识符或元数据属性）。属性通过强制一致的类型、单位和命名来提升语义，并支持概念层面的规则和质量检查。

#### 4. 关系（Relationship）

关系是实体类型或实例之间的有类型、有方向的链接。关系可以有属性（如距离、置信度、生效时间）和基数规则（如一个客户有多个订单）。关系使上下文显式且可复用，支持遍历、依赖分析、基于规则的推理。

### 数据绑定（Data Binding）

Ontology 通过**数据绑定**将定义连接到 OneLake 中的真实数据，包括：
- Lakehouse 表
- Eventhouse 流
- Power BI 语义模型

数据绑定描述了数据类型、标识键、列到属性的映射、以及键到关系的映射。

### 本体图（Ontology Graph）

Ontology 自动生成一个**可查询的实例图（Labeled Property Graph）**：
- 节点 = 实体实例
- 边 = 关系链接（含元数据属性）
- 支持图算法（路径查找、中心性、社区发现）
- 支持视觉化浏览和 GQL/KQL 查询

### 自然语言查询（NL2Ontology）

Ontology 提供自然语言到本体查询的转换层，用户可以用业务术语提问，系统自动将问题转换为结构化查询。

---

## 三、Palantir Foundry Ontology vs Microsoft Fabric IQ 对比

### Palantir Foundry Ontology 回顾

Palantir 的 Ontology 被定义为"组织的运营层"，是一个位于集成数据源之上的语义桥梁。其核心组成：

| 概念 | 说明 |
|------|------|
| **Object Types（对象类型）** | 将数据集映射为现实世界实体（工厂、设备、订单） |
| **Link Types（链接类型）** | 对象之间的关系 |
| **Properties（属性）** | 对象的详细元数据，支持细粒度安全控制 |
| **Action Types（操作类型）** | 捕获用户输入并编排流程的可执行元素 |
| **Functions（函数）** | 编码任意复杂度的业务逻辑 |

Palantir Ontology 的核心特点是**既有语义元素（对象、属性、链接），也有动力学元素（操作、函数、动态安全）**，是一个"组织的数字孪生"。

### 详细对比

| 维度 | Palantir Foundry Ontology | Microsoft Fabric IQ Ontology |
|------|--------------------------|------------------------------|
| **命名** | 直接称为 Ontology | 直接称为 Ontology |
| **核心抽象** | Object Types + Link Types | Entity Types + Relationships |
| **属性系统** | Properties（含安全控制） | Properties（含语义注释、数据类型约束） |
| **图能力** | 隐式图结构 | 显式 Labeled Property Graph，支持 GQL 查询 |
| **操作能力** | Action Types + Functions（强） | Rules（通过 Activator 触发自动化操作，逐步增强） |
| **AI 集成** | AIP（AI Platform）与 Ontology 深度绑定 | Data Agent + Operations Agent 以 Ontology 为锚定 |
| **数据源** | Foundry 内部数据集、虚拟表、模型 | OneLake（Lakehouse、Eventhouse、Power BI 语义模型） |
| **查询能力** | Object-centric 查询 | NL2Ontology 自然语言查询 + GQL + KQL |
| **成熟度** | 已生产可用多年 | 预览版（Preview），2025年底推出 |
| **目标用户** | 政府、国防、大型企业运营 | 广泛的企业数据分析和 BI 用户 |
| **开放性** | 封闭平台 | 基于开放标准（Delta Lake、OneLake） |
| **与 BI 集成** | Workshop（自建应用） | 原生集成 Power BI Semantic Model |

### 理念异同总结

**相同点：**
1. **都正式使用了 Ontology 这一术语**，承认需要在原始数据之上建立一个业务概念的语义层
2. **都将实体（Entity/Object）和关系（Relationship/Link）作为核心原语**
3. **都强调"一次定义，处处复用"**——业务概念只定义一次，所有下游工具共用
4. **都将 Ontology 作为 AI/Agent 的锚定层**——让 AI 理解企业语言而非原始表结构
5. **都追求从"洞察"到"行动"的闭环**——不只是查询，还要驱动自动化

**不同点：**
1. **Palantir 更强调"运营"——Ontology 是用来"运行业务"的**，Action Types 和 Functions 是一等公民；Fabric IQ 当前更偏向"理解业务"，操作能力（Rules + Activator）仍在发展中
2. **Fabric IQ 的图能力更显式**——直接提供 Labeled Property Graph 和 GQL 查询；Palantir 的图结构更多是隐含在 Object-Link 关系中
3. **Fabric IQ 与 BI 生态深度绑定**——可以直接从 Power BI Semantic Model 生成 Ontology，保持术语一致；Palantir 有自己的分析和可视化体系
4. **Fabric IQ 提供 NL2Ontology**——自然语言直接查询本体，这是一个差异化能力

---

## 四、Microsoft 更广泛产品线中的 Ontology 实践

微软虽然在 Fabric IQ 之前没有显式使用"Ontology"这个词，但在多个产品中已经践行了本体论的核心理念：

### 1. Microsoft Graph

**Microsoft Graph** 是微软 365 平台的数据和智能网关，本质上是一个**大规模知识图谱**：
- **实体**：User、Group、Message、Event、File、Site 等
- **关系**：manager、memberOf、trending、people（相关人）等
- **统一端点**：`https://graph.microsoft.com`

Microsoft Graph 体现了本体论中"实体 + 关系 = 世界模型"的思想，但它是一个**固定的、微软定义的本体**，用户无法自定义实体类型。

### 2. Common Data Model（CDM）

**Common Data Model** 是微软发布的标准化、模块化、可扩展的数据 Schema 集合：
- 提供预定义的**实体**（如 Account、Campaign、Contact）
- 定义了实体的**属性**和**语义元数据**（通过 Traits）
- 定义了实体间的**关系**
- 被 Dynamics 365、Power Platform 等产品共用

CDM 本质上是一个**领域本体的标准化实现**——它定义了"什么是客户"、"什么是订单"以及它们之间的关系，是本体论在企业应用中的直接落地。

### 3. Microsoft Dataverse

**Dataverse**（原 Common Data Service）是 Power Platform 的数据平台：
- **表（Table）**：对应本体论中的实体类型（原名 Entity）
- **列（Column）**：对应属性（原名 Field/Attribute）
- **行（Row）**：对应实体实例（原名 Record）
- **关系（Relationship）**：表之间的关联
- **业务规则**：实体级的约束和验证逻辑

值得注意的是，Dataverse 早期的术语就是 Entity、Attribute、Record——这些正是本体论的核心术语。后来为了降低学习门槛才改名为 Table、Column、Row。

### 4. Digital Twin Definition Language（DTDL）

Azure Digital Twins 使用 DTDL 定义数字孪生模型：
- **Interface**：实体类型
- **Property/Telemetry/Command**：属性和行为
- **Relationship**：实体间关系
- 基于 JSON-LD，这是一种本体描述语言

### 产品线 Ontology 理念演进图

```
CDM (2016)          → 标准化实体 Schema
  ↓
Dataverse (2019)    → 实体建模 + 业务规则 + 运行时
  ↓
Microsoft Graph     → 固定本体的知识图谱
  ↓
Azure Digital Twins → DTDL 本体描述语言
  ↓
Fabric IQ (2025)    → 正式命名 Ontology，企业级自定义本体 + 图 + AI Agent
```

---

## 五、结论与洞察

### Fabric IQ Ontology 的历史意义

Microsoft Fabric IQ 标志着微软**首次在核心数据平台产品中正式采用"Ontology"这一术语**。这不是偶然的命名选择，而是反映了整个数据行业的趋势：

1. **从"表和列"到"概念和关系"**——数据抽象的层次在上升
2. **AI 时代需要语义层**——LLM/Agent 需要理解业务概念，而不是原始表结构
3. **Palantir 的成功验证了 Ontology 的价值**——微软现在用相同的术语和理念来回应

### Fabric IQ vs Palantir：殊途同归

两者的核心理念高度一致：**在原始数据之上建立一个业务概念的语义层（Ontology），作为所有分析、AI 和操作的统一基础**。

差异主要在于：
- **Palantir 从运营切入**，Ontology 天生就是为了"运行业务"
- **微软从分析切入**，Ontology 首先是为了"理解业务"，然后逐步向操作扩展（Rules + Activator）
- **微软的生态优势明显**——Power BI、Microsoft 365、Azure 的庞大用户基础意味着 Fabric IQ Ontology 可能会获得更广泛的采用

### 对企业数据架构的启示

Fabric IQ 的出现意味着 **Ontology 正在从学术概念和小众实践走向主流数据平台**。企业在规划数据架构时，应当开始思考：
- 如何定义统一的业务概念词汇表
- 如何将业务概念与底层数据表进行映射
- 如何让 AI Agent 基于业务语义而非表结构来回答问题
- 如何从"数据仓库思维"升级到"本体思维"

---

## 参考资料

- [What is Fabric IQ (preview)? — Microsoft Learn](https://learn.microsoft.com/en-us/fabric/iq/overview)
- [What is ontology (preview)? — Microsoft Learn](https://learn.microsoft.com/en-us/fabric/iq/ontology/overview)
- [What is Microsoft Fabric? — Microsoft Learn](https://learn.microsoft.com/en-us/fabric/fundamentals/microsoft-fabric-overview)
- [From insight to action: Bringing Fabric Activator into Ontology with Rules — Fabric Blog](https://blog.fabric.microsoft.com/en-us/blog/from-insight-to-action-bringing-fabric-activator-into-ontology-with-rules/)
- [Palantir Foundry Ontology Overview](https://www.palantir.com/docs/foundry/ontology/overview/)
- [Microsoft Graph Overview — Microsoft Learn](https://learn.microsoft.com/en-us/graph/overview)
- [Common Data Model — Microsoft Learn](https://learn.microsoft.com/en-us/common-data-model/)
- [What is Microsoft Dataverse? — Microsoft Learn](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/data-platform-intro)
