---
title: Palantir Ontology：从哲学本体论到企业操作系统的工程实践
created: 2026-03-18
tags: [ontology, palantir, foundry, digital-twin, data-platform, AIP, knowledge-graph]
---

# Palantir Ontology：从哲学本体论到企业操作系统的工程实践

> 本文梳理 Palantir 公司如何将哲学层面的"本体论"概念落地为数据平台的核心抽象层，涵盖 Foundry 平台中 Ontology 的核心概念、技术架构、OSDK、AIP 中的角色、相比传统方案的优势、高管公开言论以及实际应用案例。
>
> 相关笔记：[[本体论（Ontology）：从哲学根基到计算机科学的概念迁移]]、[[Microsoft Fabric IQ与本体论（Ontology）研究]]

---

## 一、Ontology 在 Palantir Foundry 中的核心概念与定位

### 1.1 Ontology 是什么

Palantir Foundry 自称为 **"The Ontology-Powered Operating System for the Modern Enterprise"**——以 Ontology 驱动的现代企业操作系统。Ontology 是 Foundry 的核心抽象层，它**将底层的数据集（datasets）、虚拟表（virtual tables）和模型（models）映射为与现实世界对应的语义对象**，从而构成整个组织的"数字孪生"（Digital Twin）。

官方表述：Ontology "integrates the semantic, kinetic, and dynamic elements of your business — empowering your teams to harmonize and automate decision-making in complex settings."（整合业务的语义、动力和动态要素，赋能团队在复杂环境中协调并自动化决策）。

### 1.2 核心定位：组织的操作层

Ontology 不是一个数据库，也不是一个 ETL 管道，而是一个**位于数据资产之上、面向操作的语义层**。它的核心价值在于：

- **不复制数据**——Ontology 坐落在已有的数据集和模型之上，不额外创建数据副本
- **编码业务逻辑**——将组织特有的对象（Object）、动作（Action）和流程（Process）编码进统一的逻辑层
- **支撑协作**——让数据团队、分析团队和运营团队通过共同的语义层实时协作
- **驱动 AI 工作流**——所有 AI 和自动化工作流复用 Ontology 组件，无需为每个新项目重建数据模型

---

## 二、Ontology 的四大核心构件

Palantir Ontology 由四类相互关联的元素组成，可以分为**语义层（Semantic）** 和**动力层（Kinetic）** 两大类。

### 2.1 语义层元素

#### Object Types（对象类型）

Object Types 是 Ontology 的语义基石。每个 Object Type 代表一种现实世界实体——可以是物理资产（设备、车辆、建筑物）、业务概念（订单、客户、合同）或抽象实体（风险事件、审批流程）。

技术上，Object Type 的背后对应一个或多个底层数据集（dataset）。定义 Object Type 时需要：

- **指定主键**（Primary Key）——唯一标识每个对象实例
- **配置 Properties（属性）**——从底层数据集的列映射而来，支持：
  - 值格式化和条件格式化
  - 只读/必填标记
  - 共享属性（Shared Properties，跨多个 Object Type 复用）
  - 派生属性（Derived Properties，通过计算生成）
  - 结构化数据类型（Structs）
- **设置安全控制**——细粒度的权限和治理机制

举例：在一个供应链系统中，Object Types 可能包括 `Warehouse`（仓库）、`Shipment`（发货单）、`Product`（产品）、`Supplier`（供应商）等。

#### Link Types（关联类型）

Link Types 定义 Object Types 之间的关系，使 Ontology 成为一个**图结构**而非扁平的表结构。

例如：`Supplier —supplies→ Product —stored_in→ Warehouse —ships→ Shipment`

Link Types 表达了实体之间的业务关系，支持多对多、一对多等关联模式，使得用户可以沿着关系链进行导航和查询。

#### Interfaces（接口）

Interfaces 实现了**多态建模**——当多个 Object Types 共享相同的属性结构（Shape）时，可以定义一个 Interface 来统一描述它们。这类似于面向对象编程中的接口概念，允许应用层以统一的方式与不同类型的对象交互。

### 2.2 动力层元素

#### Action Types（动作类型）

Action Types 是 Ontology 的"写端"——让用户和系统能够**对现实世界执行操作**。Action Types 捕获用户输入，编排决策过程，并将变更写回到底层系统。

Action Types 的能力包括：

- **参数配置**——支持下拉筛选、安全校验
- **提交规则**（Submission Criteria）——定义什么条件下允许执行动作
- **副作用**（Side Effects）——触发通知、Webhook 等
- **Function-Backed Actions**——通过 Functions 实现复杂的批量执行逻辑
- **媒体/附件上传**——支持多模态数据输入

Action Types 的关键意义在于：**Ontology 不仅是"读"数据的语义层，更是"写"数据的操作层**。每一个运营动作（如调节阀门压力、审批工单、调拨库存）都可以被建模、关联和治理。

#### Functions（函数）

Functions 提供**任意复杂度的业务逻辑**实现能力，支持 TypeScript、Python 等语言。功能包括：

- Ontology 编辑和事务操作
- API 网关集成
- 自定义聚合计算
- 跨 Object Type 的复杂查询

Functions 与 Action Types 配合，构成了 Ontology 的"动力系统"——将数据转化为决策，将决策转化为操作。

### 2.3 四大构件的协作关系

```
底层数据资产（Datasets / Virtual Tables / Models）
       ↕ 映射
╔═══════════════════════════════════════════════════╗
║              Palantir Ontology                     ║
║                                                    ║
║  语义层:                                           ║
║    Object Types ←─ Link Types ─→ Object Types      ║
║         ↑              ↑                            ║
║    Properties      Interfaces（多态）               ║
║                                                    ║
║  动力层:                                           ║
║    Action Types ←── Functions ──→ Side Effects      ║
║                                                    ║
╚═══════════════════════════════════════════════════╝
       ↕ 驱动
   应用层（Workshop / Slate / OSDK / AIP）
```

---

## 三、Ontology SDK（OSDK）——面向开发者的 Ontology 接口

### 3.1 OSDK 是什么

Ontology SDK（OSDK）是 Palantir 提供的**开发者工具包**，让外部开发者可以在自己熟悉的开发环境中直接访问 Foundry Ontology。其核心理念是：**Ontology 不仅是 Foundry 内部的抽象层，也应该成为所有外部应用的统一数据接口**。

### 3.2 支持的语言

| 语言 | 分发渠道 |
|------|----------|
| TypeScript/JavaScript | NPM |
| Python | Pip / Conda |
| Java | Maven |
| 其他语言 | 通过 OpenAPI Specification 生成 |

### 3.3 核心特性

- **类型安全**（Type Safety）——根据具体的 Ontology 子集自动生成强类型代码，开发者可以在 IDE 中直接查询和浏览 Ontology
- **安全设计**——使用作用域令牌（Scoped Tokens），限定到相关的 Ontology 实体，结合用户级权限实现细粒度访问控制
- **减少维护成本**——Ontology 在 Foundry 中集中管理，开发者只需关注应用逻辑，无需维护数据基础设施
- **开发加速**——最少量代码即可实现对 Ontology 的读写操作

### 3.4 开发者工作流

1. 在 Foundry 的 **Developer Console** 中创建应用
2. 选择目标语言，生成 OSDK 代码包
3. 在本地或 CI/CD 环境中使用生成的 SDK 开发应用
4. 可选择将应用托管在 Foundry 上，也可部署在外部基础设施

OSDK 的意义在于：**Ontology 成为了一个"可编程的企业数据 API"**，每个 Object Type 就是一个 API 端点，每个 Action Type 就是一个 API 操作，而这些 API 自动继承了 Ontology 的语义、安全和治理特性。

---

## 四、AIP（AI Platform）中 Ontology 的角色

### 4.1 AIP 概述

Palantir AIP（Artificial Intelligence Platform）是 2023 年推出的 AI 平台，其核心主张是：**将大语言模型（LLM）锚定在企业的 Ontology 上，使 AI 推理基于真实的企业事实**。

Palantir 的口号："Activate full spectrum AI in days, and drive enterprise operations."

### 4.2 Ontology 在 AIP 中的三重角色

#### （1）数据锚定——减少 AI 幻觉

Ontology 将来自多个来源的实时信息整合为一个语义化的业务模型。当 LLM 生成回答时，它不是在"自由联想"，而是**被锚定在 Ontology 定义的实体、属性和关系上**。这从根本上减少了幻觉（hallucination），提升了决策置信度。

这与 [[Microsoft Fabric IQ与本体论（Ontology）研究]] 中 IQ Ontology 为 Copilot 和 Agent 提供"企业语言锚定"的思路高度一致。

#### （2）逻辑绑定——连接已有业务流程

AIP 通过 Ontology 将 AI 与组织中已有的业务流程、机器学习模型和优化工具连接起来。这些"逻辑资产"成为 AI 可以调用的工具，与 AI 驱动的分析互补。

例如：AI 在分析供应链风险时，可以直接调用 Ontology 中定义的 `RebalanceInventory` Action Type，而不需要另外开发接口。

#### （3）动作同步——安全地将 AI 决策写回操作系统

Ontology 使 AI 能够将决策安全地同步回操作系统——ERP、排程平台、边缘设备——同时内置人工审核（human-in-the-loop）和完整的审计追踪。

### 4.3 AIP 的关键能力

| 能力 | 说明 |
|------|------|
| 语义数据层 | 支持多模态信息的语义化 |
| LLM 驱动的逻辑函数 | 无需编码即可测试 |
| 情景分析（Scenario Analysis） | 在执行前检验 AI 推荐方案 |
| 受限自动化 | 在定义的操作边界内自动执行 |
| 审计追踪 | 所有人类和 AI 活动的完整记录 |

Palantir 在 2024 年被 Dresner Advisory Services 评为 **AI 和 ModelOps 领域第一名**。

---

## 五、为什么选择 Ontology——相比传统方案的优势

### 5.1 传统数据架构的痛点

传统企业数据架构通常基于以下抽象：

| 抽象 | 问题 |
|------|------|
| **表和视图** | 面向存储而非业务语义，业务用户看不懂 `tbl_ord_dtl_202301` 意味着什么 |
| **ETL 管道** | 每个新需求都要新建管道，导致管道丛生、维护困难 |
| **API** | 点对点集成，N 个系统需要 N(N-1)/2 个接口，且语义不统一 |
| **数据仓库/湖** | 解决了存储问题，但没有解决语义问题——数据在湖里，但没人知道它"意味着"什么 |
| **BI 语义层** | 面向报表，只读不写，无法驱动操作 |

### 5.2 Ontology 的结构性优势

**（1）从"文件和表"到"实体和关系"**

Palantir 官方描述这个转变为："Organizations evolve from the legacy world of files and tables into a semantic, intuitive representation of your operations."（组织从文件和表的遗留世界，进化到语义化、直觉化的运营表达）

Ontology 将底层数据表达为与业务语言一致的对象——运营人员看到的不是 `shipment_id: 12345`，而是一个完整的 `Shipment` 对象，包含其状态、来源、目的地、关联订单和可执行操作。

**（2）读写统一——不只是分析，更是操作**

传统的语义层（如 BI 语义模型）只解决了"读"的问题。Ontology 通过 Action Types 实现了**读写统一**：同一个语义层既用于查询数据，也用于执行操作。这使得"数字孪生"真正成为一个**可操作的**模型，而非只读的仪表盘。

**（3）单一逻辑层代替 N 对 N 集成**

Ontology 作为统一的逻辑层，让所有应用（Workshop、Slate、OSDK 应用、AIP Agent）共享同一套业务模型。新增一个应用不需要新建数据管道和接口，只需要引用已有的 Object Types 和 Action Types。

**（4）AI 原生——Ontology 天然是 LLM 的"世界模型"**

这是 Palantir 在 AI 时代的关键洞察：**LLM 需要一个结构化的世界模型来锚定其推理**。Ontology 正好提供了这个模型——它用实体、属性和关系描述了组织的运作方式，让 AI 可以在这个模型上进行有根据的推理，而非在原始数据上"猜测"。

**（5）治理内建——权限跟着对象走**

Ontology 的安全控制是对象级的，而非表级的。这意味着权限、审计和治理天然地跟着业务对象走，而非需要在每个应用层面重复实现。

### 5.3 与 Microsoft Fabric IQ 的对比

Palantir Ontology 和 Microsoft Fabric IQ Ontology 都采用了本体论思路，但侧重点不同：

| 维度 | Palantir Ontology | Microsoft Fabric IQ Ontology |
|------|-------------------|------------------------------|
| 定位 | 企业操作系统的核心抽象 | 数据平台的语义统一层 |
| 读写 | 读写统一（Action Types） | 偏重读端（为分析和 Agent 提供语义） |
| AI 集成 | AIP 深度集成，LLM 锚定在 Ontology 上 | Copilot/Agent 通过 Ontology 获取上下文 |
| 操作能力 | 强（Action Types + Functions 可写回操作系统） | 较弱（Operations Agent 仍在预览阶段） |
| 生态 | 封闭平台，OSDK 提供外部接口 | 开放生态，与 Power BI、Notebook 集成 |
| 目标客户 | 政府、国防、大型企业 | 广泛的企业用户 |

---

## 六、高管公开言论

### 6.1 Alex Karp（CEO）

Alex Karp 在多次公开场合强调 Ontology 是 Palantir 的核心竞争壁垒。在其 2025 年 Q4 致股东信中，他重申了 Palantir 的技术哲学：**软件的核心价值不在于处理数据，而在于理解数据的含义并驱动决策**。

Karp 长期将 Palantir 定位为"building software that enables institutions to effectively integrate their data, decisions, and operations"——构建使机构能够有效整合其数据、决策和运营的软件。Ontology 正是这个整合的实现机制。

在一次名为"The Technological Republic"（技术共和国）的演讲中（2025 年 1 月），Karp 阐述了他对技术在国家安全和社会治理中角色的看法，其中 Ontology 作为连接数据与决策的核心层被反复提及。

### 6.2 Shyam Sankar（CTO）

Shyam Sankar 是 Ontology 概念的主要技术推动者。他在多次 AIPCon（Palantir 年度开发者大会）演讲中阐述了 Ontology 的技术愿景：

- **Ontology 是"数据基础设施中缺失的一环"**（The Missing Piece in Data Infrastructure）——他认为数据行业在存储（data lake）、计算（Spark/Flink）和编排（Airflow）方面已经非常成熟，但在"语义"层面存在巨大空白，而 Ontology 正是填补这个空白的解决方案
- **Ontology 将数据从"技术资产"转化为"业务资产"**——技术团队管理数据集，业务团队使用对象和动作，Ontology 是两者之间的翻译层
- **Ontology 是 AI 的"grounding layer"**——在 AIP 发布后，Sankar 将 Ontology 重新定位为 AI 的锚定层，使 LLM 的输出可以被验证、审计和执行

### 6.3 核心理念总结

Palantir 高管的核心信念可以概括为一句话：**数据本身没有价值，理解数据的含义并据此采取行动才有价值。Ontology 就是那个将"数据"转化为"理解"并进而转化为"行动"的桥梁。**

---

## 七、实际应用案例

### 7.1 国防与军事

Palantir 的国防业务横跨美国陆军、空军与太空军、海军与海军陆战队，以及盟国军队。

- **Gotham 平台**——Palantir 最早的产品，定位为"The Operating System for Global Decision Making"（全球决策操作系统）。它将来自各情报来源的海量近实时数据整合并呈现在单一视图中，使指挥官能够在全球依赖关系中做出决策
- **AI 驱动的分析**——Gotham 内置 AI/ML 反馈循环，随着操作员使用不断训练和优化模型，增强人类分析和作战决策能力
- **边缘部署**——Palantir 构建了"首批 AI 赋能的地面站之一"，支持分布式多域作战（distributed multi-domain operations at the edge）
- **安全合规**——FedRAMP Moderate、DoD IL-2/IL-5、SOC 2 Type II、ISO 27001

在军事场景中，Ontology 的价值尤为突出：战场上的实体（部队、装备、目标、地形）和关系（指挥关系、补给线、威胁链）天然适合用 Object Types 和 Link Types 建模，而 Action Types 对应的就是军事行动。

### 7.2 供应链

**Wendy's QSCC（快餐供应链）**
- 实时跟踪 6,500 家门店的订单和库存
- 自动重新分配资源以最小化短缺影响
- 效果："我们把原本需要数周才能解决的问题，五分钟内就解决了"

**Heineken USA（啤酒分销）**
- 从缺货预防中释放 490 万美元价值
- AI 自动检测潜在缺货事件，自动调整配送计划
- 2 天测试中处理了 25 个价值 30 万美元的经销商告警

**General Mills（食品制造）**
- 每日节省约 4 万美元（年化 1,400 万美元）
- 通过供应链优化提升物流效率

### 7.3 医疗健康

**英国国家医疗服务体系（NHS）**
- 在 COVID-19 期间使用 Foundry 平台协调全国卫生资源
- 构建连接的健康系统，整合患者数据、物资调配和疫苗分发

**Tampa General Hospital**
- 使用 Palantir AI 软件构建互联医疗系统
- 通过数据整合改善患者治疗结果

**临床研究**
- 整合超过 100 项肿瘤学试验数据，涉及 25,000+ 患者
- 支持适应症扩展、生物标记物策略和疾病进展假设检验
- 预配置管道将数据转换为 OMOP 通用数据模型

### 7.4 能源与基础设施

**Jacobs 水处理厂（亚利桑那州）**
- 这是一个**明确提及 Ontology 应用**的案例
- 数据"在设定的时间表上清洗并转换为标准化、易于解读的数据模型，即 Ontology"
- 整合实时传感器数据、实验室数据、维护管理系统（CMMS）和 Oracle 财务系统
- Ontology 支撑了氨浓度的实时预测模型，将预测结果与合规要求比对，转化为操作建议
- 结果：全厂节电 20%，用电量从每百万加仑约 2,000 KWh 降至约 1,500 KWh

**PG&E（太平洋燃气电力公司）**
- 风险模型叠加实时电网状态，实施预防性安全措施

### 7.5 金融服务

**Citi Wealth（花旗财富管理）**
- 构建全球联邦化客户主数据
- 开户时间从 9 天缩短到数秒
- 开户人员从 50 人减至 1 人
- 入职和 KYC 检查上市速度提升 90%

### 7.6 制造业

**Panasonic Energy North America（松下能源）**
- 整合历史维修数据、设备传感器数据和非结构化文档
- "Ask Atom"——AIP 驱动的技师副驾驶，自动解析数百万条历史维修记录
- 技师学习曲线从 3-6 个月缩短至数周

---

## 八、从哲学到工程——Palantir 的本体论实践总结

### 8.1 哲学本体论与 Palantir Ontology 的映射

回顾 [[本体论（Ontology）：从哲学根基到计算机科学的概念迁移]] 中讨论的本体论核心问题，Palantir 的 Ontology 可以这样理解：

| 哲学本体论问题 | Palantir 工程实践 |
|----------------|-------------------|
| "有什么存在？" | Object Types——定义组织中存在哪些实体类型 |
| "存在者之间有什么关系？" | Link Types——定义实体之间的关联 |
| "存在者有什么属性？" | Properties——每个对象的特征描述 |
| "可以对存在者做什么？" | Action Types——可以对对象执行的操作 |
| "如何描述存在者的变化？" | Functions——业务逻辑和状态转换 |
| "存在者之间有什么共性？" | Interfaces——多态抽象 |

### 8.2 Palantir 的独特贡献

Palantir 对"本体论落地为工程实践"的最大贡献在于三点：

1. **读写统一**——传统的语义层（包括语义网、知识图谱）主要解决"读"和"查询"问题，Palantir 通过 Action Types 将本体论扩展到了"写"和"操作"，使之成为真正的操作系统而非只是查询系统
2. **组织级数字孪生**——不是对单个设备或流程的数字孪生，而是对整个组织运作方式的数字孪生，包含人、流程、资产和决策之间的完整关系网络
3. **AI 锚定层**——在 LLM 时代，Ontology 为 AI 提供了结构化的"世界模型"，使 AI 的输出可以被验证（是否符合 Ontology 定义的实体和关系）、可以被执行（通过 Action Types 写回操作系统）、可以被审计（完整的追踪链）

### 8.3 关键启示

对于任何试图构建"AI 原生"数据平台的组织，Palantir 的 Ontology 实践提供了一个关键启示：**在 AI 时代，数据平台的核心抽象不应该是表、管道或 API，而应该是一个语义化的、可操作的、可被 AI 理解的世界模型。** 这就是为什么 Palantir 选择了"本体论"这个来自哲学的概念——因为它恰好回答了那个最根本的问题："在我们的业务中，有什么存在？它们之间是什么关系？我们可以对它们做什么？"

---

## 参考来源

- [Palantir Foundry 平台页面](https://www.palantir.com/platforms/foundry/)
- [Palantir AIP 平台页面](https://www.palantir.com/platforms/aip/)
- [Palantir Ontology 文档](https://www.palantir.com/docs/foundry/ontology/overview/)
- [Palantir OSDK 文档](https://www.palantir.com/docs/foundry/ontology-sdk/overview/)
- [Palantir Digital Twin 页面](https://www.palantir.com/platforms/foundry/digital-twin/)
- [Palantir Gotham 平台页面](https://www.palantir.com/platforms/gotham/)
- [Palantir 国防业务页面](https://www.palantir.com/offerings/defense/)
- [Palantir 医疗业务页面](https://www.palantir.com/offerings/health/)
- [Palantir Impact 客户案例](https://www.palantir.com/impact/)
- [Jacobs 水处理案例](https://www.palantir.com/impact/jacobs/)
