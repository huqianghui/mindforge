---
title: "Claude Code Extension System"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - claude-code
  - plugin
  - skill
  - command
aliases:
  - "Claude Code 扩展体系"
  - "Command / Skill / Agent / Plugin"
related:
  - "[[skill-hub-ecosystem]]"
  - "[[claude-code-agent-subagent]]"
  - "[[skill-runtime]]"
---

# Claude Code Extension System

## 摘要

Claude Code 的扩展体系经历三次演进：Command（固定 prompt 模板，共享主 session context）→ Skill（知识注入，被动触发，AI 自动判断加载）→ Plugin（命名空间隔离 + Marketplace 分发）。Plugin 是分发单元不是运行时单元——安装后被"拆包"，运行时 model 看到的是独立的 tool/skill/command。

## Claims

### Claim: Command / Skill / Agent 三层扩展各有定位

- **来源**：[[Claude Code扩展三剑客]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> Command 是 prompt 模板（快捷入口，共享主 session context），Skill 是知识注入（被动触发，AI 自动判断加载），Agent 是独立角色（独立 context window，可限制工具和模型）。

### Claim: Plugin 是 Coding Agent 从"工具"走向"平台"的关键拐点

- **来源**：[[Coding Agent Plugin生态调研]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 将 Skill/Command/Subagent/Hook/MCP 统一封装为可安装、可版本化的模块，类似 VS Code Extension 生态能力。

### Claim: Plugin 是分发单元不是运行时单元

- **来源**：[[Coding Agent Plugin生态调研]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 安装后被"拆包"，运行时 model 看到的是独立的 tool/skill/command，完全不感知"Plugin"概念。

### Claim: 扩展机制经历三次演进

- **来源**：[[Coding Agent Plugin生态调研]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Command → Skill → Plugin。Anthropic 明确表示未来 Plugin 将成为标准扩展方式。

## 冲突与演进

（暂无）

## 关联概念

- [[skill-hub-ecosystem]] — `extends` Plugin 生态的社区实现
- [[claude-code-agent-subagent]] — `uses` Agent 是扩展体系的第三层
- [[skill-runtime]] — `uses` Skill 的运行时执行模型

## 来源日记

- [[Claude Code扩展三剑客]] — Command/Skill/Agent 三层解析
- [[Coding Agent Plugin生态调研]] — Plugin 生态与演进
