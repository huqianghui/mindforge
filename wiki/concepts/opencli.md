---
title: "OpenCLI"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - cli
  - specification
  - agent
aliases:
  - "OpenCLI"
  - "OpenCLI Specification"
related:
  - "[[mcp-vs-cli]]"
  - "[[openclaw-agent-gateway]]"
---

# OpenCLI

## 摘要

OpenCLI 之于 CLI 就如 OpenAPI 之于 HTTP API——它是一个接口描述层（不是框架，不是 agent），让机器通过结构化 JSON/YAML schema 理解如何调用任何 CLI 工具。解决了 LLM Agent 成为 CLI 调用者后，缺乏标准化参数 schema、能力发现和类型安全的根本问题。Agent-Reach 和 OpenCLI 在不同层面解决 CLI-Agent 问题。

## Claims

### Claim: OpenCLI 是 CLI 的 OpenAPI

- **来源**：[[OpenCLI——万物皆可CLI的结构化革命]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 接口描述层，不是框架不是 agent，让机器通过结构化 JSON/YAML schema 理解如何调用任何 CLI 工具。

### Claim: OpenCLI 解决 Agent 调用 CLI 的标准化缺失

- **来源**：[[OpenCLI——万物皆可CLI的结构化革命]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> LLM Agent 成为 CLI 调用者后，缺乏标准化参数 schema、能力发现和类型安全使稳定工具调用不可能。

### Claim: OpenCLI 分离描述与执行

- **来源**：[[OpenCLI——万物皆可CLI的结构化革命]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> spec 层描述 commands/arguments/types，不处理实际工具编排 pipeline。

### Claim: Agent-Reach 与 OpenCLI 在不同层面解决问题

- **来源**：[[Agent-Reach与OpenCLI——命令编排型Agent框架的两条路线]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Agent-Reach 是工具编排 + scraping scaffold，OpenCLI 是标准化接口描述。Agent-Reach 的 SKILL.md 方式等价于 Google Skill Pattern 中的 Tool Wrapper。

## 冲突与演进

（暂无）

## 关联概念

- [[mcp-vs-cli]] — `part-of` OpenCLI 为 CLI 路线提供标准化支撑
- [[openclaw-agent-gateway]] — `part-of` Agent 网关的工具调用层

## 来源日记

- [[OpenCLI——万物皆可CLI的结构化革命]] — OpenCLI 规范解析
- [[Agent-Reach与OpenCLI——命令编排型Agent框架的两条路线]] — 两条路线对比
