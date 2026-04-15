---
title: "Skill Runtime"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - skill
  - runtime
  - agent
aliases:
  - "Skill Runtime"
  - "Skill 运行时"
related:
  - "[[context-explosion]]"
  - "[[skill-pattern]]"
  - "[[claude-code-extension-system]]"
---

# Skill Runtime

## 摘要

Skill Runtime 是解决 Context 爆炸问题的范式方案：从 document-centric（全量拼接）迁移到 capability-centric（按需投影）。核心流程是"query → intent parse → skill match → context projection → execution"。Context 是声明式的（YAML schema 定义 I/O/依赖），而非全量拼接的文档。

## Claims

### Claim: 行业缺失的方案是 Skill Runtime 模式

- **来源**：[[Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> query 触发 intent parse -> skill match -> context projection -> execution。

### Claim: Skill Runtime 的 context 是声明式的

- **来源**：[[Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> YAML schema 定义输入/输出/依赖，而非全量拼接的文档——从 document-centric 到 capability-centric 的范式迁移。

### Claim: 评估 Agent system 能否 scale 的 5 个自检问题

- **来源**：[[Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 谁决定用哪个 skill、context 是否全量拼接、skill 有无明确 I/O、context 是否 externalizable、execution 是否 independent。

## 冲突与演进

（暂无）

## 关联概念

- [[context-explosion]] — `constrains` Skill Runtime 是 Context 爆炸的解法方向
- [[skill-pattern]] — `grounds` Google 的 Skill Pattern 是 Skill Runtime 的认知架构基础
- [[claude-code-extension-system]] — `implements` Claude Code 的 Skill 机制是 Skill Runtime 的实际实现

## 来源日记

- [[Vibe Coding系列05]] — Skill Runtime 范式提出
