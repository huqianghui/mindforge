---
title: "AI-Native Design Tools"
created: "2026-04-13"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - design
  - pencil
  - excalidraw
  - draw-io
aliases:
  - "AI 原生设计工具"
related:
  - "[[ai-native-pipeline]]"
---

# AI-Native Design Tools

## 摘要

AI-Native 设计工具正在改变设计-开发协作模式。Pencil 的核心差异化在于通过原生 MCP 将设计画布暴露给 Claude Code，实现"AI 在画布上设计，人类微调"（vs Figma 的"人类设计，AI 辅助"）。Excalidraw（手绘草图风格）和 Draw.io（专业工程风格）互补——推荐工作流是"先用 Excalidraw 快速草图，再用 Draw.io 出正式架构图"。

## Claims

### Claim: Pencil 通过 MCP 实现 AI 主导设计

- **来源**：[[Pencil设计工具上手指南]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Pencil 是 MCP 驱动的设计画布，Claude Code 通过 MCP 读写 .pen：paralect pen.dev 页 https://www.paralect.com/stack/pen-dev ；daily.dev Pencil 01 https://daily.dev/posts/pencil-01-vibe-design-with-pencil-and-claude-code-znlvofrea（均为第三方，官方文档站未取到，置信度不宜上调）

> Figma 用 plugin 式 AI 集成（人类设计、AI 辅助），Pencil 暴露设计画布给 Claude Code via native MCP，实现"AI designs on canvas, human fine-tunes"。

### Claim: Excalidraw 与 Draw.io 互补

- **来源**：[[在Obsidian中绘制Azure架构图]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：stale
- **证据类型**：实测经验
- **复核**：2026-11-07 待定——依据：本轮未查到支持或反驳的证据；该 claim 为作者工作流推荐，vault 内未检索 Excalidraw/Draw.io 相关新文章

> 推荐工作流："sketch quickly with Excalidraw first, then produce formal architecture diagrams with Draw.io"。

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——确认 1、待定 1

## 关联概念

- [[ai-native-pipeline]] — `part-of` 设计工具是 AI-Native Pipeline 的第一层

## 来源日记

- [[Pencil设计工具上手指南]] — Pencil 实践
- [[在Obsidian中绘制Azure架构图]] — 绘图工具对比
