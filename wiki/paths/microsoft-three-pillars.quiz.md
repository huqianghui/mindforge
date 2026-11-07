---
title: "题库：微软 AI 三支柱"
created: "2026-11-07"
updated: "2026-11-07"
tags:
  - wiki
  - path
  - quiz
path_id: "microsoft-three-pillars"
---

# 题库：微软 AI 三支柱

配合 [[microsoft-three-pillars]] 使用，按站点分组。题型三种：**场景**（给一个客户情境，说出你会怎么判断）、**辨析**（一句常见说法，判断对错并说出为什么）、**解释**（用自己的话讲清一个机制）。答案是参考要点，说出主要意思即可，不必逐字。

## 第 1 站 · 全景：三个支柱怎么分工

### Q1 · 辨析

**问**：客户问"我们该用 Copilot Studio 还是 Foundry？"——这个问题本身有什么问题？

**答**：两者不在同一层：Copilot Studio 是 Power Platform 上的 SaaS 构建产品，Foundry Agent Service 是 Azure 上的 PaaS agent 运行时。真实的问题是"每一层用谁"——入口、大脑、语音、治理各自选，常常是组合而不是二选一。

**出处**：[[Foundry-Agent与Copilot-Studio的选型]]

### Q2 · 解释

**问**：三个支柱各自面向谁、按什么计费、治理建在什么地基上？

**答**：GitHub Copilot 面向开发者，按席位加 AI credits，底座是 GitHub Enterprise 的策略与度量；Copilot Studio 面向业务制作者和 fusion team，按 Copilot Credits，地基是 Power Platform 的环境、Dataverse、Connector、DLP；Foundry 面向专业开发者，按 Azure 用量计费，地基是 Azure 订阅、RBAC、私网。

**出处**：[[azure-copilot-ecosystem]]（Claim「微软 AI 技术栈有三个支柱」）

### Q3 · 解释

**问**：把三个支柱连起来的是哪两样东西？

**答**：一是同一套 Copilot harness——GitHub Copilot 的 agent loop、Copilot Studio 新建 agent 默认的 GitHub Copilot harness、Foundry 的 `microsoft_copilot_preview` 托管 harness；二是治理面的 Entra Agent ID 与 Agent 365。

**出处**：[[azure-copilot-ecosystem]]

### Q4 · 场景

**问**：一家大企业里，IT 用 Copilot Studio 做员工助手，产品线用 Foundry 做客户侧 agent，客服团队用 Voice Live 做数字人前端。CIO 想"统一到一个平台"，你怎么回应？

**答**：三者同时存在、分属不同团队是常态，统一平台不是重点；重点是接缝处走官方支持的路（比如 Voice Live 的 agent 绑定只认 Prompt Agent、Copilot Studio 调 Foundry agent 走 connected agent），以及治理汇合到 Entra Agent ID 和 Agent 365。

**出处**：[[Foundry-Agent与Copilot-Studio的选型]]（「面向的客户人群」一节）

### Q5 · 辨析

**问**："Voice Live 是第三个 agent 平台，和 Copilot Studio、Foundry 竞争。"对吗？

**答**：不对。Voice Live 是语音层，负责"听"和"说"（semantic VAD、降噪、数字人），"想"可以交给 Foundry agent 或只挂一个模型。它和另外两者是组合关系。

**出处**：[[Foundry-Agent与Copilot-Studio的选型]]

## 第 2 站 · 底座：harness 与三层划分

### Q1 · 解释

**问**：用一句话区分 framework、harness、runtime、platform。

**答**：framework 是造 harness 的工具包（dev-time），harness 是跑起来的 agent loop 本身（run-time），runtime 是承载 harness 进程的设施（隔离、沙箱、持久执行、调度），platform 是身份、网关、登记这类控制面。

**出处**：[[harness-engineering]]、[[agent-infra-three-layers]]

### Q2 · 辨析

**问**："选模型比选 harness 重要。"对吗？

**答**：不一定。agent 的智能来自模型，可靠性来自 harness；同一个模型换 harness 行为会变——Copilot Studio 一个产品里就有几种 harness，选 harness 就是选行为语义。

**出处**：[[harness-engineering]]（Claim「选 harness 就是选行为语义」）

### Q3 · 场景

**问**：把三个支柱放进"harness 自己搭还是现成 × runtime 自己运营还是托管"的矩阵，各落在哪一格？

**答**：Foundry Prompt Agent 是平台的 harness + 平台托管 runtime；Hosted Agent 是自己搭（或自选框架）的 harness + 平台托管 runtime；Copilot Studio 把 harness 与 runtime 打包出售，选 harness 即选 runtime；GitHub Copilot 是现成 harness，执行可以在本地沙箱、云沙箱或 Actions。

**出处**：[[agent-infra-three-layers]]、[[copilot-studio-harness-selection]]

### Q4 · 辨析

**问**："用了 Hosted Agent 就不能用 Agent 365 了，二选一。"对吗？

**答**：不对。Hosted Agent 是托管的 Runtime，Agent 365 是 Platform 层的控制面，两者不在同一层，自建 runtime 也能接 Agent 365。

**出处**：[[agent-infra-three-layers]]

### Q5 · 解释

**问**：判断要不要上沙箱平台，先问哪两个问题？

**答**：一是执行不执行模型生成的代码；二是 runtime 要不要自主可控。

**出处**：[[agent-infra-three-layers]]

## 第 3 站 · 身份：Entra Agent ID

### Q1 · 解释

**问**：blueprint 和 agent identity 是什么关系？凭据在哪？

**答**：1:N——一个 blueprint 是一类 agent 的模板，产生多个 agent identity。凭据（FIC、证书、secret）都在 blueprint 上，agent identity 自己没有凭据，只能经 blueprint 签发的 FIC 认证。

**出处**：[[entra-agent-id]]

### Q2 · 辨析

**问**："agent identity 可以跨租户访问资源。"对吗？

**答**：不对。agent identity 始终单租户，只能在创建它的租户里拿 token；blueprint 可以配成多租户，加到别的租户后在那里生成本地的 agent identity。

**出处**：[[entra-agent-id]]

### Q3 · 解释

**问**：autonomous agent 拿 token 的三个阶段是什么？

**答**：先以 blueprint 身份拿 token（带上 agent identity 的 `fmi_path`），再用它换 agent identity 的 token，需要用户账号时再换 agent 用户账号的 token。

**出处**：[[entra-agent-id]]（Claim「完整 Token 流程三阶段」）

### Q4 · 场景

**问**：一个 Foundry agent 开发时能读存储账号，发布后突然 403。最可能是什么原因？

**答**：开发中的 agent 共用项目的共享身份，发布后换成专属 agent identity，原来授给共享身份的 RBAC 不会继承，要给新身份重新分配角色。

**出处**：[[entra-agent-id]]（Claim「Foundry 身份创建时序」）

### Q5 · 辨析

**问**："blueprint 认证就是 Azure RBAC 的一部分。"对吗？

**答**：不对。blueprint 认证属于 Entra 的 OAuth 层，Azure RBAC 是另一套授权体系，agent identity 作为 service principal 另行分配 RBAC 角色。

**出处**：[[entra-agent-id]]

## 第 4 站 · 支柱一：GitHub Copilot

### Q1 · 解释

**问**：GitHub Copilot 现在是哪四层？

**答**：入口（IDE、CLI、Copilot app、github.com / Mobile、Slack / Teams，共享同一份 session）、harness（统一的 Copilot harness + Fusion）、执行位置（本地沙箱、远程 Agent Host、云沙箱、Actions）、治理（GHE 策略、模型策略 API、MDM、usage metrics）。

**出处**：[[github-copilot]]

### Q2 · 解释

**问**：Fusion 让用户选什么？内部有哪三种工作方式？代价是什么？

**答**：选 effort（Standard / High / Max）而不是选模型；内部按任务走 Single（单模型直接做）、Cascade（便宜模型先出稿，不过关再升级）、Critique（一个出稿、一个挑错、原模型修改）。代价是调试变难，同一提示两次可能走不同模型组合。

**出处**：[[github-copilot]]（Claim「Fusion 让用户选 effort」）

### Q3 · 场景

**问**：客户代码在 GitHub Enterprise，身份用 Entra、设备用 Intune，在 Copilot、Codex、Claude Code 之间犹豫。你先问什么、倾向什么？

**答**：先问代码在哪托管、身份和设备用什么管。两者都是 GitHub + Entra / Intune 时，Copilot 基本是默认选项——agent 本来就在 PR 里，身份、设备、审计不用另起；Codex、Claude Code 强在 agent 本身，Copilot 强在 agent 之外的代码平台。

**出处**：[[GitHub-Copilot系列01：产品全景与竞争格局]]

### Q4 · 辨析

**问**："尚未配置的新 GA 功能默认关闭，管理员不用担心。"对吗？

**答**：不对。尚未配置的 GA 功能默认继承"开启"，要提醒管理员改成默认关闭，否则新功能一上线就对所有人可用。

**出处**：[[github-copilot]]（Claim「企业推广先查治理默认值和度量盲区」）

### Q5 · 解释

**问**：二次开发的三层是什么？哪一层和 Foundry 用的是同一个 harness？

**答**：定制 Copilot（skills、custom agents、MCP、plugin）、用 SDK 把 harness 嵌进自己的程序、用托管 harness 做业务 agent。第三层就是 Foundry 里 `harness.type: microsoft_copilot_preview` 的 Copilot harness。

**出处**：[[github-copilot]]

## 第 5 站 · GitHub Copilot 的记忆：Memory 与 Dreaming

### Q1 · 解释

**问**：一条 Copilot 记忆怎么"续命"？为什么只被检索不算？

**答**：使用时先对照当前分支核对 citations，核对通过才 upvote，只有 upvote 重置 90 天过期；单纯被检索不续期，记忆必须在某次使用中被重新验证过才能留下。

**出处**：[[agent-memory-lifecycle]]

### Q2 · 辨析

**问**："写进 Copilot Memory 的规则一定会被遵守。"对吗？

**答**：不对。核对 citations 是模型的判断，不是系统保证；需要稳定执行的规则要写进 custom instructions，会变、可核对的事实才放记忆。

**出处**：[[agent-memory-lifecycle]]

### Q3 · 场景

**问**：同事说他的个人设置页里 Dreaming 是灰的 Disabled，提示 "Set by your organization or enterprise"。你按什么顺序帮他查？

**答**：先确认看的是 Features 页而不是 Memory 列表；再看企业 AI controls 里 Dreaming 的值（Disabled everywhere 就到头了，Let organizations decide 就往下查组织）；逐个查给他许可证的组织，多组织取最严格；上级都放行后自己打开个人开关，再核对前提（模型、会话上云、code review）。

**出处**：[[GitHub-Copilot系列03：Memory与Dreaming的分层配置]]

### Q4 · 辨析

**问**："Dreaming 改坏了，关掉就会回滚。"对吗？

**答**：不对。关掉不撤销已做的改动、不恢复被删记忆、不关闭已开的 PR；能回滚的只有走 PR、合进 git 的 instructions / skills 改动。

**出处**：[[agent-memory-lifecycle]]（Claim「离线整理的回滚是不对称的」）

### Q5 · 解释

**问**：组织打开 Dreaming 时，范围和成本由什么决定？

**答**：范围就是 Memory 的 Repository access 里选中的全部仓库；每次运行扣 AI credits，没产生改动的运行也算。所以先收窄记忆范围，再开整理。

**出处**：[[agent-memory-lifecycle]]

## 第 6 站 · 支柱二：Copilot Studio

### Q1 · 解释

**问**：Power Platform 和 Copilot Studio 是什么关系？agent、workflow、app 共享什么、不共享什么？

**答**：Power Platform 是地基和管理平面，Copilot Studio 是盖在上面的产品。三类构建物共享环境、Dataverse、Connector、DLP 这层地基，但不共享运行时。

**出处**：[[copilot-studio]]

### Q2 · 场景

**问**：客户想让 agent 接 SAP，在企业租户里一试就报连接被阻止。你先查什么？

**答**：先查 DLP 和 Connector 允许列表——企业租户多数 Connector 被阻止，选型要先查允许列表；app、agent、workflow 共用同一个连接池和 DLP，区别只在用谁的身份调。

**出处**：[[copilot-studio]]（Claim「一个连接池、三种用法」）

### Q3 · 辨析

**问**："Copilot Studio 的 agent 有自己的数据库。"对吗？

**答**：不对。agent 是环境 Dataverse 里 `bot` 表的一行，指令、topic、知识文件是 `botcomponent` 行；程序化修改要直接改这些行，模拟键入会把 YAML 写坏。

**出处**：[[copilot-studio]]

### Q4 · 解释

**问**：发布、渠道、认证三者是什么依赖关系？

**答**：发布依赖渠道、渠道依赖认证：用 Microsoft 认证时只剩 M365 系渠道；勾选"在 M365 Copilot 中可用"后 agent 才有 titleId，人才能在 Teams 和 M365 Copilot 里直接用。

**出处**：[[copilot-studio]]

### Q5 · 辨析

**问**："开发者环境放着不用也没关系。"对吗？

**答**：不对。开发者环境不活动会先禁用再删除；环境所在区域也会影响功能可用性，抢先体验区不适合放给别人用的 agent。

**出处**：[[copilot-studio]]

## 第 7 站 · Copilot Studio 的 harness 选型

### Q1 · 解释

**问**：为什么说 harness 是建 Copilot Studio agent 时唯一的不可逆选择？

**答**：新建 agent 默认是 GitHub Copilot harness，建后不能与 Standard 互转；其他配置都能改，harness 改不了。

**出处**：[[copilot-studio-harness-selection]]

### Q2 · 场景

**问**：一个只需要按知识库回答 FAQ 的员工助手，同事建议"用新的 GitHub Copilot harness，更聪明"。你怎么看？

**答**：按任务重量选：简单任务用重 harness 会"想太多"，能用的 Standard 不必迁移；重活（自主拆解、要 Bash 容器）才放 GitHub Copilot harness。另外语音、程序化调用和多数渠道目前还在 Standard 上。

**出处**：[[copilot-studio-harness-selection]]、[[Foundry-Agent与Copilot-Studio的选型]]

### Q3 · 辨析

**问**："选对 harness，managed app 就能同步调用 agent。"对吗？

**答**：不对。能否被浏览器里的 managed app 同步调用，四种 harness 都是否；这一维只决定集成方式——经 workflow 异步中转，或让人直接在 Teams / M365 Copilot 里用 agent。

**出处**：[[copilot-studio-harness-selection]]

### Q4 · 场景

**问**：怎么证明一个回答确实来自某个 agent，而不是 M365 Copilot 本体？

**答**：用只有 agent 指令才会产生的指纹，问不带格式要求的裸问题，并设"直接用 agent"和"不经过 agent"两组对照；挂了知识源的 agent 做拒答测试时，先确认题目不在资料里。

**出处**：[[copilot-studio]]（Claim「判断回答确实来自某个 agent」）

### Q5 · 解释

**问**：做知识库 agent，要关掉哪两个开关？拒答句应该写在哪？

**答**：关掉 Allow ungrounded 与 Web Search；拒答句写进 Fallback topic——检索为空时不走生成，写在指令里的拒答句不会出现。

**出处**：[[copilot-studio]]

## 第 8 站 · Copilot Managed Runtime

### Q1 · 解释

**问**：判断一个功能要不要放进 managed app，只问哪个问题？

**答**：它是否需要知道"你是谁"，或需要一把不能放进前端的凭据。两者都不需要，静态站点就够了。

**出处**：[[copilot-managed-runtime]]

### Q2 · 辨析

**问**："managed app 里可以直接 fetch 调 Azure OpenAI 的 REST API。"对吗？

**答**：不对。应用在宿主中介沙箱里，CSP 把 fetch 限制为 self，调 AI 只能经 Connector——Azure OpenAI Connector 与 Work IQ Copilot MCP 走得通，Copilot Studio agent 走不通。

**出处**：[[copilot-managed-runtime]]

### Q3 · 解释

**问**：个人数据该放 App state 还是 Dataverse？用 App state 最容易踩什么坑？

**答**：只给本应用用的个人数据放 App state，要与 agent 或流程共享才用 Dataverse。App state 默认全员共享，必须手改 schema 加 `x-ms-ownership: perUser`，否则任何人都能读到别人的数据。

**出处**：[[copilot-managed-runtime]]

### Q4 · 场景

**问**：同事把 app 的深链 `#/insights?tag=foo` 发到 Teams，别人点开却只看到首页。为什么？

**答**：外层地址里的 hash 和查询串传不进宿主新建的 iframe，深链只能打开应用首页，改应用代码也绕不过去。

**出处**：[[copilot-managed-runtime]]

### Q5 · 解释

**问**：接一个 Connector 要过哪几关？哪两关最隐蔽？

**答**：白名单、返回类型、连接参数、allowedActions、首次授权、宿主外悬空、部署超时七关；其中两关会"状态正常但其实不通"，所以要在宿主里实测，不能只看连接状态。

**出处**：[[copilot-managed-runtime]]

## 第 9 站 · 支柱三：Foundry Agent Service

### Q1 · 解释

**问**：Prompt Agent 和 Hosted Agent 的根本区别是什么？Workflow Agent 去哪了？

**答**：运行时归谁：Prompt Agent 是 Foundry 替你运行（你只声明 instructions、tools、model、knowledge），Hosted Agent 是你用任意框架写、打成容器、Foundry 托管。Workflow Agent 已移出官方类型、定于 2026-12-01 退役，编排下沉到 Agent Framework 代码、harness 原语和 A2A。

**出处**：[[foundry-agent-service]]

### Q2 · 辨析

**问**："Hosted Agent 闲置 15 分钟就会被回收，这个时间改不了。"对吗？

**答**：不对。闲置超时可配 2~60 分钟，默认 15 分钟；超时后回收算力、保存 session 状态，恢复时自动还原；30 天不活跃才永久删除。

**出处**：[[foundry-agent-service]]

### Q3 · 场景

**问**：客户的 Hosted Agent 要接收 GitHub webhook，另一个要接 AG-UI 前端，还有一个做实时语音。各用哪种协议？

**答**：webhook 和 AG-UI 都用 `/invocations`（任意 JSON 进出、自己控制 SSE 流）；实时语音用 `/invocations_ws`（全双工 WebSocket）；普通对话用 `/responses`。

**出处**：[[foundry-agent-service]]

### Q4 · 解释

**问**：Foundry 里 skill 怎么交付给 agent？谁能直接挂 skill？

**答**：skill 存在项目级目录、有不可变版本，挂到 toolbox 后以 MCP Resources 暴露，agent 按 advertise → load → read resources 按需加载；直接集成只支持用 Microsoft Copilot harness 的 Prompt Agent，Hosted Agent 经 Toolbox MCP endpoint 取用。

**出处**：[[foundry-agent-service]]

### Q5 · 辨析

**问**："Hosted Agent 的治理比 Prompt Agent 弱。"对吗？

**答**：要分层说。身份层两者同源，都是 Entra agent identity，Hosted 的专属身份甚至更好审计；差别在内容层与内层可观测性——内容安全和 planner 内部埋点在 Hosted 上要自己补。

**出处**：[[foundry-agent-type-selection]]（Claim「治理分层」）

## 第 10 站 · Foundry 的选型

### Q1 · 场景

**问**：客户要一个 agent：用公司知识库答题、要能调几个 skill 处理文件，但团队不想维护 agent loop。选哪一档？

**答**：Prompt Agent + Microsoft Copilot harness——要 skills、托管执行、文件、子 agent，但不想自己持有 harness。只要 instructions 和工具就够用 Prompt Agent；要改框架、loop、中间件才上 Hosted。

**出处**：[[foundry-agent-type-selection]]

### Q2 · 解释

**问**：Voice Live 与 Prompt Agent、Hosted Agent 的组合方向为什么相反？

**答**：Prompt Agent 是"语音在外、agent 在内"：Voice Live 持有语音层，用 `agent_id` 把 agent 挂进来；Hosted Agent 是"语音在内"：走 `/invocations_ws`，语音处理进容器。`agent_id` 直连 Hosted 没有文档支持。

**出处**：[[foundry-agent-type-selection]]

### Q3 · 解释

**问**：Hosted Agent 多付的 container compute 买的是什么？

**答**：两类调用侧的推理与工具单价相同；container compute 买的是改 harness 的权力——上下文裁剪、prompt 缓存、模型路由、按需加载 skill、新协议即时跟进。

**出处**：[[foundry-agent-type-selection]]（Claim「成本模型」）

### Q4 · 辨析

**问**："Hosted Agent 按请求计费，低流量很便宜，高流量也一定比常驻容器便宜。"对吗？

**答**：前半对、后半不对。计费跟 session 走，每轮后保温到闲置超时为止也计费，成本随并发 session 线性放大；全天高频稳定流量下未必比 ACA 常驻便宜。

**出处**：[[foundry-agent-type-selection]]（Claim「Hosted Agent 运行时经济学」）

### Q5 · 场景

**问**：一个语音场景是"应用决定开口、读事先写好的固定文本"，同事想挂个 Foundry agent。你怎么看？

**答**：这种情况下 agent 的价值为零，挂上反而是负资产（丢 per-turn instructions、多一圈 runtime）；直接用模型模式 + 最小模型。agent 的价值等于交给它的内容决定权。

**出处**：[[foundry-agent-type-selection]]（Claim「反向判据」）

## 第 11 站 · 汇合：分层组合与接缝

### Q1 · 场景

**问**：员工在 Teams 里用、要查内部知识、偶尔要语音。给一个组合方案。

**答**：入口在 Teams → 先看 Copilot Studio（Standard harness 渠道最全、能做语音）；大脑不需要自己控制就留在 Copilot Studio，需要自定义 planner 或非微软模型再接 Foundry Hosted；电话语音用 Copilot Studio 的语音能力，网页 / 数字人走 Azure Speech；治理统一到 Entra Agent ID 与 Agent 365。

**出处**：[[Foundry-Agent与Copilot-Studio的选型]]（「决策树」一节）

### Q2 · 场景

**问**：外部客户在网页上和数字人对话，后端要接自家订单系统。给一个组合方案。

**答**：入口是自有网页 → 语音与形象走 Voice Live（Copilot Studio 没有内置数字人，渲染只能来自 Azure Speech avatar）；大脑放 Foundry——Prompt Agent 用 `agent_id` 绑定，或需要逐轮控制时直接调 Voice Live API；订单系统经工具或 Hosted 里的代码接入。

**出处**：[[Foundry-Agent与Copilot-Studio的选型]]

### Q3 · 解释

**问**：三支柱之间的硬约束集中在哪几处接缝？

**答**：Copilot Studio 只有 Standard harness 能被 app 程序化调用、能做语音；Voice Live 的 agent 绑定只认 Prompt Agent；Copilot Studio 没有内置数字人，数字人渲染只能来自 Azure Speech avatar。其余大多是可以任选、只有 trade-off 的地带。

**出处**：[[Foundry-Agent与Copilot-Studio的选型]]（「必须遵循的硬约束」一节）

### Q4 · 辨析

**问**："2026 年微软在把三条产品线合并成一个产品。"对吗？

**答**：不对，是汇合不是合并：Foundry 先把运行时做到 GA，Copilot Studio 开始借用 Foundry 的模型与 agent，同一套 Copilot harness 跨产品复用，治理面汇到 Entra Agent ID 和 Agent 365。选型越来越像分层组合。

**出处**：[[Foundry-Agent与Copilot-Studio的选型]]、[[foundry-agent-service]]

### Q5 · 场景

**问**：客户说"不想只有 Hosted Agent，想要自己的 runtime"。他真正想要的是什么？你怎么回应？

**答**：Hosted 已经是"framework 自选、runtime 托管"，他想把 runtime 这一半也换成自己的——数据与执行环境留在自己网络里、隔离与出站自定。可以给自建对照清单（kagent / AKS Kata + 沙箱 / 外置状态 / Workload Identity → Entra Agent ID / OTel），并说明这与 Agent 365 不冲突。

**出处**：[[foundry-agent-type-selection]]（Claim「Hosted Agent 已经是 framework 自选、runtime 托管」）
