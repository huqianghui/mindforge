---
title: "Agent Runtime"
created: "2026-11-16"
updated: "2026-11-23"
tags:
  - wiki
  - concept
  - agent
  - agent-runtime
  - kubernetes
  - aks
aliases:
  - "Agent 运行时"
  - "agent runtime"
  - "AKS Agent Runtime"
  - "agent 运行环境"
related:
  - "[[agent-protocol-stack]]"
  - "[[agent-sandbox]]"
  - "[[agent-session-control-plane]]"
  - "[[ai-gateway]]"
  - "[[credential-out-of-sandbox]]"
  - "[[relationship-based-access-control]]"
  - "[[a2a-protocol]]"
  - "[[entra-agent-id]]"
  - "[[durable-execution]]"
  - "[[agent-harness]]"
  - "[[agent-framework]]"
  - "[[agent-platform]]"
  - "[[agent-infra-three-layers]]"
  - "[[resident-vs-session-agent-runtime]]"
  - "[[agent-memory-lifecycle]]"
---

# Agent Runtime（Agent 运行时）

## 摘要

Agent Runtime 回答"agent 在哪跑、怎么隔离、怎么扩缩、崩了怎么续"。智能来自模型，可靠性来自 harness，**可运维性来自 runtime**。它把 harness 当成一个被托管、可替换的进程（[[agent-harness]]），给 framework 定义好的状态逻辑提供可靠的设施（[[agent-framework]]）；托管形态是 Foundry Hosted Agent，自建形态是 AKS 上的 Kata + 沙箱编排 + 控制面。

三层里新问题几乎都出在这一层。framework 和 platform 大多能沿用已有的软件工程与企业治理，runtime 则引出一整组新概念——它们各自有页：

- **执行**：隔离原语与沙箱编排（[[agent-sandbox]]）、actor 与执行单元分离（[[actor-snapshot-scheduling]]）
- **会话**：会话身份、收件箱、状态机、lease 与 fencing、回收对账（[[agent-session-control-plane]]、[[durable-execution]]、[[reconciliation-loop]]）
- **模型接入**：harness 的模型请求经网关认会话、转协议、限流（[[ai-gateway]]、[[harness-portability-spectrum]]）
- **治理**：凭据不进沙箱（[[credential-out-of-sandbox]]）、逐请求授权（[[relationship-based-access-control]]）
- **agent 之间**：A2A 调用、子会话只允许一跳（[[a2a-protocol]]）
- **身份**：agent 以谁的身份行事（[[entra-agent-id]]）

这一层有两种切法：按技术组件分四个子层（隔离、沙箱编排、持久执行、调度与生命周期），按一次调用经过的职责分三个平面（执行、会话、治理）。AKS 原生只覆盖执行和部分治理，会话平面一格都填不上。

在 AKS 上自建时，runtime 本身又有两种形态，两种都做过初步实验：**会话调度**（状态跟着会话走，按会话领沙箱、checkpoint、空闲回收，参考实现）和**常驻实例**（状态跟着人走，每人一个 StatefulSet 单副本 + HOME 盘，暂停即缩到 0，常驻实现）。两者共用"harness 关进 Kata、凭据不进沙箱、模型只走网关"的底线，分歧在状态、出站默认和记忆放在哪；会走向"轻量常驻入口 + 会话执行池"。怎么选、往下怎么对比、哪些客户场景对应哪种形态，见 [[resident-vs-session-agent-runtime]]。

## Claims

### Claim: Runtime 内部有四个子层——隔离原语、沙箱编排、持久执行、调度与生命周期，各自不互相替代

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.75
- **状态**：active

> 客户说"自建 agent runtime"时背后往往是四件不同的事：① **隔离原语**——墙有多厚（Kata / gVisor / 直接管理的 microVM）；② **沙箱编排**——怎么按模板领环境、休眠、回收（agent-sandbox / OpenSandbox）；③ **持久执行**——长任务崩了能不能续（Dapr Workflow，每步写 state store、断点重放）；④ **调度与生命周期**——agent 在集群里是什么对象（kagent CRD、Agent Substrate actor）。持久执行与隔离无关，是独立一维：framework 自带 checkpoint 只解决"能存能读"，故障检测、自动重放、多副本调度仍需 runtime 提供。Dapr 横跨两层：Dapr Agents 是 Framework，sidecar 与 workflow 引擎是 Runtime。按需叠加：只有长任务、跨审批流程才上持久执行，几秒结束的问答型 agent 用 framework checkpoint 足够。持久执行的故障语义 2026-11-14 起归口 [[durable-execution]]。

### Claim: Runtime 内部再按三个平面拆——执行、会话、治理，外加横切的定义与发现；AKS 原生只覆盖执行与部分治理，会话平面一格都填不上

- **来源**：[[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]]、[[AKS-Agent-Runtime系列10：为什么在AKS上自建]]
- **首次出现**：2026-11-09
- **最近更新**：2026-11-16
- **置信度**：0.75
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-16 确认——依据：来源 [[AKS-Agent-Runtime系列10：为什么在AKS上自建]]（2026-11-15 修订），修订后原文仍含本条的数字与结论

> 执行平面：隔离环境、文件、命令执行、快照——AKS 给 Pod Sandboxing（Kata）、节点池与 NAP、CSI，社区有 agent-sandbox / OpenSandbox，自己补的是沙箱镜像里 harness 的适配与版本固定。会话平面：会话身份、收件箱、状态机、harness 调用与续接、暂停恢复回收——AKS 无，Dapr / Durable Task 可作底座，会话键、checkpoint 编排、回收对账、多副本全要自建（见 [[agent-session-control-plane]]）。治理平面：工作负载身份、出站网关、凭据注入、资源级授权、审计配额——AKS 给 Workload Identity 与 Cilium，社区有 agentgateway / OpenFGA，自己补 Pod 身份到会话的映射、申请审批流程、审计归集。定义与发现：CRD + controller 机制、kagent Agent CRD、A2A Agent Card，自己补统一 Agent 定义、不可变 revision、发现与调用授权分离。这是对 Runtime 层的另一种切法，与"四子层"不冲突：四子层按技术组件分，三平面按一次调用经过的职责分。十篇实测后的总结："agent runtime 的难点不在沙箱，在沙箱外面那一圈：会话、治理、身份"。`agent-runtime-three-planes` 不单独建页（HOLD）。

### Claim: 先问两个问题再决定要不要沙箱平台——执行不执行模型生成的代码、Runtime 要不要自主可控

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-16
- **置信度**：0.65
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-16 修订——依据：[Open infrastructure for autonomous agents comes to CNCF](https://cloud.google.com/blog/products/containers-kubernetes/open-infrastructure-for-autonomous-agents-comes-to-cncf)，项目成熟度一句更新

> 第一问：会不会执行模型生成的代码，或需要跨轮次保留文件和进程的工作区？否 → 它就是普通服务，部署到 ACA / AKS，鉴权与审批放服务端，工具走网关，不需要沙箱平台（很多"agent 平台"需求其实落在这里）。第二问：是否要求 Runtime 自主可控且团队能运维 AKS？否 → 托管路线（Hosted Agent；只跑一段代码用 ACA Dynamic Sessions；长期工作区用 ACA Sandboxes）；是 → 按需逐项叠加 Kata + 沙箱编排、kagent、Dapr、Substrate，"用不到的不装"。项目成熟度差异大：AKS Pod Sandboxing 内置、agent-sandbox v1beta1、Dapr 毕业项目、kagent CNCF Sandbox、Agent Substrate 写作时是 pre-1.0、只做 PoC，2026-11-05 已发布 1.0 并在 GKE 上 GA（仅 CPU 节点、挂起断开连接，见 [[actor-snapshot-scheduling]]）。

### Claim: 逐请求授权是突发流量下最先撑不住的一环——常态 p50 约 105 毫秒、大头是身份解析不是 OpenFGA；100 并发时决策点撞上超时返回 503，限流一次 429 都没触发

- **来源**：[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]、[[AKS-Agent-Runtime系列08：模型接入层]]
- **首次出现**：2026-11-11
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> 决策点 561 次授权统计：p50 105 毫秒，OpenFGA 那一步只占 2.5 毫秒，约 62 毫秒花在核实沙箱身份（回查 Pod、ServiceAccount、会话与运行时状态）。网关配了每秒 20 个请求的本地限流；一个沙箱同时发 40 个小请求全部 200，发 100 个则 48 个 200、51 个 503、1 个 403、0 个 429——决策点 p50 涨到 1850 毫秒、最长 5001 毫秒，撞上单次检查 5 秒超时，网关按"授权失败即拒绝"挡掉。503 对调用方只是"服务端出错"，拿不到该退避的信号。改法：限流放在授权之前并明确返回 429；决策点多副本，对"证书 → Pod → 会话"解析做短时缓存。克隆一个仓库只有几次请求，影响不大；会话多起来再叠 subagent 与批量任务就会碰到。按 token 计的配额未配未测。单环境实测。

### Claim: Kubernetes 原生机制守底线、L7 组件做判断——RBAC 只在 API server 上看主体与动词、NetworkPolicy 只认 IP 与端口；会话、终端用户、资源动作、模型和不可信的决策要另外补，社区组件提供底座、agent 语义这一层要自己写

- **来源**：[[AKS-Agent-Runtime系列11：Kubernetes原生机制管不到什么]]、[[AKS-Agent-Runtime系列10：为什么在AKS上自建]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.75
- **状态**：active

> 底线：NetworkPolicy 让出站只剩一条路（到网关）、RBAC 让沙箱 SA 无权限而控制面只拿必要权限、RuntimeClass 强制 Kata、ResourceQuota 限容量。判断：网关、授权决策点、控制面。router 鉴权的例子：Kubernetes 鉴权管不到 router 的数据路径（不经 API server）；pods/proxy 让 API server 变数据通道且只能按 Pod 名授权；TokenReview 只认证不授权；每沙箱一组 RoleBinding 变动太频繁——实际做法是只让控制面能进沙箱，用户鉴权放会话 API。按层看：隔离与沙箱编排开源和 AKS 覆盖较好；会话控制面（Dapr / Temporal / Service Bus / PostgreSQL 只是底座）与授权模型（OpenFGA / SPIFFE / Entra 只是底座）是最重的自研。复用时 sidecar 与不可信代码同在一个 VM，判断与凭据要放 Pod 外；Dapr 宜放控制面不进沙箱；这些组件的身份粒度是工作负载不是会话，Pod → 会话映射要自己写。

### Claim: Hosted Agent 替你做的每一项，自建都有开源对应；多承担的是运维——控制面升级、节点容量与预热池、会话数据库、冷启动调优、身份映射、网关策略、按 agent 归集 trace

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]、[[AKS-Agent-Runtime系列10：为什么在AKS上自建]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active

> 逐项对照：容器托管与版本 → kagent Agent CRD + GitOps（多承担控制面升级、CRD 兼容）；每会话 VM 隔离沙箱 → AKS Kata 节点池 + agent-sandbox / OpenSandbox（节点容量、预热池大小、镜像来源审查）；会话与历史存储 → PostgreSQL、Dapr state store（备份与保留策略）；空闲挂起按需恢复 → 预热池休眠恢复或 Agent Substrate（冷启动调优，镜像拉取常是大头）；agent 身份 → Workload Identity 到 Entra Agent ID（身份映射、权限最小化）；工具与 MCP 接入 → kmcp + agentgateway（网关策略、MCP 鉴权）；观测 → OpenTelemetry（按逻辑 agent 而不是按 pod 归集）。换来的是数据与执行环境在自己网络里、模型 / framework / harness 自选、隔离与出站可定制、和推理或训练共享集群。AKS 系列实测后的补充：这张表还缺了最重的一块——会话控制面（[[agent-session-control-plane]]），社区组件只给底座；自建只在三类场景下值得（见 [[foundry-agent-type-selection]]）。

### Claim: 同叫"暂停"，三种后端留下的东西不同——Substrate 留内存与文件、OpenSandbox + BatchSandbox 留整个 rootfs、agent-sandbox 只留 PVC；有状态连接在哪一种之后都要重建，重连归控制面

- **来源**：[[AKS-Agent-Runtime系列05：会话生命周期与回收]]、[[AKS-Agent-Runtime系列03补充：沙箱后端agent-sandbox与OpenSandbox]]、[[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]
- **首次出现**：2026-11-16
- **最近更新**：2026-11-16
- **置信度**：0.75
- **状态**：active
- **证据类型**：实测经验

> 三种暂停：Agent Substrate 快照内存与本地文件，恢复低于一秒、进程从冻结处继续，但 GKE 文档写明挂起时不保留打开的网络连接（数据库会话、MCP 连接都要恢复后重连）；OpenSandbox 以 BatchSandbox 作 workload provider 时把 rootfs 提交成镜像，恢复后 `/workspace`、`/tmp`、harness 原生会话文件都在、进程没了（05 实测）；agent-sandbox 的 Suspended 删 Pod 留 PVC，`/tmp` 与 rootfs 都没了（03 补充实测），OpenSandbox 叠在 agent-sandbox 上的生产配置也是这一种。选后端时先问"恢复后要剩什么"：只要文件续接，PVC 就够，但原生会话文件和工作区必须放进 PVC；要进程状态才需要内存快照。共同点是网络连接都不跨暂停——harness 连着的 MCP server、出站网关的长连接、控制面打开的更新流都要在恢复后重建，这一步应由控制面在恢复时显式完成，而不是指望 harness 自己重试。Substrate 部分来自官方文档、未在 AKS 上实测。外部来源：[About Agent Substrate on GKE](https://docs.cloud.google.com/kubernetes-engine/ai-ml/about-agent-substrate)。

### Claim: 常驻实现在"能装什么、能花多少"上做得扎实，出站逐请求授权、高风险动作审批、容量配额、跨日志追溯四块两种形态都没有

- **来源**：[[AKS-Agent-Runtime系列13：Runtime管控台与LiteLLM的分工]]、[[AKS-Agent-Runtime系列11：Kubernetes原生机制管不到什么]]
- **首次出现**：2026-11-17
- **最近更新**：2026-11-18
- **置信度**：0.75
- **状态**：active
- **证据类型**：实测经验

> 按系列 11 的清单逐项对照常驻实现：harness 白名单、skill 白名单与按 Team 发布、模型白名单、每个 Agent 的预算与限流、Kata 与 Sandbox 的资源边界，都由 CRD 声明、operator 执行，规则执行不了一律不放行（Policy 读不到或无效则挂起 Agent、吊销 key，拿到执行证据才标为已生效）。两边都缺的四块：① 出站只到 Cilium 的"公网黑名单、内网白名单、按域名封禁"，做不到"某 agent 对某资源的某动作"，也没有撤销后秒级生效；② push、建 PR、部署、调外部系统都在 agent 手里，没有人工审批点——对人下线后还在自主推进的常驻 agent 更要紧；③ 一个 Team 或一个人最多几个 Agent、共占多少 Kata 容量没有上限；④ 日志之间没有共同的会话或轮次 ID，Portal 自己不记操作审计。LiteLLM 已自带、operator 未接的 Guardrails、MCP 网关、Tool Policies、Agents 模块可以复用，但接法应与 key、team 一样从 CRD 单向投影。

### Claim: 自建 runtime 交给别人部署时，最先坏的是"手工做过、仓库里没有"的东西——值按三类放：平台约定留在代码、环境值进配置、集群事实部署时现查

- **来源**：[[AKS-Agent-Runtime系列14：让PoC能交给别人部署]]
- **首次出现**：2026-11-21
- **最近更新**：2026-11-23
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验

> 常驻 runtime 开启沙箱执行后，operator 要从一份平台登记读运行时能力（Kata 支持的特性）和网络拓扑（CoreDNS 与 AI 网关地址、Pod/Service/节点网段、API Server 地址、入口网关身份、Cilium 版本）。上游默认不生成这份登记，要部署者按自己集群提供；手工建的那份几天后就过时了（AKS 自动升级后 Cilium 版本对不上），换一个集群部署到这一步就会失败。分类按两个问题：换订阅或集群会不会变、变了能不能从集群查到。不变的（命名空间、约定的密钥名、协议固定的 ID）留在代码里并写明"不要改"，做成配置项反而让人改出不一致；会变但查不到的（订阅、区域、资源名、机型、版本号、模型与单价、管理员名单、端口列表）进配置文件，且一个值只在一处定义；会变又查得到的（地址、网段、UID、组件版本）部署时现查。交接前三项检查：变量来源逐个对上配置模板或生成逻辑；把写死的值提成变量后重新生成配置，与线上那份逐字段对比；仓库公开前扫全部 git 历史而不只是当前文件。另一个常被混在一起的点：能登录（Entra 组）和能进管理员后台（门户管理员名单）是两层，名单按登录名 `@` 前一段匹配，来宾账号要查本租户里的 UPN 而不是邮箱。

### Claim: operator 代管的 Helm 升级会被同一次部署里 operator 自己的滚动更新打断——release 锁在 pending-upgrade，回滚到最后一个 deployed 版本再重跑

- **来源**：[[AKS-Agent-Runtime系列14：让PoC能交给别人部署]]
- **首次出现**：2026-11-21
- **最近更新**：2026-11-23
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验

> Helm 升级先把 release 标成 pending-upgrade，做完才改成 deployed，中途被打断就留下锁，之后的部署都报 "has an unfinished operation"。实际遇到两种来路：一是自己把 `helm upgrade` 的输出接到 `| head`，head 读够几行退出、管道断开，helm 进程被中途终止，资源已应用但 release 永远停在 pending-upgrade；二是平台升级的最后一步要等内置管理员 agent 就绪，而这个 agent 的 Helm 升级由 operator 发起，同一次部署里 operator 自己也在滚动更新，旧 Pod 被替换时手上那次升级就断了，平台升级等到超时。解法一样：`helm history` 找最后一个 deployed 版本、`helm rollback` 释放锁、再重跑；第二次重跑时 operator 已是新版本，不会再自己打断自己。runtime 里凡是控制器替你调用 Helm 的地方，都要考虑控制器自身升级时的中断。

## 冲突与演进

- 2026-11-23：/extract-knowledge 收入系列 14，新增"交接时最先坏的是手工做过的事、值分三类"与"operator 代管的 Helm 升级被自身滚动打断"两条；期望状态与调和范围两条归 [[reconciliation-loop]]，入站报错定位归 [[agent-sandbox]]，沙箱 agent 的委托连接授权归 [[credential-out-of-sandbox]]。

- 2026-11-18：/extract-knowledge 收入系列 12、13。两种自建形态（会话调度、常驻实例）都已做过初步实验，形态选择单独建决策页 [[resident-vs-session-agent-runtime]]（harvest 原建议先作 Claim 注入，因两种形态均已实测而改为建页）；本页摘要补两种形态，新增治理覆盖一条。

- 2026-11-16：/revalidate（漂移复核）——1 条确认、1 条修订（Substrate 成熟度）；新增"三种暂停语义"一条，跨后端的判断放在本页，各后端细节仍归 [[agent-sandbox]] 与 [[actor-snapshot-scheduling]]。
- 2026-11-16：从 [[agent-infra-three-layers]] 拆出独立建页。四子层、三平面、两个问题、授权开销、原生机制守底线 5 条 Claim 原在三层页，原文搬来；新增"自建多承担运维"一条。AKS Agent Runtime 系列整个以本页为主题，系列各篇的细节分别归口上面列出的概念页，本页只放跨这些概念的判断。
- `agent-runtime-three-planes` 维持不单独建页（三平面作本页 Claim）。
- 同名不同物：[[copilot-managed-runtime]] 是 M365 的企业 SPA 托管平台，[[skill-runtime]] 是 skill 脚本的执行环境，都不是本页意义上的 agent runtime。

## 关联概念

- [[agent-protocol-stack]] — `part-of` runtime 对外、对下的协议面
- [[agent-sandbox]] — `part-of` 执行平面：隔离原语与沙箱编排
- [[actor-snapshot-scheduling]] — `part-of` 调度与生命周期子层
- [[agent-session-control-plane]] — `part-of` 会话平面，AKS 上最重的自研
- [[durable-execution]] — `part-of` 持久执行子层
- [[reconciliation-loop]] — `part-of` 回收与对账
- [[ai-gateway]] — `part-of` 模型网关与出站网关
- [[credential-out-of-sandbox]] — `part-of` 治理平面的凭据注入
- [[relationship-based-access-control]] — `part-of` 治理平面的逐请求授权
- [[a2a-protocol]] — `uses` agent 调 agent 的协议面
- [[entra-agent-id]] — `uses` agent 身份
- [[agent-harness]] — `contrasts` harness 面向模型、runtime 面向基础设施
- [[agent-framework]] — `contrasts` 逻辑 vs 设施
- [[agent-platform]] — `contrasts` runtime 在数据路径上执行，platform 管台账与合规
- [[agent-infra-three-layers]] — `part-of` 三层中的 Runtime 层
- [[foundry-agent-service]] — `implements` Hosted Agent 是托管的 runtime
- [[foundry-agent-type-selection]] — `grounds` Prompt / Hosted 的分水岭正是 runtime 归属
- [[copilot-managed-runtime]] — `contrasts` 同名不同物
- [[resident-vs-session-agent-runtime]] — `part-of` 自建 runtime 的两种形态（会话调度、常驻实例）与混合形态的选择
- [[agent-memory-lifecycle]] — `uses` 常驻形态多出的长期记忆层

## 来源日记

- [[Agent基础设施系列01：三层划分与自建路线]] — 四子层、两个问题、Hosted Agent 与自建对照
- [[Agent基础设施系列02：Kubernetes上的Agent沙箱]] / [[Agent基础设施系列03：kagent与Agent-Substrate]] — 沙箱编排与调度子层
- [[AKS-Agent-Runtime系列00：导读]] — 系列全景与术语
- [[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]] — 三个平面
- [[AKS-Agent-Runtime系列04：出站治理与逐请求授权]] / [[AKS-Agent-Runtime系列08：模型接入层]] — 授权开销与突发
- [[AKS-Agent-Runtime系列14：让PoC能交给别人部署]] — 平台登记现查、值分三类、交接前检查、Helm 锁
- [[AKS-Agent-Runtime系列10：为什么在AKS上自建]] — 每一层用什么、自建的代价
- [[AKS-Agent-Runtime系列11：Kubernetes原生机制管不到什么]] — 原生机制守底线
- [[AKS-Agent-Runtime系列12：常驻实例与会话调度]] — 常驻实例与会话调度两种形态
- [[AKS-Agent-Runtime系列13：Runtime管控台与LiteLLM的分工]] — 常驻实现的治理覆盖与缺口
