---
title: "Speech Technology Stack"
created: "2026-04-13"
updated: "2026-10-02"
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

### Claim: 采样率与编解码按方向分——上行为机器听（识别器原生 16 kHz，8 kHz 以内信息足够），下行为人听（TTS 24 kHz 保 8~12 kHz 亮度）；Voice Live 输入默认 24 kHz 是协议继承，级联配置降 16 kHz 省三分之一上行且转写无差异；WS 上行只收 pcm16 / G.711 无 Opus，Opus 48 kHz 只是时钟标签

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]（4.5.1，2026-09-30）、[[Voice Live系列12：数字人弱网表现——Azure码率自适应实测、1080p解码失效机制、胖视频饿死音频与关画面保声音]]（§四）
- **首次出现**：2026-09-30
- **最近更新**：2026-10-02
- **置信度**：0.8（官方文档核对 + 16 kHz A/B 实测词错误率 0.0%）
- **状态**：active

> 采样率意义由奈奎斯特定理决定（可记录最高频率 = 采样率一半）：8 kHz 电话发闷 / 16 kHz 语音识别行业标准与 Azure 语音默认 / 24 kHz 当前上行与 Azure 合成输出率 / 44.1 kHz CD。人声元音与音高在 1 kHz 以下，区分 s / f / sh / th 的关键信息在 8 kHz 以内，8 kHz 以上基本只剩"空气感"——对音乐有用、对认字没用。**Voice Live 输入默认 24 kHz 是 Realtime 协议继承**（`pcm16` 在协议里定义上就是 24 kHz，输入输出同一枚举）而非语音工程选择；级联配置下 24 kHz 上行到 Azure 就被降到 16 kHz 送进识别器，多传的那段 Azure 自己丢掉；`input_audio_sampling_rate` 只接受 16000 / 24000，默认值照顾协议兼容、开关留给知道自己在做什么的人。降到 16 kHz：原始 384→256 kbps、含 base64 与 JSON 封装实测 540~680→约 360~450 kbps；不受影响的有转写准确率（识别器本来就是 16 kHz 管线）、VAD 与断句、服务端降噪与回声消除（16 kHz 是这些模块的标准工作率）、数字人声音（下行另一条路）；顺带少一次重采样（浏览器麦克风原生多为 48 kHz）。**两边必须同时改**（`getUserMedia` 约束 + 采集 `AudioContext` + 后端 `input_audio_sampling_rate: 16000`，只改一边声音变调变速转写直接废），播放侧 24 kHz 不动，会话中途不可改；A/B 实测两档词错误率均 0.0%、整句逐字一致。**为什么只降采样不压缩**：WebSocket 本身与压缩无关，限制在应用层协议——Voice Live 的 WS 事件协议只收 `pcm16` / `g711_ulaw` / `g711_alaw`，没有 Opus（Opus 只在 WebRTC 音频轨里，而 WebRTC 模式目前不支持 avatar）；G.711 是 8 kHz 窄带 8 位压扩 64 kbps 电话音质，识别准确率有可感知下降；`input_audio_buffer.append` 只收 base64 字符串，任何格式都再付 33% 编码开销。四种上行格式代价：pcm16@24k 384 / 512 kbps（协议默认，高频被丢弃）、pcm16@16k 256 / 341（识别器原生带宽理论无损）、G.711 64 / 85（上行极窄的最后一档）、Opus 24~32（WS 不支持）。**下行方向相反**：avatar 连接里的音频是 WebRTC 音频轨、强制 Opus（压缩后大小由码率决定而非采样率，24~32 kbps 已远超电话清晰度）；RFC 7587 规定 Opus 在 RTP / SDP 里永远写 48000，内部按内容自动选带宽档（NB / WB / SWB / FB），Azure TTS 24 kHz 源进 Opus 最多用到超宽带档——"Opus 48 kHz"与"该不该用 16 kHz"不是同一个问题；下行是给人听的，人耳对 8~12 kHz 敏感、那段决定合成语音是否发闷，这是微软把 TTS 定在 24 kHz 的原因，"24 降 16"只改上行 PCM 那条。真正值得质疑的是下行协商成立体声约 130 kbps（人头是单声道源，没有信息增益只让码率翻倍）。下行走 WS 的兜底会话里 `output_audio_format` 有 `pcm16_16000hz` / `pcm16_8000hz` 变体，可把 384 压到 256 / 128 kbps，代价是人耳可感的音质下降。原生音频模型（`gpt-realtime` 一支）在 24 kHz 上训练，换到它时输入降 16 kHz 的结论要重新评估。

### Claim: Speech Out 层的"声"与 LLM 层的"字"是两套控制面——语速、表现力 / 情绪、发音走 `session.voice` 会话级参数而非逐句 SSML；旋钮不等于生效要靠回显断言；`voice.type` 与模型是硬约束，配错静默失败

- **来源**：[[Voice Live系列09：脚本朗读的机制化——pre_generated绕过模型推理、宿主模型与代码、prompt、voice三层分工]]
- **首次出现**：2026-09-30
- **最近更新**：2026-10-02
- **置信度**：0.8（`azure-ai-voicelive` SDK 与 API 参考核对；回显断言实测；`voice.type` 允许清单 2026-10-01 实测）
- **状态**：active

> prompt 只能影响模型生成出来的字；读题走 `pre_generated` 时连字都不是模型生成的，prompt 对"语气"毫无作用。语音层由会话的 `voice` 对象控制（`session.update`）：`name` 选声音（600 多种神经语音，HD 语音更有表现力）、`temperature` 0~1 表现力 / 情绪起伏（HD 语音生效，即 FAQ 里的 voice temperature）、`rate` "0.5"~"1.5" 语速（字符串）、`style` 说话风格、`prosody`（pitch / rate / volume 的 SSML 式值如 `+10%` / `-2st` / `-6dB`，2026-04-10 及之后 API 参考）、`custom_lexicon_url`（发音词典，格式同 SSML lexicon，"SLA""OKR"这类缩写怎么念——与本页 G2P / Lexicon Claim 的机制同源）、`custom_text_normalization_url`（数字日期读法）。两个限制：**它们是会话级参数不是逐句 SSML**——`pre_generated` 文本是纯文本，文档未声明支持内联 `<speak>` / `<prosody>`，"这题读慢一点"的路径是在两次读题之间 `session.update` 改 voice（切换延迟待 live 验证）；**情绪不能像 SSML `express-as` 逐句指定**，只能靠 `temperature` + `style` + 选一个本身有情绪特征的声音。系列04"输出表现力上限是 Azure TTS（HD Voice / Custom Voice + SSML）"的上限说法不变，但在 Voice Live 会话内触达它的手段是 `voice` 参数。实践教训：管理端的语音温度 / 语速旋钮只被旧的构建器用到、实际会话构建器只传 `name` 与 `type`——"以为在控制，其实那条路径根本没接上"，只有抓 WS 帧断言 `session.updated` 回显的 `voice.temperature` / `voice.rate` 才知道生效没有；接上之后原本"无害"的输入范围（温度 0~2、语速 0.5~2）要重审，超范围会让 `session.update` 被拒、整条语音通道 "Voice unavailable"。**`voice.type` 与模型是硬约束**：`azure-realtime` 只配 `azure-realtime-native`；`gpt-realtime` 配 `openai` / `azure-standard` / `azure-platform` / `azure-custom` / `custom` / `azure-personal` / `avatar-voice-sync`（不含 native）；配错报 `invalid_voice_type`，失败形态是 `rtc.call.error` 回来而 SDP answer / PeerConnection / 出向音频全正常只是永远无回复，排查判据必须用业务信号。

## 冲突与演进

- 2026-09-12：注入音量包络口型同步 Claim（Blender 系列04 实测）——Speech Out 层新增"音频信号直接驱动动画"的实现档与简化/精细分界判据，页面 active 证据回填。
- 2026-10-02：注入 Voice Live 系列01 4.5.1 + 系列12 §四（采样率与编解码按方向分：上行为机器、下行为人；24 kHz 协议继承、16 kHz 实测无损、WS 不收 Opus、Opus 48k 时钟标签）与系列09（`session.voice` 会话级参数 vs 逐句 SSML、旋钮不等于生效、`voice.type` 硬约束）两条 Claim——Speech In 的采样率层与 Speech Out 的发音控制体系（G2P / Lexicon）04 月 Claims 获生产级续证。

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
- [[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]] — 4.5.1 输入采样率 24 kHz vs 16 kHz（协议继承 / 语音工程 / 四种上行格式代价表，2026-09-30 增补）
- [[Voice Live系列12：数字人弱网表现——Azure码率自适应实测、1080p解码失效机制、胖视频饿死音频与关画面保声音]] — §四 Opus 与 PCM、48 kHz 时钟标签、上行为机器下行为人、立体声 130 kbps
- [[Voice Live系列09：脚本朗读的机制化——pre_generated绕过模型推理、宿主模型与代码、prompt、voice三层分工]] — 第六节 `session.voice` 参数表与两个限制、旋钮未接入陷阱、`voice.type` 允许清单
