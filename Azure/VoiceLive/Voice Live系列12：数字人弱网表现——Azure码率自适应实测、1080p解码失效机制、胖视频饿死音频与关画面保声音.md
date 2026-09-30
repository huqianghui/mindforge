---
title: Voice Live 系列 12：数字人弱网表现——Azure 码率自适应实测、1080p 解码失效机制、胖视频饿死音频与关画面保声音
created: 2026-09-30
tags:
  - azure
  - voice-agent
  - voice-live-api
  - webrtc
  - avatar
  - networking
  - performance
  - troubleshooting
description: 系列03 与系列10 的实测全部在开发机与云上好网络。本文用 getStats 探针加 OS 层 UDP 限速，把数字人在办公网弱网下的行为测清：Azure 发送端协商了 REMB 反馈并确实按接收端带宽估计自动降码率（1080p 从 2382 降到 718 kbps），程序不需要再做一遍；客户端 SDP 的 b=AS 上限被忽略，会话中 session.update 改码率被静默忽略，唯一杠杆是建会话时的 session.avatar.video.bitrate。但自适应救不了 1080p：1% 丢包下抖动缓冲预算（369 ms）小于 RTT（609 ms），NACK 重传永远迟到，P 帧依赖使整个 GOP 不可解，视频 0 fps 却仍吃约 1 Mbps，且 freezeCount 为 0 是假象；512×512 照片数字人一帧只占 1 到 2 个包，同档位照常播。画面与声音共用一条 RTP 传输，胖视频流把面试官声音饿到 31% 由丢包隐藏合成，关掉视频轨（保留 m=video 但 a=inactive，同会话内可行）后降到 2.5%、RTT 少 340 ms，对照组复现。麦克风上行 PCM16 24 kHz 加封装约 600 kbps，在 300 kbps 上行下把自己的 SDP 挤死，是自伤不是环境限制。UDP 被封则既无画面也无声音，Azure 只下发 UDP TURN。给出五条已确认事实、P0 到 P4 全自动的自适应设计（触发用音频健康度而非冻结次数）与五条明确不做的事，附测量方法与两个方法学坑
---

# Voice Live 系列 12：数字人弱网表现——Azure 码率自适应实测、1080p 解码失效机制、胖视频饿死音频与关画面保声音

> 系列03 把数字人出场与对话轮次的延迟测清了，系列10、11 把 relay-only 拓扑讲透了，但所有实测都在开发机和云上的好网络上。客户的办公网不是这样：共享上行、VPN、1% 到 3% 的丢包、上百毫秒的时延。这一篇回答三个问题：Azure 数字人流是否自适应码率、卡顿的机制是什么、部署到客户办公网时该定什么规则。方法是浏览器侧 getStats 探针加 OS 层限速，全部数字来自 2026-09-30 的真机实测。
> 结论先看第一节；两个反直觉的机制在第五节（1080p 一帧都解不出来却仍吃带宽、胖视频饿死音频）；决定性对照在第六节（关画面让语音质量提升一个数量级）；自适应设计在第七节。它同时修正了系列05、11 里"照片数字人码率低一个数量级"的说法：默认下只差约 2.4 倍。

---

![弱网下数字人的失效机制与自适应阶梯：1080p 卡死不是丢包本身，是重传赶不上播放时刻|780](../../asset/voice-live-weaknet-degradation-2026-09-30.svg)

## 一、结论先行

1. **Azure 数字人发送端协商了 REMB 带宽反馈**（`goog-remb` 加 `abs-send-time`，没有 transport-cc），并且**确实按接收端估计自动降码率**：1080p 视频数字人随网络恶化 2382 → 1415 → 1053 → 718 kbps，全程贴着 `availableIncomingBitrate` 走。"让程序按带宽调码率"这件事 Azure 已经做了，不需要再实现一遍。
2. **客户端没有带宽杠杆。** SDP 里声明的 `b=AS` / `b=TIAS` 上限被 Azure 忽略：加了 `b=AS:500`，1080p 仍以 1.9 Mbps 发送。会话中通过 `session.update` 改 `avatar.video.bitrate` 也被静默忽略，Azure 回 `session.updated` 但回显仍是 2000000。**码率只能在建会话时由服务端 `session.avatar.video.bitrate` 定**：设 500 kbps，1080p 从 1.5 Mbps 降到 460 kbps；设 300 kbps，照片数字人从 645 降到 276 kbps。
3. **自适应救不了 1080p。** 1% 丢包、单向 80 ms 时延下，1080p 视频数字人从第二个采样点起 `framesPerSecond` 为 null，30 多秒里没有解出一帧，画面停在首帧，却仍吃约 1 Mbps。机制是抖动缓冲预算小于 RTT，NACK 重传永远迟到。同档位 512×512 照片数字人稳定 18 到 37 fps。
4. **胖视频流会饿死同一条连接上的音频。** 3% 丢包下，1080p 数字人死前有 31% 的面试官声音是丢包隐藏算法合成的；关掉视频轨后降到 2.5%，RTT 从 876 降到 534 ms，对照组两轮复现。这是最要命的一条：候选人听不清题目，面试直接作废。
5. **麦克风上行不是小数目。** PCM16 24 kHz 加 base64 加 JSON 封装实测 540 到 680 kbps。上行限到 300 kbps 时，`session.avatar.connect` 的数 KB SDP 排在几百个音频帧后面发不出去，数字人握不上手。这是自伤，不是环境限制。
6. **UDP 被封则既无画面也无声音。** Azure 下发的 ICE 只有 `turn:relay.communication.microsoft.com:3478` UDP，没有 `?transport=tcp` 候选，客户端也无法自行加 TURN/TCP（凭据是 Azure 的）。avatar 模式下 WS 上不发 `response.audio.delta`，所以封 UDP 后候选人能被听到和转写，面试官却无声无画。
7. **照片数字人的码率优势比预期小**：默认下 645 对 1548 kbps，约 2.4 倍，不是一个数量级。真正拉开差距靠 `video.bitrate` 上限，不是换角色。

## 二、测量方法

**探针。** 一个 opt-in 的 Playwright live spec（真 Azure，不进 CI），在页面注入脚本收集 `RTCPeerConnection` 实例与 SDP，每秒调用 `getStats()` 采 inbound-rtp 的 video 与 audio、selected candidate-pair，并包裹 `WebSocket.send` 统计麦克风上行字节。输出逐秒表与 JSON。可注入 `b=AS` 上限、可切纯音频 offer。

**限速必须在 OS 层做。** Chrome DevTools 的网络限速只作用于 HTTP 与 WebSocket，不影响 WebRTC 的 UDP 媒体流。macOS 自带的 dnctl 加 pfctl 可以对非 loopback 流量限带宽、丢包、时延，需要 sudo。Chromium 内置的假网络字段试验两种格式都试过，这版 Playwright Chromium 不含该管道，没生效。

**指标定义。**

| 指标 | 来源 | 含义 |
|---|---|---|
| 视频 kbps | inbound-rtp bytesReceived 差分 | 实际到达的视频码率 |
| bwe | candidate-pair `availableIncomingBitrate` | 接收端 REMB 估计，Azure 据此降码率 |
| 冻结 | `freezeCount` / `totalFreezesDuration` | 帧间隔超过均值 3 倍或均值加 150 ms 的次数；25 fps 下一次 RTT 级重传就是一次冻结。**1080p 上会骗人**，见第五节 |
| 解码 fps | `framesPerSecond` | 为 null 即解码器没出帧，判断视频健康要看它 |
| 补偿占比 | audio `concealedSamples` 增速 / 48 kHz | 面试官声音有多少是丢包隐藏算法"编"出来的 |
| 死亡 t | 视频码率归零的秒数 | 媒体流何时死 |

**四档限速（只限 UDP，即 avatar 媒体）。**

| 档位 | 下/上 kbps | 丢包 | 单向时延 | 对应场景 |
|---|---:|---:|---:|---|
| baseline | 无限速 | 0 | 0 | 开发网对照 |
| office-ok | 4000 / 2000 | 0.5% | 50 ms | 一般办公网 |
| office-tight | 1500 / 800 | 1% | 80 ms | VPN、共享上行 |
| office-bad | 800 / 400 | 3% | 120 ms | 拥塞、热点 |
| uplink-starved | 4000 / 300，限全部流量 | 0 | 20 ms | 麦克风 WS 上行对 300 kbps |

**一个方法学坑。** 第一次跑 office-tight 以下三档六轮全失败，页面报 "Voice connection timeout (30s)"，后端日志是 8 次连 `wss://…/voice-live/realtime` 超时。原因是限速范围包含了后端到 Azure 的 TCP，1% 丢包加 80 ms 时延让 TLS 握手过不去，会话根本没建。这在生产上不成立：后端跑在 Azure 内，客户办公网只承载"浏览器到后端 WS"和"浏览器到 Azure WebRTC"两条流。修正为视频档位只限 UDP；uplink-starved 档限全部但丢包为 0，让 TLS 能握手、只暴露带宽问题。

## 三、第一阶段：无限速基线与四个前提逐项验证

**基线与杠杆试验（开发网，每档 45 秒）。**

| 档位 | 角色 | 视频 kbps 均值（min/max） | 帧 | 视频丢包 | 冻结次 / 秒 | NACK | 音频丢包 | RTT ms | 上行 kbps |
|---|---|---|---|---:|---|---:|---:|---:|---:|
| 默认 | amira 照片 | 645 (389/839) | 512×512 @25 | 64 | 34 / 9.1 | 346 | 49 | 315 | 676 |
| 默认 | lisa 视频 | 1548 (887/4164) | 1920×1080 @21 | 32 | 8 / 9.4 | 147 | 55 | 296 | 535 |
| 客户端 `b=AS:500` | lisa | 1920 (764/3644) | 1920×1080 @25 | 1 | 59 / 15.2 | 522 | 45 | 293 | 664 |
| 服务端 bitrate=500k | lisa | 460 (92/1481) | 1920×1080 @25 | 1 | 82 / 23.7 | 498 | 141 | 291 | 623 |
| 服务端 bitrate=300k | amira | 276 (152/370) | 512×512 @25 | 4 | 2 / 0.6 | 8 | 8 | 281 | 542 |
| 会话中 `session.update` 400k | lisa | 前 1184 / 后 2785 | 1920×1080 @25 | — | 72 / 19.3 | 557 | — | — | — |

读法：音频丢包与视频码率无关，可当作"这一轮网络有多差"的对照列，所以 bitrate=500k 那轮的冻结数不能和基线比，bitrate=300k 那轮网络最好、冻结也最少。开发网的随机波动不足以下结论，必须在限速下重复。协商到的编码是视频 H.264（照片数字人还多给了 VP8 选项）、音频 Opus 48 kHz 立体声，说话时约 130 kbps，静音期 DTX 到 1 到 2 kbps。ICE 路径全程 srflx 到 srflx，说明开发机能直连 Azure 媒体服务器、没走 TURN。

**"好网络"上就已经在卡。** 本机到 Azure 媒体服务器 RTT 约 300 ms。每丢一个视频包，重传要等一个 RTT 以上，解码器冻结 0.3 秒左右。45 秒窗口里视频冻结 9 秒，占 20%。冻结次数与丢包数近似 1 比 1，所以降码率（少发包）在同等丢包率下直接减少冻结。这条对照片数字人成立，对 1080p 要改读为"冻结约等于 NACK 次数除以若干"，见第五节。

**程序自适应的四个前提逐项验证。**

| 前提 | 验证方法 | 结果 |
|---|---|---|
| Azure 会不会随接收端反馈自动降码率 | 需要真实限速 | 第二阶段确认：会，见第五节 |
| 会话中能否改码率 | 连接后 12 秒经语音 WS 发 `session.update`，携带完整 `session.avatar` 对象、`video.bitrate=400000` | Azure 接受消息、回 `session.updated`，但回显 bitrate 仍为 2000000，码率不变。**会话中改不了，只能重建会话** |
| 前端能否承受会话中多出来的 `session.updated` | 同上一轮观察 | 一次性握手守卫拦住了重握手，不会重连或黑屏，安全 |
| 办公网只放 TCP 时能不能连 | Chromium 策略禁用非代理 UDP | **60 秒内 avatar 连接从未到 connected**。Azure 只下发 UDP 3478 的 TURN |

从 `session.updated` 回显顺带拿到的事实：Azure 端 avatar 默认 `video.bitrate=2000000`、`gop_size=10`（25 fps 下每 0.4 秒一个关键帧，解释了 3 Mbps 级别的突发）、`output_protocol=webrtc`。还有一个**说话与静音的码率倒挂**：1080p 视频数字人读题期间约 1.1 到 1.4 Mbps，`switch_to_idle` 之后跳到 2.5 到 3.5 Mbps。数字人"听候选人说话"的静音阶段是最贵的阶段，而面试大部分时间正是这个阶段。照片数字人没有这个现象，全程约 650 kbps。

## 四、通道结构与"关画面保声音"的两条路

开启数字人时有两条独立通道：Voice Live WebSocket（麦克风上行、转写、VAD、题目控制，TCP 443）和 avatar 的 WebRTC 连接（数字人画面加说话声音两条 RTP 轨，服务端唇形对齐，UDP 3478 TURN）。Azure 在 avatar 模式下不在 WS 上发 `response.audio.delta`，所以"UDP 被封"的准确描述是：候选人能被听到和转写，面试官既无画面也无声音。

**路 A：同一条 avatar 连接里只收音频。**

| 变体 | Azure 反应 | 结果 |
|---|---|---|
| 去掉 `m=video`（只有 audio） | `error`: "Avatar connection failed: WebRTC SDP negotiation failed: peer connect created failure: None is not in list" | **拒绝**。前端还把这个 error 当成需要重连 WS，连开 3 条 PC 都失败 |
| 保留 `m=video` 但 `a=inactive`，音频 `recvonly` | 正常回 SDP answer，ICE connected，`ontrack kind=audio`，`switch_to_speaking` 后音频 60 到 80 kbps，读题完成；视频 0 kbps | **成功**。同一会话内即可关画面保声音，无需重建 |

路 A 两个产品侧注意点：前端"首读等 avatar 就绪"的门等的是首帧视频（系列03 第一节），纯音频时会等满约 6 秒超时才读题，要改成"等音轨或首帧任一"；ICE 一样要求 UDP 可达，路 A 解决的是带宽，不是 UDP 封锁。

**路 B：重建会话，不带 `avatar`。** Azure 改为在 WS 上下发 PCM 音频，前端已有这条播放路径（无角色的 persona 即此模式）。代价是一次重连和几秒中断，但它是 UDP 被封时唯一能出声的路。

## 五、第二阶段：UDP-only 限速数据与五条结论

每档 40 秒，限速只作用于 UDP。"死亡 t"是视频码率归零的秒数，"死前音频补偿"是流死亡之前每秒被丢包隐藏算法合成的音频比例。

| 档位 | 角色 | 视频 kbps | 解码 fps | bwe | RTT ms | 死亡 t | 死前音频补偿 | 冻结 s / 存活 s |
|---|---|---:|---:|---:|---:|---|---:|---|
| baseline | amira 512² | 505 | 24 | 797 | 284 | 存活 | 0.0% | 0.0 / 38 |
| baseline | lisa 1080p | 2382 | 24 | 2714 | 291 | 存活 | 4.9% | 18.5 / 38 |
| office-ok | amira | 782 | 25 | 701 | 432 | 存活 | 2.1% | 19.1 / 39 |
| office-ok | lisa | 1415 | 26 | 1986 | 440 | 存活 | 2.5% | 24.6 / 38 |
| office-tight | amira | 849 | 24 | 1206 | 473 | 存活 | 10.5% | 28.7 / 39 |
| office-tight | lisa | 1053 | **0** | 1111 | 609 | 42 s | 10.7% | — |
| office-bad | amira | 827 | 24 | 504 | 644 | 42 s | 4.5% | 20.3 / 30 |
| office-bad | lisa | 718 | **0** | 597 | 876 | 44 s | **31.3%** | — |

### 5.1 Azure 确实会自适应降码率，方向正确、幅度也够

lisa 的视频码率随网络单调下降：2382 → 1415 → 1053 → 718 kbps，全程贴着 `availableIncomingBitrate` 走。amira 到 500 到 850 kbps 就不再往下，那是照片数字人的下限档，office-ok 下它反而升到 782 kbps，是重传字节。所以"让程序按带宽调码率"Azure 已经做了。

### 5.2 但自适应救不了 1080p：丢包 1% 时它一帧都解不出来

office-tight 和 office-bad 两轮 lisa 的 `framesPerSecond` 从第二个采样点起就是 null，`totalDecodeTime` 和 `jitterBufferDelay` 全程不再增长：约 1 Mbps 的视频字节一直在到，解码器 30 多秒里没有成功解出一帧。画面停在首帧或黑屏，带宽照吃。同一档位下 amira 稳定 18 到 37 fps。

机制是**抖动缓冲预算小于 RTT**：抖动缓冲目标 369 ms，RTT 609 ms。1080p 一帧要 5 个以上 RTP 包，丢一个就要 NACK 重传，重传回来已过播放时刻，整帧丢弃；H.264 的 P 帧依赖前帧，后续整个 GOP 全部不可解。照片数字人一帧只占 1 到 2 个包，多数帧一次到齐，不依赖重传，所以照常播。`pliCount` 全程为 0，说明接收端只靠 NACK 修复、没有请求关键帧重传，这一项在 Azure 侧是否可配值得再查。

**"冻结次数"这个指标在 1080p 上会骗人**：解不出帧就不会产生 freeze 事件，lisa 的 freezeCount 为 0 看起来比 amira 的 90 次"好"，实际是完全不动。判断视频健康要看 `framesPerSecond` 是否为 null。

### 5.3 胖视频流会饿死同一条连接上的音频

面试官的声音和画面共用一条 RTP 传输。office-bad 档 lisa 死前有 31.3% 的音频是丢包隐藏算法合成的，同档 amira 只有 4.5%。网络差时 1080p 数字人不仅自己不动，还把面试官的声音搞坏到听不清。流死亡之后补偿率升到 100%，即完全静音。

### 5.4 媒体死亡后自愈生效，但有几秒空窗

office-bad-amira 在 t=42 视频归零，t=46 ICE 报 disconnected，t=49 触发第一次恢复，t=50 重建 PeerConnection。宽限窗口按设计工作（系列10 的媒体层自愈）。但"码率归零"到"ICE 报错"之间有 4 秒，界面仍显示已连接，用户看到的是画面卡住且无提示。

### 5.5 麦克风上行会把自己挤死

上行限到 300 kbps（无丢包）后两轮均失败：能建起会话的那一轮里 ICE 收集从平时的 1 秒拖到 4.3 秒，`session.avatar.connect` 发出后 SDP 应答等不到，最终 "Voice connection timeout (30s)"。原因不是网络慢，是麦克风流把上行占满了：PCM16 24 kHz 加 base64 约 600 kbps，管道只有 300 kbps，携带数 KB SDP 的 `session.avatar.connect` 排在几百个音频帧后面发不出去。降采样率到 16 kHz（约 400 kbps，见[系列01](Voice%20Live系列01：Agent实现架构——从级联流水线到Azure%20Voice%20Live%20API.md) 4.5.1）能直接消除。

## 六、决定性对照：关画面留声音

同一 office-bad 档位四轮对比。"音频死亡"是补偿比例达到 100% 的时刻。

| 变体 | 视频 kbps | 死前音频补偿 | 音频丢包 | RTT ms | 音频死亡 t | ICE |
|---|---:|---:|---:|---:|---|---|
| lisa 完整视频（第 1 轮） | 608 | 31.3% | 505 | 876 | 44 s | 中途 disconnected |
| lisa 完整视频（第 2 轮，复现） | 599 | **30.7%** | 525 | 871 | 48 s | 全程 connected |
| **lisa 纯音频**（video 轨 `inactive`） | 0 | **2.5%** | **66** | **534** | 49 s | **全程 connected** |
| amira 纯音频 | 0 | 4.8% | 72 | 532 | 42 s | 中途 disconnected，恢复已触发 |
| amira 完整视频 | 658 | 4.5% | 67 | 644 | 42 s | 中途 disconnected，恢复已触发 |

**关掉画面让语音质量提升一个数量级。** 音频补偿从 31% 降到 2.5%，约 12 倍；音频丢包从 505 到 525 个降到 66 个。31% 意味着三分之一的语音是算法编出来的，候选人听到断续含混的题目；2.5% 属于偶尔一个字发毛，完全可听。RTT 从 876 降到 534 ms，这 340 ms 是自己的视频流在管道里排队造成的自伤延迟，同时拖慢轮次交接。对照组两轮 31.3% 与 30.7%，结论是复现的。

**但纯音频不等于不死。** lisa 纯音频全程 ICE connected 最健康，amira 纯音频仍在 46 秒掉线并触发恢复。3% 丢包下单次 40 秒窗口方差很大，可信的说法是：纯音频把"听不清"变成"听得清"，但没有让连接不死。所以纯音频降级和媒体层自愈两件事都要有。

**一个便宜的待验假设。** 1080p 在 1% 丢包下解不出帧的直接原因是一帧跨 5 个以上包。如果把 `video.bitrate` 压到 500 kbps，一帧约 2 到 3 个包，可能恢复可解码性（画面变糊但动起来）。这一档还没在限速下测过。

## 七、自适应设计建议

### 7.1 已确认的六条事实

1. Azure 会按接收端带宽估计自动降码率，这件事不用自己做。
2. 码率只能在建会话时定；会话中 `session.update` 改 `avatar.video.bitrate` 被静默忽略。
3. 1080p 在 1% 丢包下一帧都解不出来，却仍吃约 1 Mbps；抖动缓冲预算小于 RTT 时 NACK 修复永远迟到。
4. 画面和声音共用一条传输，胖视频流会把自己的音频饿死：3% 丢包下音频补偿 31%，关视频后 2.5%。
5. 关画面留声音在同一条连接内可行（video 轨 `a=inactive`，约 100 kbps），无需重建会话。
6. 麦克风上行 600 kbps 在窄上行下会挤死自己的信令，导致数字人握不上手。

### 7.2 P0 到 P4，全部自动

**P0：把"关画面"做成自动降级，触发条件用音频健康度而不是画面健康度。** 前端每 2 秒读 `getStats()`，算音频 `concealedSamples` 的增速。连续两个窗口超过 10%（48 kHz 下约 4800 样本/秒）就重建 avatar 连接、video 轨标 `inactive`，界面切成音波球并提示"网络较弱，已切换为语音模式"。选音频指标而不是冻结次数，是因为冻结次数在 1080p 上会骗人，而音频补偿率直接对应"候选人能不能听清题目"，正是要保的东西。

**P1：麦克风上行降到 16 kHz。** 上行从约 600 降到约 400 kbps，消除第 6 条的自伤，与数字人无关，收益独立。为什么 Voice Live 默认 24 kHz、降了会不会掉准确率、为什么必须前后端同时改，见系列01 4.5.1。

**P2：开场前探测决定起始形态，而不是决定码率。** 说明页预热阶段（系列03 5.2 节）已经在建连接，顺便采 5 到 10 秒的 RTT 与音频补偿率：健康则正常进入数字人，不健康则直接以纯音频起步，避免用户先看到一段卡死的画面再被降级。码率由 Azure 自己管，探测的产出是"要不要脸"这个布尔值。

**P3：媒体死亡的空窗与提示。** "码率归零"到"ICE 报 disconnected"之间有 4 秒，复用 P0 的采样，归零即提示，不必等 ICE。自愈重建逻辑本身工作正常。

**P4：UDP 不可达的兜底。** 重建一个不带 `avatar` 的会话，让音频以 PCM 走 WebSocket。交付手册同时写明放行 UDP 3478。

### 7.3 明确不做的

- 不做"网络档位"给用户选，对用户负担太重，上面四项都是自动的。
- 不自己实现码率自适应，Azure 已经在做，重复实现只会互相打架。
- 不用 SDP `b=AS` 压码率，Azure 忽略。
- 不用"冻结次数"当健康指标，1080p 上完全失效。
- 上行不改走 WebRTC，官方 WebRTC 模式明确不支持 avatar（系列10 相关讨论），等 Azure 放开再看。

## 八、小结

1. **Azure 已做码率自适应**，方向正确幅度够；客户端 `b=AS` 与会话中 `session.update` 都改不了码率，唯一杠杆是建会话时的 `session.avatar.video.bitrate`。
2. **1080p 的失效不是"卡"而是"一帧都解不出"**：抖动缓冲预算小于 RTT，NACK 迟到，P 帧依赖使整个 GOP 报废；`freezeCount` 为 0 是假象，看 `framesPerSecond`。
3. **胖视频饿死音频**是最要命的一条，关画面后语音质量提升一个数量级且可复现；纯音频降级与媒体层自愈两件事都要有。
4. **麦克风上行是自伤源**，600 kbps 在窄上行下挤死自己的 SDP，降 16 kHz 直接消除。
5. **UDP 被封则无画面也无声音**，兜底是重建不带 avatar 的会话让 PCM 走 WS。
6. **照片数字人默认码率只低 2.4 倍**，不是一个数量级；但它在 1% 丢包下照常播，1080p 不行，这才是弱网下的真正差异。
7. **方法学**：限速必须在 OS 层且只限 UDP，限全部流量会把后端到 Azure 的 TLS 握手也弄死，与生产拓扑不符。

## 参考

- 系列前篇：[Voice Live系列03：数字人出场延迟优化——ICE门控根因、实测分解与预热占位策略](Voice%20Live系列03：数字人出场延迟优化——ICE门控根因、实测分解与预热占位策略.md)（好网络下的延迟基线、说明页预热、首读等首帧的门）、[Voice Live系列05：两类数字人头像——viseme驱动的Video Avatar与VASA-1生成的Photo Avatar](Voice%20Live系列05：两类数字人头像——viseme驱动的Video%20Avatar与VASA-1生成的Photo%20Avatar.md)（两类头像的分辨率与带宽，本文修正其码率差距）、[Voice Live系列10：ICE、STUN与TURN——数字人WebRTC建连的候选类型、一次性信令与relay-only拓扑](Voice%20Live系列10：ICE、STUN与TURN——数字人WebRTC建连的候选类型、一次性信令与relay-only拓扑.md)（RTP/RTCP 与 UDP 的关系、媒体层自愈）、[Voice Live系列11：自建TURN中继——ice_servers替换入口、coturn要求、与Azure侧的关系及何时值得](Voice%20Live系列11：自建TURN中继——ice_servers替换入口、coturn要求、与Azure侧的关系及何时值得.md)（Azure 只下发 UDP TURN 的部署含义）、[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API](Voice%20Live系列01：Agent实现架构——从级联流水线到Azure%20Voice%20Live%20API.md)（4.5.1 输入采样率 24 kHz 与 16 kHz）
- [RTCInboundRtpStreamStats — MDN](https://developer.mozilla.org/en-US/docs/Web/API/RTCInboundRtpStreamStats)（`framesPerSecond`、`freezeCount`、`concealedSamples`、`nackCount`、`pliCount`、`jitterBufferDelay`）
- [RTCIceCandidatePairStats: availableIncomingBitrate — MDN](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidatePairStats/availableIncomingBitrate)
- [RTCP message for Receiver Estimated Maximum Bitrate — draft-alvestrand-rmcat-remb](https://datatracker.ietf.org/doc/html/draft-alvestrand-rmcat-remb-03)（`goog-remb`）
- [Extended RTP Profile for RTCP-Based Feedback (RTP/AVPF) — RFC 4585](https://datatracker.ietf.org/doc/html/rfc4585)（NACK 与 PLI）
- [Voice Live API Reference — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live-api-reference-2026-04-10)（`avatar.video.bitrate`、`gop_size`、`input_audio_sampling_rate`）
- [How to use the Voice Live API — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live-how-to)（avatar `video` 配置示例，默认 bitrate 2000000）
- [dnctl(8) / pfctl(8) — macOS 手册](https://man.freebsd.org/cgi/man.cgi?dummynet(4))（dummynet 限带宽、丢包、时延）
