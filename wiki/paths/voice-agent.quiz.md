---
title: "题库：语音 Agent 与实时交互"
created: "2026-11-07"
updated: "2026-11-07"
tags:
  - wiki
  - path
  - quiz
path_id: "voice-agent"
---

# 题库：语音 Agent 与实时交互

配合 [[voice-agent]] 使用，按站点分组。题型：**场景**（给一个情境，说出你会怎么判断）、**辨析**（一句常见说法，判断对错并说出为什么）、**解释**（用自己的话讲清一个机制）。答案是参考要点，说出主要意思即可。

## 第 1 站 · 全景：语音技术栈三层

### Q1 · 解释

**问**：实时语音 Agent 的三层技术栈是什么？每层各举两个组件。

**答**：Speech In（降噪、回声消除、VAD、STT）、Core Processing（LLM 推理、对话管理、工具调用）、Speech Out（TTS、G2P、发音控制、数字人口型）。三层可以分别替换，也可以被端到端模型合并。

**出处**：[[speech-technology-stack]]

### Q2 · 辨析

**问**："音频前处理的几个模块先后顺序无所谓，都开着就行。"对吗？

**答**：不对。前处理链有严格的执行顺序，比如回声消除要在降噪之前、VAD 要在干净信号上判断；顺序错了，前一级的残留会让后一级误判。

**出处**：[[speech-technology-stack]]（Claim「音频前处理链有严格执行顺序」）

### Q3 · 解释

**问**：为什么上行和下行的采样率可以不一样？

**答**：上行是给机器听的：识别器原生 16 kHz，8 kHz 以内的信息就够；下行是给人听的：TTS 用 24 kHz 保住 8~12 kHz 的亮度，听感更自然。

**出处**：[[speech-technology-stack]]

### Q4 · 辨析

**问**："只有 WebRTC 才能用 Opus 编码。"对吗？

**答**：不对。Opus 是编码格式，不是 WebRTC 专属；这是 Voice Live WebSocket 接口的限制——WS 输入只收 pcm16 等格式，所以看起来像"只有 WebRTC 能用 Opus"。

**出处**：[[speech-technology-stack]]

## 第 2 站 · 架构：级联与端到端

### Q1 · 解释

**问**：判断一个系统是不是"模块化"的级联架构，用什么标准？

**答**：看每个模块能不能单独替换——STT、LLM、TTS 能各自换厂商或换模型而不动其他部分，才是真正的级联。

**出处**：[[cascaded-pipeline]]

### Q2 · 辨析

**问**："端到端语音模型还不能用于企业生产，企业只能用级联。"对吗？

**答**：已经过时。端到端（Realtime S2S）已经可以用于生产，但控制力较弱；级联和混合式在多语言、自定义声音、interim response、逐字念题这些企业需求上仍占优，所以企业场景仍常用级联或混合式。

**出处**：[[cascaded-vs-e2e-voice]]、[[voice-live-agent]]

### Q3 · 解释

**问**：语音 agent 低延迟的关键是什么？

**答**：不是让单个组件更快，而是让组件重叠执行（streaming + pipelining）：STT 边听边出字、LLM 边收边生成、TTS 边收边合成。

**出处**：[[voice-cascaded-pipeline]]

### Q4 · 场景

**问**：Voice Live 把级联和端到端放在同一个 API 后面，切换只是改配置。这带来什么好处和副作用？

**答**：好处是架构决策降级为配置项，切换成本很低。副作用是控制面归属跟着翻转，而且模型是会话宿主——VAD、STT、TTS、avatar 都挂在模型会话上，宿主不可拆，选模型时要一并考虑这些能力。

**出处**：[[cascaded-vs-e2e-voice]]

## 第 3 站 · 听：VAD 与 EOU

### Q1 · 解释

**问**：VAD、EOU、turn-taking 三者分别判断什么？

**答**：VAD 判断有没有人声；EOU 判断这句话说完没有；turn-taking 决定该不该接话、什么时候接。三者是三层，不能混为一谈。

**出处**：[[voice-activity-detection]]、[[end-of-turn-detection]]

### Q2 · 辨析

**问**："OpenAI 的 semantic VAD 和 Azure 的 semantic VAD 是同一个东西。"对吗？

**答**：不对。同名不同义：Azure 的 `azure_semantic_vad` 管起止检测的噪音鲁棒性，EOU 要另配；打断是编排层的策略开关。OpenAI 的 semantic_vad 主要做 end-of-turn 判断。

**出处**：[[voice-activity-detection]]、[[end-of-turn-detection]]

### Q3 · 辨析

**问**："配好 EOU 就能解决 agent 抢话的问题。"对吗？

**答**：不完全。EOU 只决定"何时触发判停"，不决定"是否放行开轮"——它挡得住句中想词，挡不住用户说完一句后在想下一个要点，也挡不住客户端补发。

**出处**：[[end-of-turn-detection]]

### Q4 · 解释

**问**：为什么基础的能量 VAD 不够用？

**答**：它只看音量，无法区分"思考停顿"和"说完了"，会在用户停顿时误判结束、抢话。

**出处**：[[voice-activity-detection]]

## 第 4 站 · 接话：turn-taking 与打断

### Q1 · 解释

**问**："轮"有哪三种含义？为什么要分开？

**答**：生成轮次（一次 response）、对话历史里的 assistant 轮、语音轮（`turn_detection` 的 turn）。三者不一一对应——一个语音轮可能触发多次生成，脚本朗读时也可能有生成但没有语音轮，混在一起排查会出错。

**出处**：[[turn-taking]]

### Q2 · 场景

**问**：用户反馈"每次说完要等很久才回答"。按每轮延迟的构成，你先看哪一项？

**答**：先看 VAD 静音判定窗——它是每轮最大的单项。话轮判停是决策参数而不是技术延迟，调小判停时间能明显变快，但会增加抢话。

**出处**：[[turn-taking]]

### Q3 · 辨析

**问**："音频走 WebSocket PCM 时，用户打断就能让服务端立刻停止播放。"对吗？

**答**：不对。下行走 WebSocket PCM 时服务端不到 1 秒就把整段音频灌完并发出 complete，服务端已经没有可截断的对象，打断要在客户端丢弃本地缓冲。

**出处**：[[turn-taking]]

### Q4 · 辨析

**问**："全双工模型出来后，turn-taking 这个难题就不存在了。"对吗？

**答**：要加范围。在半双工（VAD 判停）范式下，turn-taking 是核心难题；全双工模型把这个难题内化为模型能力，但开轮、门控、脚本朗读等应用层判断仍然要做。

**出处**：[[turn-taking]]

## 第 5 站 · 说：Speech Out 与口型

### Q1 · 解释

**问**：G2P 在 TTS 流水线里做什么？为什么它决定语音 agent"做大之后会不会崩"？

**答**：G2P 把字素转成音素，决定每个词怎么读。专有名词、多音字、品牌名一多，发音错误就会频繁出现；能不能控制发音（词典、SSML、lexicon）决定规模化后的质量。

**出处**：[[grapheme-to-phoneme]]

### Q2 · 辨析

**问**："用 GPT-Realtime 就没法控制发音。"对吗？

**答**：只对纯 S2S 路线成立。Voice Live 的混合式（Realtime 出文本 + Azure TTS 出声）可以照常用 lexicon，选对路线就能拿回发音控制。

**出处**：[[grapheme-to-phoneme]]

### Q3 · 解释

**问**："声"和"字"为什么是两套控制面？

**答**：字由 LLM 层决定（说什么），声由 Speech Out 层决定（怎么说）；语速、表现力、发音走 `session.voice` 这类会话级参数，而不是靠逐句 SSML。

**出处**：[[speech-technology-stack]]

### Q4 · 辨析

**问**："数字人口型就是按 viseme 查表贴图。"对吗？

**答**：不对。viseme 是离散的驱动信号，渲染输出是连续的，实际是协同发音条件下的神经渲染；viseme 时间轴只是云端计算与本地渲染之间的耦合接口。

**出处**：[[viseme]]

## 第 6 站 · 传输：WebSocket 与 WebRTC

### Q1 · 解释

**问**：在双通道架构里，WebSocket 和 WebRTC 各管什么？

**答**：WebSocket 是控制总线，传会话配置、事件和文本；WebRTC 是实时传输通道，传音视频媒体。Voice Live 里事件主要走 WebSocket，DataChannel 不是必需的。

**出处**：[[realtime-protocol-selection]]

### Q2 · 辨析

**问**："WebRTC 和 WebSocket 的区别就是 UDP 换成 TCP。"对吗？

**答**：远不止。丢包处理、编码、抖动缓冲、拥塞控制、发送节奏、媒体经不经过后端全都不同；最大的取舍是媒体要不要经过你的后端。

**出处**：[[realtime-protocol-selection]]

### Q3 · 场景

**问**：一个数字人项目在企业网络里 WebRTC 总连不上，有没有不走 WebRTC 的办法？

**答**：有。数字人也可以只走 WebSocket：avatar 的 `output_protocol: websocket` 会把音视频合成为分片 MP4 经 WebSocket 下发，代价是延迟和弱网表现不如 WebRTC。

**出处**：[[realtime-protocol-selection]]

### Q4 · 解释

**问**：WebRTC 建连为什么比 WebSocket 贵？

**答**：WebRTC 按"对等"设计，即使拓扑已经退化成客户端-服务器，仍要付 ICE 候选收集与连通性检测的固定开销；WebSocket 本来就是客户端-服务器，一次握手即可。

**出处**：[[realtime-protocol-selection]]

## 第 7 站 · 穿透：ICE、STUN 与 TURN

### Q1 · 辨析

**问**："纯语音走 WebSocket 时也要配 STUN / TURN。"对吗？

**答**：不对。ICE / STUN / TURN 属于 WebRTC 而不属于数字人或语音本身；纯语音走 WebSocket 时四者全无，改走 WebRTC 时 ICE 必有，STUN / TURN 视网络而定。

**出处**：[[ice-nat-traversal]]

### Q2 · 解释

**问**：ICE 候选是"源地址"还是"接收地址"？host 和 srflx 是什么关系？

**答**：候选是接收地址。host 与 srflx 共用同一个本地 socket（base），srflx 是 NAT 映射出的公网视角；prflx 是对端从检测包里学到的地址。

**出处**：[[ice-nat-traversal]]

### Q3 · 场景

**问**：怎么确认一次 WebRTC 连接实际走的是直连还是 relay？

**答**：在 webrtc-internals 或 getStats 里看 nominated 候选对两端的 candidateType：两端都是 host / srflx 是直连，有一端是 relay 就是走 TURN。

**出处**：[[ice-nat-traversal]]

### Q4 · 解释

**问**："relay 保底"有什么隐含前提？

**答**：浏览器的同一个本地 UDP 端口要能分别到达多个对端。如果安全客户端把端口钉死在第一个对端，直连和 relay 会在同一个原因上一起失败。

**出处**：[[ice-nat-traversal]]

## 第 8 站 · 数字人工程：配额、弱网与降级

### Q1 · 辨析

**问**："数字人弱网时，应用应该自己做码率自适应。"对吗？

**答**：不必。Azure 数字人发送端已经做了 REMB 码率自适应，应用不用重复实现；而且客户端没有带宽杠杆，SDP 的 `b=AS` 会被忽略。

**出处**：[[weak-network-adaptive-degradation]]

### Q2 · 解释

**问**：为什么说"自适应救不了 1080p"？

**答**：抖动缓冲预算（约 369 ms）小于 RTT（约 609 ms）时，NACK 重传永远迟到，P 帧依赖让整个 GOP 报废，画面变成 0 fps，带宽却照样被占着。

**出处**：[[weak-network-adaptive-degradation]]

### Q3 · 场景

**问**：弱网下数字人声音断断续续，但画面还在动。你会怎么降级？为什么降级必须"不对称"？

**答**：关掉视频轨保音频——实测关画面后音频补偿率和 RTT 都大幅下降，胖视频会饿死同车的音频。降级不对称是因为 `session.avatar.connect` 每个会话只接受一次，中途开关画面都要重建会话。

**出处**：[[weak-network-adaptive-degradation]]

### Q4 · 解释

**问**：数字人有哪两条配额限制？哪条关闭会话就释放、哪条不退还？

**答**：同时活跃 5 个（容量限制，关闭即释放），每滚动 60 秒新建 3 个（限流，关闭不退还，窗口从创建时刻算起）。

**出处**：[[Voice-Live系列13：数字人配额与限流]]

## 第 9 站 · 大脑怎么挂：模型接入三条路径

### Q1 · 解释

**问**：给 Voice Live 会话挂"大脑"有哪三条路径？各有什么约束？

**答**：原生 `model=`（只认按 region 预部署的清单）、BYOM（用 profile 选上游协议，并随之定死直通或级联）、Agent（Foundry agent 三件套，无 profile，架构上是级联）。

**出处**：[[voice-live-agent]]（Claim「给会话挂大脑有且只有三条路径」）

### Q2 · 场景

**问**：同一个模型名，在 judge 里能用、在 Voice Live 里却报 region 错误。为什么？

**答**：一个"模型"字段承载了两种语义：judge、打分、agent 底层模型吃的是你自己的 deployment，而 Voice Live 原生 `model=` 不吃自有 deployment，只认 region 预部署清单。要拆成"推理模型"和"会话模型"两个字段。

**出处**：[[voice-live-agent]]

### Q3 · 辨析

**问**："Voice Live 走的是全托管端到端路线。"对吗？

**答**：过窄。Voice Live 是托管语音层，可以挂 Realtime（S2S）、级联、混合式、BYOM 或 Agent，不只是端到端。

**出处**：[[voice-live-agent]]

### Q4 · 场景

**问**：一个面试场景要逐字念题、不能改一个字，同事想挂 Foundry agent。你怎么看？

**答**：应用开轮 + 现成文本逐字读的情况下 agent 价值为零，挂上反而丢 per-turn instructions、多一圈 runtime。用 `pre_generated_assistant_message` 让 response 不调模型，读题从 prompt 约束变成机制约束。

**出处**：[[voice-live-agent]]、[[Voice-Live系列09：脚本朗读的机制化]]

## 第 10 站 · 企业网络现场：GSA 下的数字人

### Q1 · 解释

**问**：GSA 下数字人无画无声的根因是什么？

**答**：GSA 的 Internet Access 以 TCP 为中心，UDP 支持不完整；它把浏览器的本地 UDP 端口钉死在第一个对端，破坏了 ICE"一个 socket 对多个对端"的前提，直连和 relay 同时失败。应用侧无解，只能 bypass 或关 GSA。

**出处**：[[global-secure-access]]

### Q2 · 场景

**问**：开着 GSA 时 Azure 端点出现大面积 DNS 解析超时。你先查什么？

**答**：查 Private Access 在 macOS 上写的 `/etc/resolver` 规则：通道断开而规则没撤时，命中后缀的域名全部解析超时；而且规则要从父域名开始截，同一后缀下的公网资源也会被一并截获。

**出处**：[[global-secure-access]]

### Q3 · 辨析

**问**："经 GSA 访问 Azure OpenAI 变慢，用 `--resolve` 直接指 IP 就能绕开。"对吗？

**答**：不对。经 Private 通道每个新连接多约 1.1~1.3 秒，大头在 TLS，`--resolve` 指 IP 也绕不开。做延迟测试前先确认 GSA 状态。

**出处**：[[global-secure-access]]

### Q4 · 场景

**问**：客户说"企业网络里数字人无画无声"，列出你的前三步排查。

**答**：① 确认是否开着 GSA 等 SSE 客户端（bypass 后能否恢复）；② 在 webrtc-internals 看 ICE 是否从未连通、nominated 候选对是什么；③ 看是否一个本地 UDP 端口对多个对端被阻断，必要时改走 WebSocket 下发数字人做对照。

**出处**：[[Voice-Live系列17：Global-Secure-Access下数字人的网络问题解析]]
