---
title: "架构约束优于 Agent 自主学习：代码复用策略"
created: "2026-04-13"
updated: "2026-10-02"
tags:
  - wiki
  - decision
  - agent
  - code-reuse
decision_status: "active"
related_concepts:
  - "[[code-reuse-in-agent-era]]"
  - "[[harness-engineering]]"
related_methods:
  - "[[code-reuse-four-layer-defense]]"
---

# 架构约束优于 Agent 自主学习：代码复用策略

## 背景

Coding Agent 每次会话倾向从头实现功能而非复用已有代码，因为 agent 缺乏项目全局视角。需要决定解决策略：教 agent 学会复用，还是用架构约束强制复用？

## 选项分析

### 选项 A: 让 Agent 自己学会复用

- **优势**：不需要额外配置；理论上更灵活
- **劣势**：Agent 每次会话上下文有限，无法保证跨会话一致性；依赖模型能力提升
- **适用条件**：未来模型具备可靠的长期记忆和项目全局理解时

### 选项 B: 用架构约束强制复用

- **优势**：确定性高——规则一旦声明就生效；不依赖模型能力；CLAUDE.md 是现成机制
- **劣势**：需要人工维护架构规则；规则可能滞后于代码变化
- **适用条件**：当前模型能力下的务实方案

## 决策结论

- **选择**：架构约束强制复用（选项 B），通过四层防线实施
- **理由**：不让 agent 自己学会复用，而是用架构约束让它不得不复用。确定性优于概率性
- **放弃理由**：Agent 自主学习在当前模型能力下不可靠，跨会话上下文丢失严重
- **前提假设**：CLAUDE.md 等机制足够表达架构约束——如果约束表达力不足需寻找更强机制

## 影响范围

- **受影响的概念**：[[code-reuse-in-agent-era]]、[[harness-engineering]]
- **受影响的方法**：[[code-reuse-four-layer-defense]] 完全基于此决策

## 验证状态

- **验证方式**：在项目中配置 CLAUDE.md 架构约束，观察 Agent 是否遵守复用规则
- **当前状态**：未验证（分析充分，实践待开展）
- **验证证据**：待补充
- **复核提醒**：截至 2026-09-12 证据全部过线（stale，最近证据停 2026-04-13）、待用户复核；decision_status 是否调整由用户裁决，本次维护未变更。

## Claims

### Claim: 四层防线是代码复用的真正解法

- **来源**：[[Vibe Coding系列07：Coding Agent时代的代码复用——从架构约束到Plugin协作的实践指南|Vibe Coding系列07]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 不让 agent 自己学会复用，而是用架构约束让它不得不复用。

### Claim: 语音轮次域实例——"不要主动追问"从提示词约束变为结构性不可能（by construction 而非 by instruction）

- **来源**：[[Voice Live系列06：轮次控制的五道关卡——create_response、response.create与Model、Agent模式的控制权归属]]、[[Voice Live系列07：重复致谢排查——三次Thank you的三个开轮来源、转写指纹与编排层修法]]、[[Voice Live系列08：应答门控——判停与开轮之间的四个判断：EOU、LLM judge、两段式提交与频率策略]]
- **首次出现**：2026-09-23
- **最近更新**：2026-09-25
- **置信度**：0.85
- **状态**：active

> 本决策"架构约束优于 agent 学习/指令"在 Realtime 协议层的落地：`create_response=true` 时判断与说出在同一 response 内、无人能否决——这是提示词约束失效的**结构原因**（VL07 生产实证：致谢与追问出自同一 response，"the turn and the follow-up turn are the same turn"——协议层没有"只许致谢不许追问"档）。修法是把 judge 与 speaker 分离：独立 judge 调用输出结构化 JSON（complete/partial/off-topic），追问从模型自由行为变成应用显式触发的 `response.create`，每题致谢上限由状态机保证而非提示词承诺。两层各治一段：线性轮次治"次数"（`create_response=false` + 去掉补发后模型拿不到轮次）、Speech 层治"内容进缓冲区"（EOU/`remove_filler_words`/降噪/Live-Reference AEC）。频率策略只能在应用层——依赖跨轮状态（每题上限 1/答题<3s 不致谢/距上次<2 题不致谢/相邻不同句），"一行都写不进提示词，因为提示词只在单个 response 内生效"；内容三档（脚本池/模板加槽位/受约束生成+代码校验回退），评价色彩场景停在第二档。

### Claim: 语音脚本朗读域实例——读题三代路径从 prompt 约束（隐式 assistant item / 显式 verbatim instructions）到机制约束（`pre_generated` 文本不进模型）；换模型后 prompt 约束漂移实证 by instruction 的脆弱；配套"能用机制绝不用 prompt"原则表与协议级开关

- **来源**：[[Voice Live系列09：脚本朗读的机制化——pre_generated绕过模型推理、宿主模型与代码、prompt、voice三层分工]]
- **首次出现**：2026-09-30
- **最近更新**：2026-10-02
- **置信度**：0.85（gpt-4o → gpt-5-mini 切换后真实会话中读题被改写 / 编题；`pre_generated` 实测 `input_tokens: 0`）
- **状态**：active

> 本决策在 Realtime 协议层的第二个落地点（第一个是 09-25 的 judge / speaker 分离）：题库驱动场景里读题经模型复述后被改写、甚至被替换成模型自己编的一道题——根因是**读题仍是一次模型推理**（每个 `response.create` 都是一次"想"，模型看到的是整段对话历史，到中后段按惯性做了面试官该做的事），而 "verbatim" 是 prompt 约束，它在**求**模型照读，gpt-4o 听劝、gpt-5-mini 不一定。三代路径：第一代 `conversation.item.create(role=assistant)` + 裸 `response.create` 是隐式 prompt 约束；第二代 per-turn `instructions` "say ONLY this, verbatim" 是显式 prompt 约束，可以长期稳定、换模型就漂；第三代 `response.create` 带 `pre_generated_assistant_message` 是**机制约束**——服务端对给定文本直接 TTS、跳过模型推理，"不许改写"从对模型的要求变成协议上做不到的事（by construction）。因区域原生模型限制切换模型时读法若不重验，这个现象会直接出现在真实会话里——这是"by instruction 随模型而变"的直接证据。配套原则表（要保证的事 → 用什么保证 → 为什么不用 prompt）：题目原文一字不差→`pre_generated`（prompt verbatim 实测会漂）；不插话→`create_response=false`（单个布尔比"请勿打断"可靠）；不追问不纠偏→judge verdict 集合只有 `(wait, nudge)`，`follow_up` / `redirect` 直接不认（模型再想追问也发不出来）；nudge 不变相提问→服务端疑问句守卫（prompt 里"不要问问题"是软约束）；不泄露评分→judge prompt 不放 rubric 再加泄露守卫（模型看不见的东西无从泄露）；什么时候说→后端状态机 + 页面时序（时序不该交给模型判断）；**说什么字**（用词、耐心、是否致谢）→prompt，这才是它擅长的且只影响模型生成的文本；**怎么发声**→`session.voice` 会话参数，prompt 碰不到语音层。决策清单五问：内容谁定（后端定用 `pre_generated`，必须现场生成才让它"想"且优先在后端 LLM 生成成文本再 TTS）/ 时机谁定（页面或状态机用事件与计时器，不依赖 `create_response=true`）/ 有没有不该说的（写成代码守卫，prompt 只是第一道网）/ 怎么证明说对了（抓 WS 帧断言发出的文本与转写等于期望）/ 调的是字还是声。

## 关联概念

- [[code-reuse-in-agent-era]] — `grounds` 问题定义
- [[harness-engineering]] — `uses` CLAUDE.md 约束是 Harness 的核心

## 关联方法

- [[code-reuse-four-layer-defense]] — `produces` 此决策的实施方法

## 来源

- [[Vibe Coding系列07：Coding Agent时代的代码复用——从架构约束到Plugin协作的实践指南|Vibe Coding系列07]] — 代码复用问题深度分析
- [[Voice Live系列09：脚本朗读的机制化——pre_generated绕过模型推理、宿主模型与代码、prompt、voice三层分工]] — 读题三代路径（prompt 约束→机制约束）、代码与 prompt 分工原则表、决策清单五问
