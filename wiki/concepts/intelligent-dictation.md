---
title: "Intelligent Dictation"
created: "2026-05-24"
updated: "2026-05-24"
tags:
  - wiki
  - concept
  - voice
  - speech-to-text
  - productivity
  - paradigm-shift
aliases:
  - "智能听写"
  - "Speech Writing"
related:
  - "[[speech-technology-stack]]"
  - "[[voice-live-agent]]"
---

# Intelligent Dictation

## 摘要

Intelligent Dictation（智能听写）是语音输入领域的第三代范式，核心转变是从"Speech Recognition"（记录你说了什么）到"Speech Writing"（写出你想表达什么）。代表产品包括 Typeless、Wispr Flow、Aqua Voice。与传统 STT 相比，智能听写在 ASR（L1）之上增加了 L2-L6 五层价值——去噪、语义重组、格式化、场景适配、个性化，通过 LLM 后处理层将语音识别的原始输出转化为 ready-to-use 文本。

## Claims

### Claim: 语音输入存在六层价值模型（L1-L6）

- **来源**：[[Typeless深度解析——AI语音输入如何超越传统Speech-to-Text]]
- **首次出现**：2026-05-20
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：active

> L1 语音识别（WER 优化）→ L2 文本清洗（去除 um/uh/重复）→ L3 语义重组（理解意图重组语序）→ L4 格式化（自动识别列表/步骤/要点）→ L5 场景适配（根据 App 切换语气）→ L6 个性化（学习用户表达风格）。传统 STT 只覆盖 L1，Typeless 等产品专攻 L2-L6。

### Claim: 语音输入经历三代范式演进

- **来源**：[[Typeless深度解析——AI语音输入如何超越传统Speech-to-Text]]
- **首次出现**：2026-05-20
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：active

> 第一代 Accurate Transcription（Azure Speech、Google STT）→ 第二代 Smart Transcription（Whisper、AssemblyAI）→ 第三代 Intelligent Dictation（Typeless、Wispr Flow）。本质变化：从"忠实记录"到"写出想表达什么"，加入 LLM 后处理层理解语义意图后重新组织输出。

### Claim: 底层 ASR 已"够用"，差异化在 L2-L6 上层

- **来源**：[[Typeless深度解析——AI语音输入如何超越传统Speech-to-Text]]
- **首次出现**：2026-05-20
- **最近更新**：2026-05-24
- **置信度**：0.7
- **状态**：active

> Whisper 的 WER 已达 7.6%，差异化不在底层引擎而在上层产品能力。Typeless 不跟 Azure/Google 竞争 L1，而是站在 L1 之上专攻"最后一公里"。产品洞察：用户要的不是"准确的转录"，而是"不用打字就能产出好文本"。

### Claim: App-aware tone switching 是智能听写的关键创新

- **来源**：[[Typeless深度解析——AI语音输入如何超越传统Speech-to-Text]]
- **首次出现**：2026-05-20
- **最近更新**：2026-05-24
- **置信度**：0.7
- **状态**：active

> 根据目标应用（Slack vs Gmail vs Notion）自动调整输出语气，本质是 context injection 策略。结合 Whisper Mode（低声输入）和 Edit via voice（语音修改已有文本），形成完整的语音交互闭环。

## 冲突与演进

（暂无）

## 关联概念

- [[speech-technology-stack]] — `extends` 智能听写是语音技术栈 L1 之上的产品层演进
- [[voice-live-agent]] — `uses` Voice Agent 输出应从"用户说了什么"转向"用户想要什么"——智能听写思路的 Agent 化延伸

## 来源日记

- [[2026-05-20-周三]] — 调查 Typeless，整理深度解析文章
