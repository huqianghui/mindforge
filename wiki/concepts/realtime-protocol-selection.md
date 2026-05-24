---
title: "Realtime Protocol Selection"
created: "2026-05-24"
updated: "2026-05-24"
tags:
  - wiki
  - concept
  - websocket
  - webrtc
  - protocol
  - realtime
  - voice-agent
aliases:
  - "实时通信协议选型"
  - "WebSocket vs WebRTC"
  - "Control Plane vs Data Plane"
related:
  - "[[voice-live-agent]]"
  - "[[speech-technology-stack]]"
  - "[[cascaded-pipeline]]"
---

# Realtime Protocol Selection

## 摘要

实时语音 Agent 系统的协议选型核心是 **Control Plane（控制面）与 Data Plane（数据面）的分离**。WebSocket 定位为"系统控制总线"（TCP、可靠、JSON 事件/控制指令），WebRTC 定位为"实时传输通道"（UDP/SRTP、超低延迟、音视频帧）。两者不是替代关系而是协作——通过 SDP（会话描述协议）经由 WebSocket 信令完成协商后，WebRTC PeerConnection 承载媒体流。Azure Voice Live API 从 WebSocket-only 到双通道的演进证明：协议升级是产品成熟度驱动的必然结果。

## Claims

### Claim: WebSocket 是控制总线，WebRTC 是实时传输通道

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.9
- **状态**：active

> WebSocket：TCP 传输层、双向消息通道、可靠但可能 delay、载荷为 JSON 事件和控制指令。WebRTC：UDP（SRTP/SCTP）、超低延迟容忍丢包、载荷为音频帧/视频帧、原生集成浏览器音频处理链（AEC/AGC/NS）。在 Voice Live 中 WebSocket 负责信令 + 会话控制，WebRTC 负责音频/视频媒体流。

### Claim: SDP 是"协商格式"而非通信协议，WebSocket 是其传输渠道

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.9
- **状态**：active

> SDP（Session Description Protocol）描述媒体类型、编解码器、网络地址和传输协议。WebRTC 标准本身不定义信令通道——SDP 是"合同内容"，WebSocket 是"传递合同的快递"，RTP 是"实际交付"。类比：SDP = 怎么合作，WebSocket = 把协议送达，RTP = 真正干活。

### Claim: 双通道架构中两条路径职责严格解耦

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：active

> WebSocket（主控制面）：session control、tool calling、config 修改、错误通知、AI response lifecycle——可靠（TCP）语义控制。WebRTC DataChannel（就地控制）：VAD 事件、streaming token、fine-grained sync——低延迟与音频同链路。即使 PeerConnection 已建立，WebSocket 仍负责系统级控制。

### Claim: WebSocket 传音频有五个结构性缺陷

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：active

> ① TCP 队头阻塞导致延迟抖动；② 丢包重传带来延迟尖峰；③ 无法利用浏览器 AEC/NS 音频处理链；④ 无 RTP timestamp 同步机制（无法 AV sync）；⑤ TCP 带宽和延迟不适合视频（无法支持 Avatar）。这些缺陷在 prototype 阶段可接受，进入 production + avatar + low-latency 场景时成为瓶颈。

### Claim: 协议选型决策框架——场景驱动而非技术偏好

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：active

> 只用 WebSocket 的条件：prototype/内部 demo、延迟要求 > 500ms、不需浏览器音频处理、防火墙严格限 UDP、无视频。引入 WebRTC 的条件：端到端延迟 < 300ms、需浏览器 AEC/NS/AGC、需音视频同步（Avatar）、需 P2P/SFU 拓扑、生产环境高音质要求。

### Claim: 渐进式架构升级是通用设计原则

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.7
- **状态**：active

> Voice Live API 从 WebSocket-only → WebSocket + WebRTC 的演进路径是范例：先用简单方案验证产品（WebSocket 开发简单、防火墙友好、生态成熟），再根据生产需求引入更复杂但更高效的协议。核心原则：Control Plane ≠ Data Plane；信令通道与媒体通道解耦。

## 冲突与演进

（暂无）

## 关联概念

- [[voice-live-agent]] — `part-of` 协议选型是 Voice Live Agent 架构的基础设施层决策
- [[speech-technology-stack]] — `uses` 语音技术栈的传输层依赖协议选型
- [[cascaded-pipeline]] — `constrains` 级联管线的延迟目标约束协议选择（< 300ms 必须 WebRTC）

## 来源日记

- [[2026-05-22-周五]] — 整理 WebSocket 与 WebRTC 深度对比文章
- [[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]] — 核心来源
