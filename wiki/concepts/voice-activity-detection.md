---
title: "Voice Activity Detection"
created: "2026-04-11"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - speech
  - voice
  - vad
aliases:
  - "VAD"
  - "语音活动检测"
related:
  - "[[voice-live-agent]]"
  - "[[speech-technology-stack]]"
---

# Voice Activity Detection

## 摘要

Voice Activity Detection（VAD）是实时语音交互中判断用户是否在说话的关键技术。现代实现分为两类：传统的 Server VAD（基于静音检测）和新一代 Semantic VAD（基于语义分类器）。两者在打断灵敏度、延迟和适用场景上有明显差异。

## Claims

### Claim: OpenAI 提供两种 VAD 模式——Server VAD（静音检测）和 Semantic VAD（语义分类器）

- **来源**：[[2026-04-11-周六]]、[[2026-04-12-周日]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-12
- **置信度**：0.8
- **状态**：active

> OpenAI Realtime API 提供两种 VAD 模式：Server VAD 基于静音检测，可调参数包括 threshold、prefix_padding、silence_duration；Semantic VAD 使用语义分类器，通过 eagerness 参数控制打断灵敏度。参考：OpenAI Realtime VAD Guide。Azure 也有对应的 Semantic VAD vs Basic Server VAD。

### Claim: 基础能量 VAD 无法区分思考停顿和说完了

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 500ms 静音触发 false end-of-turn，但用户可能只是在思考。Semantic VAD 通过语义分类器解决此问题。

### Claim: Silero VAD 实现轻量级高效 VAD

- **来源**：[[Voice-Live-Agent实现架构——从级联流水线到Azure-Voice-Live-API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 2MB 模型，< 1ms per 32ms audio chunk，实现 IDLE-LISTENING-PROCESSING-SPEAKING 状态机，支持 barge-in。

## 冲突与演进

（暂无）

## 关联概念

- [[voice-live-agent]] — `part-of` Voice Live Agent 依赖 VAD 实现语音交互
- [[speech-technology-stack]] — `part-of` VAD 是 Speech 技术栈的基础组件

## 来源日记

- [[2026-04-11-周六]] — Speech 相关技术调研中的 VAD 部分
- [[2026-04-12-周日]] — 追踪任务延续
