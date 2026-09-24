---
title: "Speech Technology Stack"
created: "2026-04-13"
updated: "2026-09-25"
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
  - "[[intelligent-dictation]]"
  - "[[realtime-protocol-selection]]"
  - "[[voice-live-agent]]"
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
- **状态**：stale

> Speech In（VAD、降噪、回声消除、AGC）→ Core Processing（ASR、LLM 推理、Turn-Taking）→ Speech Out（TTS、流式合成）。

### Claim: 基础能量 VAD 无法区分思考停顿和说完了

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 500ms 静音触发 false end-of-turn，但用户可能只是在思考。

### Claim: VAD barge-in 支持对自然对话体验至关重要

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 用户说话时打断 Agent 语音输出。Silero VAD（2MB 模型，< 1ms per 32ms audio chunk）实现 IDLE-LISTENING-PROCESSING-SPEAKING 状态机。

### Claim: Speech Out 层核心是 G2P 转换与发音控制体系

- **来源**：[[Speech-Out深入——Grapheme、Phoneme、G2P、Lexicon与SSML的工程解析]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.7
- **状态**：stale

> TTS Pipeline 内部六层：Text Normalization → Lexicon Lookup → G2P → Prosody Prediction → Acoustic Model → Vocoder。发音控制三级优先级：SSML（局部 override）> Lexicon（全局规则）> G2P（兜底推断）。

### Claim: 音频前处理链有严格执行顺序

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.8
- **状态**：stale

> AEC → ANS → AGC+Limiter → VAD → 干净语音帧。AEC 在最前面（自适应滤波器需原始信号幅度），AGC 在 ANS 之后（避免放大噪声）。

### Claim: Semantic VAD 本质是 Turn-Taking Policy 的接口壳而非独立 VAD 模块

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.8
- **状态**：stale

> eagerness 参数实际调整的是模型内部 policy threshold / reward tradeoff，而非传统 VAD 参数。Semantic VAD 不可用第三方 VAD 替换，它是 GPT-4o 内部 turn-taking 能力的对外暴露接口。

### Claim: 语音输入产品经历三代范式演进——从准确转录到智能听写

- **来源**：[[Typeless深度解析——AI语音输入如何超越传统Speech-to-Text]]
- **首次出现**：2026-05-20
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：stale

> 第一代 Accurate Transcription（Azure Speech、Google STT——WER 优化）→ 第二代 Smart Transcription（Whisper、AssemblyAI——更好的标点/段落/多语言）→ 第三代 Intelligent Dictation（Typeless、Wispr Flow——LLM 后处理、语义重组、场景适配）。底层 ASR 已"够用"（Whisper WER 7.6%），产品差异化在 L2-L6 上层。

### Claim: 音量包络驱动是"简化口型同步"与"精细口型同步"的分界——只认音量不认发音

- **来源**：[[Blender系列04：人物面试动画实战——47骨骼程序化表演、TTS配音与音量包络口型同步]]
- **首次出现**：2026-09-07
- **最近更新**：2026-09-12
- **置信度**：0.75（实测实现 + 局限逐项分析）
- **状态**：active

> 简化口型同步的可复用实现：对每句音频按 60 Hz 计算音量包络（48 kHz 采样、每窗 800 采样求 RMS），用**第 88 百分位做自适应参考值**（不同声音音量不同，不能用固定阈值），减底噪门限归一到 0–1，再做 `**0.75` 幂次压缩（让小音量也有可见开口）；渲染端在每个视频帧对 60 Hz 包络线性插值驱动嘴部形态键（60 Hz → 24 fps）。效果与局限都清晰：说话张合、停顿回落、各角色各随自己的台词——但**只认音量不认发音**，"b/p/m"的闭唇、"哦"的圆唇它都不知道，强音不一定张大嘴。这就是分界线：精细口型必须走 viseme/面部系数路线（与最终音频对齐的时间轴数据），且渲染端要有对应控制面——只有三个形态键的角色接 55 项 BlendShapes 不叫精细同步。工程验收口径：24 fps 一帧约 41.7 毫秒，先把关键闭唇与可听辅音的偏移控制在 1–2 帧内（这是验收目标，不是人类感知阈值，也不是 API 精度保证）。

### Claim: 检测器与策略开关的分离在 Voice Live schema 中显式化——"Semantic VAD 是 Turn-Taking Policy 接口壳"的生产级续证

- **来源**：[[Voice Live系列06：轮次控制的五道关卡——create_response、response.create与Model、Agent模式的控制权归属]]
- **首次出现**：2026-09-23
- **最近更新**：2026-09-25
- **置信度**：0.8
- **状态**：active

> `turn_detection` 是跨层混合对象：检测器参数（`threshold`/`prefix_padding_ms`/`silence_duration_ms`/`end_of_utterance_detection`）归 Speech 层，行为策略开关（`create_response`/`interrupt_response`/`auto_truncate`）归编排层——`server_vad` 下行为开关确实只有 `create_response` 一个。这把本页"Semantic VAD 本质是 Turn-Taking Policy 的接口壳"（04-30）从分析推断升级为产品 schema 层面的显式分离证据。注意本页三层技术栈（Speech In / Core / Speech Out，功能流水线切分）与 VL06 三层归属（Speech 层/编排层/LLM 层，控制权切分）是不同切分轴，互为 extends 不冲突。


### Claim: AEC 的参考信号从哪来是数字人场景的隐藏维度——服务端默认参考失配，需 Live-Reference AEC

- **来源**：[[Voice Live系列07：重复致谢排查——三次Thank you的三个开轮来源、转写指纹与编排层修法]]
- **首次出现**：2026-09-24
- **最近更新**：2026-09-25
- **置信度**：0.8
- **状态**：active

> `server_echo_cancellation` 默认用服务端自发音频作参考、并假设客户端即时播放（播放延迟 >2s 质量下降）；带 avatar 时用户实际听到的是 WebRTC 视频流音轨而非 WebSocket audio delta——路径与时序都对不上，导致数字人语音被麦克风拾回、转写成"复述自己的话"再触发开轮。修法：Live-Reference AEC（`reference_source: client` + `channels: 2`，客户端把实际播放的音频作第二声道上传作参考）。它是"听"关的 Speech 层参数，与编排层修法（线性轮次）正交可同时做——本页"音频前处理链 AEC→ANS→AGC→VAD 严格顺序"Claim 补上"参考信号来源"维度。

## 冲突与演进

- 2026-09-12：注入音量包络口型同步 Claim（Blender 系列04 实测）——Speech Out 层新增"音频信号直接驱动动画"的实现档与简化/精细分界判据，页面 active 证据回填。

## 关联概念

- [[viseme]] — `produces` Speech Out/TTS 环节输出 viseme 时间轴驱动下游口型渲染
- [[end-of-turn-detection]] — `part-of` 判停精度环节：静音阈值→文本语义→音频原生三代方法

- [[voice-live-agent]] — `part-of` 语音技术栈服务于 Voice Live Agent
- [[intelligent-dictation]] — `produces` 语音技术栈 L1 之上的产品层演进
- [[realtime-protocol-selection]] — `uses` 语音技术栈的传输层依赖协议选型

## 来源日记

- [[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]] — 技术全景
- [[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]] — VAD barge-in
- [[Speech-Out深入——Grapheme、Phoneme、G2P、Lexicon与SSML的工程解析]] — Speech Out 层 G2P 深入分析
- [[Typeless深度解析——AI语音输入如何超越传统Speech-to-Text]] — 语音输入三代演进与智能听写
- [[Blender系列04：人物面试动画实战——47骨骼程序化表演、TTS配音与音量包络口型同步]] — 音量包络口型同步实现与简化/精细分界
