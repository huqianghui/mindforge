---
title: "Spec Kit"
created: "2026-07-21"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - tool
  - ai-coding
aliases:
  - "spec-kit"
  - "GitHub Spec Kit"
related:
  - "[[spec-driven-development]]"
  - "[[harness-engineering]]"
---

# Spec Kit

## 摘要

Spec Kit 是 GitHub 开源的 SDD（Spec-Driven Development）工具链：十个斜杠命令组成四阶段工作流（Governance / Design / Verification / Execution），把规格驱动方法论编译成 AI 编码 Agent 可执行的命令序列。核心设计包括 Constitution 项目记忆、checklist 作为"英文的单元测试"、Feature=Branch=Worktree=Agent Session 的隐式状态模型，以及面向多 Agent 协作的任务分发扩展。

## Claims

### Claim: 十命令四阶段——SDD 方法论被编译成命令序列

- **来源**：[[Spec-Kit系列01：整体认识]]
- **首次出现**：2026-07-20
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 修订——依据：Spec Kit 官方 README https://github.com/github/spec-kit

> **现行结论（2026-11-07 修订）**：命令已改为 /speckit-* 形式的 agent skills（constitution、specify、plan、tasks、implement、converge，clarify/checklist/analyze 为附加质量门）。「十命令四阶段」核心成立，正文加「现以 skills 形式提供」，并确认 converge 在列
>
> 以下为原记录：
> 十命令分四阶段：Governance（constitution）、Design（specify/clarify/plan）、Verification（analyze/checklist）、Execution（tasks/implement/converge/taskstoissues）。每个命令是一个带模板约束的 prompt，SDD 方法论以命令序列形式固化，用户无需记住方法论本身。

### Claim: checklist 是"Unit tests for English"

- **来源**：[[Spec-Kit系列01：整体认识]]
- **首次出现**：2026-07-20
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：stale
- **证据类型**：产品与服务
- **复核**：2026-11-07 待定——依据：README 本轮抓取未含 checklist「Unit tests for English」措辞，需再查官方 spec-driven.md

> checklist 命令为规格文本生成检查清单——官方定位是"给英文写单元测试"：规格是用自然语言写的程序，checklist 验证其完整性/一致性/无歧义。analyze 验证文档间一致性，converge 验证代码与文档收敛，三者构成文本层的测试金字塔。

### Claim: Constitution 是 Workflow 层项目记忆，与 System Prompt 层是层级错配关系

- **来源**：[[Spec-Kit系列01：整体认识]]
- **首次出现**：2026-07-20
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-07 确认——依据：作者对 Spec Kit 与 PKC 层级模型的类比分析；README 仍以 constitution 命令为项目级原则 https://github.com/github/spec-kit，库内无矛盾

> Constitution 存放在项目仓库、由命令流程在关键节点显式引用检查，属 Workflow 层约束；这与把原则塞进 System Prompt（每次加载但无强制检查点）形成对比——与 PKC memory-promotion 的层级模型同构：需要的约束力决定存放层级，行为规则放弱提示层是层级错配。

### Claim: Active Feature 是隐式状态，Feature=Branch=Worktree=Agent Session

- **来源**：[[Spec-Kit系列01：整体认识]]
- **首次出现**：2026-07-20
- **最近更新**：2026-07-21
- **置信度**：0.7
- **状态**：stale
- **证据类型**：产品与服务
- **复核**：2026-11-07 待定——依据：本轮未核实 .specify/feature.json 与 taskstoissues 的当前行为

> spec-kit 用 `.specify/feature.json` 记录当前 active feature，所有命令隐式作用于它——单 Agent 单 Feature 假设。并行开发的官方姿势是一个 Feature 对应一个 Branch + Worktree + Agent Session，taskstoissues 把 tasks 转成 GitHub Issues 形成多 Agent Work Queue。

### Claim: Scope 粒度——一个 User Value 一个 Spec，Task 约等于可独立提 PR 单元

- **来源**：[[Spec-Kit系列01：整体认识]]
- **首次出现**：2026-07-20
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-07 确认——依据：作者给出的粒度经验值（20~80 tasks），库内无矛盾；非产品事实

> Spec 的粒度锚点是"一个用户价值"（经验值 20~80 个 tasks）；太大则 clarify/analyze 阶段失控，太小则流程开销大于收益。Task 粒度锚点是"可独立提 PR 的单元"，这直接决定了 taskstoissues 多 Agent 分发的可行性。

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——待定 2、确认 2

## 关联概念

- [[spec-driven-development]] — `implements` Spec Kit 是 SDD 方法论的官方工具实现
- [[harness-engineering]] — `implements` 命令模板 + 确定性脚本门禁是 Harness 工程在开发流程上的实现

## 来源日记

- [[Spec-Kit系列01：整体认识]] — 十命令工作流与协作扩展（2026-07-20）
- [[Spec-Kit系列00：SDD、TDD与V-Model融合]] — Constitution 与 V-Model 扩展背景（2026-07-20）
