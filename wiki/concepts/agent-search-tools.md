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
- **最近更新**：2026-11-24
- **置信度**：0.65
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-24 降级——依据：[exa-labs/exa-mcp-server](https://github.com/exa-labs/exa-mcp-server)（Exa 现提供搜索、抓取与多步研究）；本环境的 Tavily 工具同样提供 search、extract、crawl、map、research；[Context7](https://github.com/upstash/context7) 仍专注版本化技术文档（上轮已核）

> **现行结论（2026-11-24 降级）**：Context7 专注版本化技术文档这一点仍成立；但 Exa 与 Tavily 的功能已大量重叠——两者都有搜索、整页抓取和多步研究，"Exa 只做深度语义研究、Tavily 只做实时事实"的分工已不准确，差别更多是检索风格与结果组织方式。选型时按具体任务对比结果质量与成本，而不是按产品标签分工。
>
> 原记录：Exa 用于深度语义研究，Tavily 用于实时事实搜索，Context7 用于版本特定技术文档。

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
- **最近更新**：2026-11-24
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-24 确认——依据：[exa-labs/exa-mcp-server](https://github.com/exa-labs/exa-mcp-server)（官方仓库：托管 MCP 端点调用 Exa API，需 API key）；新的独立一手来源，置信度 +0.1

> **现行结论（2026-11-24 确认）**：官方仓库印证 MCP server 只是接入层，搜索、抓取与研究能力都在 Exa 的云端 API 后面（需要 API key，可连官方托管的远程 MCP 端点，也可以作为 Claude、Codex 插件安装）。工具面比原记录多了：`web_search_exa`、`web_fetch_exa`、`web_search_advanced_exa`，以及多步研究的 `agent_run`。
>
> 原记录：真正的搜索能力是 Exa 专有的云端 crawler + index + embedding + ranking 系统。

### Claim: agent 的外部工具栈可以分四层——检索层找最相关的信息、访问层去具体平台拿原始数据、描述层让 agent 知道工具怎么用、执行层跑命令；按"要什么"选层，而不是在 MCP 与 CLI 之间二选一

- **来源**：[[Agent-Reach与OpenCLI]]
- **首次出现**：2026-03-24
- **最近更新**：2026-11-24
- **置信度**：0.6
- **状态**：active
- **证据类型**：理论

> 检索层是 Exa、Tavily、Context7 这类搜索服务，返回搜索结果与知识片段；访问层是 Agent-Reach 这类抓取编排（把 yt-dlp、gh、社媒抓取、网页阅读等开源工具拼成一个能力包，不需要付费 API key），返回视频、帖子、代码等原始数据；描述层是 OpenCLI 这类 CLI 结构化描述，返回工具 schema 与参数定义；执行层是 yt-dlp、gh、az、kubectl 等命令本身。选择框架：要"找到最相关的信息"用检索服务，要"去某个平台抓数据"用访问层，要"让 agent 理解我的命令行工具"用描述层，要"高效执行本地命令"直接调 CLI；混合场景是检索加抓取分层组合。描述层普及后，访问层的编排框架就不必为每个工具手写调用适配，可以从标准描述自动生成调用。

## 冲突与演进

- 2026-11-24：/revalidate——"Exa MCP 只是协议适配器"确认 0.7 → 0.8；"三大工具互补"降级 0.8 → 0.65（Exa 与 Tavily 功能重叠扩大）。
- 2026-11-24：/extract-knowledge 厚度补抽第二批：Agent-Reach 与 OpenCLI +1（工具栈四层与选择框架）。
（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——待定 2、长效 1

## 关联概念

- [[context-engineering]] — `part-of` 搜索工具是 Context Engineering 的信息获取层

## 来源日记

- [[Agent搜索三剑客：Exa、Tavily与Context7]] — 搜索工具对比与配置
- [[Agent-Reach与OpenCLI]] — 检索、访问、描述、执行四层工具栈
