---
title: "Agent Sandbox"
created: "2026-11-04"
updated: "2026-11-16"
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
  - "[[agent-runtime]]"
  - "[[agent-infra-three-layers]]"
  - "[[copilot-managed-runtime]]"
  - "[[credential-out-of-sandbox]]"
  - "[[actor-snapshot-scheduling]]"
  - "[[agent-session-control-plane]]"
  - "[[relationship-based-access-control]]"
  - "[[ai-gateway]]"
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

- **来源**：[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]、[[AKS-Agent-Runtime系列01补充：Kata运行时与节点池]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-16
- **置信度**：0.8
- **状态**：active
- **证据类型**：实测经验

> VM 内存取自 pod 的 memory limit，不设就是 512Mi，跑 Chromium / pandas 易 OOM；写大了就一直被 VM 占着，不像 runc 按实际用量挤占。CPU limit 决定 vCPU 数，`500m` 实际占 1 个 vCPU，估节点能放多少沙箱要按 VM 粒度算。kubelet 的 port-forward 进宿主网络命名空间拨 127.0.0.1，服务在 guest VM 里，连接被拒——调试改 `kubectl exec`，正式访问走 router 或 Service。另：不支持 host network，Defender for Containers 不评估 Kata pod。验证隔离生效：沙箱里 `uname -r` 与节点 kernelVersion 不同。官方文档支撑。AKS 上逐层对账（01 补充实测）：调度扣的是 limit + RuntimeClass overhead——2Gi limit 的 Pod 在节点上记 2648Mi（2048 + 600），不写 resources 的 Pod 只记 600Mi 却照样起一台 512Mi 的 VM；宿主 cgroup `memory.max` 正好是 limit + overhead，`cpu.max` 仍按 500m 限半核，所以 VM 里 1 个 vCPU 只能用一半；**不写 resources 时宿主 cgroup 没有上限**，VMM 与 virtiofsd 的宿主侧开销不受约束。文档写的约 88Mi 宿主开销与实测 RuntimeClass 的 600Mi overhead 对不上，估容量以 `kubectl get runtimeclass` 为准：一台 D8s_v5（32 GiB）按每沙箱 2Gi 约放十个。小镜像已缓存时 Kata 与 runc 从创建到 Ready 都在 2~4 秒，冷启动差距来自大镜像与 harness 启动。

### Claim: 出站控制有两处静默失效——CNI 不支持时 NetworkPolicy 被忽略不报错；NetworkPolicy 只认 IP 与端口，放行 443 等于放行任意 HTTPS

- **来源**：[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.75
- **状态**：active

> 集群没有策略引擎时，SandboxTemplate 渲染出的 NetworkPolicy 被静默忽略，隔离比以为的弱——建集群时就要选 Cilium / Calico / Azure NPM。即使生效，"任意地址的 443"仍让生成的代码能把数据 POST 到任何 HTTPS 站点；"只能访问模型端点和指定 API"需要 FQDN 策略（Cilium `toFQDNs`）或按域名放行的 egress 代理。同类陷阱：示例里用于区分用户的 `X-Owner` 请求头只是路由信息不是安全边界；router 示例默认 `ALLOW_UNAUTHENTICATED_ROUTER=true`，生产必须加鉴权。

### Claim: 凭据不进沙箱、由沙箱外的中介在出站时注入——四个独立平台的同一做法；注入点仍在可信计算基内，且不等于不能滥用授权

- **来源**：[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]、[[Agent基础设施系列03：kagent与Agent-Substrate]]、[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-14
- **置信度**：0.85
- **状态**：active

> OpenSandbox Credential Vault、Agent Substrate `atenet-egress`、Copilot Managed Runtime 宿主中介、AKS agentgateway + 凭据代理都让沙箱只拿占位符、在唯一出口处注入真实凭据。2026-11-14 升格为独立概念页，机制、边界与实测全部归口 [[credential-out-of-sandbox]]，本条只保留结论。

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

### Claim: 把 agent 本身和它执行的代码分开选粒度——受信的 agent loop 走轻粒度，不可信代码按执行次数借 VM 沙箱（适用范围：自写 loop 且不处理大量不可信内容；多租户编码 harness 见下一条）

- **来源**：[[Agent基础设施系列03：kagent与Agent-Substrate]]、[[Agent基础设施系列02：Kubernetes上的Agent沙箱]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-16
- **置信度**：0.65
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-16 修订——依据：[About Agent Substrate on GKE](https://docs.cloud.google.com/kubernetes-engine/ai-ml/about-agent-substrate)、[Open infrastructure for autonomous agents comes to CNCF](https://cloud.google.com/blog/products/containers-kubernetes/open-infrastructure-for-autonomous-agents-comes-to-cncf)

> 运行粒度光谱：一 agent 一 pod（隔离直观、空闲也花钱）→ 预热池领沙箱（解决"派得慢"不解决"空闲贵"）→ actor 快照 + worker 复用（Agent Substrate，空闲只剩对象存储里一份快照，唯一同时解决两者且保持强隔离；2026-11-05 发布 1.0、GKE 上 GA，代价是只支持 CPU 节点、挂起时断开所有连接，见 [[actor-snapshot-scheduling]]）→ 进程内 actor（Dapr，密度最高但只有逻辑隔离）→ 进程内代码沙箱（Wasm，受限）。推荐拆法：规划、调模型、调受治理 API 的 agent loop 放 Dapr actor / 进程内会话 / Substrate actor；只有模型生成的代码需要 VM 级墙，按需从预热池领 Kata 沙箱、用完归还——最贵的 VM 按执行次数付费而不是按 agent 个数。例外：Claude Code、OpenClaw 这类"整个 agent 就是不可信执行环境"的 coding agent 适合整体放进沙箱。选 agent-sandbox 还是 OpenSandbox 也沿这条线：agent 自己是服务、只要一个隔离 pod → agent-sandbox；agent 是调用方、沙箱是借来执行代码的工具 → OpenSandbox（execd + Credential Vault 省胶水）。

### Claim: 多租户平台上 harness 自身也当不可信——编码 harness 连同工具与工作区整个放进 Kata、沙箱内免确认运行；判断标准不按命令分，而按"内容是否由模型 / 不可信数据决定 + 能碰到什么"

- **来源**：[[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]]、[[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]]
- **首次出现**：2026-11-09
- **最近更新**：2026-11-16
- **置信度**：0.75
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-16 确认——依据：来源 [[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]]（2026-11-15 修订），修订后原文仍含本条的数字与结论

> harness 读模型输出、网页、README、用户上传文件，都可能带 prompt injection，被劫持后手里正好有 shell 和文件工具。Claude Code / Codex / Copilot CLI 的"调用前确认"和进程级沙箱（bubblewrap、seatbelt、landlock）在多租户平台上只能当第二层：平台上的 agent 多由 Teams 消息或定时任务叫起、没人点确认，进程级沙箱与宿主共享内核。编码 harness 拆不成"loop 在外、bash 在内"——Read / Edit / Grep 默认操作本地文件系统，拆开就得把每个文件工具改成远程调用，那是改造 harness 而非部署 harness。必须留在沙箱外的四类：模型 key / Git token / 云凭据；授权决策；模型路由、配额、计费；checkpoint 与恢复控制、保留期、审计、人工审批。默认做法：第三方编码 harness 一律整体进沙箱（拓扑 A）；自写 loop 先问"是否处理大量不可信内容且握高权限工具"，是则同样进沙箱，否则放外面、代码执行进沙箱（拓扑 B，注意 confused deputy，见 [[credential-out-of-sandbox]]）；两者可组合为外层 loop + 受控子会话。成本差别：拓扑 A 每会话独占一个 VM，拓扑 B 的 loop 可跨租户共享。一个参考实现在 AKS Kata 上实测。

### Claim: 沙箱与外部共享的四类东西处理方式完全不同——凭据不共享、身份绑"活的 Pod + 会话"、文件优先单向带版本复制、控制通道单向

- **来源**：[[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]]
- **首次出现**：2026-11-10
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-16 确认——依据：来源 [[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]]（2026-11-15 修订），修订后原文仍含本条的数字与结论

> 凭据：沙箱里只有占位符，出站网关注入。身份：出站流量带 Pod 绑定的 mTLS 证书，私钥由 CSI 投递、沙箱进程读不到；网关按证书找存活 Pod、确认只绑定一个已准备好的会话，再查授权。文件按推荐度：① 沙箱拥有工作区、外部经执行守护进程的文件 API 读写（只有一份数据）；② 进入时复制固定快照、结束时收集产出；③ 以 Git 为交换介质、读写分别授权；④ 共享 RWX 最后选——每会话单独子目录、输入只读、防 symlink 与 TOCTOU、沙箱写出的内容一律当不可信数据。控制通道：只允许控制面调沙箱，沙箱不挂 SA token、连不上 Kubernetes API（见 [[agent-session-control-plane]]）。

### Claim: 出站只有一条路时，配置错误的结果是"卡住"而不是"泄露"——代价是排查不直观；先在沙箱里 curl 网关，超时是路径问题，401 / 403 是授权问题

- **来源**：[[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]]
- **首次出现**：2026-11-10
- **最近更新**：2026-11-16
- **置信度**：0.8
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-16 确认——依据：来源 [[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]]（2026-11-15 修订），修订后原文仍含本条的数字与结论

> 首次运行会话停在 running 五分钟无输出无报错：网络策略只允许连 CONNECT 网关，出站 sidecar 本应把请求封进 CONNECT 隧道，但那个版本不支持上游代理，直接连目标地址被 NetworkPolicy 静默丢弃，harness 只看到一个一直不返回的 TCP 连接。harness 不会说自己被墙了，要看 sidecar 日志与网络策略。实测。

### Claim: Kata 换的只是 containerd 下面的 shim，但 AKS 的 Kata 节点池是另一种节点镜像——不能在普通池上开启；RuntimeClass 名与 handler 名不同；混跑只能单向

- **来源**：[[AKS-Agent-Runtime系列01补充：Kata运行时与节点池]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-16
- **置信度**：0.8
- **状态**：active
- **证据类型**：实测经验

> kubelet 与 containerd 都不换：kubelet 从 `runtimeClassName` 取 handler 交给 containerd，handler 为 `kata` 时拉起 `containerd-shim-kata-v2`，由它起 cloud-hypervisor、virtiofsd，再经 vsock 让 VM 里的 kata-agent 建容器；每个 Kata Pod 在宿主多出 shim（约 53 MB）、VMM（约 140~170 MB）、两个 virtiofsd 四个进程，宿主 `ps` 看不到容器进程。但 Kata 节点是单独的节点镜像（带 mshv 内核、有 `/dev/mshv` 无 `/dev/kvm`，节点本身作为 Microsoft Hypervisor 的 root partition 运行），普通节点有 `/dev/kvm` 却没有任何 Kata 组件——所以只能新建 `--workload-runtime KataVmIsolation` 的池，Azure Linux、Gen2、非 Arm64、不能同开 FIPS / Trusted Launch 都落在镜像这一层。`kata-vm-isolation` 这个 RuntimeClass 建集群时就有，查得到不代表有节点能跑；它的 handler 是 `kata`，自己写 RuntimeClass 要填 handler 名。混跑：RuntimeClass 的 scheduling 段在准入时合进 nodeSelector，Kata Pod 只会上 Kata 节点——`nodeName` 硬塞普通节点被 kubelet 以 NodeAffinity 拒绝，去掉 scheduling 段再塞则卡在 ContainerCreating（`no runtime for "kata" is configured`）；反过来普通 Pod 能落到没打污点的 Kata 节点上，以 runc 运行、和所有 Pod VM 的 VMM 共用宿主内核。节点上另有 Rust 版 shim（handler `kata-v2`）与机密容器 `kata-cc`，没有对应 RuntimeClass，未验证。

### Claim: 沙箱底线要逐条验证并配对照组——不加出站策略的 Pod 能从 IMDS 取到节点 kubelet 身份的 Azure token；AKS 不会自动给 Kata 池打污点

- **来源**：[[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]]
- **首次出现**：2026-11-09
- **最近更新**：2026-11-14
- **置信度**：0.8
- **状态**：active

> 四条底线：独立 guest kernel、无 SA token（`automountServiceAccountToken: false`）、IMDS 与 API Server 不可达、出站默认拒绝只放 DNS。对照组（runc、无策略、默认挂 token）结果正好相反：SA token 三个文件都在、API Server 返回 401、IMDS 可达——请求 token 接口直接拿到有效期 24 小时的 ARM Bearer token，`client_id` 是集群 kubelet 托管身份；新集群它还没角色，生产集群通常至少有 ACR 拉取权限，harness 被注入就是一条直通 Azure 控制面的路，Workload Identity 替代不了出站默认拒绝。AKS 会建 `kata-vm-isolation` RuntimeClass 并带 nodeSelector，Kata Pod 一定落 Kata 池；反过来不成立——新建 Kata 池节点 taints 为空，普通 runc Pod 也会被调度上去，建池时须显式 `--node-taints`。镜像已缓存时 Kata Pod 到 Ready 约 3.3 秒、runc 约 3.1 秒（小探针镜像）。实测。

### Claim: 有效权限是三份声明的交集——应用申请 ∧ 资源 owner 批准 ∧ 平台发布，由控制器投影成关系后算出；操作顺序必须先批准再申请

- **来源**：[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]、[[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]]
- **首次出现**：2026-11-09
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> 三份声明由不同的人写，各自投影成 OpenFGA 里一条关系，没有人直接写"有权限"。资源动作对象是"资源 UID + 确切动作"，动作是不透明字符串（`git.read` 不蕴含 `git.write`、无通配符）；主体与对象用 Kubernetes UID 而非名字，删了重建同名对象不继承授权。意外结果：应用申请了一个未批准的动作时，运行中的会话照常、只拒那一个动作，但**新会话整个建不了**，接口只返回笼统 503，要看应用状态才知道缺批准（"整份申请一起算"是从现象推断）；owner 补批准后运行中会话 5 秒内可用。所以加新权限先让 owner 批准，再在应用里加申请。`permission-intersection` 暂不单独建页（HOLD）。 已归口 [[relationship-based-access-control]]，模型、缓存与撤销、条件、版本的实测见该页。

### Claim: 撤销分两层生效、只挡之后的请求——授权层约 1.2 秒开始 403，网络层在 provider 下已无任何批准动作时约 3 秒移出白名单；放行中的请求不打断，做过的事撤不回

- **来源**：[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]、[[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]
- **首次出现**：2026-11-11
- **最近更新**：2026-11-16
- **置信度**：0.75
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-16 确认——依据：来源 [[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]（2026-11-15 修订），修订后原文仍含本条的数字与结论

> 每 0.5 秒请求一次、删批准对象：两次实验都是约 1.2 秒开始 403（决策点每请求按当前声明重判，不等会话重建）；约 3 秒后出站边车把目的地移出白名单、连域名都解析不了，中间不到一秒两种结果交替。同一 provider 下还有别的批准动作时目的地一直留着，拒绝只在授权层——网络白名单粒度是 provider 的 Service 不是动作。恢复 3~4 秒回 200（首次 8.2 秒未细查）。与"撤销委托后已打开的更新流还会持续几分钟"是同一类问题：授权在请求入口判定，不追着已放行的操作。暂停会话的撤销在恢复时生效，见 [[actor-snapshot-scheduling]]。

### Claim: 网关路由层的静态 provider 只能做只读——写操作和 Git smart-HTTP 要由懂协议的 provider 服务当执行点，再调同一个授权决策点

- **来源**：[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]
- **首次出现**：2026-11-11
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> 静态 provider 所有判断在网关路由里完成，配置校验只允许 GET / HEAD；一个动作对应一条路径前缀、只映射一个资源，两个仓库分开授权就得定义两个动作。Git smart-HTTP 取数据那一步本身是 POST，静态路由做不了 clone；也表达不了"PR 目标分支必须是 main"。写操作改由 provider 服务解析请求、算出资源与动作、调同一决策点，再用本地策略判一次，凭据由它自己持有；网关只做粗粒度路由与身份传递，授权逻辑仍只在决策点一处。

### Claim: 模型请求的授权看请求体里的 model——必须是批准清单里的部署名，别名、已部署未批准的部署、未知模型名一律 403；两种协议共用一份清单

- **来源**：[[AKS-Agent-Runtime系列08：模型接入层]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> 网关把 model 拼成"账号/模型"作为资源目标，走与工具出站同一套逐请求授权：批准的部署名 200；会话层选模型用的别名 `fast` / `smart` 403；账号上部署了但没批准给该资源的 `gpt-4.1-mini` 403；`claude-*` 403。Messages 与 Responses 两种路径共用同一份清单。担心过 Claude Code 后台用小模型（haiku 系列）被拒：去掉小模型覆盖后按时间窗口统计，`--print --bare` 下 5 轮对话正好 5 次授权、全部 200，每轮只调一次主模型。harness 配置只写网关地址和占位 key。实测。

### Claim: actor 与执行单元分离——pod 仍是执行单元，但不再是 agent 的部署、身份、生命周期单元

- **来源**：[[Agent基础设施系列03：kagent与Agent-Substrate]]、[[AKS-Agent-Runtime系列05：会话生命周期与回收]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-16
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-16 确认——依据：来源 [[AKS-Agent-Runtime系列05：会话生命周期与回收]]（2026-11-15 修订），修订后原文仍含本条的数字与结论

> Agent Substrate 的 actor / worker 与 OpenSandbox Durable 会话是两个独立实现：空闲时快照释放执行单元、请求来了恢复到任意空闲单元，要准备的单元数取决于同时在忙的实例数。2026-11-14 升格为独立概念页，快照范围、耗时、恢复语义全部归口 [[actor-snapshot-scheduling]]，本条只保留结论。

### Claim: 执行平面里再分三层——隔离、编排、访问；agent-sandbox 与 OpenSandbox 在编排层同类，OpenSandbox 多一层访问层并能架在 agent-sandbox 上，共三种用法

- **来源**：[[AKS-Agent-Runtime系列03补充：沙箱后端agent-sandbox与OpenSandbox]]、[[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.8
- **状态**：active

> 隔离层是 Kata（Pod 跑在独立 VM 里）；编排层管沙箱何时建、给谁、何时暂停删除（agent-sandbox 的 Sandbox / WarmPool / Claim，OpenSandbox 的 BatchSandbox / Pool）；访问层是生命周期 API 加沙箱内执行命令、读写文件的接口（OpenSandbox 的 lifecycle server + execd；agent-sandbox 的 SDK 对接尚早期的 sandboxd，常见做法是镜像自带 envd 或自写守护进程）。三种用法：只用 agent-sandbox（agent 是常驻服务时 router 转发 HTTP 即可，不要访问层）、只用 OpenSandbox、OpenSandbox 的 workload_provider 设为 agent-sandbox（直接建核心 Sandbox，要补 RBAC 与带 toleration 的模板；丢掉 WarmPool、模板生成的网络策略和 rootfs 快照）。参考实现生产走叠加、测试因快照只能从 BatchSandbox 生成而退回只用 OpenSandbox。AKS 实测。

### Claim: 池化沙箱不套用服务端的隔离运行时配置——Pool 模板漏写 runtimeClassName 就静默跑成 runc，且宽松 toleration 会让它混跑在 Kata 节点上

- **来源**：[[AKS-Agent-Runtime系列03补充：沙箱后端agent-sandbox与OpenSandbox]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.85
- **状态**：active

> OpenSandbox 的 server 配了 secure_runtime=kata，但 Pool 的 Pod 是提前建好的，server 改不了它；故意不写 runtimeClassName 的池领出来的沙箱 uname -r 是宿主内核，全程无报错；Pool 模板 toleration 写 operator: Exists，这些 runc Pod 被调度到 Kata 节点与真沙箱混跑。对策：每个 Pool 显式写 runtimeClassName，上线前在领到的沙箱里对比内核，或用 Kyverno / Gatekeeper 在准入时拒绝。AKS 实测。

### Claim: agent-sandbox 的默认值与领取代价——池里有货 2.7 秒、被领空或 Claim 带 env 就冷启动 23~30 秒；默认网络策略封内网段与 169.254 但连带解析不了集群服务

- **来源**：[[AKS-Agent-Runtime系列03补充：沙箱后端agent-sandbox与OpenSandbox]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.8
- **状态**：active

> 预热池 2 个沙箱 28 秒备好（含拉镜像与挂 Azure Disk）。Claim 不等补货、自己现建（29.7 秒）；env 要在 Pod 创建前写入，带 env 的 Claim 一律冷启动（23.4 秒，池里明明有现成的）。controller 生成 Pod 时不挂 SA token、建 headless Service、按模板生成共享 NetworkPolicy（入站只放 router，出站放公网封 10/8、172.16/12、192.168/16、169.254/16），并把 DNS 改为公网解析——集群内网关地址因此用不了，需改 Unmanaged 自写。API server 的 Service 后端是公网地址，网络上可达返回 401，挡住它的是"不挂 SA token"。删 Claim 连带删 Sandbox 与 PVC；shutdownTime + Delete 到期 4 秒内清理。AKS 实测。

### Claim: 暂停语义两种——agent-sandbox 的 Suspended 只留 PVC、OpenSandbox 的快照保留整个 rootfs；预热池补货与暂停恢复抢同一份 Kata 容量

- **来源**：[[AKS-Agent-Runtime系列03补充：沙箱后端agent-sandbox与OpenSandbox]]
- **首次出现**：2026-11-15
- **最近更新**：2026-11-15
- **置信度**：0.8
- **状态**：active

> agent-sandbox：operatingMode 改 Suspended 删 Pod 留 PVC（8 秒），改回 Running 重挂 Azure Disk（11 秒），PVC 文件在、/tmp 没了、新 VM、主机名不变、Pod IP 变。OpenSandbox：commit Job 把 rootfs 推镜像仓库（7~11 秒），恢复约 5 秒，/workspace 与 /tmp 都在。叠加模式下暂停变 Suspended，不再存 rootfs。第一次恢复 OpenSandbox 沙箱时 Pod 一直 Pending——暂停腾出的 CPU 被两边预热池补货占走，Kata 节点 CPU 请求到 96%，删掉别的池后才恢复。要跨暂停保留 harness 原生会话文件，用 agent-sandbox 就得放进 PVC。AKS 实测。

## 冲突与演进

- 2026-11-16：完备性补抽 [[AKS-Agent-Runtime系列01补充：Kata运行时与节点池]]：新增"Kata 节点池是另一种节点镜像"一条，"容量与调试算法"一条补入调度与 cgroup 对账数据。
- 2026-11-16：/revalidate（漂移复核）——5 条确认、1 条修订：粒度光谱里 Agent Substrate 的代价由"pre-1.0"改为 1.0 GA 后的实际限制。
- `host-mediated-sandbox`（2026-10-29 HOLD）在本批出现两个非 Microsoft 低代码平台的同类实现，2026-11-04 复核后泛化为"凭据不进沙箱、出口注入"并入本页第五条 Claim，未单独建页。
- `actor-snapshot-scheduling` 单一项目来源，作为本页最后一条 Claim 收入（HOLD），等第二个实现出现再评估。
- 2026-11-14：AKS Agent Runtime 系列 01~09 注入。① `credential-out-of-sandbox` 与 `actor-snapshot-scheduling` 阈值满足、用户裁决升格独立页，本页两条 Claim 精简为指向；② 原「受信的 agent loop 走轻粒度」（0.65）与"多租户平台上 harness 也不可信"存在范围张力——前者默认 loop 受信，后者针对多租户编码 harness。不改写原条结论，给原条加适用范围，并另立一条（0.75，一个参考实现实测）；③ 新增沙箱与出站治理六条（卡住而非泄露、底线验证、权限交集、撤销两层、静态路由只读、模型按部署名授权）。
- 2026-11-15：本轮 /extract-knowledge 收入 AKS Agent Runtime 系列补充篇与 03 / 05 / 07 / 10 / 11 的改动：新增执行平面三层与三种用法、池化不套隔离配置、agent-sandbox 默认值与领取代价、两种暂停语义四条 Claim；三方交集归口新建的 [[relationship-based-access-control]]。

## 关联概念

- [[agent-runtime]] — `part-of` 执行平面：本页是 agent runtime 的隔离原语与沙箱编排两个子层
- [[agent-infra-three-layers]] — `part-of` Runtime 层的隔离原语与沙箱编排子层
- [[copilot-managed-runtime]] — `contrasts` 同为"沙箱只有一个受控出口"，前者是浏览器宿主中介（iframe + CSP + JSON-RPC），本页是 egress 代理注入凭据
- [[relationship-based-access-control]] — `constrains` 沙箱能对外做什么以三方交集为准
- [[ai-gateway]] — `uses` 出站只剩一条路，路上的判断在网关

## 来源日记

- [[AKS-Agent-Runtime系列01补充：Kata运行时与节点池]] — Kata 换的是哪一层、Kata 节点镜像、混跑单向、调度与 cgroup 的资源账
- [[2026-11-02-周一]] — Agent 基础设施系列 02/03 成文
- [[Agent基础设施系列02：Kubernetes上的Agent沙箱]] — 三件事拆解、Kata 规格与坑、agent-sandbox、OpenSandbox Pool 与 Credential Vault、选型、冷启动
- [[Agent基础设施系列03：kagent与Agent-Substrate]] — actor / worker 模型、快照范围、安全模型、运行粒度光谱与拆法
- [[2026-11-09-周一]] / [[2026-11-10-周二]] / [[2026-11-11-周三]] — AKS Agent Runtime 系列 01、02、04 成文与 PoC
- [[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]] — 沙箱底线四条与对照组、IMDS kubelet token、Kata 池污点
- [[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]] — harness 不可信、两种拓扑、四类共享物、卡住而非泄露
- [[AKS-Agent-Runtime系列04：出站治理与逐请求授权]] — 权限交集、撤销两层、静态路由只读
- [[AKS-Agent-Runtime系列08：模型接入层]] — 模型请求按部署名授权
- [[GitHub-Copilot系列01：产品全景与竞争格局]] — 产品侧实例：Copilot session 默认跑在 GitHub 托管的隔离 micro-VM 云沙箱，关闭时存快照、可跨入口恢复
- [[AKS-Agent-Runtime系列03补充：沙箱后端agent-sandbox与OpenSandbox]] — 两个后端在 AKS 上的实测与三种组合
