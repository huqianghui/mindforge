---
title: Entra Agent ID 双层身份模型：Agent Blueprint 与 Agent Identity 的认证授权分离设计
created: 2026-08-03
tags:
  - azure
  - entra-id
  - agent-id
  - foundry
  - agent
  - identity
  - authentication
  - authorization
  - security
description: 从 Entra Portal 中 Agent blueprints 与 Agent identities 两个菜单的困惑入手，梳理 Microsoft Entra Agent ID 的双层身份模型——Blueprint 持有凭据负责认证（Authentication），Agent Identity 持有权限负责授权（Authorization）与审计；对比传统 App Registration + Service Principal 的 1:1 模型与 Blueprint 1:N 工厂模型的差异，分析微软如此设计的六层动机（规模治理、凭据爆炸、Policy 继承、Kill Switch、短生命周期、一级审计身份），并厘清 Entra 授权与 Azure RBAC 两套授权体系的边界
---

# Entra Agent ID 双层身份模型：Agent Blueprint 与 Agent Identity 的认证授权分离设计

> 本文源于阅读 Foundry Agent Service 文档时的一句话："Blueprint authentication: Agent Service presents the blueprint's OAuth credentials to Microsoft Entra ID."（2026-08-03，基于 Microsoft Learn Agent ID 官方文档核对）

打开 Entra Portal，会在导航中看到两个并列的菜单：

```text
Entra ID
└── Agents
    ├── Agent blueprints
    └── Agent identities
```

这是 Microsoft Entra Agent ID 中最容易混淆的一对概念。一句话概括两者分工：

> **Blueprint 负责"证明是谁来申请身份"（Authentication），Agent Identity 代表"最终是谁在访问资源"（Identity + Authorization + Audit）。**

这个设计的核心目的是**认证与授权分离**——凭据集中在少数 Blueprint 上，权限和审计分散到每个 Agent Identity 上，从而在支撑成千上万 Agent 的同时把 secret 数量压到最少。

## 一、两层对象分别是什么

### Agent Blueprint：Agent 工厂 + 凭据持有者

按官方定义，[Agent identity blueprint](https://learn.microsoft.com/entra/agent-id/identity-platform/agent-blueprint) 是 Entra ID 中的一种对象，作为创建 agent identity 的模板（template）。它承担四个职责：

1. **模板（Template）**——定义这一"类"Agent 的共享属性：description、app roles、verified publisher、认证协议设置（如 OptionalClaims）。
2. **凭据持有者（Credential Holder）**——Agent Identity 自身**没有任何凭据**，所有认证凭据都配置在 Blueprint 上，支持三种类型：
   - Federated Identity Credentials（FIC，推荐，配合 Managed Identity 实现 secretless）
   - Certificates / 加密密钥
   - Client Secrets
3. **容器（Container）**——所有从该 Blueprint 创建的 Agent Identity 归属于它，形成 1:N 的父子关系。
4. **创建入口**——服务使用 Blueprint 的 client ID 与凭据，通过 Microsoft Graph API 发起 agent identity 的创建请求。

```text
Agent Blueprint（凭据 + 模板 + 策略）
      │
      ├── Agent Identity A
      ├── Agent Identity B
      └── Agent Identity C（各自持有权限、审计、Owner/Sponsor）
```

### Agent Identity：真正运行的 Agent 身份

[Agent identity](https://learn.microsoft.com/entra/agent-id/identity-platform/agent-identities) 是 Entra ID 中一种**特殊的 service principal**，代表一个 Blueprint 创建并被授权 impersonate 的身份。每个 Agent Identity 独立拥有：

- Object ID
- Permissions（Graph Permission / Scope / Consent）
- Sign-in Log 与 Audit Log
- Owner 与 Sponsor（问责关系）
- 独立生命周期

关键约束（官方明确）：

- **Agent Identity 没有自己的凭据**，只能通过 Blueprint 签发的 FIC 认证——"Credentials do not reside on the agent identity"。
- Agent Identity 是**单租户**的，只能在创建它的租户内获取 token；而 Blueprint 可以配置为 multitenant，发布到其他租户后创建租户本地的 Agent Identity。
- 自治型 Agent（autonomous）以 agent identity 获取 app token；交互型 Agent（interactive）携带用户 token 获取 on-behalf 的 user token。

## 二、认证与授权如何分工：完整 Token 流程

"认证走 Blueprint、授权走 Agent Identity"方向正确，但完整流程有三个阶段，中间还有一次容易被忽略的检查：

```text
① Blueprint Authentication（认证：我是哪个 Blueprint）
   Blueprint Credential（FIC / Certificate / Secret）
        │
        ▼
   Microsoft Entra ID 验证凭据

② Entra 内部授权检查（谁可以代表谁）
   检查：该 Blueprint 是否有资格代表目标 Agent Identity？
        │
        ▼
   签发 Token（sub = Agent Identity）

③ 资源访问授权（Agent 能做什么）
   Resource Server（Graph / SharePoint / 自定义 API / Azure Resource）
        │
        ▼
   检查该 Agent Identity 持有的 Permissions / Roles / Scopes
```

三点关键理解：

1. **登录的是 Blueprint，不是 Agent Identity**——这就是 Foundry 文档里 "Agent Service presents the blueprint's OAuth credentials" 的含义。协议层没有新东西，就是 OAuth Client Credential Flow。
2. **Blueprint 用自己的凭据，去申请属于某个 Agent Identity 的 Token**——官方表述为 "An agent identity blueprint is used to create agent identities **and request tokens using those agent identities**"。最终访问资源的 Token 主体（sub）是 Agent Identity。
3. **"授权"实际有两种**——Entra 内部的"Blueprint→Agent Identity 代表资格"授权（阶段②），以及资源服务器基于 Agent Identity 权限的访问授权（阶段③）。通常说的"真正授权"指后者。

## 三、与传统 App Registration 模型的对比

Blueprint / Agent Identity 的关系很像 App Registration / Service Principal（Enterprise Application），但有本质差异：

| 传统对象 | Agent ID 对象 | 差异 |
|----------|---------------|------|
| App Registration | Agent Blueprint | Blueprint 额外承担凭据集中持有 + 策略继承 + 工厂职责 |
| Service Principal（Enterprise App） | Agent Identity | Agent Identity **无自有凭据**，是"特殊的 service principal" |
| Client Secret（每 App 一套） | Blueprint 集中持有 | Agent Identity 侧零 secret |
| 权限（App 上配置） | Agent Identity 持有 | 认证与授权解耦 |

最核心的结构差异是基数（cardinality）：

```text
传统模型（1:1）                Agent ID 模型（1:N）
Application                   Blueprint
    │                             ├── Agent Identity A
    ▼                             ├── Agent Identity B
Service Principal                 └── Agent Identity ...N
```

传统模型里 Credential 和 Permission 绑在同一个对象链条上；Agent ID 模型把 Credential 上收到 Blueprint、把 Permission 下放到每个 Agent Identity。

## 四、为什么这么设计？——"每个 Agent 一个 App Registration"为什么行不通

技术上，"每个 Agent Identity 都注册一个 App"完全可行。微软引入 Blueprint 不是因为做不到，而是因为 **Agent 与传统 Application 的管理模式完全不同**。设计动机可以拆成六层：

### 1. 规模（Scale）

企业部署 17,000 个 Agent（客服 10,000 + 销售 5,000 + 编码 2,000），传统模型意味着 17,000 个 App Registration、17,000 套凭据、17,000 次轮换。Blueprint 模型下只需 3 个 Blueprint、3 套凭据。

### 2. 凭据爆炸（Credential Explosion）

企业 IAM 最大的痛点不是权限而是 **Secret Lifecycle**——过期、轮换、泄露。微软近年一直在推 Managed Identity、Federated Credential、Secretless Authentication，Blueprint 正是这条路线的延续：`Managed Identity → Blueprint（FIC）→ N 个 Agent`，Agent 侧完全无 secret。这就是"减少 secret 数量"的机制根源。

### 3. 策略继承（Policy Inheritance）

安全策略（Conditional Access、Token 有效期、Optional Claims）配置在 Blueprint 级别，所有当前和未来创建的 Agent Identity 自动继承——是继承（inheritance）而非复制（copy），改一处生效全体。

### 4. 一键熔断（Kill Switch）

Blueprint 被禁用时，其下所有 Agent Identity 立即无法认证。安全事件响应从"逐个 disable 上万个 App"变成"禁用一个 Blueprint"。

### 5. Agent 生命周期远比 App 短

传统集成应用（SAP Connector、CRM Integration）生命周期以年计；AI Agent 实例可能上午创建、下午销毁，以分钟/小时/天计。Blueprint 长存、Agent Identity 快速创建销毁——典型的 **Factory Pattern**。App Registration 从未为这种churn 设计过。

### 6. 一级审计身份（First-class Audit Identity）

如果上万个 Agent 共享一个 App 身份，日志里无法区分"是哪个 Agent 干的"。每个 Agent Identity 独立的 Object ID + Sign-in Log + Audit Log + Owner/Sponsor，才能满足 Agent 作为一级身份（first-class identity）的治理要求——这也是 Agent ID 最核心的价值。

### 类比：Kubernetes 的 Deployment 与 Pod

这套设计与 Kubernetes 高度同构：

```text
Deployment（模板 + 策略 + 统一管理）    Blueprint
        │                                  │
        ▼                                  ▼
Pods（独立生命周期/日志/IP）           Agent Identities（独立权限/审计/生命周期）
```

没人会手工创建 10,000 个 Pod，同理微软不希望企业手工注册 10,000 个 App。更深一层看：微软正在把 AI Agent 当作一种新的 **Workload Identity** 来治理，而不是一种新的 App。App Registration 的设计假设是"一个应用 = 一个身份"，而 Agent 世界是"一个 Agent Runtime 动态创建成千上万个实例，每个实例需要独立身份、权限、审计和生命周期"。Blueprint 本质上解决的不是认证问题，而是**大规模 AI Agent 的身份治理（Identity Governance）**问题。

## 五、厘清边界：这和 Azure RBAC 是什么关系

容易混淆是因为 Azure 里存在**两套授权体系**，Blueprint Authentication 与它们都不在同一层：

| 层 | 回答的问题 | 机制 | 例子 |
|----|-----------|------|------|
| Authentication（认证） | 你是谁？ | OAuth Client Credential（Secret / Certificate / FIC / Managed Identity） | Blueprint Authentication 在这一层 |
| Entra Authorization（授权体系一） | 你能调用哪些 Microsoft Graph / Entra 对象 API？ | OAuth Scope、Application/Delegated Permission | `AgentIdentityBlueprint.Create` 等 Graph 权限 |
| Azure RBAC（授权体系二） | 你能访问哪些 Azure 资源？ | Role Assignment（作用于 ARM 资源） | Storage Blob Data Reader、Key Vault Reader |

Blueprint Authentication 完全属于第一层（Entra + OAuth），**不是 RBAC**。当 Agent Identity 拿着 Token 去访问 Storage / Key Vault / AKS 时，才进入 Azure RBAC 的管辖范围——检查对象同样是 Agent Identity 而非 Blueprint。

## 六、总结

| 维度 | Agent Blueprint | Agent Identity |
|------|-----------------|----------------|
| 本质 | Entra 中的模板对象（类 App Registration） | 特殊的 service principal |
| 持有 | 凭据（FIC/Certificate/Secret）、共享策略、模板属性 | 权限、Consent、审计日志、Owner/Sponsor |
| 负责 | Authentication（+ 代表资格授权） | Authorization（资源访问）+ Audit |
| 基数 | 1 个 Blueprint | N 个 Agent Identity |
| 生命周期 | 长期存在 | 动态创建/销毁 |
| 租户 | 可 multitenant | 始终单租户 |
| Portal 关注点 | 平台/开发管理（凭据、OAuth 配置、关联 Identity） | 运维/安全治理（权限、登录、审计、状态） |

一句话记忆：

> **认证（Authentication）走 Blueprint；资源访问授权（Authorization）基于 Agent Identity；两者之间，Entra 还会先验证 Blueprint 是否有资格代表该 Agent Identity。**

## 参考资料

- [Agent identity blueprints in Microsoft Entra Agent ID](https://learn.microsoft.com/entra/agent-id/identity-platform/agent-blueprint) — Blueprint 四大职责的官方定义
- [Agent identities in Microsoft Entra Agent ID](https://learn.microsoft.com/entra/agent-id/identity-platform/agent-identities) — Agent Identity 无自有凭据、FIC-only 认证、单租户约束
- [Create an agent identity blueprint](https://learn.microsoft.com/entra/agent-id/create-blueprint) — Blueprint 创建流程、Owner/Sponsor、凭据配置
- [Microsoft Entra Agent ID documentation](https://learn.microsoft.com/entra/agent-id) — 文档中心（Conditional Access for agents、ID Governance、Inheritable permissions 等）
