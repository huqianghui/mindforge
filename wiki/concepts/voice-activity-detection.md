---
title: "Voice Activity Detection"
created: "2026-04-11"
updated: "2026-04-30"
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

Voice Activity Detection（VAD）是实时语音交互中判断用户是否在说话的关键技术。现代实现分为两类：传统的 Server VAD（基于静音检测）和新一代 Semantic VAD（基于语义分类器）。深度学习 VAD 进一步分化为三条路径：Personal VAD（说话人条件化，13 万参数）、CNN+Attention VAD（时频双重注意力）、NAS-VAD（神经架构搜索，151K 参数，AUC 0.982）。Semantic VAD 本质只做 end-of-turn 检测，不等于打断能力——完整的 Voice Agent 打断需要 6 个组件协同。

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

### Claim: 深度学习 VAD 分化为三条路径——Personal VAD / CNN+Attention / NAS-VAD

- **来源**：[[VAD 技术全景——从噪声环境论文到工业级语义端点检测]]
- **首次出现**：2026-04-27
- **最近更新**：2026-04-30
- **置信度**：0.8
- **状态**：active

> Personal VAD（说话人条件化，约 13 万参数，三分类：非语音/目标/非目标）；CNN+Attention VAD（时频双重注意力，约 15 万参数即超越更大 CNN）；NAS-VAD（神经架构搜索，151K 参数，AUC 0.982，跨数据集泛化性强）。三者与云端 Semantic VAD 不是竞争关系而是互补的不同层次——声学 VAD 捕获语音帧，语义 VAD 调优切分时机。

### Claim: Semantic VAD 只做 end-of-turn 检测，不等于打断能力

- **来源**：[[VAD 技术全景——从噪声环境论文到工业级语义端点检测]]
- **首次出现**：2026-04-27
- **最近更新**：2026-04-30
- **置信度**：0.8
- **状态**：active

> Semantic VAD 本质只判断"用户这一轮说话什么时候结束"，不决定"要不要打断 AI"。打断 = VAD 事件（speech_started）+ Interrupt Controller + 流式 TTS 控制。eagerness 参数只调 end-of-turn 阈值，不控制打断行为。

### Claim: 完整 Voice Agent 打断需要 6 个必要组件协同

- **来源**：[[VAD 技术全景——从噪声环境论文到工业级语义端点检测]]
- **首次出现**：2026-04-27
- **最近更新**：2026-04-30
- **置信度**：0.8
- **状态**：active

> 6 个组件：Interrupt Controller（判断是否应打断）、Streaming ASR（实时转写区分意图）、Backchannel Filter（过滤"嗯/ok"等非打断信号）、可中断 TTS 流（mid-stream 停止）、Turn State Machine（IDLE→LISTENING→THINKING→SPEAKING→INTERRUPTED）、Latency 控制（ASR+网络+TTS 缓冲综合管理）。仅靠 Realtime API + Semantic VAD 不足以实现自然对话打断。

### Claim: VAD 与关键词唤醒（KWS）是互补不可替代的两种技术

- **来源**：[[VAD 技术全景——从噪声环境论文到工业级语义端点检测]]
- **首次出现**：2026-04-27
- **最近更新**：2026-04-30
- **置信度**：0.8
- **状态**：active

> VAD 检测"有无人声"（逐帧二值），KWS 检测"是否说了特定词"（事件触发）。VAD 无法替代 KWS——只用 VAD 会导致任何环境对话触发系统，功耗爆炸和隐私泄露。典型语音助手流水线：KWS（超低功耗 DSP 持续监听）→ VAD + ASR（主 CPU 激活后）→ Semantic VAD（云端判断说完没）。

## 冲突与演进

- 2026-04-30：VAD 论文深入分析后，摘要扩展为涵盖深度学习三条路径和 Semantic VAD ≠ 打断能力的关键区分。原有 Claims 仍有效，新 Claims 补充了更细粒度的技术路径和系统级打断机制。

## 关联概念

- [[voice-live-agent]] — `part-of` Voice Live Agent 依赖 VAD 实现语音交互
- [[speech-technology-stack]] — `part-of` VAD 是 Speech 技术栈的基础组件
- [[turn-taking]] — `extends` Semantic VAD 本质是 Turn-Taking Policy 的接口，打断需要完整 Turn State Machine
- [[cascaded-pipeline]] — `part-of` VAD 是级联流水线的第一个模块（KWS → VAD → ASR → LLM → TTS）

## 来源日记

- [[2026-04-11-周六]] — Speech 相关技术调研中的 VAD 部分
- [[2026-04-12-周日]] — 追踪任务延续
- [[2026-04-27-周日]] — VAD 论文精读，深度学习 VAD 三条路径、Semantic VAD ≠ 打断、KWS vs VAD
