---
title: "Foundry Agent 三类型选型：Prompt / Hosted / Workflow"
created: "2026-07-21"
updated: "2026-08-16"
tags:
  - wiki
  - decision
  - agent
  - azure
decision_status: "active"
related_concepts:
  - "[[voice-live-agent]]"
---

# Foundry Agent 三类型选型：Prompt / Hosted / Workflow

## 背景

Azure AI Foundry 曾提供三种 Agent 形态：Prompt Agent（GA，Foundry 托管运行）、Hosted Agent（preview，自带代码跑在托管容器）、Workflow Agent（public preview，YAML 声明式编排）。**2026-08-16 更新**：Workflow Agent 已于 2026-12-01 退役（官方类型收窄为 Prompt / Hosted 二元），选型框架主线相应改为二元；详见下方选项 C 标注与新增 Claim。构建企业 Agent 时需要在（现二元的）Prompt 与 Hosted 之间选型，决策影响运行时控制力、治理能力（内容安全）、运维成本与语音等周边能力的组合方式。

## 选项分析

### 选项 A: Prompt Agent（GA）

- **优势**：零运维，Foundry 负责 Runtime；治理最全——Prompt Shield / Content Filter 等内容层防护内置；与 Voice Live 挂载（`agent_id` 绑定）是官方支持路径
- **劣势**：逻辑受限于 instructions + tools 声明式表达，无法运行自定义代码循环
- **适用条件**：约 80% 的常规场景（知识问答、工具调用、RAG 类）

### 选项 B: Hosted Agent（preview）

- **优势**：完全控制 Agent Runtime（自带框架如 LangGraph/AutoGen，容器内任意代码）；支持三种协议入口（`/responses`、`/invocations`、`/invocations_ws`）
- **劣势**：内容层治理自理（Prompt Shield 等不内置）；硬约束多——1MB 帧上限、30min 连接上限、15min idle 断连、2vCPU、无 WebRTC、无 PSTN；preview 阶段
- **适用条件**：需要自定义推理循环 / 已有框架代码要迁移 / 多模型编排等 7 条 Hosted 信号

### 选项 C: Workflow Agent（public preview）

> ⚠️ **superseded（2026-08-16）**：Workflow Agent 已于 **2026-12-01 退役**，官方 Agent 类型收窄为 Prompt / Hosted 二类；本选项及其"多 Agent 固定流程"适用条件不再成立，仅保留为历史记录。编排责任下沉到 Hosted Agent 内的 harness/Agent Framework workflow orchestrations + A2A 协议 + Skills（见下方新增 Claim 与来源）。

- **优势**：YAML 声明式多 Agent 编排，流程可审计
- **劣势**：表达力受编排 DSL 限制，复杂逻辑仍需下沉到子 Agent
- **适用条件**：多 Agent 固定流程编排场景（⛔ 已随 Workflow Agent 退役失效）

## 决策结论

- **选择**（2026-08-16 修订为二元）：以"是否需要自己控制 Agent Runtime"为唯一主线做选型——不需要则默认 Prompt Agent，需要（含原 Workflow Agent 承接的多 Agent 固定流程场景）则上 Hosted Agent，多 Agent 编排靠 Hosted 内 harness/Agent Framework workflow orchestrations + A2A 协议 + Skills 承接
- **理由**：两者差异的本质不是能力多少，而是 Runtime 归属；80/20 规则下大多数场景 Prompt Agent 足够且治理最全
- **放弃理由**：不以"功能清单对比"选型——身份层两者同源（Entra Agent ID blueprint + per-agent Service Principal），真正分水岭在内容层（Prompt Shield/Content Filter 仅 Prompt Agent 内置），逐功能对比会掩盖这条主线
- **前提假设**：Hosted 仍在 preview，GA 后硬约束（帧上限、连接时长、vCPU）可能放宽，届时需复核。~~Workflow 相关前提~~已随退役失效，不再需要复核

## 影响范围

- **受影响的概念**：[[voice-live-agent]]——Voice Live 与两类 Agent 的组合方向相反
- **受影响的方法**：（暂无）

## 验证状态

- **验证方式**：官方文档核对 + 实际项目选型验证
- **当前状态**：文档验证（基于官方文档与产品页逐条核对），自身项目实践待补充
- **验证证据**：[[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]]

## Claims

### Claim: 选型主线唯一——是否需要自己控制 Agent Runtime

- **来源**：[[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：active

> Prompt Agent 由 Foundry 跑，Hosted Agent 由你在容器里跑，Workflow Agent 是 YAML 编排壳。所有选型问题都可归结为 Runtime 归属：不需要控制 Runtime → Prompt（80% 场景）；命中 7 条 Hosted 信号（自定义推理循环、已有框架代码、多模型编排等）→ Hosted；多 Agent 固定流程 → Workflow。

### Claim: 治理分层——身份层三者同源，分水岭在内容层

- **来源**：[[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：active

> 治理四层（身份/内容/审计/成本）中，身份层三类 Agent 完全同源：都走 Entra Agent ID（blueprint + per-agent Service Principal），Hosted 的身份层不弱反强（容器内代码也用同一身份体系）。真正的治理分水岭在内容层：Prompt Shield / Content Filter 仅 Prompt Agent 内置，Hosted Agent 内容安全完全自理。"Hosted 治理弱"的笼统说法是错的，必须分层说。

### Claim: Voice Live 与两类 Agent 的组合方向相反

- **来源**：[[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：active

> Prompt Agent 组合语音：Voice Live 在外持有语音层，通过 `agent_id` 把 Agent 挂进来（语音在外，Agent 在内）。Hosted Agent 组合语音：走 `/invocations_ws` 协议，语音处理进容器（语音在内）。用 Voice Live `agent_id` 直连 Hosted Agent 属未定义行为，官方未支持。

### Claim: Hosted Agent 有一组不可忽视的硬约束

- **来源**：[[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：active

> WebSocket 帧上限 1MB、单连接上限 30min、idle 15min 断连、容器 2vCPU、无 WebRTC、无 PSTN。语音重、长会话、电话场景在 Hosted 上会直接撞墙，选型时必须先过这张硬约束表。

### Claim: Skill 支持是 Runtime 归属主线的新证据——Prompt Agent 文档级矛盾，根因是 harness 控制权

- **来源**：[[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> agents overview 给 Prompt Agent 标 "Skill support: Yes"，但三条绑定路径（toolbox 挂 skill 的 MCP Resources 消费 / 直接注入 / Responses API shell tool）截至 2026-07-31 复核没有一条文档化可走通——skills 功能矩阵压根没有 prompt agent 列。根因不是执行环境（Agents 侧 skill 是纯文本，加载只需"读文本拼进 system prompt"），而是 **harness 实现权**：skill 加载（SEP-2640 + progressive disclosure）需要 harness 实现 client 逻辑，Prompt Agent 的托管 harness 是平台封闭代码，它没实现你就没有注入点；Hosted Agent 自己写或用 Agent Framework `AgentSkillsProvider`。这把本决策"Runtime 归属唯一主线"延伸到了 skill 能力域。

### Claim: 成本模型——调用侧计费两类相同，container compute 买的是"改 harness 的权力"

- **来源**：[[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> 两类 agent 最终都打到同一个 Responses API：inference + tool usage 单价完全相同。差异在消耗量的控制权——Prompt Agent 每次注入什么由平台 harness 决定，无法优化 token 消耗；Hosted Agent 可做上下文裁剪、prompt 缓存、模型路由、按需加载 skill。Hosted 多付的 container compute 买的是 harness 控制权：skill 加载、token 优化、新协议即时跟进。选型判断标准应是"是否需要 harness 控制权"，而不只是"要不要多付钱"——scale-to-zero 让低流量场景该成本接近零。

### Claim: Workflow Agent 已于 2026-12-01 退役，官方类型收窄为 Prompt/Hosted 二元，编排责任下沉到 Hosted 内 harness + A2A + Skills

- **来源**：[[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]]
- **首次出现**：2026-07-31
- **最近更新**：2026-08-16
- **置信度**：0.85
- **状态**：active

> 官方明确 "Microsoft Foundry is retiring workflows on **December 1, 2026**"，禁止新的生产依赖，存量 workflow 有官方迁移指南。Workflow Agent 不再是官方 agent 类型，Foundry Agent 类型收窄为 Prompt / Hosted 二元；姊妹篇《Foundry Toolbox与Skills深度解析》同日（2026-07-31）确认这一变化。"编排层"这个维度本身没有消失，只是载体从托管产品换成了代码级机制：确定性多 Agent 协作收敛为三层组合——Microsoft Agent Framework 的 workflow orchestrations（代码级编排，可打包为 Hosted Agent 部署）+ A2A 协议（preview，agent 间委派的平台级标准通道）+ Skills（能力承接）。对本决策选项 C 的影响：其"多 Agent 固定流程编排"适用条件与"流程即 YAML 天然可审计"优势均失效，标 `superseded`；选型框架主线从三选一收窄为二元（Prompt vs Hosted），原 Workflow 场景并入 Hosted 判断。

## 冲突与演进

- **2026-08-16**：源文章《Foundry Agent 全面对比》2026-07-31 修订确认 Workflow Agent 于 2026-12-01 退役，官方类型收窄为 Prompt/Hosted 二元（姊妹篇《Foundry Toolbox与Skills深度解析》同日确认）。本决策页据此修订：① 选项 C 标注 `superseded`；② 选型框架主线由三选一改为二元；③ 新增 Claim 记录退役事件与编排责任下沉路径（Hosted 内 harness/Agent Framework + A2A + Skills）；④ `decision_status` 保持 `active`（决策主线本身未被推翻，仅选项集收窄）。

## 关联概念

（暂无）

## 关联方法

（暂无）

## 来源

- [[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]] — 三类型能力、治理与场景选型全景（2026-07-19）
- [[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]] — Skill 支持文档矛盾、harness 控制权、成本模型（2026-07-30）
