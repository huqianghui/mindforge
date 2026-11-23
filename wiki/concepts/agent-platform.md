---
title: "Agent Platform"
created: "2026-11-16"
updated: "2026-11-23"
tags:
  - wiki
  - concept
  - agent
  - agent-platform
  - registry
  - governance
aliases:
  - "Agent 平台"
  - "agent platform"
  - "agent 注册与发现"
  - "agent registry"
  - "Agent 365"
  - "agent 目录"
related:
  - "[[agent-protocol-stack]]"
  - "[[foundry-agent-type-selection]]"
  - "[[agent-runtime]]"
  - "[[agent-framework]]"
  - "[[agent-harness]]"
  - "[[agent-infra-three-layers]]"
  - "[[entra-agent-id]]"
  - "[[a2a-protocol]]"
  - "[[ai-gateway]]"
  - "[[copilot-studio]]"
  - "[[foundry-agent-service]]"
  - "[[copilot-managed-runtime]]"
---

# Agent Platform（Agent 平台）

## 摘要

Agent Platform 回答"企业怎么构建、运行、发现、治理这些 agent"。这个词有两种用法，要分开：

- **广义**：企业实际拿来用的整套产品。Copilot Studio、Foundry Agent Service、Copilot Managed Runtime 都是微软给的 agent platform，区别在替你打包了哪几层、留给你哪几层；AKS Agent Runtime 系列做的，是用 AKS 加开源组件**自己搭一个** agent platform。
- **狭义**：三层划分里最上面那一层，只管注册与目录、agent 身份、发现协议、安全合规与台账，代表是 Agent 365。它**不运行 agent**，也不在请求的数据路径上。

广义 platform 的核心是 [[agent-runtime]]：会话、模型接入、A2A、沙箱、逐请求授权这些新概念都出在那一层；Hosted Agent 本身就是一个托管的 agent runtime，Foundry 整体才是 platform。自建时，agentgateway、OpenFGA、kagent、Nacos、agent-sandbox、OpenSandbox 这些开源组件各补其中一块，语义层和胶水要自己写。agent 定义本身（一个 CRD 加 type、不可变 revision、CEL 与 controller 两级校验）是狭义 platform 与 runtime 的交界：定义由 platform 登记和发布，runtime 按定义领沙箱、跑会话。

## Claims

### Claim: 微软的三种托管 agent platform 打包的层数不同——Copilot Studio 三层全包、Foundry 的 Prompt Agent 全包而 Hosted Agent 只托管 runtime、Copilot Managed Runtime 托管的是应用而不是 agent；Agent 365 只做狭义 platform

- **来源**：[[Agent基础设施系列04：Framework层与三层串联]]、[[Foundry-Agent三种形态对比与选型]]、[[Copilot-Studio系列03：四种Harness对比与选型]]、[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active

> Copilot Studio：agent 定义是 Dataverse 的一行，选 harness 就是选 runtime（经典运行时 / Agentic Runtime / M365 Copilot 编排器），治理横跨 Power Platform 与 M365 两个 admin center，三层都定死、建后不能互转（[[copilot-studio]]）。Foundry Agent Service：Prompt Agent 的 planner 与 state 全是平台黑盒；Hosted Agent 是"framework 自选、runtime 托管"——每会话 VM 沙箱、空闲回收与带状态恢复、Entra agent identity、Responses / Invocations 端点，Hosted Agent 本身就是托管的 agent runtime（[[foundry-agent-service]]）。Copilot Managed Runtime：M365 侧托管的是企业内部 SPA 应用，替你承担 Entra 登录、分享、条件访问与 DLP，代价是没有自有后端与网络控制，后端只能经 Connector，连 Copilot Studio agent 都调不到（[[copilot-managed-runtime]]）。Agent 365：只有注册表、身份与合规，不运行任何 agent，自家、第三方、自建的 agent 都能登记进来。选型就是看被定死的格子里有没有将来一定要改的东西（锁定矩阵见 [[agent-infra-three-layers]]）。

### Claim: 在 AKS 上自建 agent platform，是在 agent runtime 外面再补定义注册、agent 网关与企业目录——开源组件各补一块（agent-sandbox / OpenSandbox、agentgateway、OpenFGA、kagent、Nacos、Dapr），controller 语义校验、会话控制面与"协议到会话 API"的适配要自己写

- **来源**：[[AKS-Agent-Runtime系列00：导读]]、[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]、[[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]]、[[AKS-Agent-Runtime系列10：为什么在AKS上自建]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active

> 按层摊开：隔离（AKS Kata）与沙箱编排（agent-sandbox / OpenSandbox）开源和 AKS 覆盖较好；会话控制面（Dapr、Service Bus、PostgreSQL 只是底座）与授权模型（OpenFGA、SPIFFE、Entra 只是底座）是最重的自研；agentgateway 一个项目分三套部署做 agent 网关、模型网关、出站网关（[[ai-gateway]]）；定义与注册用 kagent 或自定义 Agent CRD，跨集群再加 Nacos；企业目录与 agent 身份走 Entra Agent ID 并登记进 Agent 365。和托管 platform 的对照：Hosted Agent 已包了最费劲的执行与会话几块，自建只在三类场景下值得（[[foundry-agent-type-selection]]），代价是长期维护控制面（[[agent-runtime]]）。参考实现没有独立的 agent 网关和企业目录，这两块是系列里还没做完的部分。

### Claim: 狭义 platform 与 runtime 的治理各有一份——runtime 的治理平面在数据路径上逐请求判断，platform 在数据路径之外管台账、身份生命周期与合规；客户要的"自主可控"多半指前者

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]、[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]、[[AKS-Agent-Runtime系列09：Agent以谁的身份行事]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.65
- **状态**：active

> Runtime 的治理平面：出站网关、模型网关、授权决策点、凭据注入，每个请求都经过（[[ai-gateway]]、[[relationship-based-access-control]]、[[credential-out-of-sandbox]]）。Platform：Agent 365 的注册表纳管微软自家、第三方和自建平台上的 agent，Entra Agent ID 给每个 agent 身份并套上 owner、sponsor、条件访问，Defender 与 Purview 管安全合规——它不运行 agent，也不在请求路径上（Nacos 一类注册中心同理："找得到"不等于"调得通、管得住"）。两处靠 agent 身份、网关路由、OTel trace 对接（层间接口见 [[agent-infra-three-layers]]）。所以跑在自己 AKS 上的 agent 照样能登记进 Agent 365，自建 runtime 不必重造 platform。归纳自三篇文章，未做 Agent 365 实接。

### Claim: 发现分三层、授权另走一条路——集群内查 CRD（RBAC 管可见性）、跨框架用 A2A Agent Card、企业级同步到 agent 目录；卡片只放对外信息、只发布 Ready 的版本

- **来源**：[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active

> 集群内：kubectl get agents 能看到完整定义（权限申请、会话策略、解析后的 digest、revision 历史），适合平台运维和同团队，别的框架与集群不认识这个 CRD。跨框架：controller 从 CRD 生成 Agent Card，按 /.well-known/agent-card.json 发布，只放名字、描述、skills、入口地址、认证方式、版本，版本号后带 revision 哈希让调用方看出 agent 变没变；三张卡片经 SDK 解析与 protobuf 严格模式两次校验通过。企业级：同步到企业 agent 目录，让 Teams、Copilot 等其他产品找得到 AKS 上的 agent——没有做，它要和 agent 自己的身份一起做。卡片里的认证声明和调用授权分开设计，"能被发现不等于能被调用"归口 [[a2a-protocol]]。

### Claim: 注册中心以谁为准二选一——Kubernetes API（CRD 即注册表，与沙箱、会话打通）或 Nacos（版本、审核、可见性、订阅，适合多集群与非 Kubernetes 系统）；选后者要自己写双向同步

- **来源**：[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-16
- **置信度**：0.6
- **状态**：active

> 以 Kubernetes API 为准：CRD 本身就是注册表，controller 生成卡片并发布，revision 用内容哈希自己写。以 Nacos 为准：它托管 AgentCard、MCP server、Skill、Prompt 及版本，内置草稿与审核，按命名空间和可见性发现、SDK 订阅；要自己写 CRD 状态 → Nacos、Nacos 审核结果 → status 的同步，只同步 Ready 的版本。kagent 适合声明式 agent 为主；企业目录面向 Teams、Copilot。我的组合：kagent 管声明式、自定义 CRD 管另外两类、agentgateway 单独一套做 agent 网关、OpenFGA 管调用授权、Nacos 只在跨集群跨技术栈时再加。真正要投入的是 controller 的语义校验与"协议到会话 API"的适配，开源项目替不了。设计结论，Nacos 未实测。

### Claim: agent 定义按不可变 revision 管——revision 固定的是配置（名取规范化 spec 的内容哈希、只能新建不能改），权限每次请求实时算；skills 包用 OCI artifact 按 digest 拉而不放 ConfigMap

- **来源**：[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-16
- **置信度**：0.75
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-16 确认——依据：来源 [[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]（2026-11-15 修订），修订后原文仍含本条的数字与结论

> 统一 `Agent` CRD 加 `spec.type`，三类共用字段在外、各自配置在对应块里。纯结构规则（type 与配置块对应）写 CEL，提交即拒、集群里没有这个对象；需查外部系统的规则（批准的运行时类 / 模型 / 镜像仓库前缀、代码镜像必须写 digest、skills tag 能否解析）放 controller，结果写进 status——五种故意写错的 agent 分别被 CEL 与 controller 拦下，后四个 Ready=False、不生成 revision、注册端点返回 404。revision：新会话用最新的，在跑的会话保持原来的；参考实现文档里，已有会话是否连权限一起固定，前后两处表述不一致（已裁决）：系列 04 撤销约 1 秒生效的实测表明权限是每次请求实时算的。skills 包：1.6 MB 的 ConfigMap 被 API Server 拒（上限 1048576 字节，kagent 1.x 每 revision 配置与卡片合计 ≤ 256 KiB）；改用 oras 打 OCI artifact 推 ACR，controller 用 Workload Identity 换 ACR 令牌 HEAD manifest 解析 digest；沙箱放文件必须按 revision 里记的 digest 拉——按 tag 拉到的是新内容，同一 revision 的两个会话可能拿到不同 skills。tag 挪动的处理见 [[reconciliation-loop]]。实测。

### Claim: agent 资产的分发走 OCI 供应链——Registry 本质是内容寻址存储，skills 包、模型权重、SBOM、签名都可以作为 OCI artifact 进 ACR，按 digest 拉取、用 Cosign 在集群侧验签

- **来源**：[[OCI镜像工具生态]]、[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]
- **首次出现**：2026-11
- **最近更新**：2026-11-16
- **置信度**：0.65
- **状态**：active
- **证据类型**：实测经验

> 五个工具四类问题：Skopeo 搬运（registry 之间复制同步）、crane / regctl 操作与调试（tag、digest、manifest）、ORAS 把任意内容存成 OCI artifact、Cosign 签名与验证。认知上的转变是从"容器运行时视角"（镜像 → registry → Kubernetes，关心怎么跑）到"供应链视角"（镜像、模型、SBOM、签名都是 artifact，关心怎么管）。agent platform 里的落点：系列 07 把 skills 与 AGENTS.md 用 oras 打包推 ACR、controller 解析 digest 写进 revision、沙箱按 digest 拉（按 tag 拉会让同一 revision 的两个会话拿到不同内容）；再往前一步就是对这些 artifact 签名，在准入时验签，让"发布了哪个版本的 agent"有可验证的来源。验签一步本库尚未实践。

## 冲突与演进

- 2026-11-16：完备性补抽 [[OCI镜像工具生态]]，新增 1 条 Claim。
- 2026-11-16：独立建页。revision 一条原在 [[agent-infra-three-layers]]，原文搬来；新增托管 platform 打包层数、AKS 自建 platform、治理两处、发现三层、注册中心以谁为准五条。按用户界定区分广义（整套产品，含 runtime）与狭义（三层里的 Platform 层）两种用法：Copilot Studio、Foundry、Managed Apps 与 AKS 系列都是在讲广义的 agent platform。
- Agent 365、Nacos、kagent 作别名与证据，不建产品页（微软三支柱之外的产品沿用"产品名不建页"规则）。

## 关联概念

- [[agent-protocol-stack]] — `uses` 发现与注册依赖 A2A 卡片
- [[foundry-agent-type-selection]] — `part-of` Foundry 上 Prompt / Hosted 的选型
- [[agent-runtime]] — `part-of` 广义 platform 的核心；与狭义 platform 相比，runtime 在数据路径上逐请求执行，platform 管台账与合规
- [[copilot-studio]] — `implements` 三层全包的托管 agent platform
- [[foundry-agent-service]] — `implements` Prompt Agent 全包、Hosted Agent 托管 runtime
- [[copilot-managed-runtime]] — `implements` M365 侧托管应用的平台，替你承担身份、分享与治理
- [[entra-agent-id]] — `part-of` platform 的身份一环
- [[a2a-protocol]] — `uses` 跨框架发现靠 Agent Card；能被发现不等于能被调用
- [[ai-gateway]] — `contrasts` 注册中心解决"找得到"，agent 网关解决"调得通、管得住"
- [[reconciliation-loop]] — `uses` controller 周期复查 skills 包 digest
- [[agent-framework]] — `contrasts` framework 不管注册与治理
- [[agent-harness]] — `contrasts` 调用方不应关心 agent 背后是哪个 harness
- [[agent-infra-three-layers]] — `part-of` 三层中的 Platform 层

## 来源日记

- [[OCI镜像工具生态]] — OCI Registry 作为 artifact 仓库：镜像、模型、SBOM、签名统一进供应链
- [[Foundry-Agent三种形态对比与选型]] — Prompt / Hosted 各托管哪几层
- [[Copilot-Studio系列03：四种Harness对比与选型]] — 选 harness 即选 runtime
- [[Copilot-Managed-Runtime系列03：宿主沙箱与安全边界]] — 托管应用平台的边界
- [[AKS-Agent-Runtime系列00：导读]] / [[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]] / [[AKS-Agent-Runtime系列10：为什么在AKS上自建]] — 在 AKS 上自建 agent platform
- [[Agent基础设施系列01：三层划分与自建路线]] — Agent 365 是 platform 控制面、自建 runtime 与它不冲突
- [[Agent基础设施系列04：Framework层与三层串联]] — Runtime ↔ Platform 接口
- [[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]] — Agent CRD、revision、发现三层、注册中心选型
- [[AKS-Agent-Runtime系列09：Agent以谁的身份行事]] — agent 身份
