---
title: "MCP vs CLI"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - mcp
  - cli
  - tool-integration
aliases:
  - "MCP vs CLI"
related:
  - "[[context-engineering]]"
  - "[[opencli]]"
---

# MCP vs CLI

## 摘要

MCP 和 CLI 是 AI Agent 工具集成的两条路线。MCP 的优势是跨应用通用性和动态工具发现，但存在严重的 context 膨胀问题（70+ 工具消耗 15,000-25,000 tokens）。CLI 利用 model 预训练知识，token 效率极高，但缺乏协议级标准化。社区出现了"抛弃 MCP、回归 CLI"的趋势，但两者应共存互补。

## Claims

### Claim: MCP 存在严重 context 膨胀问题

- **来源**：[[MCP vs CLI — 为什么开发者在重新审视 MCP]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 每个 MCP Server 在每次推理调用时通过 tools/list 注入所有工具定义。70+ 工具消耗 15,000-25,000 tokens，占 context window 10%+。

### Claim: CLI 方式 token 效率极高

- **来源**：[[MCP vs CLI — 为什么开发者在重新审视 MCP]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 只需单个 Bash tool 定义，model 利用预训练知识理解命令行工具。

### Claim: 社区出现"回归 CLI"趋势

- **来源**：[[MCP vs CLI — 为什么开发者在重新审视 MCP]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> 驱动因素：MCP 的运维复杂度（额外 server 进程、调试困难、第三方信任需求）。

### Claim: MCP 与 CLI 应共存互补

- **来源**：[[MCP vs CLI — 为什么开发者在重新审视 MCP]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> MCP 的优势是跨应用通用性和动态工具发现；CLI 的优势是成熟 Unix 生态、零协议开销、直接进程调用。选择不是二元的。

## 冲突与演进

（暂无）

## 关联概念

- [[context-engineering]] — `part-of` MCP 是 Context Engineering 的工具接入层
- [[opencli]] — `contrasts` OpenCLI 为 CLI 路线提供标准化接口描述

## 来源日记

- [[MCP vs CLI — 为什么开发者在重新审视 MCP]] — MCP 与 CLI 对比分析
