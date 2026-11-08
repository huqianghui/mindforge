---
title: "微软 AI 三支柱怎么选与组合"
created: "2026-11-08"
updated: "2026-11-08"
tags:
  - wiki
  - decision
  - azure
  - copilot-studio
  - foundry
  - github-copilot
decision_status: "active"
related_concepts:
  - "[[azure-copilot-ecosystem]]"
  - "[[copilot-studio]]"
  - "[[foundry-agent-service]]"
  - "[[github-copilot]]"
related_methods: []
---

# 微软 AI 三支柱怎么选与组合

## 背景

客户做 AI 方案时最常问"该用 Copilot Studio 还是 Foundry"，有时还会把 GitHub Copilot 一起拿来比。这三个产品不在同一层：Copilot Studio 是 Power Platform 上的 SaaS 构建产品，Foundry Agent Service 是 Azure 上的 PaaS agent 运行时，GitHub Copilot 是开发者与代码平台上的 coding agent。真实的问题不是三选一，而是**每一层用谁、接缝处走哪条官方支持的路**。这张决策页把选型拆成三刀：用户从哪里进来、谁来长期维护、大脑要不要自己控制；再列出接缝上的硬约束和常见组合。

语音与数字人怎么构建另见 [[voice-agent-build-approach]]，Foundry 内部的 Prompt / Hosted 选型另见 [[foundry-agent-type-selection]]，Copilot Studio 内部的 harness 选型另见 [[copilot-studio-harness-selection]]。

## 选项分析

### 选项 A: Copilot Studio

- **优势**：业务团队与 fusion team 自己就能建和改；1000+ Connector、DLP、环境现成；员工在 M365 Copilot / Teams 里直接用；有 M365 Copilot 许可的内部用户用 Standard agent 可豁免 Credits（以租户计费设置为准）
- **劣势**：运行时是黑盒；harness 建后不能互转；浏览器里的 managed app 同步调不到任何 harness 的 agent；按 Copilot Credits 计费，GitHub Copilot harness 不豁免；ALM 走 Solutions，与工程团队的 Git 流程是两套
- **适用条件**：最终用户是员工、入口在 M365 / Teams、由业务团队长期维护、需要大量企业系统连接

### 选项 B: Foundry Prompt Agent（含 Prompt Agent + Microsoft Copilot harness）

- **优势**：Foundry 替你运行，内容安全、审计、成本追踪开箱即用；按 Azure 用量计费、成本透明；Git、IaC、评测、tracing 一整套；可私网；Voice Live 的 agent 绑定只认它；换上 Copilot harness 就有 skills、托管执行、文件、子 agent
- **劣势**：需要专业开发者；planner 不可自定义；企业系统连接要用 MCP / 工具自己接；发布到 M365 要管理员审批，关闭公网的 project 不能从 portal 发布
- **适用条件**：由平台团队维护、要工程化与成本透明、要接 Voice Live、不需要自己控制 agent loop

### 选项 C: Foundry Hosted Agent

- **优势**：任意框架、任意模型；每 session 一个 VM 级隔离沙箱，有持久文件系统；planner、记忆、状态全部自控；已 GA
- **劣势**：内容安全与内层可观测性要自己补；按 session 活跃时长计算力，闲置保温也计费；没有 warm pool；语音要走 `invocations_ws`，WebSocket 帧上限 1 MB、单连接约 30 分钟需按重连协议设计
- **适用条件**：出现自定义 planner、长期记忆、显式状态机、复杂多 agent、审批节点、跨模型路由任一信号

### 选项 D: GitHub Copilot（开发者侧）

- **优势**：agent 本来就在 PR 里，代码托管、评审、Actions、安全扫描、身份、度量都在同一平台；同一套 Copilot harness 也能经 SDK 嵌进自己的程序，或以 Foundry 托管 harness 跑业务 agent
- **劣势**：面向开发者与代码，不是面向业务用户的 agent 构建产品；执行位置多，排查多一层；预览功能多
- **适用条件**：开发者生产力、代码平台上的自动化（Automations、Agentic Workflows）、团队已在 GitHub Enterprise + Entra / Intune 上

## 决策结论

- **选择**：分层组合，按三刀切——
  1. **入口**：员工在 M365 / Teams → 先看 Copilot Studio；来电 → 有 D365 Contact Center 走 Copilot Studio 语音，否则 Voice Live + Foundry + ACS；网页 / App / 数字人 → 语音与形象走 Azure Speech（Voice Live），大脑可以是任一边；自有产品后端、外部客户 → Foundry；开发者与代码 → GitHub Copilot
  2. **维护者**：业务团队长期维护 → Copilot Studio；平台团队维护 → Foundry
  3. **大脑控制权**：不需要自己控制 → Copilot Studio 的 harness 或 Foundry Prompt Agent（要 skill 就加 Copilot harness）；需要自定义 planner、长期记忆、非微软模型 → Foundry Hosted Agent
- **理由**：三个产品的构建者、计费、治理地基都不同，按"产品功能清单"对比会掩盖真正的分界；入口决定哪些产品根本不在候选里，维护者决定平台归属，大脑控制权决定运行时归属
- **放弃理由**：不做"统一到一个平台"——大企业里三者常同时存在、分属不同团队；不按功能多少选——接缝处的硬约束比功能差异更决定成败
- **前提假设**：Copilot Studio 的语音、程序化调用、多数渠道仍只在 Standard harness 上；Voice Live agent 绑定仍只认 Prompt Agent；Copilot harness in Foundry 仍是公开预览。任一变化（尤其 Ignite 后）需重评

## 影响范围

- **受影响的概念**：[[azure-copilot-ecosystem]]（三支柱分工）、[[copilot-studio]]、[[foundry-agent-service]]、[[github-copilot]]
- **受影响的方法**：（暂无）

## 验证状态

- **验证方式**：客户方案中按三刀做选型，事后回填实际选择与踩坑
- **当前状态**：文档验证（官方文档与产品页核对），客户实践待回填
- **验证证据**：[[Foundry-Agent与Copilot-Studio的选型]]

## Claims

### Claim: 三支柱不在同一层，选型第一刀按用户入口切——入口决定哪些产品根本不在候选里

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-08
- **置信度**：0.75
- **状态**：active
- **证据类型**：理论（长效）

> Copilot Studio 是 SaaS 构建产品，Foundry 是 PaaS 运行时，Voice Live 是能接在两者前面的语音层，GitHub Copilot 在开发者与代码平台一侧。员工在 M365 / Teams 用 → Copilot Studio 优先；打电话 → 看有没有 D365 Contact Center；网页、App、数字人 → 语音与形象只能来自 Azure Speech，大脑可以是任一边；自有产品后端、外部客户 → Foundry。网页 / 数字人入口下 Copilot Studio 只能当大脑、不能当语音前端；自有产品后端基本排除 Copilot Studio 的语音和 app。

### Claim: 谁来长期维护就选谁的平台——业务团队维护选 Copilot Studio，平台团队维护选 Foundry

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-08
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）

> 以员工知识问答助手为例，两边都走得通：选 Copilot Studio 得到业务团队自己能改、Connector 与 DLP 现成、内部用户可能豁免 Credits，付出黑盒运行时和与 Git 流程分离的 ALM；选 Foundry 得到按 token 计费、Git / IaC / 评测 / tracing、私网，付出需要开发者、发布要管理员审批、企业连接要自己接。维护者决定了哪套 ALM 和技能栈能长期跑下去。

### Claim: 接缝处的硬约束比功能差异更决定成败——managed app 调 agent、Voice Live 绑定、数字人渲染、私网发布都只有一条官方路

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]、[[copilot-studio-harness-selection]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-08
- **置信度**：0.75
- **状态**：active
- **证据类型**：产品与服务

> 浏览器里的 managed app 同步调不到任何 harness 的 agent；Copilot Studio 的语音只在 Standard harness 上，harness 建后不能互转；Copilot Studio 挂 Foundry agent 要求主 agent 是 GitHub Copilot harness、Foundry agent 开启 Activity 协议；Voice Live 的 agent 绑定只认 Prompt Agent 且必须 Entra 认证；数字人渲染只能来自 Azure Speech avatar；关闭公网的 Foundry project 不能从 portal 发布到 M365；managed app 只服务内部 Entra 用户。另有一票否决项：gpt-realtime 在 Global Standard 下可能在资源地域之外处理数据，严格驻留的客户要先过合规。

### Claim: 大脑控制权分三档——不自控走 Copilot Studio 或 Prompt Agent，要 skill 不想持有 harness 加 Copilot harness，要改 loop 才上 Hosted

- **来源**：[[foundry-agent-type-selection]]、[[Foundry-Agent与Copilot-Studio的选型]]
- **首次出现**：2026-11-08
- **最近更新**：2026-11-08
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务

> 不需要自定义 planner、官方工具够用、治理是刚需 → Copilot Studio 的 harness 或 Foundry Prompt Agent；要 skills、托管执行、文件、子 agent 但不想自己持有 harness → Prompt Agent + Microsoft Copilot harness（公开预览）；出现长期记忆、显式状态机、复杂多 agent、审批节点、跨模型路由、自定义 planner 任一信号 → Hosted Agent。Copilot Studio 内部的重活（自主拆解、Bash 容器、读写 Office 文件）放 GitHub Copilot harness。

### Claim: 最常见的是三种组合——员工 + 客户双侧、重活下沉到 Foundry、同一个 agent 两个入口

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-08
- **置信度**：0.65
- **状态**：active
- **证据类型**：理论（长效）

> 员工 + 客户双侧：员工助手用 Copilot Studio，客户侧语音用 Voice Live + Foundry Prompt Agent，两边的 agent 都在 Agent 365 里登记。重活下沉：Copilot Studio 的 GitHub Copilot harness 做编排，把需要自定义运行时的那一步交给 Foundry agent（connected agent），结果写回 Dataverse。同一个 agent 两个入口：一个 Foundry Prompt Agent 既发布到 Teams 给员工打字用，又被 Voice Live 绑定给网页语音用，prompt 和工具只维护一份。

### Claim: GitHub Copilot 在客户方案里的位置是开发者侧与代码平台——选型先问代码托管在哪、身份与设备用什么

- **来源**：[[github-copilot]]、[[GitHub-Copilot系列01：产品全景与竞争格局]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-08
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务

> 代码在 GitHub、身份与设备用 Entra / Intune 时，Copilot 基本是开发者侧的默认选项：agent 本来就在 PR 里，身份、设备、审计不用另起。它和另外两个支柱通过同一套 Copilot harness 相连——Copilot Studio 新建 agent 默认的 GitHub Copilot harness、Foundry 的 `microsoft_copilot_preview` 托管 harness 都是同一套，所以"用 GitHub Copilot 的 harness 做业务 agent"的现实路径是 Foundry 托管 harness，而不是让业务用户用 GitHub Copilot。

### Claim: 和客户第一次沟通先问三个问题——用户从哪里进来、谁来建和维护、已经有哪些许可和底座

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-08
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）

> 前三问决定走哪个平台：入口（员工 / 来电 / 网页数字人 / 自有产品）、维护者（业务团队 / 平台团队）、已有许可（M365 Copilot、D365 Contact Center 让 Copilot Studio 的成本与集成更顺；只有 Azure 订阅则 Foundry）。之后再问平台内的路：要不要逐轮控制对话、大脑要不要自定义、要不要数字人、有无数据驻留与私网、用户内外部与是否匿名、是否被其他应用程序化调用、计费偏好。"要不要逐轮控制"最容易被低估，答案是"可能需要"时前期就按直接调 Voice Live API 设计（见 [[voice-agent-build-approach]]）。

## 关联概念

- [[azure-copilot-ecosystem]] — `part-of` 三支柱分工的选型落地
- [[copilot-studio]] — `uses` 选项 A 的产品
- [[foundry-agent-service]] — `uses` 选项 B、C 的产品
- [[github-copilot]] — `uses` 选项 D 的产品
- [[entra-agent-id]] — `constrains` 治理面在 Entra Agent ID 与 Agent 365 汇合，组合方案的身份要按它设计

## 关联方法

- （暂无）

## 来源

- [[Foundry-Agent与Copilot-Studio的选型]] — 分层、技术差异、硬约束、可任选场景、决策树、前期决策清单
- [[GitHub-Copilot系列01：产品全景与竞争格局]] — GitHub Copilot 的定位与选型问题
