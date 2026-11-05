---
title: "Agent Sandbox"
created: "2026-11-04"
updated: "2026-11-04"
tags:
  - wiki
  - concept
  - agent
  - agent-runtime
  - sandbox
  - kubernetes
  - security
aliases:
  - "Agent 沙箱"
  - "agent 执行沙箱"
  - "代码执行沙箱"
related:
  - "[[agent-infra-three-layers]]"
  - "[[copilot-managed-runtime]]"
---

# Agent Sandbox（Agent 沙箱）

## 摘要

Agent 沙箱是 agent 执行模型生成的代码、或需要跨轮次保留文件与进程工作区时使用的隔离执行环境。一旦 agent 要跑 pandas、shell、测试或 Chromium，问题就从"模型答得好不好"变成"这段代码能碰到什么"。

沙箱可以拆成三件事来问：**墙有多厚**（隔离原语：Kata VM、gVisor、直接管理的 microVM）、**房间怎么分**（环境的分配与回收：模板、预热池、认领、归还）、**门怎么管**（出站与凭据：NetworkPolicy、egress 代理、凭据注入）。三件事分属不同组件，靠 `runtimeClassName` 这类窄接口衔接，不是几选一。它对应 [[agent-infra-three-layers]] 中 Runtime 层最下面两个子层。

## Claims

### Claim: 沙箱拆成三件事——隔离原语、环境的分配与回收、出站与凭据；Kata 与 agent-sandbox / OpenSandbox 是上下两层，只靠 runtimeClassName 衔接

- **来源**：[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]、[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.8
- **状态**：active

> Kata 管"pod 里的容器怎么跑"，不认识 agent、会话、预热池；agent-sandbox 和 OpenSandbox 是 Kubernetes 控制器，管"pod 什么时候建、给谁用、什么时候回收"，自己不做隔离，只在生成的 pod 模板里写上 `runtimeClassName`。所以编排层二选一，运行时可以换 Kata、gVisor 或 runc，上层流程不变。只用 Kata 也能跑（Deployment 加一行 runtimeClassName），只是预热、认领、回收、路由都得自己写。

### Claim: Kata 是"容器的接口、VM 的边界"——隔离单位是 pod；与 microVM 的真正区别是 VM 由 Kubernetes 管还是由沙箱系统直接管

- **来源**：[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]、[[Agent基础设施系列03：kagent与Agent-Substrate]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.8
- **状态**：active

> 对 Kubernetes 来说 Kata 实现与 runc 相同的 OCI / CRI 接口，镜像与 kubectl 用法不变；物理上每个 pod 是一个带 guest kernel 的轻量 VM，pod 内多个容器只有容器级隔离——所以 agent 可信、生成代码不可信时，执行器要放进单独的沙箱 pod。Kata 底下可接 QEMU / Cloud Hypervisor / Firecracker，与 Firecracker 不是并列技术。经 Kata 由 Kubernetes 管：一 pod 一 VM，生命周期跟 pod 走；沙箱系统直接管 VMM（OpenSandbox Firecracker 运行时、Agent Substrate microVM worker、E2B）：能做毫秒级快照恢复、整 VM 内存连文件系统快照后跨机恢复，代价是多一套 VM 管理组件、依赖嵌套虚拟化。gVisor 用户态内核拦截系统调用，隔离强度介于容器与 VM 之间。VM 只挡内核逃逸，挡不住 agent 拿合法 token 做不该做的操作。

### Claim: Kata 改变了容量与调试的算法——内存按 limit 固定（默认 512Mi）、CPU 向上取整、port-forward 不通

- **来源**：[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.8
- **状态**：active

> VM 内存取自 pod 的 memory limit，不设就是 512Mi，跑 Chromium / pandas 易 OOM；写大了就一直被 VM 占着，不像 runc 按实际用量挤占。CPU limit 决定 vCPU 数，`500m` 实际占 1 个 vCPU，估节点能放多少沙箱要按 VM 粒度算。kubelet 的 port-forward 进宿主网络命名空间拨 127.0.0.1，服务在 guest VM 里，连接被拒——调试改 `kubectl exec`，正式访问走 router 或 Service。另：不支持 host network，Defender for Containers 不评估 Kata pod。验证隔离生效：沙箱里 `uname -r` 与节点 kernelVersion 不同。官方文档支撑。

### Claim: 出站控制有两处静默失效——CNI 不支持时 NetworkPolicy 被忽略不报错；NetworkPolicy 只认 IP 与端口，放行 443 等于放行任意 HTTPS

- **来源**：[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.75
- **状态**：active

> 集群没有策略引擎时，SandboxTemplate 渲染出的 NetworkPolicy 被静默忽略，隔离比以为的弱——建集群时就要选 Cilium / Calico / Azure NPM。即使生效，"任意地址的 443"仍让生成的代码能把数据 POST 到任何 HTTPS 站点；"只能访问模型端点和指定 API"需要 FQDN 策略（Cilium `toFQDNs`）或按域名放行的 egress 代理。同类陷阱：示例里用于区分用户的 `X-Owner` 请求头只是路由信息不是安全边界；router 示例默认 `ALLOW_UNAUTHENTICATED_ROUTER=true`，生产必须加鉴权。

### Claim: 凭据不进沙箱、由沙箱外的中介在出站时注入——两个独立平台的同一做法；注入点仍在可信计算基内，且不等于不能滥用授权

- **来源**：[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]、[[Agent基础设施系列03：kagent与Agent-Substrate]]、[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.75
- **状态**：active

> OpenSandbox Credential Vault：沙箱进程只拿到假值，egress sidecar 透明拦截 HTTPS，按 scheme / host / method / path 匹配绑定规则，**恰好命中一条**才注入真实认证头，命中多条视为歧义拒绝；vault 明文只写不可读。Agent Substrate：每个 actor 的身份证书、JWT、API key、云 token 都不在沙箱里，由 `atenet-egress` 在沙箱外注入。边界：① egress 必须 `dns+nft` 模式，只靠 DNS 时直连 IP 可绕过域名策略；② 不能与同 pod 的 Istio / Envoy 透明代理共存；③ vault 只在 sidecar 内存，暂停后恢复是空的，恢复流程必须显式"重新注入凭据"；④ 读不到 vault 失败关闭（小请求 503、流式断开），sidecar 成为出站数据面的可用性依赖。凭据没有从系统消失，绑定规则要按路径和方法收窄。此 Claim 是 `host-mediated-sandbox`（HOLD）泛化后的 `credential-out-of-sandbox`，Copilot Managed Runtime 的"宿主是唯一出口"是同一思路的第三个实例（机制为 iframe + CSP + JSON-RPC，见 [[copilot-managed-runtime]]）。

### Claim: 池化环境的归还策略决定会不会串号——多租户只能 Delete；池化 pod 不能按请求定制

- **来源**：[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.7
- **状态**：active

> OpenSandbox `recycleStrategy`：`Delete`（默认，每次从干净状态开始）、`Restart`（原地重启清进程状态）、`Noop`（原样放回，最快但上一个用户的文件和进程漏给下一个）。pod 在请求前已建好，entrypoint / env 在分配后以任务下发，volumes 与 networkPolicy 只能写进 Pool 模板——不同租户要不同出站策略就拆成不同 Pool。池子耗尽返回可重试的 429，调用方按可重试处理。批量场景（agent 评估、RL rollout）下"一次申请 N 个"的 API（BatchSandbox）比逐个 Claim 有优势（项目方自测数据，测法未必对等）。

### Claim: 冷启动要拆开量——预热池、镜像预拉取、快照恢复解决的是不同段，"亚秒级"不能与冷拉镜像直接比

- **来源**：[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]、[[Agent基础设施系列01：三层划分与自建路线]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.7
- **状态**：active

> 端到端 = 调度 + 镜像拉取 + guest 启动 + 代理与证书初始化 + harness 启动 + 模型与工具执行，镜像拉取往往是大头（社区实践中约 2.8 GB 镜像首次拉取近 6 分钟，与推理快慢无关）。预热池让分配到毫秒级；预拉取只省拉取时间，VM 启动与初始化仍要付；休眠 / 快照恢复介于两者之间。评估要固定镜像、缓存状态、并发数和起止点，看分位数与失败率。预热池大小直接对应常驻成本：Kata 内存按 limit 固定占用，池里每多一个空闲沙箱就多占一份 limit。

### Claim: 把 agent 本身和它执行的代码分开选粒度——受信的 agent loop 走轻粒度，不可信代码按执行次数借 VM 沙箱

- **来源**：[[Agent基础设施系列03：kagent与Agent-Substrate]]、[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.65
- **状态**：active

> 运行粒度光谱：一 agent 一 pod（隔离直观、空闲也花钱）→ 预热池领沙箱（解决"派得慢"不解决"空闲贵"）→ actor 快照 + worker 复用（Agent Substrate，空闲只剩对象存储里一份快照，唯一同时解决两者且保持强隔离，代价是 pre-1.0）→ 进程内 actor（Dapr，密度最高但只有逻辑隔离）→ 进程内代码沙箱（Wasm，受限）。推荐拆法：规划、调模型、调受治理 API 的 agent loop 放 Dapr actor / 进程内会话 / Substrate actor；只有模型生成的代码需要 VM 级墙，按需从预热池领 Kata 沙箱、用完归还——最贵的 VM 按执行次数付费而不是按 agent 个数。例外：Claude Code、OpenClaw 这类"整个 agent 就是不可信执行环境"的 coding agent 适合整体放进沙箱。选 agent-sandbox 还是 OpenSandbox 也沿这条线：agent 自己是服务、只要一个隔离 pod → agent-sandbox；agent 是调用方、沙箱是借来执行代码的工具 → OpenSandbox（execd + Credential Vault 省胶水）。

### Claim: actor 与执行单元分离——pod 仍是执行单元，但不再是 agent 的部署、身份、生命周期单元

- **来源**：[[Agent基础设施系列03：kagent与Agent-Substrate]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.55
- **状态**：active

> Agent Substrate 把 actor（有状态 agent 实例，多、大多挂起）与 worker（预启动的沙箱 pod，少）拆开：空闲时内存与文件系统快照进对象存储释放 worker，请求来了恢复到任意空闲 worker；低频基础设施配置（WorkerPool）留在 Kubernetes，高频实例状态放自己的 PostgreSQL，挂起恢复不经 API server。执行层面一个 worker 一次仍只承载一个 actor——要准备的 worker 数取决于**同时在忙**的 actor 数而不是 agent 总数。快照范围决定恢复后剩什么：MEMORY（进程从冻结处继续）vs VOLUMES / ROOTFS（只存文件、进程冷启动）。坑：挂起需上层显式调用；身份不能从环境变量读（golden snapshot 里冻结，所有 actor 读到同一值）；需 `wakeupProbe`。整套收益建立在 agent 实际"忙"的时间占比上，动手前先从 trace 量这个数。单一项目来源、pre-1.0，置信度保守。

## 冲突与演进

- `host-mediated-sandbox`（2026-10-29 HOLD）在本批出现两个非 Microsoft 低代码平台的同类实现，2026-11-04 复核后泛化为"凭据不进沙箱、出口注入"并入本页第五条 Claim，未单独建页。
- `actor-snapshot-scheduling` 单一项目来源，作为本页最后一条 Claim 收入（HOLD），等第二个实现出现再评估。

## 关联概念

- [[agent-infra-three-layers]] — `part-of` Runtime 层的隔离原语与沙箱编排子层
- [[copilot-managed-runtime]] — `contrasts` 同为"沙箱只有一个受控出口"，前者是浏览器宿主中介（iframe + CSP + JSON-RPC），本页是 egress 代理注入凭据

## 来源日记

- [[2026-11-02-周一]] — Agent 基础设施系列 02/03 成文
- [[Agent基础设施系列02：Kubernetes上的Agent沙箱]] — 三件事拆解、Kata 规格与坑、agent-sandbox、OpenSandbox Pool 与 Credential Vault、选型、冷启动
- [[Agent基础设施系列03：kagent与Agent-Substrate]] — actor / worker 模型、快照范围、安全模型、运行粒度光谱与拆法
- [[GitHub-Copilot系列01：产品全景与竞争格局]] — 产品侧实例：Copilot session 默认跑在 GitHub 托管的隔离 micro-VM 云沙箱，关闭时存快照、可跨入口恢复
