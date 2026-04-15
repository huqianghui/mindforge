---
title: "Agent 时代四层代码复用防线"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - method
  - agent
  - code-reuse
  - architecture
method_type: "layered-strategy"
related_concepts:
  - "[[code-reuse-in-agent-era]]"
  - "[[harness-engineering]]"
  - "[[claude-code-agent-subagent]]"
related_methods:
  - "[[gsd-five-step-workflow]]"
---

# Agent 时代四层代码复用防线

## 摘要

Coding Agent 存在结构性代码复用缺陷：每次会话倾向从头实现功能而非复用已有代码，因为 agent 缺乏项目全局视角。四层防线的核心思路是**不让 agent 自己学会复用，而是用架构约束让它不得不复用**。四层按优先级从高到低排列，每一层用不同机制"逼迫" agent 遵守复用规则。

## 适用条件

- **前置依赖**：Claude Code（或同类 Coding Agent）、项目有 CLAUDE.md 或等价配置文件
- **适用场景**：L2+ 项目，多模块、多会话协作的中大型项目
- **不适用场景**：L1 级单文件脚本（无复用需求）；纯探索型原型（复用约束是开销）

## 步骤

### Step 1: CLAUDE.md 架构约束（最关键）

- **输入**：项目架构设计、模块边界定义
- **操作**：在 CLAUDE.md 中声明架构规则，如"所有 HTTP 请求必须使用 `lib/http-client.ts`"、"数据库操作必须通过 `dal/` 目录"
- **输出**：Agent 在生成代码时被迫遵循的架构约束
- **判断标准**：CLAUDE.md 覆盖了项目的核心共享模块和依赖规则

### Step 2: FEATURE.md 依赖边界

- **输入**：功能模块划分
- **操作**：为每个 feature 目录创建 FEATURE.md，声明该模块可以依赖哪些其他模块、暴露哪些接口
- **输出**：模块间依赖边界清单
- **判断标准**：Agent 生成新代码时能检查依赖边界，避免重复实现已有模块功能

### Step 3: Superpowers 流程嵌入复用检查

- **输入**：Superpowers workflow 配置
- **操作**：在 Superpowers 的 code-review / verify 流程中加入"复用检查"步骤——Agent 写完代码后自动审查是否有重复实现
- **输出**：复用违规报告
- **判断标准**：Review 流程能自动发现重复代码并要求 Agent 改用已有实现

### Step 4: Plugin 协作

- **输入**：多 Agent 协作场景
- **操作**：通过 Plugin/Skill 机制让 Agent 在需要特定能力时调用已有 Plugin 而非从头实现
- **输出**：跨 Agent 的能力复用
- **判断标准**：相同功能只有一个 Plugin 实现，所有 Agent 共用

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| 新项目初始化 | 优先配置 Step 1（CLAUDE.md） | 最低成本最高收益，一次声明全局生效 |
| 项目已有大量重复代码 | 先执行 Step 3 审查，再回补 Step 1-2 | 先发现问题再设规则 |
| 单人项目 | Step 1-2 足够 | Plugin 协作在单人场景下价值有限 |

## Claims

### Claim: 四层防线是代码复用的真正解法

- **来源**：[[Vibe Coding系列07]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 不让 agent 自己学会复用，而是用架构约束让它不得不复用。四层：CLAUDE.md 架构约束（最关键）> FEATURE.md 依赖边界 > Superpowers 流程嵌入复用检查 > Plugin 协作。

### Claim: 现有框架均未直接解决代码复用

- **来源**：[[Vibe Coding系列07]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Superpowers、gstack、Compound Engineering 没有一个直接解决代码复用——CE 是知识复用不是代码复用。

## 实践记录

<!-- 在实际项目中应用此方法后，记录结果反馈 -->

（暂无实践记录）

## 关联概念

- [[code-reuse-in-agent-era]] — `implements` 此方法的概念定义页
- [[harness-engineering]] — `implements` CLAUDE.md 架构约束是 Harness Engineering 的一部分
- [[claude-code-agent-subagent]] — `constrains` Subagent 上下文隔离加剧了复用困难

## 关联方法

- [[gsd-five-step-workflow]] — `uses` GSD workflow 中可嵌入复用检查步骤

## 来源

- [[Vibe Coding系列07]] — Coding Agent 时代代码复用问题分析与解法
