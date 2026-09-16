---
title: "Realtime Protocol Selection"
created: "2026-05-24"
updated: "2026-09-16"
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
- **状态**：stale

> WebSocket：TCP 传输层、双向消息通道、可靠但可能 delay、载荷为 JSON 事件和控制指令。WebRTC：UDP（SRTP/SCTP）、超低延迟容忍丢包、载荷为音频帧/视频帧、原生集成浏览器音频处理链（AEC/AGC/NS）。在 Voice Live 中 WebSocket 负责信令 + 会话控制，WebRTC 负责音频/视频媒体流。

### Claim: SDP 是"协商格式"而非通信协议，WebSocket 是其传输渠道

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.9
- **状态**：stale

> SDP（Session Description Protocol）描述媒体类型、编解码器、网络地址和传输协议。WebRTC 标准本身不定义信令通道——SDP 是"合同内容"，WebSocket 是"传递合同的快递"，RTP 是"实际交付"。类比：SDP = 怎么合作，WebSocket = 把协议送达，RTP = 真正干活。

### Claim: 双通道架构中两条路径职责严格解耦

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：stale

> WebSocket（主控制面）：session control、tool calling、config 修改、错误通知、AI response lifecycle——可靠（TCP）语义控制。WebRTC DataChannel（就地控制）：VAD 事件、streaming token、fine-grained sync——低延迟与音频同链路。即使 PeerConnection 已建立，WebSocket 仍负责系统级控制。

### Claim: WebSocket 传音频有五个结构性缺陷

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：stale

> ① TCP 队头阻塞导致延迟抖动；② 丢包重传带来延迟尖峰；③ 无法利用浏览器 AEC/NS 音频处理链；④ 无 RTP timestamp 同步机制（无法 AV sync）；⑤ TCP 带宽和延迟不适合视频（无法支持 Avatar）。这些缺陷在 prototype 阶段可接受，进入 production + avatar + low-latency 场景时成为瓶颈。

### Claim: 协议选型决策框架——场景驱动而非技术偏好

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：stale

> 只用 WebSocket 的条件：prototype/内部 demo、延迟要求 > 500ms、不需浏览器音频处理、防火墙严格限 UDP、无视频。引入 WebRTC 的条件：端到端延迟 < 300ms、需浏览器 AEC/NS/AGC、需音视频同步（Avatar）、需 P2P/SFU 拓扑、生产环境高音质要求。

### Claim: 渐进式架构升级是通用设计原则

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.7
- **状态**：stale

> Voice Live API 从 WebSocket-only → WebSocket + WebRTC 的演进路径是范例：先用简单方案验证产品（WebSocket 开发简单、防火墙友好、生态成熟），再根据生产需求引入更复杂但更高效的协议。核心原则：Control Plane ≠ Data Plane；信令通道与媒体通道解耦。

### Claim: ICE 门控快路径——等待目标从"全量集"收窄到"够用集"：对服务端行为有确定性知识时，等待条件可以收窄（兜底保留）

- **来源**：[[Voice Live系列03：数字人出场延迟优化——ICE门控根因、实测分解与预热占位策略]]
- **首次出现**：2026-09-14
- **最近更新**：2026-09-16
- **置信度**：0.8（真实项目根因排查 + 生产环境 9/9 轮实测验证）
- **状态**：active

> WebRTC 传候选有 Trickle ICE（增量补发，RFC 8838）与 Vanilla ICE（offer 一次性带全候选）两种模式。Azure 数字人信令是一次性的（offer 以 base64 blob 经 `session.avatar.connect` 只发一次，无补发通道），所以"发前收集齐候选"是本信令通道下的标准做法——但 `complete` 信号的语义是"**所有**网络接口都了结"，被最慢最坏的接口绑架：VPN 虚拟网卡对 STUN/TURN 的 UDP 请求石沉大海（无响应也无错误）、mDNS 混淆地址解析、IPv6/代理路由黑洞，都让它在多网卡环境永远不来——每次连接硬等满 8s 兜底超时（开发者/企业办公电脑必现，"干净"家庭网络测不出）。修复的关键是**场景特化知识**：Azure 数字人 relay-only（下发的 `ice_servers` 只有一个带凭据 relay，无 STUN、无 P2P），胜出候选已知——SDP 里有第一个 relay candidate（+300ms 收敛窗收同批）就是"够用集"，后续 host 候选永远不会被选中，正确性零损失而 ICE 段 **8s→0.38s**（生产 n=9 全部走快路径、中位 0.54s，无一打满兜底）。可推广原则：**很多"标准做法"的等待，等的是通用假设下的最坏情况；对服务端行为有确定性知识时，等待条件就可以收窄**——前提是兜底全部保留（null candidate / `complete` / 超时三信号仍在，正常网络行为不变）。配套判据：兜底超时每次被打满即主信号失效，值得显式标记 + 报警。

## 冲突与演进

- **2026-08-16**：全部 6 条 Claims 证据停在 2026-05-24，距今 84 天超过 60 天线，维护标 stale，等新证据复核（复核素材已见 08-09 loop-weekly 语音三连发条目）。
- **2026-09-16**：注入 Voice Live 系列03 ICE 门控 Claim（"全量集→够用集"）——页面获得首条生产实测级 WebRTC 协议工程续证，脱离全 stale 状态；sufficient-set-waiting 按裁决不独立建页，原则收入本条。

## 关联概念

- [[voice-live-agent]] — `part-of` 协议选型是 Voice Live Agent 架构的基础设施层决策

## 来源日记

- [[2026-05-22-周五]] — 整理 WebSocket 与 WebRTC 深度对比文章
- [[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]] — 核心来源
- [[Voice Live系列03：数字人出场延迟优化——ICE门控根因、实测分解与预热占位策略]] — ICE 门控快路径根因剖析与生产实测（Trickle vs Vanilla ICE、"全量集→够用集"）
