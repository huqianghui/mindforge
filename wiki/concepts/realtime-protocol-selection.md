---
title: "Realtime Protocol Selection"
created: "2026-05-24"
updated: "2026-10-02"
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
- **最近更新**：2026-10-02
- **置信度**：0.8（真实项目根因排查 + 生产环境 9/9 轮实测验证）
- **状态**：active

> WebRTC 传候选有 Trickle ICE（增量补发，RFC 8838）与 Vanilla ICE（offer 一次性带全候选）两种模式。Azure 数字人信令是一次性的（offer 以 base64 blob 经 `session.avatar.connect` 只发一次，无补发通道），所以"发前收集齐候选"是本信令通道下的标准做法——但 `complete` 信号的语义是"**所有**网络接口都了结"，被最慢最坏的接口绑架：VPN 虚拟网卡对 STUN/TURN 的 UDP 请求石沉大海（无响应也无错误）、mDNS 混淆地址解析、IPv6/代理路由黑洞，都让它在多网卡环境永远不来——每次连接硬等满 8s 兜底超时（开发者/企业办公电脑必现，"干净"家庭网络测不出）。修复的关键是**场景特化知识**：Azure 数字人 relay-only（下发的 `ice_servers` 只有一个带凭据 relay，无 STUN、无 P2P），胜出候选已知——SDP 里有第一个 relay candidate（+300ms 收敛窗收同批）就是"够用集"，后续 host 候选永远不会被选中，正确性零损失而 ICE 段 **8s→0.38s**（生产 n=9 全部走快路径、中位 0.54s，无一打满兜底）。可推广原则：**很多"标准做法"的等待，等的是通用假设下的最坏情况；对服务端行为有确定性知识时，等待条件就可以收窄**——前提是兜底全部保留（null candidate / `complete` / 超时三信号仍在，正常网络行为不变）。配套判据：兜底超时每次被打满即主信号失效，值得显式标记 + 报警。
>
> 2026-10-02 修正（Voice Live 系列10 / 12）：本条"Azure 数字人 relay-only、胜出候选已知为 relay"的前提已被系列12 弱网探针推翻——开发机实测选中候选对为 srflx ↔ srflx 直连、未走 TURN，Azure 媒体服务器公网可达，拓扑是**直连优先、relay 保底**。"全量集→够用集"结论不变，但成立理由改为"两类候选同源"：Azure 只下发一台兼做 STUN 的 TURN，srflx 与 relay 来自同一次往返、host 必输，胜出者只可能是这两类之一；且 300 ms 收敛窗是规则的一部分而非余量（relay 比首个可用候选晚约 140 ms，n=3 两次胜出者正是窗内才到的 relay）。换多 STUN / TURN 或 host 可胜出的服务端，捷径失效。协议层展开见下方"ICE / STUN / TURN 速览"Claim。

### Claim: 媒体面/控制面的术语精确化与双通道的代价面——uplink 音频 WebRTC 化后后端收缩为"纯控制面"；音频播放路径分叉导致服务端 AEC 参考失配

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]（2026-09 双通道章节修订）、[[Voice Live系列05：两类数字人头像——viseme驱动的Video Avatar与VASA-1生成的Photo Avatar]]、[[Voice Live系列07：重复致谢排查——三次Thank you的三个开轮来源、转写指纹与编排层修法]]
- **首次出现**：2026-09-19
- **最近更新**：2026-09-25
- **置信度**：0.75
- **状态**：active

> "双通道两条路径职责严格解耦"的术语精确化：avatar 模式下全部输出（音频+视频）统一走 WebRTC 保证 AV 同步，WS 只承载上行麦克风与控制面；**媒体面始终 browser↔Azure 直连、控制面始终经后端**——uplink 音频 WebRTC 化后，后端是收缩为"纯控制面"而非被绕过（弱网收益判断依据）。传输层对两类数字人头像完全相同（同一 ICE/SDP 握手、H.264）：系列03 的 ICE 门控与预热占位策略对 photo 头像直接复用，photo 逐帧生成发生在 Azure 侧 GPU、不引入客户端时序新环节。代价面（VL07 生产实证）：音频播放路径分叉（WS audio delta vs WebRTC 视频流音轨）导致服务端 AEC 参考信号失配——双通道架构的副作用，需 Live-Reference AEC 补偿。

### Claim: ICE / STUN / TURN 速览——三类候选是三个视角的地址，一次性信令（Vanilla ICE）逼出门控，"够用集"捷径成立的前提是"两类候选同源"且 300 ms 收敛窗是规则一部分；TURN 不是联邦网络，自建只替换浏览器一侧、默认中继是默认答案

- **来源**：[[Voice Live系列10：ICE、STUN与TURN——数字人WebRTC建连的候选类型、一次性信令与直连优先relay保底拓扑]]、[[Voice Live系列11：自建TURN中继——ice_servers替换入口、coturn要求、与Azure侧的关系及何时值得]]、[[Voice Live系列12：弱网表现——Azure码率自适应实测、1080p解码失效机制、胖视频饿死音频与关画面保声音]]
- **首次出现**：2026-09-30
- **最近更新**：2026-10-02
- **置信度**：0.8（RFC 8445 / 8489 / 8656 / 8838 核对 + 真机 SDP / `onicecandidate` 抓取；收敛窗 n=3 单一网络；自建 TURN 部分为文档核对尚未实施，0.7）
- **状态**：active

> **ICE 是什么**（RFC 8445）：WebRTC 建连前要解决 WebSocket 从不面对的问题——双方到底用哪一对地址互发 UDP 包；ICE 就是"收集候选、两边交换、逐对试通、选出一对能用的"这套流程，没有"跳过 ICE"的模式。三类候选的区别在地址从哪个视角看到：**host** 本机网卡（局域网门牌，零往返，只有同局域网对端能用）/ **srflx** STUN 反射出的公网出口（小区大门，一次 UDP 往返，要 NAT 放行入向）/ **relay** TURN 分配的中继端口（邮局信箱，谁都寄得到、多一跳）。STUN（RFC 8489）只"照镜子"产出 srflx；TURN（RFC 8656）在其上加 Allocate / Permission，承载全部媒体产出 relay，要带宽与短期 HMAC 凭据。SDP 里每个候选一行 `a=candidate:… typ host|srflx|relay`，`priority` 量级 host 2.1e9 > srflx 1.7e9 > relay 4e7；ICE 按优先级逐对发探测，第一对通且优先级最高者胜出——**到达顺序不在考虑里**。**门控为什么存在**：Trickle ICE（RFC 8838）offer 先发候选陆续补，前提是信令通道能反复双向传；Azure 数字人 offer 是经 `session.avatar.connect` 只发一次的 blob、没有补发消息，退回 Vanilla ICE——一个包必须自带所有会用到的候选，发前必须等"胜出者进包"。"先到先得"不成立：能不能用要对方一起试过才知道；先到的 host 恰恰必输；一次性信令没有后补机会。所以"等 `complete`"是教科书解（官方参考实现亦如此），只是 `complete` 的语义是"所有网卡都了结"，被悬着的 VPN 网卡绑架到 8 秒兜底。**捷径的前提**：Azure 只下发一台兼做 STUN 的 TURN，srflx 与 relay 来自同一次往返、host 必输，胜出者只可能是这两类之一；但两者并非同时到——relay 稳定晚约 140 ms（n=3，两次胜出者正是窗内才到的 relay），所以 300 ms 收敛窗兜住的是同一次往返内两个候选的到达间隔，不是冗余保险。换多 STUN / TURN 或 host 可胜出的服务端，捷径失效；通用 SDK 不写死部署事实是对的；`iceTransportPolicy: "relay"` 不是解——VPN 网卡上的 relay 申请一样悬着，门控的关键是"不等最坏的网卡"而非"少收集"。ICE 的必要成本只有几百毫秒加一次到中继的往返，那 7.6 秒是等待策略不是 ICE。**TURN 非联邦**（系列11）：一台 TURN 只做转发，对端只是一个公网 `IP:端口`；自建 TURN（如 coturn）通过 `session.avatar.ice_servers` 传入即原样回显、只替换浏览器一侧的中继，Azure 侧不变也不需要知道，唯一前提是你的 TURN 能出向到达 Azure 在 answer 里给的候选（打印 `a=candidate` 行确认地址段）。六项要求：公网可达（UDP 3478 + TCP/TLS 443）、短期 HMAC 凭据后端现算、允许对端为 Azure 公网地址、按并发 × 码率预留配额、放在两端之间、真实证书；验证三处：`session.updated` 回显、`getStats()` 选中 candidate-pair 的 relay 地址、TURN 日志。**默认中继零运维且含在分钟费里**，只在出向白名单只允许自家域名 / 合规要求媒体经自有基础设施 / 客户离 Azure 中继接入点很远三种情况下值得自建，代价是带宽、证书、容量可用性、凭据四项运维。
>
> 本条是 Voice Live 系列10 / 11 的压缩版：extract 曾自主建独立概念页 ice-nat-traversal，2026-10-02 用户裁决暂不建（尚未读懂）、撤回，内容压入本页；读懂后若要独立成页，按 LOOP_STATE HOLD 10-02 分区复核。

### Claim: WebRTC 与 WebSocket 建连成本的差异本质是"对等"与"客户端-服务器"——WebRTC 在拓扑已退化为客户端-服务器时仍付 ICE 固定开销；TURN over TCP/443 是协议能力但 Azure 默认不下发 TCP 候选，"防火墙严格限 UDP → 只用 WebSocket"的选型条件获实测续证

- **来源**：[[Voice Live系列10：ICE、STUN与TURN——数字人WebRTC建连的候选类型、一次性信令与直连优先relay保底拓扑]]、[[Voice Live系列12：弱网表现——Azure码率自适应实测、1080p解码失效机制、胖视频饿死音频与关画面保声音]]
- **首次出现**：2026-09-30
- **最近更新**：2026-10-02
- **置信度**：0.85
- **状态**：active

> WebSocket 没有配对问题不是因为更聪明，而是它**放弃了对等**：一方必须是公网可达服务器，连接方向固定（客户端发起，NAT 天然允许出向 TCP + 回包）、地址已知（DNS 名），"双工"建在这条单向发起的连接之上——HTTP / gRPC / MQTT 全都如此。WebRTC 为 peer-to-peer 媒体设计，两端都可能在 NAT 后、谁也不能"被连"、走哪条路取决于双方 NAT 类型，所以必须 ICE（收集候选 → 交换 → 同时互发探测打洞 → 选胜出者）；它走 UDP 又让 NAT 映射更短命、规则更杂。Azure 数字人"一端明明是服务器"却仍要 ICE，是因为 WebRTC 没有"跳过 ICE"的模式——媒体服务器公网可达、能直连就直连，同时给一台 TURN 保底（企业网对 UDP 极不友好），走 TURN 并回落 TCP/443 时做的事本质上和 WebSocket 一模一样（客户端出向连已知地址、媒体在隧道里双向走），但协议机器照走，ICE 的必要成本只有几百毫秒加一次到中继的往返。对本页选型框架的续证："防火墙严格限 UDP → 只用 WebSocket"这条 05 月条件在 Azure 数字人上成立得更硬——Azure 默认下发的 `ice_servers` 只有 `turn:…:3478` UDP、没有 `?transport=tcp` 候选，客户端也不能自加（凭据是 Azure 的），Chromium 禁用非代理 UDP 时 avatar 连接 60 秒从未 connected；UDP 封死则既无画面也无声音，唯一兜底是重建不带 avatar 的会话让音频以 PCM 回到 WebSocket（可用 `output_audio_format` 的 `pcm16_16000hz` / G.711 变体压码率）。媒体面 / 控制面续证：ICE 候选类型本身即是客户网络的分段测点——只有 host 候选 = UDP 门没过；srflx↔srflx = 直连；含 relay = 中继且 RTT 多一跳；选中候选对的 `currentRoundTripTime` 才是到媒体服务器的真实 RTT（无固定域名、不能事先 ping），到中继的 STUN RTT 不代表区域 RTT（本机 80 ms vs 区域 TCP 建连 252 ms）。

### Claim: RTP / RTCP 与 UDP 的分工及弱网失效链——UDP 决定包怎么送到，RTP 决定包里是什么、何时播、丢了怎么知道；"丢了就丢了"是抖动缓冲 + FEC + 按需 NACK 而非放任；抖动缓冲 < RTT 时 NACK 迟到→GOP 报废，码率自适应调带宽不调包数；音视频同车则胖视频饿死音频；WebSocket 传 PCM 无 RTP 头，抖动直接变延迟累积

- **来源**：[[Voice Live系列10：ICE、STUN与TURN——数字人WebRTC建连的候选类型、一次性信令与直连优先relay保底拓扑]]、[[Voice Live系列12：弱网表现——Azure码率自适应实测、1080p解码失效机制、胖视频饿死音频与关画面保声音]]
- **首次出现**：2026-09-30
- **最近更新**：2026-10-02
- **置信度**：0.85（RFC 3550 / 4585 核对 + getStats 真机实测）
- **状态**：active

> RTP（RFC 3550）是承载音视频本身的应用层协议，不负责送达（那是 UDP 的事），负责"让对方知道这段字节是什么、该什么时候播"：12 字节起的头含 sequence number（发现丢包与乱序，只"发现"不自动重传）、timestamp（采样时钟，抖动缓冲靠它对齐）、payload type（Opus / H.264 / VP8）、SSRC（区分同连接的音频轨与视频轨）、marker（一帧最后一个包）；成对的 RTCP 由接收端周期报告丢包率 / 抖动 / RTT，发送端据此调码率或触发关键帧，NACK 与 PLI 也是 RTCP 消息；WebRTC 默认 RTP/RTCP 复用同一 UDP 端口并强制 DTLS-SRTP。本页 05 月"WebSocket 传音频五缺陷"Claim 的机制续证：WS 那条管道把 PCM 字节直接放进 WebSocket 帧，没有 RTP 头、没有时间戳对齐与丢包恢复，全靠 TCP 保序，抖动直接变成延迟累积；数字人那条 WebRTC 管道里音视频都是 RTP 包（这也是 avatar 模式下 WS 上看不到 `response.audio.delta` 的原因）。"丢了就丢了"的准确说法是**放弃"全部到达且有序"换"到了的立刻能用"**：抖动缓冲吸收乱序与抖动、FEC 用冗余包就地恢复、按需 NACK 只对来得及的帧请求重传，要避开的是 TCP 队头阻塞。**弱网失效链**（系列12 实测）：接收端抖动缓冲目标是 Chrome 按到达抖动、帧大小波动与 RTT 运行时算出的（实测约 369 ms，取向低延迟），服务端没有任何对应参数；RTT 609 ms > 369 ms 时 NACK 重传回来已过播放时刻、整帧丢弃，H.264 P 帧依赖前帧则整个 GOP 不可解——1080p 一帧 5 个以上 RTP 包（载荷约 1200 字节）丢一个即死、0 fps 却仍吃约 1 Mbps，512×512 一帧 1~2 包照播；REMB 码率自适应只改"每秒多少比特"这一个旋钮，不改分辨率 / 帧率 / GOP / 抖动缓冲，所以**自适应回答的是"管子够不够粗"，1080p 遇到的是"信拆成几页寄、丢一页补寄来不及"**。音频与视频同一条传输时胖视频把管道占满、音频包跟着丢和迟到（3% 丢包下 31% 原始补偿率，关视频轨后 2.5%）。编解码侧：Opus 在 RTP / SDP 里永远写 48000（RFC 7587 时钟标签），内部按内容选带宽档（NB 8k / WB 16k / SWB 24k / FB 48k），"Opus 48 kHz"与"该不该用 16 kHz"不是同一个问题；值得质疑的是协商成立体声约 130 kbps（人头是单声道源，常规语音 Opus 24~48 kbps），浏览器可在 offer fmtp 请求 `stereo=0` / `useinbandfec=1` / `maxaveragebitrate`，发送端通常尊重——与被忽略的 `b=AS` 不是同一机制。

## 冲突与演进

- **2026-08-16**：全部 6 条 Claims 证据停在 2026-05-24，距今 84 天超过 60 天线，维护标 stale，等新证据复核（复核素材已见 08-09 loop-weekly 语音三连发条目）。
- **2026-09-16**：注入 Voice Live 系列03 ICE 门控 Claim（"全量集→够用集"）——页面获得首条生产实测级 WebRTC 协议工程续证，脱离全 stale 状态；sufficient-set-waiting 按裁决不独立建页，原则收入本条。
- **2026-10-02**：ICE 门控 Claim 的"relay-only"前提按系列12 探针实测加修正注（直连优先、relay 保底，成立理由改为"两类候选同源 + 收敛窗是规则一部分"）；注入系列10 / 11 / 12 三条 Claim（ICE / STUN / TURN 速览；对等 vs 客户端-服务器的建连成本本质 + Azure 只下发 UDP TURN 对"限 UDP → 只用 WS"选型条件的续证；RTP/RTCP 分工与弱网失效链对"WS 传音频五缺陷"的机制续证）。ICE / STUN / TURN 协议层压成一条速览 Claim 收入本页（extract 曾自主建 ice-nat-traversal 页，用户裁决暂不建、撤回），弱网降级实施归 [[weak-network-adaptive-degradation]]。

## 关联概念

- [[voice-live-agent]] — `part-of` 协议选型是 Voice Live Agent 架构的基础设施层决策

## 来源日记

- [[2026-05-22-周五]] — 整理 WebSocket 与 WebRTC 深度对比文章
- [[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]] — 核心来源
- [[Voice Live系列03：数字人出场延迟优化——ICE门控根因、实测分解与预热占位策略]] — ICE 门控快路径根因剖析与生产实测（Trickle vs Vanilla ICE、"全量集→够用集"）
- [[Voice Live系列10：ICE、STUN与TURN——数字人WebRTC建连的候选类型、一次性信令与直连优先relay保底拓扑]] — 对等 vs 客户端-服务器、ICE 必要成本定位、RTP/RTCP 与 UDP 分工、relay 定位四处校正
- [[Voice Live系列11：自建TURN中继——ice_servers替换入口、coturn要求、与Azure侧的关系及何时值得]] — TURN 非联邦、`ice_servers` 替换入口与六项要求、何时值得自建
- [[Voice Live系列12：弱网表现——Azure码率自适应实测、1080p解码失效机制、胖视频饿死音频与关画面保声音]] — srflx↔srflx 直连实测、UDP-only TURN 与 UDP 封锁行为、弱网失效链与音视频同车、Opus 时钟标签
- [[2026-09-30-周三]] — 系列10/11/12 成文与"直连推翻 relay-only"修正记录
