---
title: "A2A Protocol"
created: "2026-10-24"
updated: "2026-10-24"
tags:
  - wiki
  - concept
  - agent
  - protocol
  - microservices
aliases:
  - "A2A 协议"
  - "A2A"
  - "Agent2Agent"
  - "Agent 互操作层"
related:
  - "[[ag-ui-protocol]]"
  - "[[a2ui-protocol]]"
  - "[[mcp-vs-cli]]"
  - "[[entra-agent-id]]"
  - "[[foundry-agent-type-selection]]"
  - "[[orchestrator-pattern-multi-agent]]"
---

# A2A Protocol（A2A 协议）

## 摘要

A2A（Agent2Agent）是 **Agent ↔ Agent** 方向的开放协议：一个独立的 Agent（内部框架、模型、工具都不暴露，opaque）通过 Agent Card 声明能力，调用方用 Message 提交工作、以 Task 跟踪生命周期、以 Artifact 拿回产物。Google 于 2025 年 4 月发布，同年 6 月捐赠给 Linux Foundation，现归属 Agentic AI Foundation（与 MCP 同一基金会）。在 Agent 协议栈里，MCP 向下连工具与数据、AG-UI 向上连前端、A2A 横向连其他 Agent；A2A 与 MCP 可以嵌套（被委派的 Agent 内部再用 MCP 调工具）。

A2A 和微服务治理要解决的问题高度同构（发现、契约、调用、认证、追踪），所以企业里它**不是一套平行的新基础设施**，而是叠在注册中心、网关、IAM、OpenTelemetry 之上的 **Agent 互操作层**。它真正新增的是 Agent 语义的标准化——能力描述、带中断态的任务生命周期、多模态内容——而不是传输能力。

## Claims

### Claim: A2A 补的是语义层，协议层与治理层复用微服务——它是互操作层而非新基础设施

- **来源**：[[企业级A2A方案：从微服务治理到Agent互操作层]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.75
- **状态**：active

> 三层看：协议层（怎么传消息、管任务）、语义层（消息/任务/模态/能力各代表什么）、治理层（认证、授权、路由、追踪、审计）。传统微服务在协议层和治理层都成熟，A2A 主要补语义层：不发明传输（JSON-RPC / gRPC / HTTP+JSON 三种绑定），`securitySchemes` 只声明认证要求、不颁发也不验证 Token。微服务"表达不好"的不是 Message、Task 这些概念本身——长任务大家都能做——而是 `INPUT_REQUIRED` / `AUTH_REQUIRED` 这种"等对方"的中间态每个团队各自定义、互不相通。A2A 的价值在于让跨团队、跨框架、跨厂商的 Agent 不必各自发明一套。

### Claim: Agent Card 描述"能做什么"而非"有哪些 endpoint"——Skill 不是函数签名，Well-Known URI 不是发现算法

- **来源**：[[企业级A2A方案：从微服务治理到Agent互操作层]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.8
- **状态**：active

> Skill 只声明"我能做竞争分析"，不规定 `analyze(a, b)` 参数，调用方仍发 Message、输入由 Agent 自己理解；Skill 供其他 Agent **选择**，而不只是调用——这是它与 OpenAPI operation 不等价的地方。`/.well-known/agent-card.json` 只是约定入口，调用方仍须先知道域名，企业规模下靠 Registry/Catalog（规范把 Well-Known、Registry、预配置地址并列为三种发现方式）。认证后才给的信息放 Extended Agent Card。依据为 1.0 官方规范。

### Claim: Task 的意义是生命周期与发起它的 HTTP 请求解耦——三个 ID 不能混，`GetTask` 是权威状态来源

- **来源**：[[企业级A2A方案：从微服务治理到Agent互操作层]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.8
- **状态**：active

> JSON-RPC `id` 标识一次调用，`task.id` 标识一个工作单元，`contextId` 串起同一段协作的多轮消息与多个任务。八个状态里两个中断态（`INPUT_REQUIRED` / `AUTH_REQUIRED`）是 REST 最难自然表达的：任务没失败，只是在等对方，带同一 `taskId` + `contextId` 再发 `SendMessage` 即续上。取结果有轮询 / 流式（SSE，推的是任务状态与产物更新，≠ 模型 token 流）/ 推送三种；推送只做提醒，回调端点必须白名单（否则即 SSRF），权威状态仍以 `GetTask` + 持久化 Task 记录为准。Message 管交流、Task 管工作、Artifact 是产出（可同时给人看的文本和给下游 Agent 的结构化数据）。

### Claim: A2A Task 不是工作流引擎，Agent Registry 不是服务实例发现——两组最容易混的边界

- **来源**：[[企业级A2A方案：从微服务治理到Agent互操作层]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.7
- **状态**：active

> A2A 定义 Task 状态模型，但不负责持久化执行：Agent 崩溃后状态是否落库、能否恢复、哪些步骤可安全重试、副作用如何防重复，要由 Agent Runtime + Task Store + Temporal / Durable Functions / Camunda 解决——A2A 管交互契约，工作流引擎管持久化执行与恢复。同理，Registry 管能力与契约（一个 Agent 一张 Card），实例发现管运行实例与网络地址（一个 Agent 背后多个实例）。可观测性上也是两个时钟：Trace/Span 表达每次调用，Task ID 关联可能持续数分钟的生命周期，不能把整个 Task 当一个同步 Span。

### Claim: 协议层已成型、中间件层还在拼装——官方无统一 Registry API，企业应自定义一层薄 Registry 抽象防锁定

- **来源**：[[企业级A2A方案：从微服务治理到Agent互操作层]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.75
- **状态**：active

> 规范（1.0）、六种语言官方 SDK、Inspector 与 TCK 已就绪；Registry 方面 Nacos 3.1+ 原生支持 A2A Agent Card（检索仍以名称匹配为主，按 Skill 标签检索在规划中），Consul / Eureka 需挂元数据或在其上建 Catalog；Gateway 基本是"现有网关 + A2A 适配"（SSE 长连接、`A2A-Version` / `tenant` / `traceparent` 透传、Task ID 入日志），"能代理 HTTP ≠ 支持 A2A"。因为没有标准 Registry API，即使都"支持 A2A"不同产品也不能互换，建议自定义 `registerAgent / searchAgents / resolveEndpoint` 等企业接口，具体实现关进适配器。

### Claim: 读旧资料必看 0.3→1.0 的破坏性改名——0.3 客户端解析不了 1.0 的 Agent Card

- **来源**：[[企业级A2A方案：从微服务治理到Agent互操作层]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.8
- **状态**：active

> 方法名 `message/send` → `SendMessage` 等；去掉 `kind` 改按 JSON 成员名区分；三种 Part 统一为 `text` / `data` / `url` / `raw` 四选一；枚举改为 `TASK_STATE_*` / `ROLE_*`；顶层 `url` 搬进有序列表 `supportedInterfaces[]`（每项自带 binding 与 `protocolVersion`，这也是向后兼容方案：同时暴露 1.0 与 0.3 两个 interface）；新增原生 `tenant`、Agent Card JWS 签名、Device Code 与 PKCE，移除 implicit / password 流。部分托管平台仍只支持 0.3 方法名，选型时须逐个确认对端版本。

### Claim: 跨 Agent 调用至少三种身份——不得把用户 Token 原样转给下一个 Agent，发现能力与授权能力必须分开

- **来源**：[[企业级A2A方案：从微服务治理到Agent互操作层]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.7
- **状态**：active

> 用户、调用方 Agent 的工作负载身份、实际访问后端的执行身份要分别授权；代表用户时用 OAuth 2.0 Token Exchange 拿受众收窄的新 Token，工具调用前在策略执行层重新授权——"prompt 里写了不要访问其他部门数据"不是安全边界。Catalog 检索坚持"注册中心检索 + 权限过滤 + 语义匹配"，不把几百张 Card 丢给 LLM 自由挑：技术上最合适的 Agent 不代表调用方有权使用。准入门禁三者分开验收：协议兼容（TCK）≠ 安全合规 ≠ 业务质量。

### Claim: 值不值得上 A2A 看能否降低跨 Agent 集成与治理成本——同团队、共享状态、延迟敏感的步骤留在框架内编排

- **来源**：[[企业级A2A方案：从微服务治理到Agent互操作层]]、[[A2UI协议解析]]
- **首次出现**：2026-10-20
- **最近更新**：2026-10-24
- **置信度**：0.7
- **状态**：active

> 调模型 API 不需要；一个 Agent 调 CRM/数据库优先 MCP 或普通 API；少量 Agent、同一团队维护未必需要；多个独立 Agent 跨团队、跨框架、跨厂商协作才值得。A2A 的前提是"对方是一个独立的 Agent"，为了用协议而拆多 Agent 只会多出延迟、成本、故障点。A2UI 一文给出同样的顺序：前端动态 UI 是同一应用内部问题，AG-UI + A2UI 先行，需要跨系统调用独立 Agent 时再引入 A2A。

## 冲突与演进

- 2026-10-24：建页。来源为企业级 A2A 方案专文（按 1.0 官方规范拆解），A2UI 协议解析与 AG-UI 协议解析两文均引用其定位，[[ag-ui-protocol]] 与 [[foundry-agent-type-selection]] 早已提及 A2A 但 wiki 无归口页。未经自建项目验证，置信度 0.7~0.8（规范性条目 0.8，企业落地建议 0.7）。

## 关联概念

- [[ag-ui-protocol]] — `contrasts` 同属 Agent 协议栈，A2A 横向连 Agent，AG-UI 向上连前端
- [[mcp-vs-cli]] — `contrasts` MCP 管 Agent↔工具，A2A 管 Agent↔Agent；两者可嵌套（被委派的 Agent 内部用 MCP 调工具）
- [[entra-agent-id]] — `uses` 跨 Agent 调用的工作负载身份与委派链需要独立的 Agent 身份体系承载
- [[orchestrator-pattern-multi-agent]] — `constrains` 只有跨团队/跨框架的独立 Agent 才值得拆成 A2A 调用，同团队的编排留在框架内

## 来源日记

- [[2026-10-20-周二]] — 熟悉 A2A 与微服务架构的区别和联系，成文企业级 A2A 方案
- [[企业级A2A方案：从微服务治理到Agent互操作层]] — 1.0 报文解剖、与微服务治理对照、Nacos Registry 现状、企业落地方案（2026-10-20）
