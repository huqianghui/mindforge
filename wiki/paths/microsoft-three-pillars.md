---
title: "学习路径：微软 AI 三支柱"
created: "2026-11-07"
updated: "2026-11-24"
tags:
  - wiki
  - path
  - github-copilot
  - copilot-studio
  - foundry
path_id: "microsoft-three-pillars"
audience: "自己 + CSA 团队"
gap_topics:
  - agent-memory
  - model-harness-decoupling
  - agent-tooling
signals:
  - "GitHub Changelog（github.blog/changelog）"
  - "Microsoft Foundry Blog 与 Foundry What's new"
  - "Copilot Studio What's new"
  - "Microsoft Entra Agent ID 与 Agent 365 文档更新"
---

# 学习路径：微软 AI 三支柱

GitHub Copilot、Copilot Studio、Foundry Agent Service 是微软 AI 技术栈的三个支柱，学微软技术栈绕不过去。图谱里这些知识是网状的，这条路径把它们排成一个顺序：先建立全景，再补三个产品共用的底座（harness、三层划分、身份），然后逐个支柱，最后回到"怎么组合"。

**怎么用**：按站点顺序读，每站读完对照「算会」逐条自查，都能说出来、判断出来才进下一站。「算会」也是自测题库的出题来源。标 ⚠️ 的站点依赖的 Claim 里有 stale 的，读的时候以复核行为准，或先跑 `/revalidate` 对应页面。

**预计总用时**：约 12~15 小时（按读 wiki 页 + 关键原文估算，不含动手实验）。

## 第 1 站 · 全景：三个支柱怎么分工

- **读**：[[azure-copilot-ecosystem]]（Claim「微软 AI 技术栈有三个支柱」）、[[Foundry-Agent与Copilot-Studio的选型]]（「两个平台加一层语音」「技术差异」两节）
- **前置**：无
- **用时**：约 45 分钟
- **算会**：
  - 能说出三个产品各自面向谁、怎么计费、治理建在什么地基上（GitHub Enterprise / Power Platform / Azure 订阅）
  - 能说出把三者连起来的两样东西：同一套 Copilot harness，治理面的 Entra Agent ID 与 Agent 365
  - 能解释为什么"Copilot Studio 和 Foundry 选哪个"是个错问题——两者不在同一层，真实问题是每一层用谁

## 第 2 站 · 底座：harness 与三层划分

- **读**：[[harness-engineering]]（Claim「选 harness 就是选行为语义」「harness 按归谁、能不能改分三类」「Agent framework 是 dev-time 概念，harness 是 run-time 实体」）、[[agent-infra-three-layers]]
- **前置**：第 1 站
- **用时**：约 1 小时
- **⚠️ stale**：[[harness-engineering]] 1/20（其余读物全部 active，读时以各 Claim 的复核行为准）
- **算会**：
  - 能用一句话区分 framework、harness、runtime、platform，并各举一个微软的例子
  - 能把三个支柱放进"harness 自己搭还是现成 × runtime 自己运营还是托管"矩阵，说出各自落在哪一格
  - 能解释为什么 Hosted Agent 是托管的 Runtime、Agent 365 是 Platform 控制面，两者不冲突

## 第 3 站 · 身份：Entra Agent ID

- **读**：[[entra-agent-id]]、[[Entra-Agent-ID的双层身份模型]]
- **前置**：第 2 站
- **用时**：约 1 小时
- **算会**：
  - 能画出 blueprint 与 agent identity 的 1:N 关系，说清凭据在哪、为什么 agent identity 自己没有凭据
  - 能复述 token 流程的三个阶段
  - 能说清 Entra OAuth 授权与 Azure RBAC 是两套体系，以及 Foundry 里发布前后身份怎么变、RBAC 为什么要重新分配

## 第 4 站 · 支柱一：GitHub Copilot

- **读**：[[github-copilot]]、[[GitHub-Copilot系列01：产品全景与竞争格局]]
- **前置**：第 2 站
- **用时**：约 1.5 小时
- **算会**：
  - 能说出 GitHub Copilot 的四层（入口、harness、执行位置、治理），以及五个入口为什么共享同一个 session
  - 能解释 Fusion 的 effort 三档与 Single / Cascade / Critique 三种工作方式，以及代价是什么
  - 能说出二次开发的三层，指出哪一层和 Foundry 是同一个 harness
  - 能对客户说清和 Codex、Claude Code、Cursor 比的长板与短板，以及选型先问的两个问题

## 第 5 站 · GitHub Copilot 的记忆：Memory 与 Dreaming

- **读**：[[agent-memory-lifecycle]]、[[GitHub-Copilot系列02：Memory、Dreaming与自我改进]]、[[GitHub-Copilot系列03：Memory与Dreaming的分层配置]]；[[agent-memory-lifecycle]]（「记忆不授予任何权限」）
- **前置**：第 4 站
- **用时**：约 1.5 小时
- **算会**：
  - 能讲清一条记忆的生命周期：产生、写入过滤、检索与 citations 核对、投票、过期，以及为什么只有 upvote 续期
  - 能说出 Dreaming 三类能力各自的生效方式，以及"关掉不等于回滚"
  - 能按企业 → 组织 → 个人账号 → 个人仓库四层，从个人页面的 Disabled 反推卡在哪一层
  - 能说出为什么跨任务的记忆不能当作"上次已经批准过"，可变事实使用前要重新核对

## 第 6 站 · 支柱二：Copilot Studio

- **读**：[[copilot-studio]]、[[Copilot-Studio系列01：产品全景与环境]]、[[Copilot-Studio系列02：Connector与连接]]、[[Copilot-Studio系列05：Agent的存储与标识]]
- **前置**：第 2 站
- **用时**：约 2 小时
- **算会**：
  - 能说清 Power Platform 与 Copilot Studio 的关系：agent、workflow、app 共享什么、不共享什么
  - 能解释环境、连接池、DLP 的作用，以及企业租户里 Connector 选型为什么先查允许列表
  - 能说出 agent 在 Dataverse 里的存储方式（`bot` / `botcomponent`），以及程序化修改为什么不能模拟键入
  - 能说出发布、渠道、认证三者的依赖关系

## 第 7 站 · Copilot Studio 的 harness 选型

- **读**：[[copilot-studio-harness-selection]]、[[Copilot-Studio系列03：四种Harness对比与选型]]、[[Copilot-Studio系列07：如何确认是Agent在回答]]
- **前置**：第 6 站
- **用时**：约 1 小时
- **算会**：
  - 能说出官方现列的三种 harness（Microsoft Copilot、Customer Conversation、Standard）各管什么，以及为什么 harness 是建 agent 时唯一的不可逆选择；选型页已按三种改写，系列 03 的正文是 2026-10 的四种口径（Standard、GitHub Copilot、Copilot Chat、Customer Conversation），开头有更新说明：Microsoft Copilot harness 的职责对应原来的 GitHub Copilot harness，Copilot Chat 已不单列（官方页面没有写明改名）
  - 能按任务重量给出选型建议，并说出"能否被应用同步调用"对当时实测的四种都是否
  - 能设计一个"确认真是 agent 在回答"的对照实验（指纹 + 两组对照）

## 第 8 站 · Copilot Managed Runtime

- **读**：[[copilot-managed-runtime]]、[[Copilot-Managed-Runtime系列01：托管环境对比与选型]]、[[Copilot-Managed-Runtime系列05：在应用里调用AI的几条路]]、[[Copilot-Managed-Runtime系列12：方案回顾与Connector接入清单]]；[[copilot-managed-runtime]]（「创作入口再多，产物都是同一种静态 SPA」「SharePoint 和 Managed Runtime 不在同一层」）
- **前置**：第 6 站
- **用时**：约 1.5 小时
- **算会**：
  - 能用"是否需要知道你是谁、是否需要一把不能放前端的凭据"判断一个功能该不该放进 managed app
  - 能说出在 managed app 里调 AI 走得通和走不通的路，以及原因（宿主中介沙箱、只能经 Connector）
  - 能说出 App state 与 Dataverse 的分工，以及 perUser 为什么要手改 schema
  - 能说出 Copilot Studio 生成的应用和手写 React 应用为什么能力和限制没有本质差别，以及 SharePoint 的两种角色

## 第 9 站 · 支柱三：Foundry Agent Service

- **读**：[[foundry-agent-service]]、[[agent-sandbox]]、[[Foundry-Agent三种形态对比与选型]]、[[Foundry-Toolbox与Skills解析]]；[[foundry-agent-service]]（「Hosted Agents 已包了自建 agent runtime 里最费劲的几块」）
- **前置**：第 2、3 站
- **用时**：约 2 小时
- **算会**：
  - 能说出 Prompt Agent 与 Hosted Agent 的"运行时归谁"差异，以及 Workflow Agent 去了哪里
  - 能说出 Hosted Agent 的运行模型：每 session 一个 VM 级沙箱、闲置超时（默认 15 分钟、可配置，两篇官方文档给的上限不一致）、三种调用协议各自适合什么
  - 能解释 skill 在 Foundry 里怎么交付（toolbox + MCP Resources），以及为什么只有用 Copilot harness 的 Prompt Agent 能直接挂 skill

## 第 10 站 · Foundry 的选型

- **读**：[[foundry-agent-type-selection]]；[[foundry-agent-type-selection]] 后加的两条（「按 loop 归谁分三类 agent」「在 AKS 上自建的理由只剩三类」）
- **前置**：第 9 站
- **用时**：约 45 分钟
- **算会**：
  - 能按三档（Prompt / Prompt + Copilot harness / Hosted）给出选型判断，并说出每档的触发信号
  - 能说出 Voice Live 与 Prompt、Hosted 两类 agent 的组合方向为什么相反
  - 能说出 Hosted 的成本模型：container compute 买的是什么
  - 能按"loop 归谁"把 agent 分成 A、B、C 三类，并说出只有哪一类值得放到 AKS 上自建

## 第 11 站 · 汇合：分层组合与接缝

- **读**：[[microsoft-ai-pillars-selection]]、[[Foundry-Agent与Copilot-Studio的选型]]（「必须遵循的硬约束」「决策树」两节）、[[foundry-agent-service]]（Claim「硬约束集中在接缝上」）
- **前置**：第 5、7、8、10 站
- **用时**：约 1 小时
- **算会**：
  - 给一个客户场景（如"员工在 Teams 里用、要接内部系统、要语音"），能按"入口 → 大脑要不要自己控制 → 语音 → 治理"给出组合方案
  - 能说出三处接缝上的硬约束，以及哪些是可以任选、只有 trade-off 的地带
  - 能说出 2026 年三条产品线的汇合方向
  - 能说出和客户第一次沟通先问的三个问题，以及为什么"谁来长期维护"往往比功能差异更决定选哪个平台

## 前沿站 · 正在发生的变化

三支柱变化很快，这一站放还没完全进 wiki、或刚被复核改过的变化。「算会」统一是：**能说出它改变了上面哪一站的哪条结论**。2026-W47 周报建议 Ignite 之后重走第 8~10 站。

- **Foundry hosted agent 可以跑在客户自己的 AKS 上**（2026-W47，Ignite，预览）→ 影响第 9、10 站：Hosted 与"在 AKS 上自建"之间多了"托管控制面 + 自有集群"这一档，"自建的理由只剩三类"要重评
- **Hosted agent 出站控制 GA、内存快照预览，Foundry 语音 agent GA**（2026-W47）→ 影响第 9、10 站：Hosted 的治理与冷启动描述要更新；语音 agent 可接 Teams Phone、Twilio、Genesys
- **Copilot Studio agent 可本地构建并托管到 Copilot Managed Runtime，Agent 365 加成本管理**（2026-W47，第三方整理，未核对官方原文）→ 影响第 6~8 站：Copilot Studio 与 Managed Runtime 的边界在收拢
- **Copilot Studio 的 harness 口径变了**（2026-11-24 核对官方页面）：官方现列三种（Microsoft Copilot、Customer Conversation、Standard），[[copilot-studio-harness-selection]] 已加现行口径说明，四种口径下的选项与实测保留作记录
- **Microsoft Copilot harness 进入 Foundry（公开预览）**→ 影响第 9、10 站：Foundry 选型从两档变三档，Prompt Agent 有了 skill
- **Foundry 发布模型迁移**（Agent Application → 新 agent 对象模型）→ 第 3 站已按新模型修订：创建 agent 即建专属身份

## 毕业标准

不看资料，能对一个陌生客户场景在 15 分钟内画出"三支柱怎么组合"的草图，每个选择都能说出依据和一条风险；说不出依据的那一层，回到对应站点。

## 这条路径暴露的缺口

排路径时发现缺这些页，补上后路径会更完整：

- **概念页缺失**：Power Platform 地基（环境、Dataverse、DLP 目前散在 [[copilot-studio]] 里）、M365 Copilot 本体与声明式 agent、Agent 365、Microsoft Agent Framework、Work IQ
- **决策页缺失**：员工侧与客户侧入口的选择（"三支柱怎么选与组合"已补为 [[microsoft-ai-pillars-selection]]，"语音 agent 的构建方式"已补为 [[voice-agent-build-approach]]）
- **stale 已基本清零**：[[harness-engineering]] 等底座页在 2026-11-07 与之后几轮复核后只剩个别 stale（见各站 ⚠️ 行）
- **harness 口径**：[[copilot-studio-harness-selection]] 已按官方三种加现行口径说明（2026-11-24），但选项分析仍按四种展开，素材更新后可重写成三种
