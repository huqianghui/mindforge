---
title: "Voice Live Agent"
created: "2026-04-13"
updated: "2026-09-25"
tags:
  - wiki
  - concept
  - voice
  - agent
  - realtime
  - azure
aliases:
  - "Voice Live Agent"
  - "语音实时 Agent"
  - "Realtime Voice Agent"
related:
  - "[[foundry-agent-type-selection]]"
  - "[[intelligent-dictation]]"
---

# Voice Live Agent

## 摘要

Voice Live Agent 是结合语音 I/O 与 LLM 推理能力的实时对话系统。当前存在两种主流架构：Cascaded Pipeline（STT + LLM + TTS 独立流式组件）和 End-to-End Native（单一多模态模型）。2026 年企业级唯一生产可行架构仍是级联管线。低延迟的关键不是让单个组件更快，而是让它们重叠执行（streaming + pipelining）。

## Claims

### Claim: 两种主流架构——级联管线与端到端

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> Cascaded Pipeline（STT + LLM + TTS）vs End-to-End Native（单一多模态模型 audio-in to audio-out）。

### Claim: 低延迟关键在于组件重叠执行

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 不是让单个组件更快，而是 streaming + pipelining。sentence buffer 是 LLM token 输出到 TTS 句子输入的关键管线节点。Salesforce 级联管线实现 ~755ms first-audio latency。

### Claim: 语音不是"界面层"那么简单

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 实现 < 1 秒端到端延迟需要 STT、LLM、TTS 的精密流水线协调。

### Claim: 端到端模型尚未达到企业生产可用

- **来源**：[[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 2026 年企业级唯一生产可行架构仍是 STT → LLM → TTS 级联管线。Level 1 Fully E2E（如 Moshi）有研究价值无工程价值，Level 2 Hybrid Omni 本质仍是管线。

### Claim: Voice Agent 的真正难点在 Agent 而非语音

- **来源**：[[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> Voice Agent = LLM Agent + Voice I/O。推理、工具调用、状态管理才是核心难点，"能听会说"只是界面。

### Claim: Azure Voice Live API 走全托管端到端路线

- **来源**：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：stale

> STT、GPT Realtime、TTS、VAD、降噪、回声消除全部云端处理，原生 Avatar 集成。牺牲自托管控制换取更低集成复杂度。

### Claim: Voice Live API 采用 WebSocket + WebRTC 双通道架构

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：stale

> WebSocket 是 Control Plane（信令/控制/事件/Tool Calling），WebRTC 是 Data Plane（低延迟音视频流）。两条通道并存且职责解耦。建连时序：WebSocket 建控制面 → 通过 WebSocket 交换 SDP → WebRTC PeerConnection 建立 → 运行时协作。

### Claim: 从 WebSocket-only 到双通道是产品成熟度驱动的必然升级

- **来源**：[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
- **首次出现**：2026-05-22
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：stale

> WebSocket 传音频的缺陷：TCP 队头阻塞导致延迟抖动、丢包重传带来延迟尖峰、无法利用浏览器 AEC/NS、无 AV sync、无法支持 Avatar 视频。当场景从 demo 进入 production + avatar + low-latency 时，WebSocket 作为音频传输通道的技术天花板被触碰。

### Claim: Voice Live 与 Agent Service 解耦后发生模型归属反转

- **来源**：[[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：active

> Voice Live API 从 Agent Service 解耦为独立服务后，Realtime 模型归 Voice Live 持有，Agent 变成可选挂载项。三种合作模式：模式一（传统 Agent，语音自理）、模式二（Voice Live 独立会话，不挂 Agent）、模式三（Voice Live 挂 Agent，语音层与推理层分工）。

### Claim: Voice Live 挂 Agent 是会话级绑定 + 服务端编排，不是 function call

- **来源**：[[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：active

> 绑定通过 WebSocket 连接 URL 的 query 参数（`agent_id` + `project_id`）在会话建立时完成，而非运行时把 Agent 当工具调用。证据：挂 Agent 后 session 的 `instructions` 字段被禁用（推理归 Agent），且服务端会推送 `interim_response`（TOOL/LATENCY 类型）填补 Agent 推理延迟——这是服务端编排器行为，function call 模式不会有。

### Claim: 选型是一条光谱，延迟瓶颈在模型和工具而非 Voice Live 这层壳

- **来源**：[[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型]]
- **首次出现**：2026-07-19
- **最近更新**：2026-07-21
- **置信度**：0.7
- **状态**：active

> 直连 Realtime API ↔ 模式二（Voice Live 独立会话）↔ 模式三（挂 Agent）构成控制力递减、托管度递增的光谱。三笔账：延迟账（瓶颈排序为模型推理 > 网络 RTT > 语音层处理）、控制账（instructions/工具在谁手里）、运维账（VAD/降噪/回声消除是否自理）。企业级复杂场景最优解是模式三 + 分层用模型（简单问答留 Realtime、复杂推理走 Agent）。

### Claim: 数字人 avatar=云端神经视频合成 + viseme 时间轴 + WebRTC 推流——浏览器退化为显示器

- **来源**：[[从Canvas音波球到云端数字人——浏览器动态内容的计算光谱（动态SVG下篇）]]
- **首次出现**：2026-08-26
- **最近更新**：2026-09-25
- **置信度**：0.85
- **状态**：active

> Foundry Voice Live 页面 Inspector 实探：数字人形象不在本地渲染——云端 GPU 做神经视频合成（口型由 TTS 输出的 viseme 时间轴驱动），WebRTC 把视频流推给浏览器，`<video>` 元素只是显示器。三条技术路线对照：① 云端视频合成（效果最真、延迟与 GPU 成本最高，Voice Live avatar 属此路）；② 客户端 3D blendshape（Three.js 本地渲染，viseme 驱动表情骨骼，成本低可离线）；③ Live2D 纸片人（2D 变形，最轻量）。选型判据是"计算发生在哪里"：内容复杂度 × 实时性来源决定画面在文档内/本地 JS/本地 GPU/云端 GPU 哪一层生成。音波球一类可视化则是本地 Canvas 四环节驱动链（Web Audio AnalyserNode → 几何映射 → 涂像素 → rAF 帧循环）——同为"语音驱动画面"，两者的计算位置相距整个光谱。
>
> 2026-09-25 精确化（Voice Live 系列05）："口型由 viseme 时间轴驱动"**仅对 video 头像成立**——photo 头像由 VASA-1 直接消费音频波形逐帧生成整头，中间无显式 viseme 表示；见下方两类头像 Claim 与 [[viseme]] 页。

### Claim: 四种语音要求各有专属控制面——提示词表达表演意图、语音接口生成声音、声音自带的时间数据驱动嘴型

- **来源**：[[Blender系列04：人物面试动画实战——47骨骼程序化表演、TTS配音与音量包络口型同步]]
- **首次出现**：2026-09-07
- **最近更新**：2026-09-12
- **置信度**：0.8（OpenAI/Azure Speech 官方文档核对，方案未实跑接入）
- **状态**：active

> 语音驱动动画时四种容易混淆的要求各有专属控制面：**发音正确**（人名/多音字）靠发音词典、phoneme/say-as/sub；**声调正确**靠音素/拼音声调标记（Azure SAPI 记法如 `lin 2 yue 4`）；**韵律自然**靠声音选择、自然语言 instructions 或 SSML prosody/style/break；**口型对应**靠与最终音频对应的 viseme/面部系数或强制对齐——**"请让嘴型同步"这句提示词本身不会产生毫秒级时间表**，提高整句 pitch 也不会纠正读错的声调。两条 API 路线的分界：OpenAI Speech（`gpt-4o-mini-tts`）用自然语言 instructions 控制口音情绪语速，但只返回音频、无 phoneme/viseme 时间轴字段；Azure Speech `zh-CN` 支持 Viseme ID + **55 项面部系数按 60 FPS 输出**（进 24 fps 渲染端要做时间换算），事件时间用 100 纳秒 tick，**不能用网络回调到达时间当动画时间**（事件在音频数据可用时触发，可能远早于播放）。配套六条同步工程规则：一次合成是一个完整版本（台词/参数/WAV/事件/音频 SHA-256 一起存档）、锁定声音之后再定嘴型、音频剪辑与事件用同一时间映射、区分片段起点和发声起点、统一视频时间基准、最终合成后再查偏移。这是"数字人=viseme 时间轴"Claim 的直接工程续证——viseme 不只驱动云端视频合成，同样可驱动本地渲染载体（Blender 形态键、three.js blendshape），前提是渲染端有对应控制面（"把 55 项数值塞进 3 个形态键不叫精细同步"）。

### Claim: 延迟工程的治本/治体感二分——技术等待与感知等待分离；对话面端到端每轮 ≈5.6s、外部网关占 70%

- **来源**：[[Voice Live系列03：数字人出场延迟优化——ICE门控根因、实测分解与预热占位策略]]
- **首次出现**：2026-09-14
- **最近更新**：2026-09-16
- **置信度**：0.8（真实生产环境多轮实测：出场 n=11、对话轮 5 session×3 轮 + 直连对照、brain RTT n=20）
- **状态**：active

> 数字人出场链路的三层优化各治一段，构成"技术等待 vs 感知等待"的分离范式：**ICE 门控消灭确定性等待**（治本，8s→0.38s）、**说明页预热把连接藏进阅读时间**（重叠——预热时机 = 能拿到会话的最早时刻，阅读 ≥7s 即零等待）、**上次会话截帧占位让人物形象秒出**（治体感，体感 ≈0）——"用户感知的等待可以远小于技术上的等待"。出场合计：16s→11.25s（本地最坏情况）→9.99s（同区域生产单测）→中位 8.61s（生产 n=9）。对话面合成端到端：说完话→数字人开口说下一题 ≈ 0.86s（VAD 判停）+ 0.19s（转写尾）+ **3.90s（外部面试网关 RTT，n=20 中位，2.87~5.04s）**+ 0.63s（读题→首块音频）≈ **5.6s——网关一段占 70% 且波动最大**，与出场链路最大头（面试创建中位 4.7s）是同一项成本，是对话面唯一的结构性优化点：**同域部署/网关提速治本，思考过渡语遮蔽治体感**。反面印证：同区域后端 proxy 中转几乎免费（`response.create`→首 token 生产与直连都 ~0.5s），瓶颈在浏览器到区域的公网 RTT 与外部依赖，不在语音层这层壳——与既有"延迟瓶颈在模型和工具而非 Voice Live 这层壳"Claim 互证。

### Claim: S2S 与混合式的真开关是 voice 配置字段而非模型选择——"架构决策降级为配置项"在输出侧再次上演

- **来源**：[[Voice Live系列04：四条路线与全双工——GPT-Live-1对数字人方案的影响评估]]
- **首次出现**：2026-09-19
- **最近更新**：2026-09-25
- **置信度**：0.75
- **状态**：active

> 四条路线（级联/混合/S2S/全双工）中，gpt-realtime 配 azure-custom voice 即滑入混合式（Speech-LLM + Azure TTS），解锁 viseme/avatar；纯 openai 原生音色锁死纯语音——数字人的 viseme 闸门由 voice 配置决定。GPT-Live-1（全双工）把判停/打断/附和原生化，吃掉平台"轮次机器"。产品组问答五点：① GPT-Live-1×avatar 是结构性难题（viseme 控制面缺失，"换嘴"退路对全双工不成立）；② gpt-live-1 尚未上线 Voice Live（当前 gpt-realtime 2.1/1.5）；③ "prompt agent + gpt-live-1"走 Voice Live 可行；④ 中文轮次判断产品组自己打问号需实测；⑤ **更正记录："Agent 选不到 gpt-realtime"确认是 bug 且已于 2026-09 修复，非解耦设计**——此前系列02 曾按"解耦设计结果"解读，已原地更正；本页解耦/三模式/会话绑定三条 Claim 不以"bug=设计"为核心论断、不受影响；Agent+gpt-realtime 组合当前可用，为选型光谱左端新增可用组合点。落地量化：$0.05/分钟按秒计、按并发会话数限流、只支持音频+文本无图像。


### Claim: 两类数字人头像=两条合成路线——video 素材回放 + viseme 神经渲染嘴部，photo 单图 + VASA-1 逐帧生成整头；session 构造必须按头像类型分支

- **来源**：[[Voice Live系列05：两类数字人头像——viseme驱动的Video Avatar与VASA-1生成的Photo Avatar]]
- **首次出现**：2026-09-23
- **最近更新**：2026-09-25
- **置信度**：0.85
- **状态**：active

> `type: photo-avatar` 是后端路由开关、`model: vasa-1` 是版本化声明；`style` 本义是"另一段实拍素材"故 photo 头像无 style、连续参数 `scene` 取代之；session 构造器与 agent metadata 必须按头像类型分支——`avatar_verification_failed` 生产事故实证。素材边界与 RAI 身份闸门：photo 用真人照片需 consent 视频+人脸比对核验 / AI 生成虚拟人免 consent / 卡通非人类比例明确不支持（VASA-1 潜空间在真实人脸上训练）；自定义 video 头像只能真人 ≥10min 实拍。成本结构：自定义 video=重资产（训练 $600–1,440/个 + endpoint hosting ≈$432/月/个），自定义 photo=一次性 creation 费无 hosting、换形象边际成本≈0；会话计费两类同表（$0.50/$0.60 每分钟）。推荐逻辑按呈现窗口分：头像框/小窗→photo（脸更生动且 512×512 短板不暴露）；半身/大屏/品牌服装/竖屏立牌→video；photo 仍 public preview 需核 region/SLA。传输层两类完全相同（同一 ICE/SDP/WebRTC/H.264）。


### Claim: session 字段三层归属与开轮/生成两关分离——Agent 模式下 create_response 从调节器退化为总闸

- **来源**：[[Voice Live系列06：轮次控制的五道关卡——create_response、response.create与Model、Agent模式的控制权归属]]
- **首次出现**：2026-09-23
- **最近更新**：2026-09-25
- **置信度**：0.8
- **状态**：active

> session 字段按控制权归属分三层：检测器参数（`threshold`/`silence_duration_ms`/`end_of_utterance_detection`）归 Speech 层；行为策略开关（`create_response`/`interrupt_response`/`auto_truncate`）归编排层；生成约束归 LLM 层——`turn_detection` 是跨层混合对象（与 [[speech-technology-stack]] 的功能流水线三层是不同切分轴，互为补充）。**开轮与生成是两个独立关卡**：`create_response` 只管要不要开轮、`instructions` 只管轮里说什么；关掉自动开轮后提示词"无处施力"而非"失效"，反向手动发不带约束的 `response.create` 模型照样自由发挥。"谁开轮 × 怎么约束"叉乘出七种使用形态（全自动/应用节拍/受约束轮次〔模型模式独有〕/脚本朗读/旁路生成 `conversation: "none"`/分阶段混合/push-to-talk），判断顺序：谁决定何时答 → 每轮任务是否一样 → 要不要托管知识库工具 → 音频质量与判停精度（正交）。应用节拍副产品=彻底消除 `conversation_already_has_active_response` 撞车；`interim_response` 是 Agent 推理耗时时编排器推的填充语，应用节拍下不出现；`create_response=false` 不影响数据采集（VAD 仍 commit/生成 user item/转写照跑）。Agent 模式拿走 session 级与 per-turn `instructions`（实测报错 "Overriding instructions in response.create is not supported"），保留 item 注入与 interim_response——模型模式"开轮但只说一句确认"的中间档在 Agent 模式不存在；`conversation.item.create` 是两种模式下唯一的内容级操控手段（官方 Agent quickstart 开场白=先塞 system item 再发空 `response.create`；官方原话 response 属性 "later overridable using the response.create event"）；VAD/EOU 参数可预置于 Agent metadata `microsoft.voice-live.configuration`（512 字符分块）。级联（文本）模型下 `modalities: audio` 是假的——音频由 Azure TTS 合成，"让模型小声慢点说"的提示词不可能生效，韵律要调 `voice.rate`/`voice.temperature` Speech 层参数〔文章自标推断，0.7〕；转写主链路（文本模型下 azure-speech 自动开启）/旁路（gpt-realtime 下仅留记录）随模型翻转。


### Claim: Agent 的价值=交给它的内容决定权；重复回应=开轮关卡放行次数，与提示词无关——转写指纹排查法与 response.created 验证标准

- **来源**：[[Voice Live系列07：重复致谢排查——三次Thank you的三个开轮来源、转写指纹与编排层修法]]、[[Voice Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM judge、两段式提交与频率策略]]、[[Voice Live系列06：轮次控制的五道关卡——create_response、response.create与Model、Agent模式的控制权归属]]
- **首次出现**：2026-09-24
- **最近更新**：2026-09-25
- **置信度**：0.85
- **状态**：active

> "谁开轮 × 谁给内容"2×2 控制权矩阵：external API 与 bank linear 两种 persona 同在"应用开轮 + 现成文本逐字读"行——Agent 价值为零且 Agent 模式是负资产（丢 per-turn `instructions`/多一圈 Foundry runtime/无 `interim_response`），应走 `?model=` + 最小模型（生产 external-brain persona 用 gpt-4.1-mini 即此用法）；**传声筒也绕不开模型**——Voice Live 没有"说这句话"事件，文本进 TTS 的唯一入口是 response、response 的唯一入口是模型（`?model=`/`?agent_id=` 必选其一）；response 档是串行两段不是并列选项：门控链 VAD→EOU→LLM judge→两段式提交归应用侧、与 model/agent 无关，开轮后"说什么"才轮到二选一。VL07 生产实证：**重复回应=开轮关卡放行次数**——三个开轮来源要分别关（VAD 判停走 `create_response`；前端"我答完了"补发的裸 `response.create` 不走 VAD 也不受 `create_response` 管；无噪音也能三次：中途停顿/说完停下/按钮补发，噪音与回声只是放大器）。转写指纹排查法：每个 `response.created` 向前配对最近 user item 的转写——空=噪音 / 半句=停顿 / 复述自己的话=回声；级联模型下先开轮再等转写（`response.create` 在 `speech_stopped` 时即发），读日志按此顺序。十三步完整流程三段归属：门控段全在应用侧与挂不挂 Agent 无关 / 开轮生成段仅推理是 persona 定义生效处 / 播出段；两个易漏点：judge 异步竞态复查（放行瞬间用户又开口则丢弃）、`acked` 只翻一次。验证标准：`response.created` 次数严格等于门控放行次数（面试场景=读题次数），多出的每一个都能用指纹表分类。

## 冲突与演进

- 2026-08-30：注入数字人渲染三路线 Claim（动态SVG下篇 Inspector 实探），页面 active 证据回填。
- 2026-09-12：注入四种语音要求分层 + viseme 工程细节 Claim（Blender 系列04，官方文档核对）——"viseme 时间轴"Claim 获得跨域（DCC 渲染端）工程续证；计算位置判据归口新页 [[compute-locus-spectrum]]。
- 2026-09-16：注入 Voice Live 系列03 延迟工程 Claim（治本/治体感二分 + 端到端 5.6s/网关 70%）——"选型光谱与延迟瓶颈"Claim 获生产实测互证；对话轮次分解归口 [[turn-taking]]、首帧成本量化归口 [[compute-locus-spectrum]]、ICE 协议工程归口 [[realtime-protocol-selection]]。

## 关联概念

- [[viseme]] — `uses` 数字人 video 头像的口型驱动信号与时间轴事件协议
- [[end-of-turn-detection]] — `uses` turn_detection 内可选的 EOU 子对象，判停精度的第二代/三代方法

- [[intelligent-dictation]] — `extends` Voice Agent 输出可从"记录说了什么"升级为"写出想表达什么"
- [[foundry-agent-type-selection]] — `grounds` Voice Live 组合方向为 Foundry Agent 类型选型提供依据

## 来源日记

- [[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]] — 架构全景
- [[2026-04-06-Building-Enterprise-Realtime-Voice-Agents]] — 企业级实践
- [[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]] — WebRTC 双通道架构
- [[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型]] — 解耦后三种合作模式与选型光谱
- [[Blender系列04：人物面试动画实战——47骨骼程序化表演、TTS配音与音量包络口型同步]] — 四种语音要求分层、两条 API 路线与 viseme 同步工程规则
- [[Voice Live系列03：数字人出场延迟优化——ICE门控根因、实测分解与预热占位策略]] — 出场延迟分解与三层优化、对话轮次与外部网关实测
