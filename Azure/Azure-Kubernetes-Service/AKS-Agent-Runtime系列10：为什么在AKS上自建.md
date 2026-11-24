---
title: AKS Agent Runtime 系列 10：为什么在 AKS 上自建
created: 2026-11-13
tags:
  - aks
  - agent-runtime
  - foundry
  - hosted-agents
  - architecture-decision
description: 这个系列在 AKS 上把 agent runtime 拆成执行、会话、治理三个平面，一块块实测下来。回头对照 Foundry Hosted Agents，它已经替你做了这个系列里最费劲的几块——每会话一个 VM 沙箱、空闲释放与恢复、每个 agent 的身份、按用户隔离会话。真正需要在 AKS 上自建的理由只剩三类：要直接跑 Claude Code、Codex 这类现成的编码 CLI；沙箱要比 2 vCPU / 4 GiB 大；出站要按"某个 agent 对某个资源的某个动作"逐请求批准。代价是这个系列里撞上的每一个坑都要自己填
---

# AKS Agent Runtime 系列 10：为什么在 AKS 上自建

[第 01 篇](AKS-Agent-Runtime系列01：Sandbox之外的三个平面.md)开头我说过，讨论 AKS 做 agent runtime 时，大家的注意力几乎都在沙箱上，但一个编码 agent 从被叫起来到被回收，十步里只有三步发生在沙箱里。九篇下来，执行、会话、治理三个平面各自都实测了一遍。这一篇回到最开始的问题：既然 Foundry 已经有 Hosted Agents，为什么还要在 AKS 上自己搭这一套？

## 一、Hosted Agents 已经替你做了什么

我对着 Hosted Agents 现在的文档，把这个系列里自己搭的每一块都找了一下对应：

| 层 | AKS 自建（这个系列实测，含踩到的坑） | Foundry Hosted Agents（文档写明的能力） |
|---|---|---|
| 执行隔离（01、02） | Kata 节点池，每会话一个 VM，规格按节点池随意选；默认拒绝出站、不挂 SA token、IMDS 不可达都要自己配 | 每会话一个 VM 隔离沙箱，平台负责；**规格最大 2 vCPU / 4 GiB**，协议库支持 Python、C# |
| harness（02、03、08） | Claude Code、Codex、Copilot CLI 直接关进沙箱免确认跑；Claude Code 要 `IS_SANDBOX=1` 才能在 root 下免确认 | 容器里跑任意框架，对外实现 Responses / Invocations；**没有"托管现成编码 CLI"这一类**，要自己包一层协议 |
| 控制面 / 会话（03、06） | 自己写八步状态机、适配器、事件流；参考实现单副本 + SQLite，多副本要 lease + fencing 自己做 | 会话 API、对话历史（Responses）由平台管；会话是沙箱和文件，对话是消息历史，两者分开 |
| 出站治理（04） | 网关认 Pod 证书，按"申请 ∧ 批准 ∧ 发布"逐请求授权；缺一项批准新会话就整体 503，授权在突发下最先撑不住 | 出站可以走客户自己的 VNet，工具统一经 Toolbox MCP；**"某个 agent 对某个资源的某个动作"这一级的批准要另想办法** |
| 生命周期（05） | rootfs 打成镜像推 ACR，每轮两次 commit，恢复约 10 秒；会话库没记录的 Durable 沙箱、删记录后的快照镜像没人回收 | 空闲 2~60 分钟释放，恢复时还原 `$HOME` 和 `/files`；30 天不活动删除，没有预热池要配 |
| 注册与发现（07） | Agent CRD + controller，skills 打 OCI 包按 digest 固定；自己生成 A2A Agent Card，发现与授权分开 | 平台保存镜像、agent 版本和 agent identity；对外发现（卡片、目录）这次没有核实 |
| 模型接入（08） | 一个网关同时接 Responses 和 Messages，协议在网关里转换；别名在网关不认，Foundry 上的 Claude 部署需组织声明（未测） | 容器内用 agent identity 调 Foundry 模型，换哪家模型、走什么协议由容器里的代码决定 |
| 身份（09） | OBO、Agent ID 都能用 AKS 联合凭据跑，无 secret；Agent ID 的 OBO 需要管理员同意，令牌服务要自己写 | 部署时自动给每个 agent 建 Entra agent identity，按用户隔离会话，Toolbox 统一处理身份透传 |

表里加粗的三处，是 Hosted Agents 目前没有直接对应、也是选 AKS 的真正理由：要直接跑现成的编码 CLI、沙箱要比 2 vCPU / 4 GiB 大、出站要按"资源 + 动作"逐请求批准。左栏里的坑则是选 AKS 的代价——这些都是在几天的 PoC 里撞上的。

对完之后，最直观的感受是：**这个系列花篇幅最多、坑也最多的那几块，Hosted Agents 都已经包了。**

- **每个会话一个 VM 隔离的沙箱。** 第 01、02 篇在 AKS 上配 Kata 节点池、默认拒绝出站、不挂 ServiceAccount token、挡住 IMDS，这些它都由平台负责。
- **会话的生命周期。** 第 05 篇里，checkpoint 是把 rootfs 打成镜像推到 ACR，每轮两次 commit，各要 30 到 40 秒；会话库里没有记录的 Durable 沙箱、删掉记录后的快照镜像，都没人回收，我得自己写对账器。Hosted Agents 空闲 2 到 60 分钟后释放计算，恢复时还原 `$HOME` 和 `/files`，30 天不活动就删除，也没有预热池要配。
- **会话和对话分开。** 它把"会话"（沙箱和文件）和"对话"（消息历史）明确分开管，这正是第 03 篇里控制面要处理的事。
- **每个 agent 的身份。** 第 09 篇我用 Graph 一步步建 blueprint、联合凭据、agent identity；Hosted Agents 部署时就自动给每个 agent 建一个 Entra agent identity。它还支持按用户隔离会话，工具统一走 Toolbox，身份透传在那里处理。

如果你的 agent 是自己写 loop 的代码 agent，规格也在它的范围内，那么这些问题里的大部分根本不用碰。

## 二、它没有覆盖的三件事

剩下的，才是在 AKS 上自建的真正理由。我从这个系列的实测里，总结出三类。

**第一，直接跑现成的编码 CLI。** 第 07 篇按"loop 归谁"把 agent 分成三类，其中 B 类是基于 Claude Code、Codex、Copilot CLI 这些现成 harness 的。Hosted Agents 要求容器实现 Responses 或 Invocations 协议，而这些 CLI 本身不说这些协议，要用它们就得自己再包一层。参考实现做的正是这件事：把编码 CLI 关进沙箱，免确认运行，控制面用适配器统一它们的输出（第 03 篇）。第 08 篇里，Claude Code 经网关的协议转换用上了 GPT 模型，和 Codex 在同一个修 bug 任务上没有看得出的差别。

**第二，沙箱规格。** Hosted Agents 的沙箱最大是 2 vCPU / 4 GiB。编码 agent 的工具链镜像动辄上 GB（第 05 篇里快照镜像就是 1.46 GB），大仓库构建、跑整套测试，2 vCPU 往往不够；需要 GPU 的就更不用说了。AKS 上沙箱的规格由节点池决定，想要多大配多大。

**第三，出站按"资源 + 动作"逐请求批准。** Hosted Agents 的出站可以走客户自己的 VNet，工具经 Toolbox 统一接入。第 04 篇搭的是另一种粒度：网关认 Pod 证书，每个请求都核对"这个 agent 申请过、资源 owner 批准过、平台发布了这个动作"，撤销 1 秒多就生效。如果你的合规要求落在这一级（某个 agent 只能读某个仓库，不能推），就得自己搭。

还有两件可以算半个理由：一个网关统一接多家模型和多种协议（第 08 篇），以及控制面要按自己的规则改（会话分配、回收策略、高可用）。前者在 Hosted Agents 里由容器代码自己决定，后者是平台托管的代价：省了运维，也就少了这部分控制权。

## 三、自建时每一层用什么

决定自建之后，并不是每一层都要从零写。按层次看，底下几层开源和 AKS 已经覆盖得比较好，越往上，现成的组件越只是底座，要自己写的越多（分层全景图见 [00 导读](AKS-Agent-Runtime系列00：导读.md)）：

- **① 隔离**：AKS 的 Pod Sandboxing 提供 Kata 节点池；社区里还有 gVisor、Firecracker。要自己做的是节点池污点、limits、RuntimeClass，以及"出站默认拒绝、不挂 SA token"这两条底线（第 01 篇、[01 补充](AKS-Agent-Runtime系列01补充：Kata运行时与节点池.md)）。
- **② 沙箱编排**：OpenSandbox、agent-sandbox 管预热、领取、执行接口、暂停恢复；kagent、Agent Substrate 是另外两种思路。要自己做的是沙箱 provider 接口、兜底网络策略和快照仓库的清理（[03 补充](AKS-Agent-Runtime系列03补充：沙箱后端agent-sandbox与OpenSandbox.md)）。
- **③ 会话控制面**：最重的一块。Dapr 的 Actor 和 Workflow、Temporal 可以当持久执行的底座，Service Bus 会话队列和 PostgreSQL 解决多副本；但会话 API、收件箱、状态机、副作用意图、维护循环和对账器，都得自己写（第 03、05、06 篇）。
- **④ harness**：Claude Code、Codex、Copilot CLI、OpenCode、Pi 都是现成的第三方 CLI；要自己写的是适配器（拼命令、解析输出、续接原生会话）和免确认运行的权限档位（第 03、08 篇）。
- **⑤ 网关**：agentgateway 一个项目可以做 agent 网关、模型网关、出站网关三种角色，社区里还有 Envoy AI Gateway、Kong、LiteLLM、Higress，Azure 上有 APIM 的 AI 网关。要自己做的是三套网关的配置和信任边界，以及按会话的授权和凭据代理（第 04、07 篇、[08 补充](AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色.md)）。
- **⑥ 授权与身份**：OpenFGA、OPA、SpiceDB 做授权决策，cert-manager、SPIFFE/SPIRE 签发工作负载身份，Kyverno 做准入约束，Entra 提供 Workload ID、Agent ID 和 OBO。要自己写的是"申请、批准、发布"的数据模型、Pod 到会话的映射和 fencing token（第 04、09 篇、[04 补充](AKS-Agent-Runtime系列04补充：OpenFGA与关系型授权.md)）。
- **⑦ 注册与发现**：kagent、Nacos 的 AI 注册中心、A2A 和 MCP 的 SDK、MCP Registry、oras；要自己写的是 Agent CRD 的语义校验、内容哈希 revision、卡片生成和注册中心之间的同步（第 07 篇）。
- **⑧ 观测与审计**：OpenTelemetry、Prometheus 和网关的访问日志，Azure 上有 Azure Monitor 和托管 Prometheus。要自己做的是把用户、会话、轮次作为属性一路带下去，让每个副作用都能追溯到触发它的那段模型输出。

图里闪烁的两块，③ 会话控制面和 ⑥ 授权模型，是自建里最重的部分。它们都要认识会话、终端用户和外部资源上的动作，而这正是社区组件不认识的东西（[系列 11](AKS-Agent-Runtime系列11：Kubernetes原生机制管不到什么.md)）。最右一列也印证了第一节的结论：如果 agent 是自写 loop、规格也在 Hosted Agents 的范围内，橙色的大部分都不用写。

## 四、自建的代价

AKS 给的是原语：Kata、Workload Identity、节点池、网络策略、CSI。会话层和 harness 编排层都要自己写。这个系列里，我在几天的 PoC 里就撞上了下面这些：

- **控制面是单副本加 SQLite**，删 Pod 后要 5 秒才恢复，每次发版都会停一下。做多副本要自己加 lease 和 fencing，我第一版"lease 被占就 abandon"的写法还把两轮消息送进了死信（第 06 篇）。
- **回收只从状态库往外做**，会话库里没有记录的 Durable 沙箱一直占着 VM，快照镜像只删记录不删镜像（第 05 篇）。
- **逐请求授权在突发下最先撑不住**：100 个并发请求时，授权决策点 p50 从 105 毫秒涨到 1.85 秒，返回了 51 个 503，限流一次 429 都没有触发（第 04、08 篇）。
- **有一项申请还没批准，整个应用的新会话就都建不了**，接口只返回笼统的 503（第 04 篇）。
- **Claude Code 在 root 下免确认运行会被它自己拒绝**，要加 `IS_SANDBOX=1`，参考实现的适配器里没有（第 08 篇）。
- **身份那一层要自己写令牌服务**，agent 代表用户还要管理员在 blueprint 上配好权限（第 09 篇）。

再加上订阅策略带来的麻烦：Key Vault 创建即关公网、Service Bus 的 SAS 被禁用、PostgreSQL 在两个区域开不了、集群每天半夜自动停机。这些在生产环境里只会更多。

所以选 AKS 的前提只有一条：**团队愿意长期维护一个 agent 控制面。** 不愿意，前面那三个理由再充分，也应该先想想能不能在 Hosted Agents 那一侧绕过去。

## 五、怎么选

![放在哪：先问 agent 是哪一类，再问三件 Hosted Agents 不管的事|900](../../asset/aks-agent-runtime-decision-2026-11-13.svg)

我的判断顺序是：

1. **先看 agent 是哪一类。** 声明式（A 类）放 Foundry 的 Prompt agent，它的 loop 在共享服务里，不需要每会话一个 VM；在 AKS 上自建这一类，等于重写一个平台。
2. **自写代码（C 类）看规格。** 2 vCPU / 4 GiB 够用，再看那三件事有没有必须的；都不是必须，就用 Hosted Agents。
3. **现成编码 CLI（B 类）看能不能接受自己包一层协议。** 能，且规格够，就回到第 2 步；不能，或者规格不够，就在 AKS 上自建。

两边并不互斥。同一个组织完全可以把 A、C 类放在 Foundry，只把 B 类（编码 CLI）放在 AKS，共用同一个 Entra 租户、同一套 agent 身份。第 07 篇的统一外壳和第 09 篇的身份设计，在这种混合布局里一样用得上。

## 六、这个系列留下的东西

最后把这个系列的东西整理一下，方便以后接着做：

- **文章**：00 导读、01 到 11 共十一篇正篇，加上 Kata、沙箱后端、OpenFGA、agentgateway 四篇补充。除了导读和两篇综述（10、11），每篇都配了一组在 AKS 或本机上能复现的实验。
- **验证仓库**：环境脚本和每篇实验的清单、脚本和原始输出，都放在一个私有仓库里，按 README 可以复跑。补充篇的实验（沙箱后端、OpenFGA、agentgateway）也在里面。
- **还没做完的**：
  - Foundry 上 Claude 的原生 Messages 路径（第 08 篇，需要组织声明）；
  - agent identity 代表用户的 OBO（第 09 篇，需要管理员同意）；
  - agent 网关：第 07 篇的卡片里只写了入口地址，A2A 和 MCP 到会话 API 的适配还没写；
  - 硬性的 token 预算：08 补充实测，几种网关的 token 限流都在响应后结算，管的是平均速度，硬上限要另外做；
  - MCP 聚合的隔离：任一目标起不来整个入口就失败，A2A 卡片的旧字段也没被网关改写（08 补充）；
  - 快照仓库的保留和清理、会话与沙箱的双向对账，目前靠我补的对账器（第 05 篇），参考实现里还没有。

如果只能留一句话：**Agent runtime 的难点不在沙箱，在沙箱外面那一圈：会话、治理、身份。** 沙箱可以交给 Kata 或者 Hosted Agents；那一圈要么交给平台，要么自己长期扛着。

## 相关阅读

- [AKS Agent Runtime 系列 01：Sandbox 之外的三个平面](AKS-Agent-Runtime系列01：Sandbox之外的三个平面.md)
- [AKS Agent Runtime 系列 07：Agent 的类型、注册与发现](AKS-Agent-Runtime系列07：Agent的类型、注册与发现.md)
- [AKS Agent Runtime 系列 09：Agent 以谁的身份行事](AKS-Agent-Runtime系列09：Agent以谁的身份行事.md)
- [Foundry Agent 与 Copilot Studio 的选型](../Foundry-Agent与Copilot-Studio的选型.md)
- [Agent 基础设施系列 01：三层划分与自建路线](../../Notes/AI/agent/agent-platform/Agent基础设施系列01：三层划分与自建路线.md)

## 参考资料

- [Hosted agents in Foundry Agent Service](https://learn.microsoft.com/azure/foundry/agents/concepts/hosted-agents)
- [Manage hosted agent sessions](https://learn.microsoft.com/azure/foundry/agents/how-to/manage-hosted-sessions)
- [Isolate hosted agent sessions per user](https://learn.microsoft.com/azure/foundry/agents/how-to/isolate-sessions-per-user)
- [Deep dive into Foundry Agent Service networking](https://learn.microsoft.com/azure/foundry/agents/concepts/agents-networking-deep-dive)
- [Foundry Hosted Agents（Agent Framework）](https://learn.microsoft.com/agent-framework/hosting/foundry-hosted-agent)
