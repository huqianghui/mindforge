---
title: Personal Knowledge Wiki
created: 2026-04-13
updated: 2026-04-30
stats: "62 concepts, 13 methods, 4 decisions, 280 claims"
tags:
  - wiki
  - index
---

# Personal Knowledge Wiki

> 从日记中提炼的个人知识库——基于 Karpathy LLM Wiki 理念，由 Claude Code + OMC 协助维护。
>
> "Compiled once and kept current, not re-derived on every query."

## 导航

### Concepts（概念页）

概念页是知识库的核心单元。每个概念页包含：

- **摘要**——概念的 1-2 段定义性描述
- **Claims**——来自日记/文章的论断，附带证据来源、置信度和生命周期状态
- **关联概念**——与其他概念页的 `[[wikilinks]]`
- **来源日记**——知识的原始出处

浏览所有概念：`wiki/concepts/`

## 知识工作流

| 命令 | 用途 | 触发频率 |
|------|------|----------|
| `/extract-knowledge` | 从日记/文章中提取概念、方法和论断到 wiki | 每日或按需 |
| `/evolve-wiki` | 更新置信度、生成摘要、刷新关联 | 每周 |
| `/detect-conflict` | 扫描 wiki 发现冲突论断 | 每周或按需 |
| `/knowledge-gap` | 分析知识库差距，生成学习建议报告 | 每周或按需 |
| `/wiki-query` | 跨切面查询：关系图谱、Claims 检索、决策查询 | 按需 |
| `/weekly-review` | 每周知识回顾与统计报告 | 每周 |

## Schema 说明

**Claim 生命周期**：

```
active → conflicting（发现矛盾证据）
active → outdated（被新证据取代）
active → stale（60+ 天未更新）
stale → active（重新验证后）
conflicting → active（人工裁决后）
```

**置信度（Confidence）**：`0.0`（纯猜测）~ `1.0`（充分验证），由证据数量和一致性决定。

**关联类型（Relation Types）**：

wiki 页面之间的关联使用类型化前缀标注，格式：`- [[page]] — \`relation-type\` 描述`

完整定义见 [[_relations]]（8 种类型 + 判断标准 + 示例 + 扩展指南）。

速查：`implements` / `grounds` / `extends` / `constrains` / `contrasts` / `part-of` / `uses` / `produces`

## 概念索引

<!-- 由 /evolve-wiki 自动维护，也可手动添加 -->

### AI Agent 理论与架构

- [[harness-engineering]] — Harness Engineering：Prompt < Context < Harness 同心圆范式
- [[agent-loop-architecture]] — Agent Loop 核心架构：30 行代码的 while 循环
- [[agent-paradigms]] — Agent 经典三范式：ReAct / Plan-and-Solve / Reflection
- [[context-engineering]] — Context Engineering：从 Prompt Engineering 的正式演进
- [[context-explosion]] — Context 爆炸：GSD/Superpowers/OpenSpec 的共同 scaling 瓶颈
- [[skill-runtime]] — Skill Runtime：从 document-centric 到 capability-centric 的范式迁移
- [[skill-pattern]] — Google 五种 Skill Pattern 认知架构
- [[autoresearch]] — AutoResearch：受控搜索空间中的自动化爬坡
- [[code-reuse-in-agent-era]] — Agent 时代的代码复用：四层防线
- [[cybernetics-agent-design]] — 控制论 Agent 设计：负反馈 + 共轭变换 + 随机探索的结构同构
- [[meta-harness]] — Meta-Harness：用 Harness 优化 Harness 的递归搜索架构
- [[one-person-team]] — One Person Team：AI 重新定义技术角色边界
- [[bitter-lesson]] — The Bitter Lesson：计算胜过人类知识的 70 年规律
- [[continual-self-improving-ai]] — 持续自我改进 AI：EntiGraph、SBP
- [[ai-skill-formation]] — AI 对技能形成的影响：放大器而非均衡器
- [[negative-feedback]] — 负反馈：error = goal - current_state，Agent 收敛的核心机制
- [[conjugate-transformation]] — 共轭变换：表示层设计，90% 的 Agent 失败是表示问题
- [[feedback-loop]] — 反馈闭环：区分线性工具链和控制系统的关键判据
- [[generation-evaluation-separation]] — 生成-评估分离：三家公司独立演化的行业共识
- [[react-paradigm]] — ReAct 范式：Thought-Action-Observation，Agent Loop 最小完备形式
- [[scaling-laws]] — 缩放定律：Bitter Lesson 的定量化证明
- [[reinforcement-learning]] — 强化学习：Search + Learning 统一，Harness 是学习能力缺失的补偿
- [[context-projection]] — 上下文投影：context ≠ state，按需投影解决 Context 爆炸
- [[claim-based-schema]] — 基于论断的知识模式：不存事实只存论断的知识系统设计

### Claude Code 与扩展生态

- [[claude-code-agent-subagent]] — Agent/Subagent 架构：进程隔离即上下文隔离
- [[claude-code-extension-system]] — Claude Code 扩展体系：Command → Skill → Plugin 三次演进
- [[oh-my-claude-code]] — oh-my-claude-code（OMC）多 Agent 编排框架
- [[skill-creator-orchestration]] — Skill Creator 智能编排层：编排而非合并
- [[skill-hub-ecosystem]] — Coding Agent Skill/Plugin 生态调研
- [[openclaw-agent-gateway]] — OpenClaw / claw0 Agent 网关五阶段架构

### Vibe Coding 框架与工作流

- [[ai-native-pipeline]] — AI-Native 五层开发 Pipeline
- [[framework-selection]] — Vibe Coding 框架选型：规范驱动 vs 方法论
- [[three-layer-plugin-architecture]] — GSD + Superpowers + gstack 三层插件架构

### Context 与工具集成

- [[mcp-vs-cli]] — MCP vs CLI：两条工具集成路线的权衡
- [[context7]] — Context7：实时文档 MCP Server
- [[agent-search-tools]] — AI Agent 搜索三剑客：Exa / Tavily / Context7
- [[opencli]] — OpenCLI：CLI 的 OpenAPI 标准化接口描述

### 语音与实时交互

- [[voice-live-agent]] — Voice Live Agent：级联管线 vs 端到端架构
- [[voice-activity-detection]] — 语音活动检测：Server VAD vs Semantic VAD
- [[speech-technology-stack]] — 语音技术栈：Speech In / Core Processing / Speech Out
- [[turn-taking]] — 话轮转换：语音 Agent 最被低估也最关键的技术
- [[cascaded-pipeline]] — 级联流水线：VAD → STT → LLM → TTS 的模块化架构
- [[grapheme-to-phoneme]] — G2P（Grapheme-to-Phoneme）：TTS 流水线的字素到音素转换

### Azure 与云平台

- [[azure-copilot-ecosystem]] — Azure Copilot 生态：Agents、Skills、MCP Server
- [[rag-architecture-comparison]] — RAG 架构对比：个人级 qmd vs 企业级 Foundry IQ

### 数据本体论（Ontology）

- [[enterprise-ontology]] — 企业本体论：Fabric IQ + Palantir Ontology
- [[ontology-philosophy]] — 本体论哲学根基：从 Parmenides 到 Aristotle

### 工程质量与测试

- [[architecture-testing]] — 架构测试：可执行架构约束系统（ArchUnit/dependency-cruiser/Tach）
- [[fitness-functions]] — 架构适应度函数：将架构关注点转化为可自动执行的检查
- [[testcontainers]] — 用真实容器替代 mock 的集成测试框架
- [[ephemeral-environment]] — 临时环境：PR 级全栈隔离（vCluster/Signadot/Bunnyshell）
- [[contract-testing]] — 契约测试：消费者驱动的服务间 API 验证（Pact）
- [[harness-quality-gate]] — Harness 质量门禁体系：从五维到四层

### 知识管理与工具

- [[llm-wiki]] — LLM Wiki 与 Personal Knowledge Compiler 范式
- [[personal-knowledge-compiler]] — 个人知识编译器（PKC）：日记到知识库
- [[notion-as-ai-layer]] — Notion 在 AI Agent 生态中的定位
- [[ai-native-design-tools]] — AI 原生设计工具：Pencil / Excalidraw / Draw.io
- [[terminal-multiplexer-for-ai]] — 终端复用器：tmux / cmux 与 AI 工作流
- [[claude-code-memory-system]] — Claude Code 六层记忆与持久化体系
- [[rtk-token-compression]] — RTK（Rust Token Killer）：AI Coding Agent 的 Token 压缩中间件
- [[caveman-token-compression]] — Caveman：Prompt Engineering 工程化的 LLM 输出 Token 压缩
- [[brevity-constraints]] — 简洁约束：逆转大小模型性能层级的反直觉现象

## 方法索引

方法页是知识库的程序性知识单元。每个方法页包含：

- **摘要**——方法解决什么问题、适用场景
- **适用条件**——前置依赖、适用/不适用场景
- **步骤**——有序的执行步骤，每步含输入/输出/判断标准
- **决策点**——条件分支和选择理由
- **Claims**——与方法相关的论断

浏览所有方法：`wiki/methods/`

### Pipeline（顺序流程）

- [[ai-native-five-layer-pipeline]] — AI-Native 五层开发流水线
- [[openclaw-five-stage-gateway]] — OpenClaw Agent 网关五阶段建设

### Decision Framework（决策框架）

- [[gsd-project-scale-selection]] — GSD 项目规模分级与工具选择

### Workflow（工作流）

- [[personal-knowledge-compiler-workflow]] — 日记到知识库编译流程
- [[gsd-five-step-workflow]] — GSD 五步开发工作流

### Layered Strategy（分层策略）

- [[code-reuse-four-layer-defense]] — Agent 时代四层代码复用防线
- [[four-layer-architecture-quality-gate]] — 四层架构质量门禁（Lint → 约束 → 分析 → AI Review）
- [[four-layer-test-environment-strategy]] — 四层测试环境策略（Unit → Integration → E2E → Ephemeral）

### Quality Gate（质量门禁）

- [[harness-five-dimension-quality-gate]] — Harness 五维质量门禁
- [[cybernetics-harness-design-sheet]] — 控制论 Harness Design Sheet：五层设计维度检查表

### Pipeline（顺序流程）— 补充

- [[ai-adoption-six-step-evolution]] — AI 工具采纳六步进化（Mitchell Hashimoto）

### Layered Strategy（分层策略）— 补充

- [[three-layer-token-optimization]] — 三层 Token 优化策略：compact / RTK / Caveman 全链路压缩

### Architecture Pattern（架构模式）

- [[voice-cascaded-pipeline]] — 语音级联管线架构

## 决策索引

决策页记录关键技术选型和架构决策的"为什么"。每个决策页包含：

- **背景**——什么问题触发了决策
- **选项分析**——各方案的优劣势和适用条件
- **决策结论**——选了什么、为什么、放弃理由、前提假设
- **验证状态**——决策是否经过实践验证

浏览所有决策：`wiki/decisions/`

- [[cascaded-vs-e2e-voice]] — 级联管线 vs 端到端：Voice Agent 架构选择
- [[architecture-constraint-over-agent-learning]] — 架构约束优于 Agent 自主学习：代码复用策略
- [[spec-driven-vs-methodology-framework]] — 规范驱动 vs 方法论框架：Vibe Coding 工具选型
- [[wiki-over-rag-for-personal-knowledge]] — LLM Wiki 优于 RAG：个人知识管理架构
