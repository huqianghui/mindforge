---
title: "学习路径：语音 Agent 与实时交互"
created: "2026-11-07"
updated: "2026-11-07"
tags:
  - wiki
  - path
  - voice
  - voice-live
  - webrtc
path_id: "voice-agent"
audience: "自己 + CSA 团队"
gap_topics:
  - voice-agent
signals:
  - "Azure Voice Live / Speech 官方文档与 What's new"
  - "OpenAI Realtime API changelog"
  - "arXiv：full-duplex speech、spoken dialogue、turn-taking"
---

# 学习路径：语音 Agent 与实时交互

语音 Agent 难的不是"能说话"，而是像人一样接话：什么时候该开口、被打断怎么办、网络差了画面和声音谁让路。这条路径从语音技术栈讲起，沿着"听 → 判停 → 想 → 说 → 传输"走一遍，最后落到 Voice Live 上的数字人工程。

**怎么用**：按站点顺序读，每站对照「算会」自查。标 ⚠️ 的站点依赖的 Claim 有 stale 的，读的时候以复核行为准。

**预计总用时**：约 14~18 小时（不含动手实验）。

## 第 1 站 · 全景：语音技术栈三层

- **读**：[[speech-technology-stack]]、[[Speech技术全景]]
- **前置**：无
- **用时**：约 1 小时
- **⚠️ stale**：13 条里 7 条 stale，前三条（三层技术栈、能量 VAD 的局限、barge-in）是概念性的，仍可读
- **算会**：
  - 能画出 Speech In / Core Processing / Speech Out 三层，各举两个组件
  - 能说出音频前处理链（降噪、回声消除等）为什么有严格的执行顺序
  - 能说出上行和下行的采样率为什么不同：上行给机器听，下行给人听

## 第 2 站 · 架构：级联与端到端

- **读**：[[cascaded-pipeline]]、[[voice-live-agent]]（前 6 条 Claim）、[[cascaded-vs-e2e-voice]]、[[voice-cascaded-pipeline]]
- **前置**：第 1 站
- **用时**：约 1.5 小时
- **⚠️ stale**：[[cascaded-pipeline]] 3/3、[[voice-live-agent]] 11/25 stale；决策页的新 Claim（GPT-Live-1、宿主不可拆）是近期的
- **算会**：
  - 能说出级联（VAD → STT → LLM → TTS）与端到端的取舍，以及"判断模块化的标准是能否单独替换"
  - 能解释低延迟的关键是组件重叠执行，而不是单个组件更快
  - 能说出 Voice Live 把级联与端到端放在同一个 API 后面以后，"架构决策降级为配置项"的好处和副作用（控制面归属翻转、模型是会话宿主）

## 第 3 站 · 听：VAD 与 EOU

- **读**：[[voice-activity-detection]]、[[end-of-turn-detection]]
- **前置**：第 2 站
- **用时**：约 1.5 小时
- **⚠️ stale**：[[voice-activity-detection]] 6/8 stale；[[end-of-turn-detection]] 全部 active
- **算会**：
  - 能区分三件事：VAD 判有没有人声、EOU 判这句话说完没有、turn-taking 决定该不该接话
  - 能说清同名的"semantic VAD"在 OpenAI 和 Azure 是两回事
  - 能说出 EOU 只决定"何时触发判停"，不决定"是否放行开轮"

## 第 4 站 · 接话：turn-taking 与打断

- **读**：[[turn-taking]]、[[Voice-Live系列06：轮次控制的五道关卡]]、[[Voice-Live系列08：应答门控]]
- **前置**：第 3 站
- **用时**：约 2 小时
- **算会**：
  - 能说出"轮"的三种含义：生成轮次、对话历史里的 assistant 轮、语音轮，以及它们为什么要分开
  - 能说出每轮延迟里最大的单项是什么（VAD 静音判定窗），以及话轮判停为什么是决策参数而不是技术延迟
  - 能说出音频走 WebSocket PCM 时 barge-in 为什么在服务端无可截断，以及应答门控怎么把 Dialog Manager 重新展开成显式状态机

## 第 5 站 · 说：Speech Out 与口型

- **读**：[[Speech-Out深入：从G2P到SSML]]、[[grapheme-to-phoneme]]、[[viseme]]
- **前置**：第 1 站
- **用时**：约 1.5 小时
- **算会**：
  - 能说出 G2P 在 TTS 流水线里的位置，以及发音控制有哪几种手段
  - 能说出"声"与"字"是两套控制面：语速、情绪、发音走会话级 voice 参数，而不是逐句 SSML
  - 能解释 viseme 是离散驱动信号、渲染是连续的，"查表贴图"为什么是误解

## 第 6 站 · 传输：WebSocket 与 WebRTC

- **读**：[[realtime-protocol-selection]]、[[WebSocket与WebRTC深度对比]]、[[Voice-Live系列16：传输层概念对齐]]
- **前置**：第 2 站
- **用时**：约 2 小时
- **⚠️ stale**：[[realtime-protocol-selection]] 12 条里 6 条 stale，后 6 条（媒体面 / 控制面、RTP / RTCP、建连成本）是近期的
- **算会**：
  - 能说出 WebSocket 是控制总线、WebRTC 是实时传输通道，双通道各管什么
  - 能说出两者的差别远不止 UDP 换 TCP：丢包、编码、抖动缓冲、拥塞控制、媒体经不经过后端
  - 能说出 WebSocket 传音频的五个结构性缺陷，以及数字人为什么也可以只走 WebSocket

## 第 7 站 · 穿透：ICE、STUN 与 TURN

- **读**：[[ice-nat-traversal]]、[[Voice-Live系列10：ICE、STUN与TURN]]、[[Voice-Live系列11：自建TURN中继]]
- **前置**：第 6 站
- **用时**：约 2 小时
- **算会**：
  - 能说出 ICE / STUN / TURN 属于 WebRTC 而不属于数字人，纯语音走 WebSocket 时四者全无
  - 能解释候选是"接收地址"、host 与 srflx 共用同一个本地 socket、ICE 两端对称
  - 能用 webrtc-internals 判断一次连接实际走了哪条路（看 nominated 候选对两端的 candidateType）

## 第 8 站 · 数字人工程：配额、弱网与降级

- **读**：[[weak-network-adaptive-degradation]]、[[Voice-Live系列12：数字人弱网表现]]、[[Voice-Live系列13：数字人配额与限流]]
- **前置**：第 7 站
- **用时**：约 2 小时
- **算会**：
  - 能说出 Azure 发送端已经做了码率自适应、客户端没有带宽杠杆，以及为什么"自适应救不了 1080p"
  - 能说出"胖视频饿死同车音频"的实测现象，以及降级为什么必须不对称（`session.avatar.connect` 每会话只接受一次）
  - 能说出数字人的两条配额限制：同时活跃 5、每滚动 60 秒新建 3，哪条关闭即释放、哪条不退还

## 第 9 站 · 大脑怎么挂：模型接入三条路径

- **读**：[[Voice-Live系列14：模型接入的三条路径]]、[[Voice-Live系列15：realtime模型与数字人]]、[[voice-live-agent]]（Claim「给会话挂大脑有且只有三条路径」）
- **前置**：第 2、4 站
- **用时**：约 1.5 小时
- **算会**：
  - 能说出原生 `model=`、BYOM、Agent 三条路径各自的约束（region 清单、profile 定死直通或级联、Agent 架构上是级联）
  - 能解释"一个模型字段承载两种语义"为什么会引出 region 报错
  - 能说出 agent 的价值等于交给它的内容决定权，什么场景挂 agent 反而是负资产

## 第 10 站 · 企业网络现场：GSA 下的数字人

- **读**：[[global-secure-access]]、[[Voice-Live系列17：Global-Secure-Access下数字人的网络问题解析]]
- **前置**：第 7 站
- **用时**：约 1 小时
- **算会**：
  - 能解释 GSA 为什么会把 UDP 端口钉死在首个对端，以及直连与 relay 为什么同时失败
  - 能说出 Private Access 截获整类 Azure 域名 DNS 的表现与排查方法
  - 遇到"企业网络里数字人无画无声"，能列出前三步排查

## 前沿站 · 正在发生的变化

来自知识差距报告的 `voice-agent` 主题（连续出现 10 期，是热度最高的主题）。这一站还没进 wiki，「算会」统一是：**能说出它改变了上面哪一站的哪条结论**。

- **全双工语音前台 + 后台 agent 有了真实部署**（2026-10-25，中优先级）→ 影响第 2、4 站：端到端还"不到企业生产可用"吗？
- **全双工语音 agent 补齐工具调用与后台计算**（2026-10-19，高优先级，建议深挖）→ 影响第 9 站：前台说话、后台想事情的分工
- **语音全双工商业化拐点**（2026-09-12，高优先级）→ 影响 [[cascaded-vs-e2e-voice]] 的前提
- **GPT-Live-1 对数字人方案的影响**：见 [[Voice-Live系列04：GPT-Live-1对数字人方案的影响]]，它会吃掉一整层轮次控制

## 毕业标准

给一个陌生的语音场景（客服电话、展厅数字人、App 内语音助手），能在 15 分钟内说出：用级联还是端到端、判停怎么配、传输走哪条、大脑怎么挂，以及最可能出问题的两个环节。

## 这条路径暴露的缺口

- **stale 集中**：第 1~3 站的底座页（[[speech-technology-stack]]、[[voice-activity-detection]]、[[cascaded-pipeline]]）stale 比例高，建议优先 `/revalidate voice`
- **方法页不足**：缺"语音 agent 延迟预算怎么拆"的方法页（素材散在 [[turn-taking]] 和 Voice Live 系列 03、06）
- **全双工**：前沿站的四条都还没有对应的概念页
