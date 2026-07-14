---
title: "Harness Engineering"
created: "2026-04-13"
updated: "2026-07-14"
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
  - "[[agent-loop-architecture]]"
  - "[[context-engineering]]"
  - "[[claude-code-agent-subagent]]"
---

# Harness Engineering

## 摘要

Harness Engineering（驾驭工程）是 Prompt Engineering 和 Context Engineering 的超集，三者构成同心圆包含关系。核心主张是：Agent 的"智能"来自 model，但"可靠性"来自 harness——外部系统代码（Tools + Knowledge + Observation + Action Interfaces + Permissions）。这一范式在 2026 年初由 OpenAI、Anthropic、Google DeepMind 独立演化趋同，标志着行业共识。

## Claims

### Claim: Harness Engineering 是 Prompt Engineering 和 Context Engineering 的超集

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> 三者是同心圆包含关系：Prompt（单次措辞）< Context（上下文构建）< Harness（仓库级系统工程）。

### Claim: 三家公司独立演化出同一套 Harness 设计范式

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> OpenAI、Anthropic、Google DeepMind 在 2026 年初独立演化出同一套 Harness 设计范式，这不是巧合而是行业共识。

### Claim: Agent 的两种典型失败模式是系统设计问题而非模型能力问题

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 上下文耗尽（Context Exhaustion）和提前收工（Premature Completion）不是"让模型更努力"能解决的，而是系统设计问题。

### Claim: 级联失败是 Harness Engineering 出现的核心驱动力

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> 单步 95% 成功率在 10 步串联后只剩 60%（0.95^10 ≈ 0.60），级联失败驱动了 Harness Engineering 的出现。

### Claim: OpenAI 的 Harness Engineering 五大支柱

- **来源**：[[Vibe Coding系列02]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 仓库即系统记录、分层领域架构、Agent 可读性、黄金准则、垃圾回收。

### Claim: Agent 的智能来自 model，可靠性来自 harness

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> 30 行代码能跑 demo，但从 30 行到生产中间是 12 层 harness 的距离。Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions。

### Claim: "Agent = Model, Not Framework" 是一个工程立场

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：stale

> model 是做决策的主体，外部代码只是缰绳。

### Claim: Meta-Harness 论文给出了更精确的 Harness 定义——聚焦信息管道

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：stale

> 业界主流（LangChain）定义 Harness 为"模型之外的一切"，Meta-Harness 论文精确聚焦为"the code that determines what to store, retrieve, and show to the model"——控制模型输入输出信息流的那层代码。同时揭示实际存在两层 Harness：Platform Harness（平台内置）和 User Harness（用户定制），同一模型换 Harness 可使性能排名跳跃 28 位。

### Claim: Harness 优化可被自动化为搜索问题

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：stale

> Meta-Harness 将手工 Harness 迭代自动化为 Propose → Evaluate → Log → Repeat 搜索循环。消融实验证明完整执行 trace 访问（50.0%）远优于仅分数（34.6%），原始 trace 是不可替代的诊断信号。

### Claim: 控制论是 Harness Engineering 的理论根基——三层控制模型

- **来源**：[[控制论与科学方法论——从控制论到AI Agent设计方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> 所有 Harness 代码可归入三个控制系统：执行系统（L5 Runtime + L4 Execution，"怎么做出来"）、约束系统（L2 Planning + L1 Policy，"不能乱来"）、认知系统（L6 Eval，"从经验学到什么"）。收敛性 = 约束强度 × 反馈频率 / 执行自由度。

### Claim: Claude Code 的 98.7% 代码都是 Harness

- **来源**：[[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读]]
- **首次出现**：2026-04-17
- **最近更新**：2026-07-06
- **置信度**：0.9
- **状态**：active

> Claude Code 总代码量 50 万行以上，其中直接调用模型的代码约 6400 行（~1.3%）。社区框架的价值不在于重复执行能力，而在于补足约束系统和认知系统的空白。

### Claim: 多模型 harness 必须自建三层评测体系——离线 benchmark → PR 门禁 → 生产 A/B

- **来源**：[[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]]
- **首次出现**：2026-07-14
- **最近更新**：2026-07-14
- **置信度**：0.85
- **状态**：active

> VS Code 为支撑 per-model 适配矩阵被迫建成三层评测体系：① **VSC-Bench**（离线，选候选）——容器化可复现 workspace 里真正启动 VS Code 实例跑完整 agent session，度量 resolution rate + agent effort + token 效率 + latency 四件套；数据集刻意私有（公开就重蹈 SWE-bench 污染覆辙，私有性正是质量信号的前提）；② **PR 评测门禁**（merge 时，防回归）；③ **生产 A/B**（在线，定胜负）——GPT-5.5 prompt 实验用"10 分钟存活率 / commit 存活率"这类只有真实用户行为能提供的指标，`PRPT_LRG` 以 p95 首次编辑延迟 -9.30%、工具调用 -8.54% 换质量微降 0.44%（p=0.0493），显式量化 trade-off 后拍板。附带发现：xhigh reasoning effort 比 high 更费 token 但解题率反而略低——存在"有效努力甜点"。

### Claim: Agent 行为回归是传统 CI 测不出的新回归类别——今天的门禁靠作者自我申报触发

- **来源**：[[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]]
- **首次出现**：2026-07-14
- **最近更新**：2026-07-14
- **置信度**：0.85
- **状态**：active

> 模型没换、代码没 bug，但改一个工具 description、动一行 system prompt，agent 就可能整体变笨——单元测试全绿、产品体验回归。判断标准不是"改没改 prompt"而是"会不会改变 agent 感知到的世界"：microsoft/vscode#312854 只修终端 shell integration 挂起 bug（加 30 秒定时器）也要过评测门禁，因为终端是 `run_in_terminal` 的行为地基。实证（GitHub API 查证，截至 2026-07）：`~requires-eval-assessment` 标签的 9 个 PR 里 8 个由作者本人手打、仅 1 个由 bot 自动打——本质是**自我申报制**，依赖资深成员的直觉与团队文化。当改 harness 的主力变成 agent，约束需分层：L1 确定性路径规则（保召回）、L2 语义指令（AGENTS.md 自评）、L3 独立 reviewer agent（never self-approve）；成本不对称（漏报=回归上线，误报=多跑一轮评测）决定默认值应是"不确定时打标签"。

### Claim: InkOS 在 AI 小说创作领域独立发现了 Harness Engineering 的核心范式——跨领域验证

- **来源**：[[InkOS深度感想——AI小说创作中的Harness Engineering范式]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.8
- **状态**：stale

> InkOS 的 10 Agent 流水线 + 硬编码词表规则（L1 Hook）+ 7 真相文件（结构化状态持久化）+ 33 维审计检查清单（Evaluative Control）+ 审计-修订循环（反馈闭环）与 Harness Engineering 存在六个结构性同构映射。不同领域（小说 vs 编码），同一规律：AI 的可靠性不来自更强的模型，而来自更好的约束系统。

### Claim: AI Agent 创作存在三种范式——纯多 Agent / Agent+微调 / Harness 驱动

- **来源**：[[InkOS深度感想——AI小说创作中的Harness Engineering范式]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：stale

> 范式一（对话驱动）：Terminal Velocity，Agent 通过对话协商，无显式规则，长篇一致性差。范式二（模型驱动）：GOAT Storytelling Agent + 微调模型，推理效率高但泛化受限。范式三（Harness 驱动）：InkOS，10 Agent + 硬编码规则 + 真相文件 + 审计循环，最有前景的方向。

## 冲突与演进

- 2026-04-16：Meta-Harness 论文对 Harness 给出了比 LangChain 主流定义更窄、更精确的操作性定义，两者并不矛盾但侧重点不同——前者聚焦信息管道，后者泛指"模型之外的一切"。
- 2026-04-17：控制论视角引入，将 Harness Engineering 从工程方法论上溯到控制论理论根基。三套框架（控制论五层 / 六层架构 / 三层控制模型）互补：搭系统用六层，调系统用三层，设计决策回控制论。
- 2026-04-23：InkOS 分析证实 Harness Engineering 范式具有跨领域普适性（从 Coding 扩展到小说创作），核心公式 Agent = Model + Harness 在文学领域同样成立。
- 2026-07-14：VS Code Copilot 博客解读补充两条工程证据：三层评测体系（VSC-Bench→PR 门禁→生产 A/B）与"agent 行为回归"这一传统 CI 盲区。harness 的产品战略层议题（第一方绑定 vs 多模型适配）另建 [[model-harness-codesign]] 页。

## 关联概念

- [[bitter-lesson]] — `contrasts` Harness Engineering 是人类知识编码的现代形式，可能面临 Bitter Lesson 挑战
- [[one-person-team]] — `produces` Harness Engineering 是实现一人团队的技术基础
- [[rtk-token-compression]] — `uses` Token 压缩是 Harness 工程的一个环节
- [[harness-quality-gate]] — `contrasts` 名称类似但不同概念：前者是 AI Agent 系统工程范式，后者是 DevOps 质量门禁
- [[cybernetics-harness-design-sheet]] — `produces` 控制论 Design Sheet 是 Harness 设计流程的前置检查工具
- [[online-learning]] — `contrasts` Harness 是外部控制器不改参数，在线学习把控制器写进模型内部改参数；伪在线学习（memory/RAG/reflection）本质仍是 harness
- [[reinforcement-learning]] — `contrasts` Harness 是 LLM Agent 对 RL 学习能力缺失的工程补偿

## 来源日记

- [[Vibe Coding系列01]] — Harness Engineering 概念首次系统阐述
- [[Vibe Coding系列02]] — OpenAI 五大支柱详解
- [[learn-claude-code]] — 从 Claude Code 源码理解 Harness 实践
- [[2026-04-16-周四]] — Meta-Harness 论文解读，补充精确 Harness 定义和自动化优化
- [[2026-04-17-周五]] — 控制论视角引入，三层控制模型、Claude Code 98.7% 是 Harness
- [[2026-04-23-周四]] — InkOS 跨领域验证：AI 小说创作中的 Harness Engineering 范式、三种 AI 创作范式总结
- [[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]] — VS Code 三层评测体系、agent 行为回归门禁、`~requires-eval-assessment` 自我申报实证、L1/L2/L3 分层约束
