---
title: "Entra Agent ID（双层身份模型）"
created: "2026-08-03"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - azure
  - identity
  - agent
  - security
aliases:
  - "Microsoft Entra Agent ID"
  - "Agent Blueprint"
  - "Agent Identity"
related:
  - "[[foundry-agent-type-selection]]"
  - "[[azure-copilot-ecosystem]]"
---

# Entra Agent ID（双层身份模型）

## 摘要

Microsoft Entra Agent ID 是微软为 AI Agent 设计的身份治理体系，核心是**认证与授权分离的双层模型**：Agent Blueprint（模板 + 凭据持有者）负责"证明是谁来申请身份"（Authentication），Agent Identity（特殊 service principal）代表"最终是谁在访问资源"（Authorization + Audit）。凭据集中在少数 Blueprint 上、权限和审计分散到每个 Agent Identity 上，从而在支撑成千上万 Agent 的同时把 secret 数量压到最少。

与传统 App Registration / Service Principal 的 1:1 模型不同，Blueprint 与 Agent Identity 是 1:N 工厂模型（类比 Kubernetes Deployment/Pod）——本质是把 AI Agent 当作一种新的 **Workload Identity** 来治理，而不是一种新的 App。注意 1:N 是对象模型上限（单 Blueprint ≤250 identity），Foundry 实测中 blueprint:identity 为 1:1 成对创建，"N"兑现在共享身份复用与多租户分发。

## Claims

### Claim: Agent Blueprint 承担四职责——模板、凭据持有者、容器、创建入口

- **来源**：[[Entra-Agent-ID的双层身份模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **复核**：2026-11-07 确认——依据：[Agent identities in Microsoft Entra Agent ID](https://learn.microsoft.com/en-us/entra/agent-id/agent-identities)

> 官方定义 Blueprint 是创建 agent identity 的模板对象：① 模板（共享属性：description、app roles、认证协议设置）；② 凭据持有者（FIC 推荐 / Certificate / Client Secret 三种，Agent Identity 自身零凭据）；③ 容器（1:N 父子关系）；④ 创建入口（服务用 Blueprint 的 client ID + 凭据经 Microsoft Graph API 创建 agent identity）。基于 Microsoft Learn 官方文档核对。

### Claim: Agent Identity 是无自有凭据的特殊 service principal——FIC-only 认证、始终单租户

- **来源**：[[Entra-Agent-ID的双层身份模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-11-07
- **置信度**：0.9
- **状态**：active
- **复核**：2026-11-07 确认——依据：[Agent identities in Microsoft Entra Agent ID](https://learn.microsoft.com/en-us/entra/agent-id/agent-identities)（无自有凭据、只经 blueprint 签发的 FIC 认证、单租户；blueprint 可多租户）

> 官方明确 "Credentials do not reside on the agent identity"——Agent Identity 只能通过 Blueprint 签发的 FIC 认证；独立拥有 Object ID、Permissions、Sign-in/Audit Log、Owner/Sponsor 与生命周期。Agent Identity 始终单租户，而 Blueprint 可配置 multitenant（发布到其他租户后创建租户本地的 Agent Identity）。自治型 Agent 以 agent identity 获取 app token，交互型携带用户 token 走 on-behalf。

### Claim: 完整 Token 流程三阶段——认证走 Blueprint，中间有代表资格检查，资源授权基于 Agent Identity

- **来源**：[[Entra-Agent-ID的双层身份模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **复核**：2026-11-07 确认——依据：[Authenticate and acquire tokens for autonomous agents](https://learn.microsoft.com/en-us/entra/agent-id/autonomous-agent-authentication-authorization-flow)（blueprint token 带 fmi_path → agent identity token → agent user token）

> ① Blueprint Authentication：Blueprint 用自己的凭据向 Entra 认证（协议层就是 OAuth Client Credential Flow，Foundry 文档 "Agent Service presents the blueprint's OAuth credentials" 即指此）；② Entra 内部检查该 Blueprint 是否有资格代表目标 Agent Identity，通过才签发 Token（sub = Agent Identity）；③ 资源服务器按 Agent Identity 持有的 Permissions/Roles/Scopes 做访问授权。容易漏掉的是阶段②——"授权"实际有两种，通常说的"真正授权"指阶段③。

### Claim: 1:N 工厂模型的六层设计动机——本质是大规模 Agent 的 Workload Identity 治理，不是新 App

- **来源**：[[Entra-Agent-ID的双层身份模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **复核**：2026-11-07 确认——依据：[Agent identities, service principals, and applications](https://learn.microsoft.com/en-us/entra/agent-id/agent-service-principals)（一个 blueprint 产生多个 agent identity，凭据集中在 blueprint）

> "每个 Agent 一个 App Registration"技术可行但管理模式错配，六层动机：① 规模（17,000 Agent → 3 个 Blueprint）；② 凭据爆炸（Managed Identity→Blueprint FIC→N Agent，Agent 侧 secretless）；③ 策略继承（Conditional Access 等配在 Blueprint，继承非复制）；④ 一键熔断（禁用 Blueprint 全体失效）；⑤ Agent 生命周期以分钟/小时计，Blueprint 长存 = Factory Pattern（同构于 K8s Deployment/Pod）；⑥ 一级审计身份（每个 Agent 独立 Object ID + 日志 + Owner/Sponsor）。App Registration 假设"一个应用=一个身份"，Agent 世界是"一个 Runtime 动态创建上万实例各需独立身份"——Blueprint 解决的不是认证问题，是身份治理问题。
>
> **限定（2026-08-04 实测）**：1:N 是模型上限（Graph API 单 Blueprint ≤250 identity），Foundry 实践为 1:1 成对；"N"实际兑现在三处——共享 blueprint 的 1 个 identity 被 N 个未发布 agent 复用（方向相反的 N:1）、多租户分发时 1 blueprint 投影 N 个租户本地 identity（blueprint principal 机制）、fleet 场景预留。六层动机中①⑤按字面（一类 Agent 万级实例共享 Blueprint）在 Foundry 单租户实践中未兑现；②③④⑥不依赖 N，1:1 下依然成立。Blueprint 之间无继承关系（共享与专属 blueprint 是平级独立对象）。

### Claim: Foundry 身份创建时序——项目不建、首 agent 建共享对、publish 建专属对且 RBAC 不继承

- **来源**：[[Entra-Agent-ID的双层身份模型]]（第六节，官方 Foundry agent-identity 概念文档 2026-07-31 版）
- **首次出现**：2026-08-04
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **复核**：2026-11-07 修订——依据：[Agent identity concepts in Microsoft Foundry](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/agent-identity)

> 官方时序：创建项目**不建**任何身份对象；项目内**第一个** agent 触发创建项目级共享 blueprint + agent identity 对；后续未发布 agent 复用共享身份；**publish** 才创建绑定 agent application 资源的专属对。publish 后 **RBAC 不继承**——新 `agentIdentityId` 必须重新授权。version ≠ identity：身份绑 agent application，v1/v2 共享同一身份（且微软 Q&A 承认文档未硬承诺版本更新时身份持续性）。查看入口：项目/agent application 资源的 Azure portal JSON View（`properties.agentIdentity`），租户全量在 Entra admin center → Agent ID。易错点：项目 JSON 的 `identity.principalId` 是 SystemAssigned managed identity（FIC 锚点），不是 agent 身份，RBAC 要授给 `agentIdentityId`。

> **2026-11-07 修订**：“未发布 agent 共享项目身份、发布后换专属身份且 RBAC 要重新分配”仍是文档原意；但文档注明这是 Agent Application 发布模型下的行为，发布体验正在迁往新的 agent object model（新 agent endpoint 与发布方式），新模型下的创建时序要另查迁移文档。Foundry RBAC 角色已改名（Azure AI User → Foundry User 等，role ID 不变）。

### Claim: 实测偏差——portal New agent 创建即得专属 blueprint 对，早于文档的"publish 才建"

- **来源**：[[Entra-Agent-ID的双层身份模型]]（2026-08-04 Sweden Central 真实项目实测）
- **首次出现**：2026-08-04
- **最近更新**：2026-08-04
- **置信度**：0.7
- **状态**：stale
- **复核**：2026-11-07 待定——依据：本轮未找到能印证或否定这次实测的文档；发布模型迁移可能是原因，待在新 agent object model 下重测

> 在 portal 点 New agent 创建两个未发布 agent，Entra 中出现两个以 agent 命名的专属 blueprint（`{project}-{agent}-{hash}-AgentIdentityBlueprint`），同时项目共享对存在——实际为"1 共享 + N 专属"，专属对在**创建时**即落，与文档"publish 才建"冲突。两种解释待验证：文档滞后（创建即注册），或提前注册仅为治理可见性、运行时仍走共享身份（需看工具调用 token 的 sub 判定）。单租户单次观察，置信度受限。

### Claim: Blueprint Authentication 属 Entra OAuth 层，与 Azure RBAC 是两套授权体系

- **来源**：[[Entra-Agent-ID的双层身份模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **复核**：2026-11-07 确认——依据：[Agent identity concepts in Microsoft Foundry](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/agent-identity)（agent identity 作为 service principal 另行分配 Azure RBAC）

> Azure 存在两套授权体系：Entra Authorization（OAuth Scope / Application Permission，管 Graph 与 Entra 对象 API）和 Azure RBAC（Role Assignment，管 ARM 资源）。Blueprint Authentication 完全属于认证层（Entra + OAuth），不是 RBAC；Agent Identity 拿 Token 访问 Storage/Key Vault/AKS 时才进入 RBAC 管辖，检查对象同样是 Agent Identity 而非 Blueprint。

### Claim: agent 身份的另一种实现——Agent Substrate 给每个 actor 一张短期 SPIFFE 证书、身份由运行时投射而非从环境变量读

- **来源**：[[Agent基础设施系列03：kagent与Agent-Substrate]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.55
- **状态**：active

> 与 Entra Agent ID 的"Blueprint + Agent Identity、FIC-only"不同，Substrate 走工作负载身份路线：每个 actor 一张短期 SPIFFE 证书，egress 网关可按需签发带 actor 身份的 JWT，`ate-idp-server` 提供验签公钥便于与外部身份系统联邦；actor 进程本身不持有证书与 JWT，凭据在沙箱外注入。坑：环境变量在 golden snapshot 里冻结，从同一模板恢复的所有 actor 读到同一个值，身份必须从按 actor 投射的元数据文件读。缺口：入站只校验调用方 SPIFFE ID 是否在静态白名单，白名单内任何调用方都能访问任何 actor。自建 runtime 上的 agent 仍可映射到 Entra Agent ID 登记进 Agent 365（Runtime ↔ Platform 接口）。

## 冲突与演进

- 2026-07-19：《Foundry Agent 全面对比》首次引入（身份层三类 Agent 同源：blueprint + per-agent service principal），当时单源 HOLD 不建页，论断收入 [[foundry-agent-type-selection]] 治理分层 Claim。
- 2026-08-03：身份治理专文成文（基于 Microsoft Learn 官方文档核对），达到复核阈值（第 2 篇独立深度来源），用户裁决解除 HOLD 建页。
- 2026-08-04：Foundry 实测（Sweden Central 项目）发现 portal New agent 创建即建专属 blueprint 对，与官方文档"publish 才建"冲突——新增实测偏差 Claim；1:N 工厂模型 Claim 加限定（Foundry 实践 1:1 成对，N 兑现在共享复用/多租户分发）；新增创建时序 Claim；专文同步补第六节"Foundry 实操"。

- 2026-11-07：/revalidate 复核——确认 5（其中 1 条 +0.1）、修订 1、待定 1

## 关联概念

- [[foundry-agent-type-selection]] — `grounds` 双层身份模型是该决策"身份层三者同源、治理分水岭在内容层"论断的身份层机制依据
- [[azure-copilot-ecosystem]] — `part-of` Entra Agent ID 是 Azure Agent 生态的身份治理底座

## 来源日记

- [[2026-08-03-周一]] — 阅读 Foundry Agent Service 文档中 "Blueprint authentication" 一句引发的双层模型梳理，经 ChatGPT 讨论 + Microsoft Learn 官方文档核对成文
- [[Agent基础设施系列03：kagent与Agent-Substrate]] — Substrate 的 per-actor SPIFFE 身份与环境变量冻结坑（2026-11-02）
