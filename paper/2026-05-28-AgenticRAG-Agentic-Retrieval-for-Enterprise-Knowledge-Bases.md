---
title: AgenticRAG — Agentic Retrieval for Enterprise Knowledge Bases 论文精读笔记
created: 2026-05-28
tags:
  - paper
  - RAG
  - agentic
  - azure-ai-search
  - microsoft
---

# AgenticRAG: Agentic Retrieval for Enterprise Knowledge Bases

- **来源**：[arxiv 2605.05538](https://arxiv.org/html/2605.05538v1)
- **作者**：Microsoft Research
- **关注点**：从"单次检索"到"agentic 工具调用"的范式转换；RAG 性能天花板由 LLM 自主检索决定；与 Azure AI Search Agentic Retrieval 的关联

---

## 一、核心洞察：范式转换

> RAG 的性能天花板不是搜索引擎决定的，而是你愿不愿意让模型自己掌控"搜什么、读哪里、什么时候够"。

| 维度 | 传统 RAG | AgenticRAG |
|------|---------|------------|
| 检索模式 | 单次检索 → 生成 | LLM 主动多轮迭代检索 |
| 控制权 | 预设 pipeline 固定 | LLM 动态决策（搜什么/读哪里/何时停） |
| 工具使用 | 无 | Search / Find / Open / Summarize |
| 训练需求 | 无/需微调检索策略 | 无需训练，推理时轻量集成 |
| 性能提升 | baseline | R@1 提升 5.9× |

**关键数据**：BRIGHT 数据集上，Single-shot 8.41% R@1 → AgenticRAG 49.6% R@1（Claude Sonnet 4.5），接近 Oracle 上限 94%。

---

## 二、架构与执行流程

### 四大工具

| 工具 | 功能 | 设计意图 |
|------|------|---------|
| **Search** | 向企业搜索引擎发送查询，返回 ≤10 条候选文档（支持多子查询并行，默认5路） | 广度检索，扩大候选覆盖 |
| **Find** | 在指定文档内做关键词/语义匹配，返回 ≤2 片段 | 深度定位，精准段落 |
| **Open** | 从文档指定行号起返回 1800 行完整内容 | 全文阅读，上下文补全 |
| **Summarize** | 压缩会话上下文，保留关键引用 ID | 上下文管理，突破 128K 限制 |

### Agentic Loop

```
┌─────────────────────────────────────────┐
│  用户问题 → LLM 推理                     │
│    ↓                                     │
│  决策：需要更多信息？                      │
│    ├── 是 → 选择工具（Search/Find/Open） │
│    │        ↓                            │
│    │   执行工具 → 获取结果                │
│    │        ↓                            │
│    │   上下文接近上限？→ Summarize        │
│    │        ↓                            │
│    │   回到推理（最多15轮）               │
│    └── 否 → 生成带引用的最终答案          │
└─────────────────────────────────────────┘
```

---

## 三、消融实验——哪些步骤真正关键

| 消融条件 | R@1 | 工具调用数 | 结论 |
|---------|-----|-----------|------|
| **Single-shot（仅1次Search）** | 8.41% | 1 | 多轮 Agentic 检索是**决定性因素**（5.9× 提升） |
| 禁用多子查询 | 44.84% | 6.79 | Recall 不降，但效率下降 29% |
| 禁用语义 Find | 46.34% | 5.02 | 影响极小 |
| 禁用 Summarize | 43.34% | 4.92 | 对精度无影响，但长文档场景必需 |

**核心结论**：
1. **多轮自主检索是唯一带来质变的因素**——其他工具是效率/鲁棒性优化
2. 多子查询并行是"用更少轮次覆盖更多"的效率手段（-29% 调用）
3. Summarize 是可扩展性保障（长文档/多跳推理不溢出）

---

## 四、与 Azure AI Search Agentic Retrieval 的映射

### 关联程度判断：**高度关联，但 Azure 产品是论文思想的部分落地**

| AgenticRAG 能力 | Azure Agentic Retrieval 支持 | 差距 |
|----------------|---------------------------|------|
| LLM 查询规划（问题拆解） | ✅ 原生内置（gpt-4.1/gpt-5 规划） | — |
| 多子查询并行检索 | ✅ 原生内置 | — |
| 文档内深度阅读（Find/Open） | ⚠️ 需自定义（Azure 返回段落，无动态翻页） | 需 Function Calling 扩展 |
| 上下文 Summarize | ⚠️ 仅支持对话历史摘要，无中途压缩 | 需自定义逻辑 |
| 多轮对话上下文重用 | ⚠️ 对话上下文支持，细粒度引用重用需自实现 | — |
| 有界循环（≤15轮） | ❌ 需外部编排（Copilot Agent / Semantic Kernel） | — |

### 架构对应关系

```
AgenticRAG                    Azure AI Search
──────────                    ──────────────
Agentic Loop          ←→     Copilot Agent / Semantic Kernel Orchestration
Search Tool           ←→     Knowledge Base → Search Index（向量+关键词+语义排序）
Find Tool             ←→     需自定义（Azure Search + Function Calling）
Open Tool             ←→     需自定义（Blob Storage 读取 + 行定位）
Summarize Tool        ←→     需自定义（LLM 调用）
Knowledge Base 对象    ←→     AgenticRAG 的企业搜索引擎后端
```

### 判断

论文与 Azure Agentic Retrieval 是**同一团队的研究-产品双线输出**：
- 论文提供了完整的理论框架和实验验证
- Azure 产品落地了其中**查询规划 + 多路并行检索**的核心能力
- 更高级的 Agentic 能力（文档深读、上下文管理、有界循环）需通过 Azure OpenAI + Semantic Kernel 自行编排

---

## 五、实践启示

1. **优先实现多轮检索**——这是唯一带来量级提升的因素，复杂问题必须让 LLM 自主决定检索轮次
2. **并行多子查询是低成本高收益优化**——Azure Agentic Retrieval 已原生支持
3. **按复杂度路由**——简单问题仍用 Single-shot RAG（快且便宜），复杂问题走 Agentic 流程
4. **成本意识**：Agentic 模式 token 开销 2.6~7.8×，但 Recall 提升 5.9×，ROI 正向
5. **设置迭代上限**（如15轮）防止无限检索，同时监控 token 消耗

---

## 六、与现有方法的定位

| 方法 | 特点 | AgenticRAG 优势 |
|------|------|----------------|
| ReAct | 通用 Reason+Act | AgenticRAG 针对企业文档设计分层工具链 |
| PlanRAG | 离线规划→执行 | AgenticRAG 在线融合规划和检索 |
| Self-RAG / Corrective RAG | 自反思+纠错 | AgenticRAG 集成反思能力且无需训练 |
| Search-R1 | 需 RL 训练检索策略 | AgenticRAG 零训练，推理时集成 |

**AgenticRAG = ReAct（工具自主）+ PlanRAG（子任务规划）+ Self-RAG（自反思）的融合，且强调零训练 + 企业搜索兼容。**
