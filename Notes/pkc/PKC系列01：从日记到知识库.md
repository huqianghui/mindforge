---
title: PKC 系列 01：从日记到知识库
created: 2026-04-13
tags: [obsidian, oh-my-claudecode, llm-wiki, knowledge-management, personal-knowledge-compiler, multi-agent, rag, claude-code]
---

# PKC 系列 01：从日记到知识库

> **PKC 系列文章**
> 1. **本文：从日记到知识库**（痛点分析与初步方案）
> 2. [PKC 系列 02：个人知识编译器进化](PKC系列02：个人知识编译器进化.md)（系统演进与实践）

每天写日记、记笔记、读论文，Obsidian vault 里的 `.md` 文件越堆越多。但当你想找"上个月关于 RAG 延迟优化的那个发现"时，要么靠记忆翻日记，要么全局搜索碰运气。知识在增长，但**知识的可用性**却在衰减。

本文记录了我在 Obsidian vault 中探索"从日常日记到个人知识库"这条路径的实践与思考——遇到了什么问题，尝试了什么工具，以及目前为止的整合方案。

## 一、只用 Obsidian 写日记的瓶颈

### 1.1 结构化日记已经做得不错

我的 Obsidian 日记采用严格的四段式结构：

```markdown
## 任务打卡      — 固定习惯（不变）
## 追踪任务      — 跨天延续的多日任务
## 今天主任务    — 当天工作项
## 其他事项：    — 自由记录
```

配合 Obsidian Tasks 插件的语法（`- [ ]` / `- [x]` / `- [/]`、优先级标记、依赖关系），日记本身已经是一个"结构化数据 schema"，而非普通笔记。

### 1.2 但问题也很明显

**线性增长，缺乏网络效应。** 日记是按时间线写的，知识是按主题聚合的——两者天然错位。日记里散落着关于 RAG、Claude Code、Azure 部署的各种发现，但它们永远被锁在各自日期的 `.md` 文件里。

**知识"写了就沉"。** Obsidian 的 `[[wikilinks]]` 和 Graph View 理论上能构建知识网络，但实际操作中：
- 写日记时很少有精力去添加跨笔记链接
- 手动总结和归纳太耗时，大多数笔记写完就不会再碰
- 没有自动化机制把日记中的"发现"沉淀为可复用的"知识"

**搜索能力有限。** 虽然安装了 qmd（BM25 + 向量 + LLM reranking），全局搜索能力不错，但搜索本质上还是"找到了原文"——缺乏"综合多个来源给出结论"的能力。

### 1.3 本质问题

一句话概括：

> 你现在是一个 **AI-enhanced journaling system**，不是 **knowledge system**。
> 
> 知识流是：写日记 → 写笔记 → 手动总结 → 散落。

缺少的是：自动抽象、自动关联、自动演化。

## 二、LLM Wiki：很好的理念，但不能直接照搬

### 2.1 Karpathy 的 LLM Wiki 是什么

2026 年 4 月，Karpathy 发布了 [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 的概念设计。核心思想：

- **raw/**（原始资料）→ **wiki/**（LLM 整理后的知识）→ **schema**（规则 = CLAUDE.md）
- LLM 不是回答者，而是**知识维护者**——像编辑维护维基百科一样
- 输入新资料时，LLM 不只是存储，而是**更新整个知识网络**（可能一次改动 10+ 页面）

| | RAG（传统） | LLM Wiki |
|---|---|---|
| 策略 | 查询时临时拼 context | 预先整理成结构化知识 |
| 存储 | chunk + embedding | markdown + wikilink |
| 记忆 | 无 | 持续演化 |
| 生命周期 | 用完即丢 | 变成资产 |

一句话总结：**RAG = 搜索，LLM Wiki = 编书。**

### 2.2 oh-my-claudecode 中的 Wiki Skill

oh-my-claudecode（OMC）内置了一个 `/wiki` skill，实现了 LLM Wiki 的基础版本：
- 存储在 `.omc/wiki/*.md`（markdown + YAML frontmatter）
- 支持 ingest、query、lint、quick add 等操作
- 按 category 组织（architecture、decision、pattern、debugging 等）
- 用 `[[page-name]]` 语法做交叉引用

### 2.3 为什么不能直接用

**与 Obsidian vault 的知识体系重叠。** `.omc/wiki/` 是 OMC 内部的知识库，默认 git-ignored。而 Obsidian vault 本身（`Notes/`、`daily-work-item/`）才是我真正的知识主体。如果两套系统并行，会出现"知识分裂"——同一个概念在 `.omc/wiki/` 里有一份，在 `Notes/AI/` 里又有一份。

**搜索方式太简单。** OMC Wiki 只支持关键词 + tag 匹配（明确声明 NO vector embeddings），对于需要语义理解的查询（"Azure 上怎么做企业级知识库？"）力不从心。

**缺乏时间维度。** LLM Wiki 的设计偏向研究资料的编译（论文、文章、技术文档），对"日记"这种按时间流动的输入没有特殊处理。而日记恰恰是我最主要的信息源——今天的实验结果可能推翻上周的假设。

**知识验证困难。** 这是 GraphRAG 领域的老问题：LLM 抽取的 entity、relation、community 怎么保证正确、完整、够好？答案很残酷——**不存在"自动保证正确"的方法**，只能做到"可追溯 + 可冲突 + 可演化"。

## 三、oh-my-claudecode 在知识管理中的角色与挑战

### 3.1 OMC 带来了什么

OMC 的核心价值不是多几个 skill，而是三件事：

1. **长期记忆**（CLAUDE.md + project-memory + notepad）
2. **Agent 分工**（19 个专业 Agent：planner、writer、critic、analyst、executor 等）
3. **稳定 workflow**（autopilot、ralph、ultrawork 等编排模式）

从"skill 拼装"升级到"系统化 orchestration"——这正是从日记到知识库需要的能力。

### 3.2 但 OMC 的设计目标是代码开发

OMC 是为 **task execution**（任务执行）设计的，不是为 **knowledge evolution**（知识演化）设计的：

| | OMC 原始设计 | 知识管理需求 |
|---|---|---|
| 目标 | 完成任务 | 持续改写世界模型 |
| 模式 | input → plan → execute → done | input → extract → link → evolve → rewrite |
| 时间跨度 | 短期（一次会话） | 长期（跨月、跨年） |
| 核心循环 | verify → fix（Ralph 循环） | extract → conflict → evolve |

### 3.3 实际使用中的摩擦点

**Agent 分工不匹配。** OMC 的 agent 角色（executor、code-reviewer、test-engineer）面向代码开发。知识管理需要的是：extractor（提取概念）、linker（建立关联）、maintainer（维护知识网络）。

**Workflow 过重。** 对于"润色一篇笔记"这样的简单任务，启动完整的 Plan → Execute → Verify → Fix pipeline 是 overkill。实测表明，单文件操作的多 Agent 提速仅 1.5x（协调 overhead 抵消了并行收益），只有 10+ 文件的批量操作才能达到 3-5x。

**两套知识系统并存。** OMC 内部有 `.omc/wiki/`、`.omc/project-memory.json`、`.omc/notepad.md`，Obsidian vault 又有自己的笔记体系。如果不统一，知识会在两个系统间漂移。

## 四、整合方案：Journal-first Personal Knowledge Compiler

经过实践摸索，我认为正确的路径不是"照搬 LLM Wiki"或"完全依赖 OMC"，而是做一个**融合版本**——以日记为起点、以 Obsidian vault 为知识主体、借用 OMC 的编排能力。

### 4.1 架构定位

一个精准定位：

> 不是 AI-enhanced journaling system，
> 而是 **Personal Knowledge Compiler**（带时间维度的个人知识编译器）。

核心数据流：

```
Daily Journal（原始流）
       ↓  extract
Processed Notes（结构化笔记）
       ↓  compile + link
Knowledge Wiki（抽象知识层）  ← 这是缺失的一层
       ↓  query
Grounded Answers（有据可查的回答）
```

### 4.2 四个关键设计决策

**决策 1：知识统一存储在 Obsidian vault，不用 `.omc/wiki/`**

所有经验沉淀写入 Obsidian 笔记（`Notes/` 目录），而不是 OMC 内部的 wiki。原因：
- 保持知识的单一信源
- Obsidian 的 Graph View、Backlinks、Dataview 插件可以可视化知识网络
- 笔记可以 git 追踪，有完整版本历史

**决策 2：obsidian-agent 是唯一的文件 I/O 通道**

所有 OMC Agent 只在内存中处理内容（分析、生成、审校），最终由 obsidian-agent 负责落盘。理由：
- obsidian-agent 内建了 vault 的全部规范（日记结构、任务语法、链接格式、图片路径）
- 防止多 Agent 并发写同一文件导致冲突
- 格式合规有单一守门人

**决策 3：知识不存"事实"，只存"Claim"**

每个从日记中提取的知识单元，不是断言"X 是对的"，而是记录"在某个时间点，基于某个来源，有这样一个观点"：

```markdown
## Claim
- Retrieval latency dominates in most RAG systems

## Evidence
- [[2026-04-10-周四]]（实验日志）
- [Azure AI Search Benchmark](https://...)

## Confidence: 0.6
## Status: active | conflicting | outdated
```

这样做的好处：
- 可追溯（每个 claim 必须有 source）
- 可冲突（同一主题下允许互相矛盾的 claim 共存）
- 可演化（新实验可以推翻旧结论，标记 outdated 而非删除）

**决策 4：简单任务不启动多 Agent**

单篇笔记润色 → Editor 单 Agent 直接完成。
跨目录复盘、周总结、知识卡片生成 → 才启动 Pipeline（Planner → Writer → Editor → obsidian-agent）。

### 4.3 三个核心 Workflow

#### Flow 1：日记 → 知识提取（`/extract-knowledge`）

```
[Analyst] 读取指定日期范围的日记
    ↓
[Analyst] 提取 concepts、patterns、insights
    ↓
[Writer] 为每个知识点生成 Concept Page（带 Claim + Evidence + Status）
    ↓
[Editor] 检查格式、补充 [[wikilinks]]
    ↓
[obsidian-agent] 写入 Notes/ 对应目录，更新 README
```

#### Flow 2：知识编译（`/evolve-wiki`）

```
[Analyst] 扫描新增笔记，找到与已有知识重叠的主题
    ↓
[Analyst] 合并重复概念、检测冲突（语义相反 / 范围不同 / 时间反转）
    ↓
[Writer] 更新已有知识页面：添加新 claim、标记冲突、更新 confidence
    ↓
[obsidian-agent] 执行更新
```

这一步对应 Karpathy 的"知识编译"——不是简单存储，而是**整合进已有知识网络**。

#### Flow 3：周复盘（`/weekly-review`）

```
[Summarizer] 读取本周所有日记
    ↓
[Analyst] 分类：成果、延续待办、挑战、经验教训、高频主题
    ↓
[Writer] 起草周总结
    ↓
[Insight Extractor] 识别可复用的 pattern 和 lesson
    ↓
[Editor] 审校
    ↓
[obsidian-agent] 创建周总结文件，知识沉淀写入 Notes/
```

### 4.4 知识的自动演化规则

借鉴 LLM Wiki 的编译思想，但加入时间维度（这是纯 LLM Wiki 没有的优势）：

| 规则 | 触发条件 | 动作 |
|------|---------|------|
| 信心提升 | 同一 claim 在 3 次不同日记中被佐证 | confidence +0.1 |
| 冲突检测 | 新 claim 与已有 claim 语义相反 | 标记 status: conflicting |
| 过时标记 | 新实验推翻旧结论 | 旧 claim 标记 status: outdated |
| 自动摘要 | 某 concept 下 claim 数量 > N | 触发 summary 生成 |
| 陈旧告警 | 知识页面超过 60 天未更新 | 标记 status: stale |

核心原则：**不要消灭冲突，要记录冲突。** 知识系统的目标不是"正确"，而是"不断逼近真实"。

## 五、现状与下一步

### 已完成

- Obsidian vault 结构化日记体系（四段式 + Tasks 插件）
- obsidian-agent 自定义 Agent（vault I/O 守门人）
- oh-my-claudecode 安装（多 Agent 编排层）
- qmd 本地搜索引擎（BM25 + 向量）
- Azure 企业级方案设计（AI Search + CosmosDB Gremlin）

### 待探索

- `/extract-knowledge` command 的实现与调优
- `/evolve-wiki` 知识编译流程的落地
- Claim + Evidence + Confidence 的 schema 实际效果验证
- 冲突检测的准确性评估
- OMC Agent 角色在知识场景下的最优配置

### 一个判断标准

一个知识系统是否高级，看三点：
1. 是否会**自动总结**？——目前部分实现
2. 是否会**自动连接知识**？——很弱，主要靠手动
3. 是否会**自动发现问题**（冲突、过时）？——几乎没有

**把 2 和 3 补上**，就是从"日记系统"进化为"知识编译器"的关键一步。

## 六、参考资料

- [Karpathy LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 原始架构设计
- [oh-my-claudecode](https://github.com/nicobailey/oh-my-claudecode) — Multi-Agent Orchestration Layer
- [Decoding the Configuration of AI Coding Agents](https://arxiv.org/html/2511.09268v1) — CLAUDE.md 配置研究
