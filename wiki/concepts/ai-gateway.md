---
title: "AI Gateway"
created: "2026-11-15"
updated: "2026-11-18"
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
  - "[[resident-vs-session-agent-runtime]]"
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

### Claim: LLM proxy 的配置要以 runtime 的 CRD 为唯一来源、单向投影过去——每个 Agent 一把 key、每个 Team 一个 proxy team；proxy 控制台只用来看用量、设 Team 总预算、发集群外的 key

- **来源**：[[AKS-Agent-Runtime系列13：Runtime管控台与LiteLLM的分工]]
- **首次出现**：2026-11-17
- **最近更新**：2026-11-18
- **置信度**：0.8
- **状态**：active
- **证据类型**：实测经验

> 常驻实现里 Portal 只把操作写成 CRD，operator 用 master key 调 LiteLLM 管理 API：Agent → 一把 Virtual Key（别名含 Agent 名加 UID，模型 = 共享访问组 + 自己的路由，月度预算、并发、RPM、TPM）；Team → 一个 LiteLLM team（模型列表留空，权限放在 key 上）；owner → team 成员（不发 key）；Team 上的智能路由 → 一个内部名注册的路由模型。operator 只写不读，三种在控制台改东西的后果：key 限额下次调和被改回；路由修改 operator 不监听，要等 Team 有改动才被覆盖，中间两边不一致；共享模型在控制台改任何一项会把整块设置写进数据库，此后 Helm 里的值悄悄失效、界面无提示。Team 映射的坑：每把 key 只能挂一个 team，两个团队选了同一个 Team 就共用花费与总预算——一个团队一个 Team，可复用的规格放在 Policy 与 Sandbox。控制台和管理 API 同端口，嵌入 Portal 后会二次登录，能挡住的只有前面那层 Entra；按路径第一段做 owner 检查的 ingress 会把挂载前缀当成 Agent 名返回 403，要单独放行并把浏览器的 `Authorization` 头还给 LiteLLM。

### Claim: 按 Agent 的月度美元预算同样是软上限——花费在响应后才知道，超了之后拒绝下一次，挡不住单次超支；对人不在时自主运行的常驻 agent 影响更大

- **来源**：[[AKS-Agent-Runtime系列12：常驻实例与会话调度]]、[[AKS-Agent-Runtime系列13：Runtime管控台与LiteLLM的分工]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-18
- **置信度**：0.7
- **状态**：active
- **证据类型**：文档 + 配置核对

> 与上面"token 限流在响应后结算"是同一机制在美元维度上的表现：放行还是 402（预算用完）/ 429（超限流）由 key 上的规则决定。常驻 agent 可能在人下线后跑满一整晚，单次与夜间的超支都挡不住。Team 总预算只能在 LiteLLM 控制台手工设，CRD 里没有声明式写法。要硬上限，仍需请求进来时先做预算检查或把 max_tokens 纳入策略。

### Claim: LiteLLM 的 Agents 是 A2A 注册表加调用代理，不是 runtime 里跑着的 agent 工作负载——要用就从 CRD 同步过去，不在控制台手工登记

- **来源**：[[AKS-Agent-Runtime系列13：Runtime管控台与LiteLLM的分工]]
- **首次出现**：2026-11-17
- **最近更新**：2026-11-18
- **置信度**：0.75
- **状态**：active
- **证据类型**：实测经验

> LiteLLM 的 Agents 模块用 A2A Agent Card 登记外部 agent，客户端按 A2A 调 LiteLLM 再转发，按 agent 记用量、提供 kill switch、可绑定 Entra 应用身份——对应三种角色里的 agent 网关。常驻实现的 Agent 是一个 Pod + HOME 盘 + 一把 key，对外是 Web 界面和 OpenAI 兼容接口；集群上查到 operator 不往注册表写任何东西、注册数为 0，ingress 也没暴露 A2A 端点。手工登记会出现两份互不知道对方的 Agent 清单；Guardrails、MCP 网关、Tool Policies 同样按"能力复用、配置来源仍是 CRD"接入。

### Claim: 网关自身开销在往 Rust 核心迁——LiteLLM 只把格式转换、流式分块、token 计数这类纯数据处理放进 Rust，网络 I/O、鉴权、日志留在 Python，每请求网关开销从约 7.5ms 降到约 0.05ms

- **来源**：[[Rust学习系列01：从JVM视角理解所有权]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-18
- **置信度**：0.7
- **状态**：active
- **证据类型**：官方基准

> 数字来自 LiteLLM 官方博客的基准，未自测。拆分方式本身值得注意：迁的是 CPU 密集、无副作用的那一段，带 I/O 和策略的部分不动，所以迁移不改变网关的授权与计量语义。对 agent runtime 而言，网关开销原本就远小于授权决策点（系列 04 实测授权 p50 约 105ms），这条影响的是高并发下网关本身的 CPU 成本，而不是单次请求延迟的大头。外部来源：[Migrating LiteLLM to Rust](https://docs.litellm.ai/blog/litellm-rust-launch)。

## 冲突与演进

- 2026-11-18：收入系列 12、13——LiteLLM 作为常驻实现的模型网关，新增 CRD 单向投影、月度预算软上限、Agents 模块定位三条；另从 Rust 学习系列 01 收入"网关热路径迁到 Rust 核心"一条（该文的所有权内容 HOLD，见 LOOP_STATE）。

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
- [[AKS-Agent-Runtime系列12：常驻实例与会话调度]] — 常驻实现基于 LiteLLM 的 AI 网关、每实例一把 Virtual Key、月度预算
- [[AKS-Agent-Runtime系列13：Runtime管控台与LiteLLM的分工]] — CRD 单向投影、控制台该改什么、Agents 模块是 A2A 注册表
- [[Rust学习系列01：从JVM视角理解所有权]] — 开头引的 LiteLLM 热路径迁 Rust 与开销数字
