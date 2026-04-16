---
title: Vibe Coding 系列05：大项目落地困局——从 Context 爆炸到 Skill Runtime 的范式迁移
created: 2026-03-22
tags:
  - vibe-coding
  - context-engineering
  - GSD
  - skill-runtime
  - agentic-engineering
  - Claude-Code
  - MCP
  - LangGraph
---


> 本文基于一次 ChatGPT 深度讨论整理，围绕 GSD（Get Stuff Done）、Superpowers、OpenSpec 等 vibe-coding 工具在实际大项目中遇到的 context 管理困局，以及行业正在发生的范式迁移。

## 一、问题起点：GSD 的 Context 为什么这么大？

在使用 GSD 过程中，一个直观的感受是——context 特别大。核心原因在于 GSD 的设计哲学：

**GSD 采用的是"全量上下文拼接"模式**：

```
所有 plan 文件 → 拼接 → 变成一个 review context → 丢给模型
```

这不是 bug，而是设计。但问题是：这是**文档式加载（document-centric）**，不是**能力式加载（capability-centric）**。

### 三个直接后果

| 问题 | 表现 |
|------|------|
| Context 线性增长 | plan 越多 → prompt 越大 |
| 无选择加载 | 某一步只需要 1 个文件 → 还是加载全部 7 个 |
| 模型被迫做 parsing | 模型同时在做业务 reasoning 和文档结构解析 → 浪费 token + 降低稳定性 |

### 本质判断

> **GSD 根本不是 skill system，而是"AI 驱动的 checklist / phase pipeline"**

它的 context boundary 是 `phase`，不是 `skill / task`。这意味着：
- 它优化的是：可理解性、可审查性、简单实现
- 它牺牲的是：token efficiency、scalable context、动态组合能力

## 二、Superpowers 和 OpenSpec 的同类困局

### Superpowers 的问题

Superpowers 把 spec 写得很细，subagent 可以按此直接执行。但当单个功能比较大时，即使 subagent 的 context 也会爆炸。

核心错位：**用"文本分解"解决"计算分解"问题**。

### OpenSpec（Delta 模式）的 Trade-off

OpenSpec 引入了**时间维度**——不一次性理解全部，而是逐步演化（`Spec(base) + Delta(change) → 当前状态`）。

优点：
- context 不用每次全量加载
- 更接近 git / 软件工程思维
- 支持 incremental reasoning

但问题是：
> **LLM 并不会真的"只看 delta"** —— delta 仍然需要还原语义上下文

所以只是从"一次性爆 context"变成"多次局部爆 context"。

### 三种范式对比

| 方案 | 本质 | 致命问题 |
|------|------|----------|
| GSD / Superpowers | Plan → 拆细 → 拼 context → LLM 执行 | context = 系统规模，必炸 |
| OpenSpec / Delta | Spec(base) + Delta(change) | 隐式 context 爆（仍需语义还原） |
| **缺失的方案** | query → select → project → execute | — |

## 三、真正缺失的东西：Skill Runtime

### 核心洞察：Context 不等于 State

所有 GSD / Superpowers / OpenSpec 系统都有一个隐含错误假设：

```
context = state  <-- 错误
```

应该是：

```
state → 外部存储（结构化）
context → 按需投影（projection）
```

### 三层架构

```
[1] State Layer（持久状态）
    - spec / graph / memory

[2] Selection Layer（选择）
    - retrieval / routing / dependency resolve

[3] Execution Layer（LLM）
    - 只吃"必要上下文"
```

### Skill Runtime 的定义

```
Skill Runtime =
    query → intent parse
    → skill match
    → context projection
    → execution
```

关键区别在于：**context 是声明的，不是写死的**。Skill 定义从 Markdown 文档变成 YAML schema：

```yaml
skill: api_design
inputs:
  - requirement
  - constraints
context:
  - api_examples
  - schema_rules
execution:
  type: llm
  prompt_template: api_design.tpl
```

### 系统自检 5 问

评估任何 agent system 是否能 scale：

1. query 来了，是谁决定用哪个 skill？
2. context 是不是全量拼接？
3. skill 有没有明确输入/输出？
4. context 是不是 externalizable？
5. execution 是否 independent？

> **只要有 2 个答不上来 → 系统一定不 scale**

## 四、行业范式迁移：Vibe Coding → Agentic Engineering → Deterministic Systems

### 四条竞争路线

**1. Graph-based Agent（最关键）**
- 代表：LangGraph、MASFactory
- 本质：把 agent execution 从"prompt"变成"计算图"
- 核心：`task → graph → node(skill) → edge(dependency)`

| 旧（GSD / Superpowers） | 新（Graph） |
|---------------------------|------------|
| context 驱动 | execution 驱动 |
| 全量加载 | 节点级加载 |
| 隐式依赖 | 显式依赖 |

**2. MCP + Tool Ecosystem（最实用）**
- 代表：Claude Code + MCP、OpenAI Operator
- 核心：`query → tool discovery → tool call → result`
- MCP 被称为"AI 的 USB-C"

**3. Multi-Agent Orchestration（在降温）**
- 代表：CrewAI、OpenAI Swarm、AutoGen
- 问题：multi-agent 不等于 scalable，很多只是"更多 context + 更多混乱"

**4. Spec / Delta / Intent-driven（描述层）**
- 代表：OpenSpec、vibe spec
- 问题：还停在"描述层"，没有真正 runtime

### Agentic Stack（正在形成的新概念）

```
- MCP（接口层）
- LangGraph（执行层）
- Memory / State（状态层）
- Eval / Verification（验证层）
```

> AI 不再是"写代码的工具"，而是"运行系统的一部分"

### 2026 最大变化

> **"自由 prompt 编程"正在被抛弃**

原因：不可控、不可复现、不可扩展。行业方向：**deterministic + stateful + verifiable**。

## 五、推荐实践路线

### 最推荐：GSD + MCP + Router + LangGraph

```
GSD（管理）
+ MCP（能力）
+ Router（自己补的选择层）
+ LangGraph（执行）
```

自己补那一层：**query → select → context projection**

### 更激进：直接放弃 GSD

```
intent → graph → execution
```

### 不推荐：继续优化 Superpowers

减少粒度、控制 prompt 可以缓解，但本质问题不会消失。

## 六、关键 Context 选择判断标准

评估任何 agent system 的 context 策略：

| context 处理方式 | 评价 |
|:----------------|:-----|
| 拼接（concatenation） | 不可行 |
| Delta（增量） | 半对——仍需语义还原 |
| Query + Select | 正确方向 |

> **不要比较"怎么写 context"，应该设计"怎么不用 context"**

## 七、与 Claude Code 实践的关联

从 Claude Code 的 skill/subagent 架构来看：
- Claude Code 的 skill 按需加载（`When to Use This Tool` 声明式触发）本身就是 **query → select** 的雏形
- subagent 使用 `isolation: "worktree"` 提供了部分 **context isolation**
- MCP server 作为 tool ecosystem 正是 **Routing Layer** 的接口层
- 但 Claude Code 目前的 system prompt 仍是全量加载所有 tool definitions —— 这本身就是"字典式加载"的体现

这篇笔记的核心启示是：要真正让 AI coding 在大项目中 scale，需要从"文档驱动"转向"能力驱动"，补上 **Selection Layer** 这一缺失的关键环节。

## 八、与 Harness Engineering 的关系——State Layer 已就绪，Selection Layer 待补全

[[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] 一文系统阐述了 AI Harness Engineering 的五大支柱和实践框架。将 Harness Engineering 放入本文的三层架构中审视，会发现一个关键的结构性对应关系：

### Harness Engineering = 优秀的 State Layer 实践

Harness Engineering 的文档分层体系——`CLAUDE.md (HOW) + config.yaml (WHAT) + specs (WHAT) + plans (WHEN) + delta (CHANGE)`——本质上是在构建一个**高质量的 State Layer**：

| 三层架构 | Harness Engineering 对应 | 完成度 |
|---------|------------------------|--------|
| **State Layer**（持久状态） | config.yaml + specs + CLAUDE.md + delta + CI/CD | ✅ 做得很好 |
| **Selection Layer**（按需选择） | **无** | ❌ 缺失——context 爆炸的根源 |
| **Execution Layer**（LLM 执行） | GSD phase / Superpowers skill / subagent | ✅ 有，但受限于 context 大小 |

### "非重叠"解决了内容冗余，但没解决加载冗余

Harness Engineering 的一条关键原则是：

> "非重叠（Non-overlap）— CLAUDE.md 只写 HOW，不写 WHAT；Spec 只写 WHAT，不写 HOW"

这个原则解决了**内容层面的冗余**——不同文件之间没有矛盾信息。但它没有解决**加载层面的冗余**：即使 CLAUDE.md 和 Spec 内容不重叠，当某个 task 只需要 Spec 中的 API 部分时，整个 Spec + 整个 CLAUDE.md 仍然会被全量加载。

这正是"字典式加载"的体现——所有缰绳都编织得很好（Harness 质量高），但骑马时不需要把所有缰绳都握在手里。

### Harness 为 Selection Layer 铺好了路

好消息是，Harness Engineering 的结构化实践恰恰为 Selection Layer 提供了最好的基础：

- **tag 化的 spec** → 可以做 tag-based routing
- **分层的文档结构** → 可以按层级做 selective loading
- **显式的依赖关系**（Phase D → A → C → B） → 可以做 dependency-aware context projection
- **CLAUDE.md 的 pitfall list** → 可以按当前 task 涉及的模块只加载相关条目

具体的补全方向：

**方向一：给 spec/plan 加 metadata + query-based loading**

```yaml
# specs/api.md 头部增加
---
tags: [api, auth, endpoint]
modules: [backend, gateway]
---
```

执行 task 时：`task intent → match tags → 只加载相关 spec 片段`

**方向二：CLAUDE.md pitfall list 模块化**

```
当前：13 条 pitfall 全量加载（所有 task 都看到全部 pitfall）
改为：按 task 涉及的模块，只加载相关 pitfall 子集
```

**方向三：利用 Bitter Lesson 视角定位时间窗口**

Harness Engineering 笔记末尾引用了 Bitter Lesson，指出"手工编写的 routing 逻辑终将被更强的模型吞噬"。这与本文的讨论形成了有趣的**张力**：

- **短期**（当下）：模型 context window 有限 → 需要人工设计 Selection Layer → Harness + Router 是最务实组合
- **长期**（模型窗口继续扩大）：Selection Layer 本身可能被模型内化 → 但 Harness 的 State Layer 价值不会消失（结构化信息永远比非结构化信息更高效）

### 一句话总结

> **Harness Engineering 回答的是"如何把缰绳编织好"（State Layer），本文揭示的是"骑马时如何按需握取"（Selection Layer）。两者不是对立的——Harness 做好了基础，正需要 Selection Layer 来释放它的 scalability。**

## 九、Granularity Layer——Selection Layer 之前的前置条件

Selection Layer 解决了"选什么"的问题，但还有一个更基础的问题：**选出来的东西太大怎么办？** 即使 Router 精准匹配到了正确的 spec，如果那个 spec 本身有 200 页，context 照样放不下。

这个问题与 RAG 中的 chunking policy 是**同构**的：

| 维度 | RAG Chunking | Agentic Coding Chunking |
|------|-------------|------------------------|
| 被切的对象 | 文档文本 | Spec / Plan / Code Module |
| 太大的后果 | 噪声淹没信号，检索精度下降 | Context 爆炸，LLM 推理质量下降 |
| 太小的后果 | 语义碎片化，上下文丢失 | 任务割裂，跨模块依赖断裂 |
| 选择层 | Retriever（向量 / BM25） | Router / Skill Matcher |
| 核心约束 | embedding model 的 token limit | LLM context window 的有效利用率 |

### 9.1 社区的六种 Chunking 策略

**Agentic Chunking**（IBM / Weaviate）：用 LLM 本身判断语义边界，让 AI 参与 spec 的拆分决策。

**Hierarchical Chunking**（多层粒度）：Project Spec（~500 tokens）→ Module Spec（~2000-4000 tokens）→ Task Spec（~500-1500 tokens）。Selection Layer 先匹配 Module，如果 Module 太大再深入到 Task 级别。

**Context-Budget-Aware Sizing**（Pinecone）：chunk 最优大小不是绝对值，而是相对于下游任务 context budget 的比例。Claude 200k tokens，有效利用率约 60-70%（扣除 system prompt、tools、conversation），单个 unit 的务实上限约 **2000-5000 tokens（6-15 页 Markdown）**。

**Subagent Context Isolation**（Claude Code 实践）：主 agent 持有全局视图（~10-20k tokens），subagent 只接收特定任务的精简 context（~5-8k tokens）。每个 subagent 有独立的 200k 窗口，总可用 context 是 **N × 200k**。

**Single Responsibility for Specs**（SRP 原则迁移）：一个 spec = 一个 concern。判断标准：能否独立验证？如果正确性需要参考另一个 spec → 粒度太细了。

**Adaptive Decomposition**（TDAG 框架）：不预先固定粒度，执行时根据 context budget 动态调整——超预算就拆分为 subtask 并 spawn subagent。

### 9.2 三条实践规则

1. **Spec 文件单体不超过 150 行 Markdown**（约 3000-4000 tokens）——超过就拆
2. **Plan 文件每个 phase 不超过 10 个 task**——超过就分 sub-phase
3. **Code module 单文件不超过 400 行**——超过就按职责拆分

### 9.3 四层架构（扩展版）

原来的三层架构需要扩展为**四层**：

```
[1] State Layer（持久状态）       ← Harness Engineering（编织缰绳）
[2] Granularity Layer（粒度控制）  ← Chunking Policy（确保每条缰绳可握）
[3] Selection Layer（按需选择）    ← Router / Skill Match（按需握取）
[4] Execution Layer（LLM 执行）   ← Subagent / Tool Call（执行动作）
```

Granularity Layer 的职责：确保 State Layer 中的每个 unit 都是 **context-budget-aware** 的——它不选择内容，而是**规范内容的大小**，使得 Selection Layer 选出来的任何单个 unit 都能放进 context。

> **没有 Granularity Layer 的 Selection Layer，就像 RAG 没有 chunking policy 的 retriever——选得再准，也可能 retrieve 到一个放不进 prompt 的巨型文档。**

---

#### 相关笔记

- [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] — State Layer 的系统实践
- [[Vibe Coding系列03：AI-Native开发实践——从Figma设计到Superpowers Brainstorm再到Spec-Delta工作流]] — 五层 AI pipeline 的全流程
- [[Claude Code系列03：Agent、Subagent与Teammate架构解析——从一次性委派到长期协作]] — Agent/Subagent 架构中的 context 传递
- [[Vibe Coding系列04：流程框架选择指南——GSD、SpecKit、OpenSpec与Superpowers的组合实践]] — 各框架的定位与组合策略
- [[2026-03-21-The-Bitter-Lesson|The Bitter Lesson]] — Selection Layer 时间窗口的理论基础
