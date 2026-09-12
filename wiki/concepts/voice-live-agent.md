---
title: "Voice Live Agent"
created: "2026-04-13"
updated: "2026-09-12"
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
  - "[[foundry-agent-type-selection]]"
  - "[[intelligent-dictation]]"
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
- **状态**：stale

> WebSocket 是 Control Plane（信令/控制/事件/Tool Calling），WebRTC 是 Data Plane（低延迟音视频流）。两条通道并存且职责解耦。建连时序：WebSocket 建控制面 → 通过 WebSocket 交换 SDP → WebRTC PeerConnection 建立 → 运行时协作。

### Claim: 从 WebSocket-only 到双通道是产品成熟度驱动的必然升级

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：stale

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

### Claim: 数字人 avatar=云端神经视频合成 + viseme 时间轴 + WebRTC 推流——浏览器退化为显示器

- **来源**：[[从Canvas音波球到云端数字人——浏览器动态内容的计算光谱（动态SVG下篇）]]
- **首次出现**：2026-08-26
- **最近更新**：2026-08-30
- **置信度**：0.75
- **状态**：active

> Foundry Voice Live 页面 Inspector 实探：数字人形象不在本地渲染——云端 GPU 做神经视频合成（口型由 TTS 输出的 viseme 时间轴驱动），WebRTC 把视频流推给浏览器，`<video>` 元素只是显示器。三条技术路线对照：① 云端视频合成（效果最真、延迟与 GPU 成本最高，Voice Live avatar 属此路）；② 客户端 3D blendshape（Three.js 本地渲染，viseme 驱动表情骨骼，成本低可离线）；③ Live2D 纸片人（2D 变形，最轻量）。选型判据是"计算发生在哪里"：内容复杂度 × 实时性来源决定画面在文档内/本地 JS/本地 GPU/云端 GPU 哪一层生成。音波球一类可视化则是本地 Canvas 四环节驱动链（Web Audio AnalyserNode → 几何映射 → 涂像素 → rAF 帧循环）——同为"语音驱动画面"，两者的计算位置相距整个光谱。

### Claim: 四种语音要求各有专属控制面——提示词表达表演意图、语音接口生成声音、声音自带的时间数据驱动嘴型

- **来源**：[[Blender系列04：人物面试动画实战——47骨骼程序化表演、TTS配音与音量包络口型同步]]
- **首次出现**：2026-09-07
- **最近更新**：2026-09-12
- **置信度**：0.8（OpenAI/Azure Speech 官方文档核对，方案未实跑接入）
- **状态**：active

> 语音驱动动画时四种容易混淆的要求各有专属控制面：**发音正确**（人名/多音字）靠发音词典、phoneme/say-as/sub；**声调正确**靠音素/拼音声调标记（Azure SAPI 记法如 `lin 2 yue 4`）；**韵律自然**靠声音选择、自然语言 instructions 或 SSML prosody/style/break；**口型对应**靠与最终音频对应的 viseme/面部系数或强制对齐——**"请让嘴型同步"这句提示词本身不会产生毫秒级时间表**，提高整句 pitch 也不会纠正读错的声调。两条 API 路线的分界：OpenAI Speech（`gpt-4o-mini-tts`）用自然语言 instructions 控制口音情绪语速，但只返回音频、无 phoneme/viseme 时间轴字段；Azure Speech `zh-CN` 支持 Viseme ID + **55 项面部系数按 60 FPS 输出**（进 24 fps 渲染端要做时间换算），事件时间用 100 纳秒 tick，**不能用网络回调到达时间当动画时间**（事件在音频数据可用时触发，可能远早于播放）。配套六条同步工程规则：一次合成是一个完整版本（台词/参数/WAV/事件/音频 SHA-256 一起存档）、锁定声音之后再定嘴型、音频剪辑与事件用同一时间映射、区分片段起点和发声起点、统一视频时间基准、最终合成后再查偏移。这是"数字人=viseme 时间轴"Claim 的直接工程续证——viseme 不只驱动云端视频合成，同样可驱动本地渲染载体（Blender 形态键、three.js blendshape），前提是渲染端有对应控制面（"把 55 项数值塞进 3 个形态键不叫精细同步"）。

## 冲突与演进

- 2026-08-30：注入数字人渲染三路线 Claim（动态SVG下篇 Inspector 实探），页面 active 证据回填。
- 2026-09-12：注入四种语音要求分层 + viseme 工程细节 Claim（Blender 系列04，官方文档核对）——"viseme 时间轴"Claim 获得跨域（DCC 渲染端）工程续证；计算位置判据归口新页 [[compute-locus-spectrum]]。

## 关联概念

- [[intelligent-dictation]] — `extends` Voice Agent 输出可从"记录说了什么"升级为"写出想表达什么"
- [[foundry-agent-type-selection]] — `grounds` Voice Live 组合方向为 Foundry Agent 类型选型提供依据

## 来源日记

- [[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]] — 架构全景
- [[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]] — 企业级实践
- [[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]] — WebRTC 双通道架构
- [[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型]] — 解耦后三种合作模式与选型光谱
- [[Blender系列04：人物面试动画实战——47骨骼程序化表演、TTS配音与音量包络口型同步]] — 四种语音要求分层、两条 API 路线与 viseme 同步工程规则
