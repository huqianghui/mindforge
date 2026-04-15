---
title: "Claude Code Memory System"
created: "2026-04-13"
updated: "2026-04-15"
tags:
  - wiki
  - concept
  - claude-code
  - memory
  - persistence
aliases:
  - "Claude Code 记忆系统"
  - "Claude Code 六层持久化"
related:
  - "[[claude-code-extension-system]]"
  - "[[claude-code-agent-subagent]]"
  - "[[personal-knowledge-compiler]]"
---

# Claude Code Memory System

## 摘要

Claude Code 拥有一套完整的六层记忆与持久化体系——从硬性的 Settings（强制配置）到柔性的 CLAUDE.md（行为指导），从 Claude 自主积累的 Auto Memory 到完整的 Session Transcripts（对话历史），再到按需加载的 Skills/Agents/MCP（扩展能力）和 App State（全局状态）。每层解决不同的问题，有不同的写入者、执行方式、生命周期和共享范围。理解这套分层架构是高效利用 Claude Code 进行知识管理的基础。

## Claims

### Claim: Claude Code 记忆体系分为六层，每层职责不同

- **来源**：[[2026-04-13-周一]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 六层架构：Settings（强制配置，客户端执行）→ CLAUDE.md + Rules（行为指导，Claude 遵循）→ Auto Memory（Claude 自主笔记，跨 Session）→ Session Transcripts（对话历史，支持续接）→ Skills/Agents/MCP（扩展能力，按需加载）→ App State（全局配置）。关键区分：Settings 机械执行，CLAUDE.md 理解遵循，Memory 按需回忆。

### Claim: Auto Memory 是 Claude Code 最独特的跨 Session 记忆机制

- **来源**：[[2026-04-13-周一]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> Auto Memory 存储于 `~/.claude/projects/<project-path>/memory/`，MEMORY.md 索引文件启动时加载前 200 行/25KB，主题文件按需读取。记忆分 4 类：user（用户画像）、feedback（行为纠正/确认）、project（项目进展）、reference（外部指针）。同一 git repo 的所有 worktree 共享 memory 目录。

### Claim: CLAUDE.md 最佳实践——精简行为规则 + 引用详细文档

- **来源**：[[2026-04-13-周一]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> CLAUDE.md 每次对话完整加载占用上下文窗口。最佳实践：只保留行为规则摘要和 Agent 路由表，详细格式规范/工作流程通过 reference 指向 agent 文件和项目文档。本 vault 从 176 行精简到 98 行后效果更好。

### Claim: Subagent Memory 为 Agent 提供独立的跨 Session 记忆空间

- **来源**：[[2026-04-13-周一]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Agent 定义文件中配置 `memory:` 字段可获得独立记忆：`project`（提交到 git）、`local`（gitignored）、`user`（跨项目）。每个 Subagent 启动时加载自己的 MEMORY.md 前 200 行。适用于需要跨 Session 追踪状态的 Agent（如知识提取器追踪已处理的日记）。

## 冲突与演进

（暂无）

## 关联概念

- [[claude-code-extension-system]] — `extends` Memory 系统与 Skills/Agents/Commands 扩展层协同工作
- [[claude-code-agent-subagent]] — `uses` Subagent Memory 依赖 Agent/Subagent 进程隔离架构
- [[personal-knowledge-compiler]] — `grounds` PKC 的 Auto Memory 和 Agent 记忆是知识编译系统的持久化基础
- [[terminal-multiplexer-for-ai]] — `uses` tmux 持久会话与 Session 记忆互补

## 来源日记

- [[2026-04-13-周一]] — Claude Code 记忆全景文章创作、Memory 文件结构分析
