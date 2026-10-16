---
title: "ICE NAT Traversal"
created: "2026-10-11"
updated: "2026-10-16"
tags:
  - wiki
  - concept
  - webrtc
  - ice
  - networking
  - voice-agent
aliases:
  - "ICE NAT 穿透"
  - "ICE / STUN / TURN"
  - "Interactive Connectivity Establishment"
related:
  - "[[realtime-protocol-selection]]"
  - "[[voice-live-agent]]"
  - "[[weak-network-adaptive-degradation]]"
---

# ICE NAT Traversal（ICE NAT 穿透）

## 摘要

ICE（Interactive Connectivity Establishment，RFC 8445）是 WebRTC 建连前回答"双方到底用哪一对地址互发 UDP 包"的机制：两端各自收集候选（host / srflx / relay，外加检测中学到的 prflx）、经信令交换、两两配对、并行发 STUN 检测、由 controlling 一方选定一对，之后持续做对端同意与保活。STUN 与 TURN 服务器只负责"多找候选"（srflx / relay），ICE 本身无论有无服务器都要跑——WebRTC 没有"跳过 ICE"的模式。

这套机制**属于 WebRTC 而不属于数字人**：在 Voice Live 里只有数字人默认走 WebRTC，所以看起来像数字人带进来的。本页收齐 Voice Live 系列10（候选类型与一次性信令门控）、系列11（自建 TURN）、系列16（两端对称、五件事、ICE-lite 判定与验证方法）的协议层知识；协议选型（WS vs WebRTC 何时选谁）留在 [[realtime-protocol-selection]]，弱网降级实施归 [[weak-network-adaptive-degradation]]。

## Claims

### Claim: ICE / STUN / TURN 属于 WebRTC 而不属于数字人——纯语音 WS 四者全无，语音改走 WebRTC 则 ICE 必有、STUN / TURN 取决于服务端下发；不配 TURN 能通但无 relay 保底

- **来源**：[[Voice-Live系列16：传输层概念对齐]]
- **首次出现**：2026-10-08
- **最近更新**：2026-10-11
- **置信度**：0.8（Microsoft Learn / RFC 查证 + 系列01 上行 WebRTC 实测；Voice Live 语音 WebRTC 是否下发 TURN 未查证）
- **状态**：active

> 四种组合：语音 · WebSocket（无 ICE / STUN / TURN，443 WSS 通即可）；语音 · WebRTC（OpenAI Realtime 官方示例 `new RTCPeerConnection()` 不配 iceServers——连公网媒体服务器往往能通，但出站 UDP 被封即建连失败，无保底）；数字人 · WebRTC（Voice Live 默认，`session.updated` 的 `session.avatar.ice_servers` 下发一台兼做 STUN 的 TURN）；数字人 · WebSocket（avatar `output_protocol: websocket`，整条链路又没有 ICE）。Voice Live 语音也能经 `rtc.call.sdp.create` 走 WebRTC，但今天与 avatar 互斥（side-band control 下不支持 avatar）。判别指纹：麦克风 `getUserMedia` 两种模式都有，`new RTCPeerConnection` 只在数字人路径出现——webrtc-internals 里"有 getUserMedia、PeerConnections 为空"即纯语音会话。

### Claim: ICE / STUN / TURN 速览——三类候选是三个视角的地址，一次性信令（Vanilla ICE）逼出门控，"够用集"捷径成立的前提是"两类候选同源"且 300 ms 收敛窗是规则一部分；TURN 不是联邦网络，自建只替换浏览器一侧、默认中继是默认答案

- **来源**：[[Voice-Live系列10：ICE、STUN与TURN]]、[[Voice-Live系列11：自建TURN中继]]、[[Voice-Live系列12：数字人弱网表现]]
- **首次出现**：2026-09-30
- **最近更新**：2026-10-11
- **置信度**：0.8（RFC 8445 / 8489 / 8656 / 8838 核对 + 真机 SDP / `onicecandidate` 抓取；收敛窗 n=3 单一网络；自建 TURN 部分为文档核对尚未实施，0.7）
- **状态**：active

> **三类候选**：**host** 本机网卡（局域网门牌，零往返，只有同局域网对端能用）/ **srflx** STUN 反射出的公网出口（小区大门，一次 UDP 往返，要 NAT 放行入向）/ **relay** TURN 分配的中继端口（邮局信箱，谁都寄得到、多一跳）。STUN（RFC 8489）只"照镜子"产出 srflx；TURN（RFC 8656）在其上加 Allocate / Permission，承载全部媒体产出 relay，要带宽与短期 HMAC 凭据。SDP 里每个候选一行 `a=candidate:… typ host|srflx|relay`，`priority` 量级 host 2.1e9 > srflx 1.7e9 > relay 4e7。**门控为什么存在**：Trickle ICE（RFC 8838）的前提是信令通道能反复双向传；Azure 数字人 offer 经 `session.avatar.connect` 只发一次、没有补发消息，退回 Vanilla ICE——一个包必须自带所有会用到的候选，发前必须等"胜出者进包"。"先到先得"不成立：先到的 host 恰恰必输。"等 `complete`"是教科书解，但 `complete` 的语义是"所有网卡都了结"，被悬着的 VPN 网卡绑架到 8 秒兜底。**捷径的前提**：Azure 只下发一台兼做 STUN 的 TURN，srflx 与 relay 来自同一次往返、host 必输，胜出者只可能是这两类之一；relay 稳定晚约 140 ms（n=3），300 ms 收敛窗兜住的是同一次往返内两个候选的到达间隔，不是冗余保险；`iceTransportPolicy: "relay"` 不是解——门控的关键是"不等最坏的网卡"而非"少收集"。ICE 的必要成本只有几百毫秒加一次到中继的往返，那 7.6 秒是等待策略不是 ICE。**TURN 非联邦**（系列11）：一台 TURN 只做转发，自建 TURN（如 coturn）通过 `session.avatar.ice_servers` 传入即原样回显、只替换浏览器一侧的中继，前提是你的 TURN 能出向到达 Azure answer 里的候选；六项要求（公网可达 UDP 3478 + TCP/TLS 443、短期 HMAC 凭据后端现算、允许对端为 Azure 公网地址、按并发 × 码率预留配额、放在两端之间、真实证书）、三处验证（`session.updated` 回显、`getStats()` 选中对的 relay 地址、TURN 日志）。**默认中继零运维且含在分钟费里**，只在出向白名单只允许自家域名 / 合规要求媒体经自有基础设施 / 客户离 Azure 中继接入点很远三种情况下值得自建。
>
> 本条 2026-10-02 曾压缩收入 [[realtime-protocol-selection]]（用户当时裁决暂不建本页）；2026-10-11 用户读完系列16 后解除 HOLD，原样迁回本页。

### Claim: 候选是"接收地址"不是源地址；host 与 srflx 共用同一个本地 socket（base）；prflx 是对端从检测包学到的地址；STUN 与 TURN 候选同时收集——"直连优先、relay 保底"是选择顺序而非时间顺序

- **来源**：[[Voice-Live系列16：传输层概念对齐]]
- **首次出现**：2026-10-08
- **最近更新**：2026-10-11
- **置信度**：0.8（RFC 8445 查证；对称 NAT 下靠 prflx 连公网服务器为推断）
- **状态**：active

> 候选写在 SDP 里告诉对端"往这里发，我收得到"。srflx 只是 host 那个 socket 经 NAT 后在外面"看起来"的地址；relay 的 base 在 TURN 服务器上，数据先封装交给 TURN 代发。**prflx（peer reflexive）**：对称 NAT 下发往不同目的地址会分配不同外网端口，STUN 服务器看到的地址对对端没用；对端收到检测包后把实际看到的源地址记为新候选——这是"不配 STUN 服务器也能通"的原因之一。STUN 与 TURN 不是二选一：ICE 一开始同时收集各类候选、配对后并行检测，不是 STUN 失败才试 TURN；TURN 是 STUN 的扩展，Allocate 应答本身带公网映射，配 TURN 通常顺带拿到 srflx——这正是 Azure 只下发一台 TURN 的原因。离不开 TURN 的情形：两端都在对称 NAT 后、出站 UDP 被封（企业网 / 部分 VPN / 酒店，TURN 走 TCP 或 TLS 443）、只允许 HTTP 代理出网。连 Azure 这类公网媒体服务器时，真正离不开 TURN 的主要是"出站 UDP 被封"（推断）。STUN 与 TURN 的代价不对称：STUN 回答一个小请求后不参与，TURN 全程转发所有媒体、带宽成本高所以要凭据。

### Claim: ICE 两端对称——一条路径 = 我的候选 × 对端的候选，controlling 方 nominate；候选对优先级由 min(G, D) 主导，所以只要一端是 relay 整对就排后，但排序只决定"都通时选谁"，实测 UDP 通的网络上 relay 4 次胜出 3 次

- **来源**：[[Voice-Live系列16：传输层概念对齐]]、[[Voice-Live系列10：ICE、STUN与TURN]]
- **首次出现**：2026-10-08
- **最近更新**：2026-10-11
- **置信度**：0.7（公式为 RFC 8445 原文；胜出统计 n=4 同类开发网络，relay 为何胜出原因未查明）
- **状态**：active

> 完整过程：两端各自收集候选 → 经信令交换（我的成为对端的 remote candidates，反之亦然）→ 两端都把 local × remote 两两配成 candidate pair → 两端都发 STUN 检测 → controlling 一方 nominate，之后走 DTLS-SRTP。controlling 通常是发 offer 的一方，Voice Live 数字人上即浏览器。组合语义：host↔host 同局域网或双方公网；srflx/prflx↔host 我在 NAT 后、对端公网；srflx↔srflx 双方 NAT 后打洞成功；relay↔任意 我这边走 TURN。Voice Live 数字人上浏览器 host 是局域网地址，**host 必输**。优先级公式 `pair priority = 2^32 × min(G, D) + 2 × max(G, D) + (G > D ? 1 : 0)`（G = controlling 方候选优先级）——"直连优先、relay 保底"的数学体现。但实测：系列10 三次中两次 relay/udp 胜出、系列16 webrtc-internals 截图再一次 relay(udp) 胜出（local `0x37e1fff` 远低于 remote `0x64ffffff`），而浏览器到 TURN 走的就是 UDP，UDP 并未被封。**"保底"是排序语义，不等于很少用到**；排序靠后照样胜出与公式不矛盾，原因待查（检测完成先后 / nomination 时机 / srflx 那一对实际不通），且须把对端的检测与 nomination 一起算进去。

### Claim: ICE 的五件事与 STUN / TURN 服务器无关——选路、连通性检测（学 prflx）、对端同意（consent freshness）、保活、换网（ICE restart）；STUN、TURN 服务器只用来多找候选，ICE 是验证并维持路径的机制

- **来源**：[[Voice-Live系列16：传输层概念对齐]]
- **首次出现**：2026-10-08
- **最近更新**：2026-10-11
- **置信度**：0.85（RFC 8445 / RFC 7675 查证）
- **状态**：active

> "没有 STUN 服务器"不等于"没有 STUN 协议"。① **选路**：一台电脑有多个出口（Wi-Fi、有线、VPN、IPv4、IPv6），每个都是 host 候选，要逐一检测选最好的；② **连通性检测**：浏览器直接向对端候选发 STUN Binding Request（用 STUN 协议，不经 STUN 服务器），对端从包里学到映射地址（prflx）并回包；③ **对端同意（RFC 7675）**：浏览器绝不向没回应过 ICE 检测的地址发媒体，约每 5 秒复核一次——否则网页 JS 就能让浏览器向任意 IP 发 UDP 洪泛；ufrag / pwd 认证检测包，DTLS 握手与之绑定；④ **保活**：UDP 无连接，NAT 映射会过期；⑤ **换网**：Wi-Fi 切 4G 时 ICE restart 换路，不必重建会话。这回答了"一端明明是服务器、没有 STUN / TURN 服务器为什么还要 ICE"——安全（consent）与移动性（restart）这两件事 WebSocket 由 TCP 连接语义天然承担，UDP 上必须由 ICE 显式做。

### Claim: ICE-lite（只公布 host、只应答、固定 controlled、SDP 带 `a=ice-lite`）是给始终公网可达一端的精简实现；云上 1:1 NAT 的 full ICE 服务器会公布 srflx——Azure 数字人对端候选实测为 srflx 且主动发 12 次检测，基本排除 ICE-lite

- **来源**：[[Voice-Live系列16：传输层概念对齐]]、[[Voice-Live系列12：数字人弱网表现]]
- **首次出现**：2026-10-08
- **最近更新**：2026-10-11
- **置信度**：0.7（两条独立实测证据；最终以 SDP answer 无 `a=ice-lite` 定案，尚未抓取）
- **状态**：active

> full ICE（浏览器）收集 host / srflx / relay、主动检测、与 lite 对接时一定 controlling；ICE-lite（媒体服务器）只列网卡上绑定的地址、不问 STUN 不申请 TURN、不主动发检测只回应。lite 够用的原因：客户端在 NAT 后无所谓，它主动发检测过来，服务器从包里看到真实源地址（prflx）照着回即可；前提是必须真的公网可达。lite 常加一条 `tcptype passive` 的 host 候选（ICE-TCP，RFC 6544）给 UDP 被封的客户端兜底。**云上特例**：网卡只有内网 IP、公网 IP 是平台 1:1 NAT 映射——lite 服务器配"对外宣告地址"把公网 IP 当 host 写（对端看到 `typ host`），full ICE 服务器经 STUN 或静态映射得公网 srflx（对端看到 `typ srflx`）。开源对照：mediasoup 只支持 lite（announced address）、Janus 两种都支持并有 1:1 NAT 配置、Jitsi Videobridge 用 full ICE。**Azure 判定**：系列12 探针测到 srflx ↔ srflx、系列16 截图对端 `srflx` 且"STUN requests received / responses sent = 12 / 12"——lite 一端不主动发起检测，两条证据合起来 Azure 更像云上 1:1 NAT 后的 full ICE。推论：若如此，"Azure 只应答、浏览器包办选路"不成立，relay 胜出问题必须按两端都在检测分析。

### Claim: 验证 ICE 实际走了哪条路只看 nominated 候选对两端的 candidateType——webrtc-internals / getStats 几分钟内可读；TURN 可达性用 `iceTransportPolicy: "relay"` 单独探测，不必开整场会话

- **来源**：[[Voice-Live系列16：传输层概念对齐]]
- **首次出现**：2026-10-08
- **最近更新**：2026-10-11
- **置信度**：0.8（MDN 查证 + 一次真机截图逐项解读）
- **状态**：active

> 步骤：**先**开 `chrome://webrtc-internals` 并保持打开，同一窗口（非无痕）另开会话，等画面出现不关不刷新；Stats Tables 找 `nominated: true` 且 `state: succeeded` 的 `candidate-pair`，顺 `localCandidateId` / `remoteCandidateId` 看两端 `candidateType`——**只要一端是 relay，媒体就经过 TURN**，`relayProtocol` 说明到 TURN 走 udp / tcp / tls；Event log 的 `setRemoteDescription` 是 SDP answer，看 `a=ice-lite` 与对端候选类型。空 dump（`getUserMedia: []` 且 `PeerConnections: {}`）说明导出时无会话：已结束 / 刷新过 / 在别的 profile / 没开数字人 / 弱网降级或撞创建速率限制后 PeerConnection 已关。拿得到 `RTCPeerConnection` 实例时用 `getStats()` 打印选中对的两端类型与 `currentRoundTripTime`。**TURN 可达性探针**：用一次 `session.updated` 拿到的临时 `ice_servers` 建 `new RTCPeerConnection({ iceServers, iceTransportPolicy: "relay" })` + `createDataChannel` + `createOffer`，打出 relay 候选即中继可用，一条都没有即该网络数字人画面无保底；只测浏览器到 TURN 一段。一次截图读出的事实：Azure 只下发 `turn:relay.communication.microsoft.com:3478`、`bundlePolicy: max-bundle` 故只一对候选对；下行约 13 MB、上行十几 KB——**数字人这条 WebRTC 连接只承载下行，麦克风在 WebSocket 上**；经 TURN 的 RTT 0.262 s 与弱网实测约 300 ms 同量级。

### Claim: "relay 保底"有一个隐含前提——浏览器的同一个本地 UDP 端口能分别到达多个对端；SSE 客户端把端口钉死在首个对端时，直连与 relay 在同一个原因上一起断，应用侧（下发 IP、强制 relay）都绕不开

- **来源**：[[Voice-Live系列17：Global-Secure-Access下数字人的网络问题解析]]、[[Global-Secure-Access：微软SSE的设计与实时媒体问题]]
- **首次出现**：2026-10-14
- **最近更新**：2026-10-16
- **置信度**：0.8（同一台 macOS 设备实测复现 + 同 socket 多目标对照 + GSA 客户端日志佐证；Windows 客户端未测）
- **状态**：active

> ICE 用**一个本地端口**同时和三个对端通信：TURN（STUN 拿 srflx、Allocate）、TURN 以 `300 Try-Alternate` 重定向的备用服务器（拿 relay）、媒体服务器（连通检查）。Chrome 对每个回包核对两件事：事务 ID 对得上、**回包来自请求发往的那个地址**（RFC 8445 的防伪造要求）。macOS 透明代理把应用的一个 UDP socket 当作一条"流"交给扩展，Global Secure Access 扩展按第一个数据报的目标建流、做一次转发决定、自建 socket 并 `connect` 到该目标——之后同一应用 socket 发往任何地址的包都送到首个对端，回包也显示来自它。后果：发往备用 TURN 的 Allocate 被送回原 TURN、回包源不符被丢 → **没有 relay**；连通检查被送到 TURN、当无关响应丢弃 → `reqSent` 一直涨、`respRecv=0`，约 15 秒 `ice=failed`，DTLS 从未开始。这和"relay 是企业网保底"不矛盾：常见企业网问题是"出向 UDP 到媒体服务器被挡、TURN 可达"，保底接得住；这次是**端口语义被改**，保底依赖的前提不成立。应用侧无效：后端把 ICE 域名解析成 IP 下发无效（钉死与地址是否合成无关）；`iceTransportPolicy: "relay"` 无效（绕不开 300 重定向）；GSA 策略里配 bypass 也不一定有效（bypass 的 UDP 流同样由扩展代发、照样钉死）。**测量纪律**：每个目标新开 socket 的系统层 STUN 测试天然绕开钉死、会全部正常而误判"网络没问题"，必须用**同一个 socket 依次发往多个目标**的对照（发往无服务 IP 也收到回复 = 包被转发给首个对端，而非仅回包地址被改写）。凡"一个端口对多个对端"的 UDP 都在影响面内（浏览器 WebRTC、P2P/NAT 穿越、mesh VPN），一对一的 TCP 与单服务器 UDP 不受影响——所以"看视频没问题、开视频会议就有问题"。

## 冲突与演进

- **2026-10-02**：extract 首次自主建本页（5 Claims），用户以"暂时不建，没怎么看懂"撤回，内容压成一条速览 Claim 收入 [[realtime-protocol-selection]]，登记 LOOP_STATE HOLD。
- **2026-10-11**：用户读完 Voice Live 系列16（传输层概念对齐前置篇）后解除 HOLD 建页——速览 Claim 原样迁回本页，新增系列16 的六条 Claim（归属 WebRTC 非数字人 / 候选四个易混点 / 两端对称与优先级公式 / 五件事 / ICE-lite 判定 / 验证方法）。修正一处旧认知：10-02 速览里"Azure 只应答、浏览器包办选路"的隐含假设，被"对端主动发检测、基本非 lite"推翻。
- **待验**（系列16 第九节）：relay 在直连可行时为何胜出；SDP answer 是否 `a=ice-lite`；封 UDP 后经 TURN TCP / TLS 能否恢复画面；Voice Live 语音 WebRTC 是否下发 TURN。
- **2026-10-16**：注入系列17 + GSA 产品页的"端口钉死"Claim——给"直连优先、relay 保底"补上隐含前提（同一端口可分别到达多个对端），并补一条测量纪律（同 socket 多目标对照）。排查过程中两条中间解释被推翻：①"Chrome 解析不了 TURN 域名"——`701` / `-105` 只出现在 IPv6 端口，是 GSA 不处理 IPv6 的噪声；②"回包源地址与合成 IP 不一致"——只能解释一次现象，同 socket 对照才定位机制。新待验：钉死是否有空闲超时、Windows（LWF 驱动）是否同样、自建不做重定向的 TURN over TLS 443 能否绕开。

## 关联概念

- [[realtime-protocol-selection]] — `grounds` ICE 的固定开销与 UDP 依赖是"WS vs WebRTC"选型条件（限 UDP → 只用 WS、建连成本差异）的协议层根据
- [[weak-network-adaptive-degradation]] — `grounds` 候选类型即客户网络分段测点、UDP 封锁无画无声是降级决策表的输入
- [[voice-live-agent]] — `part-of` 数字人 WebRTC 下行通道的建连层

## 来源日记

- [[2026-10-08-周四]] — 进一步了解 WebRTC 协议，成文系列16 并补 ICE-lite / webrtc-internals 截图解读 / WS 分层工具
- [[Voice-Live系列10：ICE、STUN与TURN]] — 候选三类型、一次性信令与门控、只下发一台 TURN
- [[Voice-Live系列11：自建TURN中继]] — TURN 非联邦、自建六项要求与三处验证
- [[Voice-Live系列12：数字人弱网表现]] — srflx↔srflx 直连实测
- [[Voice-Live系列16：传输层概念对齐]] — 核心来源
- [[2026-10-14-周三]] — 诊断 GSA 下数字人无画无声，成文系列17 与 GSA 产品页
- [[Voice-Live系列17：Global-Secure-Access下数字人的网络问题解析]] — 端口钉死、同 socket 多目标对照、Chrome 侧验证工具箱
- [[Global-Secure-Access：微软SSE的设计与实时媒体问题]] — 透明代理按 socket 建流、客户端日志证据、影响面
