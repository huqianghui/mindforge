---
title: "Grapheme-to-Phoneme（G2P）"
created: "2026-04-30"
updated: "2026-04-30"
tags:
  - wiki
  - concept
  - speech
  - TTS
  - G2P
  - phoneme
  - voice-agent
aliases:
  - "G2P"
  - "G2P 转换"
  - "字素到音素转换"
related:
  - "[[speech-technology-stack]]"
  - "[[voice-live-agent]]"
  - "[[turn-taking]]"
  - "[[cascaded-pipeline]]"
---

# Grapheme-to-Phoneme（G2P）

## 摘要

G2P（Grapheme-to-Phoneme）是 TTS（文本转语音）流水线中从书写符号（Grapheme，字位）到发音单元（Phoneme，音位）的映射转换。其存在的根本原因是**书写和发音之间没有一一对应关系**——英语中 `phone` 的 `ph` → `/f/`、`read` 可读 `/riːd/` 或 `/rɛd/`。

G2P 在 TTS Pipeline 中位于 Text Normalization 之后、Acoustic Model 之前，与 Lexicon（发音词典）共同负责将文本转换为 phoneme 序列。在 Realtime Voice Agent 场景中，G2P 面临流式处理 chunk 边界、延迟瓶颈、韵律上下文依赖三大挑战。工程上推荐构建独立的 Pronunciation Control Layer（Text Normalization + Lexicon Match + Phoneme Override + Fallback），而非依赖 LLM 直接输出 SSML。

## Claims

### Claim: G2P 有三种实现方式，工程最常用 Hybrid 方案

- **来源**：[[Speech-Out深入——Grapheme、Phoneme、G2P、Lexicon与SSML的工程解析]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.7
- **状态**：active

> 显式 G2P（独立模块输出 phoneme，可控性强但增加延迟）、隐式 G2P（End-to-End TTS 内部完成，如 VITS/Tacotron，简单但发音不可控）、Hybrid（规则+字典+fallback G2P，最常见的工程选择）。

### Claim: Lexicon 是 G2P 的 Override 层而非普通词典

- **来源**：[[Speech-Out深入——Grapheme、Phoneme、G2P、Lexicon与SSML的工程解析]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.8
- **状态**：active

> Custom Lexicon 在 G2P 之前介入，对命中词直接返回预定义 phoneme，跳过 G2P 推断。本质是"接管 G2P 对特定词汇的决策权"。SSML `<phoneme>` 标签是局部 override，Lexicon 是全局规则，G2P 是兜底推断——三者构成层级化发音控制体系。

### Claim: Realtime 场景应构建 Pronunciation Control Layer 而非依赖 SSML

- **来源**：[[Speech-Out深入——Grapheme、Phoneme、G2P、Lexicon与SSML的工程解析]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.7
- **状态**：active

> SSML + Streaming 天然冲突（XML 要完整结构，streaming 是 token 流）；LLM 不会稳定生成 SSML。正确方案：LLM 和 TTS 之间构建 Pronunciation Control Layer（Text Normalization → Lexicon Match → Phoneme Override → Fallback），80% 发音问题来自 20% 的词。

### Claim: G2P 控制能力决定 Voice Agent "做大之后会不会崩"

- **来源**：[[Speech-Out深入——Grapheme、Phoneme、G2P、Lexicon与SSML的工程解析]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.7
- **状态**：active

> Azure Speech 提供 Hybrid G2P + SSML + Custom Lexicon（高可控性）；GPT-Realtime 内嵌 G2P 不可控（只能文本层面 hack）。涉及人名/品牌名/多语言混合/专业领域时，必须选择有发音控制权的技术栈。

## 冲突与演进

（暂无）

## 关联概念

- [[speech-technology-stack]] — `part-of` G2P 是 Speech Out 层的核心转换模块
- [[turn-taking]] — `contrasts` Semantic VAD 决定"什么时候说"，G2P 决定"怎么说"——不同层级但存在间接耦合
- [[voice-live-agent]] — `uses` Voice Agent 的发音准确度依赖 G2P 控制能力
- [[cascaded-pipeline]] — `part-of` G2P 是级联 TTS 管线的内部组件

## 来源日记

- [[2026-04-30-周四]] — Speech 调研完成，产出 Speech Out 深入文章
- [[Speech-Out深入——Grapheme、Phoneme、G2P、Lexicon与SSML的工程解析]] — 完整 G2P 工程解析
