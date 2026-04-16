---
title: Meta-Harness 论文解读与实践思考——概念澄清、三种构建路径对比与工程落地
created: 2026-04-16
tags:
  - AI
  - agent
  - harness
  - meta-harness
  - paper-reading
  - engineering
---

# Meta-Harness 论文解读与实践思考

> 基于论文 [Meta-Harness: End-to-End Optimization of Model Harnesses](https://arxiv.org/abs/2603.28052) 的解读，结合 Coding Agent 生态现状，系统对比从零构建、使用现有 Coding Agent、以及 Coding Agent + 开源 Harness 三种路径下 Meta-Harness 理念的落地方式与工程权衡。

---

## 1. Harness vs Agent：一段必要的概念澄清

在讨论 Meta-Harness 之前，需要先厘清一个在 AI 工程社区中频繁被混用的概念对：**Harness** 与 **Agent**。

### 1.1 业界主流定义

LangChain 博客给出了被广泛采纳的等式：**Agent = Model + Harness**。更直白的说法是——"If you're not the model, you're the harness"。在这个定义下，Harness 泛指除模型权重之外的一切：系统提示词、工具注册、沙箱环境、编排逻辑、Hooks 中间件等。Martin Fowler 网站上 ThoughtWorks 的 Birgitta Böckeler 进一步阐述："The term harness has emerged as a shorthand to mean everything in an AI agent except the model itself"。

这个定义虽然直觉上易懂，但边界过于宽泛——把 Prompt Engineering、Tool Use、Orchestration、Infrastructure 全部塞进同一个概念，在工程实践中容易造成沟通歧义。

### 1.2 Meta-Harness 论文的精确定义

Meta-Harness 论文给出了一个更精确、更具操作性的定义：

> **Harness is the code that determines what to store, retrieve, and show to the model.**

这个定义将 Harness 聚焦于**信息管道**——决定存储什么（memory/state）、检索什么（retrieval/context selection）、展示什么（prompt construction）。它不是泛指"模型之外的一切"，而是特指**控制模型输入输出信息流的那层代码**。

这个区别至关重要，因为 Meta-Harness 优化的恰恰是这个信息管道——不改模型权重、不改工具实现，只优化"给模型看什么、怎么组织上下文"这层逻辑。

### 1.3 两层 Harness 的实践视角

在 Coding Agent 生态中，实际存在两层 Harness：

- **内置 Harness**（Platform Harness）：Agent 平台方提供的核心能力。例如 Claude Code 的上下文压缩（compaction）、Git 集成、子 Agent 生成、Hooks 系统等。这些是平台的"出厂配置"，用户通常无法直接修改
- **外层 Harness**（User Harness）：用户在平台之上构建的定制层。例如 CLAUDE.md/AGENTS.md 配置文件、自定义 Skills、GSD/Superpowers 等开源框架。这些构成了"Harness 套 Harness"的常见模式

HumanLayer 博客引用 Terminal Bench 2.0 数据验证了这一分层的实际影响：Opus 4.6 在 Claude Code 官方 Harness 中排名第 33，但在另一个非训练阶段见过的 Harness 中跃升到第 5（±4 位浮动）。**同一模型，换一层 Harness，性能排名可以跳跃 28 位**——这正是 Meta-Harness 论文要解决的问题。

### 1.4 Harness 工程的双重控制机制

Martin Fowler 文章将 Harness 的控制手段分为两类，这个框架对理解 Meta-Harness 的优化空间很有帮助：

| 类型 | 时机 | 性质 | 示例 |
|------|------|------|------|
| **Guides**（前馈控制） | Agent 行动前 | 预防错误 | AGENTS.md 规范、Skills 知识注入、项目初始化脚本 |
| **Sensors**（反馈控制） | Agent 行动后 | 检测并自校正 | pre-commit Hook 运行 lint、LLM-as-judge 代码审查、ArchUnit 结构测试 |

一个设计良好的 Harness 应兼具两类控制。Meta-Harness 的搜索过程本质上就是在自动探索 Guides 和 Sensors 的最优组合。

---

## 2. Meta-Harness 论文核心解读

### 2.1 问题定义：为什么需要自动化 Harness 优化？

论文指出一个关键现实：**手工设计 Harness 是当前 AI 系统的主要瓶颈**。无论是 Prompt 的措辞、上下文的组织方式、检索策略的选择，还是工具调用的编排——这些决策目前高度依赖工程师的直觉和反复试错。而 HumanLayer 博客的实践结论更为直接："it's not a model problem. It's a configuration problem."——模型能力已经够强，是 Harness 配置限制了实际表现。

既然 Harness 优化本质上是一个搜索问题（在代码空间中寻找最优配置），那么能否让 AI 自己来搜索？

### 2.2 架构：一个用 Harness 优化 Harness 的系统

Meta-Harness 的命名本身就揭示了其递归本质——**它是一个 Harness，用于优化其他 Harness**。

```
┌─────────────────────────────────────────────────────┐
│                  Meta-Harness（外循环）                │
│                                                       │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│   │ Proposer  │───▶│ Evaluator│───▶│Filesystem│       │
│   │(Claude    │    │(执行+打分) │    │ (完整历史) │       │
│   │ Code      │◀───┤          │◀───┤          │       │
│   │ Opus 4.6) │    └──────────┘    └──────────┘       │
│   └──────────┘                                        │
│        │                                              │
│        ▼ 生成/修改                                     │
│   ┌──────────┐                                        │
│   │ Candidate │  ← 被优化的目标 Harness 代码              │
│   │ Harness   │                                       │
│   └──────────┘                                        │
└─────────────────────────────────────────────────────┘
```

核心组件：

- **Proposer（提案者）**：使用 Claude Code（Opus 4.6）作为 coding agent，而非裸模型。选择 coding agent 而非裸 LLM 至关重要——因为历史经验数据量很快会超出上下文限制，proposer 必须能自主决定读取哪些文件、验证哪些编辑
- **Filesystem（文件系统）**：作为完整历史的存储介质。每个候选 Harness 的源代码、评估分数、执行 trace 全部保留在文件系统中。Proposer 通过 `grep`/`cat` 等工具按需检索，而非被迫消化压缩后的摘要
- **搜索循环**：Propose → Evaluate → Log → Repeat，约 20 轮迭代，每轮生成约 3 个候选，总计约 60 个 Harness 变体

### 2.3 关键创新：Full History Access

Meta-Harness 与之前所有方法（OPRO、TextGrad、AlphaEvolve、DSPy 等）的核心区别在于**信息访问方式**：

| 方法 | 历史访问方式 | 反馈类型 | 每轮信息量 |
|------|-----------|--------|---------|
| OPRO | 滑动窗口 | 仅分数 | 0.002 MTok |
| TextGrad | 上一个制品 | 文本反馈 | 0.015 MTok |
| AlphaEvolve | 滑动窗口 | 程序库 + 分数 | 0.022 MTok |
| **Meta-Harness** | **完整历史** | **原始 trace + 分数** | **10.0 MTok** |

每轮迭代中，Proposer 中位数读取 **82 个文件**，访问最高 **1000 万 tokens** 的诊断信息——是之前方法的 **400~5000 倍**。

论文的消融实验（Ablation Study）证明了这一点的关键性：

| 信息层级 | 文本分类中位准确率 |
|--------|---------------|
| 仅分数 | 34.6% |
| 分数 + LLM 摘要 | 34.9%（几乎无提升） |
| **完整接口（含原始 trace）** | **50.0%**（+15.4） |

**原始执行 trace 是不可替代的诊断信号**——LLM 生成的摘要无法恢复丢失的因果信息。这个发现对 Harness 工程实践有深远启示：当你调试 Agent 行为时，看原始日志永远比看摘要更有价值。

### 2.4 三个实验领域的结果

论文在三个差异显著的领域验证了 Meta-Harness 的通用性：

**① 在线文本分类（Online Text Classification）**

- 任务：流式到达的文本样本，Harness 决定如何构建少样本 Prompt
- 基线：ACE（最先进的上下文管理系统）——40.9% 准确率，50.8K context tokens
- Meta-Harness：**48.6% 准确率**（+7.7），仅 11.4K context tokens（**减少 4 倍**）
- 发现的策略：Label-Primed Query——构造含标签引导、每类一例覆盖、对比样本对的单次 Prompt

**② 检索增强数学推理（Retrieval-Augmented Math Reasoning）**

- 任务：200 道 IMO 级别数学题，需要检索相关示例辅助推理
- 在 5 个 held-out 模型（含 GPT-5.4-nano、Gemini-3.1-Flash-Lite）上平均提升 **+4.7 points**
- 发现的策略：Four-Route Router——按数学子领域（组合、几何、数论、代数）路由到不同的 BM25 检索策略，附带去重和自适应示例数量

**③ Agentic Coding（TerminalBench-2）**

这个领域与 Coding Agent 日常使用最为相关：

- 基准：89 个高难度终端自主任务
- Claude Opus 4.6：**76.4% pass rate**（排名 #2，超过手工设计的 Terminus-KIRA 74.7%）
- Claude Haiku 4.5：**37.6%**（排名 #1，超过所有 Haiku Agent）
- 发现的策略：Environment Bootstrap——在 Agent 循环前先收集环境快照（OS、已安装包、语言版本等），注入初始 Prompt，减少探索性轮次

### 2.5 Proposer 的搜索行为：像高级工程师一样思考

论文的定性分析揭示了 Proposer 在 TerminalBench-2 优化过程中展现的工程智慧：

1. **识别混淆变量**：发现 Prompt 修改掩盖了结构性修复的效果，主动分离变量
2. **假设检验式隔离**：通过控制实验确定因果关系，而非盲目堆叠修改
3. **转向安全策略**：在多次回退后，转向保守的增量添加而非激进的重写
4. **正交组合**：将独立的改进组合起来，同时避免触碰已验证有效的脆弱组件

这种行为模式与 Mitchell Hashimoto（HumanLayer 博客引用）的 Harness 迭代理念高度一致——"anytime you find an agent makes a mistake, you take the time to engineer a solution such that the agent never makes that mistake again"——只不过 Meta-Harness 把这个过程自动化了。

---

## 3. 三种构建路径对比：Meta-Harness 如何落地

理解了 Meta-Harness 的原理后，关键问题是：**在不同的工程起点下，如何应用 Meta-Harness 的理念？** 当前实践中存在三条典型路径，它们的 Harness 架构、优化空间和 Meta-Harness 适用方式截然不同。

### 3.1 总览：三种路径的架构分层

```
场景 A：从零构建                场景 B：基于 Coding Agent       场景 C：Agent + 开源 Harness
                                                            + Meta-Harness
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│               │           │               │           │ Meta-Harness  │
│               │           │               │           │   优化层       │
│               │           │               │           ├───────────────┤
│               │           │  外层 Harness  │           │ 开源 Harness  │
│  你从零构建的   │           │ (CLAUDE.md,   │           │ 框架层         │
│  完整 Harness  │           │  Hooks,Skills)│           │(GSD/Superpow- │
│  代码          │           ├───────────────┤           │ ers/OmO)      │
│               │           │  内置 Harness  │           ├───────────────┤
│               │           │ (compaction,  │           │ Coding Agent  │
│               │           │  git, subagent)│          │  平台层        │
├───────────────┤           ├───────────────┤           ├───────────────┤
│   裸模型 API   │           │  Coding Agent │           │   基础模型     │
│(GPT-4/Claude) │           │(Claude Code等)│           │(Opus/Haiku等) │
└───────────────┘           └───────────────┘           └───────────────┘
```

### 3.2 场景 A：从裸模型 API 出发——构建完整 Agent

#### 你在做什么

直接调用 GPT-4 API 或 Claude API，从零构建 Agent 的全部基础设施：循环控制（agent loop）、工具注册与调用、状态管理、记忆持久化、错误恢复、上下文管理。你写的每一行代码——无论是 Prompt 模板、工具描述、还是执行管道——**本质上都是 Harness 代码**。最终产物是一个完整的新 Agent。

#### 架构特征

- **Harness 层级**：只有一层——你自己构建的。没有平台内置的 compaction、hooks、subagent 可用
- **搜索空间**：几乎无限——从 Prompt 措辞到循环终止条件、从工具调用策略到记忆压缩算法，一切都是可调变量
- **典型技术栈**：Claude Agent SDK、LangChain/LangGraph、自研 Python/TypeScript 框架

#### Meta-Harness 如何适用

**全面适用，但挑战最大。** Meta-Harness 论文中的文本分类实验和数学推理实验，本质上就是场景 A——从裸模型出发，Harness 代码完全由 Meta-Harness 搜索生成。

论文的文本分类实验是最好的例证：
- 起点是一个裸 GPT-OSS-120B 模型 + 空白的 Harness 模板
- Meta-Harness 自动发现了 **Label-Primed Query** 策略：构造含标签引导、每类一例覆盖、对比样本对的单次 Prompt
- 结果：48.6% 准确率（超越最先进的 ACE 系统 +7.7），且上下文 token 减少 4 倍

**关键洞察**：场景 A 的搜索空间虽大，但 Meta-Harness 的 Proposer（coding agent）能通过文件系统有选择地读取历史 trace，逐步缩小有效搜索范围。论文显示 Proposer 在搜索过程中表现出明确的假设检验行为——先识别混淆变量，再隔离因果关系。

#### 工程权衡

| 优势 | 风险 |
|------|------|
| 自由度最高，可针对特定领域深度定制 | 工作量巨大：循环控制、工具接口、状态管理、错误恢复全需自建 |
| 模型选择不受限，可自由切换或混合 | 缺乏平台级优化（如 Claude Code 的 compaction 经过大量工程投入） |
| Meta-Harness 可优化整个代码库 | 没有社区验证的"起跑线"，初始 Harness 质量可能很低 |

#### 典型场景

- 构建面向特定领域的 AI 产品后端（如语音助手、智能客服）
- 需要深度控制 Agent 行为的研究项目
- 团队有充足的 AI 工程能力和开发周期

#### 实践案例

OpenAI 工程博客分享了一个极端案例：团队用 Codex 构建了一个内部产品，**0 行人工编写代码**，全部由 Agent 完成。五个月内产出约一百万行代码，合并约 **1,500 个 Pull Request**，平均每位工程师每天 3.5 个 PR。人类的角色不是写代码，而是设计环境、指定意图、构建反馈循环——即**纯粹的 Harness 工程**。该团队的核心理念是 "**Humans steer. Agents execute.**"

---

### 3.3 场景 B：基于现有 Coding Agent——定制外层 Harness

#### 你在做什么

围绕一个已有的 Coding Agent 平台（Claude Code、Codex CLI、OpenCode 等）做定制。平台已经提供了内置 Harness（循环控制、工具系统、上下文管理、Git 集成等），你要做的是在其基础上构建**外层 Harness**——通过 CLAUDE.md/AGENTS.md 注入项目规范、通过 Hooks 添加质量闸口、通过自定义 Skills 封装领域知识。

HumanLayer 博客明确指出：**"coding agent = AI model(s) + harness"**——这里的 harness 就是"coding agent 的配置表面"（configuration surface）。你围绕 Coding Agent 平台做的一切定制，本质上都是 Harness 工程。

#### 架构特征

- **Harness 层级**：两层——平台内置 Harness + 你定制的外层 Harness。"Harness 套 Harness"是常态
- **搜索空间**：有限且结构化——配置表面（CLAUDE.md、Hooks、Skills、MCP Servers）是明确的调优变量
- **典型技术栈**：Claude Code + CLAUDE.md + 自定义 Hooks/Skills

#### 当前生态中的 Harness 配置表面

HumanLayer 博客列出了 Coding Agent 最有影响力的配置表面，这些正是 Meta-Harness 可以优化的目标：

| 配置表面 | 控制类型 | 作用 | 优化潜力 |
|--------|--------|------|--------|
| **CLAUDE.md / AGENTS.md** | Guide（前馈） | 项目规范、编码约束、工作流指引 | 高——Prompt 措辞和结构直接影响 Agent 行为 |
| **Skills** | Guide（前馈） | 渐进式知识披露、专项能力封装 | 高——哪些 Skills 在什么时机激活是关键决策 |
| **MCP Servers** | 工具扩展 | 外部 API、数据库、浏览器自动化 | 中——工具选择和描述影响模型的工具调用决策 |
| **Sub-agents** | 编排 | 研究 Agent、测试 Agent、审查 Agent | 高——子 Agent 的 Prompt 和路由策略空间大 |
| **Hooks** | Sensor（反馈） | pre-commit lint、LLM-as-judge 审查 | 中——确定性逻辑的组合和阈值可调 |

#### Meta-Harness 如何适用

**部分适用，聚焦于外层配置优化。** 由于内置 Harness 不可修改（Claude Code 的 compaction 算法、工具调用机制等是闭源的），Meta-Harness 的搜索范围限定在外层配置表面。

但这并不意味着优化空间小。HumanLayer 博客引用 Terminal Bench 2.0 数据表明：Opus 4.6 在 Claude Code 官方 Harness 中排名 #33，但在另一个 Harness 中跃升到 #5（±4 位）。**仅通过外层 Harness 调优，同一模型的排名就可以跳跃 28 位**。

此外，论文指出一个重要事实：前沿 Coding 模型（如 Claude in Claude Code、GPT-5 Codex in Codex）会**针对其自带 Harness 进行后训练**。例如 Codex 模型与 `apply_patch` 工具紧密耦合。这意味着模型在原生 Harness 中可能表现更好——但也可能过拟合。定制外层 Harness 有时能释放被原生 Harness 限制的潜力。

#### 工程权衡

| 优势 | 风险 |
|------|------|
| 低门槛：平台提供了成熟的内置 Harness | 受平台约束：无法修改内置 Harness 的核心逻辑 |
| 快速迭代：修改 CLAUDE.md 即刻生效 | 模型锁定：Claude Code 只能用 Claude 系列模型 |
| 平台持续进化：内置 Harness 随版本升级 | 外层定制可能与平台升级冲突 |

#### 典型场景

- 日常编码、代码审查、PR 工作流
- 知识库维护（如 Obsidian vault + wiki 管理）
- 小型到中型项目的快速开发

#### OpenAI 的 AGENTS.md 教训

OpenAI 在 Codex 实验中发现了外层 Harness 设计的关键约束：**不要把所有指令塞进一个巨大的 AGENTS.md**。他们总结了四个失败原因——上下文是稀缺资源、巨型指令挤占任务空间、单一文件迅速腐化、难以机械化验证。正确做法是将 AGENTS.md 视为**目录（table of contents）**——约 100 行，指向 `docs/` 目录中的深层知识源。

这恰好呼应了 Meta-Harness 的核心机制：**把信息组织为文件系统而非单一文档**，让 Proposer 能按需检索而非被迫消化全部内容。

---

### 3.4 场景 C：Coding Agent + 开源 Harness 框架 + Meta-Harness

#### 你在做什么

在成熟的 Coding Agent 平台之上，叠加经过社区验证的开源 Harness 框架（GSD、Superpowers、Oh-My-OpenAgent 等），形成多层 Harness 栈。在此基础上，应用 Meta-Harness 理念进行持续、系统化的优化。

这是三种路径中**层级最丰富**的架构：

```
┌───────────────────────────────────────────────────────────────┐
│                      Meta-Harness 优化层                       │
│            （自动搜索最优配置组合，benchmark 驱动）                │
├───────────────────────────────────────────────────────────────┤
│                   开源 Harness 框架层                           │
│    GSD（规范驱动流水线，29 Skills + 12 子 Agent）                 │
│    Superpowers（Skill 驱动开发，子 Agent 驱动开发）               │
│    Oh-My-OpenAgent（多模型协作，Hashline 编辑工具）               │
├───────────────────────────────────────────────────────────────┤
│                   Coding Agent 平台层                           │
│    Claude Code（内置 Harness：compaction, hooks,                │
│    subagent, git 集成）/ OpenCode（多模型 TUI）                  │
├───────────────────────────────────────────────────────────────┤
│                        基础模型层                               │
│           Claude Opus 4.6 / Haiku 4.5 / GPT 系列               │
└───────────────────────────────────────────────────────────────┘
```

#### 架构特征

- **Harness 层级**：三到四层——基础模型 → 平台内置 Harness → 开源框架 Harness → Meta-Harness 优化层
- **搜索空间**：结构化且有限——开源框架已经定义了配置维度（Skills 启停、Hooks 组合、子 Agent 路由、Prompt 分段策略），Meta-Harness 在这个结构化空间中搜索
- **典型技术栈**：Claude Code + GSD/Superpowers + 自定义评估基准

#### 开源 Harness 框架的定位

每个开源框架代表了不同的 Harness 设计哲学：

| 框架 | Stars | 核心 Harness 设计 | 适用场景 |
|------|-------|-----------------|--------|
| **GSD** | 51.3k | **规范驱动开发（Spec-Driven Development）**：讨论→规划→执行→验证四阶段流水线；29 个 Skills + 12 个子 Agent；核心差异在于**上下文隔离架构**——每个执行单元获得独立的全新上下文窗口（接近 200k tokens），从项目制品而非累积聊天历史构建，直接对抗"上下文腐烂（context rot）" | 大型项目交付：先做详细需求再编码的企业级场景 |
| **Superpowers** | 143k | **Skill 驱动开发**：Agent 看到任务后不直接写代码，而是先澄清需求、产出规格文档、制定实现计划（强调 TDD/YAGNI/DRY），再启动**子 Agent 驱动开发（subagent-driven-development）**逐项执行。Claude 常能自主工作数小时不偏离计划 | 严谨软件开发：需求明确、全程高测试覆盖的项目 |
| **OmO** | 49.7k | **多模型协作**：将 OpenCode 的单 Agent 聊天转化为 10 个专用子 Agent 的多 Agent 系统；引入 Hashline 编辑工具替代标准 search-and-replace，大文件 1000+ 行时错误率显著降低；多模型自动路由按子任务选择最优模型 | 多模型协作的高级用户工作流 |

#### Meta-Harness 如何适用

**这是 Meta-Harness 理念的最高杠杆场景。** 原因有三：

**① 站在巨人肩膀上**：Claude Code 提供了经过后训练优化的内置 Harness，GSD/Superpowers 提供了经过社区验证的外层 Harness。你不需要重造轮子，只需要在已有的优质基础上搜索最优配置组合。

**② 搜索空间更聚焦**：相比场景 A 面对的无限代码空间，场景 C 的优化变量是有限且结构化的——哪些 Skills 启用、Hooks 如何配置、Prompt 的哪些段落需要调整、子 Agent 的路由策略如何设置、四阶段流水线的哪些步骤需要强化。Meta-Harness 在这种结构化搜索空间中效率最高。

**③ 回报可量化**：开源框架通常自带评估机制（GSD 的验证阶段、Superpowers 的测试覆盖），配合外部 benchmark（TerminalBench-2、项目内测试套件），Meta-Harness 的 Propose→Evaluate→Log 循环可以持续运转，每轮迭代都有明确的分数反馈。

#### 工程权衡

| 优势 | 风险 |
|------|------|
| 最高杠杆：在验证过的基础上做增量优化 | 层级复杂：多层 Harness 之间可能产生干扰 |
| 可量化回报：benchmark 驱动的迭代循环 | 框架锁定：深度依赖特定开源框架的设计模式 |
| 社区智慧：框架凝聚了大量工程实践经验 | 中高投入：需要理解每层 Harness 的职责边界 |

#### 典型场景

- 大型项目交付（需求→规格→计划→执行→验证全流程）
- 团队级 Agent 工作流（多人协作、多 Agent 编排）
- 持续优化的工程环境（有 benchmark、有 trace、有版本化配置）

---

### 3.5 三种路径的横向对比

| 维度 | 场景 A：从零构建 | 场景 B：基于 Coding Agent | 场景 C：Agent + 开源 Harness + Meta-Harness |
|------|-------------|---------------------|----------------------------------------------|
| **起点** | 裸模型 API（GPT-4/Claude API） | Claude Code / OpenCode 开箱即用 | Claude Code + GSD/Superpowers/OmO |
| **你在做什么** | 构建完整 Agent（循环、工具、状态、记忆） | 外层 Harness 工程（CLAUDE.md、Hooks、Skills） | 在成熟 Harness 栈上叠加自动化优化层 |
| **Harness 层级** | 1 层（全部自建） | 2 层（内置 + 外层） | 3~4 层（内置 + 框架 + 外层 + 优化层） |
| **搜索空间** | 近乎无限（整个代码库） | 有限（配置表面） | 结构化且有限（框架定义的维度） |
| **Meta-Harness 适用** | 全面适用——优化整个 harness 代码 | 部分适用——优化外层配置 | 最高杠杆——自动搜索配置组合最优解 |
| **投入/回报** | 高投入、高风险、高自由度 | 低投入、低风险、受平台约束 | 中高投入、可量化回报（benchmark 驱动） |
| **模型灵活性** | 任意模型、任意组合 | 受平台限制（Claude Code → Claude 系列） | 取决于框架（OmO 支持 75+ 模型） |
| **适合谁** | AI 产品团队、研究人员 | 个人开发者、小型项目 | 工程团队、大型项目交付 |

#### 路径选择的判断准则

借用论文 Section 2 团队判定 Checklist 的思路，以下问题帮助选择路径：

1. **你是否需要控制 Agent 的核心循环逻辑？** → Yes：场景 A；No：场景 B 或 C
2. **你的任务是否需要跨多轮对话或持续运行？** → Yes：场景 B 或 C（平台已解决 Session 管理）；如有特殊 Session 需求：场景 A
3. **你是否需要规范驱动的多阶段工作流？** → Yes：场景 C（GSD/Superpowers 提供现成流水线）；No：场景 B 已足够
4. **你是否有可复现的评估基准？** → Yes：场景 C 可充分发挥 Meta-Harness 搜索优势；No：先从场景 B 积累经验
5. **你是否使用现成的 Agent SDK/框架？** → Yes（如 Claude Agent SDK）：你做的定制属于外层 Harness，选场景 B 或 C；No（裸 API）：场景 A

---

### 3.6 Meta-Harness 理念的三级落地路径

无论选择哪种场景，Meta-Harness 的核心理念都可以分层级渐进落地：

#### 第一级：手动 Steering Loop（当前可用，所有场景）

借鉴 Martin Fowler 文章提出的 **Steering Loop（驾驶闭环）**：

1. **观察**：Agent 在任务中失败或产出质量不佳
2. **诊断**：查看**原始执行 trace**（不是摘要！论文消融实验证明：LLM 摘要 34.9% vs 原始 trace 50.0%）
3. **修复**：改进 Harness 配置——添加 Guide（前馈约束）或 Sensor（反馈检测）
4. **验证**：在相同或类似任务上重新评估
5. **记录**：将修复策略沉淀为持久配置

这就是 Mitchell Hashimoto 总结的——"anytime you find an agent makes a mistake, you take the time to engineer a solution such that the agent never makes that mistake again"。

#### 第二级：半自动化 Harness 搜索（短期可实现，场景 B/C）

在日常工作流中引入 Meta-Harness 的 Filesystem 设计理念：

- **记录每次 Agent Session 的输入、输出和关键决策点**（已有基础——Claude Code 的 Session 日志、GSD 的制品文件、Superpowers 的进度跟踪）
- **建立可重复的评估基准**：将典型任务抽象为 benchmark（如"从 issue 到 PR 的完整流程"、"代码审查的准确率"）
- **周期性回顾**：用 coding agent 分析历史 Session，识别重复出现的失败模式，提出 Harness 改进建议

#### 第三级：全自动 Meta-Harness 循环（中期目标，场景 A/C）

参照论文架构，构建领域特定的 Meta-Harness：

- **Proposer**：使用 Claude Code 作为 coding agent，读取历史 Harness 配置和评估结果
- **Evaluator**：项目测试套件 + TerminalBench-2 子集 + 自定义质量指标
- **Filesystem**：git 仓库管理所有候选 Harness 版本、评估分数、执行 trace
- **搜索目标**：因场景而异——场景 A 优化整个代码库；场景 C 优化 CLAUDE.md、Skills 组合、Hooks 配置、子 Agent Prompt

论文表明典型的搜索过程为 **20 轮迭代、约 60 个候选、几小时墙钟时间**——这在实际工程中完全可行。

---

### 3.7 Anthropic 的双层 Agent 设计：一个跨场景的 Harness 工程范例

论文的 TerminalBench-2 实验与 Anthropic 自身的工程实践形成了有趣的呼应——无论你处于哪种场景，这个案例都值得参考。

Anthropic 在面对"长运行 Agent"问题时，设计了 **Initializer Agent + Coding Agent** 的双层结构——这本身就是一次手工 Harness 优化：

- **Initializer Agent**：首次运行时建立环境脚手架——生成 init.sh 脚本、claude-progress.txt 进度文件、超过 200 个特征需求清单（每个初始标记为"failing"）、初始 git commit
- **Coding Agent**：被约束为每次只处理一个功能（incremental progress），完成后提交到 git 并更新进度文件

而 Meta-Harness 在 TerminalBench-2 上自动发现的策略（Environment Bootstrap）与此异曲同工——在 Agent 循环前先收集环境快照，注入初始 Prompt。区别在于：人类工程师的方案需要数十个 Agent Session 的经验积累，Meta-Harness 的搜索在几小时内自动抵达了类似的设计。

这个案例横跨三种场景：
- **场景 A 视角**：Anthropic 从零构建了 Initializer Agent 的完整逻辑
- **场景 B 视角**：他们在 Claude Code 平台上配置了进度跟踪的外层 Harness
- **场景 C 视角**：Meta-Harness 自动发现了等价策略，证明系统化搜索可以替代手工经验积累

---

## 4. 给 AI 工程师的实践建议

### 4.1 改变心智模型：从"选模型"到"选 Harness"

论文最重要的启示是：**Harness 的选择和优化，对最终表现的影响可能超过模型本身**。

- 同一模型 Opus 4.6，在不同 Harness 中 TerminalBench-2 排名从 #33 到 #5——差距 28 位
- Meta-Harness 用 Haiku 4.5（一个弱得多的模型）达到了同类模型中的第一名——完全靠 Harness 优化

工程上的推论是：**别只等下一代模型，先把当前模型的 Harness 调到最优**。这不仅更可控，而且投入产出比更高。

### 4.2 保留原始 Trace，不要只看摘要

论文的消融实验给出了最强硬的证据：LLM 生成的摘要相比原始 trace，几乎没有任何优化价值（34.9% vs 50.0%）。

在日常实践中：
- **保留 Agent Session 的完整日志**，而非仅记录结果
- **调试时读原始输出**，不要只看 Agent 自己的总结
- **版本化你的 Harness 配置**——用 git 管理 CLAUDE.md、Skills、Hooks 的每次修改，配合评估结果，形成可追溯的优化历史

### 4.3 将 Harness 迭代融入团队文化

Anthropic 和 OpenAI 的实践经验一致表明：**"Agent 出了错 = Harness 待改进"** 应成为团队共识。

具体行动：
- 每次 Agent 失败后，先问"**这是模型能力问题，还是 Harness 设计问题？**"——经验表明绝大多数是后者
- 将失败修复编码为 Harness 配置（添加一条测试、一个约束提示、调整工具使用顺序），而非只给 Agent 更多 retry
- 每次修复都是 Harness 的一次"训练样本"——积累足够多后，就具备了运行 Meta-Harness 搜索的条件

### 4.4 选择工具看"匹配"，而非追求万能

不同的 Harness 框架有不同的设计哲学，应根据实际场景选择：

- **需要规范驱动的大型项目交付**（需求→规格→计划→执行→验证全流程）→ GSD 的 29 条命令 + 12 个子 Agent 提供了完整的规范驱动流水线
- **需要严谨的软件开发工作流**（TDD、需求审阅、子 Agent 驱动开发）→ Superpowers 的 Skill 体系和子 Agent 协作模式
- **需要多模型协作和高级编辑**→ OpenCode + Oh-My-OpenAgent 的多模型路由 + Hashline 编辑工具
- **需要开箱即用的深度 Git 集成和质量闸口**→ Claude Code 原生 Hooks 系统

混合使用完全可行——正如 ComputingForGeeks 指出："use Cursor for writing code, OpenCode for infrastructure automation and multi-model tasks, and Claude Code for code review and PR workflows. Each tool owns a stage of the development lifecycle"。

### 4.5 Meta-Harness 的"苦涩教训"

论文最后引用了 Rich Sutton 的 **Bitter Lesson**（苦涩教训）：

> "once a search space becomes accessible, stronger general-purpose agents can outperform hand-engineered solutions."

这意味着：当 Harness 的搜索空间变得可访问（通过文件系统暴露历史、通过 benchmark 提供反馈），通用的搜索方法就能超越人类精心设计的方案。对 AI 工程师而言，**最有价值的长期投资不是手工打磨某个特定的 Harness 配置，而是构建让 Harness 可以被自动搜索和优化的基础设施**——可复现的评估基准、版本化的配置历史、结构化的执行 trace 存储。

---

## 参考文献

1. Meta-Harness: End-to-End Optimization of Model Harnesses. [arxiv.org/abs/2603.28052](https://arxiv.org/abs/2603.28052)
2. HumanLayer Blog — Terminal Bench 2.0 数据、Harness 配置表面分析
3. LangChain Blog — Agent = Model + Harness 定义、Harness 原语推导
4. Martin Fowler 网站（Birgitta Böckeler）— Harness 分类框架、Guides vs Sensors、Steering Loop
5. Anthropic Engineering — Initializer Agent + Coding Agent 双层结构
6. OpenAI Engineering Blog — Codex 内部产品 0 行人工代码实践
7. Mitchell Hashimoto — Harness 迭代意识、My AI Adoption Journey
8. 各平台官方文档 — Claude Code、OpenCode、Cursor、GitHub Copilot CLI
9. GSD (get-shit-done) — 规范驱动四阶段流水线、29 Skills + 12 子 Agent
10. Superpowers (obra) — Spec-Driven Development、子 Agent 驱动开发
