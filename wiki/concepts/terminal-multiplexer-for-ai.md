---
title: "Terminal Multiplexers for AI"
created: "2026-04-13"
updated: "2026-04-15"
tags:
  - wiki
  - concept
  - tmux
  - cmux
  - terminal
  - remote
aliases:
  - "终端复用器"
  - "tmux"
  - "cmux"
related:
  - "[[claude-code-memory-system]]"
  - "[[oh-my-claude-code]]"
---

# Terminal Multiplexers for AI

## 摘要

终端复用器（tmux、cmux）对 AI Agent 工作流至关重要。tmux 的核心价值是解耦终端会话与终端窗口，实现从任何设备（Mac、iPhone、iPad）通过 SSH 访问持久 Claude Code 会话。cmux = Ghostty + tmux 式会话管理 + AI Agent 集成层，是原生 macOS GUI 终端而非纯终端方案。

## Claims

### Claim: tmux 解耦终端会话与窗口

- **来源**：[[tmux与Claude远程交互实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 实现从任何设备通过 SSH 访问持久 Claude Code 会话。

### Claim: cmux 是 GUI 终端而非纯终端

- **来源**：[[cmux使用笔记——从Ghostty增强到AI Agent终端的实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> Ghostty（终端渲染）+ tmux 式会话管理 + AI Agent 集成层。

### Claim: cmux 架构是 GUI App > Socket API > CLI

- **来源**：[[cmux使用笔记——从Ghostty增强到AI Agent终端的实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.5
- **状态**：active

> CLI 只是 wrapper，Socket API 才是唯一稳定接口，外部调用时 CLI 能力降级。

## 冲突与演进

（暂无）

## 关联概念

- [[claude-code-memory-system]] — `uses` tmux 持久会话与 Claude Code 的 Session 记忆互补
- [[oh-my-claude-code]] — `uses` tmux/cmux 为 OMC 多 Agent 并行提供终端基础设施

## 来源日记

- [[tmux与Claude远程交互实践]] — tmux 实践
- [[cmux使用笔记——从Ghostty增强到AI Agent终端的实践]] — cmux 实践
