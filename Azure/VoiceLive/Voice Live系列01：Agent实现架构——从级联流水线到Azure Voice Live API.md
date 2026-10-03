---
title: Voice Live 系列 01：Agent 实现架构——从级联流水线到 Azure Voice Live API
created: 2026-04-06
tags:
  - voice-agent
  - realtime
  - azure
  - webrtc
  - websocket
  - architecture
description: 结合 Salesforce 企业级实时语音 Agent 论文与 Azure Voice Live API 实战经验，梳理 Voice Live Agent 的两种主流架构路线与核心工程挑战
---

# Voice Live 系列 01：Agent 实现架构——从级联流水线到 Azure Voice Live API

> 本文基于两个来源的学习整理：
> - [Building Enterprise Realtime Voice Agents from Scratch: A Technical Tutorial](https://arxiv.org/html/2603.05413v2)（Salesforce AI Research）
> - AI Coach 项目中 Azure Voice Live API + Digital Human Avatar 的全栈实现经验

---

## 一、什么是 Voice Live Agent

Voice Live Agent 的核心定义很简洁——**一个带语音 I/O 的 LLM Agent**。复杂的推理、工具调用、规划能力来自语言模型，语音只是输入和输出的界面层。

但"只是界面层"这句话严重低估了工程复杂度。要让用户感受到"实时对话"，端到端延迟必须控制在 **1 秒以内**（理想 < 800ms）。这意味着语音识别、语言模型推理、语音合成三个本身就不快的环节必须高度流水线化，而非简单串行。

---

## 二、两种架构路线

当前 Voice Live Agent 存在两种主流实现路线：

### 1. 级联流水线（Cascaded Pipeline）

```
麦克风 → STT（语音识别）→ LLM（文本推理）→ TTS（语音合成）→ 扬声器
```

三个独立组件通过 **流式传输 + 组件流水线** 实现低延迟。每个组件各司其职，可以独立选型和替换。

**代表实现**：Salesforce 论文方案——Deepgram Nova-3（STT）+ vLLM（LLM）+ ElevenLabs（TTS）

### 2. 端到端原生模型（End-to-End / Native）

```
麦克风 → 多模态模型（Audio-in → Audio-out）→ 扬声器
```

一个模型同时处理语音输入和音频输出，省去 STT/TTS 组件。

**代表实现**：GPT-4o Realtime、Qwen3-Omni、Azure Voice Live API

### 对比总结

| 维度 | 级联流水线 | 端到端原生 |
|------|-----------|-----------|
| **组件数量** | 3 个独立服务 | 1 个（或云端托管） |
| **延迟来源** | STT + LLM + TTS 三段叠加 | 模型推理（单段） |
| **实测延迟** | ~755ms（首音频，流式优化后） | ~702ms（DashScope）/ Azure Voice Live 更低 |
| **Function Calling** | 原生支持（LLM 组件） | 取决于模型能力 |
| **自主部署** | 完全可控 | 部分需要云端依赖 |
| **Avatar 集成** | 需额外开发 | Azure Voice Live 原生支持 |

---

## 三、级联流水线深度解析（Salesforce 论文）

### 3.1 核心洞察：流式 + 流水线 = 低延迟

级联流水线的关键不是让每个组件跑得更快，而是让它们 **重叠执行**：

```
时间轴 →

用户说话 ─────────────┐
                       ▼
STT 流式识别  ████████████─────────┐ （partial → final transcript）
                                     ▼
LLM 流式生成           ██████████████████─────────┐ （token by token）
                                                     ▼
TTS 流式合成                     ██████████████████████ （sentence by sentence）
                                           ▼
用户听到回复                              ▶▶▶▶▶▶▶▶▶▶ （首音频 ~755ms）
```

### 3.2 各组件选型与延迟

| 组件 | 选型 | 延迟 | 说明 |
|------|------|------|------|
| **STT** | Deepgram Nova-3 | 中位数 402ms | 通过持久 WebSocket 连接流式传输，区分 partial/final transcript |
| **LLM** | vLLM（自托管） | 首 token 296ms | OpenAI 兼容 API，流式 SSE 输出，~168 tokens/s |
| **TTS** | ElevenLabs | 首字节 219-236ms | 流式合成，10-20x 实时速度 |

### 3.3 句子缓冲器（Sentence Buffer）——流水线的关键纽带

LLM 输出的是 token 流，TTS 需要的是完整句子。**句子缓冲器** 架起了桥梁：

1. 累积 LLM 输出的 token
2. 检测句子边界（句号、问号、换行等），同时排除缩写中的假句号（如 "Dr."、"e.g."）
3. 满足最小长度阈值后释放完整句子给 TTS
4. TTS 开始合成第一句时，LLM 继续生成后续内容

这个设计使得用户在 LLM 生成完第一个句子时就能听到回复，而非等待整段文本生成完毕。

### 3.4 语音活动检测（VAD）与轮次管理

系统使用 **Silero VAD**（2MB 模型，处理 32ms 音频块耗时 < 1ms）实现状态机：

```
IDLE → LISTENING → PROCESSING → SPEAKING
  ↑                                 │
  └─── 用户打断（barge-in）──────────┘
```

当系统正在说话时检测到用户语音，立即中断回复并回到 LISTENING 状态——这是自然对话的关键体验。

### 3.5 Function Calling 集成

级联架构的 LLM 组件天然支持 tool use：

```
用户: "帮我查一下明天北京的天气"
  → STT → "帮我查一下明天北京的天气"
  → LLM → tool_calls: [{name: "get_weather", args: {city: "北京", date: "明天"}}]
  → 执行函数 → 结果: {"temp": "22°C", "condition": "晴"}
  → LLM → "明天北京天气晴朗，气温 22 度，适合外出。"
  → TTS → 语音输出
```

支持多步工具链——一个工具的结果可以触发下一个工具调用，直到模型生成最终文本。

---

## 四、Azure Voice Live API 实战解析

Azure Voice Live API 走的是**端到端托管**路线——STT、GPT Realtime、TTS、VAD、降噪、回声消除全部由 Azure 云端处理，开发者只需关注业务逻辑和前端集成。

### 4.1 三层架构

```
Frontend (React)  ←→  Backend (FastAPI Proxy)  ←→  Azure AI Services
```

**为什么需要 Backend Proxy？** 保护 Azure 侧凭据（Entra ID token 或 API Key）。浏览器永远不直接接触 Azure endpoint，所有 WebSocket 通信都经由后端 Python SDK 代理转发。

### 4.2 双通道并行——WebSocket + WebRTC

这是 Azure Voice Live 架构最独特的设计：

| 通道 | 传输内容 | 协议 | 是否必需 |
|------|---------|------|---------|
| **WebSocket** | 控制指令 + 用户语音（base64 PCM16）+ AI 文字转写 + AI 语音回复 | TCP | 必需 |
| **WebRTC** | 数字人视频（H.264）+ 口型同步音频（Opus） | UDP P2P | 可选（仅 Avatar 模式） |

```
浏览器                          后端 (FastAPI)                   Azure 云端

  ◄─── WebSocket ──────────────►◄──── Azure SDK ──────────────► Voice Live API
       (文本 + 音频数据 + 控制)        (Python SDK 代理)          (GPT + STT + TTS + VAD)

  ◄═══ WebRTC (P2P) ══════════════════════════════════════════► Azure AI Avatar
       (数字人视频 + 数字人音频)                                  (数字人渲染引擎)
```

**WebSocket** 是地基——所有控制和数据都走这条路。**WebRTC** 是可选的上层建筑——只有启用数字人时才需要，且浏览器直连 Azure Avatar 服务（后端不参与媒体传输）。

> **一个常见误读**："只有视频走 WebRTC、音频都走 WebSocket"——不对。Avatar 模式下，**数字人的整个输出（音频 + 视频）都在 WebRTC 同一条流里**：口型同步依赖音画同流做 AV sync，如果声音走 WS、画面走 RTC，两条路径的延迟抖动各自独立，嘴型必然对不上。WebSocket 上承载的音频只有**上行麦克风**（以及非 Avatar 模式的下行音频）。

**实测坐实（2026-10-01）：WebRTC 由数字人握手创建，不是由语音会话创建。** 三种形态逐项测过：

| 形态 | `RTCPeerConnection` | `session.avatar.connect` | 下行音频 | 下行视频 |
|---|:---:|:---:|---|:---:|
| 配了形象（产品默认） | 1 | 发送 | WebRTC RTP | WebRTC RTP |
| 配了形象 + 建连前钉住关画面 | 1 | 发送 | WebRTC RTP | **0 B** |
| 不配形象 | **0** | 不发送 | WebSocket（`response.audio.delta` ×10） | 无 |

两个推论，都容易想反：

| 推论 | 实测依据 |
|---|---|
| **纯音频不会自动变成 WebRTC** | 不配形象时连 PeerConnection 都不存在，音频以 PCM 走 WS |
| **「纯音频 + WebRTC」成立且可演示**，但仍占一个 avatar（只是不推视频） | 冷启动 6389 ms、逐轮 894 / 1067 ms，与带画面 1069 ms 中位同量级 |

与「关画面保声音」的区别：后者**保留**已建好的 WebRTC 连接，只把 video m-line 标 `a=inactive`，音频仍在 RTP 音轨上（系列12 六）；而「从一开始就没有数字人」完全没有 WebRTC。

想让纯音频走的是 4.5.2 那个**原生 WebRTC 入口**（`/voice-live/realtime/calls`，整条会话双向 RTP、与 avatar 无关）：**当天实测通了**，矩阵见 [系列04 一](Voice%20Live系列04：四条路线与全双工——GPT-Live-1对数字人方案的影响评估.md)，只是本项目的产品链路没有采用它。

### 4.3 为什么 WebRTC 不走后端代理？

这不是优化选择，而是 **技术限制**：

- **协议不兼容**：FastAPI 是 TCP 服务器，不支持 WebRTC 的 SRTP/DTLS over UDP
- **带宽爆炸**：H.264 视频 30fps ≈ 2-5 Mbps/用户，10 个并发 = 50 Mbps 后端带宽
- **延迟不可接受**：加 TCP proxy ≈ +100-300ms，口型同步完全错位

安全性通过 **临时 TURN 凭据** 保障——Azure 为每个 session 动态生成短期凭据，通过已认证的 WebSocket 传递给浏览器。Azure 侧凭据（Entra token 或 API Key）始终留在后端。

#### 媒体面与控制面：backend 的真实角色

"音频走 WebRTC 是不是就绕开后端了？"——把两个平面拆开就不再纠结：

| 平面 | 承载 | 路径 |
|------|------|------|
| **媒体面** | 数字人音视频（以及未来 WebRTC 化的上行音频） | 浏览器 ↔ Azure 直连（STUN/TURN），后端永不经手 |
| **控制面** | 鉴权/token 签发、session 配置、SDP 信令、事件与转写、业务逻辑 | 必经后端 |

Voice Live 的接口层也支持把**上行音频**走 WebRTC（接口列表：SDK / WebSocket / WebRTC / SIP）。若把上行麦克风从 WebSocket 挪到 WebRTC，变化只是最后一段仍经后端的媒体字节也直连了——后端从"控制 + 中转部分媒体"收缩为**纯控制面**，而不是被绕开：WebRTC 的 SDP 交换本身就通过 WebSocket 会话完成（`session.avatar.connect`，先有 WS 才有 RTC）；API Key/token 签发、外部系统对接、转写落库都离不开后端。

**实测补记（2026-10-01）：数字人在场时上行走不了那条 WebRTC 连接，而且是静默失败。** 把音频 transceiver 从 `recvonly` 改成 `sendrecv` 挂上麦克风轨、同时关掉 WS 上行，与现状对照：

| 观测项 | 对照组（现状） | 实验组（麦克风走 RTP） |
|---|---|---|
| PC 上音频发送端 | 0 | 1 |
| 出向 RTP 音频 | 0 B | **156473 B / 2300 包** |
| 下行 RTP（数字人） | 53847 B | 63075 B |
| WS 上 `input_audio_buffer.append` | 5932 帧 | **0 帧** |
| 用户转写 | 正常 | **无** |
| 错误 | 无 | **无** |

Azure 接受 `sendrecv`、连接正常、数字人照样说话、156 KB 真的发出去了，而转写一个字都没有、也没有任何错误。原因不是笼统的「不支持」：数字人那条连接是**下行通道**（TTS Avatar 的媒体投递），不是会话的输入路径。

所以本节结论成立，但理由要改写——不是「等该模式支持 avatar」这一条等待，而是这两件事**今天互斥**：

| 想要 | 上行走什么 | 代价 |
|---|---|---|
| 数字人（通路 A） | 只能 WebSocket | — |
| 上行也走 WebRTC（通路 C，`/calls`） | WebRTC RTP，实测可用 | 放弃数字人（官方：avatar 在 side-band control 下不支持） |

> 限制：只测了最自然的实现（`addTrack` → 音频 `sendrecv`）；是否存在某个 session 字段能让 avatar 会话从 RTP 收输入，没有穷举。

> **方法学：协商成功不等于会话可用。** 这次连错误都没有；同日另一次 voice 类型配错时，`rtc.call.error` 回来了，但 SDP answer、PeerConnection、出向音频全都正常，只是永远没有回复。判据必须是业务信号——转写出现、`response.created` 到达、下行 RTP 字节增长——不是 `connectionState === "connected"`。

值不值得改，用 [系列03 的实测](Voice%20Live系列03：数字人出场延迟优化——ICE门控根因、实测分解与预热占位策略.md)判断：同区域后端 proxy 中转几乎免费（`response.create` → 首 token，经 proxy 与直连均 ~0.5s），延迟大头在外部网关与公网 RTT。所以上行音频 WebRTC 化赢的不是平均延迟，而是**弱网表现**——UDP 没有 TCP 队头阻塞、丢包不重传，卡顿退化为瞬间失真而非延迟尖峰（协议层完整分析见 [WebSocket与WebRTC深度对比](../../Notes/AI/voice/WebSocket与WebRTC深度对比——从Azure%20Voice%20Live%20API看实时通信协议选型.md)）。内网/办公网等网络良好的场景，WS 上行没有实际痛点。

### 4.4 连接建立时序

```
[Phase 1] 认证（两段）
  浏览器 ─登录 JWT─► 后端 ─换取短期会话 token（服务端可撤销、可过期）─► 浏览器
  浏览器 ─会话 token─► 后端 WS 代理 ─验证─► 后端 ─Entra ID token（Managed Identity / 本地 az login；无则回退 API Key）─► Azure ─创建 Session

[Phase 2] WebSocket 会话配置
  后端 → Azure: session.configure（model, voice, avatar, VAD, 降噪）
  Azure → 后端 → 浏览器: session.created + session.updated（含 ICE servers）

[Phase 3] WebRTC 建立（如启用 Avatar）
  浏览器: new RTCPeerConnection(iceServers)
  浏览器: createOffer() → SDP Offer（含 DTLS 指纹）
  浏览器 → WebSocket → Azure: session.avatar.connect
  Azure → WebSocket → 浏览器: SDP Answer
  浏览器 ◄═══ WebRTC Media ═══► Azure Avatar

[Phase 4] 开始对话
  麦克风 → AudioWorklet → PCM16 24kHz → base64 → WebSocket → Azure
  Azure → 文字转写（WebSocket）+ 数字人视频/音频（WebRTC）
```

### 4.5 音频参数

| 参数 | 值 |
|------|---|
| 采样率 | 24kHz |
| 编码 | PCM16 (Int16) |
| 声道 | 单声道 (Mono) |
| 传输 | Base64 编码通过 WebSocket JSON |
| 浏览器采集 | AudioWorklet (`audio-processor.js`) |

#### 4.5.1 为什么输入默认 24 kHz，级联模式能不能降到 16 kHz

> 2026-09-30 补记。起因是弱网实测（[系列12](Voice%20Live系列12：数字人弱网表现——Azure码率自适应实测、1080p解码失效机制、胖视频饿死音频与关画面保声音.md)）发现麦克风上行实测 540 到 680 kbps，在上行窄的办公网里会把自己的信令挤死。查"能不能降采样率"时撞上一个看起来矛盾的事实：**Azure 语音服务的默认采样率是 16 kHz，而 Voice Live 的输入默认是 24 kHz。** 按语音工程的常识，做语音识别应该默认 16 kHz 才对。

**这个数值是什么意思。** 采样率是每秒对麦克风波形测量多少次，24 kHz 即每秒 24000 次。它的意义由奈奎斯特定理决定：能记录的最高声音频率等于采样率的一半。

| 采样率 | 可记录最高频率 | 典型场景 |
|---|---|---|
| 8 kHz | 4 kHz | 传统电话，听起来发闷 |
| 16 kHz | 8 kHz | 语音识别行业标准；Azure 语音转文字 / 合成的默认值 |
| 24 kHz | 12 kHz | 当前上行；也是 Azure 合成语音的输出率 |
| 44.1 kHz | 22 kHz | CD 音乐 |

24 降到 16，扔掉的只有 8 到 12 kHz 这一段。人说话的元音和音高在 1 kHz 以下，区分 s / f / sh / th 这些辅音的关键信息在 8 kHz 以内；8 kHz 以上基本只剩"空气感"和亮度，对音乐有用，对认字没用。

**为什么 Voice Live 默认 24 kHz：这是协议继承，不是语音工程选择。** `pcm16` 这个格式在 Realtime 协议里定义上就是 24 kHz：Azure .NET SDK 把 `InputAudioFormat.Pcm16` 描述为 "16-bit PCM audio format at default sampling rate (24kHz)"，输出格式同样；OpenAI 自己的文档把 `{"type":"audio/pcm","rate":24000}` 标为 default；GPT-Live 文档写明音频输入输出都是 24000 Hz 无头单声道 PCM。而 Voice Live 文档开篇就写"除特别说明外，Voice Live 使用与 Azure OpenAI Realtime API 相同的事件"，它是这套协议的超集，默认值只能跟着协议走。会话回显里 `input_audio_format` 和 `output_audio_format` 是同一个 `pcm16` 枚举，把输入单独改成 16 kHz 会破坏对称，也会让从 Realtime 迁过来的客户端全部失效。

对原生多模态模型，24 kHz 是对的。Realtime 这一支（`gpt-realtime`、`gpt-4o-realtime`、`gpt-live`）音频直接作为 token 进模型、直接作为 token 出模型，中间没有 STT 也没有 TTS：模型本身在 24 kHz 上训练；输出方向确实需要 24 kHz，合成语音的自然度靠 12 kHz 以内的高频，16 kHz 输出明显发闷，微软技术答复里有原话"24 kHz 比 16 kHz 清晰，更低的采样率会让音频听起来被压缩过"；一套格式服务两个方向最简单。

**但级联配置不属于那一支。**

| | 原生多模态（`gpt-realtime`） | 级联（如 `gpt-5-mini`） |
|---|---|---|
| 输入路径 | 音频直接进模型 | 音频先过 **Azure 语音转文字** |
| 输出路径 | 模型直接生成音频 | 文本再过 Azure 语音合成 |
| 输入的原生采样率 | 24 kHz | **16 kHz** |

Voice Live 官方对 `gpt-5-mini` 的描述是 "audio input through Azure speech to text"，how-to 里也明确"使用非多模态模型时 Azure 语音转文字自动生效"。所以 24 kHz 上行走到 Azure 就被降到 16 kHz 送进识别器，**多传的那一段 Azure 自己丢掉了。** 反过来看，`input_audio_sampling_rate` 这个参数存在且只接受 16000 和 24000，本身就说明 Azure 清楚级联用户不需要 24 kHz，给了退出开关：默认值照顾协议兼容，开关留给知道自己在做什么的人。

**降到 16 kHz 省多少、影响什么。**

| 采样率 | 原始 | 加 base64 | 实测含 JSON 封装 |
|---|---|---|---|
| 24 kHz | 384 kbps | 512 kbps | 540 到 680 kbps |
| 16 kHz | 256 kbps | 341 kbps | **391 kbps**（2026-10-03 精测，取代原「约 360 到 450」的估区间） |

**成帧开销后来被单独消掉了，见 4.5.4：现状是 256 kbps，等于原始码率，协议开销归零。** 本节讲的是
"降采样率省多少"，4.5.4 讲的是"同一份音频，怎么不再为协议多付"，两者是独立的乘数。

不受影响的：转写准确率（Azure 识别器本来就是 16 kHz 管线）；VAD 与断句；服务端降噪和回声消除（16 kHz 是这些模块的标准工作率）；数字人的声音（下行另一条路，数字人模式下是 WebRTC 的 Opus 音轨，SDP 里的 48 kHz 只是 Opus 的协议时钟标签，实际按 TTS 的 24 kHz 源选带宽档；上行为机器听、下行为人听，两个方向的合理采样率本来不同，见系列12 第四节）。题库驱动的面试场景里没有其它功能消费候选人的原始音频：打分走转写文本，"我答完了"这类口令是字符串匹配，音频不落盘，没有发音评测和语调情绪分析，所以唯一要关心的质量指标就是转写准确率。顺带一个小好处：浏览器麦克风原生多为 48 kHz，直接重采样到 16 kHz 比先到 24 kHz 再由 Azure 降到 16 kHz 少一次重采样。

**真要改，两边必须同时改（2026-09-30 已改）。** 前端麦克风侧要改两处：`getUserMedia` 的采样率约束和采集用的 `AudioContext`；后端会话侧要在 avatar 会话配置里声明 `input_audio_sampling_rate: 16000`（改之前没有声明，用的是 Azure 默认 24000，恰好和前端的 24 kHz 对上；改后后端把生效采样率回显在连接确认事件里，前端比对防两边漂移）。只改一边会让 Azure 按错误速率解释字节流，声音变调变速，转写直接废掉。播放侧的 24 kHz 不能动，那是 Azure 下发 PCM 的速率。这个参数和 avatar 码率一样，会话中途不能改，官方文档明确说明（[系列06](Voice%20Live系列06：轮次控制的五道关卡——create_response、response.create与Model、Agent模式的控制权归属.md) ① 听那一关的"会话中不可改采样率与 AEC 参考源"）。

**为什么上行不干脆压缩，而只是降采样率。** 先划清一层：WebSocket 本身与压缩无关，它只是字节管道，放 Opus 编码后的字节完全可以，它甚至有自己的 permessage-deflate 扩展（**对音频**几乎无效——但注意链路上传的不是音频而是 base64 文本，实测 deflate 把它压掉 27%，见 4.5.4）。限制在**应用层协议**：Voice Live 走 WebSocket 的事件协议只收三种输入格式：`pcm16`、`g711_ulaw`、`g711_alaw`，没有 Opus。Opus 只存在于 WebRTC 音频轨里，而 Voice Live 的 WebRTC 模式目前不支持 avatar（系列10 相关讨论）；浏览器虽然能用 WebCodecs 自己编 Opus，服务端也不认。G.711 是唯一可选的压缩格式，但它是 8 kHz 窄带、8 位压扩，64 kbps，电话音质，识别器虽然支持电话音频，准确率会有可感知的下降。另外 `input_audio_buffer.append` 只接受 base64 字符串，不能发二进制帧，所以无论哪种格式都要再付 33% 的编码开销——**但这句话只对 Azure 那一跳成立**，而我们到自己后端还有一跳，那一跳的 33% 是可以不付的（4.5.4）。上行可选项与代价如下：

| 上行格式 | 原始码率 | 加 base64 | 质量 | 备注 |
|---|---:|---:|---|---|
| pcm16 @ 24 kHz（当前） | 384 kbps | 512 kbps | 超宽带，识别器用不到的高频被 Azure 丢弃 | 协议默认 |
| pcm16 @ 16 kHz | 256 kbps | 341 kbps | 识别器原生带宽，理论无损 | 需 `input_audio_sampling_rate: 16000`，前后端同时改 |
| g711_ulaw / alaw | 64 kbps | 85 kbps | 8 kHz 电话音质 | 上行极窄时的最后一档，识别准确率待测 |
| Opus | 24~32 kbps | — | 宽带、最优 | WS 协议不支持；WebRTC 模式不支持 avatar |

顺带一个下行侧的对应发现：`output_audio_format` 有 `pcm16_16000hz` 与 `pcm16_8000hz` 两个变体，系列12 里"UDP 被封时重建不带 avatar 的会话、音频改走 WebSocket"的兜底路径，下行也可以用它们把 PCM 从 384 kbps 压到 256 或 128 kbps，代价同样是人耳可感的音质下降。

前提提醒：如果将来把语音模型换成 `gpt-realtime` 这类原生音频模型，本节结论要重新评估，那时输入降到 16 kHz 可能真的掉准确率。

#### 4.5.2 为什么会有这些不一致：三条产品线的拼接缝

"同一家 Azure、同样跑在 WebSocket 上，Speech SDK 收 Opus 而 Voice Live 不收""输入默认 24 kHz 而识别器原生 16 kHz""给浏览器的 WebRTC 模式能压缩却带不了数字人"——这组不一致不是技术上的奇怪，是产品拼接的缝。Voice Live 由三条不同出身的产品线粘成，每条都带着自己的传输假设：

| 组件 | 出身 | 带来的假设 |
|---|---|---|
| 会话与事件协议 | OpenAI Realtime API | 为后端与电话集成设计：WebSocket、JSON、base64、pcm16 与 G.711，24 kHz 默认 |
| 识别、VAD、降噪、TTS | Azure Speech 服务 | 自己的 SDK 协议历史更久、面向客户端，收压缩输入；识别管线原生 16 kHz |
| 数字人 | Azure Speech 的 TTS Avatar | 独立的 WebRTC 媒体管线：avatar 媒体服务器加 ACS 中继，信令借道会话 WS，只出不进 |
| Voice Live WebRTC 模式 | 2026 年新加 | 音频双向走 RTP、事件走 data channel，是另一条独立的 WebRTC 管线 |

读这张表：不收 Opus，是事件协议要与 Realtime 客户端兼容，音频枚举跟着 Realtime 走，Speech 那边的压缩输入能力没有接进来；输入默认 24 kHz 而识别器 16 kHz，同一根源；WebRTC 模式不支持 avatar，是数字人自己有一条 WebRTC 管线，新模式是另一条，两条还没合并，官方文档那句 "Avatar configurations are currently unsupported with side-band control" 里的 currently 表明微软自己也把它当待办；浏览器直连数字人就得用为后端设计的 WS 上传麦克风，是因为浏览器唯一能带数字人的路径是"WS 会话加 avatar 的 WebRTC"，而 WS 会话的上行格式由 Realtime 血统决定。

对照 OpenAI 自己的 Realtime API：它同样提供两种接入，WebSocket 给后端服务与电话集成（pcm16 / G.711 base64），WebRTC 给浏览器与移动端（Opus）。浏览器用户按推荐走 WebRTC，上下行都是 Opus 几十 kbps，且没有视频，弱网表现天然好；"要 24 kHz 音质"与"压缩到几十 kbps"并不矛盾，Opus 的 48 kHz 是时钟标签，实际按内容选带宽档，32 kbps 以上就保得住 12 kHz 以内的频段。本项目比 OpenAI 的默认形态更吃网络，正是因为数字人：上行被迫用 WS 传 PCM，下行多了一条 1080p 视频轨（弱网表现见[系列12](Voice%20Live系列12：数字人弱网表现——Azure码率自适应实测、1080p解码失效机制、胖视频饿死音频与关画面保声音.md)）。从时间线看这是过渡态：先用 Realtime 协议把 Speech 能力与数字人挂上，再补面向浏览器的 WebRTC 模式，最后一步才是把数字人接进新模式。以上是基于文档与观察行为的推断，微软没有公开说明这些取舍。

**已验证（2026-09-30）**：验证方式很便宜，live 配置支持用 WAV 文件当假麦克风，同一段录音分别在 24 kHz 和 16 kHz 会话下各跑一遍，直接 diff 转写文本。结果两档词错误率都是 0.0%，整句逐字一致，上面的推理成立。一个容易混的点：假麦克风素材的 WAV 本身是 48 kHz，那是文件采样率，不是会话参数；真实麦克风硬件通常也是 48 kHz，浏览器按会话要求重采样，`input_audio_sampling_rate` 只有 16000 与 24000 两个取值。落地时撞到的其他约束见[系列12 7.4](Voice%20Live系列12：数字人弱网表现——Azure码率自适应实测、1080p解码失效机制、胖视频饿死音频与关画面保声音.md#74-落地补记两条-azure-硬约束与不对称冷却)。

#### 4.5.3 转写的中间结果：Speech SDK 给，Voice Live 不给（2026-10-02 对照实测）

> 起因是一个产品需求：面试时候选人说话，希望文字**逐字上屏并随识别器修正而改写**——就是用 Speech SDK 做
> 流式识别时人人都见过的那个效果。前端按这个契约实现了（按 `item_id` 累积 partial、以稳定 id 原地替换、
> `.completed` 顶掉），但线上**一个字都不动**，要整句说完才一次性出现。查下来的四层，正好是 4.5.2 那条
> 拼接缝的一个新实例。

**第一层：协议里有这个事件。** `conversation.item.input_audio_transcription.delta` 在 2025-10-01、
2026-04-10、2026-06-01-preview 三个版本的参考文档里都有定义，服务端事件表标注 "Streaming input audio
transcription"，文档原话是"在转写**进行中**返回，提供**部分**结果"。所以不是我们查漏了。

**第二层：实测它不来。** 抓 `/voice-live/ws` 全量帧，同一段 12.47 s 的 WAV 假麦克风：

| 转写模型 | `transcription.delta` | `transcription.completed` |
|---|---:|---:|
| `azure-speech`（级联默认） | **0** | 1 |
| `mai-transcribe` | **0** | 1 |

两个模型都只在段末发一次。而 `mai-transcribe` 确实生效了（不是静默回退）：`language` 字段从 `en-US` 变成
`en`，并且同一段音频转写明显更准——`azure-speech` 把 "Notify the sponsor and the" 整段丢成了 "In the"。

同一次探针顺带把段边界的时序测实了（此前只是推断）：

```
+ 6894ms  input_audio_buffer.speech_started
+13702ms  input_audio_buffer.speech_stopped
+13702ms  input_audio_buffer.committed            ← 与 speech_stopped 同一毫秒
+14204ms  conversation.item.input_audio_transcription.completed   ← commit 之后 502 ms
```

所以转写是**对 committed 段的一次批式调用**，约 0.5 s 出结果。这也给出任何"文字出现"的硬下限。

**第三层：请求 schema 里没有开关。** 查 SDK `azure-ai-voicelive 1.3.0b1`（生成式客户端，是服务 schema 的
权威投影），三处：

| 查的位置 | 全部取值 |
|---|---|
| `AudioInputTranscriptionOptions` | `model`、`language`、`custom_speech`、`phrase_list` —— 共 4 个 |
| `RequestSession` | 22 个字段，无转写 interim 项 |
| `SessionIncludeOption` | `item.input_audio_transcription.logprobs`、`item.input_audio_transcription.phrases`、`file_search_call.results` |

`include` 本是最可能藏开关的地方（Realtime 惯例用它订阅额外内容），但枚举只有三个值。另外两个**容易误认**
的东西要排掉：

- **`interim_response`**（`RequestSession` 的字段）不是转写中间结果，是**助手侧的"思考过渡语"**。看它的
  触发器就清楚：`InterimResponseTrigger.LATENCY`（响应延迟超阈值）/ `TOOL`（工具调用执行中），配置类型
  `static_interim_response` / `llm_interim_response`。
- **`item.input_audio_transcription.phrases`** 这个 include 选项，对应的 `phrases` 字段挂在
  **`...TranscriptionCompleted`** 事件上，内容是 `TranscriptionPhrase`（offset/duration/text/words 的
  词级时间信息）。是**附在最终结果上的时间标注**，不是中间结果。

**第四层（决定性）：同一个资源、同一段音频，换 Speech SDK 就有。**

`SpeechRecognizer` + `start_continuous_recognition()`，连同一个 AI Services 资源
（swedencentral）、读同一个 WAV：

```
INTERIM (recognizing) : 14
FINAL   (recognized)  : 1
interim 间隔: 中位 102 ms（最小 55、最大 198）

[ 0] +4229ms  'i document the dev'
[ 1] +4335ms  'i document the deviation in'
[ 3] +4535ms  'i document the deviation in the side log'
[ 4] +4641ms  'i document the deviation in the side log the same day'
...
[13] +5697ms  '...assess whether subject safety or data integrity was affected'
FINAL +5852ms 'I document the deviation in the side log the same day, notify the sponsor and the
               medical monitor, and assess whether subject safety or data integrity was affected.'
```

interim 全小写无标点、逐步增长；final 补上大小写与标点——**"边说边改写"的效果在数据里是直接可见的**。

**结论：不是 Azure 做不到，是 Voice Live 这一层没有把它透出来。** 不是区域、不是 SKU、不是配额——同资源、
同凭据、同音频，换个接口就有。这与 4.5.2 的论断同形：会话与事件协议来自 Realtime 血统，识别能力来自 Speech
服务，而两边的能力**没有完全接起来**；4.5.2 举的例子是"Speech SDK 收 Opus 而 Voice Live 不收"，这里是
"Speech SDK 给 interim 而 Voice Live 不给"。

**一条结构性线索指出 `.delta` 是为谁设计的。** `ServerEventConversationItemInputAudioTranscriptionDelta`
自带一个 `logprobs: list[LogProbProperties]` 字段，而 `include` 里正有配套的
`item.input_audio_transcription.logprobs`。**logprobs 是 OpenAI 模型的概念**（token 对数概率），Azure
Speech 的识别器产出的是词与置信度，不是这个。所以合理推断：`.delta` 是为 `gpt-4o-transcribe` 那一族设计
的，而那一族要求 chat 模型是 `gpt-realtime` / `gpt-realtime-mini`。**该路径未测通**——把 chat 模型换成
`gpt-realtime` 后，我们的 `session.update` 被 Azure 以
`invalid_session_update_message`（"The \`type\` field of SessionUpdatedMessage message should be
'session.update'."）拒绝，尚未隔离是 `gpt-realtime` 本身、`gpt-4o-transcribe`、还是与 avatar 的组合。

**两个实现者会撞到的坑（都实际撞了）**

1. 资源**禁用了 key 认证**：拿 `.env` 里的 API key 打 Speech STT 返回 **401 WebSocket upgrade failed**。
   必须走 Entra，形式是 `SpeechConfig(auth_token=f"aad#{resourceId}#{aadToken}", region=...)`，
   token 的 scope 是 `https://cognitiveservices.azure.com`。
2. `REGION=global` **不是 Speech 的区域名**。SDK 会据此拼出不存在的
   `wss://global.stt.speech.microsoft.com/stt/speech/universal/v2`，报
   `WS_OPEN_ERROR_UNDERLYING_IO_ERROR`，看起来像网络问题而不是配置问题。真实区域要填
   `swedencentral` 这种。

**落地含义。** 要这个效果，现实路径是**双路**：Speech SDK 的流式识别**只用于显示**，Voice Live 的
`.completed` 仍是打分的唯一真相（前端那套 partial 原地替换 → final 顶掉的机制原封不动可接）。代价是同一份
麦克风音频上行两遍，而上行正是会把自己的 avatar 信令挤死的那条管道（系列12 结论五）。缓解办法：用 Voice
Live 的 `speech_started` / `speech_stopped` **当开关**，只在候选人真正说话时开启显示用识别器——面试绝大
部分时间是静音期，额外上行只在说话的那三四成时间里付，而判停权仍留在打分路径那一侧。

**方法学复盘：这一节我错了两次，都是同一类错。** 第一次把"文档写了有这个事件"读成"这条链路会来"；第二次
把"我们这套配置不发"推成"Azure 不能发"。第二次是负责人用自己的经验挡回来的——他早年用 Speech SDK 做过这个
效果，所以"Azure 不能"这个结论在他那里一眼就不成立。对照实验是他提的。教训与系列 05 §5.4 同形：
**判据必须是业务信号，而"某一层做不到"只能由"换一层仍做不到"来证明。**

#### 4.5.4 上行成帧：同一份音频，怎么从 391 kbps 降到 256 kbps（2026-10-03 实测落地）

4.5.1 省的是**采样率**。这一节省的是**成帧**——音频一个比特没少，少的是为协议多付的那部分。

**原来的样子，以及为什么会变成这样。** Web Audio 规范规定 `AudioWorkletProcessor.process()` 每
**128 帧**被调用一次，这是定值，与采样率无关；16 kHz 下就是每 **8 ms** 一次。而代码里这条链是 1:1 串起来
的：一个 render quantum → 一次 `postMessage` → 一次 base64 → 一次 `ws.send` → 一个 Azure 事件。中间没有
任何聚合。于是：

```
125 次/秒 × 391 B = 391 kbps      而音频本身只有 256 kbps
```

多出来的 135 kbps 不是音频：是 base64 的 +1/3，加上一个约 47 字节的 JSON 信封——而信封是**按条计费**的，
消息越多越亏。这就是"每 8 ms 发一次"真正的代价：它不是延迟问题（延迟上它是对的），是**计费单位**问题。

**三步，每步都量了：**

| | 消息/秒 | 平均消息 | payload |
|---|---:|---:|---:|
| 改前：8 ms 一条 base64+JSON | 125.0 | 391 B | 391 kbps |
| ① worklet 内攒满 40 ms 再发 | 25.0 | 1755 B | 351 kbps |
| ② Float32→Int16 移进 worklet，并用 transfer 转移所有权 | 25.0 | 1755 B | 351 kbps（省的是主线程，不是字节） |
| ③ 浏览器→自己后端改发二进制裸 PCM，后端再 base64 给 Azure | 25.0 | **1280 B** | **256 kbps** |

1280 B 就是 40 ms 的裸批次本身（640 样本 × 2 字节），**协议开销归零**，256 kbps 正是 16 kHz 单声道
PCM16 的理论地板。

关键是第 ③ 步合法的原因：**"只收 base64、不能发二进制"约束的是 Azure 那一跳，不是我们自己那一跳。**
浏览器→自建后端这一段协议由我们定，后端收到 bytes 后自己 base64 再封 `input_audio_buffer.append`，
Azure 侧收到的字节一模一样。4.5.1 里那句"无论哪种格式都要再付 33%"因此要加限定：对 Azure 那一跳成立，
对我们这一跳不成立。

**延迟与质量代价。** 延迟最多 +32 ms 上行缓冲，而 Azure 判停的静音窗是 800 ms，差两个数量级，判停不可能
察觉。质量做了对照实验而不是推理：同一段合成语音（摩擦音密集，与 24→16 kHz 那次 A/B 同一句），改前改后
各跑一遍转写，**词错误率都是 0.0%**。

**payload 不等于线路字节，而这件事推翻了另一条结论。** 握手实测：uvicorn 回
`Sec-WebSocket-Extensions: permessage-deflate; server_max_window_bits=12`，**这条 WebSocket 是开着压缩
的**。所以上面那张表是"交给传输层的工作量"，不是网络真实承载。在 TCP 层另测一遍：

| 成帧 | payload | 线路 | deflate 压到 |
|---|---:|---:|---:|
| base64 + JSON | 391 kbps | **约 285 kbps** | **73%** |
| 裸 PCM 二进制 | 256 kbps | **约 242 kbps** | **95%** |

说话时 285 → 242 kbps（−15%），静默时 15.0 → 3.4 kbps（**−77%**，因为静默期几乎只剩成帧开销）。

本文 4.5.1 原有一句旁注说 permessage-deflate「对音频几乎无效」。**这句话本身没错，错在它被用在了不传音频
的链路上**：改前链路上传的是 base64 **文本**，文本高度可压，deflate 实实在在压掉了 27%。由此得出一条**顺序
性的教训**，它比数字更值得记：

> 如果先按「deflate 对音频无效、是纯 CPU 浪费」把它关掉，而二进制还没上，上行会从 285 kbps **涨回**
> 391 kbps —— 倒退 37%。必须先有二进制，才轮得到谈关压缩；而二进制一上，deflate 只剩 5% 可压，关它才
> 真正变成"省 CPU 不费带宽"，同时这笔 CPU 也已经因为帧数降了 5 倍而小了 5 倍。

**版本错位必须协商，不能假设。** 前后端是两个独立滚动的容器应用，两个方向的错位都真实存在。新页面把二进制
发给旧后端会直接打到 `receive_text()` 上，relay 挂掉，表现是**麦克风静默失效**——候选人一直说，什么也没
上去。所以后端在连接确认事件里声明 `binary_audio` 能力位，页面看不到就继续走 base64，而后端两种都收。
（基线那一轮测量正好就是「旧页面 + 新后端」这个组合，整场 20 秒走 base64 路径跑完，顺带把这个方向验了。）


### 4.6 Avatar 类型

| 类型 | 技术 | 特点 |
|------|------|------|
| **Video Avatar** | WebRTC H.264 | 6 角色多样式，全身动作 |
| **Photo Avatar** | VASA-1 模型 | 24 角色，照片驱动面部动画 |

---

## 五、文字先于音频到达——这是正常行为

无论哪种架构，用户都会观察到**文字比音频先出现**。原因不是模型生成有先后，而是传输路径差异：

| 因素 | 文字 | 音频（尤其 Avatar 模式） |
|------|------|------------------------|
| 数据量 | 几十字节 JSON | 几 KB/帧（音频）或几十 KB/帧（视频） |
| 编码开销 | 无 | TTS 合成 + Avatar 渲染 + H.264/Opus 编码 |
| 传输协议 | WebSocket text frame | WebSocket binary 或 WebRTC RTP |
| 渲染开销 | DOM 更新一行文字 | 音频/视频解码 + 渲染 |

Avatar 模式下差距更大——音频需要额外经过口型同步计算 + 面部动画渲染 + 视频编码的完整 Pipeline。

---

## 六、关键工程挑战与解法

### 6.1 延迟控制

| 挑战 | 级联方案解法 | Azure Voice Live 解法 |
|------|------------|---------------------|
| STT 延迟 | 流式 WebSocket + partial transcript | Azure STT 内置 |
| LLM 延迟 | 流式 SSE + 句子缓冲器 | GPT Realtime 原生流式 |
| TTS 延迟 | 流式合成 10-20x 实时速度 | Azure TTS 内置 |
| 总延迟 | ~755ms（首音频） | 更低（端到端优化） |

### 6.2 打断处理（Barge-in）

用户在 AI 说话时插嘴是自然对话的核心需求。两种方案都通过 VAD 检测实现：
- **级联方案**：Silero VAD（2MB，<1ms 处理时间）
- **Azure Voice Live**：AzureSemanticVad（云端 VAD + 降噪 + 回声消除一体化）

### 6.3 安全性

| 维度 | 级联方案 | Azure Voice Live |
|------|---------|-----------------|
| Azure 凭据保护 | 服务端部署 | Backend Proxy 模式；Entra ID 优先（Managed Identity），API Key 仅作回退 |
| 传输加密 | WSS/HTTPS | WSS + WebRTC DTLS/SRTP |
| 身份验证 | 自定义 | 登录 JWT 只用于换取短期会话 token，会话 token 服务端可撤销；媒体面 DTLS 指纹绑定 |

Azure 的 DTLS 指纹机制特别精巧：SDP 中声明浏览器的密码学指纹，WebRTC 握手时验证——即使 TURN 凭据泄露，攻击者也无法伪造 DTLS 私钥。

---

## 七、实践总结与选型建议

### 适合级联流水线的场景

- 需要 **完全自托管**（数据不出企业网络）
- 需要 **灵活选型** 各组件（如特定语言的 STT、自研 LLM）
- 需要 **深度定制** 流水线逻辑

### 适合 Azure Voice Live API 的场景

- 需要 **快速上线**（无需组装三个服务）
- 需要 **数字人 Avatar**（Azure 原生集成 WebRTC 视频流）
- 可以接受 **云端依赖**
- 需要 **一站式能力**（VAD + 降噪 + 回声消除 + STT + LLM + TTS + Avatar 全托管）

### 技术趋势

Salesforce 论文的核心结论仍然成立——在自托管端到端音频生成方案（如 Qwen3-Omni 的优化部署）成熟之前，级联流水线仍是企业自主部署的实用选择。但 Azure Voice Live API 已经证明，**云端托管的端到端方案在延迟和集成度上有明显优势**，尤其在需要数字人交互的场景中。

> **一句话总结**：Voice Live Agent = LLM 的脑 + 语音的嘴和耳。级联流水线给你最大控制权，Azure Voice Live 给你最快上线速度。选哪个取决于你对"自主可控"和"快速交付"的权衡。

---

## 相关文章

- [从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构](../../Notes/AI/agent/从Google五种Skill%20Pattern到Agent%20Runtime——Skill、MCP与Agent的统一架构.md) — Agent 架构设计
- [Agent经典范式与人类问题处理模式的映射](../../Notes/AI/agent/Agent经典范式与人类问题处理模式的映射.md) — Agent 范式分类
- [Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践](../Azure%20Copilot%20生态全景：Skills、MCP%20Server%20与%20Copilot%20Agents%20的协作实践.md) — Azure AI 生态
