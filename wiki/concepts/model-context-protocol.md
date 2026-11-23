---
title: "Model Context Protocol"
created: "2026-11-16"
updated: "2026-11-23"
tags:
  - wiki
  - concept
  - agent
  - mcp
  - protocol
aliases:
  - "MCP"
  - "模型上下文协议"
  - "MCP server"
  - "MCP 协议"
related:
  - "[[agent-protocol-stack]]"
  - "[[mcp-vs-cli]]"
  - "[[context-engineering]]"
  - "[[ai-gateway]]"
  - "[[agent-session-control-plane]]"
  - "[[agent-runtime]]"
  - "[[agent-harness]]"
  - "[[model-harness-codesign]]"
---

# Model Context Protocol（MCP）

## 摘要

MCP 是 agent 向下连接工具与数据的协议：Anthropic 2024 年 11 月发布，2025 年 OpenAI、Google、Microsoft 相继支持，现在和 A2A 同属一个基金会。它把"N 个 AI 应用各自对接 M 个工具"的 N×M 问题变成 M+N——工具方写一个 MCP server，应用方内置一个 MCP client。角色分 Host（用户直接用的应用）、Client（Host 里与某个 server 保持一对一有状态连接的组件）、Server（包装后端系统的轻量进程），消息用 JSON-RPC 2.0，本地走 stdio、远程走 HTTP 流式传输。

本页讲 MCP 本身，以及它在 agent runtime 里的落点。MCP 与 CLI 怎么取舍、context 膨胀与 tool search 归 [[mcp-vs-cli]]；MCP 和 Context Engineering 的关系（学科与协议）归 [[context-engineering]]；网关上的 MCP 聚合与按工具授权归 [[ai-gateway]]；MCP 在协议栈里和 A2A、AG-UI、A2UI 的分工见 [[agent-protocol-stack]]。

## Claims

### Claim: MCP 定义三种原语、分属三个控制者——tools 由模型决定调用、resources 由应用或用户附加、prompts 由用户主动触发；三种都由 server 暴露，Host 负责把它们接进会话并管安全

- **来源**：[[03-Model-Context-Protocol]]
- **首次出现**：2025-08-17
- **最近更新**：2026-11-16
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）

> Tools 是可执行函数，server 列出名称、描述与参数，模型在推理中自己决定是否调用；Resources 是上下文数据，通常只读，由应用或用户挂到会话上（如附加一个文件、数据库 schema）；Prompts 是预定义模板，通常以斜杠命令或菜单出现，由用户发起。三个控制者的区分决定了安全边界在哪：只有 tools 是模型能自己触发的动作，所以授权与审计要集中在 tool 调用上。Client 与 server 是一对一的有状态连接，能力在连接建立时协商——这一点在网关与沙箱暂停时都会成为约束（见下两条）。协议本身只定义连接与消息，不定义授权模型。

### Claim: MCP 标准化的是 agent 与环境之间的"观察"和"行动"，不是决策——读 resources 是观察、调 tools 是行动，判断与决定仍归 harness 和上下文工程

- **来源**：[[03-Model-Context-Protocol]]、[[98-Conclusion]]
- **首次出现**：2025-08-17
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）

> 按 observe → orient → decide → act 的循环看，MCP 之前每个 agent 的"观察"和"行动"都是一堆定制 API 与解析器，环境各不相同；MCP 把这两步标准化成可预测的接口。但标准化的接口不等于智能：结合目标与记忆理解当前状态、决定下一步，仍是 harness 与上下文工程的事。这也是 [[context-engineering]] 里"CE 是操作系统、MCP 是 USB-C 接口"一条的另一种说法。推论：一个 harness 接了更多 MCP server 不会自动更聪明，反而要管 tool 列表进上下文的成本（见 [[mcp-vs-cli]] 的 context 膨胀一条）。

### Claim: 在 agent runtime 里 MCP 有三个落点——编码 harness 本身是 MCP 客户端，所以平台把会话 API 包成 MCP 工具；网关聚合多个 server 时一个起不来会拖垮整个入口；沙箱暂停会断开 MCP 连接，要由控制面在恢复时重建

- **来源**：[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]、[[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]]、[[AKS-Agent-Runtime系列05：会话生命周期与回收]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.75
- **状态**：active
- **证据类型**：实测经验

> 一、协议选择：沙箱里的 Claude Code、Codex 都是 MCP 客户端、不说 A2A，所以参考实现把"建会话、投递、读更新、读条目、中止"包成一个 MCP server 给 agent 调 agent 用，跨框架的 agent 才用 A2A（[[agent-session-control-plane]]）。二、网关聚合：agentgateway 把两个 stdio server 合成 22 个带前缀的工具，按工具授权后 tools/list 只露出允许的，但一个 server 依赖装不上时客户端 initialize 直接 500，另一个正常的也用不了——不相关的 server 要拆到不同路由（[[ai-gateway]]）。三、暂停：MCP 是有状态长连接，Agent Substrate 文档写明挂起不保留打开的连接，rootfs 快照与 PVC 方式同样不跨暂停保留连接，恢复后要重连（[[agent-runtime]]）。治理一侧的判断——MCP 把接入成本变成治理成本——见 [[model-harness-codesign]]。

### Claim: 工具描述本身就是注入入口——恶意 MCP server 可以让 agent 照常做完任务、再顺手把查询和别的 server 的响应交出去；内容过滤防不住，次级工具调用要由宿主授权

- **来源**：[Log-To-Leak: Prompt Injection Attacks on Tool-Using LLM Agents via the Model Context Protocol](https://arxiv.org/abs/2610.36108)
- **首次出现**：2026-11-23
- **最近更新**：2026-11-23
- **置信度**：0.65
- **状态**：active
- **证据类型**：理论

> 攻击方式：恶意 server 在工具描述里写指令，诱导 agent 完成用户的正常任务之后，再调用它提供的"保存日志"类工具，把用户查询、其他 server 返回的内容一并传出去。在 18 组有效的模型 × server 组合上，攻击成功率 62.64%~100%，被调用时字段记录准确率 76.55%~95.64%；其中 16 组的正常任务完成率变化不超过 6.63 个百分点——任务照样做完，用户从结果上看不出异常。三种防御（提示夹心、LLM 元数据检查、IPIGuard）在 GitHub MCP + GPT-4o 上残余成功率仍在 55% 以上，而且都让任务完成率下降 2~6 个点；一个指令检测器能认出 91% 的恶意描述，却把 85.53% 的正常描述也判成可疑。作者的结论是靠内容层面的过滤做不到"低泄露且不伤任务"，次级工具调用要由宿主控制授权。对应到 wiki：这是"Host 负责把原语接进会话并管安全"那一条的具体攻击面，也说明按工具授权（[[ai-gateway]] 上的 MCP 聚合）比读描述判断意图更可靠。

## 冲突与演进

- 2026-11-23：知识差距分析 2026-11-23 落实，新增 Log-To-Leak 一条（已读全文）。

- 2026-11-16：名词缺口检查发现 31 篇文章打了 mcp tag、38 个概念页提到 MCP，却没有讲 MCP 本身的页，按完备性与缺失性复核建页。原本散在 [[mcp-vs-cli]]、[[ai-gateway]]、[[agent-session-control-plane]]、[[model-harness-codesign]]、[[context-engineering]] 的论断不搬动，本页只放协议本身与 runtime 落点，其余互相指向。

## 关联概念

- [[agent-protocol-stack]] — `part-of` 协议栈里向下连工具与数据的那一层
- [[mcp-vs-cli]] — `extends` MCP 与 CLI 的取舍、context 膨胀与 tool search
- [[context-engineering]] — `contrasts` 学科与协议：CE 决定放什么进上下文，MCP 规定怎么接进来
- [[ai-gateway]] — `uses` 网关上的 MCP 聚合与按工具授权
- [[agent-session-control-plane]] — `uses` 会话 API 包成 MCP 工具
- [[agent-runtime]] — `constrains` 暂停后 MCP 连接要重建
- [[agent-harness]] — `uses` harness 是 MCP 客户端
- [[model-harness-codesign]] — `extends` MCP 把接入成本转成治理成本
- [[context7]] — `implements` 一个具体的文档类 MCP server

## 来源日记

- [[03-Model-Context-Protocol]] — 定义、Host / Client / Server、三种原语、生态、作为 agent 与环境的接口
- [[98-Conclusion]] — CE 与 MCP 互补
- [[MCP-vs-CLI：重新审视MCP]] — MCP 与 CLI 的取舍（论断在 [[mcp-vs-cli]]）
- [[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]] — 会话 API 包成 MCP 工具、不走 A2A
- [[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]] — MCP 聚合与按工具授权实测
