---
title: "Agent Search Tools"
created: "2026-04-13"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - search
  - exa
  - tavily
  - context7
aliases:
  - "AI Agent 搜索三剑客"
  - "Exa / Tavily / Context7"
related:
  - "[[context-engineering]]"
---

# Agent Search Tools

## 摘要

Exa、Tavily 和 Context7 是 AI Agent 的三大搜索工具，覆盖不同搜索需求象限：Exa 用于深度语义研究，Tavily 用于实时事实搜索，Context7 用于版本特定技术文档。传统搜索引擎返回"链接列表"不适合 Agent 消费，Agent 需要结构化、可直接消费的内容。

## Claims

### Claim: 三大搜索工具互补而非可替代

- **来源**：[[Agent搜索三剑客：Exa、Tavily与Context7]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale
- **证据类型**：产品与服务
- **复核**：2026-11-07 待定——依据：本轮未能核实 Exa/Tavily 当前定位（Tavily 限流）；仅确认 Context7 仍是文档检索 MCP https://github.com/upstash/context7

> Exa 用于深度语义研究，Tavily 用于实时事实搜索，Context7 用于版本特定技术文档。

### Claim: Agent 需要结构化内容而非链接列表

- **来源**：[[Agent搜索三剑客：Exa、Tavily与Context7]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（grep wiki/Notes/paper 关键词，未见相反表述）；关键词 link lists

> 传统搜索引擎返回的"link lists"不适合 Agent 消费。

### Claim: Exa MCP Server 只是协议适配器

- **来源**：[[Agent搜索三剑客：Exa、Tavily与Context7]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale
- **证据类型**：产品与服务
- **复核**：2026-11-07 待定——依据：本轮未查到 Exa 官方 MCP 实现说明（Tavily 限流）

> 真正的搜索能力是 Exa 专有的云端 crawler + index + embedding + ranking 系统。

### Claim: agent 的外部工具栈可以分四层——检索层找最相关的信息、访问层去具体平台拿原始数据、描述层让 agent 知道工具怎么用、执行层跑命令；按"要什么"选层，而不是在 MCP 与 CLI 之间二选一

- **来源**：[[Agent-Reach与OpenCLI]]
- **首次出现**：2026-03-24
- **最近更新**：2026-11-24
- **置信度**：0.6
- **状态**：active
- **证据类型**：理论

> 检索层是 Exa、Tavily、Context7 这类搜索服务，返回搜索结果与知识片段；访问层是 Agent-Reach 这类抓取编排（把 yt-dlp、gh、社媒抓取、网页阅读等开源工具拼成一个能力包，不需要付费 API key），返回视频、帖子、代码等原始数据；描述层是 OpenCLI 这类 CLI 结构化描述，返回工具 schema 与参数定义；执行层是 yt-dlp、gh、az、kubectl 等命令本身。选择框架：要"找到最相关的信息"用检索服务，要"去某个平台抓数据"用访问层，要"让 agent 理解我的命令行工具"用描述层，要"高效执行本地命令"直接调 CLI；混合场景是检索加抓取分层组合。描述层普及后，访问层的编排框架就不必为每个工具手写调用适配，可以从标准描述自动生成调用。

## 冲突与演进

- 2026-11-24：/extract-knowledge 厚度补抽第二批：Agent-Reach 与 OpenCLI +1（工具栈四层与选择框架）。
（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——待定 2、长效 1

## 关联概念

- [[context-engineering]] — `part-of` 搜索工具是 Context Engineering 的信息获取层

## 来源日记

- [[Agent搜索三剑客：Exa、Tavily与Context7]] — 搜索工具对比与配置
- [[Agent-Reach与OpenCLI]] — 检索、访问、描述、执行四层工具栈
