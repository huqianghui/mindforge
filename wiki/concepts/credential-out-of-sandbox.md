---
title: "Credential Out of Sandbox"
created: "2026-11-14"
updated: "2026-11-14"
tags:
  - wiki
  - concept
  - agent
  - agent-runtime
  - sandbox
  - security
  - egress
  - credential-injection
aliases:
  - "凭据不进沙箱"
  - "出口注入凭据"
  - "egress credential injection"
  - "宿主中介沙箱"
related:
  - "[[agent-sandbox]]"
  - "[[copilot-managed-runtime]]"
  - "[[agent-session-control-plane]]"
  - "[[entra-agent-id]]"
---

# Credential Out of Sandbox（凭据不进沙箱）

## 摘要

凭据不进沙箱是 agent 沙箱"门怎么管"的核心做法：沙箱里的代码（harness、模型生成的脚本）拿不到任何原始密钥，也拿不到"读取密钥"所用的身份；它访问外部资源只能走沙箱外的一条出站路，由可信的中介组件认出请求来自哪个会话、判定能不能放行，放行之后才把真实凭据加到请求上。harness 需要的 API key 只是一个占位符。

前提是把沙箱里的一切当作不可信：harness 读的是模型输出、网页、仓库 README，随时可能被 prompt injection 劫持，所以请求里的任何头都可能是它自己写的。这一思路已在四个平台独立出现：Copilot Managed Runtime 的宿主中介（两层 iframe + CSP + JSON-RPC 唯一出口）、OpenSandbox Credential Vault、Agent Substrate 的 `atenet-egress`、AKS 上 agentgateway + 凭据代理。凭据并没有从系统里消失，只是被移到了可信计算基里，授权规则仍要按资源和动作收窄。

## Claims

### Claim: 四个独立平台的同一做法——沙箱只有一个受控出口，凭据由出口处的可信中介注入；机制可以是 egress 代理，也可以是浏览器宿主中介

- **来源**：[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]、[[Agent基础设施系列03：kagent与Agent-Substrate]]、[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]、[[Copilot-Managed-Runtime系列03：宿主沙箱与安全边界]]
- **首次出现**：2026-10-29
- **最近更新**：2026-11-14
- **置信度**：0.85
- **状态**：active

> OpenSandbox Credential Vault：沙箱进程只拿假值，egress sidecar 透明拦截 HTTPS，按 scheme / host / method / path **恰好命中一条**绑定规则才注入真实认证头，多条命中视为歧义拒绝；vault 只写不可读。坑：egress 须 `dns+nft` 模式（只靠 DNS 时直连 IP 可绕过）、不能与同 pod 的 Istio / Envoy 透明代理共存、vault 只在 sidecar 内存（暂停恢复后为空，须显式重新注入）、读不到 vault 时失败关闭（小请求 503、流式断开）。Agent Substrate：actor 的身份证书、JWT、API key、云 token 都不在沙箱里，由 `atenet-egress` 注入。Copilot Managed Runtime：宿主是唯一出口，机制为 iframe + CSP + JSON-RPC。AKS 参考实现：Pod 网络策略只放 DNS 与出站网关 8443，出站边车透明接住请求、用 Pod 证书建 mTLS CONNECT 隧道，网关选路由、问授权、通过才取凭据。四者均有实现或实测。

### Claim: 网关认证书不认请求头——身份只从 mTLS 连接取，沙箱带来的认证头与身份头一律剥掉；授权请求体由网关填写，动作由命中的路由决定而不是 agent 声称要做什么

- **来源**：[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]
- **首次出现**：2026-11-11
- **最近更新**：2026-11-14
- **置信度**：0.8
- **状态**：active

> 出站边车持有一张与 Pod 绑定的证书（恰好一个 `spiffe://<trust-domain>/ns/<ns>/sa/<sa>` SAN），客户端证书只挂给边车容器，agent 容器里找不到任何私钥。证书只说明连接来自哪个 SA 的 Pod，决策点还要回查：Pod 是否还活着、是否绑定在已准备好的会话上、来源地址对不对、会话属于哪个应用、应用当前声明里有没有申请这个动作、资源当前目标与请求目标是否一致，全部对上才问 OpenFGA。八种请求实测：已申请已批准 200；资源开了但应用没申请 403（凭据代理未被调用）；无路由 404；POST 404；自带假 `Authorization` 200（被剥掉换成平台 token）；伪造身份头冒充另一沙箱 200（仍按本沙箱判定）；直连 `api.github.com` / `github.com` 连接失败（不在白名单，解析都过不了）。harness 自己检查环境变量与 git 配置也找不到 token。

### Claim: 凭据在授权通过之后的最后一跳才出现——凭据代理只被放行的请求调用、只看到 host 头看不到请求内容、每请求一次不缓存；按资源换短期凭据就放在这里

- **来源**：[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]
- **首次出现**：2026-11-11
- **最近更新**：2026-11-14
- **置信度**：0.8
- **状态**：active

> 凭据代理是网关后端策略里的一个 extAuth 服务（十几行 Python），返回的 `authorization` 头加到发往上游的请求上。代理日志：被拒的请求没有对应调用；收到的请求只有 `host`，沙箱的假认证头与请求内容都没传过来——代理只负责给凭据，看不到 agent 在做什么；4 次放行对应 4 次调用。PoC 用的是权限很大的个人 CLI token，靠网关路由把用途限制在两个仓库的 GET 上，但 token 本身没这个限制；生产应换 GitHub App installation token（只授权所需仓库、一小时过期、由代理按资源换取）——代理拿得到资源是哪个，就能按资源选不同权限的凭据。

### Claim: 令牌只在控制面与网关之间流转、沙箱里一张都没有——凭据代理按"证书 → Pod → 会话 → owner"链向令牌服务取该会话对下游的令牌，下游身份可以是平台、用户（OBO）或 agent 自己

- **来源**：[[AKS-Agent-Runtime系列09：Agent以谁的身份行事]]、[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.65
- **状态**：active

> 系列 04 的凭据代理返回固定的平台 token，下游审计里只有"平台来调了"。改法：会话 API 校验用户令牌、把 oid 记为会话 owner；控制面加令牌服务，按需做 OBO，refresh token 加密后按会话存状态库（用户令牌本身不落库）；凭据代理在授权通过后沿"证书 → Pod → 会话 → owner"向令牌服务要这个会话对下游的令牌；agent 自己的身份由 Agent 定义里的字段指向其 agent identity。harness 照常把请求发给 provider 的 Service 名，认证全部由网关完成。不支持 OBO 的下游退回平台身份 + 网关审计，所以每个资源要声明自己用哪种身份。身份层机制见 [[entra-agent-id]]。这是设计，未实现。

### Claim: 拆到沙箱外不自动更安全——loop 在外、沙箱当工具时，loop 读的沙箱输出同样可能被注入，若 loop 手握长期凭据就成了 confused deputy；对策是 loop 调外部资源也走同一网关与按会话授权

- **来源**：[[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]]
- **首次出现**：2026-11-10
- **最近更新**：2026-11-14
- **置信度**：0.7
- **状态**：active

> 拓扑 B（自写可信 loop 在外，按需调沙箱执行 API）适合一个 loop 驱动多个沙箱、或流程比单个沙箱活得久的场景，但 loop 读完一段被污染的输出，会用自己的高权限去执行——低权限的不可信输入借高权限主体之手。所以凭据不进沙箱这条规矩不只针对沙箱，也针对沙箱外任何读不可信内容的组件：loop 本身不存长期凭据。系列 04 的实现也贯彻了这一点（身份只从证书取、动作由路由定、代理看不到内容），只是没有点名。`confused-deputy` 作为原子安全概念暂不单独建页（HOLD）。

## 冲突与演进

- 2026-10-29：`host-mediated-sandbox` 因三处来源同一产品 HOLD，作 [[copilot-managed-runtime]] Claim 收入。
- 2026-11-04：Agent 基础设施系列 02/03 出现两个非 Microsoft 低代码平台的同类实现，泛化为 `credential-out-of-sandbox`，作 [[agent-sandbox]] Claim 收入（0.75），仍不建页。
- 2026-11-14：两条复核阈值都满足——AKS Agent Runtime 系列 02 是第四个平台实现，系列 04 是专讲凭据代理与出口注入的实测文章。用户裁决建页，[[agent-sandbox]] 原 Claim 精简为指向本页，置信度 0.75 → 0.85。

## 关联概念

- [[agent-sandbox]] — `part-of` 沙箱三件事中"门怎么管"一件的核心做法
- [[copilot-managed-runtime]] — `contrasts` 同为"沙箱只有一个受控出口"，那边是浏览器宿主中介（iframe + CSP + JSON-RPC），这边以 egress 代理注入凭据为主
- [[entra-agent-id]] — `uses` 下游身份是平台、用户还是 agent 自己，由令牌服务按会话换取

## 来源日记

- [[2026-11-11-周三]] — AKS Agent Runtime 系列 04 出站治理 PoC + 成文
- [[AKS-Agent-Runtime系列04：出站治理与逐请求授权]] — 出站四个可信组件、八种请求实测、凭据代理日志
- [[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]] — 四类共享物中"凭据不共享"、拓扑 B 的 confused deputy
- [[AKS-Agent-Runtime系列09：Agent以谁的身份行事]] — 令牌服务与凭据代理的接法
- [[Agent基础设施系列02：Kubernetes上的Agent沙箱]] — OpenSandbox Credential Vault
- [[Agent基础设施系列03：kagent与Agent-Substrate]] — Agent Substrate 沙箱外注入
