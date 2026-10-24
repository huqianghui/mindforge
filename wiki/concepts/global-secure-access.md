---
title: "Global Secure Access"
created: "2026-10-24"
updated: "2026-10-24"
tags:
  - wiki
  - concept
  - networking
  - zero-trust
  - sse
  - entra
aliases:
  - "Microsoft Entra Global Secure Access"
  - "GSA"
  - "Entra Internet Access"
  - "Entra Private Access"
  - "微软 SSE"
related:
  - "[[ice-nat-traversal]]"
  - "[[realtime-protocol-selection]]"
  - "[[weak-network-adaptive-degradation]]"
  - "[[voice-live-agent]]"
---

# Global Secure Access（微软 SSE）

## 摘要

Global Secure Access（GSA）是微软的 SSE（Security Service Edge）方案，在 Microsoft Entra 管理中心统一入口下包含 **Entra Internet Access**（基于身份的 SWG，替代出口代理）与 **Entra Private Access**（ZTNA，替代远程接入 VPN）。与传统 VPN / 出口代理最大的不同是把网络访问策略和身份绑定：每个连接都带着"谁、什么设备、是否合规、风险多高"的上下文，可直接写进 Conditional Access（如合规网络检查、通用租户限制）。流量由四个转发 profile 决定是否接管，评估顺序 Microsoft → Private Access → Internet Access，都不匹配则走本地网络。

本页关心的是它作为**端点网络截获层**对应用的影响：macOS 客户端用系统扩展 + 透明应用代理截获流量、接管 DNS 并返回合成 IP。由此引出两类与应用开发直接相关的问题——UDP 一对多的端口语义被改写（WebRTC 直连与 relay 同断），以及 Private Access 的 DNS 后缀规则残留与经通道的建连开销（一整类 Azure 服务同时解析超时、每个新连接多约 1 秒）。

## Claims

### Claim: GSA 的 Internet Access 本质是以 TCP 为中心的 Web 网关——UDP 支持不完整，实时媒体按设计就不该经过 SSE 隧道

- **来源**：[[Global-Secure-Access：微软SSE的设计与实时媒体问题]]
- **首次出现**：2026-10-14
- **最近更新**：2026-10-24
- **置信度**：0.8
- **状态**：active

> 官方已知限制：Internet Access "UDP isn't supported on this platform yet"；Windows/macOS 上 QUIC 不支持、UDP 80/443 不能隧道；iOS 端"播放高质量视频偶尔会卡顿"。Microsoft 365 网络连接原则要求延迟敏感流量（含 Teams 媒体 UDP 3478~3481）绕过代理与 VPN。危险区是**半接管**：Internet Access 全量接管后 DNS 已被接管（实测所有测试域名都解析成 `6.6.0.0/16` 合成 IP），UDP 却处理不好。另两条容易被忽略的行为：IPv6 不进隧道；被隧道流量的源 IP 变成 GSA 边缘节点（STUN 返回的公网地址就是 GSA 出口段）。

### Claim: UDP 端口钉死更像透明代理的实现局限而非刻意安全策略——判断受影响面只看"是否一个本地 UDP 端口对多个对端"

- **来源**：[[Global-Secure-Access：微软SSE的设计与实时媒体问题]]、[[Voice-Live系列17：Global-Secure-Access下数字人的网络问题解析]]
- **首次出现**：2026-10-14
- **最近更新**：2026-10-24
- **置信度**：0.7
- **状态**：active

> macOS 透明代理按"一个 socket 一条流"交给扩展，GSA 扩展为每条流 connect 一个只对首个目标的 socket，数据报自带的目标地址被忽略（客户端日志实测）。三点理由判为实现局限：UDP 正确粒度是五元组而非 socket；刻意的安全措施应丢弃而不是把发给 B 的数据送给 A；文档本身承认 UDP 不完整。受影响：WebRTC 类浏览器应用、依赖 NAT 穿越的 P2P、mesh VPN（被接管时）；不受影响：所有 TCP、一 socket 只对一台服务器的 UDP、基于 HTTP 自适应流的视频点播与直播——所以"看视频没问题、开视频会议有问题"。WebRTC 按 RFC 8445 拒收非请求地址的回包，是第一时间暴露问题的那一方；多数 UDP 程序不校验，数据可能被送错对端而未察觉。策略里判为 bypass 的 UDP 流仍由扩展自建 socket 发出、照样钉死，只配 bypass 不一定解决。对 ICE 的具体影响见 [[ice-nat-traversal]]。仅 macOS 客户端一例，Windows（LWF 驱动）未测。

### Claim: Private Access 在 macOS 上以 `/etc/resolver` 文件实现 DNS 接管——通道断开而规则未撤时，命中后缀的域名全部解析超时，只刷 DNS 缓存清不掉

- **来源**：[[Global-Secure-Access：微软SSE的设计与实时媒体问题]]
- **首次出现**：2026-10-21
- **最近更新**：2026-10-24
- **置信度**：0.7
- **状态**：active

> 客户端为每个 Private DNS 后缀写一个两行文件（`domain <后缀>` + `nameserver 6.6.255.254`），本例 82 个；`6.6.255.254` 是扩展内的虚拟 DNS，通道正常时由扩展截获查询经 connector 解析。现象签名：`dig` 直问公司 DNS 秒回，`curl` 卡在 `Resolving timed out`，`dscacheutil` 挂满 60 秒；不在后缀里的域名正常；`curl --resolve` 指公网 IP 返回 200——服务是好的，坏在系统解析器的 scoped resolver。恢复实测：通道已断时点 Disable 规则仍在、继续超时；重启客户端等通道 Connected 恢复；通道 Connected 时点 Disable 规则全部清除。为什么异常时不撤规则未复现（推断为客户端未走完清理流程）。手动清理只删指向 `6.6.255.254` 的文件且只在通道断开时做。

### Claim: 只截 `privatelink.*` 后缀不够，必须从父域名开始截——代价是同一后缀下的公网资源也被一并截获

- **来源**：[[Global-Secure-Access：微软SSE的设计与实时媒体问题]]
- **首次出现**：2026-10-21
- **最近更新**：2026-10-24
- **置信度**：0.75
- **状态**：active

> Private Endpoint 解析链：`xxx.openai.azure.com` CNAME 到 `xxx.privatelink.openai.azure.com`，在链接了 Private DNS Zone 的 VNet 里解析为私网地址。本机解析器只是 stub，查询交给递归 DNS 后由递归 DNS 跟完整条 CNAME 链只回最终结果，本机没有机会再查一次 `privatelink` 名字，所以入口父域名（`openai.azure.com`、`cognitiveservices.azure.com`、`search.windows.net`、`azurewebsites.net` 等）也要交给 VNet 里的 connector。客户端无法事先区分某个主机是私有还是公网资源，通道一断，Azure OpenAI、AI Services、Search、App Service 一整类服务同时解析失败。部署建议：后缀尽量收窄到具体主机名，开放用户单独关闭 Private Access 的权限或明确的申请流程。

### Claim: 经 Private 通道访问公网 Azure OpenAI 每个新连接多约 1.1~1.3 秒、大头在 TLS——`--resolve` 指 IP 也绕不开，因为 Private Access 还按 IP 段截获

- **来源**：[[Global-Secure-Access：微软SSE的设计与实时媒体问题]]
- **首次出现**：2026-10-21
- **最近更新**：2026-10-24
- **置信度**：0.65
- **状态**：active

> 同一日本东部资源每种方式 10 次、每次新建连接：chat 总计中位数经 GSA 按域名 2950 ms、按 IP 2692 ms、直连 1623 ms；服务端耗时三者都在 1.0~1.1 秒，**模型没有变慢，差距全在网络**。TLS 从约 110 ms 涨到 860~1020 ms，TCP 只多约 40 ms（TCP 握手在近端边缘完成，TLS 与数据沿边缘→connector→Azure 区域长路径走完，折算经通道一个完整往返约 400 ms vs 直连约 44 ms，绕路为推断）；按域名进入时 DNS 有约 1.3 秒的固定抖动（10 次中 3 次，疑似超时重试，推断）。客户端日志显示发往公网 IP 的连接同样进 Private 通道，跳过 DNS 只绕开 DNS 这一层，真正直连基线只能在通道正常时 Disable 再测。SDK 复用连接时建连开销只付一次，但每请求仍多约 300~400 ms 往返，对看首字节的流式输出与实时语音影响明显。样本少，适合判断量级。

## 冲突与演进

- 2026-10-16：HOLD——产品页成文但两篇来源围绕同一数字人案例，机制论断分散建模到 [[ice-nat-traversal]]、[[voice-live-agent]]、[[realtime-protocol-selection]]、[[weak-network-adaptive-degradation]]。复核阈值：出现与数字人案例无关的第 2 个 GSA 主题。
- 2026-10-24：建页（用户 AskUserQuestion 裁决）。触发：产品页新增第八节"案例二"，Private Access 的 DNS 规则残留与性能开销是与 WebRTC 无关的第 2 个 GSA 主题，命中 HOLD 复核阈值。选择以产品概念页而非通用 `security-service-edge` 页归口（目前仅 GSA 一款 SSE 产品有实测材料）；已分散在其他页的 Claim 不搬动，本页只收产品层机制与案例二，UDP 部分只保留判断标准、细节指向 [[ice-nat-traversal]]。`udp-port-pinning` 独立建页的 HOLD 不受影响（仍只一个产品复现）。

## 关联概念

- [[ice-nat-traversal]] — `constrains` macOS 客户端把 UDP 端口钉死在首个对端，破坏了"relay 保底"的隐含前提，直连与 relay 同断
- [[realtime-protocol-selection]] — `constrains` 企业网络下 UDP 语义不完整，迫使实时媒体准备只走 TCP 的降级（WebSocket 下发 / TURN over TLS 443）
- [[weak-network-adaptive-degradation]] — `constrains` "端口语义被改写"是需要单独识别的一级降级触发条件（E′ 级：新会话 WS 下发）
- [[voice-live-agent]] — `constrains` 经 Private 通道每个新连接多约 1 秒、每请求多约 300~400 ms，直接压缩实时语音的首字节预算

## 来源日记

- [[2026-10-14-周三]] — Voice Live 系列 17 与 GSA 产品页成文（数字人无画无声案例）
- [[2026-10-21-周三]] — 诊断 Azure OpenAI 全部报网络错误（Private Access 断开、`/etc/resolver` 规则残留），做 GSA 与直连的性能对比，产品页新增案例二
- [[Global-Secure-Access：微软SSE的设计与实时媒体问题]] — 产品定位、四个转发 profile、客户端截获机制、UDP 案例、DNS 案例与性能实测（2026-10-14 建，2026-10-21 新增第八节）
- [[Voice-Live系列17：Global-Secure-Access下数字人的网络问题解析]] — 端口钉死排查与复现脚本（2026-10-14）
