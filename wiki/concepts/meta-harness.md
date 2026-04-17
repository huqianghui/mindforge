---
title: "Meta-Harness"
created: "2026-04-16"
updated: "2026-04-16"
tags:
  - wiki
  - concept
  - ai-engineering
  - harness
  - optimization
  - agent
aliases:
  - "Meta-Harness"
  - "元驾驭工程"
related:
  - "[[harness-engineering]]"
  - "[[agent-loop-architecture]]"
  - "[[context-engineering]]"
---

# Meta-Harness

## 摘要

Meta-Harness 是一种用 Harness 优化 Harness 的递归架构——以 Coding Agent（如 Claude Code Opus 4.6）作为 Proposer，在文件系统中保留完整历史（原始 trace + 分数），通过 Propose → Evaluate → Log → Repeat 的搜索循环自动探索最优 Harness 配置。论文（arxiv 2603.28052）同时给出了比业界主流更精确的 Harness 定义："the code that determines what to store, retrieve, and show to the model"——将 Harness 聚焦于信息管道层，而非泛指"模型之外的一切"。消融实验证明完整 trace 访问（50.0%）远优于仅分数（34.6%）和 LLM 摘要（34.9%），原始执行 trace 是不可替代的诊断信号。

## Claims

### Claim: Meta-Harness 给出了比业界主流更精确的 Harness 定义

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：active

> 业界主流（LangChain）定义 Harness 为"模型之外的一切"，边界过于宽泛。Meta-Harness 论文将其精确聚焦为"the code that determines what to store, retrieve, and show to the model"——即控制模型输入输出信息流的那层代码。这个区分在工程实践中至关重要，因为 Meta-Harness 优化的恰恰是这个信息管道。

### Claim: 实际存在两层 Harness——Platform Harness 和 User Harness

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：active

> 内置 Harness（Platform Harness）是 Agent 平台方提供的核心能力（如 Claude Code 的 compaction、Git 集成、子 Agent 生成）；外层 Harness（User Harness）是用户定制层（CLAUDE.md、Skills、GSD/Superpowers 等）。Terminal Bench 2.0 数据证实：同一模型换一层 Harness，性能排名可跳跃 28 位。

### Claim: 完整执行 trace 是不可替代的诊断信号

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.9
- **状态**：active

> 消融实验：仅分数 34.6% → 分数 + LLM 摘要 34.9%（几乎无提升）→ 完整接口含原始 trace 50.0%（+15.4）。LLM 生成的摘要无法恢复丢失的因果信息。Proposer 每轮中位数读取 82 个文件、访问最高 1000 万 tokens 的诊断信息，是之前方法（OPRO/TextGrad/AlphaEvolve）的 400~5000 倍。

### Claim: Harness 优化本质上是一个搜索问题

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：active

> 手工设计 Harness 是当前 AI 系统的主要瓶颈。HumanLayer 博客结论："it's not a model problem. It's a configuration problem." Meta-Harness 将这个手工试错过程自动化为 Propose → Evaluate → Log → Repeat 的搜索循环，约 20 轮迭代、每轮约 3 个候选、总计约 60 个 Harness 变体。

### Claim: Meta-Harness 落地存在三种路径

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.7
- **状态**：active

> 场景 A：从裸模型 API 出发构建完整 Agent（搜索空间无限）；场景 B：基于 Coding Agent 的外层 Harness 优化（CLAUDE.md/Hooks/Skills）；场景 C：Agent + 开源 Harness 框架（GSD/Superpowers）+ Meta-Harness 优化层。三种路径的 Harness 架构、优化空间和适用方式截然不同。

## 冲突与演进

- 与 "Decoding the Configuration of AI Coding Agents"（arxiv 2511.09268v1）论文形成对比：后者仅做描述性统计（CLAUDE.md 配置分布），没有因果分析和效果验证；Meta-Harness 通过消融实验直接证明了 Harness 设计的因果效应。

## 关联概念

- [[harness-engineering]] — `extends` Meta-Harness 是 Harness Engineering 的自动化演进——从手工设计到搜索优化
- [[agent-loop-architecture]] — `uses` Meta-Harness 的 Proposer 运行在 Agent Loop 之上
- [[context-engineering]] — `extends` Meta-Harness 优化的核心正是"给模型看什么、怎么组织上下文"
- [[bitter-lesson]] — `implements` Meta-Harness 用搜索替代人工设计，呼应 Bitter Lesson 的核心主张
- [[claude-code-agent-subagent]] — `uses` 论文选用 Claude Code 作为 Proposer
- [[rtk-token-compression]] — `contrasts` RTK 压缩工具输出是手工 Harness 优化，Meta-Harness 将此过程自动化
- [[cybernetics-agent-design]] — `grounds` 控制论视角下，Meta-Harness 的搜索循环是负反馈 + 探索的工程实现

## 来源日记

- [[2026-04-16-周四]] — 研读 Meta-Harness 论文并撰写解读文章
- [[2026-04-15-周三]] — 今天主任务中首次提及 Meta-Harness 论文
