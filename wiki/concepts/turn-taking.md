---
title: "话轮转换（Turn-Taking）"
created: "2026-04-17"
updated: "2026-09-25"
tags:
  - wiki
  - concept
  - speech
  - voice-agent
  - realtime
  - conversation
aliases:
  - "话轮转换"
  - "Turn-Taking"
  - "话轮管理"
related:
  - "[[grapheme-to-phoneme]]"
  - "[[speech-technology-stack]]"
  - "[[voice-live-agent]]"
---

# 话轮转换（Turn-Taking）

## 摘要

Turn-Taking（话轮转换）是语音 Agent 中"最被低估也最关键"的技术，决定了对话是否"自然"——什么时候该听、什么时候该说、什么时候该打断。它不等于端点检测（"用户停了我就说"），而是一个包含预测、决策和执行的复合机制。

在级联流水线架构中，Turn-Taking 是独立模块（可配置）；在端到端架构（如 GPT-4o Realtime）中，Turn-Taking 融合在模型内部，成为不可替换的内部能力。

## Claims

### Claim: Turn-Taking 不等于端点检测

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：stale

> 常见误解："用户停了 → 我说话"。正确理解：Turn-Taking 包含预测性机制（预判用户是否说完）和反应性机制（检测到停顿后决策），二者协同工作。

### Claim: Turn-Taking 是语音 Agent 的核心难题

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：stale

> Turn-Taking 是语音 Agent 中"最被低估也最关键"的技术。它决定了对话是否自然——错误的话轮切换会导致打断用户或无法及时回应。

### Claim: 端到端架构将 Turn-Taking 内化为模型能力

- **来源**：[[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：stale

> 级联系统中 Turn-Taking 是可替换模块；GPT-Realtime 中 Turn-Taking 融合在模型内部，无法单独替换。判断标准："它能不能被单独替换？能 → 模块，不能 → 模型内部能力。"

### Claim: 对话轮次延迟的首个生产实测分解——VAD 静音判定窗是每轮最大单项，话轮判停是决策参数而非技术延迟

- **来源**：[[Voice Live系列03：数字人出场延迟优化——ICE门控根因、实测分解与预热占位策略]]
- **首次出现**：2026-09-15
- **最近更新**：2026-09-16
- **置信度**：0.8（生产 5 session×3 语音轮 + 直连对照 3 session×3 轮，24 轮零失败；WS 协议层脚本以 100ms 块实时节奏推流模拟真实麦克风）
- **状态**：active

> Azure Voice Live 生产实测把"说完话→听到回复"切成分段中位：**semantic VAD 判停 ~0.86s + 转写终稿 ~0.2s + LLM 首 token ~0.2s + TTS 首块音频 ~0.2s ≈ 1.5s**（直连对照 1.39~1.59s）。最大单项是 VAD 的静音判定窗——它**不是技术延迟而是话轮决策参数**：可调收紧换响应速度，代价是把用户停顿误判为"说完"的风险上升。这正是"Turn-Taking≠端点检测"的生产实证：对话节奏的第一杠杆在话轮判停策略层，不在 STT/LLM/TTS 管线层——文本轮（跳过 VAD+STT）首文本 0.51s/首音频 0.63s 是管线净成本下界，语音轮与文本轮的差值几乎全部是话轮判停+转写成本。多轮稳定性：同 session 轮 1/2/3 各阶段中位几乎重合（上下文增长不影响首 token）、两组 24 个语音轮零失败方差极小——话轮管线本身相当稳定，与出场链路的长尾异常形成对照。

### Claim: 全双工/半双工的两层判定——半双工卡在模型/对话层的轮次状态机，而非传输层

- **来源**：[[Voice Live系列04：四条路线与全双工——GPT-Live-1对数字人方案的影响评估]]
- **首次出现**：2026-09-19
- **最近更新**：2026-09-25
- **置信度**：0.7
- **状态**：active

> 传输层（WebSocket/WebRTC/RTP）本来就是全双工的；半双工的根源在模型/对话层的轮次状态机——系统只有"听"和"说"两个状态。GPT-Live-1 把判停、打断、附和原生化为模型能力（Full Duplex Bench 比 GPT-Realtime-2.1 高约 30 个百分点），是"端到端架构将 Turn-Taking 内化为模型能力"论断在全双工方向的最新证据层；对数字人场景 AEC 从可选变必选。


### Claim: "端点之后"还有三个应用层判断——"该不该 response"拆成四问；两段式提交把判断延迟藏进用户自己的停顿里

- **来源**：[[Voice Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM judge、两段式提交与频率策略]]
- **首次出现**：2026-09-24
- **最近更新**：2026-09-25
- **置信度**：0.8
- **状态**：active

> "Turn-Taking≠端点检测"的最强续证：把一个布尔开关拆成四问——说完了没（EOU 模型/Speech 层/几十 ms）、答完了没（LLM judge/应用层/几百 ms~1s 且知道任务）、要不要致谢（跨轮状态规则/零时延）、说什么（分档内容源+代码校验）；混在一起就退回布尔开关。判停（VAD）→开轮（create_response）→生成（LLM）是三个独立决策点，Voice Live 把判停与开轮在协议上拆开。两段式提交状态机（LISTENING→PENDING→COMPLETE）：T1 试探性预生成不出声、T2 确认后播出、之间用户开口即丢弃，阈值按说话人 95 分位自适应——"把判断延迟藏进用户自己的停顿里"是延迟工程治体感的第三实例（与 VL03 思考过渡语、interim_response 同族）。度量与演进：误判完成率（COMPLETE 后 3s 内 speech_started 比例）/完成延迟/致谢重复率三指标，事件流回放到不同阈值组合画曲线选拐点（与 LiveKit eot-bench 同思路）；演进顺序：规则+两段式 → EOU+拉长 silence（1200~1500ms）→ LLM judge → 音频原生模型——"话轮判停是决策参数而非技术延迟"的度量方法补充。

## 冲突与演进

- 2026-04-11：首次系统定义 Turn-Taking 的深层机制。
- 2026-09-16：注入 Voice Live 系列03 对话轮次实测 Claim——"Turn-Taking≠端点检测"获首个生产数据续证（VAD 判停窗 ~0.86s 是每轮延迟最大单项且属决策参数），页面脱离全 stale 状态。

## 关联概念

- [[end-of-turn-detection]] — `part-of` 轮次协调的判停环节：EOU 洗干净判停信号，开轮/生成是另外两个独立决策点

- [[voice-live-agent]] — `uses` Voice Agent 的对话自然度依赖 Turn-Taking 质量
- [[speech-technology-stack]] — `part-of` Turn-Taking 是 Core Processing 层的关键组件
- [[grapheme-to-phoneme]] — `contrasts` Semantic VAD 决定"什么时候说"，G2P 决定"怎么说"——不同层级但存在间接耦合

## 来源日记

- [[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]] — Section 四 Turn-Taking 深度解析
- [[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]] — Turn Detection 与 Azure VAD 对比
- [[Voice Live系列03：数字人出场延迟优化——ICE门控根因、实测分解与预热占位策略]] — 对话轮次延迟分解与多轮稳定性生产实测（第六节）
