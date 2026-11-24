---
title: "Copilot Studio Harness Selection"
created: "2026-10-29"
updated: "2026-11-24"
tags:
  - wiki
  - decision
  - copilot-studio
  - agent
  - harness
aliases:
  - "Copilot Studio harness 选型（Standard / Microsoft Copilot / Customer Conversation）"
  - "Microsoft Copilot harness"
  - "GitHub Copilot harness"
decision_status: "active"
related_concepts:
  - "[[copilot-studio]]"
  - "[[copilot-managed-runtime]]"
  - "[[harness-engineering]]"
  - "[[foundry-agent-type-selection]]"
related_methods: []
related:
  - "[[agent-harness]]"
  - "[[agent-platform]]"
---

# Copilot Studio Harness Selection（Copilot Studio harness 选型）

## 背景

Copilot Studio 里建 agent 时要先选 harness——夹在"你配置的 agent"与模型之间的运行时，决定什么时候调模型、塞哪些上下文、调哪个工具、怎么计费。官方 [Harnesses in Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/harnesses-overview) 现列三种：**Microsoft Copilot harness**（推理密集、多步、跨工具，原生读写 Word / Excel / PowerPoint / PDF，每个任务跑在 Copilot Studio 管控的沙箱里，按 Copilot Credits 计费）、**Customer Conversation harness**（面向客户的语音与聊天，多 agent 架构，各子 agent 有自己的转人工路径，按 Credits 计费）、**Standard harness**（按你定义的 topics、prompts 与路径走，规则明确、要稳定可预测）。

口径变化：2026-10 本库实测时官方与门户列的是四种——Standard、GitHub Copilot、Copilot Chat、Customer Conversation（预览）。Microsoft Copilot harness 的职责对应当时的 GitHub Copilot harness；Copilot Chat（往 M365 Copilot 编排器里挂指令与知识的声明式 agent）不再作为单独的 harness 列出，官方页面没有说明是改名还是合并。下文涉及"四种"的实测结论保留并注明时间；执行分布当时观察到的是三套服务：Standard → 经典运行时（前身 Power Virtual Agents），GitHub Copilot → Agentic Runtime，Copilot Chat → M365 Copilot 编排器。

两个事实让这成为一个**不可逆决策**：2026-10 时直接点 New agent 按钮建出的是 GitHub Copilot harness（Standard 藏在下拉菜单或 "Other ways to build" 最后一项），现行界面以菜单上的 Powered by 为准；harness **创建后不能互转**（本轮未见官方变更说明），换 harness 等于重新架构。

## 选项分析

### 选项 A: Standard

- **优势**：按 topics / 触发条件 / 分支走，可预测、低延迟；渠道最全；可选模型（OpenAI、Anthropic 两族）；Agents 列表标注"包含在 M365 Copilot 许可内、无额外 Credits"；Power Automate 能经 Copilot Studio Connector 调它；可挂上传文件、SharePoint 等知识源
- **劣势**：不擅长长任务、多步拆解与文件产出；浏览器里的 managed app 仍调不到它（Connector 动作回调式，Work IQ `agentId` 被忽略）
- **适用条件**：一问一答、路径能写清、上下文有边界、要快要稳要费用可控——如知识库问答（本库 Teams 知识库 agent 即此类）

### 选项 B: Microsoft Copilot harness（原 GitHub Copilot harness）

- **优势**：给目标后自己拆步骤、跨 connector / 知识 / MCP / connected agent 调工具、失败重试或换路径；原生读写 Word / Excel / PowerPoint / PDF；支持 Skills 与 Memory；任务跑在 Copilot Studio 管控的沙箱里（2026-10 观察到带 Bash 容器与文件系统）
- **劣势**：全程按 Copilot Credits（构建、测试、评测、运行都计费，M365 Copilot 许可不豁免）；简单任务会"想太多"——更长延迟、更多 Credits、结果不更好；Connector、协议（只回流式）、应用三层都堵住，程序调不到；渠道少（SharePoint、Direct Line 等暂不可用，MCP / A2A client 仅 Preview）；沙箱实现官方未公开
- **适用条件**：长、多步、多产出的重活，作为"用户直接对话的助手"或"后台 workflow 的执行者"

### 选项 C: Customer Conversation harness

- **优势**：唯一原生面向语音——同一个 agent 接网站聊天与电话号码，指令可分别写 Speech 与 Chat 模态；多 agent 架构、各子 agent 有自己的转人工路径，答不了转人工；可调 connector / 知识 / MCP / connected agent，支持 Skills 与 Memory
- **劣势**：Credits 计费；面向外部客户，网站聊天要 iframe / Direct Line，被 managed app 的 CSP 挡住（推断，未实测）
- **适用条件**：对外客服、联络中心类场景，不用于员工内部助手

### 已移出现行列表：Copilot Chat（声明式 agent，2026-10 口径）

2026-10 时它是第四个选项：包含在 M365 Copilot 许可内，给 M365 Copilot Chat 挂企业知识即可、零运行时运维；由 M365 Copilot 编排器执行、不能选模型，不在 Dataverse `bot` 表里，仅限内部使用，程序调不到。官方 harness 页面现已不列它；声明式 agent 本身现在是否仍按这套方式工作，本轮没有核对。

## 决策结论

- **选择**：按**任务的重量**选，并先过一条调用入口的硬约束。短、能写清、要快要稳 → Standard（默认）；长、多步、多产出 → Microsoft Copilot harness；对外语音与聊天客服 → Customer Conversation。组合用法：Microsoft Copilot harness 定时在后台做重活、结果写进数据表，Standard 在前台高并发回答，两者经共享数据解耦。
- **理由**：harness 决定的是能力、计费与调用入口三件事，而它们都随"任务重量"同向变化——越重越自主、越贵、越难被程序调用。能用的 Standard agent 不必迁移。
- **放弃理由**：不以"能否被应用同步调用"作区分维度——2026-10-28 实测，从浏览器里的 managed app 当时的四种 harness 都同步调不到，这一维对所有选项都是否；要从应用里用 agent，只能经 workflow 异步中转，或者反过来让人在 Teams / M365 Copilot 里直接用 agent。
- **前提假设**：渠道、计费与调用入口变化很快（2026-11 官方已把 harness 从四种调整为三种）；Microsoft Copilot harness 的 MCP / A2A 暴露若 GA，或 Work IQ `agentId` 开始生效，"调用入口"一维需要复核。

## 影响范围

- **受影响的概念**：[[copilot-studio]]（调用边界、存储模型只对 Standard 等由 Copilot Studio 运行时执行的 agent 成立）、[[copilot-managed-runtime]]（问答后端只能选 Work IQ / Azure OpenAI）
- **受影响的方法**：（暂无）

## 验证状态

- **验证方式**：官方文档 + 门户实操 + 从 managed app 调用的对照实验
- **当前状态**：部分验证
- **验证证据**：Standard 已在本库两个 agent 上实测（应用问答后端尝试失败；Teams 知识库 agent 发布可用）；2026-10 的四种 harness 从浏览器调不到经 CS07 / MR10 复测确认，口径改为三种后未重新实测；GitHub Copilot（现 Microsoft Copilot）harness 的"想太多"、计费与 Customer Conversation 的渠道限制来自官方文档与菜单标注，未在本库实测

## Claims

### Claim: harness 建后不能互转，是建 agent 时唯一的不可逆选择——2026-10 时新建 agent 默认是 GitHub Copilot harness（现称 Microsoft Copilot harness）

- **来源**：[[Copilot-Studio系列03：四种Harness对比与选型]]、[[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-24
- **置信度**：0.8
- **状态**：active
- **复核**：2026-11-24 修订——依据：[Harnesses in Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/harnesses-overview)（官方现列三种：Microsoft Copilot、Customer Conversation、Standard）；"建后不能互转"本轮未见官方变更说明，维持；New agent 菜单四个入口的对照是 2026-10-27 的界面

> **现行结论（2026-11-24 修订）**：harness 仍是建 agent 时最关键、不可逆的选择（本轮未见可以互转的说明）。但组成变了：官方现在列三种——Microsoft Copilot harness、Customer Conversation harness、Standard harness；下面"四个入口对应四种 harness"的菜单对照（含 Copilot Chat 一项）是 2026-10-27 的界面，界面可能已随口径变化，以实际菜单的 Powered by 为准。
>
> 原记录：New agent 下拉菜单四个入口正好对应四种 harness：Agent（GitHub Copilot，按钮默认动作）、Customer Assist Agent（Customer Conversation）、Microsoft Copilot agent（Copilot Chat，新标签页打开）、Agent（Standard，"Other ways to build" 最后一项）；菜单上的小硬币图标即按 Credits 计费。已有 agent 看 Agents 列表的 Powered by 列。名字（如 "Voice Assistant"）不代表 harness。

### Claim: 按任务重量选——简单任务用重 harness 会"想太多"，能用的 Standard 不必迁移；重活放 Microsoft Copilot harness（原 GitHub Copilot harness）在后台跑，经共享数据与前台 Standard 解耦

- **来源**：[[Copilot-Studio系列03：四种Harness对比与选型]]、[[Copilot-Studio系列04：Agent、Workflow与App的协作]]
- **首次出现**：2026-10-27
- **最近更新**：2026-10-29
- **置信度**：0.7
- **状态**：active

> 官方判断原则是一条从轻到重的光谱：任务长度、执行路径能否提前写清、上下文有界还是大文件大数据、对可预测性的要求、延迟与费用承受度。迁移 = 重新架构（先定义任务、边界、评估标准，再把 topics / flows / 变量映射到 instructions、skills、tools、workflows、memory）。判断示例：企业内部"基于知识库文章带引用回答"→ Standard。

### Claim: "能否被应用同步调用"对所有 harness 都是否（2026-10 实测四种）——这一维不再区分选项，只决定集成方式（workflow 异步中转，或让人直接用 agent）

- **来源**：[[Copilot-Managed-Runtime系列10：调用Copilot-Studio-Agent为何走不通]]、[[Copilot-Studio系列07：如何确认是Agent在回答]]、[[Copilot-Managed-Runtime系列12：方案回顾与Connector接入清单]]
- **首次出现**：2026-10-28
- **最近更新**：2026-10-29
- **置信度**：0.8
- **状态**：active

> 最初 CS03 判为"要被应用程序化调用只能选 Standard"，10-28 复测推翻：Standard 的 Connector 动作要求回调地址、草稿 agent 被 CORS 拦下；Standard 与 Copilot Chat 发布后经 Work IQ 传 `agentId` 都被忽略；GitHub Copilot harness 三层堵死；Customer Conversation 渠道被 CSP 挡住（推断）。所以选型维度稳定为"任务重量 / 计费 / 运行时"三项，调用入口降为集成约束。

### Claim: 各 harness 放进"harness 自己搭还是现成 × runtime 自己运营还是托管"矩阵并不在同一格——Microsoft Copilot harness（原 GitHub Copilot harness）是现成 harness + 平台托管沙箱；2026-10 列出的 Copilot Chat 严格说不是独立 harness，官方现已不单列

- **来源**：[[Agent基础设施系列04：Framework层与三层串联]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.65
- **状态**：active

> （以下是 2026-10 四种口径下的分格；现行三种里 GitHub Copilot 一格对应 Microsoft Copilot harness，Copilot Chat 一格不再单列。）Standard：前身 PVA 的经典运行时，按 topics 与分支走，平台托管只能配置，接近确定性 workflow。GitHub Copilot：Agentic Runtime 上的自主 loop，带 Bash 容器与文件系统，与把 Claude Code 作为 kagent AgentHarness 跑进沙箱是同一形态，只是 runtime 由微软运营。Copilot Chat：往 M365 Copilot 编排器里加指令、知识与动作。Customer Conversation：联络中心场景的专用托管 harness。四种定义都存在 Dataverse，执行分在三套服务，所以不能互转——"选 harness 即选 runtime"的直接体现。组合用法：GitHub Copilot harness 后台定时做重活、Standard agent 前台答用户，与"framework 搭外层确定性流程、其中一步交给 harness"同一思路。

## 冲突与演进

- 2026-11-24：/revalidate——按官方 harnesses-overview 修订：现列三种 harness（Microsoft Copilot、Customer Conversation、Standard），背景加现行口径说明，"New agent 默认 harness"一条修订；四种口径下的选项与实测保留作记录。
- 2026-11-24：按用户要求统一口径——背景、选项、决策结论、验证状态与三条 Claim 标题改为三种 harness：GitHub Copilot 改称 Microsoft Copilot harness（职责对应），Copilot Chat 移出现行选项并保留 2026-10 的记录；2026-10 实测结论注明当时是四种。

## 关联概念

- [[agent-harness]] — `uses` Copilot Studio 里怎么选 harness
- [[agent-platform]] — `uses` 托管 platform 上的不可逆选择
- [[harness-engineering]] — `extends` 产品内多 harness 并存的实例：定义在同一处、执行在三套服务里、建后不能互转
- [[foundry-agent-type-selection]] — `contrasts` 同为微软 agent 选型，Foundry 以 Runtime 归属为主线，Copilot Studio 以任务重量为主线

## 关联方法

（暂无）

## 来源

- [[Copilot-Studio系列03：四种Harness对比与选型]] — 四种 harness、菜单对照、按重量选、调用边界、沙箱已知与未知
- [[Copilot-Studio系列07：如何确认是Agent在回答]] — Copilot Chat 声明式 agent 对照
- [[Copilot-Studio系列08：把文章库发布成Teams知识库Agent]] — Standard 知识库 agent 的完整落地
- [[Copilot-Managed-Runtime系列05：在应用里调用AI的几条路]] — GitHub Copilot harness 三层被堵
- [[Copilot-Managed-Runtime系列10：调用Copilot-Studio-Agent为何走不通]] — 四种 harness 都调不到
- [[Foundry-Agent与Copilot-Studio的选型]] — 与 Foundry Agent 的层级对比
- [[Agent基础设施系列04：Framework层与三层串联]] — 四种 harness 在三层锁定矩阵中的位置（2026-11-02）
