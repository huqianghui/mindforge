---
title: "Copilot Managed Runtime"
created: "2026-10-29"
updated: "2026-10-29"
tags:
  - wiki
  - concept
  - azure
  - copilot-managed-runtime
  - managed-apps
  - hosting
aliases:
  - "Copilot Managed Runtime（M365 企业内 SPA 托管平台）"
  - "Microsoft Copilot Managed Runtime"
  - "Managed Apps"
  - "managed app"
related:
  - "[[copilot-studio]]"
  - "[[azure-copilot-ecosystem]]"
  - "[[copilot-studio-harness-selection]]"
---

# Copilot Managed Runtime（M365 企业内 SPA 托管平台）

## 摘要

Copilot Managed Runtime（Preview）是 Copilot Studio 的 Create apps、Copilot Cowork、Copilot Code 以及 `ms` CLI/SDK 写出的应用共同的运行环境，用户入口是 `managedapps.cloud.microsoft`。它是 Microsoft 365 侧的"企业内部 SPA 托管 + 治理"平台：替你承担 Entra 登录、按人/组分享、Conditional Access、DLP 与管理后台可见性；你放弃自有域名、任意后端运行时与网络层控制，后端只能经 Connector。它**不是** Azure Managed Applications，也不是 App Service / Container Apps 的包装层。

本库的认识来自把一个个人知识库静态站点部署成 managed app 并做完六个阶段的路线图：零 Connector 的分析页面、App state 存个人数据、本地检索 + Work IQ / Azure OpenAI 的问答、尝试接 Copilot Studio agent 失败，以及部署后的内容缓存与深链问题。核心心智模型是**宿主中介沙箱**：应用被宿主装进 iframe、被 CSP 收紧到 self，唯一出口是交给宿主的 JSON-RPC。

## Claims

### Claim: Managed Runtime 是企业内部交互应用的托管层——平台承担身份、分享与治理，代价是没有自有域名、后端只能靠 Connector、需额外许可

- **来源**：[[Copilot-Managed-Runtime系列01：托管环境对比与选型]]
- **首次出现**：2026-10-26
- **最近更新**：2026-10-29
- **置信度**：0.75
- **状态**：active

> 选型分界：公开站点 → GitHub Pages / Static Web Apps；内容协作 → SharePoint；企业内部交互应用 → Managed Runtime；自有后端与容器 → App Service / Container Apps；复杂场景常是"Managed Runtime 前端 + Azure 后端"的组合。两个最容易踩的坑：有 M365 不等于能免费运行（需 Power Apps Premium 或 Managed Application Copilot Credits）；个人 GitHub 仓库不能直接绑定（只支持 GitHub Enterprise Cloud 组织仓库或平台托管仓库）。七维对比与决策树单篇来源，`internal-app-hosting-selection` 决策页未建（HOLD），表格留在原文。

### Claim: 平台把"发布"和"扩散"分开管——新应用默认私有、无需管理员审批是设计；三条认证链路各管一段，凭据都不进仓库

- **来源**：[[Copilot-Managed-Runtime系列02：实战部署与权限解析]]
- **首次出现**：2026-10-26
- **最近更新**：2026-10-29
- **置信度**：0.7
- **状态**：active

> CLI → 平台 API（建应用记录、build、deploy、share）、git → 平台托管仓库、最终用户 → 应用；前两条决定能否发布，第三条决定谁能打开，都只用同一个 Entra 工作账号。治理靠事前策略（CA / DLP / 分享限制 / 可选部署审批）+ 事后可见。静态站点要改四处：Vite `base` 回根路径、hash 路由、内容同步成平台能接受的文件、站内链接改写成应用内路由。踩坑：Git Credential Manager 接管全局凭据、平台构建拒绝符号链接、`ms app deploy` 轮询超时不等于构建失败（先 `build-status`）。Preview，置信度打折。

### Claim: 宿主中介沙箱——应用被装进两层 iframe、放在独立 usercontent 子域名下，CSP 把 fetch / 外部 iframe / Worker / CDN 全部限制为 self，唯一出口是交给宿主的 JSON-RPC `http/send`

- **来源**：[[Copilot-Managed-Runtime系列03：宿主沙箱与安全边界]]、[[Copilot-Managed-Runtime系列05：在应用里调用AI的几条路]]
- **首次出现**：2026-10-27
- **最近更新**：2026-10-29
- **置信度**：0.8
- **状态**：active

> 宿主播放器（`play.managedapps.cloud.microsoft`，持有 token）→ 加载器 iframe（`…powerplatformusercontent.com/_platform/app/loader`，公开空壳）→ 应用 iframe。宿主校验 apiId 与连接的 runtimeUrl 后才注入凭据转发；应用文件本身在认证后面（未登录 401）。由此推出：不能嵌网页聊天（`frame-src 'self'`）、不能直连外部 API、不能用 Web Worker、依赖必须打包；应用能访问的外部世界就是 `ms.config.json` 里登记的 Connector。"向内用 iframe 关住应用、向外用 CSP 不让应用开口子"方向相反、目的相同。`host-mediated-sandbox` 通用模式未单独建页（HOLD）。

### Claim: SDK 不直接发请求而是经宿主调 Connector——只在宿主里可用，宿主外调用既不返回也不报错；能在构建期算的不放运行期

- **来源**：[[Copilot-Managed-Runtime系列04：SDK与数据接入]]、[[Copilot-Managed-Runtime系列07：零Connector的分析页面]]
- **首次出现**：2026-10-27
- **最近更新**：2026-10-29
- **置信度**：0.75
- **状态**：active

> `getUser` 只给三个字段，`getContext()` 只有 appId、environmentId、sessionId；DataClient 不抛异常要查 `success`；`ms app add data-source` 一条命令做三件事（在租户建连接、改 `ms.config.json`、生成强类型代码，两者都要入库）。本地用 `ms app dev` 接宿主，纯 Vite 下要降级。知识库应用的洞察、建议、统计、演进四页零 Connector：同步脚本一次写出五个静态 JSON，前端只做筛选聚合，建议页是以数据自身日期为基准的固定阈值纯函数规则——所有数字在 deploy 时固定，页面须标明生成时间与来源版本。

### Claim: 在 managed app 里调 AI 只能经 Connector——Work IQ Copilot MCP 与 Azure OpenAI Connector 走得通，Copilot Studio agent 走不通；回答只有纯文本，引用靠提示词约定输出协议

- **来源**：[[Copilot-Managed-Runtime系列05：在应用里调用AI的几条路]]、[[Copilot-Managed-Runtime系列09：本地检索加Work-IQ的问答]]、[[Copilot-Managed-Runtime系列10：调用Copilot-Studio-Agent为何走不通]]、[[Copilot-Managed-Runtime系列11：用Azure-OpenAI-Connector直调模型]]、[[Copilot-Managed-Runtime系列12：方案回顾与Connector接入清单]]
- **首次出现**：2026-10-27
- **最近更新**：2026-10-29
- **置信度**：0.8
- **状态**：active

> 检索在浏览器里做（英文词 + 中文二元组、idf × 字段权重），提示词约定 SOURCES + 行内 `[n]` + `RELATED:` 行由应用解析。Work IQ：以用户身份调 M365 Copilot，回答要剥六层包装，首次授权约 74 秒、之后 15~20 秒，要求每人有 Copilot 许可证，提示词里的网址会被抽成 grounding 文件（要去掉）。Azure OpenAI：只能用 API Key 共享连接（Entra 连接报 AADSTS50011），部署名是每次调用的参数，同问题 4.6 秒、快 3~5 倍，成为默认后端。Copilot Studio agent：Connector 回调式、Work IQ `agentId` 被忽略，四种 harness 都调不到（详见 [[copilot-studio]]）。

### Claim: 只给本应用用的个人数据放 App state，要与 agent 或流程共享才用 Dataverse——App state 默认全员共享，必须手改 schema 加 perUser

- **来源**：[[Copilot-Managed-Runtime系列08：用App-state保存用户数据]]、[[Copilot-Managed-Runtime系列12：方案回顾与Connector接入清单]]
- **首次出现**：2026-10-27
- **最近更新**：2026-10-29
- **置信度**：0.75
- **状态**：active

> Dataverse 原计划被租户 DLP 挡住：`ms app add data-source` 跳过全部写入动作，SDK 通用写入返回 404。App state 是实验性同源接口，不经 Connector、不受 DLP，按用户隔离由平台强制，但不加 `x-ms-ownership: perUser` 就是全员共享（A 的进度会被 B 覆盖）；本地 dev 不提供接口只能部署后验证；PUT 是整条覆盖，前端本机先写、云端去抖写。连带后果：App state 写得进去但触发不了 workflow，能触发 workflow 的 Dataverse 又写不进去——"应用写表、workflow 调 agent"的异步方案卡在存储上。不要手工把被屏蔽的动作补回数据源描述（等于绕过 DLP）。

### Claim: 每接一个 Connector 过七关——白名单、返回类型、连接参数、allowedActions、首次授权、宿主外悬空、部署超时；其中两关"状态正常但其实不通"

- **来源**：[[Copilot-Managed-Runtime系列12：方案回顾与Connector接入清单]]、[[Copilot-Managed-Runtime系列11：用Azure-OpenAI-Connector直调模型]]
- **首次出现**：2026-10-28
- **最近更新**：2026-10-29
- **置信度**：0.75
- **状态**：active

> "状态正常但不通"的两关：Azure OpenAI 资源名填成完整网址时连接仍显示 Connected、调用一直 502；共享连接部署时平台强制要求 `allowedActions`，而 `ms app dev` 不查这项、本地能跑不代表能部署。其余：留意 "Skipped N of M actions due to your organization's connector policy"；生成的返回类型可能是 `void`/`any`，先在宿主里打印一次；首次授权的等待会算进计时；宿主外 SDK 调用悬空需超时判断。

### Claim: 判断一个功能要不要放进 managed app，只问它是否需要知道"你是谁"，或需要一把不能放进前端的凭据

- **来源**：[[Copilot-Managed-Runtime系列12：方案回顾与Connector接入清单]]、[[Copilot-Managed-Runtime系列13：静态内容缓存与深链限制]]
- **首次出现**：2026-10-28
- **最近更新**：2026-10-29
- **置信度**：0.7
- **状态**：active

> 同一知识库同时发布成 GitHub Pages 静态站与 managed app，真正依赖平台的只有识别用户（`getUser`）、按用户跨设备保存（App state）、问答（Connector）三类；其余纯前端，两站共用，并在静态站给出退路。反之，纯前端功能不该为"在平台上"而引入 Connector——每多一个数据源，每个用户就多一项授权。补充：用户本来就在 Teams 里时，另起一个知识库 agent 往往比把人引到应用里更顺手，两个出口共用同一份内容。

### Claim: 平台按路径缓存应用的静态文件——带内容哈希的代码会换新，固定路径的内容文件不会；内容 URL 要带内容同步版本号

- **来源**：[[Copilot-Managed-Runtime系列13：静态内容缓存与深链限制]]
- **首次出现**：2026-10-29
- **最近更新**：2026-10-29
- **置信度**：0.7
- **状态**：active

> 一次部署同时新增页面与同步内容：导航里出现新页面（`index-<新哈希>.js` 已生效），但 `content/manifest.json` 路径未变、返回旧清单，新页面拿不到新数据——容易误判成同步没跑或构建失败。文章文件按路径取哈希命名，改了内容文件名也不变。解法：构建时读清单的 `generatedAt` 注入为常量，所有内容请求加 `?v=<同步时间>`；只改代码的部署 URL 不变、缓存照常有效。缓存在平台侧、规则不公开、开发者控制不了响应头。单次实测。

### Claim: 外层地址里的 hash 和查询串传不进宿主新建的 iframe——深链只能打开应用首页，改应用代码也绕不过去

- **来源**：[[Copilot-Managed-Runtime系列13：静态内容缓存与深链限制]]、[[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]]
- **首次出现**：2026-10-29
- **最近更新**：2026-10-29
- **置信度**：0.75
- **状态**：active

> `…/apps/<app>/#/doc/<路径>` 与 `?doc=<路径>` 两种都打开首页：加载器 iframe 的 src 只有 `…/_platform/app/loader?ms_embedderOrigin=…`，应用读到的 `location.hash` 为空，`getContext()` 也不带外层参数；应用在跨域子 iframe 里读不到父页面地址——这是隔离设计的一部分。应用内跳转不受影响（改的是应用自己 iframe 的 hash）。后果：对外链接（邮件、Teams、agent 回答的"来源"）一律指向公开原文；"分享应用里的某一页"做不到；需要可分享单页链接的场景，静态站或 SharePoint 更合适。

## 冲突与演进

- 2026-10-26：harvest 首提为边界候选（新产品域，单批次 01/02），HOLD 复核阈值"真实应用落地"。
- 2026-10-27~28：系列扩到 12 篇，MR07~12 即本库 managed app 的真实落地，阈值命中；仍属产品而非基础技术概念，升级为待复核。
- 2026-10-28：MR05 路线 ①（Copilot Studio Connector 调 Standard agent）与"Work IQ agentId 可行"被 MR10 推翻，原文已更正；本页只收更正后的结论。
- 2026-10-29：建页（用户 AskUserQuestion 裁决"两个都建"），同时收入 MR13。`host-mediated-sandbox` 与 `internal-app-hosting-selection` 未单独建页，作 Claim 收入，登记 HOLD。

## 关联概念

- [[azure-copilot-ecosystem]] — `part-of` Managed Runtime 是微软 Copilot 生态里"应用托管"这一层
- [[copilot-studio-harness-selection]] — `constrains` 应用只能经 Connector 出站且收不到回调，使"能否被应用同步调用"这一维对四种 harness 都是否
- [[generation-evaluation-separation]] — `uses` "调用成功 ≠ agent 接手"的判定沿用指纹 + 对照的验证纪律

## 来源日记

- [[2026-10-26-周一]] — 学习 Copilot Studio 发布环境 managed app，01 选型与 02 实操部署成文
- [[2026-10-28-周三]] — 10~12 成文：agent 调用走不通、Azure OpenAI 后端、方案回顾
- [[2026-10-29-周四]] — 13 成文：内容缓存与深链
- [[Copilot-Managed-Runtime系列01：托管环境对比与选型]] — 定位、七维对比、选型决策树
- [[Copilot-Managed-Runtime系列02：实战部署与权限解析]] — 三条认证链路、权限模型、静态站改造与踩坑
- [[Copilot-Managed-Runtime系列03：宿主沙箱与安全边界]] — 两层 iframe、CSP、JSON-RPC 方法表
- [[Copilot-Managed-Runtime系列04：SDK与数据接入]] — CLI / SDK / 宿主三层、data-source、ms app dev
- [[Copilot-Managed-Runtime系列05：在应用里调用AI的几条路]] — 调 AI 的路线全景
- [[Copilot-Managed-Runtime系列06：参考应用拆解与功能模式]] — 一个已上线应用的九个模式
- [[Copilot-Managed-Runtime系列07：零Connector的分析页面]] — 构建期五个 JSON 撑起四个分析页
- [[Copilot-Managed-Runtime系列08：用App-state保存用户数据]] — Dataverse 被 DLP 挡住、App state 与 perUser
- [[Copilot-Managed-Runtime系列09：本地检索加Work-IQ的问答]] — 本地检索、输出协议、剥六层
- [[Copilot-Managed-Runtime系列10：调用Copilot-Studio-Agent为何走不通]] — 三次尝试与误判
- [[Copilot-Managed-Runtime系列11：用Azure-OpenAI-Connector直调模型]] — API Key 共享连接、allowedActions、两后端对比
- [[Copilot-Managed-Runtime系列12：方案回顾与Connector接入清单]] — 后端与存储选型、Connector 七关、平台边界
- [[Copilot-Managed-Runtime系列13：静态内容缓存与深链限制]] — 按路径缓存与版本号、深链不传入
