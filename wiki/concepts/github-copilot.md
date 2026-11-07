---
title: "GitHub Copilot"
created: "2026-11-07"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - github-copilot
  - coding-agent
  - agent-harness
aliases:
  - "GitHub Copilot（GitHub 的 coding agent 平台）"
  - "Copilot CLI"
  - "Copilot app"
  - "Copilot harness"
related:
  - "[[azure-copilot-ecosystem]]"
  - "[[agent-memory-lifecycle]]"
  - "[[copilot-studio]]"
  - "[[harness-engineering]]"
  - "[[model-routing]]"
  - "[[agent-sandbox]]"
---

# GitHub Copilot（GitHub 的 coding agent 平台）

## 摘要

GitHub Copilot 已经从 IDE 补全插件变成一套平台：入口有 IDE、CLI、桌面 Copilot app、github.com 与 Mobile、Slack 与 Teams，共享同一份 session；中间是统一的 Copilot harness、Fusion 多模型编排和 GitHub Intelligence（Memory、Dreaming、代码搜索）；执行位置分本地沙箱、远程 Agent Host、云沙箱和 Actions；底座是 GitHub Enterprise 的代码平台、策略和度量。同一个 harness 也以 Microsoft Copilot SDK 和 Foundry 托管 harness 的形式开放，成为微软跨产品共用的 agent 底座。

本库对它的理解来自三篇：产品全景与竞争格局、Memory 与 Dreaming 的机制（放进 RSI 框架看）、以及实际去开 Dreaming 时理清的企业 / 组织 / 个人 / 仓库四层设置。记忆机制本身的通用论断归在 [[agent-memory-lifecycle]]，本页收产品结构、选型与治理。

## Claims

### Claim: GitHub Copilot 已是四层系统而非编辑器插件——入口、harness、执行位置、治理；竞争上 Codex / Claude Code 强在 agent 本身，Copilot 强在 agent 之外的代码平台

- **来源**：[[GitHub-Copilot系列01：产品全景与竞争格局]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active

> 五个入口（Copilot app、CLI、IDE、github.com / Mobile、Slack / Teams）共享同一份 session 列表；VS Code、CLI、app 统一到同一个 Copilot harness；工具在本地沙箱、远程 Agent Host、GitHub 云沙箱（默认，托管隔离 micro-VM，关闭存快照）或 Actions 里执行；产出回到 PR，被 GHE 策略、模型策略 API、MDM 与 usage metrics 管住。二次开发三层：定制（skills / custom agents / MCP / plugin）→ 用 SDK 嵌进自己的程序（服务器到服务器认证让后台服务可用）→ 用托管 harness 做业务 agent（GitHub Copilot SDK 改名 Microsoft Copilot SDK，harness 以 `microsoft_copilot_preview` 进入 Foundry）。竞争：Codex 与 Claude Code 是模型厂商自做 harness、共调出行业参照；Copilot 的 agent 本来就在 PR 里，身份、设备、审计不用另起；Cursor 强在编辑器体验。选型先问代码托管在哪、身份与设备管理用什么——是 GitHub + Entra / Intune 则 Copilot 基本是默认。短板：变化太快、执行位置多致排查多一层、预览功能多（产品 GA 不等于功能 GA）、GHES 不可用。

### Claim: Fusion 让用户选 effort 而不是选模型——内部按任务走 Single / Cascade / Critique，代价是同一提示两次可能走不同的模型组合，调试变难

- **来源**：[[GitHub-Copilot系列01：产品全景与竞争格局]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-07
- **置信度**：0.65
- **状态**：active

> effort 三档：Standard（日常编码，优先通用模型）、High（更难任务、更深推理）、Max（最高质量，优先最强模型）。三种工作方式：单模型直接做；便宜模型先出稿、质量检查不过再升级（Cascade）；一个模型出稿、另一个挑错、原模型修改（Critique）。管理员能看到 Fusion 从哪些模型里挑、可把某个模型单独排除出 Fusion 而不影响用户手选、可用 managed settings 设默认 effort。厂商自测 Fusion Max 在 Coding Agent Index 上距 Claude Code + Opus 5.5 Max 两分以内、token 约一半、耗时少约 40%，参考即可；"简单步骤用小模型、难点再升级"的方向本身没有争议。

### Claim: 二次开发分三层——定制 Copilot、用 SDK 嵌进自己的程序、用托管 harness 做与编码无关的业务 agent；同一个 harness 成了可复用的产品

- **来源**：[[GitHub-Copilot系列01：产品全景与竞争格局]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active

> ① 定制：skills、custom agents、MCP server / Connectors、plugin 进企业白名单市场，不写宿主程序。② 嵌入：Copilot SDK 在自己的应用里调同一个 harness；服务器到服务器认证（GitHub App 授只读 Copilot Requests 组织权限，installation token 交给 SDK）让后台服务不依赖登录用户调用，用量记组织名下、组织模型策略同样生效；VS Code 开放 Agent Host Protocol，自写客户端可共享同一实时 session。③ 托管：SDK 改名 Microsoft Copilot SDK，harness 以 `microsoft_copilot_preview` 进入 Foundry Agent Service（公开预览），Microsoft 跑 agent loop 和沙箱，开发者声明式提供 skills、工具和指令。对"选 framework 还是选 harness"，微软的答案是把 harness 做成产品——与 Copilot Studio 新建 agent 默认的 GitHub Copilot harness 是同一套。

### Claim: 团队级自动化有两条路——Automations 是产品内配置的功能，Agentic Workflows 是进仓库、走 PR、编译成 Actions YAML 的代码

- **来源**：[[GitHub-Copilot系列01：产品全景与竞争格局]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-07
- **置信度**：0.65
- **状态**：active

> Copilot Automations 把触发条件、提示词、模型、工具组合成重复执行的工作；共享 automation 读权限可见、写权限可编辑，用量归仓库所属组织，GitHub 上的动作署名为 Copilot。GitHub Agentic Workflows（开源）用自然语言 Markdown 描述推理型任务，编译成标准 Actions YAML，跑在现有 runner 组和策略下，可换别的 coding agent；默认只读、沙箱容器、Agent Workflow Firewall、safe outputs 校验、独立威胁检测 job。对执行环境有要求（自托管 runner、走评审）的团队选后者。Dreaming 的运行结果也在 Copilot app 的 Automations 里看。

### Claim: 企业推广先查治理默认值和度量盲区——未配置的 GA 功能默认继承开启；usage metrics 依赖客户端遥测，impact dashboard 的合并率差异只是相关性

- **来源**：[[GitHub-Copilot系列01：产品全景与竞争格局]]
- **首次出现**：2026-11-03
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active

> 策略面：模型策略 REST API 可在企业、组织、团队、agent 应用各级读写；managed settings 在客户端启动时拉取最新策略、可要求最低客户端版本；本地沙箱策略经 Intune 等 MDM 下发、开发者无法削弱；尚未配置的 GA 功能默认继承"开启"，要提醒管理员改成默认关闭，否则新功能上线即对所有人可用；云端访问由"Copilot in the cloud"一条策略控制，session 默认只作用于一个组织。度量面：usage metrics API / NDJSON 导出提供企业到用户级明细，企业自建的 skills、custom agents、MCP server 现在按名字显示；但关遥测或代理拦截时少计，github.com 与 Mobile 上的 Chat 不计入；agentic 用户合并率更高是相关性，汇报要配开发者反馈和 PR 周期等证据。

### Claim: Copilot 功能开关是企业、组织、个人账号、个人仓库四层叠加的生效值——"Let organizations decide"只说明组织有选择权，排查要从个人页面的生效值往上反推

- **来源**：[[GitHub-Copilot系列03：Memory与Dreaming的分层配置]]
- **首次出现**：2026-11-06
- **最近更新**：2026-11-07
- **置信度**：0.75
- **状态**：active

> 以 Memory 与 Dreaming（公开预览）为例：企业在 AI controls 里定边界（Enabled everywhere 组织关不掉、Disabled everywhere 组织开不了、Let organizations decide 交给组织，首次选这项时组织默认关闭，但从全开改过来的保持开启）；组织在 Settings → Copilot → Policies 里选，并用 Memory 的 Repository access 圈定仓库；个人偏好永远越不过上级，上级放行也不替个人打开；个人拥有的仓库另有仓库级开关。同一用户从多个组织拿许可证时取最严格的设置。个人 Features 页上的盾牌 + Disabled 与提示文字只说明"上面有人没开"，不指明是哪一层、哪个组织；Memory 列表页的 No memories found 说明不了开关状态。实际排查中最常见的卡点在组织层——企业交给组织、个人又读不到组织策略页，只能请组织 owner 查看。

## 冲突与演进

- 2026-11-04：系列 01、02 首次提取时按"产品名不单独建页"先例未建页，论断分散注入 [[azure-copilot-ecosystem]]、[[agent-memory-lifecycle]]、[[harness-engineering]]、[[model-routing]]、[[recursive-self-improvement]] 等页。
- 2026-11-07：用户指出图谱中缺 GitHub Copilot 节点，与 [[copilot-studio]]（8 篇系列建产品页）口径不一致；系列已到 3 篇，按同一口径建页。两条 Claim 从 [[azure-copilot-ecosystem]] 迁入，系列 01 补 4 条；记忆机制的通用论断仍留在 [[agent-memory-lifecycle]]，不重复。

## 关联概念

- [[azure-copilot-ecosystem]] — `part-of` GitHub Copilot 是微软 Copilot 生态里面向开发者与代码平台的那一支
- [[agent-memory-lifecycle]] — `implements` Copilot Memory 与 Dreaming 是该页记忆生命周期机制的产品实现
- [[copilot-studio]] — `contrasts` 同一套 Copilot harness，GitHub Copilot 面向编码与代码平台，Copilot Studio 面向低代码业务 agent
- [[harness-engineering]] — `implements` VS Code、CLI、app 统一到同一个 harness，harness 决定 agent 表现
- [[model-routing]] — `implements` Fusion 按 effort 档在多模型间路由（Single / Cascade / Critique）
- [[agent-sandbox]] — `uses` 云沙箱（托管隔离 micro-VM、关闭存快照）是 session 的默认执行环境

## 来源日记

- [[2026-11-03-周二]] — GitHub Copilot 系列 01、02 成文
- [[2026-11-06-周五]] — GitHub Copilot 系列 03 成文
- [[GitHub-Copilot系列01：产品全景与竞争格局]] — 五个入口、harness 与 Fusion、二次开发三层、治理与度量、竞争格局
- [[GitHub-Copilot系列02：Memory、Dreaming与自我改进]] — Memory 与 Dreaming 的机制、放进 RSI 框架看
- [[GitHub-Copilot系列03：Memory与Dreaming的分层配置]] — 企业 / 组织 / 个人 / 仓库四层设置、多组织取最严格、Disabled 反推排查
