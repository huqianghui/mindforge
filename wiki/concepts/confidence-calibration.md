---
title: "置信度校准（Confidence Calibration）"
created: "2026-09-28"
updated: "2026-09-28"
tags:
  - wiki
  - concept
  - evaluation
  - decision-model
  - finops
aliases:
  - "calibration"
  - "校准"
  - "RLCD"
  - "Reinforcement Learning for Calibrated Decisions"
  - "可靠性表"
  - "reliability diagram"
related:
  - "[[system-one-model]]"
  - "[[cost-per-task]]"
  - "[[harness-quality-gate]]"
  - "[[llm-as-a-judge]]"
  - "[[generation-evaluation-separation]]"
  - "[[reinforcement-learning]]"
---

# 置信度校准（Confidence Calibration）

## 摘要

校准回答的问题是：**模型说 0.9 时，是否真的大约九成对**。它不是模型对自己的一种感觉，而是一种**统计关系**——必须相对于某个"结果"来定义，在整个样本分布上才出现（单条样本上模型永远不知道自己对不对）。工程上用可靠性表（按 confidence 分桶，看每桶实际正确率是否与桶中心一致）来检验；训练上用 proper scoring rule（log loss、Brier score）对大量样本优化——数学上最小化这类损失的唯一办法就是报告真实概率，报 0.99 而实际九成对会被惩罚。传统机器学习的 temperature scaling / Platt scaling / isotonic regression 是针对固定任务固定数据集的事后校准；LLM 的 next-token logit 从未被当作决策概率训练过，且 RLHF 已知会破坏校准（GPT-4 技术报告），让 LLM 在 JSON 里写一个 `"confidence": 0.97` 没有任何训练目标约束它与正确率对应。

校准之所以进入 agent 与 FinOps 讨论，是因为它把 [[cost-per-task]] 公式的第二项"人工验证成本"再拆了一层：一个模型 95% 正确却说不出哪 5% 错，人只能复核 100%；若能可靠标出低置信部分，验证成本降到"复核被标记的 5% 加抽检"，迁栏阈值随之更容易满足。TypeSafe 的 RLCD（Reinforcement Learning for Calibrated Decisions）把校准作为训练目标内建进 [[system-one-model]]，但其参照物是前沿模型的概率分布而非真实结果——所以校准永远是**相对某个参照物**成立，"参照物是否为真"留给拥有结果标签的使用方，这就是企业侧必须做第二层校准的原因。

## Claims

### Claim: 校准是相对参照物的统计性质——proper scoring rule 在群体上让"报告真实概率"成为唯一最优，单条样本上不存在"自信"

- **来源**：[[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.8
- **状态**：active

> "训模型对答案的自信"与"和结果对比"不是两条路——前者是通过后者在群体上实现的。用 log loss / Brier score 对大量样本优化，最小化损失的唯一办法就是报告真实概率；报 0.99 而实际只有九成对会被惩罚，报 0.9 才最优。所以问题从来不是"训自信还是比 ground truth"，而是"拿什么当结果来比"。同一句 "I don't want this subscription" 的真实结果只有一个（cancellation），但正确的概率不是 1.0，因为相似句子里有一部分其实是要退款——校准的对象是"大量相似样本的频率"，单个硬标签给不出概率。（经典统计结论，文章为讨论整理，与公开资料一致）

### Claim: RLCD 当前的参照物是前沿模型的概率分布而非真实结果——数学上接近软标签蒸馏，Jev 精确继承 teacher 的校准或偏差

- **来源**：[[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.75
- **状态**：active

> TypeSafe 公开做法：假设 workflow 本身正确，用最大最贵的外部前沿模型（公开提到 GPT-6 Astra 与 Claude Fable 5.1）对同一问题给出的概率取平均作 reference，训练 Jev 逼近 reference 而不是输出 cancellation=0.99。所以 RLCD 学到的是"对这类 workflow 决策，什么分布与高质量参考判断一致"，没学到"宇宙真理"：它解决"模型的不确定性是否有意义"，没解决"这个决策本身是否正确"——参考分布错了，Jev 会校准地跟着错；TypeSafe 自己承认 benchmark 因此偏向 OpenAI/Anthropic 模型。不直接用真实结果的两个原因：① 覆盖——问题由调用方运行时定义任意 schema，不可能事先有带结果标注，前沿模型是唯一能对任意问题给分布的信号源；② 单硬标签给不出概率，前沿模型的分布替代了"对大量相似样本求频率"那一步。Jev 独立输出的 confidence 训练目标未公开，合理推断类似 selective prediction（预测"这次答案与参考一致的概率"），同样以参考分布为准。RLCD 与 RLHF 的区别在问的问题（RLHF 问 A/B 哪个好不问概率；RLCD 只问概率）；与 RLVR 的区别在信号来源（RLVR 要可执行验证器，RLCD 只要可信参考分布——覆盖更宽、正确性保证更弱）。

### Claim: probability 与 confidence 是两个量——分布可以很尖但 confidence 很低；后者让"不知道自己不知道却继续执行"第一次有可读信号

- **来源**：[[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.75
- **状态**：active

> probability 回答"在这个答案空间里各选项的相对可能性"，confidence 回答"我对这次判断整体有多确定"。Case A：cancel 0.95 / confidence 0.97 → 明确；Case B：cancel 0.55, refund 0.40 / confidence 0.42 → 模型在说不确定。输入本身模糊或超出训练分布时分布可以尖而 confidence 低。Workflow 需要的正是第二个量。实践佐证（Computer Use 系列八）：Jev 单步返回 `choice: a0, confidence 0.96, probabilities {a0 0.97, a2 0.02, …}`，可按 confidence 做门控与交回；但该文同时明确 "confidence 不是正确率，`min_confidence: 0.4` 是拍脑袋值，尚未用结果标签校准"——正是本页下一条 Claim 所说的应用层校准缺位。

### Claim: 企业落地是两层校准加一层业务策略——模型层校准（RLCD）不能替代应用层校准；阈值从可靠性表反推并带上错误成本

- **来源**：[[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.7
- **状态**：active

> 绝不能从"Jev 说 0.97"跳到"生产是安全的"。可靠性表示例：0.90~1.00 桶 20,000 样本实际正确率 94% 是校准；同桶实际 71% 是严重过度自信，阈值 0.95 自动执行会大量出错——只有前者成立 confidence 才有资格作自动化阈值信号。验证校准的前提是**结果标签**：七字段 `input · prediction · confidence · calibrated probability · decision · human override · final outcome`，只有预测没有结果的历史只能观察模型行为不能验证校准（与 [[cost-per-task]] 的任务级七字段是同一套东西的两面：那边算成本，这边算校准）。阈值 `if confidence >= 0.98` 里的 0.98 从可靠性表反推，且策略函数至少三个输入——校准后概率、错误成本、人工复核成本（同一个 0.99，自动推荐 FAQ 够用，自动删生产库不行）——这是 FinOps 迁栏阈值在单条决策上的形态。校准函数应条件化 `P(correct | task, confidence, customer_segment, state)`（同样 0.95：意图识别 97% 对、欺诈判断 89%、法律风险 71%），并需持续监测漂移与定期重校准（2025 客群验证过的 0.95 不保证 2026 新客群成立）——做到位已接近一个 AI 控制平面。

### Claim: 验证 → 校准 → 后训练顺序不能反；bad-case 挖掘而非全量塞数据；企业自己的"决策 + 结果"标签可构造比前沿共识更好的 RLCD 信号

- **来源**：[[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.65
- **状态**：active

> 三层次：Validation（验证 confidence 与实际正确率匹配，不改模型，先）→ Calibration（训一个小校准模型把 raw confidence 映射成真实业务概率，输入可含任务类型/客群/元数据，通常不改模型，再）→ Post-training（让模型学企业决策模式，改模型，最后；分领域 SFT / RLCD 式校准训练把过度自信的 0.95 压到与结果一致的 0.75 / 策略学习三种）。连"0.95 在我的业务里意味着什么"都没验证清楚就微调，会把问题藏起来。更聪明的做法是错误与分歧挖掘：从历史找 bad case（人工覆写、低置信却对、高置信却错）分送训练与校准，评估后影子部署，再从生产收新 bad case——与 [[skillopt]]、APO 的 bad-case mining 同一循环，优化对象从 skill 文本换成决策模型 + confidence + workflow 策略（[[data-flywheel]] 中圈在决策模型上的具体形态）。数据授权边界：TypeSafe 默认不用用户输入训练，"把历史数据给它就自动变聪明"不成立。反向判断：企业自己的"历史决策 + 最终结果"在标签质量与覆盖足够时，是比"前沿模型共识"更好的 RLCD 信号（参照物换成真实结果），若 System One 类模型进入垂直场景这可能是核心护城河，且属于拥有结果标签的企业而非模型供给方。（推论性判断，置信度中等）

### Claim: 校准把 FinOps 人工验证项从"复核 100%"降到"复核被标记部分加抽检"——是成功率之外评估环节应追踪的第二个模型侧指标

- **来源**：[[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]]、[[FinOps系列03：落地提纲——从使用洞见到优化、监控、评估闭环（活文档）]]
- **首次出现**：2026-09-26
- **最近更新**：2026-09-28
- **置信度**：0.7
- **状态**：active

> 演讲原话："如果一个模型在某任务上 95% 正确，却说不出自己什么时候处于那 5%，这个任务就无法自动化。"这把公式第二项再拆一层：右栏人工验证居高不下不只因成功率不到 100%，更因模型不提供校准过的置信度，人只能复核全部。机制本身不依赖任何特定产品；Jev 是否真正做到是待核实项。落地含义（系列 03）：若成立，`verify_minutes` 字段应按"被标记 / 未标记"分开记录；主流 LLM 的置信度输出是否可用、决策模型在真实右栏任务上的校准质量均待核实。

## 冲突与演进

- 2026-09-28：建页。触发：Jev 文深度定义（2.4 节校准参照物、3.2 可靠性表、四节两层校准）+ FinOps 系列 02/03 以"置信度校准降低验证成本"为机制引用 + Computer Use 系列八实践中"confidence 不是正确率、阈值未校准"的边界——四篇跨 product / Notes/FinOps / Notes/AI 三个目录。RLCD 不独立建页，作本页与 [[system-one-model]] 的别名与 Claims（单一供应商训练目标，机制归校准）。
- 与 [[llm-as-a-judge]] 的"Human 校准锚点"、[[reward-design-three-inputs]] 的"盲选校准 ≥85% 一致率"是同族：那两处校准的对象是评估器与人的一致性，本页校准的对象是模型自报置信度与真实正确率的一致性。

## 关联概念

- [[cost-per-task]] — `grounds` 校准是"人工验证成本"项能从复核 100% 降到复核被标记部分的机制，直接改变迁栏阈值的可达性
- [[harness-quality-gate]] — `grounds` 门控阈值只有在校准成立时才是有意义的信号；阈值策略至少三个输入（校准后概率、错误成本、复核成本）
- [[generation-evaluation-separation]] — `extends` 校准把"评估"从判对错细化到"判断自己判对的概率"；结果标签回流是评估侧独立于生成侧的数据前提
- [[reinforcement-learning]] — `extends` RLCD 是 RLHF / RLVR 之外的第三条训练目标：优化对象从人类偏好 / 可验证正确性换成校准过的概率分布

## 来源日记

- [[2026-09-26-周六]] — FinOps 系列 02 补充 TypeSafe 演讲出处与"95% 正确但说不出哪 5%"→校准降低验证成本机制
- [[2026-09-27-周日]] — 主任务"熟悉和使用 Jev 模型"：TypeSafe Jev 文成文（RLCD 参照物、两层校准、验证→校准→后训练顺序）
- [[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]] — 第二节 RLCD 三对照与 2.4 校准参照物、第三节可靠性表、第四节企业两层校准
- [[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]] — 第五节校准进入 FinOps 账本的方式
- [[FinOps系列03：落地提纲——从使用洞见到优化、监控、评估闭环（活文档）]] — 置信度校准待核实项与 verify_minutes 分记
- [[Computer Use与Browser Use系列八：Jev×Codex实践——把动作判断交给System One模型的受控对照、费用账与skill优先级结论]] — confidence 门控实测形态与"阈值未校准"边界
