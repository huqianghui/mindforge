---
title: PKC 系列 02：个人知识编译器进化——从三层知识模型到持续迭代的知识系统
created: 2026-04-13
tags:
  - knowledge-management
  - llm-wiki
  - personal-knowledge-compiler
  - obsidian
  - oh-my-claudecode
  - claude-code
---

# PKC 系列 02：个人知识编译器进化——从三层知识模型到持续迭代的知识系统

> **PKC 系列文章**
> 1. [PKC 系列 01：从日记到知识库——Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践](PKC系列01：从日记到知识库——Obsidian%20×%20oh-my-claudecode%20×%20LLM%20Wiki%20的个人知识编译实践.md)（痛点分析与初步方案）
> 2. **本文：个人知识编译器进化**（系统演进与实践）

在[上一篇](PKC系列01：从日记到知识库——Obsidian%20×%20oh-my-claudecode%20×%20LLM%20Wiki%20的个人知识编译实践.md)中，我描述了个人知识管理的痛点和初步设计。当时的结论是"把知识编译这件事做起来"。本文记录的是**做起来之后**发生了什么——40 个概念页、8 个方法页、4 个决策记录、~160 条 Claims 之后，个人知识编译器（PKC）从"原型设计"走向了"可运行的系统"。

核心发现：Karpathy 的 LLM Wiki 模型（"RAG = search, LLM Wiki = writing a book"）是好的起点，但**不够用**。个人知识管理需要的不只是"编一本书"，而是一个具备 What/How/Why 三层认知、能持续迭代、能跨切面查询的活系统。

---

## 一、问题：个人知识的三重缺失

日记写了三个月之后，回头审视知识库，发现三个层次的问题：

**只有 What，没有 How 和 Why。** 概念页记录了"Context Engineering 是什么"、"Agent Loop 架构是什么"，但是：
- "五层 AI-Native Pipeline 怎么执行？"——步骤、输入输出、判断标准散落在概念页的 Claims 里，没有流程结构
- "为什么选级联管线而不选端到端？"——决策理由被压缩成一句 Claim，丢失了选项分析、前提假设、放弃理由

**知识只进不出，没有反馈闭环。** 知识流是单向的：日记 → 提取 → wiki。但在项目中实际应用某个方法后，成功还是失败、哪里需要调整——这些实践反馈没有回流到知识库，导致 Claims 的置信度永远停在初始值。

**关联是扁平的，查询只能线性搜索。** 概念页之间的 `[[wikilinks]]` 只是"有关系"，不区分关系类型。想回答"哪些方法实现了 Harness Engineering？"或"哪些决策影响了 Voice Agent 架构？"——需要人工逐页查看。

---

## 二、What/How/Why 三层知识模型

### 2.1 Concept 层——What（是什么）

这是最初就有的层。每个概念页的核心是 **Claim-based Schema**：

```markdown
### Claim: 端到端模型尚未达到企业生产可用

- 来源：[[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]]
- 置信度：0.8
- 状态：active

> 2026 年企业级唯一生产可行架构仍是 STT → LLM → TTS 级联管线。
```

关键设计：知识不存"事实"，只存"论断"（Claim）。每条 Claim 附带来源、置信度（0.0~1.0）和生命周期状态（active / conflicting / outdated / stale）。**这不是语义洁癖，而是实用需求**——同一个概念下允许互相矛盾的 Claim 共存，因为知识本身就是有冲突的，今天的"最佳实践"明天可能被推翻。

当前规模：40 个概念页，涵盖 AI Agent 理论、Claude Code 生态、Vibe Coding、语音交互、Azure 云平台、数据本体论、知识管理 7 大领域。

### 2.2 Method 层——How（怎么做）

建设 Concept 层几周后，发现一个问题：**42.5% 的概念页包含被"塞进" Claim 格式的方法类知识**。

例如"AI-Native 五层 Pipeline"本质是一个有序流程（Design → Spec → Coding → Testing → Review），但在 Claim 格式下丢失了步骤顺序、每步的输入输出、判断标准等结构信息。"四层代码复用防线"是一个分层策略，需要表达优先级和递进关系。Claim 格式（论断 + 证据 + 置信度）天然适合声明式知识，但程序性知识需要不同的结构。

解法是新增 **Method Page**（方法页），定义了 6 种方法类型：

| method_type | 含义 | 代表方法 |
|---|---|---|
| `pipeline` | 线性顺序流程 | AI-Native 五层 Pipeline |
| `decision-framework` | 条件判断选择路径 | GSD 项目规模分级 |
| `layered-strategy` | 多层递进策略 | 四层代码复用防线 |
| `workflow` | 循环工作流 | 个人知识编译流程 |
| `quality-gate` | 质量检查流水线 | Harness 五维质量门禁 |
| `architecture-pattern` | 可复用架构模式 | 语音级联管线 |

每个方法页包含：

```markdown
## 步骤

### Step 1: 设计层（Design AI）

- 输入：产品需求（PRD / 用户故事）
- 操作：使用 Figma + AI 生成 UI 设计稿
- 输出：Figma 设计文件 + 组件库
- 判断标准：设计稿覆盖所有用户流程，组件可复用

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| L1 项目（< 500 行） | 跳过 Design 层 | 直接 prompt coding 更高效 |
| L2+ 项目 | 完整执行 | 设计稿是 Spec 的输入基础 |
```

当前规模：8 个方法页，首批从概念页中提炼。方法页和概念页之间通过 `[[wikilinks]]` 双向链接。

### 2.3 Decision 层——Why（为什么）

有了 What 和 How，还缺 Why。当我想回答"为什么选 LLM Wiki 而不选 RAG？"时，发现理由散落在多个概念页的 Claims 里——选项分析、权衡过程、前提假设、放弃理由都没有完整记录。

新增 **Decision Page**（决策页），结构：

```markdown
## 选项分析

### 选项 A: RAG（检索增强生成）
- 优势：无需预处理；实时检索最新内容
- 劣势：每次查询重新派生知识；不产生网络效应
- 适用条件：大规模非结构化文档库

### 选项 B: LLM Wiki（知识预编译）
- 优势：知识编译一次持续维护；产生网络效应
- 劣势：需要持续维护成本
- 适用条件：长期个人知识积累

## 决策结论
- 选择：LLM Wiki 为主
- 理由：个人知识管理的核心价值在于结构化和关联
- 放弃理由：纯 RAG 不产生知识网络效应
- 前提假设：知识库规模在数百概念级别——如果增长到数千需重新评估
```

**前提假设是最重要的字段。** 每个决策都基于某些假设（技术成熟度、规模约束、团队能力），假设失效时需要重新评估。把假设显式记录下来，比记住结论更有价值。

当前已记录 4 个关键决策：
- 级联管线 vs 端到端（Voice Agent 架构）
- 架构约束 vs Agent 自主学习（代码复用策略）
- 规范驱动 vs 方法论框架（Vibe Coding 工具选型）
- LLM Wiki vs RAG（个人知识管理）

---

## 三、持续迭代：让知识系统活起来

### 3.1 五个命令组成知识流水线

| 命令 | 用途 | 频率 |
|------|------|------|
| `/extract-knowledge` | 从日记/文章提取概念、方法、决策 | 每日 |
| `/evolve-wiki` | 更新置信度、标记 stale、生成摘要 | 每周 |
| `/detect-conflict` | 扫描矛盾论断 | 每周 |
| `/knowledge-gap` | 分析覆盖差距、成熟度评分 | 每周 |
| `/wiki-query` | 跨切面语义查询 | 按需 |

这五个命令对应知识管理的完整生命周期：**提取 → 演化 → 冲突检测 → 差距分析 → 查询使用**。每个命令背后是一个专门的 Agent（knowledge-extractor、knowledge-maintainer、conflict-detector），按照 CLAUDE.md 中声明的规则顺序执行。

### 3.2 自动演进规则

知识不是静态文档。五条规则让知识库"活"起来：

- **信心提升**：同一论断 3+ 次出现（不同来源） → 置信度 +0.1
- **冲突标记**：语义对立的论断 → 标记 `conflicting`
- **过时标记**：新实验推翻旧结论 → 旧 claim 标 `outdated`
- **摘要生成**：概念积累 N+ claims → 自动生成/更新摘要
- **陈旧告警**：60+ 天未更新 → 标记 `stale`

核心原则：**不消灭冲突，记录冲突**。知识系统的目标不是"正确"，而是"不断逼近真实"。

### 3.3 实践反馈闭环

这是超越 Karpathy 原始 LLM Wiki 模型最重要的一步。

原始知识流是单向的：日记 → 提取 → wiki。但知识的真正验证发生在**应用**中——在项目里用了"四层代码复用防线"，到底好不好使？GSD 五步工作流在 L1 项目是否反而增加开销？

方法页新增了 **Practice Log**（实践记录）：

```markdown
## 实践记录

### Practice: 2026-04-15 — yoga-guru-copilot-platform

- 应用场景：在 L2 项目中应用 GSD 五步工作流
- 实际结果：部分成功
- 偏差与调整：Step 2（需求澄清）耗时超预期，因为 Spec 模板过于复杂
- 经验教训：L2 项目应简化 Spec 模板，只保留核心字段
- 置信度影响：相关 Claim "GSD 五步适用于 L2+ 项目" 置信度 -0.1
```

knowledge-extractor Agent 能从日记中自动识别实践反馈（关键信号：方法名 + 结果描述），并回写到对应方法页。成功的实践提升相关 Claims 置信度（+0.1），失败的降低（-0.1）。

这形成了一个**双向知识流**：日记 → 提取 → wiki → 应用 → 日记 → 反馈 → wiki。知识不再只是"记录"，而是"在使用中迭代"。

### 3.4 知识成熟度模型

光有置信度还不够，需要在领域层面评估知识的成熟度。`/knowledge-gap` 命令从 6 个维度评分：

1. **来源多样性**——单一来源 vs 多源交叉验证
2. **Claims 密度**——该领域的论断数量
3. **实践验证**——有多少 Claims 经过项目实践检验
4. **时效性**——最近更新时间
5. **跨域关联**——与其他领域的连接密度
6. **方法覆盖**——是否有对应的方法页

加权评分后映射到 4 个成熟度等级：

| 等级 | 含义 | 典型特征 |
|------|------|----------|
| 🌱 萌芽 | 刚开始接触 | 单一来源，无实践 |
| 🌿 成长 | 有基础理解 | 多来源，部分实践 |
| 🌳 成熟 | 深入掌握 | 充分验证，有方法有决策 |
| 🏔️ 精通 | 形成体系 | 跨域关联密集，持续迭代 |

首次差距分析的发现：48% 的概念仅单一来源——视角单一风险高。3 个知识分类（Context 工具集成、Azure 云平台、数据本体论）零方法覆盖。这些数据直接指导了学习优先级。

---

## 四、跨关联与跨切面查询

### 4.1 类型化关联

早期 wiki 页面之间的关联是自由文本：

```markdown
- [[harness-engineering]] — Harness Engineering 的一部分
```

问题是：当页面多了之后，"XX 的一部分"、"此方法的概念定义页"、"架构对比分析"这些描述没有统一语义，无法程序化查询。

解法是定义 **8 种关系类型**：

| 类型 | 含义 | 方向 |
|------|------|------|
| `implements` | 实现 | method → concept |
| `grounds` | 理论基础 | concept → concept |
| `extends` | 扩展 | concept → concept |
| `constrains` | 约束 | concept → decision |
| `contrasts` | 对比 | concept ↔ concept |
| `part-of` | 组成 | concept → concept |
| `uses` | 使用 | method → tool/concept |
| `produces` | 产出 | decision → method |

格式向后兼容，只在描述前加一个 code-span 前缀：

```markdown
- [[voice-live-agent]] — `grounds` 此决策的上下文概念
- [[voice-cascaded-pipeline]] — `produces` 基于此决策的实施方法
```

Obsidian 渲染正常（`grounds` 显示为内联代码），同时支持 Grep 批量查询。

### 4.2 跨切面查询

有了类型化关联，就可以做**结构化查询**而非只是关键词搜索。`/wiki-query` 命令支持 6 种查询类型：

| 查询类型 | 示例 | 实现方式 |
|----------|------|----------|
| `graph` | "voice-live-agent 关联了哪些页面？" | 读取目标页 → 提取关联 → 递归一层 → 输出关系树 |
| `claim` | "有哪些置信度 > 0.8 的 claims？" | Grep 所有 wiki 页的 Claim 块 → 解析置信度 → 过滤排序 |
| `decision` | "有哪些未验证的决策？" | 读取 decisions/ → 解析验证状态 → 过滤 |
| `method` | "有哪些 pipeline 类型的方法？" | 读取 methods/ → 按 method_type 过滤 |
| `overview` | "语音领域有多少知识？" | 搜索相关页面 → 统计概念/方法/决策/Claims 数 |
| `search` | "哪些页面提到了 Streaming？" | Grep 搜索 → 返回匹配行和上下文 |

`graph` 查询最有价值——它能回答"这个概念的知识生态是什么"：

```
[voice-live-agent]
  ├── `grounds` → [[cascaded-vs-e2e-voice]]（决策）
  │     └── `produces` → [[voice-cascaded-pipeline]]（方法）
  ├── `part-of` → [[speech-technology-stack]]
  └── `extends` → [[voice-activity-detection]]
```

一条查询就能看到：概念 → 围绕它的决策 → 决策产出的方法 → 依赖的技术栈，这在以前需要手动翻 5 个页面。

---

## 五、为什么不能仅仅使用 LLM Wiki

Karpathy 的 LLM Wiki 模型有一个精妙的比喻——"RAG = search, LLM Wiki = writing a book"。但实践下来，纯 LLM Wiki 模型有几个关键不足：

### 5.1 扁平结构不足以表达知识的多维度

LLM Wiki 原始设计是 `raw/ → wiki/`，wiki 页面是扁平的 Markdown 文件。但个人知识天然有层次：
- 知道"Context Engineering 是什么"（What）不等于知道"怎么在项目中落地"（How）
- 知道"怎么做"不等于知道"为什么这样做而不那样做"（Why）

仅用一种页面格式无法同时表达声明式知识（Claim）和程序式知识（Step），更无法记录决策的选项分析和前提假设。**三层模型（Concept + Method + Decision）不是过度设计，而是知识本身的结构需求。**

### 5.2 缺乏时间维度和反馈闭环

LLM Wiki 的设计偏向静态资料的编译——论文、技术文档、文章。这些资料一旦发表很少变化。但个人知识的主要输入是**日记**——今天的实验结果可能推翻上周的假设。

Claim-based Schema（每条论断有置信度和生命周期状态）和 Practice Log（实践反馈回流）是 LLM Wiki 原始模型没有的，但对个人知识管理不可或缺。

### 5.3 知识系统需要自我诊断能力

"编了一本书"之后，怎么知道这本书**哪里薄弱**？LLM Wiki 没有差距分析机制。`/knowledge-gap` 提供了这个能力：6 维度评分、4 级成熟度标识、缺失领域识别、学习建议生成。

知识管理不是"写了就好"，而是"写了 → 检查 → 发现差距 → 定向补充"。差距分析报告的持久化（`wiki/knowledge-gap/`）让进步可量化——每周跑一次，能看到知识库在哪些维度成长了、哪些维度停滞了。

### 5.4 OMC 的 `/wiki` 也不够

oh-my-claudecode 内置的 `/wiki` skill 实现了 LLM Wiki 的基础版——存储在 `.omc/wiki/`，支持 ingest/query/lint。但它的问题在上一篇文章中已经分析过：

- 与 Obsidian vault 知识系统重叠（知识分裂）
- 搜索只支持关键词 + tag（声明了 NO vector embeddings）
- 默认 git-ignored（知识不持久化到版本控制）

我的方案是：**不用 `.omc/wiki/`，直接在 Obsidian vault 的 `wiki/` 目录中建设知识库**。LLM（Claude Code + 自定义 Agent）作为维护者写入 `wiki/`，Obsidian 作为浏览器渲染和展示。两者各司其职，知识只有一份。

---

## 六、当前系统全景

```
输入层                    编译层                        知识库
┌──────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│ daily-work-  │    │ /extract-knowledge  │    │ wiki/concepts/   │
│ item/        │───→│ (概念+方法+决策提取) │───→│  40 概念页       │
│              │    ├─────────────────────┤    ├──────────────────┤
│ Notes/       │    │ /evolve-wiki        │    │ wiki/methods/    │
│ paper/       │───→│ (置信度+摘要+关联)  │───→│  8 方法页        │
│ Azure/       │    ├─────────────────────┤    ├──────────────────┤
└──────────────┘    │ /detect-conflict    │    │ wiki/decisions/  │
                    │ (冲突检测)          │    │  4 决策记录      │
                    ├─────────────────────┤    ├──────────────────┤
                    │ /knowledge-gap      │    │ ~160 Claims      │
                    │ (差距分析+成熟度)   │    │ 8 种关系类型     │
                    ├─────────────────────┤    └──────┬───────────┘
                    │ /wiki-query         │           │
                    │ (跨切面查询)        │←──────────┘
                    └─────────────────────┘
                              ↑
                    ┌─────────┴──────────┐
                    │ 实践反馈闭环        │
                    │ 日记中的应用结果    │
                    │ → Practice Log     │
                    │ → 置信度调整       │
                    └────────────────────┘
```

### 关键指标

| 指标 | 数值 |
|------|------|
| 概念页 | 40 |
| 方法页 | 8（6 种类型） |
| 决策页 | 4 |
| Claims 总数 | ~160 |
| 关系类型 | 8 种 |
| 知识命令 | 6 个 |
| 自动化 Agent | 5 个（extractor / maintainer / conflict-detector / obsidian-agent / editor） |

### 三个判断标准的回答

在[[PKC系列01：从日记到知识库——Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践|从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]]的结尾，我列出了知识系统的三个判断标准：

1. **是否会自动总结？** ——是。`/extract-knowledge` 自动从日记提取概念和论断，`/evolve-wiki` 自动生成概念摘要。
2. **是否会自动连接知识？** ——是。提取时自动匹配已有概念/方法/决策，类型化关联提供 8 种语义关系。
3. **是否会自动发现问题？** ——是。`/detect-conflict` 检测矛盾论断，`/knowledge-gap` 分析覆盖差距和成熟度。

从"日记系统"到"知识编译器"的进化，核心不是工具的堆叠，而是知识结构的分层（What/How/Why）和反馈闭环的建立（提取 → 应用 → 反馈 → 迭代）。

---

## 七、下一步

- **Evaluation 实验**：对比 wiki 方式和纯 RAG 方式回答个人知识问题的质量和效率，量化 PKC 的价值
- **规模压力测试**：当概念超过 100 个、Claims 超过 500 条时，维护成本和检索效率如何变化
- **跨项目复用**：当前 wiki 绑定单一 Obsidian vault，探索跨 vault/跨项目的知识共享机制
- **社区化**：将 PKC 的 Agent 配置、模板、命令打包为可复用的 toolkit，让其他 Obsidian 用户也能搭建类似系统

---

## 参考资料

- [[PKC系列01：从日记到知识库——Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践|从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]] — 前篇：初始设计与问题分析
- [Karpathy LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — LLM Wiki 原始架构
- [oh-my-claudecode](https://github.com/nicobailey/oh-my-claudecode) — Multi-Agent Orchestration Layer
- [Decoding the Configuration of AI Coding Agents](https://arxiv.org/html/2511.09268v1) — CLAUDE.md 配置研究
