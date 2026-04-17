---
title: "Harness Engineering"
created: "2026-04-13"
updated: "2026-04-17"
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
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 三者是同心圆包含关系：Prompt（单次措辞）< Context（上下文构建）< Harness（仓库级系统工程）。

### Claim: 三家公司独立演化出同一套 Harness 设计范式

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.8
- **状态**：active

> OpenAI、Anthropic、Google DeepMind 在 2026 年初独立演化出同一套 Harness 设计范式，这不是巧合而是行业共识。

### Claim: Agent 的两种典型失败模式是系统设计问题而非模型能力问题

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 上下文耗尽（Context Exhaustion）和提前收工（Premature Completion）不是"让模型更努力"能解决的，而是系统设计问题。

### Claim: 级联失败是 Harness Engineering 出现的核心驱动力

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.8
- **状态**：active

> 单步 95% 成功率在 10 步串联后只剩 60%（0.95^10 ≈ 0.60），级联失败驱动了 Harness Engineering 的出现。

### Claim: OpenAI 的 Harness Engineering 五大支柱

- **来源**：[[Vibe Coding系列02]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 仓库即系统记录、分层领域架构、Agent 可读性、黄金准则、垃圾回收。

### Claim: Agent 的智能来自 model，可靠性来自 harness

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 30 行代码能跑 demo，但从 30 行到生产中间是 12 层 harness 的距离。Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions。

### Claim: "Agent = Model, Not Framework" 是一个工程立场

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：active

> model 是做决策的主体，外部代码只是缰绳。

### Claim: Meta-Harness 论文给出了更精确的 Harness 定义——聚焦信息管道

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：active

> 业界主流（LangChain）定义 Harness 为"模型之外的一切"，Meta-Harness 论文精确聚焦为"the code that determines what to store, retrieve, and show to the model"——控制模型输入输出信息流的那层代码。同时揭示实际存在两层 Harness：Platform Harness（平台内置）和 User Harness（用户定制），同一模型换 Harness 可使性能排名跳跃 28 位。

### Claim: Harness 优化可被自动化为搜索问题

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：active

> Meta-Harness 将手工 Harness 迭代自动化为 Propose → Evaluate → Log → Repeat 搜索循环。消融实验证明完整执行 trace 访问（50.0%）远优于仅分数（34.6%），原始 trace 是不可替代的诊断信号。

### Claim: 控制论是 Harness Engineering 的理论根基——三层控制模型

- **来源**：[[控制论与科学方法论——从控制论到AI Agent设计方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 所有 Harness 代码可归入三个控制系统：执行系统（L5 Runtime + L4 Execution，"怎么做出来"）、约束系统（L2 Planning + L1 Policy，"不能乱来"）、认知系统（L6 Eval，"从经验学到什么"）。收敛性 = 约束强度 × 反馈频率 / 执行自由度。

### Claim: Claude Code 的 98.7% 代码都是 Harness

- **来源**：[[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.9
- **状态**：active

> Claude Code 总代码量 50 万行以上，其中直接调用模型的代码约 6400 行（~1.3%）。社区框架的价值不在于重复执行能力，而在于补足约束系统和认知系统的空白。

## 冲突与演进

- 2026-04-16：Meta-Harness 论文对 Harness 给出了比 LangChain 主流定义更窄、更精确的操作性定义，两者并不矛盾但侧重点不同——前者聚焦信息管道，后者泛指"模型之外的一切"。
- 2026-04-17：控制论视角引入，将 Harness Engineering 从工程方法论上溯到控制论理论根基。三套框架（控制论五层 / 六层架构 / 三层控制模型）互补：搭系统用六层，调系统用三层，设计决策回控制论。

## 关联概念

- [[agent-loop-architecture]] — `uses` Agent Loop 是 Harness 的运行时核心
- [[context-engineering]] — `extends` Context Engineering 是 Harness Engineering 的子集
- [[claude-code-agent-subagent]] — `uses` Claude Code 是 Harness Engineering 理念的典型实现
- [[skill-pattern]] — `grounds` Skill Pattern 是 Harness 设计的认知层理论基础
- [[bitter-lesson]] — `contrasts` Harness Engineering 是人类知识编码的现代形式，可能面临 Bitter Lesson 挑战
- [[code-reuse-in-agent-era]] — `produces` CLAUDE.md 架构约束是代码复用四层防线的第一层
- [[oh-my-claude-code]] — `produces` OMC 是 Harness Engineering 理念的高层封装
- [[one-person-team]] — `produces` Harness Engineering 是实现一人团队的技术基础
- [[rtk-token-compression]] — `uses` Token 压缩是 Harness 工程的一个环节
- [[harness-quality-gate]] — `contrasts` 名称类似但不同概念：前者是 AI Agent 系统工程范式，后者是 DevOps 质量门禁
- [[agent-paradigms]] — `uses` Harness 提供范式切换的系统级支撑
- [[context-explosion]] — `constrains` Context 管理是 Harness 的关键能力
- [[meta-harness]] — `produces` Meta-Harness 是 Harness Engineering 的自动化演进
- [[cybernetics-agent-design]] — `grounds` 控制论是 Harness Engineering 的理论根基
- [[cybernetics-harness-design-sheet]] — `produces` 控制论 Design Sheet 是 Harness 设计流程的前置检查工具

## 来源日记

- [[Vibe Coding系列01]] — Harness Engineering 概念首次系统阐述
- [[Vibe Coding系列02]] — OpenAI 五大支柱详解
- [[learn-claude-code]] — 从 Claude Code 源码理解 Harness 实践
- [[2026-04-16-周四]] — Meta-Harness 论文解读，补充精确 Harness 定义和自动化优化
- [[2026-04-17-周五]] — 控制论视角引入，三层控制模型、Claude Code 98.7% 是 Harness
