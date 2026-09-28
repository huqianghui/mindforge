---
title: "System One 模型（Typed Decision 决策原语）"
created: "2026-09-28"
updated: "2026-09-28"
tags:
  - wiki
  - concept
  - decision-model
  - agent-harness
  - model-routing
aliases:
  - "System One Model"
  - "typed decision"
  - "决策模型"
  - "Jev"
  - "TypeSafe Jev"
  - "决策原语"
related:
  - "[[confidence-calibration]]"
  - "[[generation-evaluation-separation]]"
  - "[[llm-as-a-judge]]"
  - "[[model-routing]]"
  - "[[computer-use]]"
  - "[[harness-quality-gate]]"
  - "[[decision-policy-executor-split]]"
---

# System One 模型（Typed Decision 决策原语）

## 摘要

System One 模型是一类**不生成文本、只对调用方运行时声明的问题返回类型化决策**的模型：输出的基本单位从 token 换成 typed decision——目前三种原语 Choice（从固定选项中选）、Score（打分）、Noul（是或否），每个问题直接给出一个概率分布和一个 confidence，多个问题在同一次前向里并行给出。名字借自 Kahneman 的 System 1/2：现有 LLM（长思维链、多秒级、面向人的文字）全部落在 System 2 一侧，而软件里绝大多数决策（这条消息是不是垃圾、下一步调哪个工具、这个请求属哪类）要的是一个快速的 System 1 答案。它不是"不思考、智力低"，也不是"更小的 LLM"，改变的是计算形式。

该类别目前由 TypeSafe AI 定义，首款产品 Jev（2026-09-15 发布，取自经济学家 Jevons，训练目标 RLCD，见 [[confidence-calibration]]），"System One Model"尚未成为社区共识，架构细节未公开；但"把不确定性变成软件可消费的一等公民"这个方向对 agent 与 harness 的意义是实在的——传统 agent 最大的问题不是不知道答案，而是不知道自己不知道却继续执行。它与 reasoning 模型是**组合而非替代**：System One 做快速的分类、打分、路由、门控层，少量困难或开放式 case 交给 reasoning 模型，让这次交接干净的正是 confidence 阈值——这是 [[generation-evaluation-separation]]"生成归 LLM、判断该不该执行归专门决策层"的模型级形态。vault 内两处实践（Computer Use 动作判断、Codex 模型与 effort 路由）的共同分工见方法页 [[decision-policy-executor-split]]。

## Claims

### Claim: 准确的说法不是"把 decoding 并行化"，而是输出原语从 token 换成 typed decision——由此几个性质是构造上成立的

- **来源**：[[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.75
- **状态**：active

> 传统 LLM 输出 `P(y1|x), P(y2|x,y1), …` 天然串行；套上 JSON Schema / Structured Output 只改最终格式约束，模型仍逐 token 生成字符串再由程序解析校验取值。Jev 让调用方先声明问题与答案空间，模型对每个问题直接输出分布 + confidence（示例：`sky_color → Choice(blue, gray, …)` 返回 `{gray 0.61, green 0.27, …} confidence 0.83`）。构造上成立的性质：不会输出 schema 之外的值（TypeSafe 报告结构化输出错误率为零）；不生成解释、代码、理由；多加一个问题几乎不增加延迟，只多付问题本身的 token。宣称数字位置：输入每十亿 token $42、输出不计费、端到端 70~500ms、相对前沿模型数十到数百倍速度/成本优势——来自其自建 workflow benchmark，参考模型场景自选，且承认无法证明定价无补贴，只能当方向性信号。输入目前仅文本与结构化状态，不支持图像。

### Claim: 与 reasoning 模型八维对照——关系是组合而非替代，confidence 阈值是交接点

- **来源**：[[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.75
- **状态**：active

> 八维：输出单位（token 序列可含思维链 vs 分布 + confidence）、计算形式（自回归、测试时算力随推理长度增长 vs 一次前向并行多决策）、输出空间（开放由模型生成 vs 封闭由调用方运行时声明）、解释性（有 rationale vs 只有概率）、延迟（秒到分钟 vs 报告 70~500ms）、适用位置（开放式生成/多步推理/需向人解释 vs 程序里的 if/switch/路由/打分/门控）、训练目标（RLHF/RLVR vs RLCD）、输入模态（多模态 vs 文本与结构化状态）。DataCamp 概括：Jev 做快速的分类/打分/路由层，少量困难 case 交 reasoning 模型，confidence 阈值让交接干净。

### Claim: 为什么不是"LLM 换一个分类头"——四件事：运行时答案空间、原生并行多问题、校准拿不到、去自回归即去测试时算力

- **来源**：[[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.7
- **状态**：active

> 速度提升的大头确实来自去掉自回归，业界也在做（Turing Post 把 Jev 定位为分类/校准/选择性预测研究线的重新组合并列出开源类 Jev 项目）。但差四件事：① softmax 头标签空间训练时定死，Jev 要回答现场给出的任意 Choice/Score——LLM 现成办法是约束解码只走一步读选项 logit，可单次前向但选项多 token 要拼概率、选项顺序与字面带位置/词面偏差、这些 logit 从未被当决策概率训练；干净做法需把选项编码进模型让决策作 query 去 attend 状态表示，已是输出侧改架构；② 同一状态问十个问题 LLM 要串行或十次前向，parallel sampler 把"一次前向 N 个决策"做成原生；③ **最关键**：LLM logit 对决策没校准过且 RLHF 破坏校准，接分类头用交叉熵在硬标签上微调得到典型过度自信分类器——分类头解决延迟，RLCD 解决"0.9 是否真九成对"，两者分开；④ 思维链是把推理展开成序列长度换算力，单次前向必须把全部推断压进一次前向，对 System 1 类任务够用，对多步推理不够——不是免费加速而是明确边界。前沿厂商部分做了（logprobs、Structured Outputs、moderation 分类模型），但生成文本是它们的产品，按决策计价的小模型是另一门生意。

### Claim: 企业今天就能搭简版验证"决策层单独拆出来"是否成立——LLM 约束单步解码读选项 logit + 自有标签 temperature scaling，固定任务可直接微调 encoder

- **来源**：[[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.65
- **状态**：active

> 简版与 Jev 的差距就是上一条的四件事：跨运行时 schema 的通用性、原生并行多问题、训练内建的校准、未公开的架构细节。它的实际意义是：在决定是否依赖一个新供应商之前，以最低成本验证"把决策层从生成层拆出来"这条路在自己业务上是否成立。与传统分类器的四维差别（任务与标签固定 vs 运行时声明；单模态单对象 vs 对话+档案+交易+规则拼接的状态需语言理解；一任务一分布 vs 多问题并行程序分支；交叉熵常伴过度自信 vs 校准即训练目标 + 独立 confidence）说明这是 ML 分类器的谱系延伸而非断裂。（作者建议，未在 vault 内实践）

### Claim: 实践位置——UI 动作判断与模型/effort 路由；Jev 只判断不执行、不看图、不授权，确定性代码守边界

- **来源**：[[Computer Use与Browser Use系列八：Jev×Codex实践——把动作判断交给System One模型的受控对照、费用账与skill优先级结论]]、[[Codex Desktop系列07：用Jev做Auto模型与推理强度路由——七模型与effort的判断设计、与规则匹配和轻量LLM路由的区别、性能准确缓存的平衡]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.75
- **状态**：active

> 两个实践共同点：Jev 给 typed 判断与置信度，确定性代码守边界（阈值、兼容性、兜底、锁、验收），执行由 LLM 或执行器完成——两文互相注明"分工同构"。Computer Use 侧：API `POST /v1/systemone`（`jev-1.13.0`）不接受截图、不能替换 Codex 背后的通用模型；装了官方 `typesafe-ai` skill 不等于每步 UI 决策都经过 Jev（skill 只是调用指导），真正接管循环的是开源执行器（`browser-use/jev-ultrafast` 读 DOM 一次请求同时选动作与目标；`awlevin/typesafe-computer-use` OCR + 辅助功能树多个 Choice）；"事后询问"接法（Codex 已决定再问 Jev 一次）纯增加请求只会更慢，"接管循环"（观察→元素编号表交 Jev 选→执行→重观察，需填文字才调 writer）才是提速来源。Codex 路由侧：Jev 一次 typed 判断回答四个独立问题（execution 28 组合 Choice / 任务需求 Choice / 高风险 Noul / 能力缺口 Noul），不回答、不调工具、不授权，不看图片、工具输出与代码库；近期文字发往 TypeSafe 需评估数据边界（对照轻量 LLM 路由器与执行模型同 Azure 租户数据不出户）。两处细节见 [[decision-policy-executor-split]] 与 [[computer-use]] / [[model-routing]] 页 Claims。

## 冲突与演进

- 2026-09-28：建页。"产品名不建页"先例（orca/cmux/Blender/Astra）不变——本页主语是 System One 模型这一类别及其 typed decision 原语，Jev / TypeSafe / RLCD 作别名；三篇（product 概念篇 + Computer Use 系列八 + Codex 系列07）跨三目录深度展开且互引。保留项（Jev 文自列）：架构未公开、输入仅文本、benchmark 自报且参考模型偏向两家厂商、定价可能含补贴——不妨碍理解概念，但妨碍现在就在高 stakes 决策上依赖它。
- 与 [[llm-as-a-judge]] 的关系是对照而非替代：judge 通过 LLM 生成文字（可给 rationale、可思维链、RLHF 校准差）做评估，System One 模型通过 typed decision（无理由、单次前向、校准是训练目标）做判断——同一"判断层"的两种实现。

## 关联概念

- [[confidence-calibration]] — `uses` System One 模型的可用性建立在校准之上：RLCD 是模型层校准，应用层校准由使用方补
- [[generation-evaluation-separation]] — `extends` "生成归 LLM、判断该不该执行归专门决策层"是分离原则从流程/角色层下沉到模型层：判断用不生成文本的模型来做
- [[llm-as-a-judge]] — `contrasts` 两种判断层实现：LLM 生成式评估（有 rationale、可推理、校准差、秒级）vs typed decision（无理由、单次前向、校准即训练目标、亚秒级）
- [[harness-quality-gate]] — `grounds` 为门控提供可读的不确定性信号（confidence + 候选概率），使"该不该执行"从布尔开关变成带阈值的策略

## 关联方法

- [[decision-policy-executor-split]] — `produces` 两个实践共同提炼的"typed 判断 / 确定性策略 / 执行"三分模式由本概念派生

## 来源日记

- [[2026-09-26-周六]] — FinOps 系列 02 确认 TypeSafe 演讲出处，注明其为 Jev 预热与讲者立场
- [[2026-09-27-周日]] — 主任务"熟悉和使用 Jev 模型"：概念篇 + 两篇实践篇成文，jev-router 代码随文提交
- [[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]] — 第一节 System One 与 reasoning 模型分界、1.5 为什么不是换分类头、第五节判断与保留
- [[Computer Use与Browser Use系列八：Jev×Codex实践——把动作判断交给System One模型的受控对照、费用账与skill优先级结论]] — API/skill/执行器三层分清、两种接法
- [[Codex Desktop系列07：用Jev做Auto模型与推理强度路由——七模型与effort的判断设计、与规则匹配和轻量LLM路由的区别、性能准确缓存的平衡]] — Jev 只判断的角色边界、四个 typed 问题
