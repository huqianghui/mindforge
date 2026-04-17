---
title: "级联流水线（Cascaded Pipeline）"
created: "2026-04-17"
updated: "2026-04-17"
tags:
  - wiki
  - concept
  - architecture
  - voice-agent
  - speech
  - realtime
aliases:
  - "级联流水线"
  - "Cascaded Pipeline"
  - "级联管线"
related:
  - "[[voice-live-agent]]"
  - "[[speech-technology-stack]]"
  - "[[turn-taking]]"
---

# 级联流水线（Cascaded Pipeline）

## 摘要

级联流水线（Cascaded Pipeline）是实时语音 Agent 的经典架构模式：VAD → Turn Detection → STT → Agent/LLM → Response Planning → TTS → Audio Output。每个环节是独立可替换的模块，通过流式传输 + 流水线并行实现低延迟。

与端到端（End-to-End）架构相对，级联流水线在可控性、可调试性和模块可替换性上具有优势，但面临延迟累积和错误级联的挑战。论文论证其为"实时交互系统的本质结构"而非过渡方案。

## Claims

### Claim: 级联流水线是实时交互系统的本质结构

- **来源**：[[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]]
- **首次出现**：2026-04-06
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 即使 Level 1 端到端模型（如 GPT-4o Realtime），在企业场景中仍然需要级联结构——因为企业需要可审计性、模块可替换性、和对每个环节的独立监控。级联流水线不是"过渡方案"，而是企业实时系统的长期架构选择。

### Claim: 判断模块化的标准——能否单独替换

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-17
- **置信度**：0.9
- **状态**：active

> 看到一个"能力"时，问自己："它能不能被单独替换？" 能 → 这是一个模块（级联流水线）。不能 → 这是模型内部能力（端到端架构）。

### Claim: 级联失败是 Harness Engineering 出现的核心驱动力

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-02
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 单步 95% 成功率在 10 步串联后只剩 60%（0.95^10 ≈ 0.60）。级联失败不仅是语音架构的问题，也是所有多步 Agent 系统的通用挑战。

## 冲突与演进

- 2026-04-06：论文论证级联流水线是企业场景的长期架构选择。
- 2026-04-11：补充模块化判断标准。

## 关联概念

- [[voice-live-agent]] — `implements` Voice Live Agent 基于级联流水线构建
- [[speech-technology-stack]] — `part-of` 级联流水线是 Speech 三层栈的组织形式
- [[turn-taking]] — `uses` Turn Detection 是级联流水线的关键环节
- [[harness-engineering]] — `grounds` 级联失败驱动了 Harness Engineering 的出现

## 来源日记

- [[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]] — Section 七 级联流水线完整架构
- [[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]] — Section 三 级联 vs 端到端两种架构路线
