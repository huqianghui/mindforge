---
title: "Skill Pattern"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - google
  - skill
  - cognitive-architecture
aliases:
  - "Google Five Skill Patterns"
  - "Skill 认知模式"
related:
  - "[[skill-runtime]]"
  - "[[agent-paradigms]]"
  - "[[harness-engineering]]"
---

# Skill Pattern

## 摘要

Google 定义的五种 Skill Pattern 构成 Agent 的认知架构：Level 0 = Tool Wrapper（知识获取）、Level 1 = Generator + Reviewer（输出控制）、Level 2 = Inversion（输入控制）、Level 3 = Pipeline（流程控制）。Skill 与 Tool 本质不同——Tool 是确定性函数，Skill 是可复用的认知模式（"思考 + 执行结构"）。Skill Pattern 和 Agent Pattern 是两个正交系统。

## Claims

### Claim: Skill 与 Tool 本质不同

- **来源**：[[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> Tool 是确定性函数，Skill 是可复用的认知模式（"thinking + execution structure"）。

### Claim: 五种 Skill Patterns 构成分层控制模型

- **来源**：[[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Level 0 = Tool Wrapper（知识获取）、Level 1 = Generator + Reviewer（输出控制）、Level 2 = Inversion（输入控制）、Level 3 = Pipeline（流程控制）。

### Claim: Skill Pattern 和 Agent Pattern 是两个正交系统

- **来源**：[[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> Skill Patterns 定义认知能力，Agent Patterns 定义运行时行为。类比：厨师技能（刀工、火候）vs 烹饪流程（备料、翻炒、摆盘）。

### Claim: Inversion 模式是需求分析和架构设计阶段的关键模式

- **来源**：[[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 强制 Agent 先提问再行动，解决最常见的失败模式："wild assumption + direct generation"。

### Claim: Skill 的核心价值是让模型"看到正确信息"

- **来源**：[[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 不是让模型更聪明，而是作为动态 context loader 定位在 context window 尾部（attention 优势位置）。

## 冲突与演进

（暂无）

## 关联概念

- [[skill-runtime]] — `grounds` Skill Pattern 是 Skill Runtime 的认知架构基础
- [[agent-paradigms]] — `contrasts` Agent Pattern 与 Skill Pattern 正交互补
- [[harness-engineering]] — `grounds` Skill Pattern 是 Harness 设计的认知层

## 来源日记

- [[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]] — Google 五种 Skill Pattern 全面解析
