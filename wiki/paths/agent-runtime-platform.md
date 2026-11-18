---
title: "学习路径：Agent Runtime 与 Agent Platform"
created: "2026-11-16"
updated: "2026-11-18"
tags:
  - wiki
  - path
  - agent-runtime
  - agent-platform
  - aks
path_id: "agent-runtime-platform"
audience: "自己 + CSA 团队"
gap_topics:
  - agent-runtime
  - agent-authorization
  - mcp
  - model-harness-decoupling
signals:
  - "kubernetes-sigs/agent-sandbox 与 OpenSandbox 的 release"
  - "Agent Substrate、kagent 的 release 与 GKE 文档"
  - "agentgateway、OpenFGA 的 release"
  - "AKS release notes（Pod Sandboxing、IMDS restriction）"
  - "Foundry Hosted Agents What's new 与 Entra Agent ID / Agent 365 文档"
  - "LiteLLM release notes（Virtual Keys、预算、A2A Agent Gateway、Rust 核心）"
  - "Hermes Agent、OpenClaw 的 release（常驻 harness 的原生界面与会话管理）"
  - "A2A 规范与 MCP 规范的版本变化"
---

# 学习路径：Agent Runtime 与 Agent Platform

这条路径把 AKS Agent Runtime 系列和 Agent 基础设施系列沉淀下来的知识排成一个顺序。先用一张总图分清 framework、harness、runtime、platform 四个概念，再沿 runtime 的三个平面（执行、会话、治理）一站一站往里走；然后比较 AKS 上自建 runtime 的两种形态（常驻实例与会话调度），看常驻形态装好之后的运营与追溯；最后回到"agent platform 是自己搭还是用托管产品"。会话、模型接入、A2A、沙箱、逐请求授权这些新概念几乎都出在 runtime 这一层，所以这条路径的大部分站点都在 runtime 里。

**怎么用**：按站点顺序读，每站读完对照「算会」逐条自查，都能说出来、判断出来才进下一站。「算会」也是题库的出题来源。读 wiki 页时以 Claim 为单位，括号里点名的 Claim 优先读；想看实测过程再读原文。

**前置**：读过 [[harness-agent-architecture]] 的前 3 站（agent loop、context、harness）会顺很多，但不是硬性要求。

**预计总用时**：约 19~23 小时（读 wiki 页 + 关键原文，不含动手实验）。

## 第 1 站 · 总图：四个概念与三层

- **读**：[[agent-infra-three-layers]]（三条跨层 Claim：托管产品各在哪一层、锁定矩阵、层间接口）、[[agent-framework]]（「逻辑 vs 设施」一条）、[[agent-harness]]（「framework 是 dev-time、harness 是 run-time」「harness 面向 model、runtime 面向 infra」「harness 不单列一层」）、[[agent-runtime]] 与 [[agent-platform]] 的摘要
- **前置**：无
- **用时**：约 1.5 小时
- **算会**：
  - 能用三个问题区分 framework、runtime、platform，并说出 harness 为什么不单列一层
  - 能用"换一个 runtime 还在不在"判断一个能力归 framework 还是 runtime，用"换模型要不要重调"判断归 harness 还是 runtime
  - 能说出 agent platform 的广义与狭义两种用法，并举出 Copilot Studio、Foundry、Agent 365 各属哪一种
  - 能说出三层之间靠哪几样接口才换得动（镜像、协议、外置状态；身份、网关、trace）

## 第 2 站 · Harness 怎么被托管

- **读**：[[agent-harness]]（「harness 按归谁、能不能改分三类」「Copilot Studio 把 harness 与 runtime 打包出售」「强模型、弱规则」）、[[agent-sandbox]]（「多租户平台上 harness 自身也当不可信」）、[[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]]
- **前置**：第 1 站
- **用时**：约 1.5 小时
- **算会**：
  - 能说出 harness 的三类归属（代码框架自己搭、现成 harness、平台托管 harness），以及判断 harness 与 runtime 是否绑死的那一条标准
  - 能解释为什么编码 harness 要整个关进 Kata 沙箱、免确认运行，而自写的受信 loop 可以放在沙箱外
  - 能说出"loop 在外、沙箱当工具"不自动更安全的原因（confused deputy）
  - 能说出 Claude Code 里唯一能强制执行的机制是什么，以及这对平台设计的含义

## 第 3 站 · 执行：隔离与沙箱编排

- **读**：[[agent-sandbox]]（「执行平面里再分三层」「Kata 节点池是另一种节点镜像」「容量与调试的算法」「池化沙箱不套用服务端的隔离运行时配置」「agent-sandbox 的默认值与领取代价」「沙箱底线要逐条验证并配对照组」）、[[AKS-Agent-Runtime系列01补充：Kata运行时与节点池]]、[[AKS-Agent-Runtime系列03补充：沙箱后端agent-sandbox与OpenSandbox]]
- **前置**：第 2 站
- **用时**：约 2 小时
- **算会**：
  - 能说出执行平面的三层（隔离、编排、访问），以及 agent-sandbox 与 OpenSandbox 各在哪几层、三种组合用法
  - 能解释 Kata 换的是哪一段，为什么 Kata Pod 上不了普通节点、普通 Pod 却能上没打污点的 Kata 节点
  - 能按 limit + overhead 估一个 Kata 节点放得下多少沙箱，并说出不写 resources 的风险
  - 能说出两处"静默失效"：Pool 模板漏写 runtimeClassName 跑成 runc、CNI 不支持时 NetworkPolicy 被忽略

## 第 4 站 · 执行：暂停、快照与恢复

- **读**：[[agent-runtime]]（「同叫暂停，三种后端留下的东西不同」）、[[actor-snapshot-scheduling]]（四条 Claim）、[[agent-sandbox]]（「暂停语义两种」）、[[AKS-Agent-Runtime系列05：会话生命周期与回收]]；对照看 [[resident-vs-session-agent-runtime]]（「两种形态的根本分歧是状态跟着谁走」）里常驻实例的第四种暂停：缩到 0、留盘、不做快照
- **前置**：第 3 站
- **用时**：约 1.5 小时
- **算会**：
  - 能说出 Substrate、OpenSandbox + BatchSandbox、agent-sandbox Suspended 三种暂停各自留下什么、丢掉什么
  - 能解释 actor 与执行单元分离为什么能把要准备的 worker 数从"会话总数"降到"同时在忙的数"
  - 能说出快照耗时为什么决定空闲阈值的下限，以及阈值太短的代价
  - 能说出凭据、身份、出站白名单为什么要在恢复时从沙箱外重新取，有状态连接谁来重建

## 第 5 站 · 会话：控制面

- **读**：[[agent-session-control-plane]]（「调用的单位是会话」「一轮对话的四条规矩」「适配器驱动多种编码 CLI」「控制通道只有一个方向」「provider 接口」「最小控制面四块」「Ephemeral 与 Durable」「会话的数据模型」「会话这一层没有任何现成组件提供」）、[[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]]
- **前置**：第 2 站
- **用时**：约 2 小时
- **算会**：
  - 能说出 agent 调用和普通 API 调用的三处根本差别
  - 能复述一轮对话的四条规矩，并说出每一条防的是什么故障
  - 能解释原生会话 ID 为什么存在工作区而不是控制面数据库
  - 能说出自己写最小控制面的四块，以及选 agent-sandbox 还是 OpenSandbox 作后端时要多补什么

## 第 6 站 · 会话：持久执行、高可用与回收

- **读**：[[durable-execution]]（四条）、[[agent-session-control-plane]]（「多副本控制面要分开管两件事」「拿到会话锁却发现 lease 被占时不能 abandon」「fencing 挡住的是写入、挡不住执行」）、[[reconciliation-loop]]（「回收要两个方向」「对账删除要刻意保守」「快照仓库」）、[[AKS-Agent-Runtime系列06：会话管理与高可用]]
- **前置**：第 5 站
- **用时**：约 2 小时
- **算会**：
  - 能说出队列与 lease + fencing token 各管什么，以及为什么队列挡不住卡住又醒来的旧主
  - 能解释"结果不确定时按副作用分流"：执行中被杀与 checkpoint 中被杀为什么处理不同
  - 能说出 fencing 挡不住执行的原因，以及 token 应该带到哪里
  - 能说出回收为什么要两个方向，以及对账删除的几条保守规则

## 第 7 站 · 治理：出站网关与凭据

- **读**：[[credential-out-of-sandbox]]（全部六条）、[[ai-gateway]]（「按调用方分三种角色」「和 LLM proxy 的配合」「token 限流在响应后结算」「MCP 聚合有两面」）、[[agent-runtime]]（「Kubernetes 原生机制守底线、L7 组件做判断」）、[[model-context-protocol]]（「在 agent runtime 里 MCP 有三个落点」）、[[AKS-Agent-Runtime系列04：出站治理与逐请求授权]]、[[AKS-Agent-Runtime系列08补充：agentgateway的定位与三种角色]]
- **前置**：第 3 站
- **用时**：约 2 小时
- **算会**：
  - 能说出网关为什么只认证书不认请求头，以及凭据代理在哪一跳出现、看得到什么
  - 能说出 agent 网关、模型网关、出站网关三种角色的调用方和故障影响，以及它们和 LiteLLM 这类 LLM proxy 怎么分工
  - 能解释 token 限流为什么挡不住跨阈值的那一次，硬预算要怎么做
  - 能说出 RBAC、NetworkPolicy 能守住哪些底线、管不到哪些判断，以及出站策略为什么要有命名空间级兜底

## 第 8 站 · 治理：逐请求授权

- **读**：[[relationship-based-access-control]]（六条）、[[agent-runtime]]（「逐请求授权是突发流量下最先撑不住的一环」）、[[AKS-Agent-Runtime系列04补充：OpenFGA与关系型授权]]
- **前置**：第 7 站
- **用时**：约 1.5 小时
- **算会**：
  - 能写出三方交集的授权模型，并说出为什么要先批准再申请
  - 能说出 RBAC、策略引擎、关系型授权各擅长什么
  - 能解释打开查询缓存后撤销为什么要等一个 TTL，授权路径上怎么避免
  - 能说出整次授权的时间花在哪里，以及突发流量下应该把限流放在授权之前

## 第 9 站 · 身份：agent 以谁的身份行事

- **读**：[[entra-agent-id]]（「下游看到的身份有三种」「Entra 会给任何应用签发 app-only 令牌」「OBO 换出的令牌不比用户令牌活得久」「Agent ID 两步换令牌在 AKS 上跑通」）、[[credential-out-of-sandbox]]（「令牌只在控制面与网关之间流转」）、[[AKS-Agent-Runtime系列09：Agent以谁的身份行事]]
- **前置**：第 7 站
- **用时**：约 1.5 小时
- **⚠️ stale**：[[entra-agent-id]] 12 条里 1 条 stale（portal 创建时序的实测偏差），本站点名的几条均为 active
- **算会**：
  - 能说出平台身份、OBO、Agent ID 三种下游身份的区别，以及每个资源为什么要声明自己用哪一种
  - 能解释只校验 aud 的 API 为什么谁都能调
  - 能说出 Durable 会话里用户离开后还要以用户身份做事时，控制面必须保存什么、怎么保存
  - 能说出令牌在"证书 → Pod → 会话 → owner"链上怎么取，沙箱里为什么一张令牌都没有

## 第 10 站 · 定义与发现

- **读**：[[agent-platform]]（「agent 定义按不可变 revision 管」「发现分三层、授权另走一条路」「注册中心以谁为准二选一」「agent 资产的分发走 OCI 供应链」）、[[a2a-protocol]]（「能被发现不等于能被调用」「A2A 1.x 卡片入口改成 supportedInterfaces」）、[[ai-gateway]]（「A2A 代理改写卡片地址可能只改一半」）、[[agent-protocol-stack]]（三条）、[[AKS-Agent-Runtime系列07：Agent的类型、注册与发现]]
- **前置**：第 5、8 站
- **用时**：约 1.5 小时
- **算会**：
  - 能说出 revision 固定的是什么、不固定什么，以及 skills 包为什么要按 digest 拉
  - 能说出发现的三层，以及卡片的认证声明和调用授权为什么要分开设计
  - 能说出以 Kubernetes API 为准和以 Nacos 为准两种注册中心各适合什么，选后者要多写什么
  - 能说出用作 agent 网关时，卡片地址与外部令牌各要怎么处理

## 第 11 站 · 形态：常驻实例与会话调度

- **读**：[[resident-vs-session-agent-runtime]]（全页：三个选项、三问决策、五条 Claim；「深入对比的指导」与「客户机会识别」两节）、[[agent-memory-lifecycle]]（「记忆不授予任何权限」）、[[ai-gateway]]（「按 Agent 的月度美元预算同样是软上限」）、[[AKS-Agent-Runtime系列12：常驻实例与会话调度]]
- **前置**：第 4、6、7 站
- **用时**：约 1.5 小时
- **算会**：
  - 能说出两种形态共用的三条底线，以及分歧所在的三处（状态跟着谁、出站默认、记忆放在哪）
  - 能按三个问题（agent 跟着谁 → 状态要活多久 → 算力能否按人常驻）给一个场景选形态，并说出两条不随形态变的判断
  - 能说出常驻实例省掉了什么（checkpoint、快照仓库、对账）、付出了什么（按人常驻的算力、单副本只有冷迁移、`Retain` 不等于备份）
  - 能解释"记忆不授予权限"为什么在常驻形态必须写成硬规则、在会话调度里不是问题，以及混合形态中间要补的两个接口

## 第 12 站 · 运营：管控台、模型网关与追溯

- **读**：[[ai-gateway]]（「LLM proxy 的配置要以 runtime 的 CRD 为唯一来源」「LiteLLM 的 Agents 是 A2A 注册表加调用代理」「网关自身开销在往 Rust 核心迁」）、[[agent-session-control-plane]]（「要让每个副作用追溯到哪一轮」）、[[agent-runtime]]（「常驻实现在能装什么、能花多少上做得扎实」）、[[resident-vs-session-agent-runtime]]（「常驻实例的入口分三层」「管理员也作为一个 agent 运行」）、[[AKS-Agent-Runtime系列13：Runtime管控台与LiteLLM的分工]]
- **前置**：第 11 站
- **用时**：约 1.5 小时
- **算会**：
  - 能说出 operator 往 LiteLLM 投影了哪四类对象，以及在 LiteLLM 控制台里改 key 限额、路由、共享模型分别会发生什么
  - 能说出 LiteLLM 控制台里唯一合理改的配置是什么、为什么一个团队要一个 Team
  - 能说出 Agent UI、Terminal、Desktop 三个入口各管什么，以及为什么 Terminal 是唯一正式的 shell 入口
  - 能说出五类日志各落在哪、为什么串不起来，以及按轮次追溯要补什么；能列出两种形态都缺的四块治理

## 第 13 站 · 汇合：自建 agent platform 还是用托管产品

- **读**：[[agent-platform]]（「微软的三种托管 agent platform 打包的层数不同」「在 AKS 上自建 agent platform」「狭义 platform 与 runtime 的治理各有一份」）、[[agent-runtime]]（「先问两个问题」「自建多承担的是运维」「Runtime 内部再按三个平面拆」）、[[foundry-agent-service]]（「Hosted Agents 已包了最费劲的几块」）、[[foundry-agent-type-selection]]（「按 loop 归谁分三类 agent」「在 AKS 上自建的理由只剩三类」）、[[copilot-studio]]、[[copilot-managed-runtime]]、[[resident-vs-session-agent-runtime]]（「决策结论」与「客户机会识别」第 5 类）、[[AKS-Agent-Runtime系列10：为什么在AKS上自建]]、[[AKS-Agent-Runtime系列00：导读]]
- **前置**：第 1~12 站
- **用时**：约 2 小时
- **算会**：
  - 能说出 Copilot Studio、Foundry（Prompt / Hosted）、Copilot Managed Runtime、Agent 365 各替你打包了哪几层
  - 能说出决定要不要沙箱平台的两个问题，以及自建 runtime 时每一项托管能力对应的开源组件和要多承担的运维
  - 能说出自建只在哪三类场景下值得，以及 A、C 类放 Foundry、只把 B 类放 AKS 的混合布局
  - 能指出自建 agent platform 里开源组件替不了、必须自己写的几块
  - 能把"托管还是自建"和"自建后选哪种形态"串成一条完整的判断顺序

## 前沿站 · 正在发生的变化

这一站放刚发生、还没完全进 wiki 的变化。「算会」统一是：**能说出它改变了上面哪一站的哪条结论**。

- **Agent runtime 开始标准化**（知识差距 2026-11-16，高优先级）：Agent Substrate 1.0 在 GKE 上 GA、捐给 CNCF，kagent 1.0 改建在它上面 → 影响第 4 站（Substrate 不再只能做 PoC，但挂起会断开所有连接）、第 13 站（kagent 作为自建组件的形态变了）
- **Agent 委托与越权成为独立方向**（知识差距 2026-11-16，高优先级）：A2A 多跳委托中的身份丢失、逐跳收窄权限、agent 在允许动作内越权 → 影响第 8、9、10 站（三方交集管资源动作，管不到"允许的动作里做了用户没授权的事"；"只允许一跳"的理由需要补）
- **MCP 与协议栈已建页**（2026-11-16 补建 [[model-context-protocol]]、[[agent-protocol-stack]]）→ 影响第 7、10 站：MCP 的三个 runtime 落点与"四个协议都只管连接不管授权"已有归口
- **Harness 评测转向模型与 harness 的配对**（知识差距 2026-11-16）→ 影响第 2 站：选 harness 没有脱离模型的答案
- **两种 runtime 形态在趋同**（系列 12 路线图对照，2026-11-18 建决策页）：常驻实现路线图上的 Run / Session 层与共享 agent 池 → 影响第 11 站（混合形态的两个接口若由常驻侧补齐，三问决策的第 3 问会变成"常驻入口能压到多轻"）
- **网关热路径迁 Rust**（LiteLLM 官方基准约 7.5ms → 0.05ms）→ 影响第 12 站：网关自身 CPU 成本下降，但授权决策点仍是延迟大头（第 8 站）

## 毕业标准

不看资料，面对"要在 AKS 上把编码 agent 做成团队共享的平台"这样一个场景，15 分钟内画出三个平面、每层用哪个组件、哪几块要自己写，说清选常驻实例、会话调度还是混合形态的理由，并说出最可能先出事的三个地方及其依据；说不出依据的那一块，回到对应站点。

## 这条路径暴露的缺口

- **概念页缺失**：MCP 与协议栈已于 2026-11-16 补建；多跳 A2A 委托中的授权传递还没有归口
- **方法页缺失**：最小控制面、自建 agent platform 的组件组合，目前都以 Claim 形式散在 [[agent-session-control-plane]] 与 [[agent-platform]] 里，适合整理成方法页
- **决策页的待验证项**：[[resident-vs-session-agent-runtime]] 是"部分验证"——常驻实例只做了渲染与部署核对，没有负载与故障实验；成本盈亏点、HOME 盘故障释放、轮次 ID 端到端追溯都还没测；客户场景识别信号未经真实场景验证
- **证据不足**：agent 网关与企业目录在系列里都没有实践；Substrate 在 AKS 上未实测；模型网关 + LLM proxy 两跳未实测；Nacos 双向同步未实测（见 2026-11-16 知识差距报告的实验清单）
- **stale**：本路径涉及的页 stale 很少（[[agent-harness]] 1 条、[[entra-agent-id]] 1 条），不需要先跑 `/revalidate`
