---
title: "Harness Engineering"
created: "2026-04-13"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - ai-engineering
  - harness
  - agent
aliases:
  - "驾驭工程"
  - "Harness Engineering"
related:
  - "[[agent-harness]]"
  - "[[bitter-lesson]]"
  - "[[cybernetics-harness-design-sheet]]"
  - "[[harness-quality-gate]]"
  - "[[one-person-team]]"
  - "[[online-learning]]"
  - "[[reinforcement-learning]]"
  - "[[rtk-token-compression]]"
  - "[[skill-runtime]]"
  - "[[ai-skill-formation]]"
  - "[[regulation-first-design]]"
  - "[[agent-infra-three-layers]]"
---

# Harness Engineering

## 摘要

Harness 本身是什么、归谁、和 framework / runtime 的边界，见 [[agent-harness]]；本页讲把它做好的工程方法。

Harness Engineering（驾驭工程）是 Prompt Engineering 和 Context Engineering 的超集，三者构成同心圆包含关系。核心主张是：Agent 的"智能"来自 model，但"可靠性"来自 harness——外部系统代码（Tools + Knowledge + Observation + Action Interfaces + Permissions）。这一范式在 2026 年初由 OpenAI、Anthropic、Google DeepMind 独立演化趋同，标志着行业共识。

## Claims

### Claim: Harness Engineering 是 Prompt Engineering 和 Context Engineering 的超集

- **来源**：[[Vibe-Coding系列01：Harness-Engineering的来龙去脉|Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> 三者是同心圆包含关系：Prompt（单次措辞）< Context（上下文构建）< Harness（仓库级系统工程）。

### Claim: 三家公司独立演化出同一套 Harness 设计范式

- **来源**：[[Vibe-Coding系列01：Harness-Engineering的来龙去脉|Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> OpenAI、Anthropic、Google DeepMind 在 2026 年初独立演化出同一套 Harness 设计范式，这不是巧合而是行业共识。

### Claim: Agent 的两种典型失败模式是系统设计问题而非模型能力问题

- **来源**：[[Vibe-Coding系列01：Harness-Engineering的来龙去脉|Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> 上下文耗尽（Context Exhaustion）和提前收工（Premature Completion）不是"让模型更努力"能解决的，而是系统设计问题。

### Claim: 级联失败是 Harness Engineering 出现的核心驱动力

- **来源**：[[Vibe-Coding系列01：Harness-Engineering的来龙去脉|Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> 单步 95% 成功率在 10 步串联后只剩 60%（0.95^10 ≈ 0.60），级联失败驱动了 Harness Engineering 的出现。

### Claim: OpenAI 的 Harness Engineering 五大支柱

- **来源**：[[Vibe-Coding系列02：架构师视角的Harness实践|Vibe Coding系列02]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-22
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-22 确认——依据：[Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering)：原文章节含 repository knowledge as system of record、layered domain architecture、agent legibility、golden principles、entropy and garbage collection

> 仓库即系统记录、分层领域架构、Agent 可读性、黄金准则、垃圾回收。

### Claim: Agent 的智能来自 model，可靠性来自 harness

- **来源**：[[Claude-Code系列02：learn-claude-code|learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> 30 行代码能跑 demo，但从 30 行到生产中间是 12 层 harness 的距离。Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions。

### Claim: "Agent = Model, Not Framework" 是一个工程立场

- **来源**：[[Claude-Code系列02：learn-claude-code|learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> model 是做决策的主体，外部代码只是缰绳。

### Claim: Meta-Harness 论文给出了更精确的 Harness 定义——聚焦信息管道

- **来源**：[[2026-04-16-Meta-Harness]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> 业界主流（LangChain）定义 Harness 为"模型之外的一切"，Meta-Harness 论文精确聚焦为"the code that determines what to store, retrieve, and show to the model"——控制模型输入输出信息流的那层代码。同时揭示实际存在两层 Harness：Platform Harness（平台内置）和 User Harness（用户定制），同一模型换 Harness 可使性能排名跳跃 28 位。

### Claim: Harness 优化可被自动化为搜索问题

- **来源**：[[2026-04-16-Meta-Harness]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> Meta-Harness 将手工 Harness 迭代自动化为 Propose → Evaluate → Log → Repeat 搜索循环。消融实验证明完整执行 trace 访问（50.0%）远优于仅分数（34.6%），原始 trace 是不可替代的诊断信号。

### Claim: 控制论是 Harness Engineering 的理论根基——三层控制模型

- **来源**：[[控制论与科学方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> 所有 Harness 代码可归入三个控制系统：执行系统（L5 Runtime + L4 Execution，"怎么做出来"）、约束系统（L2 Planning + L1 Policy，"不能乱来"）、认知系统（L6 Eval，"从经验学到什么"）。收敛性 = 约束强度 × 反馈频率 / 执行自由度。

### Claim: Claude Code 的 98.4% 代码是运行基础设施，决策逻辑只占约 1.6%

- **来源**：[[Claude-Code系列07：Harness分层架构]]
- **首次出现**：2026-04-17
- **最近更新**：2026-11-24
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-24 修订——依据：[arXiv 2604.14228v2](https://arxiv.org/html/2604.14228v2)（11-22 loop-revalidate 取证，用户裁决写回）；数字属社区估算，不是官方公布，置信度 0.9 → 0.8

> 按社区对源码的估算，Claude Code 约 51.2 万行 TypeScript、1884 个文件，其中决策逻辑约占 1.6%，其余 98.4% 是运行基础设施（工具执行、权限、上下文管理、会话、UI 等）。原记录的"98.7%、直接调用模型的代码约 6400 行"已按这一估算更正。含义不变：agent 的可靠性主要来自 harness 而不是那一小段调用模型的代码；社区框架的价值不在重复执行能力，而在补足约束系统和认知系统的空白。

### Claim: 多模型 harness 必须自建三层评测体系——离线 benchmark → PR 门禁 → 生产 A/B

- **来源**：[[Agent=Model+Harness]]
- **首次出现**：2026-07-14
- **最近更新**：2026-11-07
- **置信度**：0.9
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：VS Code 官方博客 https://code.visualstudio.com/blogs/2026/05/15/agent-harnesses-github-copilot-vscode：VSC-Bench 为离线评测套件，度量 solution correctness / agent effort / token efficiency / latency；但"数据集私有""PR 门禁""生产 A/B"未在摘录中核到

> VS Code 为支撑 per-model 适配矩阵被迫建成三层评测体系：① **VSC-Bench**（离线，选候选）——容器化可复现 workspace 里真正启动 VS Code 实例跑完整 agent session，度量 resolution rate + agent effort + token 效率 + latency 四件套；数据集刻意私有（公开就重蹈 SWE-bench 污染覆辙，私有性正是质量信号的前提）；② **PR 评测门禁**（merge 时，防回归）；③ **生产 A/B**（在线，定胜负）——GPT-5.5 prompt 实验用"10 分钟存活率 / commit 存活率"这类只有真实用户行为能提供的指标，`PRPT_LRG` 以 p95 首次编辑延迟 -9.30%、工具调用 -8.54% 换质量微降 0.44%（p=0.0493），显式量化 trade-off 后拍板。附带发现：xhigh reasoning effort 比 high 更费 token 但解题率反而略低——存在"有效努力甜点"。

### Claim: Agent 行为回归是传统 CI 测不出的新回归类别——今天的门禁靠作者自我申报触发

- **来源**：[[Agent=Model+Harness]]
- **首次出现**：2026-07-14
- **最近更新**：2026-07-14
- **置信度**：0.85
- **状态**：stale
- **证据类型**：实测经验
- **复核**：2026-11-07 待定——依据：GitHub issue 状态需逐个核对，本轮未查

> 模型没换、代码没 bug，但改一个工具 description、动一行 system prompt，agent 就可能整体变笨——单元测试全绿、产品体验回归。判断标准不是"改没改 prompt"而是"会不会改变 agent 感知到的世界"：microsoft/vscode#312854 只修终端 shell integration 挂起 bug（加 30 秒定时器）也要过评测门禁，因为终端是 `run_in_terminal` 的行为地基。实证（GitHub API 查证，截至 2026-07）：`~requires-eval-assessment` 标签的 9 个 PR 里 8 个由作者本人手打、仅 1 个由 bot 自动打——本质是**自我申报制**，依赖资深成员的直觉与团队文化。当改 harness 的主力变成 agent，约束需分层：L1 确定性路径规则（保召回）、L2 语义指令（AGENTS.md 自评）、L3 独立 reviewer agent（never self-approve）；成本不对称（漏报=回归上线，误报=多跑一轮评测）决定默认值应是"不确定时打标签"。

### Claim: InkOS 在 AI 小说创作领域独立发现了 Harness Engineering 的核心范式——跨领域验证

- **来源**：[[InkOS：AI小说创作中的Harness]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> InkOS 的 10 Agent 流水线 + 硬编码词表规则（L1 Hook）+ 7 真相文件（结构化状态持久化）+ 33 维审计检查清单（Evaluative Control）+ 审计-修订循环（反馈闭环）与 Harness Engineering 存在六个结构性同构映射。不同领域（小说 vs 编码），同一规律：AI 的可靠性不来自更强的模型，而来自更好的约束系统。

### Claim: AI Agent 创作存在三种范式——纯多 Agent / Agent+微调 / Harness 驱动

- **来源**：[[InkOS：AI小说创作中的Harness]]
- **首次出现**：2026-04-23
- **最近更新**：2026-11-24
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-24 修订——依据：[InkOS README](https://github.com/Narcooo/inkos/blob/master/README.en.md)（11-22 loop-revalidate 取证，用户裁决写回）；Terminal Velocity 与 GOAT 本轮未查，范式一、二的例子维持原记录

> 范式一（对话驱动）：Terminal Velocity，agent 通过对话协商，无显式规则，长篇一致性差。范式二（模型驱动）：GOAT Storytelling Agent 加微调模型，推理效率高但泛化受限。范式三（harness 驱动）：InkOS，最有前景的方向；它的形态已经变了——初版是 10 个 agent 加硬编码规则、真相文件、审计循环，2.0 收敛成单一的 pi-agent harness 加 19 个 skill，由宿主负责确认、状态、原子持久化与产物真相。这一演变正好印证同页"外层 harness 框架 skill 化收敛"那条。

### Claim: V-Model 双轨把"凡可确定性计算的绝不交给 LLM"应用到合规领域

- **来源**：[[Spec-Kit系列00：SDD、TDD与V-Model融合]]
- **首次出现**：2026-07-20
- **最近更新**：2026-07-21
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> spec-kit-v-model 的 Traceability Matrix 验证由确定性脚本完成而非 LLM——规格覆盖率、层间追溯这类可确定性计算的检查一律走脚本，LLM 只负责起草。这与 Vibe Coding 系列13 的 Harness 原则同构：确定性外壳包住概率性内核。SDD 的模板门禁、phase gate、宪法条款检查也都是 L1/L2 层约束系统在开发方法论上的落地，证明 Harness 工程范式可延伸到合规级软件流程。

### Claim: 选 harness 就是选行为语义——Copilot Studio 三 harness 并存；扩展机制"离模型越近越可移植"

- **来源**：[[Foundry-Toolbox与Skills解析]]
- **首次出现**：2026-07-30
- **最近更新**：2026-11-24
- **置信度**：0.75
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-24 修订——依据：[Copilot Studio agents overview](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-overview)、[Harnesses overview](https://learn.microsoft.com/en-us/microsoft-copilot-studio/harnesses-overview)（11-22 loop-revalidate 取证，用户裁决写回）

> Copilot Studio 一个产品里并存多种 harness，官方现行组成是 Microsoft Copilot harness、Customer Conversation harness、standard harness，原来的经典编排与生成式编排都已归入 standard（概览页另一处写作 GitHub Copilot harness，官方口径尚未统一；原记录"经典低代码编排、生成式编排、Copilot 运行时"三分已过时）。同一 agent 配置换 harness 跑出不同行为——"选 harness 就是选行为语义"的直接产品证据。由此得出跨 harness 可移植性分层：**skill（纯文本指令）与 MCP（协议标准）可移植性高；instructions/system prompt 中等（各平台注入方式不同）；subagent、hook、plugin 可移植性低（深度绑定特定 harness 实现）**。规律一句话："离模型越近越可移植"——离模型近的资产只依赖模型能读文本，离模型远的资产依赖 harness 私有机制。资产投资应优先沉淀在可移植层。

### Claim: 外层 Harness 框架 Skill 化收敛——复杂度没有消失，而是沉到宿主与模型两端

- **来源**：[[Vibe-Coding系列14：Harness框架的Skill化收敛]]
- **首次出现**：2026-08-20
- **最近更新**：2026-11-22
- **置信度**：0.9
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-22 确认——依据：[obra/superpowers](https://github.com/obra/superpowers) 当前 v7.0.2（2026-11-03）：顶层无 agents/、commands/，skills/ 15 个，hooks/ 只剩 session-start 与 hooks 配置——收敛趋势延续

> Superpowers 三版本目录实证（5.0.2 有 agents/commands/hooks 全家桶 → 6.3.0 只剩 14 个 skill + 1 个极简 SessionStart bootstrap hook），GSD/gstack 同步瘦身。四个收敛原因：① 宿主把基础设施内置了（subagent 体系/plan mode/任务列表/原生 hooks/session 持久化），插件再自带就是在 50 万行内层 Harness 上重复建设；② 模型变强后流程挟持的成本收益倒挂；③ skill 是唯一跨 harness 可移植载体（归口 [[harness-portability-spectrum]]）；④ 纯文本维护成本低一个量级。收敛后三层分工：方法论层（插件=纯 skill）/ 基础设施层（宿主 harness）/ 能力层（模型）。**"变简单"是表象，实质是职责归位**——框架竞争维度从"机制精巧"变成"方法论文本质量"（Superpowers 用 eval campaign 微测试每段文字存废）。选型视角随之更新：过去看机制是否完备，现在看 skill 文本质量与实证方法。用户侧值得亲手维护的只剩三类：领域角色 agent（独有领域知识）、安全 hook（独有安全边界）、方法论 skill（工作流偏好）；深嵌套刻意受限（两层半），角色扮演式流水线（BMAD）按机制需求译成扁平星型而非照搬组织树。


### Claim: Agentic Engineering 是学科，Harness Engineering 是其中"怎么控制 agent"的技术方法；harness 不是 agent、prompt 或 workflow，而是持续回答五个问题的系统

- **来源**：[[Agentic-Engineering：质量与成本一体化]]
- **首次出现**：2026-05-31
- **最近更新**：2026-11-24
- **置信度**：0.65
- **状态**：active
- **证据类型**：理论

> 学科层面分三块：Harness Engineering 管 HOW（上下文管理、工具编排、评估循环、安全护栏），FinOps 管 WHO（可见性与归因、预算与策略、持续运营，见 [[cost-per-task]]），质量工程管 WHAT（任务成功率、级联失败防护、上下文腐化防治）。出发点是模型能力已经跨过门槛，挑战从"让模型更强"转向"让系统更稳"：单步 95% 准确、20 步级联只剩 36%，各家模型能力差距缩小后差异来自编排、记忆和工具使用。harness 要持续回答的五个问题：任务怎么定义（Spec、Plan），状态怎么保存（制品、文件），上下文怎么控制（增量、重置），谁来判断好坏（评估、评审 agent），跑偏后怎么修（反馈回写到 Spec 或规则）。

### Claim: 人和 agent 的分工按 Delegate → Review → Own 三档划——可行性分析、脚手架、测试、文档委派出去，架构对齐与安全合规人来审，优先级、新抽象和生产签核人来拥有；开发流程各阶段按这三档配模型和工具

- **来源**：[[Agentic-Engineering：质量与成本一体化]]
- **首次出现**：2026-05-31
- **最近更新**：2026-11-24
- **置信度**：0.6
- **状态**：active
- **证据类型**：理论

> 七个阶段的配置思路：规划用最强模型（判断最贵），设计和构建用中档模型，测试从小模型起步、失败时升级，评审用强模型，文档用小模型并关闭输出压缩（文档需要详尽），部署从小模型起步、出事时升级。几个要点：测试阶段只输出失败用例的过滤价值最大（全部通过时输出可以从几万 token 降到几个 token）；评审阶段天然适合压缩输出，评论本来就该短而高信号；部署阶段让 MCP 直连日志系统，避免 `tail -200` 一类命令把日志整段灌进上下文。这一档划分也是 [[ai-skill-formation]] 里"写代码交给 AI、想问题定方向验结果留给自己"的流程化版本。

## 冲突与演进

- 2026-11-24：/revalidate 写回 11-22 loop-revalidate 提议（用户裁决）：3 条修订——Claude Code 代码占比改为社区估算的 98.4% / 1.6%（0.9 → 0.8）；Copilot Studio harness 组成更新为 Microsoft Copilot / Customer Conversation / standard；InkOS 例子更新为 2.0 的单一 harness 加 19 个 skill。

- 2026-11-24：/extract-knowledge 厚度补抽 Agentic Engineering：新增"学科与方法的关系、harness 的五个问题"和"Delegate → Review → Own 分工"两条。
- 2026-04-16：Meta-Harness 论文对 Harness 给出了比 LangChain 主流定义更窄、更精确的操作性定义，两者并不矛盾但侧重点不同——前者聚焦信息管道，后者泛指"模型之外的一切"。
- 2026-04-17：控制论视角引入，将 Harness Engineering 从工程方法论上溯到控制论理论根基。三套框架（控制论五层 / 六层架构 / 三层控制模型）互补：搭系统用六层，调系统用三层，设计决策回控制论。
- 2026-04-23：InkOS 分析证实 Harness Engineering 范式具有跨领域普适性（从 Coding 扩展到小说创作），核心公式 Agent = Model + Harness 在文学领域同样成立。
- 2026-07-14：VS Code Copilot 博客解读补充两条工程证据：三层评测体系（VSC-Bench→PR 门禁→生产 A/B）与"agent 行为回归"这一传统 CI 盲区。harness 的产品战略层议题（第一方绑定 vs 多模型适配）另建 [[model-harness-codesign]] 页。
- 2026-07-20：SDD/V-Model 提供合规域延伸证据：确定性脚本验证追溯 + 模板门禁，Harness 范式从 Agent 系统扩展到软件开发方法论本身。
- 2026-09-12：evolve-wiki 例行复核——"OpenForge 给出 harness 的正式学术定义"Claim 有 arXiv 论文原文支撑，按官方文档/论文置信度下限规则 0.75→0.8。
- 2026-08-04：从 Foundry Toolbox/Skills 篇补充 OpenForge 正式定义（Model+Harness+Environment 三元）、Copilot Studio 三 harness 产品证据与"离模型越近越可移植"分层——harness 定义谱系现有三档：泛指（LangChain）> 编排脚手架（OpenForge）> 信息管道（Meta-Harness）。
- 2026-08-10：补充 harness 与 Agent Runtime 的正交辨析——harness 面向 model（同心圆内），runtime 面向 infra（承载同心圆的外侧层），给出换模型/谁在焦虑两个边界测试；与 OpenForge 三元结构兼容：runtime 大致对应托管化的 Environment + 部分平台 harness。
- 2026-08-10：Copilot Studio 三 harness GA（2026-08-03，Copilot Chat/Standard/GitHub Copilot）提供"选 harness 即选 runtime"的产品证据，替代此前 preview 期的"经典/生成式/Copilot 运行时"三分——托管平台把 harness 与 runtime 打包出售，依赖管理被 MCP/connector/skill 扩展点取代；skill scripts 的执行环境断层另见 [[skill-runtime]]。
- 2026-08-30：注入系列14 Skill 化收敛 Claim（三层分工格局/四个收敛原因/竞争维度迁移）；"离模型越近越可移植"分层判据升格独立页 [[harness-portability-spectrum]]（原始 Claim 保留本页，判据归口新页）。
- 2026-08-10：补充 framework/harness/runtime 三层链条辨析——framework 是 dev-time 的"造 harness 工具包"，运行期消融在 harness 里；"Agent = Model, Not Framework" Claim（2026-04-13）由此获得新解读：它是 harness 路线对重 framework 封装路线的立场表态。
- 2026-09-04：注入五平台横评的编排接入镜像两式（dsh loop 内挂 / OpenHands loop 外包）与"控制权在哪一层"选型判据；绑定×可分解十字定位归口 [[model-harness-codesign]]，搬家工具市场实证归口 [[harness-portability-spectrum]]。
- 2026-11-07：/revalidate 全库复核（证据分类）——待定 7、确认 1、长效 13
- 2026-11-16：harness 作为实体的 7 条 Claim（OpenForge 定义、与 framework / runtime 的边界、三类归属、托管平台打包、编排接入两式、职责边界）搬到新页 [[agent-harness]]，本页只留"怎么把 harness 做好"的工程方法。
- 2026-11-22：loop-revalidate（Loop⑥）复核——确认 2

## 关联概念

- [[agent-harness]] — `grounds` 本页讲怎么把 harness 做好；harness 是什么、归谁、与 framework / runtime 的边界见 agent-harness
- [[ai-skill-formation]] — `constrains` 护栏可以分层工程化，但新人、新领域、安全关键场景下人这一层不能变薄
- [[bitter-lesson]] — `contrasts` Harness Engineering 是人类知识编码的现代形式，可能面临 Bitter Lesson 挑战
- [[one-person-team]] — `produces` Harness Engineering 是实现一人团队的技术基础
- [[rtk-token-compression]] — `uses` Token 压缩是 Harness 工程的一个环节
- [[harness-quality-gate]] — `contrasts` 名称类似但不同概念：前者是 AI Agent 系统工程范式，后者是 DevOps 质量门禁
- [[cybernetics-harness-design-sheet]] — `produces` 控制论 Design Sheet 是 Harness 设计流程的前置检查工具
- [[online-learning]] — `contrasts` Harness 是外部控制器不改参数，在线学习把控制器写进模型内部改参数；伪在线学习（memory/RAG/reflection）本质仍是 harness
- [[reinforcement-learning]] — `contrasts` Harness 是 LLM Agent 对 RL 学习能力缺失的工程补偿
- [[skill-runtime]] — `constrains` harness + runtime 共同决定 skill 声明的依赖是否被满足，scripts 层可移植性受 runtime 约束
- [[regulation-first-design]] — `implements` 先定被调节量、再按回路搭 harness
- [[agent-infra-three-layers]] — `contrasts` harness 是贯穿 Framework 与 Runtime 的工程方法，三层划分讲的是部署层次

## 来源日记

- [[Vibe-Coding系列01：Harness-Engineering的来龙去脉|Vibe Coding系列01]] — Harness Engineering 概念首次系统阐述
- [[Vibe-Coding系列02：架构师视角的Harness实践|Vibe Coding系列02]] — OpenAI 五大支柱详解
- [[Claude-Code系列02：learn-claude-code|learn-claude-code]] — 从 Claude Code 源码理解 Harness 实践
- [[2026-04-16-周四]] — Meta-Harness 论文解读，补充精确 Harness 定义和自动化优化
- [[2026-04-17-周五]] — 控制论视角引入，三层控制模型、Claude Code 绝大部分代码是 harness（数字 2026-11-24 更正为 98.4% 运行基础设施）
- [[2026-04-23-周四]] — InkOS 跨领域验证：AI 小说创作中的 Harness Engineering 范式、三种 AI 创作范式总结
- [[Agent=Model+Harness]] — VS Code 三层评测体系、agent 行为回归门禁、`~requires-eval-assessment` 自我申报实证、L1/L2/L3 分层约束
- [[Spec-Kit系列00：SDD、TDD与V-Model融合]] — V-Model 确定性脚本验证（Harness 范式的合规域延伸）
- [[Foundry-Toolbox与Skills解析]] — OpenForge 正式定义、Copilot Studio 三 harness、可移植性分层（2026-07-30）
- [[2026-08-10-周一]] — Harness vs Agent Runtime 正交辨析（面向 model / 面向 infra、两个边界测试）；Copilot Studio 三 harness GA 与"选 harness 即选 runtime"（2026-08-10）
- [[Agent基础设施系列04：Framework层与三层串联]] — harness 归属三类、何时选 framework / harness、harness 用法与选型表（2026-11-02）
- [[Agentic-Engineering：质量与成本一体化]] — 学科与方法的关系、五个问题、Delegate → Review → Own
