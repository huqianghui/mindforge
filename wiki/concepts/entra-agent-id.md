---
title: "Entra Agent ID（双层身份模型）"
created: "2026-08-03"
updated: "2026-08-03"
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

与传统 App Registration / Service Principal 的 1:1 模型不同，Blueprint 与 Agent Identity 是 1:N 工厂模型（类比 Kubernetes Deployment/Pod）——本质是把 AI Agent 当作一种新的 **Workload Identity** 来治理，而不是一种新的 App。

## Claims

### Claim: Agent Blueprint 承担四职责——模板、凭据持有者、容器、创建入口

- **来源**：[[Entra Agent ID双层身份模型：Agent Blueprint与Agent Identity的认证授权分离设计]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.8
- **状态**：active

> 官方定义 Blueprint 是创建 agent identity 的模板对象：① 模板（共享属性：description、app roles、认证协议设置）；② 凭据持有者（FIC 推荐 / Certificate / Client Secret 三种，Agent Identity 自身零凭据）；③ 容器（1:N 父子关系）；④ 创建入口（服务用 Blueprint 的 client ID + 凭据经 Microsoft Graph API 创建 agent identity）。基于 Microsoft Learn 官方文档核对。

### Claim: Agent Identity 是无自有凭据的特殊 service principal——FIC-only 认证、始终单租户

- **来源**：[[Entra Agent ID双层身份模型：Agent Blueprint与Agent Identity的认证授权分离设计]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.8
- **状态**：active

> 官方明确 "Credentials do not reside on the agent identity"——Agent Identity 只能通过 Blueprint 签发的 FIC 认证；独立拥有 Object ID、Permissions、Sign-in/Audit Log、Owner/Sponsor 与生命周期。Agent Identity 始终单租户，而 Blueprint 可配置 multitenant（发布到其他租户后创建租户本地的 Agent Identity）。自治型 Agent 以 agent identity 获取 app token，交互型携带用户 token 走 on-behalf。

### Claim: 完整 Token 流程三阶段——认证走 Blueprint，中间有代表资格检查，资源授权基于 Agent Identity

- **来源**：[[Entra Agent ID双层身份模型：Agent Blueprint与Agent Identity的认证授权分离设计]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.8
- **状态**：active

> ① Blueprint Authentication：Blueprint 用自己的凭据向 Entra 认证（协议层就是 OAuth Client Credential Flow，Foundry 文档 "Agent Service presents the blueprint's OAuth credentials" 即指此）；② Entra 内部检查该 Blueprint 是否有资格代表目标 Agent Identity，通过才签发 Token（sub = Agent Identity）；③ 资源服务器按 Agent Identity 持有的 Permissions/Roles/Scopes 做访问授权。容易漏掉的是阶段②——"授权"实际有两种，通常说的"真正授权"指阶段③。

### Claim: 1:N 工厂模型的六层设计动机——本质是大规模 Agent 的 Workload Identity 治理，不是新 App

- **来源**：[[Entra Agent ID双层身份模型：Agent Blueprint与Agent Identity的认证授权分离设计]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.7
- **状态**：active

> "每个 Agent 一个 App Registration"技术可行但管理模式错配，六层动机：① 规模（17,000 Agent → 3 个 Blueprint）；② 凭据爆炸（Managed Identity→Blueprint FIC→N Agent，Agent 侧 secretless）；③ 策略继承（Conditional Access 等配在 Blueprint，继承非复制）；④ 一键熔断（禁用 Blueprint 全体失效）；⑤ Agent 生命周期以分钟/小时计，Blueprint 长存 = Factory Pattern（同构于 K8s Deployment/Pod）；⑥ 一级审计身份（每个 Agent 独立 Object ID + 日志 + Owner/Sponsor）。App Registration 假设"一个应用=一个身份"，Agent 世界是"一个 Runtime 动态创建上万实例各需独立身份"——Blueprint 解决的不是认证问题，是身份治理问题。

### Claim: Blueprint Authentication 属 Entra OAuth 层，与 Azure RBAC 是两套授权体系

- **来源**：[[Entra Agent ID双层身份模型：Agent Blueprint与Agent Identity的认证授权分离设计]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.8
- **状态**：active

> Azure 存在两套授权体系：Entra Authorization（OAuth Scope / Application Permission，管 Graph 与 Entra 对象 API）和 Azure RBAC（Role Assignment，管 ARM 资源）。Blueprint Authentication 完全属于认证层（Entra + OAuth），不是 RBAC；Agent Identity 拿 Token 访问 Storage/Key Vault/AKS 时才进入 RBAC 管辖，检查对象同样是 Agent Identity 而非 Blueprint。

## 冲突与演进

- 2026-07-19：《Foundry Agent 全面对比》首次引入（身份层三类 Agent 同源：blueprint + per-agent service principal），当时单源 HOLD 不建页，论断收入 [[foundry-agent-type-selection]] 治理分层 Claim。
- 2026-08-03：身份治理专文成文（基于 Microsoft Learn 官方文档核对），达到复核阈值（第 2 篇独立深度来源），用户裁决解除 HOLD 建页。

## 关联概念

- [[foundry-agent-type-selection]] — `grounds` 双层身份模型是该决策"身份层三者同源、治理分水岭在内容层"论断的身份层机制依据
- [[azure-copilot-ecosystem]] — `part-of` Entra Agent ID 是 Azure Agent 生态的身份治理底座

## 来源日记

- [[2026-08-03-周一]] — 阅读 Foundry Agent Service 文档中 "Blueprint authentication" 一句引发的双层模型梳理，经 ChatGPT 讨论 + Microsoft Learn 官方文档核对成文
