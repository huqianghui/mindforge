---
title: "Voice Live Agent"
created: "2026-04-13"
updated: "2026-07-21"
tags:
  - wiki
  - concept
  - voice
  - agent
  - realtime
  - azure
aliases:
  - "Voice Live Agent"
  - "语音实时 Agent"
  - "Realtime Voice Agent"
related:
  - "[[voice-activity-detection]]"
  - "[[speech-technology-stack]]"
---

# Voice Live Agent

## 摘要

Voice Live Agent 是结合语音 I/O 与 LLM 推理能力的实时对话系统。当前存在两种主流架构：Cascaded Pipeline（STT + LLM + TTS 独立流式组件）和 End-to-End Native（单一多模态模型）。2026 年企业级唯一生产可行架构仍是级联管线。低延迟的关键不是让单个组件更快，而是让它们重叠执行（streaming + pipelining）。

## Claims

### Claim: 两种主流架构——级联管线与端到端

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> Cascaded Pipeline（STT + LLM + TTS）vs End-to-End Native（单一多模态模型 audio-in to audio-out）。

### Claim: 低延迟关键在于组件重叠执行

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 不是让单个组件更快，而是 streaming + pipelining。sentence buffer 是 LLM token 输出到 TTS 句子输入的关键管线节点。Salesforce 级联管线实现 ~755ms first-audio latency。

### Claim: 语音不是"界面层"那么简单

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 实现 < 1 秒端到端延迟需要 STT、LLM、TTS 的精密流水线协调。

### Claim: 端到端模型尚未达到企业生产可用

- **来源**：[[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 2026 年企业级唯一生产可行架构仍是 STT → LLM → TTS 级联管线。Level 1 Fully E2E（如 Moshi）有研究价值无工程价值，Level 2 Hybrid Omni 本质仍是管线。

### Claim: Voice Agent 的真正难点在 Agent 而非语音

- **来源**：[[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> Voice Agent = LLM Agent + Voice I/O。推理、工具调用、状态管理才是核心难点，"能听会说"只是界面。

### Claim: Azure Voice Live API 走全托管端到端路线

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：stale

> STT、GPT Realtime、TTS、VAD、降噪、回声消除全部云端处理，原生 Avatar 集成。牺牲自托管控制换取更低集成复杂度。

### Claim: Voice Live API 采用 WebSocket + WebRTC 双通道架构

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：active

> WebSocket 是 Control Plane（信令/控制/事件/Tool Calling），WebRTC 是 Data Plane（低延迟音视频流）。两条通道并存且职责解耦。建连时序：WebSocket 建控制面 → 通过 WebSocket 交换 SDP → WebRTC PeerConnection 建立 → 运行时协作。

### Claim: 从 WebSocket-only 到双通道是产品成熟度驱动的必然升级

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：active

> WebSocket 传音频的缺陷：TCP 队头阻塞导致延迟抖动、丢包重传带来延迟尖峰、无法利用浏览器 AEC/NS、无 AV sync、无法支持 Avatar 视频。当场景从 demo 进入 production + avatar + low-latency 时，WebSocket 作为音频传输通道的技术天花板被触碰。

### Claim: Voice Live 与 Agent Service 解耦后发生模型归属反转

- **来源**：[[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：active

> Voice Live API 从 Agent Service 解耦为独立服务后，Realtime 模型归 Voice Live 持有，Agent 变成可选挂载项。三种合作模式：模式一（传统 Agent，语音自理）、模式二（Voice Live 独立会话，不挂 Agent）、模式三（Voice Live 挂 Agent，语音层与推理层分工）。

### Claim: Voice Live 挂 Agent 是会话级绑定 + 服务端编排，不是 function call

- **来源**：[[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：active

> 绑定通过 WebSocket 连接 URL 的 query 参数（`agent_id` + `project_id`）在会话建立时完成，而非运行时把 Agent 当工具调用。证据：挂 Agent 后 session 的 `instructions` 字段被禁用（推理归 Agent），且服务端会推送 `interim_response`（TOOL/LATENCY 类型）填补 Agent 推理延迟——这是服务端编排器行为，function call 模式不会有。

### Claim: 选型是一条光谱，延迟瓶颈在模型和工具而非 Voice Live 这层壳

- **来源**：[[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-07-21
- **置信度**：0.7
- **状态**：active

> 直连 Realtime API ↔ 模式二（Voice Live 独立会话）↔ 模式三（挂 Agent）构成控制力递减、托管度递增的光谱。三笔账：延迟账（瓶颈排序为模型推理 > 网络 RTT > 语音层处理）、控制账（instructions/工具在谁手里）、运维账（VAD/降噪/回声消除是否自理）。企业级复杂场景最优解是模式三 + 分层用模型（简单问答留 Realtime、复杂推理走 Agent）。

## 冲突与演进

（暂无）

## 关联概念

- [[intelligent-dictation]] — `extends` Voice Agent 输出可从"记录说了什么"升级为"写出想表达什么"

## 来源日记

- [[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]] — 架构全景
- [[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]] — 企业级实践
- [[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]] — WebRTC 双通道架构
- [[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型]] — 解耦后三种合作模式与选型光谱
