---
title: "Agent Infrastructure Three Layers"
created: "2026-11-04"
updated: "2026-11-16"
tags:
  - wiki
  - concept
  - agent
  - agent-runtime
  - agent-platform
  - agent-framework
aliases:
  - "Agent 基础设施三层"
  - "Framework / Runtime / Platform 三层划分"
  - "Agent Framework vs Agent Runtime vs Agent Platform"
related:
  - "[[agent-framework]]"
  - "[[agent-harness]]"
  - "[[agent-runtime]]"
  - "[[agent-platform]]"
  - "[[agent-sandbox]]"
  - "[[harness-engineering]]"
  - "[[harness-portability-spectrum]]"
  - "[[foundry-agent-type-selection]]"
  - "[[entra-agent-id]]"
  - "[[agent-session-control-plane]]"
  - "[[durable-execution]]"
---

# Agent Infrastructure Three Layers（Agent 基础设施三层）

## 摘要

把 agent 的基础设施按三个问题分层：**Framework** 回答"agent 怎么思考、调工具、管状态"，**Runtime** 回答"agent 在哪跑、怎么隔离、怎么扩缩、崩了怎么续"，**Platform** 回答"企业怎么发现、授权、治理、运营这些 agent"。Harness 是用 Framework 搭出来的成品，在 Runtime 眼里是一个被托管、可替换的进程，不单列一层。

本页是这组概念的总图，只放跨层的判断：两类托管产品各在哪一层、每种选择定死了哪几格、层与层之间靠什么接口换得动。每一层各有独立页——[[agent-framework]]、[[agent-harness]]、[[agent-runtime]]、[[agent-platform]]。新概念几乎都出在 Runtime：会话、模型接入、A2A、沙箱、逐请求授权，都挂在 [[agent-runtime]] 下面；Copilot Studio、Foundry、Copilot Managed Runtime 和 AKS 上自建的那一套，是广义的 agent platform，见 [[agent-platform]]。

## Claims

### Claim: Hosted Agent 是托管的 Runtime、Agent 365 是 Platform 控制面——两者不在同一层，自建 runtime 与 Agent 365 不冲突

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]、[[Agent基础设施系列04：Framework层与三层串联]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.8
- **状态**：active

> Foundry Hosted Agent 是"framework 自选、runtime 托管"：任意框架写的 agent 打成容器，平台负责镜像版本、agent 身份、会话存储、每会话一个 VM 级沙箱。Agent 365 是 Platform 层（统一注册表 + Entra Agent ID + Defender / Purview），它不运行 agent。所以跑在自己 AKS 上的 agent 照样能申请 Entra Agent ID、登记进 Agent 365。客户要的"自主可控"多数指 Runtime 这一层，而不是自己再造一个 Platform；三条路（Hosted Agent / 自建 runtime / API 型 agent 就是普通服务）可在同一企业并存，身份与台账统一收在 Entra 与 Agent 365。

### Claim: 每种选择都在三层上定死了几格——锁定看两个维度：harness 自己搭还是现成的、runtime 自己运营还是平台托管

- **来源**：[[Agent基础设施系列04：Framework层与三层串联]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.7
- **状态**：active

> "没有哪个产品是没有这些层，只是替你把其中几层定死了。"四个组合各有代表：自己搭 + 自己运营（MAF / LangGraph 跑在 kagent）、自己搭 + 平台托管（Foundry Hosted Agent）、现成 harness + 自己运营（Claude Code / OpenClaw 作为 kagent AgentHarness 或 Substrate actor）、现成 harness + 平台托管（Copilot Studio 的 GitHub Copilot harness）。其余"只能配置"的（Foundry Prompt Agent、Copilot Studio Standard、Copilot Chat、Customer Conversation）harness 与 runtime 绑死，换 runtime 就要重写 agent。判断是否绑死只有一条：**harness 是不是平台自己的代码**。选型时先找到自己那一行，看被定死的格子里有没有将来一定要改的东西（隔离强度、出站策略、换模型、换编排）。

### Claim: 三层能不能换取决于层间接口——Framework↔Runtime 靠镜像、协议、外置状态；Runtime↔Platform 靠身份、网关、trace

- **来源**：[[Agent基础设施系列04：Framework层与三层串联]]、[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.65
- **状态**：active

> Framework ↔ Runtime：容器镜像、调用协议（Responses / Invocations / A2A / ACP）、外置的状态存储——守住这三样，同一份 agent 代码可在 Hosted Agent 与 AKS 上的 kagent 之间切换（"状态存储外置，不要把会话和 checkpoint 留在进程内存里，否则 runtime 一换就断"）。Runtime ↔ Platform：agent 身份（Entra Agent ID）、网关路由、OTel trace，并且 trace 要按逻辑 agent 身份而不是 pod 名归集。"同一镜像不改就换 runtime"尚未实测，待系列 04 的 PoC 2 验证后调整置信度。


## 冲突与演进

- 2026-11-16：拆成四个独立概念页，本页改为总图。逻辑 vs 设施 → [[agent-framework]]；Harness 不单列一层 → [[agent-harness]]；四子层、三平面、两个问题、授权开销、原生机制守底线 → [[agent-runtime]]；revision → [[agent-platform]]。原文与置信度不变。本页保留托管产品分层、锁定矩阵、层间接口三条。
- 与 [[harness-engineering]] 中"Harness 面向 model、Agent Runtime 面向 infra，runtime 是同心圆外侧的正交承载层"一致，本页把"正交承载层"展开成四个子层并加上 Platform 层。
- `durable-execution`（持久执行）与 `actor-snapshot-scheduling`（actor 与执行单元分离）两个候选未单独建页（2026-11-04 裁决，见 LOOP_STATE HOLD 区），分别收在本页第三条 Claim 与 [[agent-sandbox]] 中。**2026-11-14**：两者阈值均被 AKS Agent Runtime 系列命中，用户裁决分别建页 [[durable-execution]]、[[actor-snapshot-scheduling]]；同批新建会话平面的归口页 [[agent-session-control-plane]]，本页新增三平面、授权开销、revision 三条 Claim。
- 2026-11-15：本轮 /extract-knowledge 收入 AKS Agent Runtime 系列补充篇与 03 / 05 / 07 / 10 / 11 的改动：新增"原生机制守底线、L7 组件做判断"一条，与三个平面那条 Claim 互补。

## 关联概念

- [[agent-framework]] — `part-of` Framework 层
- [[agent-harness]] — `contrasts` harness 不单列一层，是 framework 搭出的成品、runtime 托管的进程
- [[agent-runtime]] — `part-of` Runtime 层
- [[agent-platform]] — `part-of` Platform 层（狭义）
- [[agent-sandbox]] — `part-of` Runtime 层的隔离原语与沙箱编排两个子层
- [[harness-engineering]] — `contrasts` harness 是贯穿 Framework 与 Runtime 的工程方法，三层划分讲的是部署层次
- [[harness-portability-spectrum]] — `contrasts` 前者讲 harness 内部资产能否跨宿主迁移，本页讲 harness 被定在哪一层、能否换 runtime
- [[foundry-agent-type-selection]] — `grounds` Prompt / Hosted 的分水岭正是 Runtime 层归属
- [[copilot-studio-harness-selection]] — `grounds` Copilot Studio 四种 harness 落在锁定矩阵的不同格
- [[entra-agent-id]] — `uses` Runtime ↔ Platform 接口的身份一环

## 来源日记

- [[2026-11-02-周一]] — 区分 agent framework / runtime / platform，Agent 基础设施系列 01~04 成文
- [[Agent基础设施系列01：三层划分与自建路线]] — 三问划分、Runtime 四子层、Hosted Agent 与 Agent 365 的层次、AKS 参考组合、决策树
- [[Agent基础设施系列04：Framework层与三层串联]] — harness 归属三类、锁定矩阵、三层接口、四个 PoC
- [[2026-11-13-周五]] — AKS Agent Runtime 系列 06~10 成文
- [[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]] — Runtime 三个平面与 AKS 原生 / 社区 / 自建分界
- [[AKS-Agent-Runtime系列04：出站治理与逐请求授权]] / [[AKS-Agent-Runtime系列08：模型接入层]] — 授权开销与突发
- [[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]] — Agent CRD、revision、OCI skills 包
- [[AKS-Agent-Runtime系列10：为什么在AKS上自建]] — 系列总结
- [[AKS-Agent-Runtime系列11：Kubernetes原生机制管不到什么]] — 原生机制能看到什么、社区底座与自研的边界
- [[AKS-Agent-Runtime系列10：为什么在AKS上自建]] — 八层技术栈
