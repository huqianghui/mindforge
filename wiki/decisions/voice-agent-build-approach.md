---
title: "语音 Agent 的构建方式"
created: "2026-11-08"
updated: "2026-11-08"
tags:
  - wiki
  - decision
  - voice
  - voice-live
  - foundry
decision_status: "active"
related_concepts:
  - "[[voice-live-agent]]"
  - "[[foundry-agent-service]]"
  - "[[copilot-studio]]"
related_methods:
  - "[[voice-cascaded-pipeline]]"
---

# 语音 Agent 的构建方式

## 背景

要给一个 agent 加上声音（或者再加一张数字人的脸），微软栈里有好几条路：Foundry 托管的语音 agent、Hosted Agent 里自己调 Voice Live、直接调 Voice Live API，电话场景还有 Copilot Studio 的语音 agent，数字人场景还能给 Copilot Studio agent 自建前端。它们的差别不在"能不能说话"，而在**每一轮对话由谁控制**：什么时候开口、说哪句原文、何时打断、网络差时怎么降级。这张决策页按控制权从低到高排开这几条路，并给出电话与数字人两个特殊入口的判断。

级联、端到端与混合式的架构取舍另见 [[cascaded-vs-e2e-voice]]，三支柱的整体选型另见 [[microsoft-ai-pillars-selection]]。

## 选项分析

### 选项 A: Foundry 语音 agent（托管最多）

- **优势**：在 Foundry portal 里给 Prompt Agent 打开 Voice mode，直接配语言、音色、数字人和音频增强，几乎零代码；prompt、工具、知识、语音配置都跟着 agent 版本走；官方现在建议新语音场景优先用它（preview），自带电话与语音链路 tracing
- **劣势**：大脑在 agent 侧，每一轮说什么由 agent 决定，会话的 `instructions` 不可用；架构上是级联，拿不到 realtime 直通
- **适用条件**："一个能对话的 agent 加上声音"，不需要逐轮介入

### 选项 B: Hosted Agent + Voice Live（自控大脑、托管容器）

- **优势**：planner、记忆、模型全部自控；容器内调 Voice Live，对外暴露 `invocations_ws`；有官方的语音 agent 与 Telephony integration 文档
- **劣势**：WebSocket 帧上限 1 MB、单连接约 30 分钟（收到 1001 后用同一 `agent_session_id` 重连，平台不重放丢失的帧），沙箱最高 2 vCPU / 4 GiB；重连与应用层续传要自己做；Voice Live 的 `agent_id` 直连 Hosted 无文档支持
- **适用条件**：大脑必须自定义（自有框架、长期记忆、非微软模型），又想要托管的运行时

### 选项 C: 直接调 Voice Live API（自建，控制力最高）

- **优势**：每一轮都能介入——是否让模型回复、用 `pre_generated_assistant_message` 逐字朗读脚本、外部 judge 决定等待还是追问、WebRTC 失败降级为 WebSocket、弱网时关画面保声音；按会话选原生 `model=`、BYOM 或 agent 绑定，一个产品里可以混用
- **劣势**：prompt 与工具散在会话代码里；轮次控制本身是一门工程（判停、门控、脚本朗读、重复致谢都要自己处理）
- **适用条件**：业务要求控制每一轮——面试、考试、合规话术、脚本必须一字不差、需要外部判定

### 选项 D: Copilot Studio 语音 agent（电话入口）

- **优势**：DTMF、转人工、答录机检测、把上下文交给坐席都是现成的 topic 与设置；与 Dynamics 365 Contact Center 集成；同一份 real-time agent 配置可复用到数字消息渠道（preview）
- **劣势**：只在 Standard harness 上；与 D365 Contact Center 绑得紧；能调的轮次参数主要是语音灵敏度和静音检测；gpt-realtime 在 Global Standard 下可能在资源地域之外处理数据
- **适用条件**：已经有 D365 Contact Center、要的是标准 IVR

### 选项 E: Copilot Studio agent + 自建前端做数字人

- **优势**：复用一个已经配好知识、topics、Connector 的 Copilot Studio agent，只给它加一张脸
- **劣势**：前端要自己拼"Speech SDK 转写 → Copilot Studio agent → 实时 avatar 合成"三段，延迟最高；没有 semantic VAD、打断、过渡语；Copilot Studio 回复整段返回，avatar 要等完整文本；接不进 Voice Live 的 agent 绑定；匿名访客要走 Direct Line 且只适用于 Standard harness
- **适用条件**：展示型场景，已有成熟的 Copilot Studio agent，对延迟和打断体验不敏感

## 决策结论

- **选择**：先问"要不要逐轮控制对话"——
  - 不需要 → 选项 A（Foundry 语音 agent）；电话且有 D365 Contact Center → 选项 D
  - 需要、或"可能需要" → 选项 C（直接调 Voice Live API），会话层从一开始就按自控设计
  - 大脑必须自定义 → 选项 B，或在选项 C 里用 BYOM
  - 只是给已有 Copilot Studio agent 加张脸做展示 → 选项 E
- **理由**：托管程度越高，越早拿到可用的 demo，但每一轮的控制权越少；真实客户项目进入业务阶段后，几乎都会碰到"这一句必须原文""这一轮不能让模型自由发挥""网差要降级"，所以控制权才是分水岭
- **放弃理由**：不从托管的语音 agent 起步再迁出——POC 阶段觉得"托管够用"，后期从托管 agent 迁出的成本远高于前期直接按 API 设计会话层；不把数字人建在 Copilot Studio 上做产品级体验——三段拼接的延迟与打断能力撑不住
- **前提假设**：Voice Live agent 绑定仍只认 Prompt Agent；Foundry 语音 agent 仍是级联、`instructions` 不可用；全双工模型（如 GPT-Live-1）若进入 Voice Live 并补齐控制面，轮次控制的大部分工程会被模型吸收，需要重评

## 影响范围

- **受影响的概念**：[[voice-live-agent]]、[[turn-taking]]、[[foundry-agent-service]]、[[copilot-studio]]
- **受影响的方法**：[[voice-cascaded-pipeline]]、[[weak-network-adaptive-degradation]]

## 验证状态

- **验证方式**：语音项目按此判断选型，事后回填实际走了哪条、是否中途迁移
- **当前状态**：部分验证——一个数字人面试项目实际落在选项 C（会话全部走 model 模式，Voice Live 只当"一张嘴"，题目来自外部题源，追问由会话外的 judge 决定，Foundry agent 只在 Playground 里调指令）
- **验证证据**：[[Voice-Live系列14：模型接入的三条路径]]、[[Foundry-Agent与Copilot-Studio的选型]]

## Claims

### Claim: 语音 agent 的构建方式按"每一轮由谁控制"排成梯度——Foundry 语音 agent、Hosted + Voice Live、直接调 Voice Live API，控制力递增、托管程度递减

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]、[[Voice-Live系列14：模型接入的三条路径]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-08
- **置信度**：0.75
- **状态**：active
- **证据类型**：产品与服务

> Foundry 语音 agent：Prompt Agent 打开 Voice mode，配置存在 agent metadata 里，几乎零代码，但大脑在 agent 侧、会话 `instructions` 不可用、架构是级联。Hosted + Voice Live：自己的代码在容器里调 Voice Live、暴露 `invocations_ws`，planner 与模型自控，但重连与续传要自己做。直接调 Voice Live API：自己的后端建会话，每一轮都能介入，代价是轮次控制成了一门工程。Voice Live 本身被官方画成 "Voice Live API / Agent Platform"，所有路线都能把推理和工具委派给 Foundry agent 或自带后端。

### Claim: 真实客户项目大多落在直接调 Voice Live API——"要不要逐轮控制"是最容易被低估的选型问题

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]、[[Voice-Live系列14：模型接入的三条路径]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-08
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验

> 托管的语音 agent 适合"一个能对话的 agent 加上声音"；一旦业务要求控制每一轮——什么时候开口、说哪句原文、何时打断、网络差时怎么降级——就需要会话在自己手里。客户在 POC 阶段通常觉得托管够用，进入真实业务才发现要控制每一轮；答案是"可能需要"时，前期就按直接调 API 设计会话层，比后期迁出便宜得多。一个数字人面试案例：会话全部走 model 模式，Voice Live 只当"一张嘴"，追问由会话外的 judge 决定。

### Claim: 一个产品里多种构建方式并存是常态——自由对话的会话挂 agent，脚本化、强控制的会话只挂模型

- **来源**：[[Voice-Live系列14：模型接入的三条路径]]
- **首次出现**：2026-10-05
- **最近更新**：2026-11-08
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验

> 直接调 Voice Live API 时，原生 `model=`、BYOM、agent 绑定按会话选，不是全产品统一一种。agent 的价值等于交给它的内容决定权：应用开轮 + 现成文本逐字读的会话里，挂 agent 反而丢 per-turn instructions、多一圈 runtime，应走 model 模式；需要追问、内容无法预写、多 persona 共享同一大脑的会话，才挂 agent。

### Claim: 电话入口单独看底座——有 D365 Contact Center、要标准 IVR 走 Copilot Studio 语音 agent，要自定义体验、模型或数据驻留走 Voice Live + ACS

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-08
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务

> Copilot Studio 一侧：DTMF、转人工、答录机检测、上下文交给坐席现成，但只在 Standard harness 上、与 D365 绑得紧、可调的轮次参数少，gpt-realtime 在 Global Standard 下的处理地域要先过合规。Voice Live 一侧：semantic VAD、降噪与回声消除、自定义音色、模型三档或 BYOM，有 Call Center Voice Agent Accelerator 模板起步，但 IVR 菜单、转人工、录音要基于 ACS Call Automation 自己写。Hosted Agent 现在也有官方的 Telephony integration 文档，可作为第三条路评估。

### Claim: Copilot Studio 没有内置数字人——只能自建前端拼"转写 → agent → avatar"三段，适合展示、不适合产品级体验

- **来源**：[[Foundry-Agent与Copilot-Studio的选型]]、[[Voice-Live系列05：两类数字人头像]]
- **首次出现**：2026-10-27
- **最近更新**：2026-11-08
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务

> 数字人（照片级 avatar 的实时视频加口型）是 Azure Speech 的能力，入口是 Voice Live 会话里的 avatar 或 Speech SDK 的实时 avatar API。给 Copilot Studio agent 做数字人：前端用 Speech SDK 转写，文本经 Direct Line（Standard）或 M365 Agents SDK 发给 agent，回复交给实时 avatar 合成。代价：三段各一跳、延迟最高；没有 Voice Live 内置的轮次能力；回复整段返回；接不进 Voice Live 的 agent 绑定；匿名访客只能走 Direct Line 且只适用 Standard。数字人本身就是产品时，走 Voice Live + Foundry Prompt Agent。

### Claim: Hosted Agent 做语音有明确上限——帧 1 MB、单连接约 30 分钟、沙箱 2 vCPU / 4 GiB，要按重连协议设计

- **来源**：[[foundry-agent-type-selection]]
- **首次出现**：2026-11-07
- **最近更新**：2026-11-08
- **置信度**：0.75
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 修订——依据：[Build a voice agent with hosted agents](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/build-voice-agent)

> WebSocket 帧上限 1 MB（超限关闭码 1009）；平台滚动回收基础设施，单连接约 30 分钟发关闭码 1001，客户端用同一 `agent_session_id` 重连，平台不重放丢失的帧，应用层续传要容器自己做；沙箱最高 2 vCPU / 4 GiB，语音建议至少 1 vCPU / 2 GiB。session 闲置超时默认 15 分钟、可配置（两篇官方文档给的上限不一致：2~60 分钟与 2~240 分钟）。

## 关联概念

- [[voice-live-agent]] — `uses` 三种构建方式都建在 Voice Live 之上
- [[foundry-agent-service]] — `uses` 选项 A、B 是 Foundry 的两类 agent
- [[copilot-studio]] — `contrasts` 电话与数字人入口下 Copilot Studio 的能力边界
- [[turn-taking]] — `constrains` 选项 C 的工程量主要来自轮次控制

## 关联方法

- [[voice-cascaded-pipeline]] — `uses` 选项 A、B 在架构上都是级联
- [[weak-network-adaptive-degradation]] — `uses` 选项 C 才能做弱网时关画面保声音的不对称降级

## 来源

- [[Foundry-Agent与Copilot-Studio的选型]] — 第 6.3、6.4、6.6 节与前期决策清单第 4、6 题
- [[Voice-Live系列14：模型接入的三条路径]] — 三条接入路径、一个产品里两种模式并存
- [[Voice-Live系列05：两类数字人头像]] — 数字人渲染来自 Azure Speech avatar
