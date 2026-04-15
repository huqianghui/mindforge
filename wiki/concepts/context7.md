---
title: "Context7"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - mcp
  - documentation
  - context
aliases:
  - "Context7"
related:
  - "[[context-engineering]]"
  - "[[agent-search-tools]]"
---

# Context7

## 摘要

Context7 是一个实时文档 MCP Server，解决 LLM 因训练数据截止日期而使用过时 API 参数的问题。架构极简——仅暴露 2 个工具（resolve-library-id 和 query-docs），检索和排序在服务端完成，不消耗 LLM 推理 tokens。支持数千个开源库文档和版本特定查询。

## Claims

### Claim: Context7 解决 LLM 使用过时 API 的问题

- **来源**：[[Context7：让 AI Agent 实时获取最新文档的 MCP Server——以 Azure 文档为例]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> LLM 对快速演化 SDK（Azure CLI、Terraform、Bicep）生成的代码经常使用已弃用参数或过时 API 模式。Context7 在推理时注入最新官方文档。

### Claim: 架构极简——仅 2 个工具

- **来源**：[[Context7：让 AI Agent 实时获取最新文档的 MCP Server——以 Azure 文档为例]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> resolve-library-id 和 query-docs，检索排序在服务端完成，不消耗 LLM 推理 tokens。

### Claim: 支持版本特定查询和数千库文档

- **来源**：[[Context7：让 AI Agent 实时获取最新文档的 MCP Server——以 Azure 文档为例]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 不限于 Azure，支持数千个开源库文档和版本特定查询（如 /vercel/next.js@14）。

## 冲突与演进

（暂无）

## 关联概念

- [[context-engineering]] — `part-of` Context7 是 Context Engineering 的文档层工具
- [[agent-search-tools]] — `part-of` Context7 是 Agent 搜索三剑客之一

## 来源日记

- [[Context7：让 AI Agent 实时获取最新文档的 MCP Server——以 Azure 文档为例]] — Context7 使用实践
