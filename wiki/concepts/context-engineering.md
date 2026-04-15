---
title: "Context Engineering"
created: "2026-04-13"
updated: "2026-04-15"
tags:
  - wiki
  - concept
  - context
  - ai-engineering
  - mcp
aliases:
  - "Context Engineering"
  - "上下文工程"
related:
  - "[[harness-engineering]]"
  - "[[mcp-vs-cli]]"
  - "[[context-explosion]]"
---

# Context Engineering

## 摘要

Context Engineering 是从 Prompt Engineering 的正式演进——Prompt Engineering 关注"对模型说什么"，Context Engineering 治理"模型响应时知道什么"。LLM 性能限制很少源于模型本身缺陷，更多是不完整、不一致或不相关的上下文造成的。成熟 AI 系统架构应有 Context Engineering Layer（认知核心）和 Tool Interaction Layer（MCP 服务器），两者各司其职。Context Engineering 是"操作系统"，MCP 是"USB-C 接口"。

## Claims

### Claim: LLM 性能限制通常是上下文问题而非模型缺陷

- **来源**：[[Context Engineering vs. Model Context Protocol]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> LLM performance limitations are rarely due to inherent model flaws -- they are a direct consequence of incomplete, inconsistent, or irrelevant context.

### Claim: Context Engineering 是 Prompt Engineering 的正式演进

- **来源**：[[Context Engineering vs. Model Context Protocol]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> Prompt engineering 关注"说什么"，CE 治理"模型知道什么"。企业采用驱动了这一转变。

### Claim: Context window 应被视为 LLM 的"RAM"

- **来源**：[[Context Engineering vs. Model Context Protocol]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 模型的整个推理工作记忆，用正确信息填充它是核心架构挑战。

### Claim: Context Engineering 是"操作系统"，MCP 是"USB-C 接口"

- **来源**：[[04 - A Comparative Framework]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> CE 整体管理 LLM 的 context window，MCP 提供标准化外部工具/数据接口。两者互补而非竞争。

### Claim: MCP 标准化为未来 AI "App Store" 生态奠基

- **来源**：[[05 - Strategic Implications and Future Outlook]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：active

> Agent 将动态发现、配置和使用全球 MCP 注册表中的能力，无需人类预先配置。

### Claim: AI 的可持续竞争优势来自上下文环境而非模型本身

- **来源**：[[05 - Strategic Implications and Future Outlook]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.8
- **状态**：active

> 优势不来自对某个基础模型的访问，而来自围绕它构建的卓越、专有的 context-rich 环境。

## 冲突与演进

（暂无）

## 关联概念

- [[harness-engineering]] — `part-of` Context Engineering 是 Harness Engineering 的子集
- [[mcp-vs-cli]] — `uses` MCP 是 Context Engineering 的工具接入层
- [[context-explosion]] — `constrains` Context 爆炸是 CE 的核心挑战
- [[agent-search-tools]] — `uses` 搜索工具是 Context Engineering 的信息获取层
- [[context7]] — `uses` Context7 是 Context Engineering 的文档层工具
- [[rtk-token-compression]] — `extends` RTK 是 Context Engineering 在工具链层面的实践

## 来源日记

- [[Context Engineering vs. Model Context Protocol]] — CE vs MCP 关系辨析
- [[04 - A Comparative Framework]] — 操作系统与 USB-C 比喻
- [[05 - Strategic Implications and Future Outlook]] — 战略展望
