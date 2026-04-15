---
title: "OpenClaw Agent Gateway"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - agent
  - gateway
  - architecture
aliases:
  - "OpenClaw"
  - "claw0"
  - "Agent 网关"
related:
  - "[[agent-loop-architecture]]"
  - "[[skill-hub-ecosystem]]"
---

# OpenClaw Agent Gateway

## 摘要

OpenClaw / claw0 是一个教学级 Agent 网关架构，揭示了生产级 Agent 系统的五个递进阶段：基础循环 + 工具 → 网络层（session + channel + routing）→ 智能层（8 层 prompt 组装 + 混合记忆）→ 自主层（heartbeat + 可靠投递）→ 生产硬化（retry onion + 并发车道）。Agent 本质上是一个循环，模型通过 stop_reason 决定何时停止。

## Claims

### Claim: Agent 本质上是一个循环，不是单次推理

- **来源**：[[OpenClaw架构解读——从claw0教学仓库理解AI Agent网关的核心设计]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 模型通过 stop_reason 决定何时停止，工具调用是简单 dispatch table（name-to-function mapping）。这种简洁性常被框架抽象掩盖。

### Claim: 生产 Agent 网关需要五个递进阶段

- **来源**：[[OpenClaw架构解读——从claw0教学仓库理解AI Agent网关的核心设计]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 基础循环 + 工具 → 网络层 → 智能层（8 层 prompt 组装 + 混合记忆）→ 自主层 → 生产硬化。

### Claim: Channel、Peer、Session 是三个常混淆的不同概念

- **来源**：[[OpenClaw架构解读——从claw0教学仓库理解AI Agent网关的核心设计]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> Channel = 平台（Telegram, Slack），Peer = 通信端点身份，Session = 会话状态容器。

## 冲突与演进

（暂无）

## 关联概念

- [[agent-loop-architecture]] — `uses` Agent 网关的核心仍是 Agent Loop
- [[skill-hub-ecosystem]] — `part-of` OpenClaw 也是 Skill Hub 生态的一部分
- [[openclaw-five-stage-gateway]] — `produces` 实施方法：五阶段网关建设的详细步骤

## 来源日记

- [[OpenClaw架构解读——从claw0教学仓库理解AI Agent网关的核心设计]] — claw0 架构解读
