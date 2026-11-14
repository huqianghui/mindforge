---
title: "Agent Infrastructure Three Layers"
created: "2026-11-04"
updated: "2026-11-14"
tags:
  - wiki
  - concept
  - agent
  - agent-runtime
  - agent-platform
  - agent-framework
aliases:
  - "Agent 基础设施三层"
  - "Framework / Runtime / Platform 三层划分"
  - "Agent Framework vs Agent Runtime vs Agent Platform"
related:
  - "[[agent-sandbox]]"
  - "[[harness-engineering]]"
  - "[[harness-portability-spectrum]]"
  - "[[foundry-agent-type-selection]]"
  - "[[entra-agent-id]]"
  - "[[agent-session-control-plane]]"
  - "[[durable-execution]]"
---

# Agent Infrastructure Three Layers（Agent 基础设施三层）

## 摘要

把 agent 的基础设施按三个问题分层：**Framework** 回答"agent 怎么思考、调工具、管状态"，**Runtime** 回答"agent 在哪跑、怎么隔离、怎么扩缩、崩了怎么续"，**Platform** 回答"企业怎么发现、授权、治理、运营这些 agent"。Harness 是用 Framework 搭出来的成品，在 Runtime 眼里是一个被托管、可替换的进程，不单列一层。

这套划分解决的是一个常见混乱：开源项目往往同时声称自己是其中两三层，客户听完反而更糊涂。它也补上了 wiki 之前缺的一侧——此前 [[harness-engineering]] 和 [[harness-portability-spectrum]] 只覆盖 harness 内部，这里讲 harness 跑在哪、被谁管。Runtime 层内部再拆成隔离原语、沙箱编排、持久执行、调度与生命周期四个子层，前两个子层的展开见 [[agent-sandbox]]。

## Claims

### Claim: 三层按三个问题划分；Framework 与 Runtime 的边界是"逻辑 vs 设施"，不是"有没有 Session"

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.8
- **状态**：active

> LangGraph（Thread / Checkpointer / Store）、Google ADK（SessionService / MemoryService）、Microsoft Agent Framework（AgentSession / Context Provider）都原生提供 Session 与 State，所以看到"Session 管理"不能就归到 Runtime。真正的分界是：Framework 定义状态长什么样、什么时候存、怎么恢复；Runtime 提供让这些逻辑可靠的环境——存储在哪、进程被杀了谁拉起、两个用户的会话怎么隔离。判别法：问这个能力"换一个 Runtime 还在不在"——换集群仍成立的（状态结构、编排逻辑）属 Framework，换环境要重配的（存储、隔离、网络）属 Runtime。有官方文档支撑（三个框架的 API 名称可核对）。

### Claim: Harness 不单列一层——Framework 是材料、Harness 是成品，Runtime 把它当作可替换的进程托管

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]、[[Agent基础设施系列04：Framework层与三层串联]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.75
- **状态**：active

> 用 LangGraph 写完 loop、规划、工具调用、审批就得到一个 harness；Claude Code、Codex 是别人搭好的 harness。最好的佐证来自 Runtime 一侧：kagent 的 Agent 资源有 Harness 字段，可选自带 Go / Python ADK、Claude Code、Codex 或自定义镜像；Agent Substrate 声明"适配任何 framework 或 harness"。Harness Engineering 是贯穿 Framework 与 Runtime 的工程方法，不是一个部署层次。与 [[harness-engineering]] 已有的"framework 是 dev-time 工具包、harness 是 run-time 实体""Harness 面向 model、Runtime 面向 infra"两条 Claim 一致，这里补的是 Runtime 视角的证据。

### Claim: Runtime 内部有四个子层——隔离原语、沙箱编排、持久执行、调度与生命周期，各自不互相替代

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.75
- **状态**：active

> 客户说"自建 agent runtime"时背后往往是四件不同的事：① **隔离原语**——墙有多厚（Kata / gVisor / 直接管理的 microVM）；② **沙箱编排**——怎么按模板领环境、休眠、回收（agent-sandbox / OpenSandbox）；③ **持久执行**——长任务崩了能不能续（Dapr Workflow，每步写 state store、断点重放）；④ **调度与生命周期**——agent 在集群里是什么对象（kagent CRD、Agent Substrate actor）。持久执行与隔离无关，是独立一维：framework 自带 checkpoint 只解决"能存能读"，故障检测、自动重放、多副本调度仍需 runtime 提供。Dapr 横跨两层：Dapr Agents 是 Framework，sidecar 与 workflow 引擎是 Runtime。按需叠加：只有长任务、跨审批流程才上持久执行，几秒结束的问答型 agent 用 framework checkpoint 足够。持久执行的故障语义 2026-11-14 起归口 [[durable-execution]]。

### Claim: Hosted Agent 是托管的 Runtime、Agent 365 是 Platform 控制面——两者不在同一层，自建 runtime 与 Agent 365 不冲突

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]、[[Agent基础设施系列04：Framework层与三层串联]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.8
- **状态**：active

> Foundry Hosted Agent 是"framework 自选、runtime 托管"：任意框架写的 agent 打成容器，平台负责镜像版本、agent 身份、会话存储、每会话一个 VM 级沙箱。Agent 365 是 Platform 层（统一注册表 + Entra Agent ID + Defender / Purview），它不运行 agent。所以跑在自己 AKS 上的 agent 照样能申请 Entra Agent ID、登记进 Agent 365。客户要的"自主可控"多数指 Runtime 这一层，而不是自己再造一个 Platform；三条路（Hosted Agent / 自建 runtime / API 型 agent 就是普通服务）可在同一企业并存，身份与台账统一收在 Entra 与 Agent 365。

### Claim: 每种选择都在三层上定死了几格——锁定看两个维度：harness 自己搭还是现成的、runtime 自己运营还是平台托管

- **来源**：[[Agent基础设施系列04：Framework层与三层串联]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.7
- **状态**：active

> "没有哪个产品是没有这些层，只是替你把其中几层定死了。"四个组合各有代表：自己搭 + 自己运营（MAF / LangGraph 跑在 kagent）、自己搭 + 平台托管（Foundry Hosted Agent）、现成 harness + 自己运营（Claude Code / OpenClaw 作为 kagent AgentHarness 或 Substrate actor）、现成 harness + 平台托管（Copilot Studio 的 GitHub Copilot harness）。其余"只能配置"的（Foundry Prompt Agent、Copilot Studio Standard、Copilot Chat、Customer Conversation）harness 与 runtime 绑死，换 runtime 就要重写 agent。判断是否绑死只有一条：**harness 是不是平台自己的代码**。选型时先找到自己那一行，看被定死的格子里有没有将来一定要改的东西（隔离强度、出站策略、换模型、换编排）。

### Claim: 三层能不能换取决于层间接口——Framework↔Runtime 靠镜像、协议、外置状态；Runtime↔Platform 靠身份、网关、trace

- **来源**：[[Agent基础设施系列04：Framework层与三层串联]]、[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.65
- **状态**：active

> Framework ↔ Runtime：容器镜像、调用协议（Responses / Invocations / A2A / ACP）、外置的状态存储——守住这三样，同一份 agent 代码可在 Hosted Agent 与 AKS 上的 kagent 之间切换（"状态存储外置，不要把会话和 checkpoint 留在进程内存里，否则 runtime 一换就断"）。Runtime ↔ Platform：agent 身份（Entra Agent ID）、网关路由、OTel trace，并且 trace 要按逻辑 agent 身份而不是 pod 名归集。"同一镜像不改就换 runtime"尚未实测，待系列 04 的 PoC 2 验证后调整置信度。

### Claim: 先问两个问题再决定要不要沙箱平台——执行不执行模型生成的代码、Runtime 要不要自主可控

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.65
- **状态**：active

> 第一问：会不会执行模型生成的代码，或需要跨轮次保留文件和进程的工作区？否 → 它就是普通服务，部署到 ACA / AKS，鉴权与审批放服务端，工具走网关，不需要沙箱平台（很多"agent 平台"需求其实落在这里）。第二问：是否要求 Runtime 自主可控且团队能运维 AKS？否 → 托管路线（Hosted Agent；只跑一段代码用 ACA Dynamic Sessions；长期工作区用 ACA Sandboxes）；是 → 按需逐项叠加 Kata + 沙箱编排、kagent、Dapr、Substrate，"用不到的不装"。项目成熟度差异大：AKS Pod Sandboxing 内置、agent-sandbox v1beta1、Dapr 毕业项目、kagent CNCF Sandbox、Agent Substrate pre-1.0 只做 PoC。

### Claim: Runtime 内部再按三个平面拆——执行、会话、治理，外加横切的定义与发现；AKS 原生只覆盖执行与部分治理，会话平面一格都填不上

- **来源**：[[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]]、[[AKS-Agent-Runtime系列10：为什么在AKS上自建]]
- **首次出现**：2026-11-09
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> 执行平面：隔离环境、文件、命令执行、快照——AKS 给 Pod Sandboxing（Kata）、节点池与 NAP、CSI，社区有 agent-sandbox / OpenSandbox，自己补的是沙箱镜像里 harness 的适配与版本固定。会话平面：会话身份、收件箱、状态机、harness 调用与续接、暂停恢复回收——AKS 无，Dapr / Durable Task 可作底座，会话键、checkpoint 编排、回收对账、多副本全要自建（见 [[agent-session-control-plane]]）。治理平面：工作负载身份、出站网关、凭据注入、资源级授权、审计配额——AKS 给 Workload Identity 与 Cilium，社区有 agentgateway / OpenFGA，自己补 Pod 身份到会话的映射、申请审批流程、审计归集。定义与发现：CRD + controller 机制、kagent Agent CRD、A2A Agent Card，自己补统一 Agent 定义、不可变 revision、发现与调用授权分离。这是对 Runtime 层的另一种切法，与"四子层"不冲突：四子层按技术组件分，三平面按一次调用经过的职责分。十篇实测后的总结："agent runtime 的难点不在沙箱，在沙箱外面那一圈：会话、治理、身份"。`agent-runtime-three-planes` 不单独建页（HOLD）。

### Claim: 逐请求授权是突发流量下最先撑不住的一环——常态 p50 约 105 毫秒、大头是身份解析不是 OpenFGA；100 并发时决策点撞上超时返回 503，限流一次 429 都没触发

- **来源**：[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]、[[AKS-Agent-Runtime系列08：模型接入层]]
- **首次出现**：2026-11-11
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> 决策点 561 次授权统计：p50 105 毫秒，OpenFGA 那一步只占 2.5 毫秒，约 62 毫秒花在核实沙箱身份（回查 Pod、ServiceAccount、会话与运行时状态）。网关配了每秒 20 个请求的本地限流；一个沙箱同时发 40 个小请求全部 200，发 100 个则 48 个 200、51 个 503、1 个 403、0 个 429——决策点 p50 涨到 1850 毫秒、最长 5001 毫秒，撞上单次检查 5 秒超时，网关按"授权失败即拒绝"挡掉。503 对调用方只是"服务端出错"，拿不到该退避的信号。改法：限流放在授权之前并明确返回 429；决策点多副本，对"证书 → Pod → 会话"解析做短时缓存。克隆一个仓库只有几次请求，影响不大；会话多起来再叠 subagent 与批量任务就会碰到。按 token 计的配额未配未测。单环境实测。

### Claim: agent 定义按不可变 revision 管——revision 固定的是配置（名取规范化 spec 的内容哈希、只能新建不能改），权限每次请求实时算；skills 包用 OCI artifact 按 digest 拉而不放 ConfigMap

- **来源**：[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> 统一 `Agent` CRD 加 `spec.type`，三类共用字段在外、各自配置在对应块里。纯结构规则（type 与配置块对应）写 CEL，提交即拒、集群里没有这个对象；需查外部系统的规则（批准的运行时类 / 模型 / 镜像仓库前缀、代码镜像必须写 digest、skills tag 能否解析）放 controller，结果写进 status——五种故意写错的 agent 分别被 CEL 与 controller 拦下，后四个 Ready=False、不生成 revision、注册端点返回 404。revision：新会话用最新的，在跑的会话保持原来的；参考实现文档一处说已有会话固定"配置和权限"、一处说权限实时算，系列 04 撤销 1 秒生效的实测支持后者。skills 包：1.6 MB 的 ConfigMap 被 API Server 拒（上限 1048576 字节，kagent 1.x 每 revision 配置与卡片合计 ≤ 256 KiB）；改用 oras 打 OCI artifact 推 ACR，controller 用 Workload Identity 换 ACR 令牌 HEAD manifest 解析 digest；沙箱放文件必须按 revision 里记的 digest 拉——按 tag 拉到的是新内容，同一 revision 的两个会话可能拿到不同 skills。tag 挪动的处理见 [[reconciliation-loop]]。实测。

## 冲突与演进

- 与 [[harness-engineering]] 中"Harness 面向 model、Agent Runtime 面向 infra，runtime 是同心圆外侧的正交承载层"一致，本页把"正交承载层"展开成四个子层并加上 Platform 层。
- `durable-execution`（持久执行）与 `actor-snapshot-scheduling`（actor 与执行单元分离）两个候选未单独建页（2026-11-04 裁决，见 LOOP_STATE HOLD 区），分别收在本页第三条 Claim 与 [[agent-sandbox]] 中。**2026-11-14**：两者阈值均被 AKS Agent Runtime 系列命中，用户裁决分别建页 [[durable-execution]]、[[actor-snapshot-scheduling]]；同批新建会话平面的归口页 [[agent-session-control-plane]]，本页新增三平面、授权开销、revision 三条 Claim。

## 关联概念

- [[agent-sandbox]] — `part-of` Runtime 层的隔离原语与沙箱编排两个子层
- [[harness-engineering]] — `contrasts` harness 是贯穿 Framework 与 Runtime 的工程方法，三层划分讲的是部署层次
- [[harness-portability-spectrum]] — `contrasts` 前者讲 harness 内部资产能否跨宿主迁移，本页讲 harness 被定在哪一层、能否换 runtime
- [[foundry-agent-type-selection]] — `grounds` Prompt / Hosted 的分水岭正是 Runtime 层归属
- [[copilot-studio-harness-selection]] — `grounds` Copilot Studio 四种 harness 落在锁定矩阵的不同格
- [[entra-agent-id]] — `uses` Runtime ↔ Platform 接口的身份一环

## 来源日记

- [[2026-11-02-周一]] — 区分 agent framework / runtime / platform，Agent 基础设施系列 01~04 成文
- [[Agent基础设施系列01：三层划分与自建路线]] — 三问划分、Runtime 四子层、Hosted Agent 与 Agent 365 的层次、AKS 参考组合、决策树
- [[Agent基础设施系列04：Framework层与三层串联]] — harness 归属三类、锁定矩阵、三层接口、四个 PoC
- [[2026-11-13-周五]] — AKS Agent Runtime 系列 06~10 成文
- [[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]] — Runtime 三个平面与 AKS 原生 / 社区 / 自建分界
- [[AKS-Agent-Runtime系列04：出站治理与逐请求授权]] / [[AKS-Agent-Runtime系列08：模型接入层]] — 授权开销与突发
- [[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]] — Agent CRD、revision、OCI skills 包
- [[AKS-Agent-Runtime系列10：为什么在AKS上自建]] — 系列总结
