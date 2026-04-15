---
title: "Speech Technology Stack"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - speech
  - asr
  - tts
  - turn-taking
aliases:
  - "语音技术栈"
related:
  - "[[voice-live-agent]]"
  - "[[voice-activity-detection]]"
---

# Speech Technology Stack

## 摘要

实时语音 Agent 涉及三层技术栈：Speech In（VAD、降噪、回声消除、AGC）、Core Processing（ASR、LLM 推理、Turn-Taking）、Speech Out（TTS、流式合成）。Turn-Taking 是最深层的技术挑战——基础能量 VAD 无法区分"思考停顿"和"说完了"。

## Claims

### Claim: 实时语音 Agent 涉及三层技术栈

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Speech In（VAD、降噪、回声消除、AGC）→ Core Processing（ASR、LLM 推理、Turn-Taking）→ Speech Out（TTS、流式合成）。

### Claim: 基础能量 VAD 无法区分思考停顿和说完了

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 500ms 静音触发 false end-of-turn，但用户可能只是在思考。

### Claim: VAD barge-in 支持对自然对话体验至关重要

- **来源**：[[Voice-Live-Agent实现架构——从级联流水线到Azure-Voice-Live-API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 用户说话时打断 Agent 语音输出。Silero VAD（2MB 模型，< 1ms per 32ms audio chunk）实现 IDLE-LISTENING-PROCESSING-SPEAKING 状态机。

## 冲突与演进

（暂无）

## 关联概念

- [[voice-live-agent]] — `part-of` 语音技术栈服务于 Voice Live Agent
- [[voice-activity-detection]] — `extends` VAD 是语音技术栈的关键组件

## 来源日记

- [[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]] — 技术全景
- [[Voice-Live-Agent实现架构——从级联流水线到Azure-Voice-Live-API]] — VAD barge-in
