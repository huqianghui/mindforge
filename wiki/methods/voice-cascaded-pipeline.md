---
title: "语音级联管线架构"
created: "2026-04-13"
updated: "2026-09-25"
tags:
  - wiki
  - method
  - voice
  - agent
  - architecture
  - azure
method_type: "architecture-pattern"
related_concepts:
  - "[[voice-live-agent]]"
  - "[[speech-technology-stack]]"
  - "[[voice-activity-detection]]"
related_methods: []
---

# 语音级联管线架构

## 摘要

语音级联管线（Cascaded Pipeline）是当前企业级 Voice Agent 的唯一生产可行架构。核心是将语音交互拆解为 STT → LLM → TTS 三个独立流式组件，通过 streaming + pipelining 重叠执行实现低延迟。**低延迟的关键不是让单个组件更快，而是让它们重叠执行**——Salesforce 级联管线实现 ~755ms first-audio latency。

## 适用条件

- **前置依赖**：STT 服务（Azure Speech / Whisper）、LLM 服务（GPT-4 / Claude）、TTS 服务（Azure TTS / ElevenLabs）、WebSocket 基础设施
- **适用场景**：企业级实时语音对话系统（客服、助手、coaching）
- **不适用场景**：离线语音处理（无实时性要求）；纯研究环境（可用 E2E 模型实验）

## 步骤

### Step 1: Speech In（语音输入）

- **输入**：用户麦克风音频流
- **操作**：VAD 检测语音活动 → STT 流式转写为文本
- **输出**：用户语音的文本转写（partial + final transcript）
- **判断标准**：VAD 准确检测语音起止，STT 延迟 < 300ms

### Step 2: Core Processing（核心推理）

- **输入**：用户文本 + 对话历史 + 系统 prompt
- **操作**：LLM 流式生成回复，通过 sentence buffer 逐句输出
- **输出**：LLM 回复文本流（逐句）
- **判断标准**：首 token 延迟 < 500ms，sentence buffer 正确切分句子

### Step 3: Speech Out（语音输出）

- **输入**：LLM 回复文本（逐句）
- **操作**：TTS 逐句合成语音 → 流式播放
- **输出**：合成语音音频流
- **判断标准**：首句音频延迟（从用户停止说话到系统开始播放）< 1 秒

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| 需要最低延迟 | Cascaded Pipeline + streaming overlap | Salesforce 验证 ~755ms first-audio |
| 需要全托管 | Azure Voice Live API | 牺牲控制换取低集成复杂度 |
| 研究/实验场景 | E2E Native（如 Moshi） | 架构更简单但未达生产可用 |
| 需要精细控制 VAD | Server-side VAD + 自定义阈值 | 默认 Semantic VAD 可能误判 |

## Claims

### Claim: 低延迟关键在于组件重叠执行

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 不是让单个组件更快，而是 streaming + pipelining。sentence buffer 是 LLM token 输出到 TTS 句子输入的关键管线节点。

### Claim: 端到端模型尚未达到企业生产可用

- **来源**：[[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 2026 年企业级唯一生产可行架构仍是 STT → LLM → TTS 级联管线。

### Claim: Dialog Manager 是被 Voice Live 默认配置折叠掉的一层——应答门控把它重新展开为显式状态机

- **来源**：[[Voice Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM judge、两段式提交与频率策略]]
- **首次出现**：2026-09-24
- **最近更新**：2026-09-25
- **置信度**：0.75
- **状态**：active

> 级联流水线 ASR→NLU→DM→NLG→TTS 中的 Dialog Manager 层，在 Voice Live `create_response=true` 默认配置下被折叠成一个布尔开关（VAD 判停即开轮）。应答门控是把 DM 重新展开：EOU（说完了没）→ LLM judge（答完了没）→ 跨轮状态规则（要不要致谢）→ 分档内容源（说什么），配两段式提交状态机（LISTENING→PENDING→COMPLETE）。十三步完整流程在 Voice Live 事件流上的三段对应：门控段（VAD→EOU→judge→提交→竞态复查，全在应用侧）、开轮生成段（组装约束→response.create→推理→TTS/viseme）、播出段（播放→打断→response.done→acked 复位）——级联流水线各层与 Realtime 事件的映射表。

## 实践记录

<!-- 在实际项目中应用此方法后，记录结果反馈 -->

（暂无实践记录）

## 关联概念

- [[voice-live-agent]] — `implements` 此方法的概念定义页
- [[speech-technology-stack]] — `uses` 管线各阶段对应的技术栈
- [[voice-activity-detection]] — `uses` VAD 是 Step 1 的关键子技术

## 关联方法

（暂无）

## 来源

- [[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]] — 架构全景
- [[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]] — 企业级实践
