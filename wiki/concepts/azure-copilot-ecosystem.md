---
title: "Azure Copilot Ecosystem"
created: "2026-04-11"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - azure
  - copilot
  - mcp
aliases:
  - "Azure Copilot"
  - "Azure Skills"
  - "Azure MCP Server"
related:
  - "[[llm-wiki]]"
  - "[[skill-hub-ecosystem]]"
---

# Azure Copilot Ecosystem

## 摘要

Azure Copilot 生态包含三个层次：Azure Copilot Agents（Portal UI 内置 Agent）、Azure Skills（22 个专家级工作流剧本）、Azure MCP Server（200+ Azure 服务工具的 MCP 协议实现）。当前 Copilot Agents 仅限 Portal 交互，无 API/SDK 暴露，因此编程化的 Agentic Infrastructure 路径需要组合使用 Skills + MCP Server + CLI。

## Claims

### Claim: Azure Copilot Agents 仅限 Portal UI，无 API/SDK

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 详细分析已整理为文章 → Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践。Azure Copilot Agents 目前处于 preview 阶段，仅支持 Portal UI 交互，不提供编程化 API 或 SDK 接口。

### Claim: Azure 编程化 Agentic 路径 = Azure Skills + Azure MCP Server + CLI

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> agenticInfraOps 推荐集成方案：Azure MCP Server 做查询（200+ Azure 服务工具）+ az/azd/terraform CLI 做部署执行 + Azure Skills 的 AKS 诊断剧本做故障排查。Azure Skills 提供 22 个专家级 Azure 工作流剧本（含 AKS 故障排查、GPU 选型）。

### Claim: Azure MCP Server 覆盖 35+ 服务 200+ 工具

- **来源**：[[Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 开源（MIT），兼容所有 MCP 客户端（Claude Code、GitHub Copilot、Cursor、Windsurf 等）——这是 AI agent 访问 Azure 的通用编程接口。

### Claim: AI Shell (aish) 已归档，az copilot 命令不存在

- **来源**：[[Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> AI Shell 于 2026 年 1 月归档，不再维护。目前没有基于 CLI 的 Azure Copilot 扩展。

## 冲突与演进

（暂无）

## 关联概念

- [[llm-wiki]] — `uses` Azure 企业级 LLM Wiki 方案依赖 Azure AI Search
- [[skill-hub-ecosystem]] — `part-of` Azure Skills 是 Microsoft 官方的 Skill 实现

## 来源日记

- [[2026-04-11-周六]] — agenticInfraOps 任务中发现 Azure Copilot 限制并整理编程化路径
- [[2026-04-12-周日]] — 追踪任务延续
- [[2026-04-13-周一]] — 追踪任务延续；Microsoft Skills 学习任务
