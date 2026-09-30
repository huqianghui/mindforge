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
| 16 kHz | 256 kbps | 341 kbps | 约 360 到 450 kbps |

不受影响的：转写准确率（Azure 识别器本来就是 16 kHz 管线）；VAD 与断句；服务端降噪和回声消除（16 kHz 是这些模块的标准工作率）；数字人的声音（下行另一条路，数字人模式下是 WebRTC 的 Opus 48 kHz）。题库驱动的面试场景里没有其它功能消费候选人的原始音频：打分走转写文本，"我答完了"这类口令是字符串匹配，音频不落盘，没有发音评测和语调情绪分析，所以唯一要关心的质量指标就是转写准确率。顺带一个小好处：浏览器麦克风原生多为 48 kHz，直接重采样到 16 kHz 比先到 24 kHz 再由 Azure 降到 16 kHz 少一次重采样。

**真要改，两边必须同时改（尚未改）。** 前端麦克风侧要改两处：`getUserMedia` 的采样率约束和采集用的 `AudioContext`；后端会话侧要在 avatar 会话配置里声明 `input_audio_sampling_rate: 16000`（目前没有声明，用的是 Azure 默认 24000，恰好和前端的 24 kHz 对上）。只改一边会让 Azure 按错误速率解释字节流，声音变调变速，转写直接废掉。播放侧的 24 kHz 不能动，那是 Azure 下发 PCM 的速率。这个参数和 avatar 码率一样，会话中途不能改，官方文档明确说明（[系列06](Voice%20Live系列06：轮次控制的五道关卡——create_response、response.create与Model、Agent模式的控制权归属.md) ① 听那一关的"会话中不可改采样率与 AEC 参考源"）。

前提提醒：如果将来把语音模型换成 `gpt-realtime` 这类原生音频模型，本节结论要重新评估，那时输入降到 16 kHz 可能真的掉准确率。

**尚未验证**：以上是文档与架构推理，没有实测。验证方式很便宜：live 配置已支持用 WAV 文件当假麦克风，同一段录音分别在 24 kHz 和 16 kHz 会话下各跑一遍，直接 diff 转写文本。

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
