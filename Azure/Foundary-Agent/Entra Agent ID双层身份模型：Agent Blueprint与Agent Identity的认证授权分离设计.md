---
title: Entra Agent ID 双层身份模型：Agent Blueprint 与 Agent Identity 的认证授权分离设计
created: 2026-08-03
updated: 2026-08-04
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
description: 从 Entra Portal 中 Agent blueprints 与 Agent identities 两个菜单的困惑入手，梳理 Microsoft Entra Agent ID 的双层身份模型——Blueprint 持有凭据负责认证（Authentication），Agent Identity 持有权限负责授权（Authorization）与审计；对比传统 App Registration + Service Principal 的 1:1 模型与 Blueprint 1:N 工厂模型的差异，分析微软如此设计的六层动机（规模治理、凭据爆炸、Policy 继承、Kill Switch、短生命周期、一级审计身份），并厘清 Entra 授权与 Azure RBAC 两套授权体系的边界；新增 Foundry 实操一节——身份创建时序（项目不建/首 agent 建共享对/publish 建专属对）、实测偏差（portal New agent 即建专属 blueprint）、三个查看入口，以及"1:1 实测不推翻 1:N 模型"的辨析
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

> ⚠️ **注意**：1:N 是**对象模型的上限**（Graph API 层一个 Blueprint 下最多可挂 250 个 Agent Identity），不是 Foundry 的当前行为。Foundry 实测中 blueprint:identity 总是 **1:1 成对创建**——"N"兑现在别的维度（共享身份被 N 个未发布 agent 复用、多租户分发时一个 Blueprint 投影出 N 个租户本地 Identity）。详见第六节实测分析，避免误读为"Foundry 里一个 Blueprint 会孵化多个 Identity"。

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

## 六、Foundry 实操：身份何时创建、在哪查看、实测与文档的偏差

前五节讲的是 Entra Agent ID 的**对象模型**；这一节回答落到 Foundry Agent Service 上的四个实操问题——何时创建、在哪查看、实测行为与文档的偏差、以及"1:1 实测是否推翻 1:N 模型"。基于 2026-08-04 在真实项目（Sweden Central）上的验证与 [Agent identity concepts in Microsoft Foundry](https://learn.microsoft.com/azure/foundry/agents/concepts/agent-identity)（2026-07-31 更新版）核对。

### 6.1 创建时机：文档时序 vs 实测时序

官方文档描述的时序：

| 动作 | 文档说的身份行为 |
|------|-----------------|
| 创建 Foundry 项目 | **不创建**任何身份对象 |
| 项目内创建**第一个** agent | 创建项目级**默认共享** blueprint + agent identity 一对 |
| 创建第 2~N 个未发布 agent | 复用共享身份，**不建新对象** |
| **Publish** 某 agent | 才自动创建该 agent 的**专属** blueprint + identity 对，绑定到 agent application 资源 |
| 删除项目 / 删除 agent application | 分别清除共享对 / 专属对 |

**实测偏差**：在 portal 里点 New agent 创建两个 agent（均未发布），Entra 中却出现了**两个以 agent 命名的专属 blueprint**（命名格式 `{project名}-{agent名}-{5位hash}-AgentIdentityBlueprint`），同时项目级共享对也存在——即租户里实际是 **1 共享 + N 专属**，专属对在**创建时**就落了，不是等到 publish。

两种可能解释（尚无法从 JSON 分辨）：

1. **文档滞后**——portal 的 New agent 流程已改为"创建即注册"专属身份；
2. **提前注册、发布启用**——专属对提前落到 Entra 只为治理可见性（先有账），未发布 agent 运行时认证仍走共享身份，publish 后才切换到专属身份。验证方法是看 agent 实际调工具时 token 的 `sub` 是哪个 identity。

不受偏差影响的硬事实：**publish 后 RBAC 不继承**——发布产生新的 `agentIdentityId`，共享身份上的角色分配不会带过去，必须对新 ID 重新授权。

另外两个易混点：

- **version ≠ identity**：agent identity 绑定在 agent application 资源上，v1/v2 版本共享同一身份（版本只是配置快照）。微软 Q&A 同时承认：文档**没有硬承诺**每次 publish/版本更新时身份一定持续不变。
- **JSON View 里的 API version** 只是读取资源的 schema 版本，与身份无关，换哪个 version 看到的都是同一个身份对象。

### 6.2 三个查看入口

| 要看什么 | 入口 |
|----------|------|
| 共享身份（项目级） | Azure portal → Foundry **项目资源** → Overview → **JSON View** → 选最新 API version，看 `properties.agentIdentity` 块 |
| 专属身份（已发布 agent） | Azure portal → 该 agent 的 **agent application 资源** → Overview → **JSON View** |
| 租户级全量清单 + 治理 | [Microsoft Entra admin center](https://entra.microsoft.com) → **Entra ID → Agent ID → All agent identities**（含 Foundry、Copilot Studio 等全部来源；可配 Conditional Access、Identity Protection、治理） |

项目 JSON View 中的关键字段：

```jsonc
"agentIdentity": {
    "agentIdentityId": "...",          // 共享 agent identity——给 agent 授 RBAC 用这个 ID
    "agentIdentityBlueprintId": "..."  // 共享 blueprint
},
"identity": {
    "principalId": "...",              // ⚠️ 项目的 SystemAssigned managed identity
    "type": "SystemAssigned"           //    ——FIC 信任链锚点，不是 agent 身份！
}
```

最容易犯的错：把 RBAC 授给 `identity.principalId`（managed identity）。它的角色只是"blueprint 借它向 Entra 认证"（FIC 链：Blueprint --FIC信任--> Managed Identity），**真正需要资源角色的主体是 `agentIdentityId`**：

```bash
az role assignment create \
    --assignee "<agentIdentityId>" \
    --role "Storage Blob Data Contributor" \
    --scope "<storage-account-scope>"
```

Foundry portal 本身目前没有专门的身份查看页面——查 ID 要绕道 Azure portal 的 JSON View，这是当前体验短板。

### 6.3 1:1 实测不推翻双层模型——Blueprint 为什么省不掉

看到"每个 agent 一对 blueprint+identity"，自然会问：既然 1:1，直接用 identity 不就行了？答案是不行，且第四节的六层动机大多仍然成立：

1. **凭据分离不依赖 N**——Agent Identity 是**零凭据对象**，自己无法向 Entra 认证，唯一取 token 途径是 blueprint 代持凭据换发。砍掉 blueprint，identity 就必须自持 secret，退化回 App Registration + secret 蔓延的老路。认证/授权分离这个核心价值在 1:1 下一分不少。
2. **Blueprint 之间没有继承关系**——共享 blueprint 与各专属 blueprint 是平级独立对象，各自持有 FIC、各自被 Conditional Access 独立命中。名字带项目名只是命名惯例。
3. **"N"兑现在三个别处**——① 共享 blueprint 的那**一个** identity 被 N 个未发布 agent 复用（N:1，方向与工厂模型相反）；② 多租户分发：一个 blueprint 可投影到 N 个客户租户（每租户一个 blueprint principal + 本地 identity），ISV 卖 agent 给 100 家客户 = 1 blueprint : 100 identities；③ Graph API 上限一个 blueprint 挂 250 个 identity，为 fleet/短生命周期场景预留。
4. **参照物**：App Registration : Service Principal 在单租户实践中也几乎总是 1:1，没人因此说两层模型无用——多租户、凭据管理、策略分离的价值在需要时才显形。Entra Agent ID 完全同构。

诚实的结论：在单租户开发场景里，blueprint 的**即时**价值确实只剩"无密钥 FIC 管道 + 治理挂载点"；1:N 是为 ISV 分发和 fleet 治理预铺的架构。Foundry 每 agent 配一对，是平台替你选了最细粒度的治理单元，不是模型只能 1:1。

## 七、总结

| 维度 | Agent Blueprint | Agent Identity |
|------|-----------------|----------------|
| 本质 | Entra 中的模板对象（类 App Registration） | 特殊的 service principal |
| 持有 | 凭据（FIC/Certificate/Secret）、共享策略、模板属性 | 权限、Consent、审计日志、Owner/Sponsor |
| 负责 | Authentication（+ 代表资格授权） | Authorization（资源访问）+ Audit |
| 基数 | 1 个 Blueprint | 模型上限 N 个（≤250）；Foundry 实测 1:1 成对 |
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
- [Agent identity concepts in Microsoft Foundry](https://learn.microsoft.com/azure/foundry/agents/concepts/agent-identity) — Foundry 身份创建时序（共享/专属）、JSON View 查看入口、runtime token exchange 四阶段、RBAC 授权示例（2026-07-31 更新版）
- [Hosted agent permissions reference](https://learn.microsoft.com/azure/foundry/agents/concepts/hosted-agent-permissions) — Hosted agent 生产部署的完整权限清单（azd 只自动授 Foundry User 到共享身份）
