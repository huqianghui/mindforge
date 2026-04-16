---
title: "Skill Creator & Orchestration"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - skill
  - orchestration
  - claude-code
aliases:
  - "Skill Creator"
  - "智能编排层"
related:
  - "[[skill-runtime]]"
  - "[[claude-code-extension-system]]"
---

# Skill Creator & Orchestration

## 摘要

融合多个 Skill 的正确架构是"编排层而非合并层"——不复制子 skill 代码，而是作为智能编排层通过 Decision Framework 做路由。Skill 跨平台兼容性是事实标准，同一份 SKILL.md 可在 Claude Code、Chat API、OpenAI Codex、Gemini CLI 等多个 AI Agent 中使用。

## Claims

### Claim: 融合 Skill 的正确架构是编排层而非合并层

- **来源**：[[使用Skill-Creator融合多个PPT Skill]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 不复制子 skill 代码，而是作为智能编排层通过 Decision Framework 做路由。

### Claim: Explore Agent 自动分析比人手动对比更全面

- **来源**：[[使用Skill-Creator融合多个PPT Skill]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> 5 个 skill、38 次工具调用约 2 分钟，尤其对工具链细节（如 CJK 字体处理差异）的挖掘更全面。

### Claim: Skill 跨平台兼容性是事实标准

- **来源**：[[Claude Code系列06：Plugin生态调研——协议、最佳实践与自定义plugin开发]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> 同一份 SKILL.md 不仅能在 Claude Code 中运行，也可在 Chat API、OpenAI Codex、Gemini CLI 等其他 AI Agent 中使用。

## 冲突与演进

（暂无）

## 关联概念

- [[skill-runtime]] — `extends` Skill Creator 构建的是 Skill Runtime 的编排层
- [[claude-code-extension-system]] — `part-of` Skill 是 Claude Code 扩展体系的核心组件

## 来源日记

- [[使用Skill-Creator融合多个PPT Skill]] — Skill 融合实践
- [[Claude Code系列06：Plugin生态调研——协议、最佳实践与自定义plugin开发]] — 跨平台兼容性
