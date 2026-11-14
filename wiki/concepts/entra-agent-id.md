---
title: "Entra Agent ID（双层身份模型）"
created: "2026-08-03"
updated: "2026-11-14"
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

- **来源**：[[Entra-Agent-ID的双层身份模型]]、[[AKS-Agent-Runtime系列09：Agent以谁的身份行事]]
- **首次出现**：2026-08-03
- **最近更新**：2026-11-14
- **置信度**：0.85
- **状态**：active
- **复核**：2026-11-07 确认——依据：[Authenticate and acquire tokens for autonomous agents](https://learn.microsoft.com/en-us/entra/agent-id/autonomous-agent-authentication-authorization-flow)（blueprint token 带 fmi_path → agent identity token → agent user token）；2026-11-14 实测佐证（见下方"两步换令牌"Claim），0.8 → 0.85

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
- **证据类型**：实测经验
- **复核**：2026-11-07 待定——依据：依据：官方文档仍写“发布 agent 时才创建专属 blueprint”(https://learn.microsoft.com/en-us/entra/id-governance/agent-id-governance-overview)，与实测相左；无新实测或文档修订能判断是实现已变还是仅治理可见性，需用 token 的 sub 复验

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

### Claim: 下游看到的身份有三种——平台身份、OBO 代表用户、Agent ID 每个 agent 各自的身份；真实平台三种同时存在，每个资源声明自己用哪一种

- **来源**：[[AKS-Agent-Runtime系列09：Agent以谁的身份行事]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.8
- **状态**：active

> 平台身份：网关注入平台凭据，下游只知道"平台来调了"，审计里只有一个名字、也没法按用户本人权限判断。OBO：控制面拿用户令牌用 MSAL 做 on-behalf-of 换下游令牌，令牌里同时写 oid=用户本人、azp=代办的控制面应用，下游按用户权限判断、用户没有的 agent 也拿不到；控制面用 Pod 的 Workload Identity 联合令牌作客户端断言，没有任何 secret，下游预授权了控制面所以没有同意弹窗。Agent ID：oid 是每个 agent 各自的，可单独授权、审计、停用；而控制面 app-only 令牌的 oid 是控制面本身、所有 agent 共用。很多内部系统只认服务账号或 API key、不支持 OBO，只能退回平台身份 + 网关逐请求授权与审计交代用户是谁。默认用 OBO，下游不支持才退回平台身份；agent 多起来再上 Agent ID。实测。

### Claim: Entra 会给租户里任何应用签发以你的 API 为 audience 的 app-only 令牌——未分配任何角色也照样签发，只校验 aud 的 API 谁都能调，必须同时看 scp 或 roles

- **来源**：[[AKS-Agent-Runtime系列09：Agent以谁的身份行事]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.85
- **状态**：active

> 控制面应用用 client credentials 拿下游 API 的令牌，预期因下游没给它任何应用角色而失败，结果照样签发：`idtyp=app`、无 `scp`、无 `roles`、有效期 1445 分钟。授权必须同时看 `scp`（委托）或 `roles`（应用）。这条与 agent 无关，是通用的 Entra 安全事实，但 agent 平台会让一个 API 的调用方一下子多出很多来。实测。

### Claim: OBO 换出的令牌不比用户令牌活得久；用户令牌过期后旧令牌不能再做 OBO，只能靠 OBO 时拿到的 refresh token 续——refresh token 成了控制面里最敏感的数据

- **来源**：[[AKS-Agent-Runtime系列09：Agent以谁的身份行事]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.8
- **状态**：active

> 用户令牌有效期 68 分钟，OBO 换出的令牌过期时间比它早 2 秒。Durable 会话可保留好几天。用户令牌过期 2 分钟后：拿旧用户令牌重新 OBO 失败（`AADSTS500133`，断言不在有效期内）；用 MSAL 缓存里的 refresh token 续期成功，新委托令牌用户仍是本人、代办仍是控制面。所以要让 agent 在用户离开后继续以用户身份做事，控制面必须保存 refresh token（用户令牌本身留着没用）：加密存放、按会话隔离、会话删除时一起删；其有效期与吊销策略由租户决定，最终能续多久未测。另一种默认更安全：令牌过期后暂停需要用户身份的操作，等用户回来重新授权。实测。

### Claim: Agent ID 两步换令牌在 AKS 上用联合凭据跑通、无 secret；agent identity 代表用户的 OBO 卡在同意（AADSTS65001）——技术链路无障碍，卡的是授权治理

- **来源**：[[AKS-Agent-Runtime系列09：Agent以谁的身份行事]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.7
- **状态**：active

> 用 Azure CLI 自带的 Graph 权限建 blueprint 与 blueprint principal（该租户已有 3 万多个 blueprint），给 blueprint 加信任 AKS 某 ServiceAccount 的联合凭据，再建一个 `ServiceIdentity` 类型的 agent identity。取令牌：blueprint 以 SA 联合令牌做 client credentials 并带 `fmi_path=<agent identity id>` 换交换令牌 T1（`sub` 是末尾为该 id 的 FMI 路径），agent identity 以 T1 作客户端断言换下游令牌，最终 `sub` / `azp` / `oid` 全是该 agent identity——与本页"完整 Token 流程三阶段"一致。agent 代表用户：用户令牌 audience 须为 blueprint（拿到，80 分钟），OBO 返回 `AADSTS65001` 未同意；下游预授权 agent identity 不行（只有服务主体、没有应用对象，写不进预授权列表），自建针对本人的委托授权被拒（guest 权限不足）。正规做法是管理员在 blueprint 上配可继承权限或对 agent identity 做管理员同意——这个审批要算进上线流程。代表用户一段未跑通，按文档推断，置信度保守。

## 冲突与演进

- 2026-07-19：《Foundry Agent 全面对比》首次引入（身份层三类 Agent 同源：blueprint + per-agent service principal），当时单源 HOLD 不建页，论断收入 [[foundry-agent-type-selection]] 治理分层 Claim。
- 2026-08-03：身份治理专文成文（基于 Microsoft Learn 官方文档核对），达到复核阈值（第 2 篇独立深度来源），用户裁决解除 HOLD 建页。
- 2026-08-04：Foundry 实测（Sweden Central 项目）发现 portal New agent 创建即建专属 blueprint 对，与官方文档"publish 才建"冲突——新增实测偏差 Claim；1:N 工厂模型 Claim 加限定（Foundry 实践 1:1 成对，N 兑现在共享复用/多租户分发）；新增创建时序 Claim；专文同步补第六节"Foundry 实操"。

- 2026-11-07：/revalidate 复核——确认 5（其中 1 条 +0.1）、修订 1、待定 1
- 2026-11-07：/revalidate 全库复核（证据分类）——待定 1
- 2026-11-14：AKS Agent Runtime 系列 09 注入四条实测（三种下游身份、app-only 只验 aud 的坑、OBO 过期与 refresh token、Agent ID 两步换令牌与代表用户卡在同意），"Token 流程三阶段"获实测佐证 0.8 → 0.85。`on-behalf-of-delegation` 作为原子概念暂不单独建页（HOLD）。

## 关联概念

- [[foundry-agent-type-selection]] — `grounds` 双层身份模型是该决策"身份层三者同源、治理分水岭在内容层"论断的身份层机制依据
- [[azure-copilot-ecosystem]] — `part-of` Entra Agent ID 是 Azure Agent 生态的身份治理底座

## 来源日记

- [[2026-08-03-周一]] — 阅读 Foundry Agent Service 文档中 "Blueprint authentication" 一句引发的双层模型梳理，经 ChatGPT 讨论 + Microsoft Learn 官方文档核对成文
- [[Agent基础设施系列03：kagent与Agent-Substrate]] — Substrate 的 per-actor SPIFFE 身份与环境变量冻结坑（2026-11-02）
- [[2026-11-13-周五]] / [[AKS-Agent-Runtime系列09：Agent以谁的身份行事]] — OBO / app-only / Agent ID 在 AKS 上的实测
