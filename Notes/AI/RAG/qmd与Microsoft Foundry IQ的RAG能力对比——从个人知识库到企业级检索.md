---
title: qmd 与 Microsoft Foundry IQ 的 RAG 能力对比——从个人知识库到企业级检索
created: 2026-04-06
tags:
  - RAG
  - qmd
  - Microsoft-Fabric-IQ
  - Foundry-IQ
  - hybrid-search
  - knowledge-graph
  - enterprise-AI
  - vector-search
  - BM25
description: 对比 qmd（本地混合搜索引擎）与 Microsoft Foundry IQ / Fabric IQ 的 RAG 能力，分析两者在个人场景与企业级场景的差异与选择策略
---

# qmd 与 Microsoft Foundry IQ 的 RAG 能力对比——从个人知识库到企业级检索

> RAG（Retrieval-Augmented Generation）已成为让 LLM 基于真实数据回答问题的标准范式。但"RAG"一词背后的实现差异极大——从个人笔记本上的本地搜索引擎，到跨组织、多租户的企业级语义平台。本文以 **qmd** 和 **Microsoft Foundry IQ / Fabric IQ** 为两个典型代表，分析它们的架构差异、共同点，以及在不同场景下的选择策略。

---

## 一、两个系统的定位

### 1.1 qmd——设备端混合搜索引擎

[qmd](https://github.com/tobi/qmd)（Query Markup Documents）是一个 **本地优先** 的 Markdown 搜索引擎，由 Shopify 创始人 Tobi Lütke 开发。核心定位：

- **运行环境**：完全在本地设备上运行（SQLite + 本地嵌入模型）
- **数据源**：Markdown 文件夹（笔记、文档、代码注释等）
- **检索模式**：三模混合检索
  - `lex`（BM25）——关键词精确匹配
  - `vec`（向量嵌入）——语义相似度搜索
  - `hyde`（Hypothetical Document Embeddings）——生成假设答案文档提升召回率
- **集成方式**：CLI 工具 + MCP Server（可被 Claude Code、Cursor 等 AI Agent 直接调用）
- **典型用户**：开发者、知识工作者、Obsidian/笔记用户

qmd 的哲学是：**在你自己的设备上，对你自己的文件，做最好的搜索**。

### 1.2 Microsoft Foundry IQ + Fabric IQ——企业级语义检索平台

Microsoft 的 RAG 能力由两个互补的"IQ"系统构成：

- **Fabric IQ**——语义基础层（Semantic Foundation）
  - 提供 **Ontology（本体论）** 定义：实体类型、属性、关系
  - 提供 **Graph Engine**：ISO 标准 GQL 查询、1-8 跳图遍历
  - 提供 **Data Agent**：通过 MCP / RESTful API 暴露自然语言查询接口
  - 详见 [Microsoft Fabric IQ与本体论（Ontology）研究](../../../Azure/fabricIQ/Microsoft%20Fabric%20IQ与本体论（Ontology）研究.md)

- **Foundry IQ**——Agentic 检索引擎
  - 基于 Azure AI Search 的下一代 RAG 系统
  - LLM 驱动的查询分解（将复杂问题拆解为多个子查询）
  - 多源并行检索（OneLake、SharePoint、Azure Blob、Web）
  - 语义重排序 + 引用溯源

两者合体：**Fabric IQ 定义数据的含义，Foundry IQ 检索并综合答案**。

---

## 二、架构对比

### 2.1 检索架构

| 维度 | qmd | Foundry IQ + Fabric IQ |
|------|-----|----------------------|
| **索引存储** | 本地 SQLite（~/.cache/qmd/index.sqlite） | Azure AI Search（云端托管 HNSW 索引） |
| **词法检索** | BM25（内置） | Azure AI Search 关键词检索 |
| **向量检索** | 本地嵌入模型生成 embedding | Azure OpenAI embedding（text-embedding-ada-002 等） |
| **语义增强** | HyDE（假设文档嵌入） | Agentic Retrieval（LLM 查询分解 + 多轮子查询） |
| **重排序** | LLM Reranking | Azure AI Search 语义重排序 |
| **知识图谱** | 无 | Fabric IQ 原生 LPG 图引擎（ISO GQL） |
| **查询路由** | 单一 pipeline | 语义路由：根据问题类型分发到 Graph / Eventhouse / Lakehouse |

### 2.2 数据处理流程

**qmd 的流程（极简）：**

```
Markdown 文件夹 → 索引采集（qmd embed）→ BM25 + Vector Index
     ↓                                         ↓
  文件变更 → 增量更新（qmd update）     ←  查询（qmd query）
```

**Foundry IQ + Fabric IQ 的流程（企业级）：**

```
OneLake 数据湖（Lakehouse / Eventhouse / Power BI 语义模型）
     ↓
Ontology 定义（实体类型 + 属性 + 关系 + 数据绑定）
     ↓
Graph Engine（自动生成 LPG）+ Azure AI Search（向量索引）
     ↓
Data Agent（NL2Ontology 翻译 + 语义路由）
     ↓
Agentic Retrieval（LLM 分解子查询 → 并行检索 → 语义重排 → 综合答案）
```

### 2.3 核心能力矩阵

| 能力 | qmd | Foundry IQ / Fabric IQ |
|------|-----|----------------------|
| 关键词精确匹配 | BM25 | Azure AI Search BM25 |
| 语义相似搜索 | 向量嵌入 | 向量嵌入（Azure OpenAI） |
| 混合检索 | BM25 + Vector + HyDE | 关键词 + 向量 + 语义重排 |
| 多跳推理 | 不支持 | Graph Engine（1-8 跳 GQL 遍历） |
| 查询分解 | expand 模式（自动生成 lex/vec/hyde 变体） | Agentic（LLM 分解复杂问题为子查询） |
| 实时流数据 | 不支持 | Eventhouse（KQL 时序查询） |
| 权限控制 | 文件系统权限 | Entra ID RBAC + 文档级 ACL |
| 审计追踪 | 无 | Microsoft Purview 集成 |
| MCP 集成 | 原生支持 | Data Agent 支持 MCP |

---

## 三、相同点

尽管定位差异巨大，两者在 RAG 的核心理念上有显著共通之处：

### 3.1 混合检索是共识

两者都选择了 **混合检索**（Hybrid Retrieval）而非单一向量搜索：

- qmd：BM25 + Vector + HyDE 三路混合
- Foundry IQ：Keyword + Vector + Semantic Reranking

这反映了 RAG 领域的实践共识——**纯向量搜索在精确匹配（函数名、错误码、专有名词）上表现不佳**，BM25 词法匹配仍然不可替代。

### 3.2 MCP 作为 Agent 接入协议

两者都支持 MCP（Model Context Protocol）作为 AI Agent 的接入方式：

- qmd：`qmd mcp` 启动 MCP Server，供 Claude Code、Cursor 等调用
- Fabric IQ：Data Agent 原生支持 MCP 协议

这意味着无论你选择哪个方案，AI Agent 都可以通过统一的 MCP 协议来使用检索能力。

### 3.3 让 LLM "增强"检索过程

两者都不满足于简单的"查询 → 结果"模式，而是让 LLM 参与检索过程本身：

- qmd：HyDE 模式让 LLM 生成假设答案文档，用假设答案的 embedding 进行检索，提升召回率
- Foundry IQ：Agentic Retrieval 让 LLM 分解复杂查询为多个精准子查询，并行执行后综合

### 3.4 Markdown / 结构化文本友好

- qmd：专为 Markdown 文件设计
- Fabric IQ：通过 Ontology 将非结构化数据映射为结构化实体，本质上也是在做"文档结构化"

---

## 四、核心差异

### 4.1 本地 vs 云端

这是最根本的差异，决定了后续所有取舍：

| 维度 | qmd（本地） | Foundry IQ / Fabric IQ（云端） |
|------|-----------|-------------------------------|
| **数据位置** | 本地磁盘 | Azure 云端（OneLake） |
| **隐私保障** | 数据不离开设备 | 依赖云服务商的合规承诺 |
| **网络依赖** | 离线可用（BM25 + 已有 embedding） | 必须在线 |
| **扩展上限** | 单机内存/磁盘限制 | 云端弹性伸缩 |
| **运维成本** | 零成本（自管理） | Azure 订阅费用 |

### 4.2 扁平搜索 vs 语义图谱

这是能力上最关键的差异：

- **qmd** 将所有文档视为"扁平的文本块"——无论文档之间有什么关系，检索都是基于文本相似度
- **Fabric IQ** 通过 Ontology 构建了 **实体-关系图谱**，可以回答"A 的供应商的供应商受到了什么影响？"这类多跳推理问题

**示例场景**：

```
问题："哪些客户的订单依赖于停产的零件？"

qmd 的回答方式：搜索包含"停产""零件""客户"等关键词的文档片段
Fabric IQ 的回答方式：Order → OrderItem → Part（停产标记） → Customer，通过图遍历精确定位
```

### 4.3 单用户 vs 多租户

- qmd 不需要也不提供任何用户管理、权限控制
- Foundry IQ / Fabric IQ 内置了企业级安全栈：
  - Entra ID 认证（RBAC）
  - 文档级别访问控制（检索结果自动过滤无权限内容）
  - Microsoft Purview 合规审计
  - 跨租户数据共享治理

### 4.4 查询语法的哲学差异

qmd 提供了面向技术用户的结构化查询语法：

```bash
# 单行自动扩展
qmd query "how does auth work"

# 结构化查询文档（精准控制每个检索通道）
qmd query $'lex: CAP theorem\nvec: consistency vs availability'

# 短语匹配 + 排除
qmd query $'lex: "exact matches" sports -baseball'
```

Foundry IQ 则走 **自然语言优先** 路线——用户只需提问，LLM 负责将自然语言翻译为 GQL / KQL / DAX 查询。

---

## 五、场景选择指南

### 5.1 个人本地场景

**推荐：qmd**

适用条件：
- 个人笔记库（Obsidian、Logseq、纯 Markdown 文件夹）
- 代码仓库文档
- 本地知识管理

选择理由：
1. **隐私性**：数据完全在本地，不上传任何云端
2. **零成本**：无需云服务订阅，无 token 计费
3. **低延迟**：本地索引查询毫秒级响应
4. **Agent 友好**：通过 MCP Server 直接集成到 Claude Code / Cursor 工作流
5. **简单运维**：`qmd embed` 一条命令建索引，`qmd update` 增量更新

典型工作流：

```bash
# 1. 添加 Obsidian vault 为 collection
qmd collection add mindforge ~/Documents/obsidian-daily

# 2. 建立索引
qmd embed

# 3. 混合搜索
qmd query "Fabric IQ 和 Palantir 的 Ontology 对比"

# 4. 作为 MCP Server 供 AI Agent 使用
qmd mcp
```

**qmd 的局限**：
- 无法处理非 Markdown 格式（PDF、数据库、API 数据源）
- 不支持多用户协作
- 无法做知识图谱式的多跳推理
- 数据规模受限于单机资源

### 5.2 企业级使用场景

**推荐：Foundry IQ + Fabric IQ**

适用条件：
- 跨部门、跨团队的知识检索
- 需要多数据源联合查询（数据库 + 文档 + SharePoint + 实时流）
- 合规要求（审计追踪、权限控制、数据驻留）
- 需要知识图谱和多跳推理

选择理由：
1. **语义治理**：Ontology 统一全组织的业务概念定义，消除"语义漂移"
2. **多源联合**：OneLake + SharePoint + Azure Blob + Web 一站式检索
3. **权限感知**：检索结果自动尊重文档级 ACL，不同角色看到不同内容
4. **图谱推理**：通过 Graph Engine 回答供应链影响、客户关联等复杂问题
5. **运维托管**：Azure 平台管理，企业无需维护搜索基础设施

典型架构：

```
Power BI 报表 ←→ OneLake 数据湖 ←→ Fabric IQ Ontology
                                       ↕
SharePoint 文档 ←→ Foundry IQ Agentic Retrieval ←→ AI Agent（Copilot / 自定义）
                                       ↕
                              Azure AI Search 索引
```

**Foundry IQ / Fabric IQ 的局限**：
- **成本**：需要 Azure 订阅 + Fabric 容量 + AI Search 资源
- **复杂度**：Ontology 建模需要业务理解和治理流程
- **依赖**：强绑定 Microsoft 生态
- **延迟**：云端多跳 API 调用，比本地搜索慢一个量级

### 5.3 混合策略（推荐）

在实际工作中，两者并非互斥。一个架构师的典型工作流可以是：

| 场景 | 工具 | 理由 |
|------|------|------|
| 个人笔记检索 | qmd | 私密、快速、免费 |
| 代码库文档搜索 | qmd | 本地索引、Agent 集成 |
| 企业数据分析 | Fabric IQ | 需要 Ontology + 图谱推理 |
| 跨部门知识问答 | Foundry IQ | 需要多源检索 + 权限控制 |
| 会议纪要 / SharePoint 搜索 | Foundry IQ | 数据已在 Microsoft 生态中 |

```
 个人设备                              企业云端
┌──────────────────────┐        ┌──────────────────────────────┐
│  Obsidian Vault      │        │  OneLake + SharePoint        │
│       ↓              │        │       ↓                      │
│  qmd (BM25+Vec+HyDE) │        │  Fabric IQ (Ontology+Graph)  │
│       ↓              │        │       ↓                      │
│  MCP Server          │        │  Foundry IQ (Agentic RAG)    │
│       ↓              │        │       ↓                      │
│  Claude Code Agent   │←──MCP──│→ Data Agent                  │
└──────────────────────┘        └──────────────────────────────┘
```

---

## 六、qmd 为什么不利用 Obsidian 的图数据做多跳推理？

这是一个值得深入探讨的问题。Obsidian vault 天然包含丰富的图结构数据——`[[wikilinks]]` 构成了笔记之间的有向边，backlinks 构成了反向边，tags 和 frontmatter 属性构成了节点的元数据。这些数据加在一起，其实就是一个 **个人知识图谱**（Personal Knowledge Graph）。那么 qmd 为什么没有利用它？

### 6.1 技术上可行但被有意忽略

从技术角度看，解析 Obsidian 的图数据并不难：

1. **Wikilink 解析**：正则匹配 `[[...]]` 即可提取所有笔记间的链接关系
2. **Backlinks**：对 wikilinks 做反向索引就能得到
3. **Tags / Frontmatter**：YAML 解析 + 正则提取 `#tag`
4. **obsidiantools**（Python 库）已经实现了完整的 vault 图结构解析，能输出 NetworkX 图对象

但 qmd 的设计哲学刻意回避了这条路。原因可能有几个层面：

### 6.2 设计哲学：通用性 > 专用性

qmd 的定位是 **"任意 Markdown 文件夹的搜索引擎"**，不是 "Obsidian 专用搜索"。它支持的数据源是 plain Markdown files，不假设任何特定的笔记工具语法。如果引入 wikilink 解析，就必须处理：

- Obsidian 风格的 `[[note]]` vs Logseq 风格的 `[[note]]`（语义不同）
- 带别名的链接 `[[note|显示文本]]`
- 块引用 `[[note#^block-id]]`
- 嵌入 `![[note]]`

这会让一个通用工具变成"半个 Obsidian 解析器"，违背了其极简哲学。

### 6.3 Obsidian 图数据的质量问题

Obsidian 的图数据是 **用户手动创建的链接**，而非从内容中自动提取的语义关系。这意味着：

| 问题 | 说明 |
|------|------|
| **不完整** | 用户不可能为每一对相关笔记都创建链接，大量隐含关系缺失 |
| **不对称** | A 链接了 B，但 B 未链接 A——这不代表关系是单向的 |
| **无类型** | `[[wikilink]]` 只表达"有关系"，不表达关系类型（引用？依赖？反驳？扩展？） |
| **噪声多** | 很多链接是"顺手加的"，不代表深度关联 |

相比之下，Fabric IQ 的 Ontology 图谱是 **显式定义的、有类型的、有约束的**：`Customer --[places]--> Order --[contains]--> Product`。这种结构化图谱才能支撑可靠的多跳推理。

用 Obsidian 的 wikilinks 做多跳推理，类似于用 Wikipedia 的超链接做知识图谱——**数据丰富但语义模糊**。

### 6.4 更可行的方向：GraphRAG on local Markdown

如果要在本地 Markdown 上实现图增强的 RAG，更务实的路径不是解析 wikilinks，而是：

1. **LLM 自动提取实体和关系**——像 Microsoft GraphRAG 那样，用 LLM 从文本中抽取 `(entity, relation, entity)` 三元组，构建自动化知识图谱
2. **社区检测**——对自动构建的图做 Leiden 社区检测，发现主题簇
3. **图增强检索**——查询时先定位相关社区，再在社区内做精准检索

这正是 [Microsoft GraphRAG](https://github.com/microsoft/graphrag) 项目的方法。它不依赖用户手动创建的链接，而是让 LLM 从文本内容中自动发现关系。

### 6.5 一个可能的融合架构

如果有人想在 qmd 的基础上增加图能力，一个合理的架构是：

```
Obsidian Vault
     ↓
┌─────────────────────────────────────┐
│  Layer 1: qmd（现有能力）              │
│  BM25 + Vector + HyDE → 文本检索     │
├─────────────────────────────────────┤
│  Layer 2: Link Graph（新增）          │
│  解析 wikilinks → 构建邻接图           │
│  给检索结果添加"相邻笔记"上下文         │
├─────────────────────────────────────┤
│  Layer 3: Auto Graph（高级，可选）     │
│  LLM 提取实体-关系 → 自动知识图谱       │
│  社区检测 → 主题簇发现                 │
│  多跳推理 → 回答跨笔记关联问题          │
└─────────────────────────────────────┘
```

**Layer 2**（链接图增强）实现成本低，收益明确——检索到一篇笔记后，自动把它链接的笔记也纳入上下文，这对 AI Agent 来说非常有价值。实际上，一些 Obsidian RAG 项目（如 obsidian-copilot）已经在做类似的事。

**Layer 3**（自动图谱）实现成本高，需要大量 LLM 调用来提取实体关系，但能从根本上弥补 wikilinks 的语义缺失。

### 6.6 小结

qmd 没有利用 Obsidian 图数据，本质上是 **通用性 vs 专用性** 的取舍。但这也意味着在个人知识管理场景下，存在一个显著的能力缺口：Obsidian 有图数据却无法用于 RAG，qmd 有 RAG 能力却忽略了图数据。**谁能把这两者桥接起来，谁就能在个人 GraphRAG 这个方向上占据先机**。

---

## 七、技术趋势观察

### 6.1 RAG 正在从"向量搜索"走向"Agentic 检索"

早期 RAG 的标准实现是"切分 → 嵌入 → 向量搜索 → 拼接 Prompt"。但 2025-2026 年的趋势是让 LLM 深度参与检索过程：

- qmd 的 **HyDE** 模式是这个方向的轻量级探索
- Foundry IQ 的 **Agentic Retrieval** 是这个方向的企业级实现

### 7.2 知识图谱 + RAG 的融合

纯文本 RAG 无法回答涉及多实体关系的问题。Fabric IQ 将 Ontology 知识图谱与 RAG 融合，代表了一个重要趋势——**GraphRAG**。这也是 Microsoft Research 的 [GraphRAG](https://github.com/microsoft/graphrag) 项目所探索的方向。

### 7.3 MCP 成为 AI Agent 的通用检索接口

无论 qmd 还是 Fabric IQ，都选择了 MCP 作为 Agent 接入协议。这意味着 AI Agent 不需要关心底层是本地 SQLite 还是云端 Azure AI Search——统一的协议抽象使得 **检索能力可插拔、可组合**。

---

## 八、总结

| 维度 | qmd | Foundry IQ / Fabric IQ |
|------|-----|----------------------|
| **一句话定位** | 个人设备上的 Markdown 混合搜索 | 企业级语义检索 + 知识图谱平台 |
| **最佳场景** | 个人笔记、代码文档、本地 RAG | 跨部门知识问答、供应链分析、合规检索 |
| **核心优势** | 隐私、速度、零成本、简洁 | 语义治理、图谱推理、多源联合、权限感知 |
| **核心劣势** | 不支持多用户/图谱/非 Markdown | 成本高、复杂度高、Microsoft 锁定 |
| **选择原则** | 个人知识工作者的首选 | 企业 IT 架构的一部分 |

**最终建议**：不要把 qmd 和 Foundry IQ 看作竞品——它们是 RAG 光谱的两端。个人场景用 qmd 做轻量级本地检索，企业场景用 Foundry IQ / Fabric IQ 做深度语义分析。通过 MCP 协议，两者可以在同一个 AI Agent 工作流中共存互补。

---

## 参考资料

- [qmd — GitHub](https://github.com/tobi/qmd)
- [qmd — LobeHub Skills Marketplace](https://lobehub.com/skills/tobi-qmd-qmd)
- [Fabric IQ Overview — Microsoft Learn](https://learn.microsoft.com/en-us/fabric/iq/overview)
- [Agentic Retrieval Overview — Azure AI Search](https://learn.microsoft.com/en-us/azure/search/agentic-retrieval-overview)
- [Building RAG with Microsoft Fabric — Fabric Blog](https://blog.fabric.microsoft.com/en-US/blog/building-custom-ai-applications-with-microsoft-fabric-implementing-retrieval-augmented-generation-for-enhanced-language-models/)
- [Microsoft Fabric IQ与本体论（Ontology）研究](../../../Azure/fabricIQ/Microsoft%20Fabric%20IQ与本体论（Ontology）研究.md)
