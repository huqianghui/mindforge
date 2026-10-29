---
title: "Copilot Studio"
created: "2026-10-29"
updated: "2026-10-29"
tags:
  - wiki
  - concept
  - azure
  - copilot-studio
  - power-platform
  - agent
aliases:
  - "Copilot Studio（微软低代码 agent 构建产品）"
  - "Microsoft Copilot Studio"
  - "Power Virtual Agents"
  - "MCS"
related:
  - "[[azure-copilot-ecosystem]]"
  - "[[copilot-managed-runtime]]"
  - "[[copilot-studio-harness-selection]]"
  - "[[foundry-agent-type-selection]]"
  - "[[generation-evaluation-separation]]"
---

# Copilot Studio（微软低代码 agent 构建产品）

## 摘要

Copilot Studio 是盖在 Power Platform 地基上的 AI 构建产品，能造三类东西：**agent、workflow、app**。三者共享环境、Dataverse、Connector 与 DLP 这层地基，但运行时各不相同——agent 由所选 harness 决定跑在经典运行时、Agentic Runtime 还是 M365 Copilot 编排器里，app 跑在 [[copilot-managed-runtime]] 上。治理横跨 Microsoft 365 与 Power Platform 两个 admin center。

它在本库的意义来自一次完整实践：给一个知识库 managed app 接 Copilot Studio agent 作问答后端，四种 harness 从浏览器里都同步调不到，期间一度误判"可行"；最后反过来，把同一批文章做成知识库 agent 发布到 Teams，由人直接使用。由此沉淀出三类知识：agent 的存储模型（Dataverse 行、YAML 配置）、调用边界（谁能调到 agent），以及"怎么确认真是 agent 在答"的验证方法。

## Claims

### Claim: Power Platform 是地基和管理平面，Copilot Studio 是盖在上面的一个产品——agent、workflow、app 共享地基，不共享运行时

- **来源**：[[Copilot-Studio系列01：产品全景与环境]]、[[Copilot-Studio系列04：Agent、Workflow与App的协作]]
- **首次出现**：2026-10-27
- **最近更新**：2026-10-29
- **置信度**：0.75
- **状态**：active

> 环境、Dataverse、Connector、DLP、Solutions 属于地基，所以 Copilot Studio、Power Apps、Power Automate 共用同一套 Connector 目录和数据策略。三类构建物像 Power Virtual Agents、Power Automate 流程、Power Apps 应用的新版，但运行时是新的。一个 managed app 的管理横跨两个 admin center：清单、使用量、Credits 在 M365 一侧，环境、连接、DLP 在 Power Platform 一侧。三者之间最主要的协作方式不是互相调用，而是**共享同一份数据**（后台 workflow 与 agent 写进 Dataverse/SharePoint，app 读出来让人决定，决定写回再触发下一步）；app 没有直接触发 workflow 的入口，靠改数据触发。

### Claim: 环境是租户内的隔离容器——开发者环境不活动会先禁用再删除；环境所在区域会影响功能可用性，抢先体验区不适合放给别人用的 agent

- **来源**：[[Copilot-Studio系列01：产品全景与环境]]、[[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]]
- **首次出现**：2026-10-27
- **最近更新**：2026-10-29
- **置信度**：0.7
- **状态**：active

> 个人开发者环境不占容量、自己能建，但长期不活动会被禁用再删除。区域实测：同一批上传文件，在 `unitedstatesfirstrelease`（抢先体验区，界面写 Preview (United States)、门户走 preview 子域名）的环境里一整晚都是 In progress、检索不到；新建 `unitedstates` 正式区域的开发者环境（BAP API 约 20 秒），单篇约 5 分钟可检索。打开 Dataverse search 不是解法。agent 可以和它服务的 app 放在不同环境、不同区域——人在 Teams 里直接用 agent，不经过 app。单租户单次对照，区域差异可能随时间消失。

### Claim: 一个连接池、三种用法——app、agent、workflow 共用连接与 DLP，区别在用谁的身份调；企业租户多数 Connector 被阻止，选型先查允许列表

- **来源**：[[Copilot-Studio系列02：Connector与连接]]
- **首次出现**：2026-10-27
- **最近更新**：2026-10-29
- **置信度**：0.75
- **状态**：active

> Connector 是 Power Platform 给 API 套的标准外壳，连接是某人对它的一次登录、保存凭据。实测 agent 用的连接就在 Power Platform 的连接池里。企业租户里约九成 Connector 被阻止；自定义 Connector 是接自有后端的正规途径，但常被 DLP 拦下。API key 类共享连接在 managed app 里须声明 `allowedActions` 白名单。

### Claim: agent 没有自己的数据库——它是环境 Dataverse 里 `bot` 表的一行，指令、topic、知识文件是 `botcomponent` 行；程序化修改要直接改这些行，模拟键入会把 YAML 写坏

- **来源**：[[Copilot-Studio系列05：Agent的存储与标识]]、[[Copilot-Studio系列06：Standard-Agent的配置与发布]]、[[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]]
- **首次出现**：2026-10-27
- **最近更新**：2026-10-29
- **置信度**：0.8
- **状态**：active

> 所以解决方案、发布者前缀、安全角色、导出导入都是现成的；创建时的 Solution 决定前缀，schema name 是唯一逻辑名、创建后不能改。模型、指令、Web Search 存在 `<schema>.gpt.default` 这一行的 `data` 列（YAML，显示名 GPT Chat Latest 存为 `modelNameHint: GPT56Chat`）；Allow ungrounded 存在 `bots.configuration` 的 `aISettings.useModelKnowledge`。两次实测：浏览器自动化往指令编辑器粘贴/键入，YAML 变成上百到上千个按字符编号的键（`0: k`、`1: i`…），模型字段变 `{}`；直接 PATCH `data` 修好。延伸做法：把指令、topic、开关放进独立仓库，经 Dataverse Web API 写入，门户只看不改（agent-as-code）。例外：Copilot Chat 声明式 agent 不在 `bot` 表里（见下）。

### Claim: 发布依赖渠道、渠道依赖认证——Microsoft 认证下只剩 M365 系渠道；勾选"在 M365 Copilot 中可用"后 agent 才有 titleId，人才能在 Teams 和 M365 Copilot 里直接用它

- **来源**：[[Copilot-Studio系列06：Standard-Agent的配置与发布]]、[[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]]
- **首次出现**：2026-10-28
- **最近更新**：2026-10-29
- **置信度**：0.75
- **状态**：active

> Publish 按钮在配置至少一个渠道之前是灰的。titleId（`T_…`）是第三套标识（显示名、schema name、bot GUID 之外），用途是拼"打开与该 agent 对话"的链接，不是程序调用的 id。以 Dataverse `bots.publishedon` 有值为准判断发布成功；界面可能卡在 "Turning on Teams…"（一次 6 分钟、另一次约 1 分钟）。新版门户 Channels 在顶部标签 "+2" 菜单里，`/channels` 路径是空白页。索引没完成也能发布，但发布后检索不到任何内容。

### Claim: 浏览器里的 managed app 同步调不到任何 harness 的 agent；反方向——人在 Teams / M365 Copilot 里直接问 agent——是常规用法且不受 app 限制

- **来源**：[[Copilot-Studio系列03：四种Harness对比与选型]]、[[Copilot-Studio系列06：Standard-Agent的配置与发布]]、[[Copilot-Managed-Runtime系列10：调用Copilot-Studio-Agent为何走不通]]、[[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]]
- **首次出现**：2026-10-27
- **最近更新**：2026-10-29
- **置信度**：0.8
- **状态**：active

> Copilot Studio Connector 的 `ExecuteCopilotAsyncV2` 是回调式（必填 `notificationUrl`，给 Power Automate 设计），草稿 agent 被重定向到门户、被 CORS 拦下而 SDK 仍报 success；Work IQ `copilot_chat` 的 `agentId` 收下并回显但不生效。GitHub Copilot harness 在 Connector、协议（只回流式）、应用三层都被堵住。唯一剩下的程序化路径是经 workflow 异步中转。反过来，把同一批文章做成 Standard 知识库 agent 发布到 Teams，用户直接对话，不经过 app 的 CSP 与 Connector——同一份内容于是有 app（浏览、可视化、个人数据）与 agent（聊天里问答）两个出口。

### Claim: 判断回答确实来自某个 agent，要用只有 agent 指令才会产生的指纹，问不带格式要求的裸问题，并设"直接用 agent""不经过 agent"两组对照；挂了知识源的 agent，拒答测试题要先确认不在资料里

- **来源**：[[Copilot-Studio系列07：如何确认是Agent在回答]]、[[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]]、[[Copilot-Managed-Runtime系列12：方案回顾与Connector接入清单]]
- **首次出现**：2026-10-28
- **最近更新**：2026-10-29
- **置信度**：0.8
- **状态**：active

> 误判过程：经 Work IQ 传 `agentId`，调用成功、格式正确、`agentId` 被回显、耗时变长，四条都"对"，但格式是调用方提示词要求的、回显对任意值成立、变慢可能只因允许上网——没有一条是只有 agent 才会产生的。复测用裸问题"澳大利亚的首都"：直接用 agent 时以 `RELATED: none` 结尾，经 Work IQ 五次都没有，与不传无法区分。最好建 agent 时就埋指纹。后续反例：这道题被写进记录实验的文章，文章又成了知识库 agent 的知识源，agent 引用它答出堪培拉——按知识库答不算违规，但题目从此失效；换题前先 `grep` 知识文件。方法本身属 [[generation-evaluation-separation]] 的"验证陈述纪律"在 agent 路由上的实例。

### Claim: 知识库 agent 要关掉 Allow ungrounded 与 Web Search，并把拒答句写进 Fallback topic——检索为空时不走生成，指令里的拒答句不会出现

- **来源**：[[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]]
- **首次出现**：2026-10-29
- **最近更新**：2026-10-29
- **置信度**：0.7
- **状态**：active

> Standard harness 两条路：检索命中 → 生成式回答（指令在这里生效，`[n]` + "来源"段落）；检索为空 → 直接进 Fallback topic，用户看到默认的 "I'm sorry, I'm not sure how to help with that…"（连续 3 次还转"人工"），制作者在测试面板另见 "No information was found that could help answer this."。改法是 Fallback 只留一个 SendActivity 回固定句。默认值不可信：门户里 Web 开关新建显示 Off，另一环境新建的 agent 实测 `webBrowsing` 与 `useModelKnowledge` 都是 true，建完要到 Dataverse 核对。仍开着的问题：目录类问题只检索到目录片段（某系列 18 篇列出 6 篇）；中文问题偶尔用英文答；回答里曾混入 `cite…turn…search…` 内部标记（指令加一句后消失）。单 agent 实测。

### Claim: 上传文件类知识源一次提交几百个会在服务端留下空内容行——每批约 45 个，以 `filedata_name` 是否有值判断真的传完

- **来源**：[[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]]
- **首次出现**：2026-10-29
- **最近更新**：2026-10-29
- **置信度**：0.7
- **状态**：active

> 405 个文件一次提交：`PUT …/botcomponents` 约 115 秒后返回 412 `DuplicateRecordsFound`，门户自动重试全部 400 `ExportKeyInvalidCreate`；Dataverse 里 405 行 `componenttype = 14` 都在但 `filedata_name` 为空，Knowledge 页不显示。删行后每批 45 个、约 30~45 秒，9 批全成功。显示名截断到 100 字符（同系列长文件名会截成同名）。知识文件本身要自带出处（frontmatter 后插标题/路径/原文链接三行，相对链接改绝对地址），因为 agent 只看得到文本。手工重传是 Upload files 的代价，后续计划换 SharePoint 文档库。

### Claim: Copilot Chat 声明式 agent 不是"轻量版 Standard"——它不在 Dataverse `bot` 表里、由 M365 Copilot 编排器执行、不能选模型

- **来源**：[[Copilot-Studio系列07：如何确认是Agent在回答]]、[[Copilot-Studio系列03：四种Harness对比与选型]]
- **首次出现**：2026-10-28
- **最近更新**：2026-10-29
- **置信度**：0.7
- **状态**：active

> 门户地址带 `agentBackend=cosmos`，在 `bot` 表里查不到；配置页里没有选模型的地方；从 New agent 下拉选 Microsoft Copilot agent 会在新标签页打开不同编辑器。和 Standard 一样有 titleId，只能由人在 M365 Copilot 里经链接直接用，程序调不到。

## 冲突与演进

- 2026-10-26~28：harvest 三轮把 `copilot-studio` 列为边界候选（条件①③满足，②不满足——是产品不是基础技术概念），建议与 `copilot-managed-runtime` 一并裁决。
- 2026-10-28：系列内部自我更正——CS03 / CS05 / CS06 原"Standard 能被应用调用""titleId 可当 agentId"结论被 CS07 的对照实验推翻，已在原文更正；本页只收更正后的结论。
- 2026-10-29：建页（用户 AskUserQuestion 裁决"两个都建"）。触发：系列扩到 8 篇，CS08 是本库自己的 agent 从建到发布的独立案例，沿 [[global-secure-access]] / [[entra-agent-id]] "等到独立案例才建页"的先例。`shared-data-coordination`（模式 A）未单独建页，作第一条 Claim 收入，登记 HOLD。

## 关联概念

- [[azure-copilot-ecosystem]] — `part-of` Copilot Studio 是微软 Copilot 生态里面向低代码构建的那一块
- [[copilot-managed-runtime]] — `uses` Copilot Studio 用 Create apps 生成的应用跑在 Managed Runtime 上
- [[foundry-agent-type-selection]] — `contrasts` Copilot Studio 是 Power Platform 上的 SaaS 构建产品，Foundry Agent Service 是 Azure 上的 agent 运行时，两者不在同一层
- [[generation-evaluation-separation]] — `uses` "指纹 + 两组对照"是验证陈述纪律在 agent 路由上的应用
- [[copilot-studio-harness-selection]] — `constrains` 新建默认 GitHub Copilot harness、建后不能互转，使 harness 选型成为建 agent 时的不可逆决策

## 来源日记

- [[2026-10-26-周一]] — 学习 Copilot Studio 的发布环境 managed app，Managed Runtime 01/02 成文
- [[2026-10-28-周三]] — Copilot Studio 系列 05–07 成文，更正 agent 调用结论
- [[2026-10-29-周四]] — 系列 08（Teams 知识库 agent）成文
- [[Copilot-Studio系列01：产品全景与环境]] — 产品全景、两个 admin center、环境类型与不活动清理
- [[Copilot-Studio系列02：Connector与连接]] — 一个连接池三种用法、允许列表、自定义 Connector
- [[Copilot-Studio系列03：四种Harness对比与选型]] — 四种 harness、New agent 菜单对照、调用边界
- [[Copilot-Studio系列04：Agent、Workflow与App的协作]] — 共享数据、同步调用、触发 workflow 三种模式
- [[Copilot-Studio系列05：Agent的存储与标识]] — bot / botcomponent、Solution 与 schema name
- [[Copilot-Studio系列06：Standard-Agent的配置与发布]] — gpt.default YAML、测试面板、渠道与 titleId
- [[Copilot-Studio系列07：如何确认是Agent在回答]] — 指纹 + 两组对照、Copilot Chat 声明式 agent
- [[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]] — 知识文件、分批上传、区域、Fallback topic、agent-as-code
- [[Foundry-Agent与Copilot-Studio的选型]] — 与 Foundry Agent 的四层定位对比
