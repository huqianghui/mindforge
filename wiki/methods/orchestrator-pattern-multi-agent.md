---
title: "Orchestrator Pattern（多 Agent 编排模式）"
created: "2026-05-07"
updated: "2026-05-07"
tags:
  - wiki
  - method
  - multi-agent
  - orchestration
  - openclaw
method_type: "architecture-pattern"
related_concepts:
  - "[[openclaw-agent-gateway]]"
  - "[[hermes-agent]]"
  - "[[agent-loop-architecture]]"
related_methods:
  - "[[openclaw-five-stage-gateway]]"
---

# Orchestrator Pattern（多 Agent 编排模式）

## 摘要

Orchestrator Pattern 是 OpenClaw 多 Agent 协作的核心架构模式：通过指定一个 Orchestrator Agent（编排者）来分解任务、spawn 子 Agent 并行执行、收集结果后综合输出。关键设计决策是**Gateway 不参与任务编排**——编排逻辑完全由一个普通 Agent Node 通过 `sessions_spawn` 工具实现。这种"编排者也是 Agent"的设计使系统保持灵活性，避免了将编排逻辑硬编码在基础设施层。

## 适用条件

- **前置依赖**：OpenClaw Gateway + 至少 2 个 Agent Node；或任何支持 Agent 内 spawn 子 Agent 的框架
- **适用场景**：任务可分解为多个独立子任务并行执行；需要不同专业化 Agent 协作；需要成本优化（主 Agent 用强模型，子 Agent 用轻模型）
- **不适用场景**：任务是严格串行的（无法并行化）；单 Agent 已足够处理；延迟敏感场景（spawn 有开销）

## 步骤

### Step 1: 定义 Agent 角色与 Skill 映射

- **输入**：任务需求分析
- **操作**：为每个子任务类型创建专门的 Agent 配置（system prompt + skills + model）。定义 Orchestrator 的 routing rules（skill-based routing）
- **输出**：`openclaw-team.yaml` 或等效配置文件
- **判断标准**：每个 Agent 的职责清晰无重叠，routing rules 覆盖所有子任务类型

### Step 2: Orchestrator 接收并分解任务

- **输入**：用户请求
- **操作**：Orchestrator Agent 通过 system prompt 指导，分析任务并确定需要哪些子任务、可并行的子任务组
- **输出**：子任务列表 + 执行计划
- **判断标准**：子任务之间依赖关系明确，可并行的已标识

### Step 3: Spawn 子 Agent 并行执行

- **输入**：子任务列表
- **操作**：Orchestrator 调用 `sessions_spawn`（非阻塞）为每个子任务创建独立 session。可指定 agent-id、model、timeout、sandbox 等参数
- **输出**：`{ status: "accepted", runId, childSessionKey }` 对每个子任务
- **判断标准**：所有子 Agent 已启动，无 spawn 失败

### Step 4: 监控与收集结果

- **输入**：运行中的子 Agent sessions
- **操作**：通过 `sessions_list` 监控状态，通过 `sessions_result` / `sessions_history` 收集完成的子任务结果
- **输出**：各子任务的执行结果集合
- **判断标准**：所有子任务完成或超时

### Step 5: 综合结果输出

- **输入**：所有子任务结果
- **操作**：Orchestrator 综合所有结果，生成统一的最终报告/响应
- **输出**：用户可见的最终输出
- **判断标准**：结果完整覆盖原始任务需求

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| 子任务间完全独立 | 全部并行 spawn | 最大化吞吐 |
| 子任务有依赖（B 依赖 A 的输出） | 串行 spawn（A 完成后再 spawn B） | 保证数据依赖 |
| 子任务 > maxConcurrent | 分批 spawn | 避免超出全局并发上限 |
| 需要成本优化 | 子 Agent 用 cheaper model | Sub-agent 用 gpt-4o-mini 降本，主 Agent 保持强模型 |
| 嵌套深度需求 | 设置 maxSpawnDepth=2 | 允许 Orchestrator 子 Agent 再 spawn worker（推荐最深 2 层） |

## Claims

### Claim: OpenClaw Gateway 不参与任务编排，编排完全由 Orchestrator Agent 负责

- **来源**：[[hermes-agent-vs-openclaw]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.8
- **状态**：stale

> Gateway 是纯通讯层（消息路由 + 心跳 + WebSocket），不做任何任务分解或调度决策。编排逻辑由用户指定的 Orchestrator Agent（一个普通 Node）通过 sessions_spawn 工具实现。来源：OpenClaw 官方 Sub-agents 文档 + Meta Intelligence 技术分析。

### Claim: OpenClaw 支持嵌套 Sub-Agent（最深 5 层，推荐 2 层）

- **来源**：[[hermes-agent-vs-openclaw]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.8
- **状态**：stale

> maxSpawnDepth 范围 1-5，默认 1（不允许嵌套）。设为 2 时 Orchestrator 获得 sessions_spawn 权限可 spawn worker。Depth 2 的 leaf worker 无 session 工具，不能再 spawn。每 session 最多 5 个活跃子 Agent（maxChildrenPerAgent），全局并发上限默认 8。来源：OpenClaw 官方文档 docs.openclaw.ai/tools/subagents。

### Claim: sessions_spawn 是非阻塞调用，立即返回 accepted 状态

- **来源**：[[hermes-agent-vs-openclaw]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.8
- **状态**：stale

> `sessions_spawn` 始终非阻塞，返回 `{ status: "accepted", runId, childSessionKey }`。Orchestrator 通过 sessions_list 监控和 sessions_result 收集结果。这种设计使编排者可以发出多个并行 spawn 而不必等待。

## 实践记录

（暂无实践记录）

## 关联概念

- [[openclaw-agent-gateway]] — `implements` Orchestrator Pattern 是 OpenClaw 多 Agent 能力的核心实现方式
- [[hermes-agent]] — `contrasts` Hermes 采用单体 + 子代理模式，而非 Orchestrator Pattern
- [[agent-loop-architecture]] — `extends` 在单 Agent Loop 基础上扩展为多 Agent 协作

## 关联方法

- [[openclaw-five-stage-gateway]] — `extends` 五阶段网关的"自主层"为 Orchestrator Pattern 提供基础

## 来源

- [[hermes-agent-vs-openclaw]] — Hermes Agent vs OpenClaw 深度技术对比文章
