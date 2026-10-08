---
title: "End-of-Turn Detection（话轮结束检测 / EOU）"
created: "2026-09-25"
updated: "2026-10-08"
tags:
  - wiki
  - concept
  - voice
  - turn-taking
aliases:
  - "EOU"
  - "end of utterance detection"
  - "话轮结束检测"
related:
  - "[[voice-activity-detection]]"
  - "[[turn-taking]]"
  - "[[speech-technology-stack]]"
  - "[[voice-live-agent]]"
  - "[[llm-as-a-judge]]"
---

# End-of-Turn Detection（话轮结束检测 / EOU）

## 摘要

End-of-Turn / End-of-Utterance（EOU）检测回答"**这句话说完了没**"——它是语音 Agent 栈里介于 VAD（声学层"声音停了没"）与 turn-taking（轮次协调层"该不该接话"）之间的独立一层。VAD 只能在"手快"和"迟钝"之间选（想词的停顿和说完无法区分），EOU 引入语言/声学完整性判断：VAD 发现静音后不立刻判停，先让 EOU 模型对累计转写打"这句话完整了"的概率，过阈值立刻判停、没过最多再等 `timeout_ms`——**延迟只加在"看起来没说完"的停顿上**。

三代方法谱系：① 静音阈值（`silence_duration_ms`，所有基础 VAD）→ ② 文本语义（Azure `end_of_utterance_detection` semantic_detection_v1(_multilingual)；LiveKit 2024 文本 turn-detector，已弃用）→ ③ 音频原生（语义+语调/音高/节奏：Voice Live 2026-06-01-preview `smart_end_of_turn_detection`、LiveKit Turn Detector v1.0、Pipecat Smart Turn）。

## Claims

### Claim: 文本语义 EOU 有天花板但没有退役——音频原生是新增不是替换

- **来源**：[[Voice Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM judge、两段式提交与频率策略]]
- **首次出现**：2026-09-24
- **最近更新**：2026-09-25
- **置信度**：0.8
- **状态**：active

> 文本天花板三条（LiveKit 弃用自家文本模型的理由）：模型只能好到转写的程度、转写本身加延迟、转成文字丢掉时序和声学信号——"pizza." 和 "pizza, and…" 在停顿那一刻转写完全相同。但 GA 版 API 2026-04-10 三种 VAD 类型都保留 `end_of_utterance_detection` 字段，preview 是在旁边新增音频模型选项；Azure 与 LiveKit 的演进路线一致：先文本后音频，两代并存。外部谱系数据点：LiveKit Turn Detector v1.0 在 eot-bench 300ms 预算下误截断率 9.9%。

### Claim: azure_semantic_vad ≠ EOU——同名"semantic VAD"两家语义不同，起止检测与完整性判断是两个可选项

- **来源**：[[Voice Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM judge、两段式提交与频率策略]]
- **首次出现**：2026-09-24
- **最近更新**：2026-09-25
- **置信度**：0.8
- **状态**：active

> Azure `azure_semantic_vad` 的官方定义是"用语义语音模型判断用户开始与停止说话，在噪音环境下更稳健"——解决的是**起止检测的噪音鲁棒性**；"这句话完整了没"是另配的子对象 `end_of_utterance_detection`。只开 `azure_semantic_vad` 不配 EOU 块，停顿仍按 `silence_duration_ms` 一刀切。对照 OpenAI `semantic_vad`（模型内置、仅 gpt-realtime、`eagerness` 参数）——名似层异。另：API 默认不开 EOU 而官方 Agent quickstart 开着（`azure_semantic_vad` + `semantic_detection_v1_multilingual`）——"推荐配置≠默认值"；默认不开的三条推断理由（与 Realtime API 默认一致/语言覆盖有限/短指令场景 timeout 不利）系文章自标推断（置信度 0.6）。

### Claim: EOU 只决定"何时触发判停"，不决定"是否放行开轮"——挡得住句中想词，挡不住完整句后想下一要点，也挡不住客户端补发

- **来源**：[[Voice Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM judge、两段式提交与频率策略]]
- **首次出现**：2026-09-24
- **最近更新**：2026-09-25
- **置信度**：0.75
- **状态**：active

> `speech_stopped` 一旦发出，`create_response=true` 就照常开轮。句子完整了，EOU 不知道这道题有几个要点——那是 LLM judge 的事（知道任务、几百 ms~1s、不该放在 Speech 层实时路径上；正确叠法：EOU 洗干净 `speech_stopped` 触发，judge 决定接下来干什么）。空转写（噪音、回声）没有完整性可判，多半等到 `timeout_ms` 后照发。输出应当是概率而非布尔值，阈值由应用定——这是两段式提交（T1 试探/T2 确认）的前提。

### Claim: 配置与验证细节——嵌在 turn_detection 内、字段名随版本变过、生效核验看 session.updated 回显与误判完成率

- **来源**：[[Voice Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM judge、两段式提交与频率策略]]
- **首次出现**：2026-09-24
- **最近更新**：2026-09-25
- **置信度**：0.85
- **状态**：active

> EOU 不是独立 session 字段，三种 VAD 类型都能挂。`threshold_level`：low/medium/high/default（default=medium；官方原话 "With a lower setting the probability the sentence is complete will be higher"——low 手快、high 保守）；`model` 二选一：`semantic_detection_v1` 仅英语、multilingual 十种语言，其他语言被忽略等于没配。字段名坑：早期 preview（2025-05-01）写 `threshold: 0.01`/`timeout: 2`（浮点/秒），GA 2026-04-10 是 `threshold_level`/`timeout_ms`——配错服务端可能静默忽略，按 api-version 对照 API Reference。Agent 模式可预置于 metadata `microsoft.voice-live.configuration`。生效核验：`session.updated` 回显 EOU 子对象 + `speech_stopped`→下一次 `speech_started` <3s 比例（误判完成率）下降。（官方 API Reference 原文核对）

### Claim: Azure EoU 有两种实现、可达性不同——文本型（`semantic_detection_v1_multilingual`）工作在识别文本上、需要 Voice Live 自己的识别器、只在级联可用；音频型（`smart_end_of_turn_detection`）工作在输入音频流上、所有管线可用，是严格超集；分段行为实测等价，`timeout_ms` 调到 1000 判定延迟即持平

- **来源**：[[Voice Live系列15：realtime模型与数字人——四条路线再展开、EoU两种实现决定可达性、文本驱动已验证与音频驱动的证据边界、GPT-Live-1待测清单]]（第三节）
- **首次出现**：2026-10-05
- **最近更新**：2026-10-08
- **置信度**：0.7（五组合可达性矩阵 + 分段对照，每种配置仅 1 次、真人录音未覆盖）
- **状态**：active

> realtime 在生产会话形状下被拒，报文明说 "Text-based end-of-utterance detection requires a local speech recognizer and is only supported on cascaded pipelines"——SDK 里 EoU 是两个类，此前用的是只有级联才有的文本型。同一会话只换 EoU：原生 `gpt-realtime-2.1` / `1.5` 与 BYOM realtime profile 文本型拒、音频型收；原生 chat 模型与 BYOM chat profile 两种都收。分段对照（20 ms 帧实时喂、模型固定 chat）：文本型声称的"更干净、更少碎片"优势没有出现，带 1.2 s 停顿的输入两边都切两段、转写逐字相同；音频型默认晚约 0.3～0.5 s，`timeout_ms` 1000 即持平（−0.16～+0.20 s），**700 反而合并成一段并推迟到 9 s、行为变质——不是越小越快**。坑：中文素材用 macOS `say` 合成两边都不干净，换成产品实际用的 Azure TTS 合成后持平，素材问题会伪装成被测对象的差异。决策：统一到音频型 @1000 ms、删掉文本型分支与为它存在的管线开关。本页首条 Claim"音频原生是新增不是替换"在 Azure 上获得具体形态：两种实现并存，但可达性让音频型成为默认。方法学：从一次失败推"realtime 不可能"是本轮连错三次的同一毛病，正确做法是把 SDK 同类型列全各测一次。

## 冲突与演进

- 本页建立前，[[turn-taking]]"Turn-Taking≠端点检测"与 [[voice-activity-detection]]"Semantic VAD 只做 end-of-turn 检测"两条 Claim 已把 EOU 当前置概念使用——后者的对象是 OpenAI `semantic_vad`，与 Azure `azure_semantic_vad` 的范围区分见本页第二条 Claim（该页已同步做范围限定）。
- 2026-10-08：注入 Voice Live 系列15 第三节「EoU 两种实现决定可达性」Claim——此前「realtime 用不了」的判断错在 EoU 实现选择，不在模型；首条 Claim 获 Azure 侧具体形态续证。

## 关联概念

- [[voice-activity-detection]] — `extends` VAD 判"声音停了"，EOU 在其上判"话说完了"
- [[turn-taking]] — `part-of` 轮次协调的判停环节：EOU 洗干净判停信号，开轮/生成是另外两个独立决策点
- [[llm-as-a-judge]] — `contrasts` EOU 小模型（几十 ms、不知任务）与 LLM judge（几百 ms、知道任务）叠放不替代

## 来源日记

- [[2026-09-23-周三]] — Voice Live 轮次控制讨论成文（VL06，09-24 拆出 VL08 应答门控篇）
- [[Voice Live系列15：realtime模型与数字人——四条路线再展开、EoU两种实现决定可达性、文本驱动已验证与音频驱动的证据边界、GPT-Live-1待测清单]] — 第三节：EoU 文本型 / 音频型两种实现、五组合可达性矩阵与分段等价实测
