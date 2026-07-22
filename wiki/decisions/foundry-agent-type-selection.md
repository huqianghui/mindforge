---
title: "Foundry Agent 三类型选型：Prompt / Hosted / Workflow"
created: "2026-07-21"
updated: "2026-07-21"
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

Azure AI Foundry 提供三种 Agent 形态：Prompt Agent（GA，Foundry 托管运行）、Hosted Agent（preview，自带代码跑在托管容器）、Workflow Agent（public preview，YAML 声明式编排）。构建企业 Agent 时需要在三者之间选型，决策影响运行时控制力、治理能力（内容安全）、运维成本与语音等周边能力的组合方式。

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

- **优势**：YAML 声明式多 Agent 编排，流程可审计
- **劣势**：表达力受编排 DSL 限制，复杂逻辑仍需下沉到子 Agent
- **适用条件**：多 Agent 固定流程编排场景

## 决策结论

- **选择**：以"是否需要自己控制 Agent Runtime"为唯一主线做选型——不需要则默认 Prompt Agent，需要才上 Hosted Agent，多 Agent 固定流程加 Workflow Agent
- **理由**：三者差异的本质不是能力多少，而是 Runtime 归属；80/20 规则下大多数场景 Prompt Agent 足够且治理最全
- **放弃理由**：不以"功能清单对比"选型——身份层三者同源（Entra Agent ID blueprint + per-agent Service Principal），真正分水岭在内容层（Prompt Shield/Content Filter 仅 Prompt Agent 内置），逐功能对比会掩盖这条主线
- **前提假设**：Hosted / Workflow 仍在 preview，GA 后硬约束（帧上限、连接时长、vCPU）可能放宽，届时需复核

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

## 关联概念

- [[voice-live-agent]] — `grounds` Voice Live 挂载机制是本决策"组合方向"分析的语音侧依据

## 关联方法

（暂无）

## 来源

- [[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]] — 三类型能力、治理与场景选型全景（2026-07-19）
