---
title: "Foundry Agent Service"
created: "2026-11-07"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - azure
  - foundry
  - agent
aliases:
  - "Foundry Agent Service（Azure 上的 agent 运行时）"
  - "Azure AI Agent Service"
  - "Azure AI Foundry Agent"
  - "Foundry Agent"
related:
  - "[[azure-copilot-ecosystem]]"
  - "[[foundry-agent-type-selection]]"
  - "[[copilot-studio]]"
  - "[[github-copilot]]"
  - "[[entra-agent-id]]"
  - "[[agent-sandbox]]"
---

# Foundry Agent Service（Azure 上的 agent 运行时）

## 摘要

Foundry Agent Service（前身 Azure AI Agent Service）是 Azure 上的 **PaaS agent 运行时**，面向要把 AI 做进自己产品的专业开发者：用 SDK / REST / 容器构建，按 Azure 订阅按量计费，治理走 Azure RBAC、私网和 Entra agent identity。它和 [[copilot-studio]]（Power Platform 上的 SaaS 构建产品）、[[github-copilot]]（开发者与代码平台上的 coding agent）是微软 AI 技术栈的三个支柱。

官方 agent 类型现在只有两类：**Prompt Agent**——Foundry 替你运行，你只声明 instructions、tools、model、knowledge；**Hosted Agent**——你用任意框架写代码打包成容器，Foundry 替你托管。原来的 Workflow Agent 已不再是官方类型、定于 2026-12-01 退役，多 agent 编排下沉到 Agent Framework 代码、harness 原语和 A2A。两类怎么选见决策页 [[foundry-agent-type-selection]]，身份模型见 [[entra-agent-id]]；本页收产品定位、运行模型、演进与接缝。

## Claims

### Claim: Foundry 的产品差异在"运行时归谁"——Prompt Agent 是 Foundry 帮你运行，Hosted Agent 是你运行、Foundry 托管；Workflow Agent 已移出官方类型（定于 2026-12-01 退役）

- **来源**：[[Foundry-Agent三种形态对比与选型]]、[[Foundry-Agent与Copilot-Studio的选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active

> Prompt Agent：planner 黑盒、状态由 Thread / Run 承载、调用面是 Responses API，只能用 Foundry 支持的模型；内容安全（Prompt Shield、Content Filter）、审计、成本追踪开箱即用，是 Voice Live agent 绑定唯一支持的类型。Hosted Agent：LangGraph、Agent Framework、OpenAI Agents SDK 等任意框架，镜像推 ACR，Foundry 分配算力、签发专属 Entra agent identity 和 endpoint；planner、记忆、模型（含第三方模型，风险自负）都归你，内容层防护和 planner 内部可观测性要自己补。类比：Prompt 之于 Hosted，如 Azure Functions 之于 Kubernetes。Prompt 与 Hosted 是单个 agent 的两种运行时归属，原来的 Workflow 是之上的编排层，现由 Agent Framework 代码、harness 原语和 A2A 承接。

### Claim: Hosted Agent 的运行模型是"每 session 一个 VM 级沙箱 + 三种调用协议"——Responses 是厚封装（平台托管对话历史），Invocations 是薄封装（直接交出沙箱句柄）

- **来源**：[[Foundry-Agent三种形态对比与选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-11-07
- **置信度**：0.75
- **状态**：active

> 每个 session 一个 VM 级隔离沙箱，带持久文件系统（`$HOME` 与 `/files`），闲置超时后回收算力（默认 15 分钟、可配 2~60 分钟；30 天不活跃永久删除）、恢复时状态自动还原（scale-to-zero + 有状态恢复），没有 replica 数和 warm pool 可配。三种协议可同时暴露：`/responses`（OpenAI Responses 兼容，对话首选）、`/invocations`（任意 JSON 进出，适合 webhook、批处理、AG-UI 这类协议桥接）、`/invocations_ws`（全双工 WebSocket，实时语音等双向流）。协议库内置 OpenTelemetry，trace 进关联的 App Insights。Hosted 还可经 Toolbox MCP endpoint 使用 Foundry 托管工具（Web Search、File Search、Code Interpreter、AI Search、custom MCP、A2A）。

### Claim: 2026 年 Foundry 的路线是"先把运行时做完、编排下沉到代码、再开放托管 harness"——Copilot harness 进入 Foundry 后多了"Microsoft 跑 loop、你只声明"的第三种做法

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]、[[GitHub-Copilot系列01：产品全景与竞争格局]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active

> 时间线：2026-03 Agent Service GA（带私网、Voice Live 与评测）；6 月 Toolboxes、Memory 进 Preview，发布到 Teams / M365 Copilot；7–8 月 Hosted Agent、Voice Live 集成、Toolboxes GA；Workflows 定于 2026-12-01 退役，托管的可视化编排这条路 Foundry 不走了。10 月底 Microsoft Copilot harness in Foundry 公开预览：agent 定义里 `harness.type` 设为 `microsoft_copilot_preview`，Microsoft 运行 agent loop 和沙箱，开发者声明式提供 skills、工具和指令，可用 azd 部署、定义与代码同进版本库——介于 Prompt Agent（全托管、黑盒 planner）和 Hosted Agent（自带框架）之间，用的是 GitHub Copilot / Copilot Studio 同一套 harness。

### Claim: Foundry 与另外两个支柱的硬约束集中在接缝上——Voice Live 的 agent 绑定只认 Prompt Agent，Copilot Studio 调 Foundry agent 要经 connected agent，治理在 Entra Agent ID 与 Agent 365 汇合

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]、[[Foundry-Agent三种形态对比与选型]]、[[Entra-Agent-ID的双层身份模型]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active

> Voice Live 与两类 agent 的组合方向相反：Prompt Agent 用 `agent_id` 绑定（Voice Live 在外），Hosted Agent 用 `invocations_ws`（Voice Live 作为容器内组件），`agent_id` 直连 Hosted 无文档支持。Copilot Studio 一侧，GitHub Copilot harness 可以把 Foundry agent 挂成 connected agent；Foundry agent 能发布进 M365 Copilot 的 Agent Store。两边的 agent 都有 Entra Agent ID，由 Agent 365 统一登记和做访问控制。选型越来越像"每一层用谁"的分层组合：员工在 M365 / Teams 里用先看 Copilot Studio，自有产品后端与外部客户用 Foundry，大脑要自己控制（自定义 planner、长期记忆、非微软模型）就上 Hosted Agent。

### Claim: Foundry 的 skill 是文本而不是可执行代码，能不能用 skill、怎么装进上下文取决于 harness 归谁——换上 Copilot harness 的 Prompt Agent 才能直接挂 skill

- **来源**：[[Foundry-Toolbox与Skills解析]]
- **首次出现**：2026-07-30
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **复核**：2026-11-07 修订——依据：[Use skills with Microsoft Foundry agents (preview)](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/skills)、[What is Toolbox in Microsoft Foundry?](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/toolbox-overview)

> skill 存在项目级目录里、有不可变版本，挂到 toolbox 后以 MCP Resources 暴露，agent 按 advertise（名称与描述进 system prompt）→ load（需要时取全文）→ read resources 三步按需加载，任何支持 MCP Resources 的客户端都能用。直接集成只支持用 Microsoft Copilot harness 的 Prompt Agent；Hosted Agent 自带 harness，经 Toolbox MCP endpoint 取用，加载方式自己决定。Toolbox 发布是不可变版本 + 显式 publish。成本上两类调用侧计费相同，Hosted 的 container compute 买的是"改 harness 的权力"。（2026-11-07 复核：原写"Prompt Agent 侧 skill 支持在文档层面有矛盾"已过时，见 [[foundry-agent-type-selection]] 对应 Claim 的修订。）

## 冲突与演进

- 2026-07-21：Foundry 系列首次提取时只建了决策页 [[foundry-agent-type-selection]]，产品本身未建概念页，论断分散在决策页、[[azure-copilot-ecosystem]]、[[entra-agent-id]]、[[voice-live-agent]]。
- 2026-11-07：用户裁决——GitHub Copilot、Copilot Studio、Foundry Agent Service 是微软 AI 技术栈的三个支柱，学微软技术栈绕不过去，即使是产品名、概念简单也各自单独建页。按此补建本页；选型类论断仍留在决策页，不重复。

## 关联概念

- [[azure-copilot-ecosystem]] — `part-of` Foundry Agent Service 是微软 Copilot / AI 生态里的 PaaS agent 运行时这一支
- [[copilot-studio]] — `contrasts` Copilot Studio 是 SaaS 构建产品，Foundry 是 PaaS 运行时，不在同一层，常分层组合
- [[github-copilot]] — `uses` Foundry 托管 harness（`microsoft_copilot_preview`）用的就是 GitHub Copilot 的那套 Copilot harness
- [[entra-agent-id]] — `uses` 每个 agent 签发 Entra agent identity，Prompt 与 Hosted 身份层同源
- [[agent-sandbox]] — `uses` Hosted Agent 每 session 一个 VM 级隔离沙箱，scale-to-zero + 有状态恢复
- [[foundry-agent-type-selection]] — `constrains` 建 agent 前先在 Prompt / Hosted 之间做运行时归属的选型

## 来源日记

- [[Foundry-Agent三种形态对比与选型]] — 两类 agent 的定位、运行时、十维对比、治理分层、Voice Live 组合、80/20 选型
- [[Foundry-Toolbox与Skills解析]] — Skills API、两种交付模式、Toolbox 版本发布、执行环境与成本模型
- [[Entra-Agent-ID的双层身份模型]] — Blueprint 与 agent identity 双层身份、Foundry 实操
- [[Foundry-Agent与Copilot-Studio的选型]] — 与 Copilot Studio、Voice Live 的分层关系、2026 Roadmap、硬约束与决策树
- [[GitHub-Copilot系列01：产品全景与竞争格局]] — Microsoft Copilot harness in Foundry（公开预览）
