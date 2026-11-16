---
title: "Agent Framework"
created: "2026-11-16"
updated: "2026-11-16"
tags:
  - wiki
  - concept
  - agent
  - agent-framework
  - langgraph
  - microsoft-agent-framework
aliases:
  - "Agent 框架"
  - "agent framework"
  - "Microsoft Agent Framework"
  - "LangGraph"
  - "Google ADK"
  - "OpenAI Agents SDK"
  - "Dapr Agents"
related:
  - "[[agent-harness]]"
  - "[[agent-runtime]]"
  - "[[agent-platform]]"
  - "[[agent-infra-three-layers]]"
  - "[[durable-execution]]"
  - "[[graph-engineering]]"
---

# Agent Framework（Agent 框架）

## 摘要

Agent Framework 回答"agent 怎么思考、调工具、管状态"：它提供 loop 原语、状态模型、工具注册、多 agent 编排语义和 checkpoint 逻辑，代表是 Microsoft Agent Framework（Semantic Kernel 与 AutoGen 合流）、LangGraph、Google ADK、OpenAI Agents SDK、Dapr Agents。它是**开发期**的概念——装上什么都不会发生，用它写出来的东西才是一个 harness（对照见 [[agent-harness]]）。

Framework 和 harness 是不同层面的东西：framework 是材料、面向开发者，回答"怎么把 agent 写出来"；harness 是成品、面向模型，回答"agent 运行时怎么思考和行动"。Framework 和 runtime 的边界则是"逻辑 vs 设施"——Session、State、Checkpoint 这些听起来像运行时的能力，framework 都原生提供，但只定义"存什么、何时存、怎么恢复"，存储在哪、进程挂了谁拉起归 [[agent-runtime]]。

## Claims

### Claim: 三层按三个问题划分；Framework 与 Runtime 的边界是"逻辑 vs 设施"，不是"有没有 Session"

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.8
- **状态**：active

> LangGraph（Thread / Checkpointer / Store）、Google ADK（SessionService / MemoryService）、Microsoft Agent Framework（AgentSession / Context Provider）都原生提供 Session 与 State，所以看到"Session 管理"不能就归到 Runtime。真正的分界是：Framework 定义状态长什么样、什么时候存、怎么恢复；Runtime 提供让这些逻辑可靠的环境——存储在哪、进程被杀了谁拉起、两个用户的会话怎么隔离。判别法：问这个能力"换一个 Runtime 还在不在"——换集群仍成立的（状态结构、编排逻辑）属 Framework，换环境要重配的（存储、隔离、网络）属 Runtime。有官方文档支撑（三个框架的 API 名称可核对）。

### Claim: 多 agent 框架比的不是协作抽象，而是生产运行时能力——LangGraph 赢在持久化 checkpoint、类型化状态、human-in-the-loop 与可观测性，AutoGen 输在 API 动荡

- **来源**：[[Graph-Engineering的三重含义]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active

> AutoGen 与 LangGraph 都能表达图（fan-in / fan-out、条件路由），分野在别处：AutoGen 以对话为中心、适合路径未知的探索，但经历 v0.2 → v0.4 破坏性重写、AG2 社区分叉、最终与 Semantic Kernel 一起并入 Microsoft Agent Framework，生产用户信任被消耗；LangGraph 赢在四件与图本身无关的事——checkpoint 持久化（中断线程可断点恢复、挂起不耗资源）、类型化状态、human-in-the-loop 一等公民、LangSmith 可观测性，加上 1.0 的 API 稳定承诺。教训：图好画，图的运维才是护城河。这些"运行时味道"的能力在 framework 里仍是**逻辑**——checkpoint 的格式与时机；存储高可用、进程被杀后谁拉起仍归 [[agent-runtime]]（见上一条）。

### Claim: 五个代码框架按编排方式与状态恢复区分——微软栈要上 Hosted Agent 先用 Microsoft Agent Framework，复杂状态图用 LangGraph，长任务跨审批看 Dapr Agents；共同前提是状态存储外置

- **来源**：[[Agent基础设施系列04：Framework层与三层串联]]、[[Foundry-Agent三种形态对比与选型]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active

> Microsoft Agent Framework：agent + 代码级 workflow，AgentSession 与 workflow checkpoint，Hosted Agent 一等支持、承接退役的 Foundry Workflows。LangGraph：节点 + 条件边，Checkpointer + Store 可落 PostgreSQL，Hosted Agent 与 kagent BYO 都能跑。Google ADK：多 agent + workflow agent，SessionService / MemoryService，kagent 声明式 agent 内部用的就是它的 Go / Python 实现。OpenAI Agents SDK：handoff + guardrail，session 与内置 tracing，轻量。Dapr Agents：DurableAgent 跑在 Dapr Workflow 上，每步落 state store、断点重放，仅 Python。Hosted Agent 里 planner 与 state 都由你的框架持有（Prompt Agent 则全是平台黑盒）。不要把会话和 checkpoint 留在进程内存里，否则 runtime 一换就断。选型来自文档与经验，未做横向实测。

### Claim: 编排正从平台上的可视化产品回到 framework 的代码层——Foundry Workflows 退役后官方指引移回 Microsoft Agent Framework 的代码级 workflow；framework 搭外层确定性流程，开放式的那一步交给 harness

- **来源**：[[Foundry-Agent三种形态对比与选型]]、[[Agent基础设施系列04：Framework层与三层串联]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.65
- **状态**：active

> Foundry Workflows（portal 设计器 + YAML，底层就是 Microsoft Agent Framework）定于 2026-12-01 退役，确定性多 agent 协作收敛为三种机制：Hosted Agent 内用 framework / harness 的编排原语（sequential、concurrent、group-chat、handoff）、A2A 做跨团队委派、Skills 封装流程性知识——微软没有再造托管编排产品，而是把编排交还 framework 生态。对 framework 层的含义：审批、业务规则、多 agent 交接这些"事先能写清"的编排归 framework；需要"自己想办法把活干完"的那一步交给一个 harness（如 MAF workflow 的某个节点调用 GitHub Copilot SDK）。平台侧产品事实见 [[foundry-agent-type-selection]] 的 Workflow 退役 Claim。

### Claim: 一个项目可以横跨两层——Dapr Agents 是 framework，Dapr sidecar 与 workflow 引擎是 runtime；判断归属要按能力拆开看，不按项目名

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active

> 开源项目常同时声称自己是 framework、runtime 甚至 platform。Dapr 是典型：Dapr Agents（DurableAgent）是写 agent 的 Python 框架；sidecar 与 Workflow 引擎（virtual actor 上的持久执行、30 多种 state store、pub/sub、重试熔断、SPIFFE 服务身份）是 runtime。反过来，已用 LangGraph 或 Microsoft Agent Framework 写好的 agent 不想换框架，也能经 Diagrid 的集成单独接上 Dapr 的持久执行——framework 与持久执行设施可以分开选。持久执行的故障语义见 [[durable-execution]]。

### Claim: framework 正在变成协议后面可互换的 backend——前端经 AG-UI、调用方经 Responses / Invocations / A2A、训练侧经 rollout 接口，都不关心 agent 用哪个框架写

- **来源**：[[AG-UI协议解析]]、[[Foundry-Agent三种形态对比与选型]]、[[Agent-Lightning系列08：RL实战]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.65
- **状态**：active

> AG-UI 的官方集成按 Agent Framework（LangGraph、CrewAI、Microsoft Agent Framework、Google ADK、Mastra）分类，前端不改代码就能换 backend；Hosted Agent 对外只暴露 /responses、/invocations、/invocations_ws，容器里用什么框架平台不管；Agent Lightning 的例子里同一套 VERL trainer 训练 AutoGen（calc_x）、LangGraph（spider、chartqa）和 OpenAI Agents SDK（unsloth SFT）写的 agent，trainer 零修改（见 [[environment-agnostic]]）。推论：选框架看的是写起来顺不顺、状态模型合不合适，迁移成本被压在协议与外置状态上——这正是三层之间 Framework ↔ Runtime 的那组接口（[[agent-infra-three-layers]]）。

## 冲突与演进

- 2026-11-16：从 [[agent-infra-three-layers]] 拆出独立建页。首条 Claim（三问划分与逻辑 vs 设施）原在三层页，搬到本页；本次新增框架竞争、五框架选型、编排回归、横跨两层、协议后可互换五条。产品名（LangGraph、Microsoft Agent Framework 等）作别名与证据，不单独建页。
- "framework 是 dev-time 工具包、harness 是 run-time 实体"一条归口 [[agent-harness]]，本页不重复。
- [[framework-selection]] 是 Vibe Coding 框架（GSD / SpecKit / Superpowers）的选型，与本页的 agent framework 同名不同物。

## 关联概念

- [[agent-harness]] — `produces` 用 framework 搭出来的成品就是 harness；Claude Agent SDK、OpenAI Agents SDK 是从成品 harness 抽出来的库，形态是 framework
- [[agent-runtime]] — `contrasts` 逻辑 vs 设施：framework 定义状态与恢复，runtime 让它可靠
- [[agent-platform]] — `contrasts` framework 不管注册、身份与治理
- [[agent-infra-three-layers]] — `part-of` 三层中的 Framework 层
- [[durable-execution]] — `uses` framework 的 checkpoint 只解决"能存能读"，持久执行补上故障检测与重放
- [[graph-engineering]] — `contrasts` LangGraph 时代的图是开发者写的静态资产，新范式下的图由模型在运行时现写
- [[ag-ui-protocol]] — `uses` 前端经 AG-UI 对接任意 framework backend
- [[a2a-protocol]] — `contrasts` 同团队、共享状态、延迟敏感的步骤留在 framework 内编排，跨团队才上 A2A
- [[framework-selection]] — `contrasts` 同名不同物：Vibe Coding 方法论框架

## 来源日记

- [[Agent基础设施系列01：三层划分与自建路线]] — 三问划分、逻辑 vs 设施、Dapr 横跨两层
- [[Agent基础设施系列04：Framework层与三层串联]] — 五框架对比、选 framework 还是 harness、编排回归
- [[Graph-Engineering的三重含义]] — AutoGen vs LangGraph：胜负手在生产运行时
- [[Foundry-Agent三种形态对比与选型]] — Hosted Agent 里 planner 与 state 归你的框架、Workflows 退役后的编排选型
- [[AG-UI协议解析]] — framework 作为可互换 backend
- [[Agent-Lightning系列08：RL实战]] — 同一 trainer 训练不同框架写的 agent
