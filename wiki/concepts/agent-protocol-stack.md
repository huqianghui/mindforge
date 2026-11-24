---
title: "Agent Protocol Stack"
created: "2026-11-16"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - agent
  - protocol
  - mcp
  - a2a
aliases:
  - "Agent 协议栈"
  - "agent 协议"
  - "MCP / A2A / AG-UI / A2UI"
related:
  - "[[model-context-protocol]]"
  - "[[a2a-protocol]]"
  - "[[ag-ui-protocol]]"
  - "[[a2ui-protocol]]"
  - "[[agent-runtime]]"
  - "[[agent-platform]]"
  - "[[agent-framework]]"
  - "[[relationship-based-access-control]]"
---

# Agent Protocol Stack（Agent 协议栈）

## 摘要

agent 对外要连三个方向，每个方向一个协议：向下连工具与数据用 [[model-context-protocol]]（MCP），横向连其他 agent 用 [[a2a-protocol]]（A2A），向上连用户界面用 [[ag-ui-protocol]]（AG-UI 管事件流）与 [[a2ui-protocol]]（A2UI 管 agent 生成的声明式界面，常由 AG-UI 承载）。四个协议定义的都是"怎么连、消息长什么样"，都不定义"谁能做什么"——授权一律落在协议之外的网关、决策点与业务服务上。

本页只讲四个协议怎么分工、和 runtime 怎么接；各协议自身的机制在各自页面。

## Claims

### Claim: 四个协议按连接方向分工——MCP 向下连工具与数据、A2A 横向连 agent、AG-UI 向上传事件流、A2UI 让 agent 描述界面；可以嵌套，被委派的 agent 内部再用 MCP 调工具

- **来源**：[[AG-UI协议解析]]、[[A2UI协议解析]]、[[企业级A2A方案：从微服务治理到Agent互操作层]]、[[03-Model-Context-Protocol]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.75
- **状态**：active
- **证据类型**：理论（长效）

> MCP：agent ↔ 工具，Host / Client / Server、tools / resources / prompts。A2A：agent ↔ agent，对方是不透明的独立 agent，经 Agent Card 声明能力、以 Task 跟踪生命周期。AG-UI：agent 后端 ↔ 前端，把流式文本、工具调用、HITL 确认、状态同步标准化成双向事件流，传输不绑定。A2UI：agent 用声明式 JSON 描述界面，客户端只用自己 Catalog 里注册过的组件渲染、不执行 agent 的代码；它与传输无关，AG-UI 是最常见的承载。容易混的两组：A2A 与 MCP 不是替代——同团队、共享状态、延迟敏感的步骤留在 framework 内编排或走 MCP，跨团队独立的 agent 才上 A2A；AG-UI 与 A2UI 不是同一件事——装了 AG-UI 不等于有 A2UI Renderer。

### Claim: 协议面之下要适配到 runtime 的会话模型——A2A 的 task 与 message、MCP 的工具调用、AG-UI 的事件流最后都要落到同一套会话 API 上，这层适配开源项目替不了

- **来源**：[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]、[[AG-UI协议解析]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验

> 自建 agent platform 时：A2A 的 task / message 要变成"建子会话、投递一轮"，会话的更新流要转成 A2A 的流式事件；MCP 工具调用要落到同一套会话 API（参考实现就是把会话 API 包成 MCP server，因为编码 harness 是 MCP 客户端）；前端经 AG-UI 订阅的也应是这套会话的事件流。网关（agentgateway 能同时代理 A2A 与 MCP）只解决路由、认证与按工具授权，协议到会话语义的翻译要自己写。framework 侧的好处是对称的：前端经 AG-UI、调用方经 A2A / Responses，都不关心背后用哪个框架（[[agent-framework]]）。

### Claim: 四个协议都只管连接与格式、不管授权——A2A 卡片只写怎么认证、A2UI 回传的数据不可信、MCP 工具要在网关上按工具授权；"能连上""能看到""能渲染"都不等于"能做"

- **来源**：[[a2a-protocol]]、[[a2ui-protocol]]、[[ai-gateway]]、[[relationship-based-access-control]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）

> A2A：能被发现不等于能被调用，卡片里的 securitySchemes 只说怎么认证，能不能调要过被调用方 owner 的批准，撤销后卡片照样可见。A2UI：展示不等于授权，UI 的 Data Model 不是业务数据的权威来源，客户端回传的数据不可信，真正的业务操作由后端服务执行并授权。MCP：协议不定义授权，网关按 `mcp.tool.target` / `mcp.tool.name` 授权后 tools/list 才只露出允许的工具。AG-UI 只传事件。所以 agent platform 的授权模型（三方交集、逐请求判断）必须放在协议之外，[[relationship-based-access-control]] 与出站网关是那个位置；多跳 A2A 委托里身份只在传输层、每一跳只认直接调用方，是本库尚未覆盖的下一步（见 2026-11-16 知识差距报告）。

## 冲突与演进

- 2026-11-16：层级缺口检查发现 [[a2a-protocol]]、[[a2ui-protocol]] 没有任何上层概念，[[ag-ui-protocol]] 只挂在 framework 上，与新建的 [[model-context-protocol]] 一起补建本伞形页。

## 关联概念

- [[model-context-protocol]] — `part-of` 向下连工具与数据
- [[a2a-protocol]] — `part-of` 横向连其他 agent
- [[ag-ui-protocol]] — `part-of` 向上传事件流
- [[a2ui-protocol]] — `part-of` agent 描述界面
- [[agent-runtime]] — `part-of` runtime 对外、对下的协议面
- [[agent-platform]] — `uses` 发现与注册依赖 A2A 卡片
- [[agent-framework]] — `contrasts` 协议之后 framework 可互换
- [[relationship-based-access-control]] — `constrains` 授权在协议之外

## 来源日记

- [[AG-UI协议解析]] — 三大协议的分工图
- [[A2UI协议解析]] — 声明式界面与展示不等于授权
- [[企业级A2A方案：从微服务治理到Agent互操作层]] — A2A 补的是语义层
- [[03-Model-Context-Protocol]] — MCP 的定义
- [[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]] — 协议到会话 API 的适配
