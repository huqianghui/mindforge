---
title: "Agent Session Control Plane"
created: "2026-11-14"
updated: "2026-11-14"
tags:
  - wiki
  - concept
  - agent
  - agent-runtime
  - session
  - control-plane
  - harness
aliases:
  - "Agent 会话控制面"
  - "harness 的 harness"
  - "会话平面"
  - "agent runtime 会话层"
related:
  - "[[agent-infra-three-layers]]"
  - "[[agent-sandbox]]"
  - "[[durable-execution]]"
  - "[[reconciliation-loop]]"
  - "[[actor-snapshot-scheduling]]"
  - "[[credential-out-of-sandbox]]"
---

# Agent Session Control Plane（Agent 会话控制面）

## 摘要

Agent 会话控制面是 agent runtime 里位于沙箱之外、负责驱动 harness 的那一层平台代码：领沙箱、把 harness 放进去、按轮投递消息、收集输出、续接上下文、checkpoint、暂停、恢复、回收。它驱动 harness 的方式就像 harness 驱动模型和工具，所以也叫"harness 的 harness"。调用的单位是**会话**而不是一次 API 请求：会话 ID 稳定，背后的沙箱可以被暂停、替换、从快照重建。

这一层是 Kubernetes / AKS 完全没有提供的部分。把 runtime 按执行、会话、治理三个平面拆开时，执行平面有 Kata 与 agent-sandbox / OpenSandbox，治理平面有 Workload Identity、Cilium、agentgateway、OpenFGA，会话平面一格原语都没有，会话键、收件箱、状态机、checkpoint 编排、回收与对账、多副本都要自己写。它在 [[agent-infra-three-layers]] 中对应 Runtime 层的"持久执行"与"调度与生命周期"两个子层，横跨 [[agent-sandbox]]（执行）与 [[credential-out-of-sandbox]]（治理）。

## Claims

### Claim: 调用的单位是会话、结果是流式产出且先在沙箱外落库、回收归会话层而不是沙箱 TTL——这是 agent 调用与普通 API 调用的三处根本差别

- **来源**：[[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]]、[[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]
- **首次出现**：2026-11-09
- **最近更新**：2026-11-14
- **置信度**：0.8
- **状态**：active

> 一个编码 agent 从被 Teams @ 到被回收走十步，只有分配沙箱、放配置、启动 harness 三步在沙箱里。第一条消息建会话，之后同线程的每条消息是会话里的一轮；两天后追问时原 Pod 多半已不在，但会话还在，harness 凭原生会话文件接上下文。harness 每输出一段先在沙箱外持久化再推给渠道，渠道订阅输出流而不是阻塞等返回，沙箱中途挂掉已产出内容不丢。固定 TTL 会在长任务或 checkpoint 做到一半时删沙箱，合理做法是空闲超阈值先 checkpoint 再暂停、超保留期才删除，并另有按标签对账的兜底（见 [[reconciliation-loop]]）。运行时分四层：编排 / 会话层（平台，沙箱外）、harness（第三方、版本平台固定，沙箱内）、agent 逻辑（AGENTS.md / skills / 现场生成的代码，沙箱内）、治理（平台，沙箱外）；应用作者只写第三层。

### Claim: 一轮对话的四条规矩——创建会话带幂等键、消息落盘后才 ACK 且同会话一次一轮、每轮按当前声明重新授权、先写"新状态 + 副作用意图"再由 runner 执行

- **来源**：[[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]
- **首次出现**：2026-11-10
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> 渠道重试与网络抖动会让"创建会话"发两次，没有幂等键就多出没人认领的 VM。收件箱先写库成功才回 ACK，控制面挂了重启从库里接着处理，后续消息排队。权限不是建会话时拍快照，而是每轮开始前按应用当前声明与资源 owner 当前批准重算，中途撤销下一轮就被拒。每一步先把意图落盘，runner 重启后先做完上次没做完的副作用——这条规矩的故障语义见 [[durable-execution]]。参考实现日志实测：领预热沙箱约 1 秒、提交消息到 harness 首次调工具约 7 秒（含进程启动与首次模型调用）、工具本身 7 毫秒、整轮 16 秒——干活时间很少，大头在沙箱与 harness 准备，所以预热池与 harness 启动优化是这一层绕不开的事。

### Claim: 控制面靠每个 harness 一个适配器驱动多种编码 CLI——拼命令行、解析输出成统一事件流、记住原生会话 ID；弹出确认即判本轮失败

- **来源**：[[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]、[[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]]
- **首次出现**：2026-11-10
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> Claude Code、Codex、Copilot CLI、OpenCode、Pi 五种 CLI 的非交互免确认参数、输出格式、续接方式各不相同，适配器抹平差异。harness 一旦弹"要不要允许"就直接判失败——沙箱里没人点确认，这是免确认运行的另一面。原生会话 ID 不存控制面数据库，而是写进工作区小文件、与 harness 本地会话文件放一起随 checkpoint 走；新沙箱从快照恢复后先读它再决定新建还是续接。解析出的事件带稳定事件 ID 逐条入库，再经带游标的 SSE 推给渠道，断线从游标续读，渠道不需要知道背后是哪个 harness。harness 不只是"装个二进制"：版本由平台钉死并关自动更新、离线模式不连厂商服务、模型只走平台网关。多协议适配见 [[harness-portability-spectrum]]。

### Claim: 控制通道只有一个方向——只有控制面持有沙箱生命周期 API 身份，沙箱只产出数据；需要另一个隔离环境只能走 agent 调 agent，由控制面代分配、只允许一跳、子会话不继承父权限

- **来源**：[[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]、[[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]]、[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]
- **首次出现**：2026-11-09
- **最近更新**：2026-11-14
- **置信度**：0.7
- **状态**：active

> 平台和 harness 之间唯一的接口是沙箱里的执行守护进程（执行命令、读写文件）。沙箱没有 ServiceAccount token、连不上 Kubernetes API、出站只走网关，harness 被劫持也没法让控制面替它做事。harness 内部的 subagent（Claude Code Task、Codex 子任务）都是同一 VM 里的进程。agent 调 agent 的约束：目标 owner 按源应用与动作逐项批准、每次请求核对源 Pod / 会话 / 应用、子会话归属源会话（知道 ID 不等于有权访问）、子沙箱权限只按目标应用自己的声明与批准计算、不共享文件系统。参考实现自列缺口：子会话无配额限流、幂等键只防重试不防刷、撤销委托后已打开的更新流还能持续几分钟。来自对一个参考实现的阅读与部署。

### Claim: 自己写一个最小控制面只需四块——会话 API、状态库、runner、一个 harness 适配器；难的是贯穿所有组件的"先落盘再执行、重启能接着做、结果不确定不盲目重放"

- **来源**：[[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]
- **首次出现**：2026-11-10
- **最近更新**：2026-11-14
- **置信度**：0.7
- **状态**：active

> 会话 API：建会话（带幂等键）、投递消息、按游标推事件流。状态库：会话、收件箱、事件、副作用意图、会话与沙箱绑定；单副本 SQLite 够，多副本换 PostgreSQL 加 lease。runner：领沙箱、放文件、跑一轮、快照、暂停、删除，重启续做。适配器先只支持一种 harness。沙箱后端不自己写（agent-sandbox / OpenSandbox 已有领取、执行、文件、快照 API），应用定义可先用一个 YAML 写死。对账器、授权回调、渠道适配、子会话与配额等前面稳定后再补。

### Claim: 会话分 Ephemeral 与 Durable 两种——Ephemeral 靠沙箱 TTL 兜底防泄漏但到期后静默换空白沙箱；Durable 每轮 checkpoint、空闲暂停、保留期到才删，空闲阈值不宜短于几分钟

- **来源**：[[AKS-Agent-Runtime系列05：会话生命周期与回收]]
- **首次出现**：2026-11-12
- **最近更新**：2026-11-14
- **置信度**：0.8
- **状态**：active

> Ephemeral：一个沙箱用到底，OpenSandbox 侧 30 分钟 TTL，只在一轮执行中且离过期不到 10 分钟才续期。实测 TTL 到点即删；之后再发消息不报错——控制面连旧沙箱失败，1.2 秒从预热池换新沙箱把这一轮发过去，但文件与上下文全没了，用户侧没有任何"上下文已丢失"提示，渠道层不提示就像 agent 失忆。好处是控制面整个没了也不泄漏，适合一次性代码审查、批处理。Durable：每轮结束 checkpoint、空闲超 `pauseAfterIdle` 暂停拆 Pod、来消息恢复、最后活动后保留 `retention` 才清理，沙箱本身不设 TTL。每次恢复用户多等约 10 秒，阈值压得太短省下的 VM 时间换来频繁等待；交互式编码助手用 Durable 且阈值不短于几分钟。快照机制与耗时见 [[actor-snapshot-scheduling]]。

### Claim: 多副本控制面要分开管两件事——谁收消息交给会话队列，谁能写结果交给数据库 lease + fencing token；队列挡不住卡住又醒来的旧主接着写

- **来源**：[[AKS-Agent-Runtime系列06：会话管理与高可用]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.8
- **状态**：active

> 参考实现单副本 + SQLite、Deployment 用 `Recreate`，因为没有分布式 lease，启动"围栏"会把库里所有做到一半的事标成中断——只在确定自己是唯一主时才安全。三副本验证：Service Bus 会话队列按 session_id 同一时刻只交给一个接收者且按序（会话锁 30 秒、处理中续锁）；拿到锁后再抢 PostgreSQL lease（10 秒、每秒续），每抢到一次 token 加一；写结果是唯一带条件的一步（token 与序号都对才更新），写成功才确认消息，顺序反过来崩在中间会丢一轮。接管时长由故障类型决定：优雅退出 0.1 秒、进程被杀约 15 秒（会话锁 4 秒就放，等 lease）、进程卡住 32~35 秒（连接还在，等会话锁超时）；会话锁超时比 lease 短时新主还得再等 lease。混沌测试 12 会话 × 6 轮、随机硬杀 3 次，72 轮无丢失无重复无乱序（`--grace-period=0 --force` 下 kubelet 仍先发 SIGTERM，前两次其实是优雅退出）。落到真实控制面：会话表加 owner / token / lease_until，入口消息统一走会话队列，启动围栏改为只接管 lease 已过期的会话，terminationGracePeriod 按 harness 单轮时长设。

### Claim: 拿到会话锁却发现 lease 被占时不能 abandon——每次 abandon 消耗投递次数，lease 过期前消息就进死信、会话卡死；写入被拒要按原因分流

- **来源**：[[AKS-Agent-Runtime系列06：会话管理与高可用]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.8
- **状态**：active

> 第一版"lease 被占就 abandon、过会儿再来"：硬杀后 Service Bus 4 秒放出会话锁，但 lease 还要 10 秒过期，三个副本轮流拿锁、abandon，第 1、2 轮耗光 10 次投递进了死信；第 3 轮被序号检查拒绝（没有乱序写入，但会话卡死）。修法：拿到会话锁就说明队列已确认只有自己在处理，lease 被占只能是旧主死了或卡住，守住锁边续边等旧 lease 过期再接手——改后 15 秒接管、三轮全落地。写入被拒时：token 被抢说明自己是旧主，放手不确认交给新主；序号接不上送死信并写明原因，不能悄悄确认。踩坑实测。

### Claim: fencing 挡住的是写入、挡不住执行——token 要一路带到真正产生副作用的出站网关，校验"Pod 绑定的是不是当前 token"

- **来源**：[[AKS-Agent-Runtime系列06：会话管理与高可用]]、[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]
- **首次出现**：2026-11-13
- **最近更新**：2026-11-14
- **置信度**：0.75
- **状态**：active

> fencing token：lease 每被抢一次递增，写结果时带条件校验，旧主醒来后写入被拒。实测让持有者在主线程阻塞 45 秒（PID 1 收不到 SIGSTOP，改用 SIGUSR1）：新主 30 多秒后以 token=2 重做第一轮，旧主解冻后接着执行，两边同时跑第一轮重叠 11 秒多。fencing 开：旧主带 token=1 写入被拒，三轮各写一次；fencing 关：旧主在新主开始第二轮后又写一次第一轮，重复且乱序，随后确认消息才收到 `SessionLockLostError`——队列知道它丢了锁，但副作用已发生。真实 agent 的副作用（推代码、建 PR、回 Teams、调内部 API）几乎不经过控制面数据库，若沙箱里直接 `git push` 两边都会推。统一校验点只能是出站网关与授权决策点（见 [[credential-out-of-sandbox]]）：本来就核对"Pod 是否绑定在准备好的会话上"，再加一条"绑定是不是当前 token"；换主后沙箱重新绑定，旧主驱动的执行流在网关被拒。网关校验部分是设计推论，未实现。`fencing-token` 作为原子概念暂不单独建页（HOLD）。

## 冲突与演进

- 2026-11-14：建页。候选 `agent-runtime-session-plane` 自 2026-11-09 harvest 提出，阈值"系列 05 成文"于 11-12 满足，11-13 系列 06 补齐多副本；用户裁决建页，slug 定为 `agent-session-control-plane`。同批次 `durable-execution`、`reconciliation-loop`、`actor-snapshot-scheduling`、`credential-out-of-sandbox` 四个 HOLD 解除并各自建页，本页只保留会话层自身的论断，故障语义、回收、快照、出站凭据分别归口。
- `fencing-token`、`agent-runtime-three-planes` 未单独建页（HOLD），前者作本页 Claim，后者作 [[agent-infra-three-layers]] Claim。
- 来源全部是同一系列对一个参考实现的阅读、部署与补充实验，单环境测量，数字（16 秒整轮、15/33 秒接管）只在该环境成立。

## 关联概念

- [[agent-infra-three-layers]] — `part-of` Runtime 层持久执行与调度生命周期两个子层的具体形态（会话平面）
- [[agent-sandbox]] — `uses` 执行平面由沙箱提供，控制面是唯一持有其生命周期 API 身份的调用方
- [[durable-execution]] — `uses` "先写意图再执行、结果不确定不重放"是控制面的贯穿规矩
- [[reconciliation-loop]] — `uses` 会话层从状态库往外回收，另需从外往里的对账器兜底
- [[actor-snapshot-scheduling]] — `uses` Durable 会话靠快照换出执行单元，会话 ID 不随 Pod 走
- [[credential-out-of-sandbox]] — `uses` 治理平面的出站网关是 fencing token 唯一能统一校验的位置
- [[harness-portability-spectrum]] — `uses` 一个控制面经适配器托管多种 harness，正是 harness 与 runtime 不绑死的实例
- [[meta-harness]] — `contrasts` 同称"harness 之外的一层"，meta-harness 是优化 harness 的离线外层搜索，本页是运行时驱动 harness 的平台层

## 来源日记

- [[2026-11-09-周一]] — AKS Agent Runtime 系列 01 成文
- [[2026-11-10-周二]] — 系列 02、03 成文，参考实现 PoC 部署
- [[2026-11-12-周四]] — 系列 05 会话生命周期 PoC + 成文
- [[2026-11-13-周五]] — 系列 06~10 成文，06 三副本高可用实测
- [[AKS-Agent-Runtime系列01：Sandbox之外的三个平面]] — 十步调用、三个平面、AKS 缺的会话层
- [[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]] — 四层归属、一轮八步、适配器、单向控制通道、最小控制面
- [[AKS-Agent-Runtime系列05：会话生命周期与回收]] — Ephemeral / Durable 两种会话
- [[AKS-Agent-Runtime系列06：会话管理与高可用]] — 会话队列 + lease / fencing、接管时长、abandon 坑
