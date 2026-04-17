---
title: "话轮转换（Turn-Taking）"
created: "2026-04-17"
updated: "2026-04-17"
tags:
  - wiki
  - concept
  - speech
  - voice-agent
  - realtime
  - conversation
aliases:
  - "话轮转换"
  - "Turn-Taking"
  - "话轮管理"
related:
  - "[[voice-activity-detection]]"
  - "[[voice-live-agent]]"
  - "[[speech-technology-stack]]"
---

# 话轮转换（Turn-Taking）

## 摘要

Turn-Taking（话轮转换）是语音 Agent 中"最被低估也最关键"的技术，决定了对话是否"自然"——什么时候该听、什么时候该说、什么时候该打断。它不等于端点检测（"用户停了我就说"），而是一个包含预测、决策和执行的复合机制。

在级联流水线架构中，Turn-Taking 是独立模块（可配置）；在端到端架构（如 GPT-4o Realtime）中，Turn-Taking 融合在模型内部，成为不可替换的内部能力。

## Claims

### Claim: Turn-Taking 不等于端点检测

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 常见误解："用户停了 → 我说话"。正确理解：Turn-Taking 包含预测性机制（预判用户是否说完）和反应性机制（检测到停顿后决策），二者协同工作。

### Claim: Turn-Taking 是语音 Agent 的核心难题

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> Turn-Taking 是语音 Agent 中"最被低估也最关键"的技术。它决定了对话是否自然——错误的话轮切换会导致打断用户或无法及时回应。

### Claim: 端到端架构将 Turn-Taking 内化为模型能力

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 级联系统中 Turn-Taking 是可替换模块；GPT-Realtime 中 Turn-Taking 融合在模型内部，无法单独替换。判断标准："它能不能被单独替换？能 → 模块，不能 → 模型内部能力。"

## 冲突与演进

- 2026-04-11：首次系统定义 Turn-Taking 的深层机制。

## 关联概念

- [[voice-activity-detection]] — `contrasts` VAD 检测语音存在，Turn-Taking 决定何时切换话轮
- [[voice-live-agent]] — `uses` Voice Agent 的对话自然度依赖 Turn-Taking 质量
- [[speech-technology-stack]] — `part-of` Turn-Taking 是 Core Processing 层的关键组件
- [[cascaded-pipeline]] — `uses` 级联流水线中 Turn-Taking 是独立可配置模块

## 来源日记

- [[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]] — Section 四 Turn-Taking 深度解析
- [[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]] — Turn Detection 与 Azure VAD 对比
