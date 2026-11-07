---
title: "Context7"
created: "2026-04-13"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - mcp
  - documentation
  - context
aliases:
  - "Context7"
related:
  - "[[agent-search-tools]]"
---

# Context7

## 摘要

Context7 是一个实时文档 MCP Server，解决 LLM 因训练数据截止日期而使用过时 API 参数的问题。架构极简——仅暴露 2 个工具（resolve-library-id 和 query-docs），检索和排序在服务端完成，不消耗 LLM 推理 tokens。支持数千个开源库文档和版本特定查询。

## Claims

### Claim: Context7 解决 LLM 使用过时 API 的问题

- **来源**：[[Context7：实时获取最新文档的MCP-Server]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Context7 官方仓库 https://github.com/upstash/context7（注入最新库文档；两个 MCP 工具）

> LLM 对快速演化 SDK（Azure CLI、Terraform、Bicep）生成的代码经常使用已弃用参数或过时 API 模式。Context7 在推理时注入最新官方文档。

### Claim: 架构极简——仅 2 个工具

- **来源**：[[Context7：实时获取最新文档的MCP-Server]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> resolve-library-id 和 query-docs，检索排序在服务端完成，不消耗 LLM 推理 tokens。

### Claim: 支持版本特定查询和数千库文档

- **来源**：[[Context7：实时获取最新文档的MCP-Server]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Context7 README：libraryId 形如 /vercel/next.js、/mongodb/docs，支持按库查询 https://github.com/upstash/context7（版本后缀写法本轮未逐字核到）

> 不限于 Azure，支持数千个开源库文档和版本特定查询（如 /vercel/next.js@14）。

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——确认 2

## 关联概念

- [[agent-search-tools]] — `part-of` Context7 是 Agent 搜索三剑客之一

## 来源日记

- [[Context7：实时获取最新文档的MCP-Server]] — Context7 使用实践
