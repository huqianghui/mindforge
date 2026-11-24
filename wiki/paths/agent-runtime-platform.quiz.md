---
title: "题库：Agent Runtime 与 Agent Platform"
created: "2026-11-16"
updated: "2026-11-24"
tags:
  - wiki
  - path
  - quiz
path_id: "agent-runtime-platform"
---

# 题库：Agent Runtime 与 Agent Platform

配合 [[agent-runtime-platform]] 使用，按站点分组。题型三种：**场景**（给一个情境，说出你会怎么判断）、**辨析**（一句常见说法，判断对错并说出为什么）、**解释**（用自己的话讲清一个机制）。答案是参考要点，说出主要意思即可。

## 第 1 站 · 总图：四个概念与三层

### Q1 · 解释

**问**：用三个问题区分 agent framework、agent runtime、agent platform，harness 放在哪？

**答**：framework 回答 agent 怎么思考、调工具、管状态；runtime 回答在哪跑、怎么隔离、怎么扩缩、崩了怎么续；platform 回答企业怎么发现、授权、治理、运营这些 agent。harness 是用 framework 搭出来的成品（或现成的 Claude Code、Codex），在 runtime 眼里是一个被托管、可替换的进程，所以不单列一层。

**出处**：[[agent-infra-three-layers]]、[[agent-harness]]

### Q2 · 辨析

**问**："LangGraph 有 Checkpointer、ADK 有 SessionService，所以会话管理属于 runtime。"对吗？

**答**：不对。这些都是 framework 原生能力，但它们只定义状态长什么样、什么时候存、怎么恢复。分界是逻辑 vs 设施：存储在哪、进程被杀了谁拉起、多副本下会话怎么路由才是 runtime 的事。判别法是问"换一个 runtime 还在不在"。

**出处**：[[agent-framework]]

### Q3 · 解释

**问**：agent platform 有哪两种用法？Copilot Studio、Foundry、Agent 365 各属于哪一种？

**答**：广义指企业实际拿来用的整套产品，替你打包了若干层，Copilot Studio、Foundry Agent Service、Copilot Managed Runtime 和在 AKS 上自建的那一套都属于这种；狭义指三层划分里最上面那层，只管注册与目录、身份、合规台账，不运行 agent，代表是 Agent 365。

**出处**：[[agent-platform]]

### Q4 · 场景

**问**：客户想让同一份 agent 代码将来能在 Foundry Hosted Agent 和 AKS 之间切换，要守住哪几样东西？

**答**：framework 与 runtime 之间靠容器镜像、调用协议（Responses、Invocations、A2A 等）、外置的状态存储——会话和 checkpoint 不能留在进程内存里；runtime 与 platform 之间靠 agent 身份、网关路由、OTel trace，trace 按逻辑 agent 而不是 pod 名归集。"同一镜像不改就换 runtime"本库尚未实测。

**出处**：[[agent-infra-three-layers]]

## 第 2 站 · Harness 怎么被托管

### Q5 · 解释

**问**：harness 按"归谁、能不能改"分哪三类？判断 harness 与 runtime 是否绑死只看哪一条？

**答**：代码框架自己搭（Microsoft Agent Framework、LangGraph 等，产物是镜像）；现成 harness 拿来即用（Claude Code、Codex、GitHub Copilot 等，本身执行 shell 与代码，适合整个放进沙箱）；平台托管 harness 不能改（Foundry Prompt Agent、Copilot Studio 大部分 harness）。是否绑死只看 harness 是不是平台自己的代码。

**出处**：[[agent-harness]]、[[harness-portability-spectrum]]

### Q6 · 辨析

**问**："把 harness 的 loop 放在沙箱外、只把 bash 放进沙箱，比整个 harness 放进去更安全。"对吗？

**答**：不一定。loop 读的沙箱输出同样可能被注入，如果 loop 手里握着长期凭据，就成了 confused deputy——低权限的不可信输入借高权限主体之手执行。凭据不进沙箱这条规矩同样适用于沙箱外任何读不可信内容的组件，loop 调外部资源也要走同一网关、按会话授权。编码 harness 的文件工具默认操作本地文件系统，拆开等于改造 harness。

**出处**：[[credential-out-of-sandbox]]、[[agent-sandbox]]

### Q7 · 解释

**问**：为什么多租户平台上要把编码 harness 本身也当作不可信？

**答**：harness 读的是模型输出、网页、仓库 README，都可能带 prompt injection，被劫持后 harness 就是攻击者。所以把 harness 连同工具与工作区整个放进 Kata、沙箱内免确认运行，最坏结果关在那台 VM 里；凭据、授权决策、模型路由与配额、checkpoint 控制与审计留在沙箱外。

**出处**：[[agent-sandbox]]

### Q8 · 解释

**问**：Claude Code 里唯一能强制执行的机制是什么？这对做平台的人意味着什么？

**答**：hooks——它由代码直接执行、绕过模型决策；Memory、Rules、Skills 都只是递到模型面前的建议，loop 本身也不做决策，permission 留给高风险动作的人工确认。含义：要确定性的地方用代码（hook、外部门禁、网关），不要指望在提示层写更多规则。

**出处**：[[agent-harness]]

## 第 3 站 · 执行：隔离与沙箱编排

### Q9 · 解释

**问**：执行平面分哪三层？agent-sandbox 与 OpenSandbox 各在哪几层？

**答**：隔离层（Kata，Pod 跑在独立 VM 里）、编排层（沙箱何时建、给谁、何时暂停删除）、访问层（生命周期 API 与沙箱内执行命令、读写文件的接口）。两者在编排层同类（agent-sandbox 的 Sandbox / WarmPool / Claim，OpenSandbox 的 BatchSandbox / Pool），OpenSandbox 多一层访问层（lifecycle server + execd），还能叠在 agent-sandbox 上，所以一共三种用法。

**出处**：[[agent-sandbox]]

### Q10 · 场景

**问**：同事说"在普通节点池上装上 Kata 的 shim 就能跑 Kata Pod 了"，你怎么回？

**答**：在 AKS 上不行。Kata 换的只是 containerd 下面那段 shim，但 Kata 节点是另一种节点镜像：mshv 内核、有 /dev/mshv 无 /dev/kvm，节点作为 Microsoft Hypervisor 的 root partition 运行，普通节点上没有任何 Kata 组件。只能新建 KataVmIsolation 节点池。反过来要注意：没打污点时普通 Pod 会落到 Kata 节点上，以 runc 运行、和别人的 Pod VM 共用宿主内核，所以沙箱池必须打污点。

**出处**：[[agent-sandbox]]、[[AKS-Agent-Runtime系列01补充：Kata运行时与节点池]]

### Q11 · 解释

**问**：一台 32 GiB 的 Kata 节点，每个沙箱给 2Gi，大约放几个？为什么不能按 runc 的"实际用多少"估？

**答**：约十个。调度扣的是 limit + RuntimeClass overhead（实测 2Gi 的 Pod 记 2648Mi），VM 规格启动时就定死，调度不看实际用量。不写 resources 的 Kata Pod 只记 600Mi 却照样起一台 512Mi 的 VM，而且宿主 cgroup 没有上限。

**出处**：[[agent-sandbox]]

### Q12 · 辨析

**问**："服务端配了 Kata 运行时，所以池化出来的沙箱都跑在 Kata 里。"对吗？

**答**：不对。池化沙箱不套用服务端的隔离运行时配置，Pool 模板漏写 runtimeClassName 就静默跑成 runc，宽松的 toleration 还会让它混跑在 Kata 节点上看起来正常。同类静默失效还有：CNI 不支持时 NetworkPolicy 被忽略不报错。底线要逐条验证并配对照组。

**出处**：[[agent-sandbox]]

## 第 4 站 · 执行：暂停、快照与恢复

### Q13 · 解释

**问**：Agent Substrate、OpenSandbox + BatchSandbox、agent-sandbox Suspended 三种暂停各留下什么？

**答**：Substrate 快照内存与本地文件，进程从冻结处继续，但挂起时不保留打开的网络连接；OpenSandbox 以 BatchSandbox 作 workload provider 时把 rootfs 提交成镜像，恢复后 /workspace、/tmp、harness 原生会话文件都在、进程没了；agent-sandbox 的 Suspended 删 Pod 留 PVC，/tmp 与 rootfs 都没了——OpenSandbox 叠在 agent-sandbox 上的生产配置也是这一种。

**出处**：[[agent-runtime]]、[[actor-snapshot-scheduling]]

### Q14 · 场景

**问**：参考实现的测试环境里，Durable 会话暂停后 agent 还记得上一轮；换到生产配置后同样的操作 agent 失忆了。为什么？怎么办？

**答**：测试配置用 BatchSandbox，快照保留整个 rootfs，harness 的原生会话文件随快照走；生产配置让 OpenSandbox 直接建 agent-sandbox 的 Sandbox，暂停变成删 Pod 留 PVC，rootfs 与 /tmp 不再保存。要续接就得把原生会话文件和工作区放进 PVC。

**出处**：[[actor-snapshot-scheduling]]

### Q15 · 解释

**问**：actor 与执行单元分离解决的是什么问题？动手之前要先量什么？

**答**：把 agent 实例和沙箱 pod 拆开，空闲时快照、释放 worker，请求来了恢复到任意空闲 worker，要准备的 worker 数取决于同时在忙的实例数，而不是 agent 或会话总数。收益建立在 agent 实际"忙"的时间占比上，动手前先从 trace 量这个数。

**出处**：[[actor-snapshot-scheduling]]

### Q16 · 解释

**问**：为什么凭据、身份、出站白名单都要在恢复时从沙箱外重新取？

**答**：快照里的东西都是"暂停那一刻"的：恢复时下发的白名单已经是撤销之后的那份，撤销在恢复那一刻生效；OpenSandbox 的 Credential Vault 只在 sidecar 内存，恢复后为空；Substrate 的 golden snapshot 会冻结环境变量里的身份。另外网络连接不跨暂停，MCP、网关长连接、更新流都要由控制面在恢复时重建。

**出处**：[[actor-snapshot-scheduling]]、[[agent-runtime]]

## 第 5 站 · 会话：控制面

### Q17 · 解释

**问**：agent 调用和普通 API 调用有哪三处根本差别？

**答**：调用的单位是会话而不是一次请求（会话 ID 稳定、背后的沙箱可以暂停替换）；结果是流式持续产出、先在沙箱外落库再推给渠道，而不是一个返回值；回收归会话层而不是沙箱 TTL，并要有按标签对账的兜底。

**出处**：[[agent-session-control-plane]]

### Q18 · 解释

**问**：一轮对话的四条规矩分别防什么故障？

**答**：创建会话带幂等键——防渠道重试多建出没人认领的 VM；消息落盘后才 ACK、同会话一次一轮——防控制面挂掉丢消息；每轮按当前声明重新授权——中途撤销下一轮就被拒；先写"新状态 + 副作用意图"再由 runner 执行——重启后能接着做完没做完的副作用。

**出处**：[[agent-session-control-plane]]

### Q19 · 辨析

**问**："harness 弹出'要不要允许'时，把确认转发到 Teams 让用户点一下就行。"对吗？

**答**：不对。卡着等人时沙箱、凭证、会话都在空耗；渠道那头看不到工作区没法判断；沙箱内容不可信，原样转发等于让注入内容借 agent 之口向真人要批准。先分清是 harness 自带的交互提示（配置关掉）还是真缺能力（授予后重跑），再用权限档位、计划阶段一次性审批、启动前预检和带检查点的失败，把权限问题挪到执行前。

**出处**：[[agent-session-control-plane]]

### Q20 · 场景

**问**：你要自己写一个最小控制面，第一版要哪几块？后端选 agent-sandbox 时比选 OpenSandbox 多做什么？

**答**：会话 API（建会话带幂等键、投递消息、按游标推事件流）、状态库、runner、一个 harness 适配器。OpenSandbox 的领取、执行（execd）、文件、快照都是现成 API；agent-sandbox 只有领取与暂停，沙箱镜像里要自己补一个执行守护进程，Durable 会话也要改成把要保留的文件放进 PVC。贯穿所有组件的规矩是先落盘再执行、重启能接着做、结果不确定不盲目重放。

**出处**：[[agent-session-control-plane]]

## 第 6 站 · 会话：持久执行、高可用与回收

### Q21 · 解释

**问**：多副本控制面里，会话队列和 lease + fencing token 各管什么？

**答**：会话队列管谁收消息——按 session_id 同一时刻只交给一个接收者、按序；lease + fencing token 管谁能写结果——每抢到一次 lease token 加一，写结果带条件校验，旧主醒来后写入被拒。队列挡不住卡住又醒来的旧主接着写，所以两者都要。

**出处**：[[agent-session-control-plane]]

### Q22 · 场景

**问**：控制面在一轮执行中途被杀，和在 checkpoint 进行中被杀，重启后应该怎么处理？

**答**：执行中被杀，结果"未确认"，整轮重发——不重发就丢消息，代价是编码 harness 重跑可能重复副作用；checkpoint 中被杀，不重新发起快照，等原来那份完成——重发快照没有副作用但浪费时间。按副作用分流。

**出处**：[[durable-execution]]

### Q23 · 辨析

**问**："有了 fencing token，旧主就不可能再产生重复的副作用。"对吗？

**答**：不对。fencing 挡住的是写入，挡不住执行——实测旧主解冻后和新主同时跑同一轮重叠 11 秒多。真实 agent 的副作用（推代码、建 PR、回 Teams）几乎不经过控制面数据库，token 要一路带到真正产生副作用的出站网关，校验"Pod 绑定的是不是当前 token"。

**出处**：[[agent-session-control-plane]]

### Q24 · 解释

**问**：会话回收为什么要两个方向？对账删除要守哪几条？

**答**：会话层从状态库往外只能清有记录的，状态库没有记录的沙箱、删了记录但还在仓库里的快照镜像都会泄漏，所以要补一个从外往里的对账器。对账删除要保守：只认归属标签齐全的资源、安全期长于操作超时、删前按 ID 重读、旧 tag 只摘不删 manifest、先跑几天报告模式再开删除。

**出处**：[[reconciliation-loop]]

### Q55 · 场景

**问**：你改了 operator 读的平台登记（ConfigMap），给桌面加了 6080 端口，可 agent 的网络策略一直没变；另一边，上周手工 `kubectl set image` 换上去的门户镜像，今天完整部署后又回到了旧版。两件事各怎么解释？

**答**：第一件：调和循环只对它 watch 的对象生效，operator 只在启动时读这份登记，属于循环外的输入，所以要在登记内容变化时主动重启 operator，网络策略才会按新登记重新生成。第二件：完整部署本身就是一次调和，期望状态是 chart 里的版本号，手工换镜像只改了真实状态、没改期望状态，下一次部署就会被纠正回去；还要注意一个功能常常同时改了门户和入口规则两层。规则是改了源码就换新版本号、全量构建再部署，单独换镜像只当临时手段并当天补全量构建。

**出处**：[[reconciliation-loop]]（Claim「完整部署是一次调和」「不是所有输入都在调和范围里」）

## 第 7 站 · 治理：出站网关与凭据

### Q25 · 解释

**问**：出站网关为什么只认证书、不认请求头？凭据代理在哪一跳出现、看得到什么？

**答**：身份只从与 Pod 绑定的 mTLS 证书取，沙箱带来的认证头和身份头一律剥掉，授权请求体由网关填写，动作由命中的路由决定，而不是 agent 声称要做什么。凭据代理只被授权通过的请求调用、只看到 host 头看不到请求内容、每请求一次不缓存——凭据在最后一跳才出现。

**出处**：[[credential-out-of-sandbox]]

### Q26 · 解释

**问**：agent 网关、模型网关、出站网关的调用方和故障影响分别是什么？和 LiteLLM 这类 LLM proxy 怎么配合？

**答**：agent 网关面向渠道、其他 agent 和集群外系统，按 agent 名路由、代理 A2A 与 MCP；模型网关面向沙箱里的 harness，认出 Pod → 会话 → 应用、按请求体模型名授权，挂了只影响推理；出站网关面向 harness 和它生成的代码，授权后注入凭据，挂了所有外部动作都停。和 LLM proxy 按"会话身份在哪一跳能被认出来"分工：前一跳管谁能调，后一跳管选提供方、失败切换、统管密钥与按团队计量，两边不重复做协议转换和同层限流。两跳组合尚未实测。

**出处**：[[ai-gateway]]

### Q27 · 辨析

**问**："配了每分钟 400 token 的限流，一次请求就不可能超过这个额度。"对吗？

**答**：不对。按 token 限流在响应后结算，跨过阈值的那次请求照样放行，挡住的是下一次——它管平均速度，不是硬上限。要硬预算就把 max_tokens 纳入策略，或在请求进来时先做预算检查。

**出处**：[[ai-gateway]]

### Q28 · 场景

**问**：OpenSandbox 建沙箱时有一次忘了带出站策略，会发生什么？平台层怎么兜底？

**答**：不带出站策略就不加 egress 边车，沙箱完全不受限，连节点元数据地址 169.254.169.254 都可达，能取到节点 kubelet 身份的 token。请求级策略漏带一次就等于没有：沙箱命名空间要有一条封 169.254.0.0/16 的兜底 NetworkPolicy，或开 AKS 的 IMDS restriction；快照镜像也不要放在节点身份能拉的同一个注册表。

**出处**：[[credential-out-of-sandbox]]

### Q56 · 辨析

**问**：沙箱里的演示 agent 在 Identities 一栏显示 "Binding storage is unavailable"，所以"存储坏了"。对吗？

**答**：不对，这是"凭据不进沙箱"的默认落在产品上的样子。委托连接的凭据存在 agent 命名空间，由平台的 broker 读写；operator 只在 agent 不在沙箱里、或开启了沙箱委托连接集成时才给 broker 授权。内置管理员 agent 不在沙箱里所以正常，跑在 Kata 沙箱里的 agent 默认拿不到。要用委托连接就得显式打开那条集成（还需要额外的平台登记、租户管理员同意），否则写进已知限制并说明原因。

**出处**：[[credential-out-of-sandbox]]（Claim「沙箱里的 agent 默认连委托连接的存储都碰不到」）

## 第 8 站 · 治理：逐请求授权

### Q29 · 解释

**问**：agent 的有效权限为什么是三方交集？操作顺序有什么讲究？

**答**：有效权限 = 应用申请 ∧ 资源 owner 批准 ∧ 平台发布，三份声明由不同的人写，由控制器各自投影成关系元组，没有人直接写"有权限"。主体和对象用 UID 不用名字，动作是不透明字符串、没有通配。顺序必须先批准再申请，否则新会话整体建不了。

**出处**：[[relationship-based-access-control]]

### Q30 · 辨析

**问**："用 Kubernetes RBAC 就能做 agent 的资源授权。"对吗？

**答**：只能做粗粒度。RBAC 的主体只能是 ServiceAccount（区分会话就得每会话一个）、表达不了三方交集与审批、没有条件，也管不到不经 API server 的数据路径。策略引擎擅长条件组合但要推送三份数据、没有原生反查；关系型授权擅长归属、共享与多方关系，并原生支持"这个应用能做哪些动作"的反查。

**出处**：[[relationship-based-access-control]]、[[agent-runtime]]

### Q31 · 场景

**问**：为了降延迟，有人提议打开 OpenFGA 的查询缓存（TTL 10 秒）。你怎么评估？

**答**：默认是强一致，撤销后下一次 Check 就是 false；打开缓存就变成最终一致，实测撤销后 10.2 秒内仍返回 true。撤销常发生在发现 agent 在做不该做的事时，这几秒正是最不该放行的时间。授权路径上不开，或查询带 HIGHER_CONSISTENCY。而且关系判断本身只有亚毫秒到毫秒级，不是瓶颈。

**出处**：[[relationship-based-access-control]]

### Q32 · 解释

**问**：一次逐请求授权 p50 约 105 毫秒，时间花在哪？100 个并发时为什么出了 503 却一次 429 都没有？

**答**：OpenFGA 那一步只占约 2.5 毫秒，约 62 毫秒花在回查 Pod、ServiceAccount、会话与运行时状态。100 并发时决策点撞上单次检查 5 秒超时，网关按"授权失败即拒绝"返回 503，而本地限流没有触发。改法是把限流放在授权之前并明确返回 429，决策点多副本，对"证书 → Pod → 会话"的解析做短时缓存。

**出处**：[[agent-runtime]]

## 第 9 站 · 身份：agent 以谁的身份行事

### Q33 · 解释

**问**：下游看到的身份有哪三种？为什么每个资源要声明自己用哪一种？

**答**：平台身份（网关注入平台凭据，下游只知道"平台来调了"）、OBO（令牌里 oid 是用户、azp 是代办的控制面，下游按用户权限判断）、Agent ID（每个 agent 自己的 oid，可单独授权审计停用）。真实平台三种同时存在，很多内部系统只认服务账号、不支持 OBO，所以每个资源要声明用哪一种，不支持的退回平台身份 + 网关审计。

**出处**：[[entra-agent-id]]

### Q34 · 辨析

**问**："我的 API 校验了令牌的 aud，所以只有我授权过的应用能调。"对吗？

**答**：不对。Entra 会给租户里任何应用签发以你的 API 为 audience 的 app-only 令牌，未分配任何角色也照样签发。授权必须同时看 scp（委托）或 roles（应用）。agent 平台会让一个 API 的调用方一下子多出很多。

**出处**：[[entra-agent-id]]

### Q35 · 场景

**问**：一个 Durable 会话保留三天，用户第一天下午就离开了，agent 第二天还要以用户身份提交代码。控制面要怎么做？

**答**：OBO 换出的令牌不比用户令牌活得久，用户令牌过期后旧令牌不能再做 OBO，只能靠 OBO 时拿到的 refresh token 续。所以控制面要保存 refresh token（用户令牌本身留着没用）：加密存放、按会话隔离、会话删除时一起删；其有效期由租户策略决定。另一种默认更安全的做法是令牌过期后暂停需要用户身份的操作，等用户回来重新授权。

**出处**：[[entra-agent-id]]

### Q36 · 解释

**问**：沙箱里为什么一张令牌都没有？凭据代理怎么拿到该会话对下游的令牌？

**答**：令牌只在控制面与网关之间流转。会话 API 校验用户令牌、把 oid 记为会话 owner；控制面的令牌服务按需做 OBO 并保存加密的 refresh token；凭据代理在授权通过后沿"证书 → Pod → 会话 → owner"向令牌服务要这个会话对下游的令牌。harness 只把请求发给 provider 的 Service 名，认证全部由网关完成。

**出处**：[[credential-out-of-sandbox]]

## 第 10 站 · 定义与发现

### Q37 · 解释

**问**：agent 定义的 revision 固定什么、不固定什么？skills 包为什么要按 digest 拉？

**答**：revision 固定的是配置，名字取规范化 spec 的内容哈希、只能新建不能改；权限不固定，每次请求实时算（撤销约 1 秒生效）。新会话用最新 revision，在跑的会话保持原来的。skills 包用 OCI artifact 推进注册表，沙箱按 revision 里记的 digest 拉——按 tag 拉会让同一 revision 的两个会话拿到不同内容。

**出处**：[[agent-platform]]

### Q38 · 解释

**问**：发现分哪三层？卡片里应该放什么？

**答**：集群内直接查 CRD（RBAC 管可见性，适合平台运维）；跨框架用 A2A Agent Card（controller 从 CRD 生成、按 well-known 路径发布）；企业级同步到 agent 目录，让 Teams、Copilot 等找得到，要和 agent 身份一起做。卡片只放对外信息（名字、描述、skills、入口、认证方式、版本带 revision 哈希），只发布 Ready 的版本。

**出处**：[[agent-platform]]

### Q39 · 辨析

**问**："能在目录里看到这个 agent 的卡片，就说明我有权调用它。"对吗？

**答**：不对。卡片只写"怎么认证"，能不能调要过被调用方 owner 的审批；撤销批准后卡片照样可见、调用被拒。卡片的认证声明和调用授权要分开设计，不要因为"能看到"就默认"能调"。

**出处**：[[a2a-protocol]]

### Q40 · 场景

**问**：你用 agentgateway 做 agent 网关代理 A2A 调用，要注意哪两件事？

**答**：一是卡片地址可能只改写一半——A2A 1.x 的 supportedInterfaces 被改成网关地址，旧版顶层 url 仍是 agent 直连地址，读旧字段的调用方会绕过网关，所以卡片要从源头只写网关地址；二是客户端的 Authorization 头默认原样透传给后端 agent，外部令牌要在网关终结。

**出处**：[[ai-gateway]]

## 第 11 站 · 形态：常驻实例与会话调度

### Q41 · 解释

**问**：AKS 上自建 agent runtime 的两种形态，共同底线是什么，分歧在哪三处？

**答**：共同底线：harness 整个关进 Kata、不挂 ServiceAccount token；模型请求只走网关，沙箱里只有一把只能调模型的 key；访问企业资源的令牌不进 Pod。分歧：状态跟着谁走（常驻实例是一块 RWO HOME 盘，会话调度是一串快照加状态库）；出站默认开还是关（常驻公网默认放行加黑名单，会话调度默认拒绝、只剩出站网关）；记忆放在哪（常驻实例在盘上有私有记忆，会话调度会话一删什么都不剩）。

**出处**：[[resident-vs-session-agent-runtime]]

### Q42 · 场景

**问**：一个团队想给二十位值班和核心开发工程师每人配一个 agent，人下线后它继续推进，第二天接着看；另一个团队想让 Teams、定时任务和流水线触发 agent 去改工单、推代码。各选哪种形态，各要补什么？

**答**：前者是"跟着固定的人、状态跨天、人数有限、岗位价值高"，走常驻实例；要补备份方案（`Retain` 不等于备份）、出站外传审计、写操作收进网关、按人的预算硬上限。后者是多个调用方按次调用、执行者型写操作，走会话调度；要补会话控制面、对账器、快照仓库清理和审批点，出站必须默认拒绝加逐请求授权。

**出处**：[[resident-vs-session-agent-runtime]]

### Q43 · 辨析

**问**："常驻实例不用做 checkpoint，所以它是会话调度的简化升级版。"对吗？

**答**：不对。常驻实例省掉的快照、快照仓库清理和会话对账，是用别的代价换来的：算力按人常驻（主容器 4 vCPU 加桌面 0.5 vCPU，一百人就是 450 vCPU 的请求量），没有空闲自动休眠；单副本只支持源节点健康时的冷迁移，不做故障切换；namespace 被删时 PVC 跟着删。会话调度空闲不占 VM、能多副本、恢复时按当前权限重新下发出站白名单。两者各缺对方已有的那一块，选择的是状态的单位和控制点的位置。

**出处**：[[resident-vs-session-agent-runtime]]

### Q44 · 解释

**问**：常驻实现的私有记忆为什么要把"记忆不授予任何权限"写成硬规则？会话调度为什么没有这个问题？

**答**：记忆一旦能跨任务存在，就会有人想用它记"上次已经批准过"，下次直接跳过审批。所以规则写明：记忆里的结论哪怕是别的 agent 引用过来的，也永远不当作用户授权；会变的事实用前要通过当前有权限的工具重新核对；从失败中学习的方法候选要过固定检查才采用，agent 自评不算数，方法得分也不授予权限。会话调度里会话一删什么都不剩，不存在拿旧记忆跳审批的路径。

**出处**：[[agent-memory-lifecycle]]

### Q45 · 场景

**问**：一家企业有几百人想要"记得我"的 agent，但大部分人一天只用一会儿。你建议什么形态？中间要补哪两个接口？

**答**：混合形态：轻量常驻入口加会话执行池。常驻部分只负责"这个人是谁、以前定过什么、团队批准了哪些 skills"，不必一直占 4 vCPU；长任务、批量和事件触发的工作交给会话执行池，按会话领沙箱、checkpoint、受逐请求授权。要补的接口：执行池领任务时带上发起人身份和记忆的只读视图；任务结束时只回写结论，不回写原始输出。这是设计推论，混合形态目前没有实现。

**出处**：[[resident-vs-session-agent-runtime]]

## 第 12 站 · 运营：管控台、模型网关与追溯

### Q46 · 解释

**问**：常驻实现里 Portal 和 LiteLLM 两个控制台都能改 Teams、Keys、Budgets，以哪边为准？operator 往 LiteLLM 投影了什么？

**答**：以 Portal 写下的 CRD 为准，operator 单向投影、只写不读。Agent 变成一把 Virtual Key（模型 = 共享访问组 + 自己的路由，月度预算、并发、RPM、TPM）；Team 变成一个 LiteLLM team（模型列表留空，权限放在 key 上）；owner 变成 team 成员（不发 key）；Team 上的智能路由变成一个内部名注册的路由模型。共享模型本身来自 AI 网关的 Helm 配置，不归 CRD 管。

**出处**：[[ai-gateway]]

### Q47 · 场景

**问**：管理员在 LiteLLM 控制台里把某把 key 的 RPM 调大、改了一个 operator 注册的路由、又改了共享模型的一项设置。分别会怎样？那这个控制台该用来做什么？

**答**：RPM 下一次调和被 operator 按 Policy 改回；路由的修改 operator 不监听，要等 Team 有改动时才被覆盖回去，中间两边不一致；共享模型改任何一项会把整块设置写进数据库，此后 Helm 里对应的值悄悄失效，界面没有提示。控制台只用来看用量和花费、查 402 / 429、设 Team 总预算（CRD 里没有这一项）、给集群外的程序发 key。

**出处**：[[ai-gateway]]

### Q48 · 辨析

**问**："研发和销售规则完全一样，就让两个团队选同一个 Team，省得维护两份。"对吗？

**答**：不对。operator 按一个 Team 对应一个 LiteLLM team 投影，每把 key 只能挂在一个 team 下，两个团队的花费会混在同一个 LiteLLM team 里，在那里设的总预算也被两组共用。正确做法是一个团队一个 Team，共用的规则放进 Agent Policy 和 Sandbox，让两个 Team 引用同一份。

**出处**：[[ai-gateway]]

### Q49 · 解释

**问**：常驻实例的 Agent UI、Terminal、Desktop 三个入口各管什么？为什么 Terminal 是唯一正式的 shell 入口？

**答**：Agent UI 是 harness 自带的界面，用来对话、发任务、看工具调用；Terminal 是 ttyd 网页 shell，绕过 agent 直接看文件、跑命令、查出错原因；Desktop 是 noVNC 上的 Chrome，用来看 agent 操作浏览器，必要时替它过验证码或 MFA。准入策略拒绝对实例 Pod 的 `kubectl exec`，Kata Pod 的端口在虚拟机里、kubelet 找不到，`port-forward` 也不通，管理员也没有别的路进去。三个入口都先过 Entra、再过按路径的 owner 检查，只对 owner 开放；Terminal 是完整 shell、Desktop 的 Chrome 以 `--no-sandbox` 启动，隔离只靠 Kata 与 owner 检查。

**出处**：[[resident-vs-session-agent-runtime]]

### Q50 · 场景

**问**：安全团队问"这个 agent 昨晚推的那次代码，是哪个用户、哪一轮、哪段模型输出触发的"。在常驻实现上能回答吗？要补什么？两种形态还共同缺哪几块治理？

**答**：回答不了。五类日志（管理操作、agent 输出、模型调用、出站连接、平台组件）各管一段，分别按命名空间、key、命名空间加时间关联，没有共同的会话或轮次 ID；那个集群上实际只有模型调用一条线有数据（观测 chart 没装、Kata 节点上采集 Pod 一直重启、Agent Pod 没 sidecar、审计日志没开）。要补的是会话层每轮生成一个 ID，带进模型请求元数据和出站请求头，两个网关都记下来。两种形态共同缺的四块：出站逐请求授权、高风险动作审批、容量配额、跨日志追溯与 Portal 操作审计。

**出处**：[[agent-session-control-plane]]、[[agent-runtime]]

### Q57 · 场景

**问**：同一个功能先后报了三种错：访问 `/ai-gateway` 返回"你不是它的 owner"的 403；门户里嵌的控制台显示 refused to connect；桌面入口报 upstream connect error（connection timeout），而路由明明配好了。各该查哪里？

**答**：入口网关对所有路径做三道处理，agent 前还有一层网络策略，三种报错各对应一处。403：owner 检查把路径第一段当 agent 名，`/ai-gateway` 这类非 agent 路径要在这一步之前单独放行。refused to connect：安全响应头默认禁止嵌入，被 iframe 嵌入的路径要改成只允许同源。connection timeout 而路由存在：查 agent 命名空间里 operator 按平台登记生成的网络策略放行了哪些端口，漏了桌面的 6080 就是这个表现——策略漏配表现为超时，不是权限错误。

**出处**：[[agent-sandbox]]（Claim「入站方向也有三道处理加一层网络策略」）

### Q58 · 解释

**问**：把自建 runtime 交给同事在别的订阅里部署，配置值该怎么分类？交接前做哪几项检查？部署卡在 "has an unfinished operation" 怎么办？

**答**：按两个问题分三类：换订阅或集群不会变的（命名空间、约定的密钥名、协议固定 ID）留在代码里并写明不要改；会变但查不到的（订阅、区域、资源名、机型、版本、模型与单价、管理员名单、端口列表）进配置文件且只在一处定义；会变又查得到的（地址、网段、UID、组件版本）部署时从集群现查——手工建的平台登记几天后 Cilium 版本就过时了。交接前三项检查：变量来源逐个对上、把写死的值提成变量后与线上配置逐字段对比、公开前扫全部 git 历史。Helm 卡锁：`helm history` 找最后一个 deployed 版本、`helm rollback` 释放锁再重跑；来路有两种，一是自己把输出接到会提前退出的命令上打断了 helm，二是 operator 代管的升级被同一次部署里 operator 自己的滚动更新打断。

**出处**：[[agent-runtime]]（Claim「自建 runtime 交给别人部署时最先坏的是手工做过的事」「operator 代管的 Helm 升级会被自身滚动打断」）

## 第 13 站 · 汇合：自建 agent platform 还是用托管产品

### Q51 · 解释

**问**：Copilot Studio、Foundry（Prompt / Hosted）、Copilot Managed Runtime、Agent 365 各替你打包了哪几层？

**答**：Copilot Studio 三层全包，选 harness 就是选 runtime，建后不能互转；Foundry 的 Prompt Agent 全包，Hosted Agent 是"framework 自选、runtime 托管"，本身就是托管的 agent runtime；Copilot Managed Runtime 托管的是企业内部 SPA 应用而不是 agent，替你承担登录、分享与治理，后端只能经 Connector；Agent 365 只做狭义 platform，不运行 agent。

**出处**：[[agent-platform]]

### Q52 · 场景

**问**：客户说"我们想自己掌控 agent runtime"，你先问哪两个问题？

**答**：第一，会不会执行模型生成的代码，或需要跨轮次保留文件和进程的工作区？不会的话它就是普通服务，部署到 ACA / AKS、鉴权放服务端即可，不需要沙箱平台。第二，是否要求 runtime 自主可控且团队能运维 AKS？否则走托管路线；是的话再按需逐项叠加 Kata + 沙箱编排、kagent、持久执行等，用不到的不装。

**出处**：[[agent-runtime]]

### Q53 · 解释

**问**：在 AKS 上自建 agent runtime 只在哪三类场景下值得？推荐的混合布局是什么？

**答**：三类：① 直接跑现成编码 CLI——Hosted 要求容器实现 Responses 或 Invocations，这些 CLI 不说这些协议，要用就得自己包一层适配器；② 沙箱规格——Hosted 最大 2 vCPU / 4 GiB，大仓库构建与全量测试常不够，GPU 更不用说；③ 出站粒度——"某 agent 只能读某仓库不能推、撤销 1 秒多生效"这一级要自己搭。前提是团队愿意长期维护控制面，否则先想能否在 Hosted 那侧绕过去。布局按"loop 归谁"分：A 类（平台 loop）≈ Prompt、C 类（自带 loop 的镜像）≈ Hosted，放 Foundry；只把没有直接对应的 B 类（基于现成编码 harness）放 AKS，两边共用同一租户与 agent 身份。

**出处**：[[foundry-agent-type-selection]]

### Q54 · 辨析

**问**："开源组件已经很全了，用 agent-sandbox、agentgateway、OpenFGA、kagent 拼起来就是一个 agent platform。"对吗？

**答**：只对一半。隔离与沙箱编排开源和 AKS 覆盖得较好，但会话控制面与授权模型是最重的自研：Dapr、Service Bus、PostgreSQL、OpenFGA、SPIFFE、Entra 只是底座，Pod → 会话的映射、controller 的语义校验、"协议到会话 API"的适配、申请与审批流程都要自己写；参考实现里也还没有独立的 agent 网关和企业目录。

**出处**：[[agent-platform]]、[[agent-runtime]]
