---
title: "共轭变换（Conjugate Transformation）"
created: "2026-04-17"
updated: "2026-04-17"
tags:
  - wiki
  - concept
  - cybernetics
  - control-theory
  - representation
  - harness-engineering
aliases:
  - "共轭变换"
  - "Conjugate Transformation"
  - "Conjugate Transform"
related:
  - "[[cybernetics-agent-design]]"
  - "[[context-engineering]]"
  - "[[harness-engineering]]"
---

# 共轭变换（Conjugate Transformation）

## 摘要

共轭变换是控制论中"最深刻的概念之一"：把一个在原始空间中难以解决的问题，变换到另一个空间中去解决，再变换回来。在 AI Agent 设计中，共轭变换对应 Harness 的表示层（Representation Layer）设计——L 将世界编码为模型输入，L⁻¹ 将模型输出解码为世界动作。

核心洞察：如果 Agent 很"聪明"但做不对事，90% 是共轭变换设计错了——不是推理问题，是表示问题。方法论原则：先设计 L（共轭变换），再写 prompt。

## Claims

### Claim: Agent 失败的首要原因是表示错误而非推理错误

- **来源**：[[控制论与科学方法论——从控制论到AI Agent设计方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 如果 Agent 很"聪明"但做不对事，90% 是共轭变换设计错了。方法论原则：先设计 L（共轭变换），再写 prompt。"不要问用什么 prompt，要问世界是怎么被编码的。"

### Claim: 四种常见变换类型对应不同任务需求

- **来源**：[[控制论与科学方法论——从控制论到AI Agent设计方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> text（推理与规划）、JSON（工具调用）、embedding（语义搜索）、AST（代码操作）——选错变换类型会导致关键信息丢失。

### Claim: 共轭变换是正交设计维度而非单一层级

- **来源**：[[控制论与科学方法论——从控制论到AI Agent设计方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 共轭变换不只存在于 L3 Skills，而是 L2 任务分解、L3 能力抽象、L4 工具调用中都有体现——它是每个模块都需要考虑的设计维度。

## 冲突与演进

- 2026-04-17：首次从控制论视角定义共轭变换在 Agent 设计中的角色。

## 关联概念

- [[cybernetics-agent-design]] — `part-of` 共轭变换是控制论三大机制之一
- [[context-engineering]] — `implements` Context Engineering 的核心工作就是设计共轭变换
- [[harness-engineering]] — `grounds` 表示层设计是 Harness 工程的关键环节
- [[negative-feedback]] — `uses` 负反馈的 error 计算依赖正确的表示（共轭变换）

## 来源日记

- [[控制论与科学方法论——从控制论到AI Agent设计方法论]] — Section 3.2 共轭变换的完整定义与工程映射
