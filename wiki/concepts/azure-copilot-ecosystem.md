---
title: "Azure Copilot Ecosystem"
created: "2026-04-11"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - azure
  - copilot
  - mcp
aliases:
  - "Azure Copilot"
  - "Azure Skills"
  - "Azure MCP Server"
related:
  - "[[mcp-vs-cli]]"
  - "[[skill-hub-ecosystem]]"
---

# Azure Copilot Ecosystem

## 摘要

Azure Copilot 生态包含三个层次：Azure Copilot Agents（Portal 内的 agent，Troubleshooting、Observability 已 GA，其余仍在 preview）、Azure Skills（Azure Skills Plugin 打包的 26+ 个工作流 skill）、Azure MCP Server（40+ 个 Azure 服务、按命名空间合并后的 59 个工具）。Copilot Agents 的对话交互只在 Portal，通用调用 API / SDK 未见文档（只有 Observability Agent 能以 ARM / Bicep 资源方式部署），因此编程化的 Agentic Infrastructure 路径仍是组合使用 Skills + MCP Server + CLI。（2026-11-07 /revalidate 后同步更新）

## Claims

### Claim: Azure Copilot Agents 的对话交互只在 Portal，通用调用 API/SDK 未见文档——Observability Agent 可经 ARM / Bicep 部署是例外

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **复核**：2026-11-07 修订——依据：[Agents in Azure Copilot](https://learn.microsoft.com/en-us/azure/copilot/agents)

> 详细分析已整理为文章 → Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践。写作时（2026-04）Azure Copilot Agents 处于 preview，仅支持 Portal UI 交互，不提供编程化 API 或 SDK 接口；当前状态见下方修订。

> **2026-11-07 修订**：Azure Copilot 的 agent 已不全是 preview——Troubleshooting、Observability 已 GA，Deployment、Optimization、Resiliency、Migration 仍在推进；对话交互仍在 Portal 的 Azure Copilot 里。Observability Agent 的后台自主运维可经 Azure Portal 或 ARM / Bicep 创建 `Microsoft.Monitor/observabilityAgents` 资源（Azure CLI 与 Terraform 暂不支持），这是第一个有资源化 / API 入口的 Azure Copilot agent；通用的 agent 调用 API / SDK 仍未见文档。

### Claim: Azure 编程化 Agentic 路径 = Azure Skills + Azure MCP Server + CLI

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **复核**：2026-11-07 修订——依据：[What is the Azure MCP Server?](https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/overview)

> agenticInfraOps 推荐集成方案：Azure MCP Server 做查询（40+ 服务、59 个工具）+ az/azd/terraform CLI 做部署执行 + Azure Skills 的 AKS 诊断剧本做故障排查。Azure Skills 现有 26+ 个可复用 skill（写作时为 22 个，含 AKS 故障排查、GPU 选型）。

> **2026-11-07 修订**：Azure Skills Plugin 现在打包 26+ 个可复用 skill（azure-prepare、azure-validate、azure-deploy、azure-diagnostics、azure-cost 等），配合 Azure MCP Server 与 Foundry MCP Server 使用；路径本身不变。

### Claim: Azure MCP Server 覆盖 40+ 服务、59 个工具（按服务命名空间合并）

- **来源**：[[Azure-Copilot生态：Skills、MCP与Agents的协作]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **复核**：2026-11-07 修订——依据：[Azure Skills Plugin - Let's Get Started!](https://devblogs.microsoft.com/all-things-azure/azure-skills-plugin-lets-get-started)

> 开源（MIT），兼容所有 MCP 客户端（Claude Code、GitHub Copilot、Cursor、Windsurf 等）——这是 AI agent 访问 Azure 的通用编程接口。

> **2026-11-07 修订**：官方博客的当前数字是 40+ 个 Azure 服务、59 个工具（工具按服务命名空间合并，单个工具下含多个操作），并已包含 Microsoft Foundry（模型目录、部署、agent 管理）；接入方式除 IDE 外还有 GitHub Copilot CLI、SDK、cloud agent 与 Docker。原文“200+ 工具”是合并前的口径。

### Claim: AI Shell (aish) 已归档，az copilot 命令不存在

- **来源**：[[Azure-Copilot生态：Skills、MCP与Agents的协作]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **复核**：2026-11-07 修订——依据：[PowerShell/AIShell（2026-01-30 archived）](https://github.com/powershell/aishell)

> AI Shell 于 2026 年 1 月归档，不再维护。目前没有基于 CLI 的 Azure Copilot 扩展。

> **2026-11-07 修订**：仓库于 2026-01-30 归档、只读，Learn 文档同样注明 2026-01 起不再维护。终端里用 AI 操作 Azure 的替代路径是 GitHub Copilot CLI + Azure Skills 插件（经 Azure MCP Server）；Azure Copilot 本身仍没有 CLI 入口。

### Claim: Azure Skills 三层架构——"脑"（Skills）+"眼"（MCP）+"手"（CLI）

- **来源**：[[Azure-Copilot生态：Skills、MCP与Agents的协作]]
- **首次出现**：2026-05-14
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **复核**：2026-11-07 确认——依据：[Azure Skills Plugin - Let's Get Started!](https://devblogs.microsoft.com/all-things-azure/azure-skills-plugin-lets-get-started)（skill 是不执行代码的指令文件，插件另配 azure 与 context7 两个 MCP server）

> Azure Skills = 经验丰富的架构师（知道做什么、什么顺序、遇到问题怎么处理）。Azure MCP Server = 监控仪表盘（看到实时状态）。CLI = 操作台按钮（执行变更）。Skills 通过 plugin.json 将三层能力打包：注入 SKILL.md 剧本 + 启动 Azure MCP Server + 启动 Context7 MCP。

### Claim: Azure Skills 预编排工具路由而非让 Agent 自行选择

- **来源**：[[Azure-Copilot生态：Skills、MCP与Agents的协作]]
- **首次出现**：2026-05-14
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **复核**：2026-11-07 确认——依据：[What is the Azure MCP Server?](https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/overview)（skills 提供结构化工作流与 guardrails、按需加载）

> SKILL.md 本质是预编排的决策树——每一步该用哪个工具已在剧本中明确规定。AKS 故障排查有显式优先级链（MCP → CLI 回退），azure-kusto 定义了四个精确回退触发条件（超时/不可用/认证失败/空结果），azure-quotas 明确声明 CLI 是唯一可靠方法。选择标准不是"读用 MCP、写用 CLI"，而是"关键专有 API 走 MCP，常见成熟命令走 CLI"。

### Claim: AG-UI 是 Foundry "custom protocols" 之一——Microsoft Agent Framework 已宣布支持

- **来源**：[[AG-UI协议解析]]
- **首次出现**：2026-07-30
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **复核**：2026-11-07 确认——依据：[Hosted agents in Foundry Agent Service](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents)（AG-UI 列为 Invocations 协议用例）、[Hosting Agent Framework applications](https://learn.microsoft.com/en-us/agent-framework/hosting)

> Foundry 文档把 AG-UI 与 voice、webhook 并列为 "custom protocols"——它们都是 Agent 对外交互方式而非内部推理机制。Microsoft Agent Framework 已宣布支持 AG-UI：Hosted Agent 输出 AG-UI Event 后，React/Blazor/移动端/Voice UI 可复用同一条事件流。这把微软 Agent 生态的协议面从"向下"（MCP 连工具）补齐到"向上"（AG-UI 连 UI），见 [[ag-ui-protocol]]。

### Claim: Foundry Agents 侧 Skill 加载三路径均未文档化打通——toolbox 不可变版本 + 显式 publish 是治理特征

- **来源**：[[Foundry-Toolbox与Skills解析]]
- **首次出现**：2026-07-30
- **最近更新**：2026-11-07
- **置信度**：0.75
- **状态**：outdated
- **复核**：2026-11-07 退役——依据：[Use skills with Microsoft Foundry agents (preview)](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/skills)、[What is Toolbox in Microsoft Foundry?](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/toolbox-overview)

> Foundry 的 skill 分发走 toolbox（不可变版本 + 显式 publish，治理优先），但 Prompt Agent 消费 skill 的三条候选路径——toolbox 挂 skill 的 MCP Resources 消费、直接注入、Responses API shell tool——截至 2026-07-31 复核没有一条文档化可走通；Responses API 的 shell tool（`container_auto`：Debian 12 容器、默认断网）是真执行环境但属 API 侧非 Agents 侧。根因是 harness 实现权：托管 harness 是平台封闭代码（详见 [[foundry-agent-type-selection]]）。对照 Copilot Studio 一个产品里就有三种 harness 可选——选 harness 就是选行为语义。

> **2026-11-07 退役**：已被文档化的路径取代——skill 存在项目级目录、有不可变版本，挂到 toolbox 后以 MCP Resources 暴露，agent 按 advertise → load → read resources 三步按需加载；Toolbox 支持矩阵里 skill 的直接集成标注为“用 Microsoft Copilot harness 的 Prompt Agent 支持”。“由 harness 实现权决定”的根因判断仍成立，现行结论见 [[foundry-agent-service]] 的 skill Claim。

### Claim: Copilot → Cowork → Super App 是人在环里位置的三次后移；微软定价已按此分档——席位价留在辅助档，Cowork 起按 Copilot Credits 计任务四项输入，但按量 ≠ 按结果；新版 Copilot 统一入口是"借 C 端 agent 形态提升企业渗透"

- **来源**：[[FinOps系列01：从token价格到任务花费]]
- **首次出现**：2026-09-26
- **最近更新**：2026-09-28
- **置信度**：0.7
- **状态**：active

> 2026-06-16 Copilot Cowork GA 转按量：M365 Copilot 席位 $30/用户/月不变覆盖 Chat 与应用内辅助；Cowork 任务执行在席位之上按 Copilot Credit 计量，每任务 credit 由模型使用/上下文检索/工具调用/运行时长四项决定，轻中重三档参考区间，管理员可设支出策略；GitHub Copilot 同年按量（理由：有用户一周跑几百个任务，固定席位价无法承受 agent 反复调用）；第三档 Autopilot 报道称与 Code 一同按量，待核实。两层意义：供给方定价确认了阶段分界（人是否逐条在环）；Credits 计量的是任务消耗的算力，失败与重试同样计费——客户从 Cowork 起为"尝试"付钱而非为"完成"付钱，成功任务数要使用方自己补，使用方 FinOps 由此从可选变必需（[[cost-per-task]]）。分发策略：新版 Copilot 应用把 Chat/Cowork/Search/Library/Agents 收进一个入口，形态上是消费级 agent 产品（聊天起手、单一入口、习惯养成），用 Office 企业用户基础先在 Copilot 层建习惯再向 Autopilot 延伸——C 端天然落左栏（RLHF 舒适区），B 端价值在右栏，所以这条策略解决采用不解决价值证明，ROI 责任推到 Cowork/Autopilot 档。三类使用洞见（GitHub Copilot / Copilot Studio / AI Foundry）都只给公式第一项，Cowork Credits 是唯一原生 task 粒度数据源。背景数字"Office 商业账户 4.5 亿 / Copilot 付费渗透 <7%"为二手数据未核实。（Computerworld 报道核订）

### Claim: 生态里补上了"低代码构建"与"应用托管"两层——Copilot Studio 造 agent / workflow / app，app 跑在 Copilot Managed Runtime 上；浏览器里的 app 调不到 agent，两者靠共享数据或"人直接用 agent"衔接

- **来源**：[[Copilot-Studio系列01：产品全景与环境]]、[[Copilot-Managed-Runtime系列01：托管环境对比与选型]]、[[Copilot-Managed-Runtime系列12：方案回顾与Connector接入清单]]、[[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]]
- **首次出现**：2026-10-26
- **最近更新**：2026-10-29
- **置信度**：0.75
- **状态**：active

> 两层的细节分别归口 [[copilot-studio]] 与 [[copilot-managed-runtime]]，harness 选型归口 [[copilot-studio-harness-selection]]。与本页既有的 Azure Copilot Agents / Skills / MCP 不同，这两层的地基是 Power Platform（环境、Dataverse、Connector、DLP），治理横跨 M365 与 Power Platform 两个 admin center；与 Foundry Agent Service 不在同一层（SaaS 构建产品 vs Azure agent 运行时）。

### Claim: 微软 AI 技术栈有三个支柱——GitHub Copilot（开发者与代码平台）、Copilot Studio（Power Platform 上的 SaaS 构建）、Foundry Agent Service（Azure 上的 PaaS 运行时）；三者共享 Copilot harness 与 Entra Agent ID，选型是分层组合而不是站队

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]、[[GitHub-Copilot系列01：产品全景与竞争格局]]、[[Copilot-Studio系列03：四种Harness对比与选型]]
- **首次出现**：2026-11-07
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active

> 三者的构建者、计费和治理各不相同：[[github-copilot]] 面向开发者，入口是 IDE / CLI / app / github.com，底座是 GitHub Enterprise 的策略与度量，按席位加 AI credits；[[copilot-studio]] 面向业务制作者与 fusion team，地基是 Power Platform 环境、Dataverse、Connector、DLP，按 Copilot Credits；[[foundry-agent-service]] 面向专业开发者，地基是 Azure 订阅、RBAC、私网，按量计费。把它们连起来的有两样：同一套 Copilot harness（GitHub Copilot 的 agent loop、Copilot Studio 新建 agent 默认的 GitHub Copilot harness、Foundry 的 `microsoft_copilot_preview` 托管 harness），以及治理面的 Entra Agent ID 与 Agent 365。大企业里三者常同时存在、分属不同团队，选型的重点是接缝处走哪条官方支持的路。

## 冲突与演进

- 2026-08-04：从 AG-UI 篇与 Foundry Toolbox/Skills 篇补充协议面（AG-UI 向上补齐）与 skill 治理面（toolbox 版本化、三路径不通、harness 实现权）两条新证据。
- 2026-09-28：注入 FinOps 系列 01 Claim——从 Skills/协议/治理面扩展到产品阶段与定价面（Copilot/Cowork/Super App 三档、Copilot Credits 计价、C 端引 B 端分发策略）；页面自 08-04 起首次更新。
- 2026-11-07：注入 GitHub Copilot 系列 03 Claim——从产品形态扩展到治理面的策略叠加规则（四层设置、最严格取值、生效值反推排查）。
- 2026-11-07：GitHub Copilot 两条 Claim（四层系统与竞争格局、四层策略叠加）迁至新建的 [[github-copilot]]，本页保留微软 Azure / M365 一侧的生态与定价论断。
- 2026-11-07：用户裁决三个支柱各自建页（[[github-copilot]]、[[copilot-studio]]、[[foundry-agent-service]]），本页作为总页补"三支柱"Claim，三页各以 part-of 挂回本页。

- 2026-11-07：/revalidate 复核——确认 3（其中 1 条 +0.1）、修订 4、退役 1

## 关联概念

- [[mcp-vs-cli]] — `implements` Azure Skills 是 MCP 与 CLI 共存互补的最佳实战案例
- [[skill-hub-ecosystem]] — `contrasts` Azure Skills 是 Microsoft 官方的 Skill 实现，与社区 Skill Hub 构成互补

## 来源日记

- [[2026-04-11-周六]] — agenticInfraOps 任务中发现 Azure Copilot 限制并整理编程化路径
- [[2026-04-12-周日]] — 追踪任务延续
- [[2026-04-13-周一]] — 追踪任务延续；Microsoft Skills 学习任务
- [[2026-05-14-周四]] — 深入学习 Azure Skills 三层架构和工具路由机制
- [[AG-UI协议解析]] — AG-UI 属 Foundry custom protocols、MAF 已支持（2026-07-30）
- [[Foundry-Toolbox与Skills解析]] — toolbox 治理、skill 三路径不通、Copilot Studio 三 harness（2026-07-30）
- [[FinOps系列01：从token价格到任务花费]] — 三阶段 = 人在环位置三次后移、微软定价分档表、按量≠按结果、C 端思路引到 B 端、三类使用洞见能给什么（2026-09-26）
- [[2026-10-29-周四]] — Copilot Studio 系列 01–08、Copilot Managed Runtime 系列 01–13 归口为两个新概念页
- [[2026-11-03-周二]] — GitHub Copilot 系列 01 成文：借 Universe 2026 梳理产品生态与竞争
- [[GitHub-Copilot系列01：产品全景与竞争格局]] — 四层全景、五个入口、二次开发三层、治理与度量、竞争格局
- [[2026-11-06-周五]] — GitHub Copilot 系列 03 成文
- [[GitHub-Copilot系列03：Memory与Dreaming的分层配置]] — Memory 与 Dreaming 的四层设置、多组织取最严格、Disabled 反推排查顺序
