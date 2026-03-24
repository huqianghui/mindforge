---
title: Microsoft Fabric IQ 本体（Ontology）管理功能实操解析
created: 2026-03-24
tags: [ontology, microsoft-fabric, fabric-iq, data-agent, data-binding, graph, rules, azure, MCP, natural-language-query]
source: https://mp.weixin.qq.com/s/OeqokKC0loVGKou59yNhlg
---

# Microsoft Fabric IQ 本体（Ontology）管理功能实操解析

> 本文基于微信公众号文章整理，聚焦 Fabric IQ 中本体的实操流程，去除了与 Fabric IQ 无关的内容。理论部分可参考 [[Microsoft Fabric IQ与本体论（Ontology）研究]]。

## 一、Fabric IQ Ontology 的核心价值

Microsoft Fabric IQ 中的本体管理能力，能够将企业分散、异构的数据，统一转化为业务人员与 AI 都能共同理解的标准化业务语义。它以业务语言为中心，对跨 OneLake 的全域数据进行统一组织与语义对齐，最终以一致的含义、明确的上下文，对外提供给分析工具、数据应用与 AI Agent 使用，实现数据从"可查询"到"可理解、可推理、可行动"的真正升级。

在 Fabric IQ 的 workspace 中可以创建 Lakehouse、Eventhouse，作为本体将要绑定的数据源，创建本体后可以基于本体创建出 Data Agent，然后就可以通过自然语言和数据进行交互，Data Agent 还可以进一步发布到智能体平台共享使用，也能通过程序的方式访问。

---

## 二、核心概念速查

| 术语 | 英文 | 定义 |
|------|------|------|
| 实体类型 | Entity Type | 业务概念，可以绑定数据表 |
| 实体类型键 | Entity Type Key | 唯一键 |
| 实体实例 | Entity Instance | 实体类型的具体实例 |
| 属性 | Property | 实体类型的属性，可以绑定数据表字段 |
| 关系类型 | Relationship Type | 实体间的关系类型 |
| 关系实例 | Relationship Instance | 和实体实例对应的关系实例 |
| 数据绑定 | Data Binding | 本体定义与数据源的连接 |
| 图 | Graph | Fabric 中的图引擎，创建本体时会自动创建图实例 |
| 规则 | Rule | 本体的规则逻辑，能够触发动作 |

---

## 三、完整实操流程

我们假设 OneLake（Lakehouse、Eventhouse）中的数据表已准备就绪，直接走完整流程：**基于 OneLake 构建本体 → 基于本体生成 Data Agent → 通过自然语言与数据直接交互**。

我们将先构建一套业务本体关系，与 OneLake 中的数据完成绑定，最终实现**本体实例查询、图引擎查询、自然语言对话**三种方式统一访问数据，让语义真正驱动数据使用。本体结构如下图所示：

![本体结构图](../asset/fabric-iq-ontology-step00-structure.png)

### 步骤 1：创建本体 RetailSalesOntology

![创建本体](../asset/fabric-iq-ontology-step01-create.png)

### 步骤 2：创建 Entity Type——Store

![创建 Entity Type Store](../asset/fabric-iq-ontology-step02-entity-store.png)

![Store Entity Type 详情](../asset/fabric-iq-ontology-step02-entity-store-detail.png)

### 步骤 3：绑定数据源

![绑定数据源-选择表](../asset/fabric-iq-ontology-step03-bind1.png)

![绑定数据源-映射列](../asset/fabric-iq-ontology-step03-bind2.png)

![绑定数据源-完成](../asset/fabric-iq-ontology-step03-bind3.png)

### 步骤 4：配置 Entity Type 的主键

![配置主键-选择](../asset/fabric-iq-ontology-step04-key1.png)

![配置主键-确认](../asset/fabric-iq-ontology-step04-key2.png)

创建 3 个 Entity Type 后：

![3个 Entity Type 总览](../asset/fabric-iq-ontology-step04-3entities.png)

### 步骤 5：添加关系

![添加关系-创建](../asset/fabric-iq-ontology-step05-rel1.png)

![添加关系-配置](../asset/fabric-iq-ontology-step05-rel2.png)

![添加关系-映射](../asset/fabric-iq-ontology-step05-rel3.png)

关系创建完毕：

![关系总览](../asset/fabric-iq-ontology-step05-rel-done.png)

#### 新增 Entity Type 绑定时序数据

再新加一个 Entity Type，用于绑定时序数据：

![新增时序 Entity Type](../asset/fabric-iq-ontology-step05-timeseries.png)

增加属性：

![增加属性](../asset/fabric-iq-ontology-step05-addprop.png)

设置主键：

![设置主键](../asset/fabric-iq-ontology-step05-setkey.png)

绑定数据：

![绑定数据-1](../asset/fabric-iq-ontology-step05-binddata.png)

![绑定数据-2](../asset/fabric-iq-ontology-step05-binddata2.png)

![绑定数据-3](../asset/fabric-iq-ontology-step05-binddata3.png)

![绑定数据-4](../asset/fabric-iq-ontology-step05-binddata4.png)

增加关系：

![增加关系](../asset/fabric-iq-ontology-step05-addrel.png)

至此就可以通过本体查看数据了：

![查看数据-实体列表](../asset/fabric-iq-ontology-step05-viewdata1.png)

![查看数据-实体详情](../asset/fabric-iq-ontology-step05-viewdata2.png)

![查看数据-关系图](../asset/fabric-iq-ontology-step05-viewdata3.png)

### 步骤 6：配置规则

![配置规则-入口](../asset/fabric-iq-ontology-step06-rule1.png)

![配置规则-选择实体](../asset/fabric-iq-ontology-step06-rule2.png)

![配置规则-设置条件](../asset/fabric-iq-ontology-step06-rule3.png)

![配置规则-设置动作](../asset/fabric-iq-ontology-step06-rule4.png)

![配置规则-预览](../asset/fabric-iq-ontology-step06-rule5.png)

![配置规则-测试](../asset/fabric-iq-ontology-step06-rule6.png)

![配置规则-完成](../asset/fabric-iq-ontology-step06-rule7.png)

### 步骤 7：创建智能体（Data Agent）

![创建 Data Agent-入口](../asset/fabric-iq-ontology-step07-agent1.png)

![创建 Data Agent-选择本体](../asset/fabric-iq-ontology-step07-agent2.png)

![创建 Data Agent-配置](../asset/fabric-iq-ontology-step07-agent3.png)

![创建 Data Agent-完成](../asset/fabric-iq-ontology-step07-agent4.png)

### 步骤 8：发布智能体

![发布 Agent-设置](../asset/fabric-iq-ontology-step08-publish1.png)

![发布 Agent-确认](../asset/fabric-iq-ontology-step08-publish2.png)

![发布 Agent-共享](../asset/fabric-iq-ontology-step08-publish3.png)

### 步骤 9：使用智能体

![使用 Agent-对话界面](../asset/fabric-iq-ontology-step09-use1.png)

![使用 Agent-自然语言查询](../asset/fabric-iq-ontology-step09-use2.png)

![使用 Agent-查询结果](../asset/fabric-iq-ontology-step09-use3.png)

![使用 Agent-图表展示](../asset/fabric-iq-ontology-step09-use4.png)

---

## 四、总结

结合以上实操流程，可以清晰看到 Fabric IQ 本体管理的核心价值——将本体打造成了**连接数据与 AI 应用的核心语义枢纽**。其核心作用集中在三点：

1. **语义统一**：通过本体绑定 OneLake（Lakehouse、Eventhouse）中的分散数据，实现全域数据的语义统一，解决"同词异义、数据歧义"的行业痛点
2. **自然语言交互**：基于本体可快速生成 Data Agent，让业务人员、AI 都能通过自然语言与数据交互，降低数据使用门槛
3. **完整闭环**：支持本体实例、图引擎、自然语言三种查询方式，同时可将 Data Agent 共享复用、程序调用，形成"数据→本体→AI 应用"的完整闭环

---

## 参考资料

- [微软本体（Ontology）管理功能深度解析（原文）](https://mp.weixin.qq.com/s/OeqokKC0loVGKou59yNhlg)
- [[Microsoft Fabric IQ与本体论（Ontology）研究]]（理论篇）
- [What is ontology (preview)? — Microsoft Learn](https://learn.microsoft.com/en-us/fabric/iq/ontology/overview)
- [What is Fabric IQ (preview)? — Microsoft Learn](https://learn.microsoft.com/en-us/fabric/iq/overview)
