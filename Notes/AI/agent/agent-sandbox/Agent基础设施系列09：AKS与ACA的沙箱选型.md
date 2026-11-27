---
title: Agent 基础设施系列 09：AKS 与 ACA 的沙箱选型
created: 2026-11-27
tags:
  - agent
  - sandbox
  - aks
  - kata-containers
  - pod-sandboxing
  - runtimeclass
  - azure-container-apps
  - aca-sandboxes
  - microvm
  - egress-policy
description: Azure 上跑不可信代码有两条主路。AKS Pod Sandboxing 用 Kata 给每个 Pod 起一台带独立内核的轻量 VM，是一个隔离原语，只做计算隔离，预热、回收、出站、凭据都要自己在上面搭；v2 运行时（预览）开销降到 32Mi，支持从模板 VM 克隆。ACA Sandboxes 是一个托管的沙箱服务，以 sandbox group 为管理和信任边界，microVM 秒级启动，镜像、规格档位、快照、挂起恢复、出站代理和凭据注入都是现成的。ACA 产品化程度高得多，但目前没有可用性 SLA、不支持可用区、单区域、出站默认不限制、托管身份由组内所有沙箱共享，也接不进 Agent Grid。文末按状态、隔离、运维、网络与合规给出决策树
---

# Agent 基础设施系列 09：AKS 与 ACA 的沙箱选型

在 Azure 上让 agent 跑模型生成的代码，现在有两条主路：一条是在 AKS 上开 Pod Sandboxing，用 Kata Containers 给每个 Pod 套一台轻量 VM；另一条是 Azure Container Apps 的 Sandboxes，直接调 API 要一台 microVM。两者看起来都叫"沙箱"，实际不在一个层面上：前者是一个隔离原语，后者是一个完整的托管沙箱服务。

[系列 02](../agent-runtime/Agent基础设施系列02：Kubernetes上的Agent沙箱.md) 讲过 Kata 和 agent-sandbox、OpenSandbox 的分层关系，[AKS Agent Runtime 系列 01 补充](../../../../Azure/Azure-Kubernetes-Service/AKS-Agent-Runtime系列01补充：Kata运行时与节点池.md) 进节点拆过 containerd、shim 和 cgroup。下面先分别把两者讲清楚，再对比，最后给一棵选型的决策树。

## 一、AKS Pod Sandboxing

### 两层开关：节点池给能力，Pod 自己选

在 AKS 上开 Pod Sandboxing，表面上只多了一个参数 `--workload-runtime KataVmIsolation`，但它只做了一半的事。

**节点池这一层**，这个参数让节点用上带 Kata 运行时的节点镜像。另外两个条件必须同时满足：`--os-sku AzureLinux`，以及支持嵌套虚拟化的第二代 VM 规格（文档示例是 `Standard_D4ads_v6`）。已有集群不能在普通池上"打开"它，只能新加一个池：

```bash
az aks nodepool add \
  --cluster-name myAKSCluster \
  --resource-group myResourceGroup \
  --name nodepool2 \
  --os-sku AzureLinux \
  --workload-runtime KataVmIsolation \
  --node-vm-size Standard_D4ads_v6 \
  --node-count 1
```

**Pod 这一层**，manifest 里写了 `runtimeClassName` 才会真正进 VM：

```yaml
spec:
  runtimeClassName: kata-vm-isolation
```

没写的 Pod 照样走 `runc`，跟宿主机共用一个内核。所以同一个集群、甚至同一个 Kata 节点上，沙箱 Pod 和普通 Pod 可以混跑，只给需要隔离的工作负载付 VM 的开销。反过来也意味着，**模板里漏写一行 `runtimeClassName`，Pod 照样能跑起来，只是什么隔离都没有**，不会有任何报错。

用节点自动预配（NAP，即 Karpenter）的集群不走 `az aks nodepool add`，而是在 `AKSNodeClass` 里写 `spec.workloadRuntime: KataVmIsolation`，再让一个 Karpenter `NodePool` 引用它。`kata-vm-isolation` 这个 RuntimeClass 自带 `kubernetes.azure.com/kata-vm-isolation: "true"` 的调度选择器，Pod 只要写了 `runtimeClassName`，Karpenter 就能认出来并拉起兼容的节点，也会把 runtime overhead 算进装箱。NAP 这条路要求 Kubernetes 1.32 以上和 Azure Linux 3。

开好之后可以用一个普通 Pod 和一个 Kata Pod 对比 `uname -r`：Kata Pod 里看到的是 guest kernel，和节点的内核版本不一样。

### 隔离到哪一层

一个 Kata Pod 的启动链是这样的：containerd 不再调标准的 runc shim，而是调 `containerd-shim-kata-v2`；shim 拉起 Cloud Hypervisor 这个 VMM，创建一台带独立内核和 Kata agent 的 Pod VM；VM 里由 Kata agent 去建容器、起进程。Pod 删除时 shim 关掉 VM，把资源还给节点。

跟默认的 runc 相比，差别集中在内核这一层：

| | runc（默认） | Kata（Pod Sandboxing） |
|---|---|---|
| 内核 | 所有 Pod 共用宿主机内核，靠 namespace 和 cgroup 隔开 | 每个 Pod 一台 VM，有自己的 guest kernel |
| 一个内核漏洞被利用后 | 直接到宿主机，波及节点上所有 Pod | 先落在 guest kernel，外面还隔着一层 hypervisor |
| 特权容器 | 等于拿到宿主机 root | 拿到的是 guest VM 的 root，宿主机设备不挂进来 |
| 资源失控 | 靠 cgroup 限制，共享内核 | 被限制在这台 VM 分到的 CPU 和内存里 |

> [!IMPORTANT]
> 文档明确写了：**Pod VM 只提供计算隔离**。AKS 控制面、存储和数据路径、cluster-admin 权限的操作都不在这道墙里，单靠 Pod Sandboxing 做不到 hard multitenancy。网络要另配 NetworkPolicy，治理要另配 Azure Policy，身份要单独设计。

有几处会把这道墙打穿或者削弱，文档单独列了出来：

- **hostPath 卷**会把宿主机的一部分文件系统直接暴露给容器，Kata 的隔离跟着变弱。`/dev` 是个例外，它挂的是 guest 里的 `/dev`，不是宿主机的。文档建议给集群分配内置策略 *Kubernetes cluster pods should only use allowed volume types*，效果设为 Deny，从允许的卷类型里去掉 hostPath，从准入这一层就把它拦掉。
- **特权 Pod** 可以建，但只是 guest 里的 root。即便如此，文档仍建议只在必要时用、只让受信任的人管理。
- **Microsoft Defender for Containers 不评估 Kata Pod**，这部分安全态势要用别的方式补。
- **不支持 host network**，Pod VM 里访问不到宿主机的网络配置。依赖 `hostNetwork: true` 的组件放不进沙箱。

### v1 和 v2

现在有两个 RuntimeClass：GA 的 `kata-vm-isolation`（v1）和预览中的 `kata-vm-isolation-v2`。两者用的是**同一个节点池参数** `--workload-runtime KataVmIsolation`，v1 还是 v2 在每个工作负载的 `runtimeClassName` 里选。v2 相对 v1 的变化是：

- **宿主侧内存开销**从 600Mi 降到 32Mi，都是固定值，不随 Pod 大小变。
- **Kata 运行时**从 Go 实现换成 Rust 实现。
- **启动方式**：v1 每个沙箱冷启动；v2 可以从一台暂停的、预初始化好的模板 VM 克隆新沙箱，启动更快。
- **快照恢复**：v2 具备快照恢复的运行时前提，可以捕获运行中实例的内存、进程和应用上下文。
- **不写 memory limit 时的 VM 大小**：v1 是 512Mi，v2 是 2GiB。
- **NAP**：v1 支持，v2 不支持。

v2 有几个坑，都写在文档的限制里：

1. **顺序不能反。** feature flag `KataVMIsolationV2Preview` 必须在建集群或建 Kata 节点池之前注册。已经存在的池即使事后跑 `az aks update` 或者升级节点镜像也拿不到 v2，只能新加一个池。节点镜像还要求 `202611.13.0` 或更新，各区域上线时间不一样。
2. **模板模式下 VM 规格是死的。** 用模板克隆时，每个 v2 Pod VM 固定 2GiB 内存、2 vCPU，**不管 Pod 写了多少 limit**。原因是调整 VM 大小需要内存热插拔，和模板用的写时复制快照恢复路径不兼容。需要其他规格的工作负载，所在的池就不要初始化模板。文档也提醒，即使写了更小的 CPU limit 或者没写，模板模式也可能分到 2 vCPU，要在目标区域和节点镜像上实测确认。
3. **模板初始化要节点 root。** 模板 VM 要在每个节点上初始化，文档给的是一个 DaemonSet，它的 init container 以 root 身份在节点上执行 `kata-ctl factory init`。文档特意提醒，上线前要找安全团队评审。
4. **emptyDir 要显式写成内存盘。** v2 下用 emptyDir，要在 Pod spec 里写 `medium: Memory` 和 `sizeLimit`。
5. **迁移就是重建 Pod。** 已有 Pod 的 `runtimeClassName` 改不了。Deployment 这类控制器改 Pod 模板后滚动替换；裸 Pod 只能删掉重建。文档的说法是"不要假定两种运行时在所有存储和挂载模式下行为一致"，要先在预生产环境验证挂载、启动延迟和资源用量。回滚就是改回 `kata-vm-isolation` 再替换一次。

模板克隆和快照恢复这两项，对 agent 沙箱很有用：前者压冷启动，后者让暂停后的会话能带着内存状态恢复。[系列 02](../agent-runtime/Agent基础设施系列02：Kubernetes上的Agent沙箱.md) 里 Kata 的劣势之一就是不像 Firecracker 那样能从快照毫秒级恢复，v2 开始往这个方向补。不过它现在还是预览，模板 VM 的规格又是固定的，离直接拿来做预热池还有距离。

### 资源怎么算

Kata 的资源模型和 runc 的根本差别是：**runc 按实际用量挤占节点，Kata 按 VM 规格先占住。** VM 一旦起来，规格就不变了。

**内存。** v1 下，Pod 的 `limits.memory` 就是 VM 的内存大小，启动后不能改。guest kernel 和 Kata agent 也要从这块内存里分，应用实际能用的比 limit 少，可以进 Pod 跑 `free` 看 used 列来估算。宿主侧的 shim、Cloud Hypervisor、virtiofsd 由 RuntimeClass 的 overhead 来记账，kubelet 把 cgroup 的 `memory.max` 设成 limit 加 overhead。VM 内存不能小于 128MiB。

> [!WARNING]
> 不写 memory limit 时，v1 的 VM 是默认的 512Mi，**而且 Pod 的 cgroup 没有上限**，宿主侧组件的内存不受约束。跑 Chromium、pandas 这类沙箱，512Mi 也很容易 OOM。沙箱模板里一定要写 limits。

文档在 overhead 上自己有一处没对齐：RuntimeClass 那张表说 v1 是"600Mi 固定、不随 Pod 大小变"，但下面的参考用量表里，overhead 一列从 128Mi VM 对应的 16Mi 一路涨到 128Gi VM 对应的 1Gi。我在 [AKS Agent Runtime 系列 01 补充](../../../../Azure/Azure-Kubernetes-Service/AKS-Agent-Runtime系列01补充：Kata运行时与节点池.md) 里实测的是 600Mi 固定，2Gi 的 Pod 在节点上扣 2648Mi。估容量时以集群里 `kubectl get runtimeclass kata-vm-isolation -o yaml` 实际看到的值为准；参考表更像是在说明自建 RuntimeClass 时 overhead 大致该配多少。

自建 RuntimeClass 时，handler 要写 `kata`（不是 RuntimeClass 的名字），并先用 `kubectl get runtimeclass` 确认集群支持这个 handler：

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: small-kata-pods
handler: kata
overhead:
  podFixed:
    memory: "120Mi"
    cpu: "250m"
```

**CPU。** 有三条规则：

- Pod 的 `limits.cpu` 决定 VM 有几个 vCPU。**小数会向上取整**：写 2.5，VM 分到 3 个 vCPU，但 cgroup 仍按 2.5 限。算成本和密度时要按取整后的数算。
- 不写 CPU limit 时，v1 给 VM 1 个 vCPU，**宿主侧组件的 CPU 用量没有上限**。
- 节点上预留的 CPU 是 RuntimeClass CPU overhead 加 Pod 的 `requests.cpu`。只写了 limit、没写 request 时，limit 会被复制成 request。两个都是 0 就不预留。比如 overhead 1、limit 2.5，节点预留 3.5 核，VM 分到 3 个 vCPU，容器最多用 2.5 个。

归结起来就是三件事：**request 和 limit 写成一样**（shim 只看 limit 来定 VM 规格，request 只影响调度）；节点 CPU 常跑满就给 overhead 配一个非零值，给宿主组件留出余量；按 VM 粒度做容量规划，预热池里每多一个空闲沙箱，就多占一份 limit 加 overhead。

### 限制和前提

- **只支持 Azure Linux**。Ubuntu、Windows、Azure Container Linux 都不行。
- **VM 规格**必须是支持嵌套虚拟化的第二代规格；**不支持 Arm64**；Kata 节点池**不能同时开 FIPS 或 Trusted Launch**。
- **版本**：Kubernetes 1.27 以上；NAP 预配的 Kata 节点要求 1.32 以上和 Azure Linux 3；Azure CLI 2.80.0 以上。
- **存储性能**：在 Azure Files 和高性能本地 SSD 上，IOPS 可能达不到普通容器的上限。
- **观测与安全**：Defender for Containers 不评估 Kata Pod；不支持 host network。

## 二、ACA Sandboxes

### 它是什么

ACA Sandboxes 是 Container Apps 里的一种一等资源，资源类型是 `Microsoft.App/SandboxGroups`，和 apps、jobs、dynamic sessions 并列，而且**不需要 Container Apps environment**。每个沙箱是一台独立的 microVM，有自己的内核、CPU、内存、本地磁盘和网络边界，从镜像启动不到一秒，从快照恢复更快，停止后不收 CPU 和内存的费用。产品站上标的是 GA。

Container Apps 现在有四种计算形态，sandbox 的位置是"你自己管生命周期、有状态"的那一格：

- **Apps**：长期运行的服务、API，无状态，状态放外部。
- **Jobs**：跑完即止的批处理。
- **Dynamic sessions**：由 session pool 托管分配和生命周期，请求级、用完即弃，适合执行一段 LLM 生成的脚本。
- **Sandboxes**：通过 SDK 和 CLI 直接控制每一台 microVM，创建、挂起、恢复、删除都由你决定，状态靠快照和卷保留。

文档的建议是新项目优先考虑 sandboxes 而不是 dynamic sessions，尤其是需要持久状态和可编程控制的场景。两者的差别主要在控制权：dynamic sessions 是池子替你管，HTTP 请求经池子的管理端点路由进去；sandboxes 是你直接拿到一台机器，文件、端口、出站策略都能逐台配置，还有卷和快照。

### Sandbox group：管理边界，也是信任边界

Sandbox group 是一个区域级的 ARM 资源，一个组最多装 100,000 个沙箱。组内共享的东西是：镜像、快照、卷、secrets、托管身份、VNet 连接和 connectors。管理上分成两个平面：

- **ARM 控制面**只管组本身：创建、更新、删除、列出组，以及 VNet 连接。
- **数据面**管组里的一切：沙箱、镜像、快照、文件、卷、secrets、端口、出站策略。调数据面需要 **Container Apps SandboxGroup Data Owner** 这个角色，可以分配在组、资源组或订阅范围上。

这里有两点要特别留意：

> [!WARNING]
> **托管身份挂在组上，组内所有沙箱都继承它，都能用它换 Entra token。** 沙箱里跑的是不可信代码，这意味着组的托管身份有什么权限，被注入的代码就能拿到什么权限。所以不同信任等级的工作负载要分到不同的组，组的身份只授最小权限。

另一点是权限粒度：文档里数据面只有 Data Owner 这一个角色，拿到它就能管组内所有沙箱，包括进 shell、读写文件。按租户或团队分权，只能靠拆组来实现。删除组是不可逆的，会连同里面的沙箱、镜像、快照、卷、secrets 一起删掉。

### 镜像、规格、快照：把模板固定下来

ACA 把"一个沙箱长什么样"拆成三样东西，各管一层：

**镜像（disk image）定根文件系统。** 来源有三种：

- **公共镜像**，由微软维护，至少每月更新一次，严重安全修复会提前发布。除了 ubuntu、nginx 和 Python、Node.js、.NET、PHP 各版本的运行时，还有几个是专门为 agent 准备的：`claude`（固定版本的 Claude Code CLI）、`copilot`（GitHub Copilot CLI，systemd 作 PID 1，自带 AGENTS.md 和 skills）、`azure-dev`（全套 Azure 开发工具链），以及 `python-3.12-code-interpreter`（暴露 MCP 端点执行不可信 Python）。文档提醒版本可能随时变，生产上要固定版本就用自定义镜像。
- **自定义镜像**，从你自己的 OCI 镜像转换而来，私有仓库可以用用户名加 token 或托管身份认证。
- **提交镜像（commit）**，把一个运行中沙箱的文件系统提交成新镜像，适合在沙箱里交互式装好环境再固化下来。提交时沙箱会短暂暂停。

**规格档位定资源。** 从 XS（0.25 核、0.5GiB 内存、5GiB 磁盘）到 3XL（16 核、32GiB、320GiB）共七档，默认 M（1 核、2GiB、20GiB），每升一档资源翻倍。也可以按 millicore 和 Mi 直接指定 CPU 和内存。

**快照定运行时状态。** 快照捕获一台运行中沙箱的内存和磁盘，独立于源沙箱保存，可以拿来做三件事：挂起后恢复，从一个准备好的状态克隆出很多台（fan-out），以及在危险操作前打检查点。从快照新建的沙箱沿用快照里的 CPU、内存、磁盘，不能改。

这三样加上标签、环境变量、自动挂起策略，可以写成一份 YAML 提交进代码库，评审时和代码放在一起看：

```yaml
disk: ubuntu
resources:
  cpu: 1000m
  memory: 2048Mi
lifecycle:
  autoSuspendPolicy:
    enabled: true
    interval: 300
    mode: Memory
labels:
  workload: code-exec
environment:
  GREETING: hello
```

文档给的分工是：**多台沙箱共用的文件系统基线放进镜像，某个时间点的运行时状态放进快照**。按工作负载的不同，选不同的镜像和档位，再决定挂起时保留多少状态：

- **生命周期策略**：自动挂起（默认空闲 300 秒，没有入站流量、没有 exec、没有交互 shell、没有文件操作才算空闲）和自动删除（停止后多少天删）。
- **挂起模式**：Memory 模式保留内存和磁盘，恢复后进程接着跑；Disk 模式只保留磁盘，恢复时 VM 重新启动。**挂了 data disk 卷的沙箱只能用 Disk 模式。**
- **卷**：Azure Blob（可以同时挂到多台沙箱）、自带的 Blob 容器、Data Disk（高性能，同一时间只能挂一台）。

快照只管沙箱本地的状态，不协调外部系统。从同一个快照 fan-out 出去的多台沙箱，可能把快照之后的非幂等操作重放一遍；恢复后 token、租约、锁也可能已经过期。文档的检查清单里专门要求：初始化和清理步骤要做成幂等，恢复后要重连客户端、重新校验外部依赖。

### 网络与凭据：在沙箱外管

ACA 的网络管控都在沙箱外面：入站和出站各有一个托管代理，沙箱里的代码绕不过去。

> [!CAUTION]
> **不配出站策略时，沙箱的出站访问是不受限的。** 出站策略是 opt-in 的。跑不可信代码的沙箱，起步就应该是 `default_action = Deny`、流量检查设为 Full，再按需加最小的放行列表。

出站策略的模型是：

- **规则按顺序匹配，首条命中生效**，可以按 host、path、HTTP method 匹配，动作有 Allow、Deny、Transform（改请求头）、Rewrite（改目标的 scheme、host、path）。没有规则命中就走默认动作。规则要从具体到宽泛排，比如先 Deny `api.example.com/admin`，再 Allow `api.example.com`。
- **凭据在代理上注入**。Transform 可以从组的 secrets 里取值（如 `Bearer {value}`），也可以现场用托管身份换一个 token 塞进请求头。沙箱里的代码只发请求，从头到尾拿不到密钥，这正好解决了 agent 调模型 API 时 key 放哪里的问题。
- **Webhook 动态决策**。规则可以不写静态动作，而是挂一个 `hookRef`，请求命中时由代理调你的 HTTPS 端点，按返回结果放行、拒绝或改写，适合按租户授权、现场签发 token。调用失败时的默认行为（`failBehavior`）是 Deny。
- **流量检查分档**：Full 检查所有流量、非 HTTP 流量一律拦掉；Partial 只检查命中规则的流量，非 HTTP 放行；None 不执行任何出站规则。
- **策略可以在运行中改**，对后续请求生效，已经在途的请求不重新评估。文档建议定期拉取出站决策日志看 Deny 的计数，突然变多通常意味着配置错了，或者有外传数据的企图。

入站这边，每个暴露的端口有一个独立的 HTTPS 地址，可以匿名，也可以要求 Entra ID 认证，请求到达时还能唤醒已停止的沙箱。私有网络两个方向都能做：组可以通过委派子网接入 VNet，访问私有资源；入站可以走 private endpoint，不经公网。VNet 里要避开两段保留地址 `192.168.0.0/24` 和 `100.65.0.0/23`，私有镜像仓库、自定义 DNS、对端网络的地址落在这两段里会访问失败，而 VNet 连接本身照样显示创建成功。

凭据还有一处和"密钥不进沙箱"的原则不完全一致：门户里给 GitHub Copilot 和 Claude 配的 provider credentials，是在**沙箱启动时注入进沙箱**的，供里面的 CLI 直接认证。轮换后正在运行的沙箱不会自动更新，要重启或重建。用 `claude`、`copilot` 预设镜像跑 agent 时，这把 key 是在沙箱里的。

### 可靠性和配额

产品站标的是 GA，但看可靠性文档，有几条在定生产方案时绕不过去：

- **没有可用性 SLA。** 只有卷背后的存储服务有自己的 SLA。
- **不支持可用区**，既不能指定 zone，也没有 zone 冗余。
- **单区域服务**，不跨区域复制，也不自动故障转移。要多区域就每个区域各建一个组，镜像、secrets、配置自己同步，流量切换和中断后的恢复也要自己做。快照不能跨区域迁移。
- **区域故障时，只在运行中沙箱内存里的状态可能丢失。** 要持久的数据放卷或外部存储，组的配置用 Bicep、Terraform 管起来。
- **平台维护**会短暂中断几秒，平台会把运行中的沙箱迁到健康节点上自动恢复（Memory 模式连内存一起保留）。客户端要能处理这类瞬时故障。
- **配额**：每个订阅每个区域默认 300 个并发活跃核、每分钟 3,000 次 API 调用，停止的沙箱不占核。到了核数上限就新建不了、也启动不了沙箱，要提前申请提额。
- **工具链还在早期**：Python SDK 是 `0.1.0b4`，文档示例里数据面的 API 版本是 `2026-02-01-preview`；部分功能 CLI 还不支持，只能用门户或 SDK；Azure Government 和 Azure China 还没有上线。
- **计费**：运行时按核秒和 GiB 秒计，停止不收计算费；自定义镜像、快照、卷按存储计费（文档标注为即将开始收费）。

## 三、两者对比

拿 AKS Pod Sandboxing 和 ACA Sandboxes 直接比，其实是拿一块砖和一栋房子比。Kata 只回答"这段代码在哪种墙后面跑"；ACA 把墙、房间分配、门禁、钥匙管理都做好了。公平的比法是 ACA Sandboxes 对比"AKS + Kata + 一层沙箱编排 + 出站管控"这一整套：

| | AKS Pod Sandboxing | ACA Sandboxes |
|---|---|---|
| 是什么 | 节点池上的一种容器运行时 | 托管的沙箱服务，一等 ARM 资源 |
| 隔离方式 | Kata + Cloud Hypervisor，每个 Pod 一台 VM | 每个沙箱一台 microVM，独立内核 |
| 管理单位 | Pod，用 Kubernetes 的那一套管 | sandbox group，组内共享镜像、快照、身份、网络 |
| 环境模板 | 容器镜像 + Pod 模板，自己维护 | 公共镜像、自定义镜像、提交镜像，加七档规格和 YAML |
| 启动与状态 | v1 冷启动；v2 模板克隆和快照前提（预览） | 秒级启动，内存和磁盘快照、挂起恢复、fan-out 都现成 |
| 预热、分配、回收 | 自己写，或加 agent-sandbox、OpenSandbox | 自动挂起、自动删除，停止不收计算费 |
| 出站与凭据 | NetworkPolicy、egress 代理、凭据代理都要自己搭；可接 Agent Grid | 内置出站代理（默认不限制），规则、凭据注入、webhook 现成；不支持 Agent Grid |
| 身份 | 按 Pod 配 workload identity，可以每个沙箱不同 | 托管身份挂在组上，组内沙箱共享 |
| 可靠性 | 继承 AKS 集群的可用区和 SLA 设计 | 无可用性 SLA、无可用区、单区域 |
| 容量和运维 | 自己管节点和容量，按 VM 粒度规划 | 不管节点，受默认 300 核的配额限制 |
| 适合谁 | 已有 AKS 平台团队、要自主可控和深度定制 | 想直接拿到沙箱能力、不想运维集群 |

看完文档，ACA 给人的第一印象是比 AKS 这条路更像生产级产品。我的判断是要把两件事分开：

- **产品完整度上，ACA 明显领先。** sandbox group 的统一管理、按工作负载选镜像和档位、可以评审的 YAML 模板、快照和挂起恢复、沙箱外的出站代理和凭据注入，这些在 AKS 上要靠 Kata 加 agent-sandbox 或 OpenSandbox 加 egress 网关自己拼，拼完还得自己运维。对"给 agent 一个可以挂起恢复的独立工作区"这个需求，ACA 几乎是开箱即用。
- **可靠性和治理上，ACA 还没到能直接上生产的程度。** 没有可用性 SLA、不支持可用区、单区域、SDK 还是 beta；安全默认值偏宽松（出站默认放开）；托管身份按组共享、数据面只有一个 Owner 角色，权限粒度粗；也接不进 Agent Grid。AKS 这边隔离原语本身是 GA 的，可用区和 SLA 跟着集群走，粒度可以细到每个 Pod。

所以更准确的说法是：ACA 是 Azure 上**产品化程度最高**的 agent 沙箱，AKS 是**可控程度最高**的。

## 四、怎么选：决策树

按下面的顺序问，前面的问题优先：

1. **只需要执行一段代码、用完即弃，不需要保留状态吗？**
   - 是 → **ACA dynamic sessions**。池子替你管分配和回收，接入最轻。
   - 否 → 进入第 2 题。
2. **有硬性的可用性要求吗？比如要可用区冗余、要合同 SLA，或者要部署在 Azure Government、Azure China？**
   - 是 → **AKS + Pod Sandboxing**。ACA Sandboxes 目前满足不了这些。
   - 否 → 进入第 3 题。
3. **出站要用 Agent Grid 按身份统一管控吗？或者网络和身份必须细到每个沙箱各不相同？**
   - 是 → **AKS + Pod Sandboxing**，自己配 workload identity 和出站；不想管节点的话，可以评估 AKS Agent Sandbox 集群扩展的 ACI serverless 运行时。
   - 否 → 进入第 4 题。
4. **团队已经在运维 AKS，并且要求运行时自主可控、可以深度定制吗？**
   - 是 → **AKS + Pod Sandboxing + agent-sandbox 或 OpenSandbox**。先用 GA 的 v1，v2 的模板克隆在测试池里验证。
   - 否 → 进入第 5 题。
5. **需要挂起恢复、带状态的工作区、快速 fan-out，并且希望出站和凭据有现成方案吗？**
   - 是 → **ACA Sandboxes**。上线前把第五节的四件事补齐。
   - 否 → 需求还不清晰，先用 ACA Sandboxes 做原型，跑通之后再按第 2 到第 4 题判断要不要迁到 AKS。

两者也不是只能选一个。一种常见的组合是：交互式、长会话的 agent 工作区放 ACA Sandboxes，拿它的挂起恢复和快照；需要强治理、高可用的批量执行放 AKS。前提是两边的出站和凭据策略要对齐，不能一边严一边松。

## 五、放回 agent 沙箱里看

沙箱的墙防的是模型生成的代码逃逸到宿主机、波及别人的沙箱。agent 被提示词注入带偏之后，真正的风险往往是它能连到哪里、能拿谁的凭据去调什么接口。不管选哪条路，下面这几件事都要单独想清楚。

**选 ACA Sandboxes 时：**

- **出站默认 Deny**，流量检查设为 Full，放行列表从最小开始。
- **按信任等级拆 sandbox group**，组的托管身份只授最小权限，因为组内每台沙箱都能用它换 token。
- **模型 key 走出站代理的 Transform 注入**，不要用会把 key 放进沙箱的 provider credentials；用 `claude`、`copilot` 预设镜像时要清楚这一点。
- **持久数据放卷或外部存储**，组的配置用 IaC 管起来，多区域自己做。

**选 AKS Pod Sandboxing 时：**

- **沙箱节点池打污点**，沙箱 Pod 带 toleration。
- **Pod 模板里 `runtimeClassName`、`limits` 两样都写死**，request 和 limit 写成一样。
- **用 Azure Policy 禁掉 hostPath。**
- **出站用 NetworkPolicy、egress 代理或 [Agent Grid](../agent-grid%28network-security%29/Agent基础设施系列08：Agent-Grid的网络层管控.md)**，自建做法见 [AKS Agent Runtime 系列 04](../../../../Azure/Azure-Kubernetes-Service/AKS-Agent-Runtime系列04：出站治理与逐请求授权.md)。
- **建沙箱、预热、回收交给 agent-sandbox 或 OpenSandbox**，AKS 也把 agent-sandbox 做成了预览中的 [Agent Sandbox 集群扩展](https://learn.microsoft.com/en-us/azure/aks/agent-sandbox-cluster-extension)。

## 相关阅读

- [Agent 基础设施系列 01：三层划分与自建路线](../agent-platform/Agent基础设施系列01：三层划分与自建路线.md)——托管路线与 AKS 自建路线的分界
- [Agent 基础设施系列 02：Kubernetes 上的 Agent 沙箱](../agent-runtime/Agent基础设施系列02：Kubernetes上的Agent沙箱.md)——Kata、agent-sandbox、OpenSandbox 的分层与选型
- [AKS Agent Runtime 系列 01 补充：Kata 运行时与节点池](../../../../Azure/Azure-Kubernetes-Service/AKS-Agent-Runtime系列01补充：Kata运行时与节点池.md)——进节点看 shim、节点镜像、混跑规则和 cgroup 实测
- [AKS Agent Runtime 系列 01：Sandbox 之外的三个平面](../../../../Azure/Azure-Kubernetes-Service/AKS-Agent-Runtime系列01：Sandbox之外的三个平面.md)——Kata 池污点与沙箱 Pod 的四条底线
- [Agent 基础设施系列 08：Agent Grid 的网络层管控](../agent-grid%28network-security%29/Agent基础设施系列08：Agent-Grid的网络层管控.md)——沙箱外按身份管出站

## 参考资料

- [Overview of Pod sandboxing in Azure Kubernetes Service (AKS)](https://learn.microsoft.com/en-us/azure/aks/concepts-pod-sandboxing)
- [Pod sandboxing considerations on Azure Kubernetes Service (AKS)](https://learn.microsoft.com/en-us/azure/aks/considerations-pod-sandboxing)
- [Pod sandboxing with Azure Kubernetes Service (AKS)](https://learn.microsoft.com/en-us/azure/aks/use-pod-sandboxing)
- [Azure Container Apps Sandboxes overview](https://learn.microsoft.com/en-us/azure/container-apps/sandboxes-overview)
- [Reliability in Azure Container Apps Sandboxes](https://learn.microsoft.com/en-us/azure/reliability/reliability-container-apps-sandboxes)
- [Egress policies and network controls for Azure Container Apps Sandboxes](https://learn.microsoft.com/en-us/azure/container-apps/sandboxes-egress-policies)
- [Sandbox lifecycle in Azure Container Apps Sandboxes](https://learn.microsoft.com/en-us/azure/container-apps/sandboxes-snapshots-state-management)
- [Azure Container Apps Sandboxes 文档站](https://sandboxes.azure.com/docs/sandboxes)
- [Kata Containers](https://katacontainers.io/)
- [Cloud Hypervisor](https://github.com/cloud-hypervisor/cloud-hypervisor)
