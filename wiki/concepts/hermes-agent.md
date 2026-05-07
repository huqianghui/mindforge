---
title: "Hermes Agent"
created: "2026-05-07"
updated: "2026-05-07"
tags:
  - wiki
  - concept
  - agent
  - self-improving
  - skill-lifecycle
aliases:
  - "Hermes"
  - "Nous Research Agent"
  - "Skill Curator"
related:
  - "[[continual-self-improving-ai]]"
  - "[[openclaw-agent-gateway]]"
  - "[[skill-hub-ecosystem]]"
  - "[[ai-skill-formation]]"
---

# Hermes Agent

## 摘要

Hermes Agent 是 Nous Research 于 2026 年 2 月开源的自主 AI Agent 框架（Python，MIT），核心理念为"The agent that grows with you"——强调持久运行与自我学习。区别于 OpenClaw 的多 Agent 分布式架构，Hermes 采用**单体持久进程**设计，内置 Skill 自动生成循环和 Curator 生命周期管理系统。其独特之处在于：每 15 次工具调用自动回顾和总结可复用模式为 Skill，Curator 系统跟踪 Skill 使用频率并管理 `active → stale → archived` 生命周期流转。这使 Hermes 成为当前唯一具备**工程级 Skill 自我演化闭环**的开源 Agent 框架。

## Claims

### Claim: Hermes Skill 自动生成基于工具调用计数器（每 15 次），非 cron 定时

- **来源**：[[hermes-agent-vs-openclaw]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.7
- **状态**：active

> 每 15 次工具调用（tool calls），Agent 暂停执行流回顾本次会话中成功的工具链模式，异步 fork 辅助 AIAgent 实例生成 Skill 文件到 `~/.hermes/skills/`。这是启发式机制而非固定定时任务。来源：Hermes Agent Guide for PMs + 官方文档。

### Claim: Curator 系统管理 Agent 自动创建的 Skill 生命周期（active → stale → archived）

- **来源**：[[hermes-agent-vs-openclaw]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.8
- **状态**：active

> Curator 跟踪每个 Skill 的查看次数、使用次数、修补次数。触发条件：距上次运行 7+ 天 且 Agent 空闲 2+ 小时。会 fork 辅助 LLM 实例进行审查，提出合并建议或修补 drift。永不自动删除，最坏是归档（可恢复）。仅审查 Agent 自动创建的 Skill，不动 bundled 和 hub-installed 的。来源：Hermes 官方 Curator 文档。

### Claim: Hermes 支持手动触发 Skill 生成（skill_manage 工具 + CLI + 对话指令）

- **来源**：[[hermes-agent-vs-openclaw]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.8
- **状态**：active

> 除自动学习循环外，Skill 生成可通过多种方式手动触发：直接在 `~/.hermes/skills/` 下手写 SKILL.md、对话中告诉 Agent "save this as a skill"（调用 skill_manage 工具）、从 agentskills.io 安装（hermes skills install）、或在 config.yaml 中调整学习循环参数。来源：Hermes Creating Skills 官方文档。

### Claim: Hermes 的 Skill Validation（自动化质量检查）尚未完善（Issue #416）

- **来源**：[[hermes-agent-vs-openclaw]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.7
- **状态**：active

> 当前 skill_manage 创建 Skill 时缺少自动化质量检查（Python 语法验证、YAML 格式校验等）。社区正在通过 GitHub Issue #416 推进 Skill Linting 功能。当前最佳实践是 `hermes curator run --dry-run` 预览 + 手动 pin 验证过的 Skill。

### Claim: Hermes 采用单体持久进程架构，与 OpenClaw 的 Gateway+Node 分布式架构形成对比

- **来源**：[[hermes-agent-vs-openclaw]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.8
- **状态**：active

> Hermes 是单 AIAgent 对象包含所有模块（Prompt Builder + LLM Provider + Tool Scheduler + Memory + Skill System + Curator），通过 Gateway 对接 15+ 平台。内存存储使用 SQLite + FTS5 全文索引。OpenClaw 则解耦为 Gateway（控制面）+ Agent Node（执行面），支持多实例横向扩展。

## 冲突与演进

（暂无）

## 关联概念

- [[continual-self-improving-ai]] — `implements` Hermes 是持续自我改进 AI 理念的工程实现
- [[openclaw-agent-gateway]] — `contrasts` 单体 vs 分布式两种 Agent 架构路线
- [[skill-hub-ecosystem]] — `part-of` Hermes 的 agentskills.io 是 Skill Hub 生态的一部分
- [[ai-skill-formation]] — `extends` Skill 自动生成是 AI Skill Formation 的工程化落地

## 来源日记

- [[hermes-agent-vs-openclaw]] — Hermes Agent vs OpenClaw 深度技术对比文章
