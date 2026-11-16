---
title: "AI Gateway"
created: "2026-11-15"
updated: "2026-11-16"
tags:
  - wiki
  - concept
  - agent
  - agent-runtime
  - gateway
  - llm-gateway
aliases:
  - "AI 网关"
  - "LLM 网关"
  - "LLM proxy"
  - "模型网关"
  - "agent 网关"
related:
  - "[[model-context-protocol]]"
  - "[[agent-runtime]]"
  - "[[agent-platform]]"
  - "[[credential-out-of-sandbox]]"
  - "[[agent-session-control-plane]]"
  - "[[relationship-based-access-control]]"
  - "[[a2a-protocol]]"
  - "[[agent-sandbox]]"
---

# AI Gateway（AI 流量网关）

## 摘要

AI 网关是位于 agent、模型和外部工具之间、专门处理 AI 流量的数据面。和普通 API 网关相比，它要认识三类协议：模型调用（OpenAI / Anthropic / Responses 等格式）、工具调用（MCP，有状态、双向流）和 agent 之间的调用（A2A）。在 agent runtime 里，同一类组件按**调用方**分成三种角色：agent 网关（注册、发现与调用转发，面向渠道和其他 agent）、模型网关或 LLM proxy（模型路由、协议转换、按 token 限流，面向沙箱里的 harness）、出站网关（访问外部资源时的逐请求授权与凭据注入，面向沙箱里的 harness 和它生成的代码）。

这个概念容易被产品名带偏：agentgateway 名字里带"agent"，实际三种角色都能做，参考实现只用了模型网关与出站网关；LiteLLM、APIM 的 AI 网关又以模型网关为主。判断该怎么部署，看的是"会话身份在哪一跳能被认出来"，而不是某个产品的功能清单。出站网关的凭据注入细节归口 [[credential-out-of-sandbox]]，网关背后的授权决策归口 [[relationship-based-access-control]]。

## Claims

### Claim: 按调用方分三种角色——agent 网关、模型网关、出站网关的调用方、信任边界、授权模型、故障影响都不同，宜同一项目分三套部署

- **来源**：[[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]]、[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]、[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.8
- **状态**：active

> agent 网关面向渠道、其他 agent 和集群外系统：按 agent 名路由、代理 A2A 和 MCP、认证调用方、判断"源 agent 能不能调目标的这个 skill"，要接受外部令牌。模型网关面向沙箱里的 harness：认出 Pod 证书 → 会话 → 应用，按请求体模型名授权、协议转换、限流。出站网关面向 harness 和它生成的代码：只认 Pod 绑定证书、剥伪造头、授权后注入凭据。授权模型分别是 agent 间委托批准、模型白名单与配额、资源 + 动作三方交集；模型网关挂了只影响推理，出站网关挂了所有外部动作停。参考实现用 agentgateway 做了后两种（第 04、08 篇），没有独立的 agent 网关——调用方直接打会话 API。

### Claim: 和 LLM proxy 的配合按"会话身份在哪一跳能被认出来"决定——前一跳管谁能调，后一跳管怎么调，两边不重复做协议转换和同层限流

- **来源**：[[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.7
- **状态**：active

> 三种组合：① 只用 AI 网关（一跳，会话身份与模型授权同处判断，但多提供方密钥、失败切换、按部门出账不如专门的 LLM proxy）；② AI 网关在前、LiteLLM / APIM 在后（前者核对 Pod 证书与会话、模型名、剥伪造头，后者选提供方与部署、失败切换、缓存、统管密钥、按团队计量；前者按会话限流，后者管组织配额）；③ 应用直走 LLM proxy、AI 网关只管 MCP、A2A 与出站——只适合模型调用不经沙箱的场景，沙箱里的 harness 这样做会断掉会话级授权和审计。设计推论，未做双跳实测。

### Claim: 按 token 限流在响应后结算——跨过阈值的那次请求照样放行，挡住的是下一次；token 限流管平均速度，不是硬上限

- **来源**：[[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.8
- **状态**：active

> 本机实测 agentgateway：限额每分钟 400 token、每次请求 40~60 token，前几次放行，跨过阈值那次也放行，再下一次 429 带 retry-after。Kong 的 AI 限流插件、Envoy AI Gateway 的文档都写明同样的"响应后扣减、作用于后续请求"；APIM 的 token 限流策略可以选择在请求进来时预估 prompt token。要硬预算，就把 max_tokens 纳入策略，或在请求进来时先做预算检查。

### Claim: MCP 聚合有两面——多个 server 合成一个入口、按工具授权让 tools/list 只露出允许的；但任一目标起不来整个入口初始化失败

- **来源**：[[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.8
- **状态**：active

> 本机实测：两个 stdio MCP server 聚合成 22 个按目标名加前缀的工具（memory_*、everything_*），调用按前缀路由，约 10 毫秒；首次初始化 21.6 秒（npx 冷启动），之后约 3 秒。CEL 规则按 `mcp.tool.target` / `mcp.tool.name` 授权后，tools/list 只返回允许的 2 个，硬调未授权工具返回 HTTP 400。一个目标因依赖装不上没能启动时，客户端 initialize 直接 500，另一个正常的 server 也用不了——不相关的 MCP server 应拆到不同路由。

### Claim: A2A 代理改写卡片地址可能只改一半，外部令牌默认透传——用作 agent 网关时，卡片要从源头只写网关地址、外部令牌在网关终结

- **来源**：[[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]]、[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.75
- **状态**：active

> 本机实测：经网关拉到的 Agent Card，A2A 1.x 的 supportedInterfaces[0].url 被改写为网关地址，旧版顶层 url 仍是 agent 直连地址，读旧字段的调用方会绕过网关；客户端 Authorization 头原样转给后端 agent。日志能识别 a2a.method 与调用结果，转发约 3 毫秒。单一实现、单一版本的观察。

### Claim: 网关可以按出身分两类——从现有 API 网关加插件扩展（Kong、APIM、Higress、Envoy AI Gateway）与为 AI 流量新写（agentgateway、LiteLLM）；注册中心不在数据路径上

- **来源**：[[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]]、[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.65
- **状态**：active

> 前一类沿用已有网关的运维、计费与门户，MCP / A2A 能力看版本与授权；后一类为 MCP、A2A 这类有状态双向流协议从头设计。Nacos 是注册中心，托管 AgentCard 与 MCP server 元数据，提供搜索、发现、订阅，请求不经过它——解决"找得到"，AI 网关解决"调得通、管得住"；阿里生态里与之配对的网关是 Higress。能力来自各项目文档，除 agentgateway 外未实测，版本间变化快。

## 冲突与演进

- 2026-11-15：候选自 11-15 harvest 提出（08 补充专文定义 + 07 / 10 / 04 使用 + 系列外 LiteLLM / APIM 用例），本次 `/extract-knowledge` 按三条门槛建页。产品对照只作 Claim 证据，不建产品页。
- 出站网关的凭据注入、证书认身份等论断保留在 [[credential-out-of-sandbox]]，本页只讲角色划分与网关自身的行为。

## 关联概念

- [[model-context-protocol]] — `uses` MCP 本身的定义与 runtime 落点
- [[agent-runtime]] — `part-of` 模型网关与出站网关在 runtime 的数据路径上
- [[agent-platform]] — `part-of` agent 网关是自建 agent platform 的统一入口
- [[credential-out-of-sandbox]] — `part-of` 出站网关是"凭据由出口处可信中介注入"的那个出口
- [[agent-session-control-plane]] — `uses` 会话身份由控制面绑定，网关按 Pod → 会话 → 应用回查
- [[relationship-based-access-control]] — `uses` 网关的授权回调交给关系型授权决策点
- [[a2a-protocol]] — `uses` agent 网关代理 A2A 调用、改写 Agent Card
- [[agent-sandbox]] — `constrains` 沙箱网络策略只放行到网关，网关才是"出站唯一一条路"上的判断点
- [[openclaw-agent-gateway]] — `contrasts` 同叫"agent 网关"，那边是 OpenClaw 自身的会话与渠道网关，不是面向 AI 流量的数据面

## 来源日记

- [[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]] — 三种角色、本机实测、与 Kong / APIM / Higress / Envoy AI Gateway / LiteLLM 的对照
- [[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]] — 三种网关别混在一起、agent 网关的缺位
- [[AKS-Agent-Runtime系列04：出站治理与逐请求授权]] — 出站网关角色
- [[AKS-Agent-Runtime系列08：模型接入层]] — 模型网关角色与协议转换
