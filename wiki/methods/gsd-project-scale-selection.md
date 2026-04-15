---
title: "GSD 项目规模分级与工具选择"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - method
  - gsd
  - superpowers
  - framework
method_type: "decision-framework"
related_concepts:
  - "[[framework-selection]]"
  - "[[context-explosion]]"
  - "[[three-layer-plugin-architecture]]"
related_methods:
  - "[[ai-native-five-layer-pipeline]]"
  - "[[gsd-five-step-workflow]]"
---

# GSD 项目规模分级与工具选择

## 摘要

GSD 项目规模分级是一个决策框架，用于根据项目复杂度选择合适的 Vibe Coding 工具组合。核心洞察：项目复杂度应按**"需要同时保持在 Context 中的关联信息量"**而非代码行数来定级——50 行 LangGraph 编排文件可能比 500 行 CRUD 更复杂。不同规模的项目适用不同的工具组合，过度使用工具链在简单项目中是纯开销。

## 适用条件

- **前置依赖**：了解 GSD、Superpowers、OpenSpec 等框架的基本概念
- **适用场景**：启动新项目或评估现有项目的工具需求时
- **不适用场景**：项目工具链已确定且运行良好

## 步骤

### Step 1: 评估项目复杂度

- **输入**：项目需求描述、现有代码库（如有）
- **操作**：按 Context 信息量而非代码行数评估项目规模等级
- **输出**：项目规模等级（L1 / L2 / L3 / L4）
- **判断标准**：见下方决策点表

### Step 2: 选择工具组合

- **输入**：项目规模等级
- **操作**：根据等级匹配工具组合
- **输出**：确定的工具链配置
- **判断标准**：工具链覆盖项目需求，没有不必要的工具开销

### Step 3: 配置工具集成

- **输入**：选定的工具组合
- **操作**：配置 CLAUDE.md、安装插件、设置 workflow
- **输出**：可用的开发环境
- **判断标准**：各工具间协作正常，路由规则无歧义

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| **L1**：单文件/脚本，Context 完全可控 | Claude Code 裸跑，跳过 GSD | 不存在 Context Rot，GSD 是纯开销 |
| **L2**：多文件模块，Context 需要管理 | GSD + Superpowers | GSD 的"甜蜜点"——足够复杂需结构化，又没触发 Context 上限 |
| **L3**：跨模块系统，Context 开始吃紧 | GSD + Superpowers + OpenSpec/SpecKit | 需要 Spec 管理变更增量，避免 Context 爆炸 |
| **L4**：超大规模，Context 溢出 | 全套工具 + 手动拆分 | 任何单一框架都无法独立处理 |

## Claims

### Claim: 项目复杂度应按 Context 信息量而非代码行数定级

- **来源**：[[Vibe Coding系列06]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 50 行 LangGraph 编排文件可能比 500 行 CRUD 更复杂。

### Claim: L1 项目不存在 Context Rot，GSD 是纯开销

- **来源**：[[Vibe Coding系列06]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 单文件/脚本级项目应跳过 GSD 直接执行。

### Claim: L2 项目是 GSD 的"甜蜜点"

- **来源**：[[Vibe Coding系列06]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 项目足够复杂需要结构化，但又没复杂到触发 Context 上限。

## 实践记录

<!-- 在实际项目中应用此方法后，记录结果反馈 -->

（暂无实践记录）

## 关联概念

- [[framework-selection]] — `implements` 此方法的概念定义页
- [[context-explosion]] — `constrains` Context 爆炸是 L3/L4 项目的核心挑战
- [[three-layer-plugin-architecture]] — `uses` 三层架构是 L3+ 项目的工具组合方案

## 关联方法

- [[ai-native-five-layer-pipeline]] — `uses` Pipeline 是 L2+ 项目的完整开发流程
- [[gsd-five-step-workflow]] — `uses` GSD 五步是 L2 项目的具体执行方法

## 来源

- [[Vibe Coding系列06]] — GSD 项目规模分级实践
- [[Vibe Coding系列04]] — 框架选型指南
