---
title: "Azure Copilot Ecosystem"
created: "2026-04-11"
updated: "2026-05-24"
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
- **状态**：stale

> 详细分析已整理为文章 → Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践。Azure Copilot Agents 目前处于 preview 阶段，仅支持 Portal UI 交互，不提供编程化 API 或 SDK 接口。

### Claim: Azure 编程化 Agentic 路径 = Azure Skills + Azure MCP Server + CLI

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> agenticInfraOps 推荐集成方案：Azure MCP Server 做查询（200+ Azure 服务工具）+ az/azd/terraform CLI 做部署执行 + Azure Skills 的 AKS 诊断剧本做故障排查。Azure Skills 提供 22 个专家级 Azure 工作流剧本（含 AKS 故障排查、GPU 选型）。

### Claim: Azure MCP Server 覆盖 35+ 服务 200+ 工具

- **来源**：[[Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 开源（MIT），兼容所有 MCP 客户端（Claude Code、GitHub Copilot、Cursor、Windsurf 等）——这是 AI agent 访问 Azure 的通用编程接口。

### Claim: AI Shell (aish) 已归档，az copilot 命令不存在

- **来源**：[[Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> AI Shell 于 2026 年 1 月归档，不再维护。目前没有基于 CLI 的 Azure Copilot 扩展。

### Claim: Azure Skills 三层架构——"脑"（Skills）+"眼"（MCP）+"手"（CLI）

- **来源**：[[Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践]]
- **首次出现**：2026-05-14
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：active

> Azure Skills = 经验丰富的架构师（知道做什么、什么顺序、遇到问题怎么处理）。Azure MCP Server = 监控仪表盘（看到实时状态）。CLI = 操作台按钮（执行变更）。Skills 通过 plugin.json 将三层能力打包：注入 SKILL.md 剧本 + 启动 Azure MCP Server + 启动 Context7 MCP。

### Claim: Azure Skills 预编排工具路由而非让 Agent 自行选择

- **来源**：[[Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践]]
- **首次出现**：2026-05-14
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：active

> SKILL.md 本质是预编排的决策树——每一步该用哪个工具已在剧本中明确规定。AKS 故障排查有显式优先级链（MCP → CLI 回退），azure-kusto 定义了四个精确回退触发条件（超时/不可用/认证失败/空结果），azure-quotas 明确声明 CLI 是唯一可靠方法。选择标准不是"读用 MCP、写用 CLI"，而是"关键专有 API 走 MCP，常见成熟命令走 CLI"。

## 冲突与演进

（暂无）

## 关联概念

- [[skill-hub-ecosystem]] — `part-of` Azure Skills 是 Microsoft 官方的 Skill 实现
- [[mcp-vs-cli]] — `implements` Azure Skills 是 MCP 与 CLI 共存互补的最佳实战案例

## 来源日记

- [[2026-04-11-周六]] — agenticInfraOps 任务中发现 Azure Copilot 限制并整理编程化路径
- [[2026-04-12-周日]] — 追踪任务延续
- [[2026-04-13-周一]] — 追踪任务延续；Microsoft Skills 学习任务
- [[2026-05-14-周四]] — 深入学习 Azure Skills 三层架构和工具路由机制
