---
title: "四层架构质量门禁"
created: "2026-04-23"
updated: "2026-04-23"
tags:
  - wiki
  - method
  - architecture
  - quality
  - vibe-coding
method_type: "layered-strategy"
related_concepts:
  - "[[architecture-testing]]"
  - "[[fitness-functions]]"
  - "[[harness-quality-gate]]"
related_methods:
  - "[[harness-five-dimension-quality-gate]]"
---

# 四层架构质量门禁

## 摘要

在 Vibe Coding 时代，AI Agent 高速生成代码加速了架构腐蚀。本方法将架构质量保障组织为四层递进门禁，从基础格式到 AI 语义审查逐层递进。相比原有五维线性模型，四层模型更强调层级嵌套关系和 AI 辅助层的价值。适用于使用 Harness CI pipeline 的多语言项目。

## 适用条件

- **前置依赖**：项目已有 CI pipeline（Harness/GitHub Actions/GitLab CI）；项目使用 Java/TypeScript/Python 之一
- **适用场景**：AI Agent 辅助编码项目；微服务架构需要架构约束；存量项目渐进治理
- **不适用场景**：单文件脚本；无 CI 的个人项目

## 步骤

### Step 1: Layer 1 — 代码格式与 Lint

- **输入**：代码变更（commit / PR）
- **操作**：通过 pre-commit hook + CI step 执行格式化和基础静态分析
- **输出**：格式统一、风格一致的代码
- **判断标准**：零 lint error
- **工具**：Java（Checkstyle/SpotBugs/PMD）、TypeScript（ESLint/Biome/Prettier）、Python（Ruff/mypy）

### Step 2: Layer 2 — 架构约束执行

- **输入**：通过 Layer 1 的代码
- **操作**：执行架构规则检查——分层约束、包依赖、循环检测、命名规范
- **输出**：架构违规报告
- **判断标准**：零架构违规（或 Ratchets 模式下无新增违规）
- **工具**：Java（ArchUnit/Taikai）、TypeScript（ArchUnitTS/dependency-cruiser/Sheriff）、Python（PyTestArch/Tach）、跨语言（Semgrep/Baseline MCP Server）

### Step 3: Layer 3 — 模块化与复用分析

- **输入**：通过 Layer 2 的代码
- **操作**：分析耦合度、内聚度、代码重复率、时间耦合
- **输出**：模块化健康指标
- **判断标准**：重复率 < 5%（jscpd）、LCOM 内聚度 < 阈值、无新增时间耦合
- **工具**：重复检测（jscpd/PMD CPD/SonarQube）、内聚度（ArchUnitTS LCOM）、行为分析（Code Maat/CodeScene）

### Step 4: Layer 4 — AI 辅助 Review

- **输入**：通过 Layer 3 的代码
- **操作**：用 LLM 理解代码语义结构，自动发现架构问题和重构建议
- **输出**：语义级架构 Review 报告
- **判断标准**：无高优先级架构建议未处理
- **工具**：Claude Code 生态（oh-my-claudecode architect/code-reviewer/simplify）、AI PR Review（PR-Agent/ai-pr-review/Tanagram）、AI IDE（Cursor BugBot/Augment Code）

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| 存量项目有大量历史违规 | Layer 2 使用 Ratchets 棘轮模式 | 只禁新增违规，允许现有违规渐进修复 |
| AI Agent 生成代码 | 增加 Baseline MCP Server | Agent 生成时即查询架构规则，"生成时即遵守" |
| 多语言 monorepo | Layer 2 用 Semgrep 替代语言专用工具 | Semgrep 支持 30+ 语言的 AST 规则 |

## Claims

### Claim: ArchUnit 只覆盖 Layer 2 的一部分，完整架构质量需要四层协作

- **来源**：[[Vibe Coding系列11：架构测试全景——从ArchUnit到AI辅助架构Review的工具链实践]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：active

> Layer 4（AI 辅助 Review）和 Baseline MCP Server（让 Agent 在生成时就遵守规则）是 Vibe Coding 时代最有价值的新增层。

## 实践记录

（暂无）

## 关联概念

- [[architecture-testing]] — `implements` 本方法的 Layer 2 实施架构测试
- [[fitness-functions]] — `implements` 各层的自动化检查即是适应度函数
- [[harness-quality-gate]] — `extends` 将五维线性模型深化为四层递进模型

## 关联方法

- [[harness-five-dimension-quality-gate]] — `extends` 从五维线性扩展为四层递进，增加 AI Review 层

## 来源

- [[Vibe Coding系列11：架构测试全景——从ArchUnit到AI辅助架构Review的工具链实践]] — 四层门禁完整设计
