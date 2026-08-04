---
title: "Rubric（评分细则）"
created: "2026-08-03"
updated: "2026-08-03"
tags:
  - wiki
  - concept
  - evaluation
  - rubric
  - reward-design
aliases:
  - "评分细则"
  - "Rubric as Reward"
  - "评分量规"
related:
  - "[[llm-as-a-judge]]"
  - "[[reward-design-three-inputs]]"
  - "[[generation-evaluation-separation]]"
---

# Rubric（评分细则）

## 摘要

Rubric（评分细则）是评估体系中"评什么、怎么给分"的结构化定义：**维度（criteria）+ 等级（levels）+ 锚点描述（descriptors）** 三件套，把打分从自由发挥变成一致可重复的操作。词源自拉丁语 ruber（红色）——中世纪手抄本用红字标注章节标题与操作指令，引申为"权威的规则条目"，现代教育测量学借它指评分量规。

在 [[llm-as-a-judge]] 三层模型中，rubric 属于 Layer 3 Criteria 的组织形式——它是 judge 的**配置**而非 judge 本身：同一个 GPT judge 换一套 rubric，就从客服评估器变成医疗评估器。2025 年后 "Rubric as Reward" 成为趋势线：rubric 从评估报表工具进入 RL 训练循环，成为 reward 的直接来源。

## Claims

### Claim: Rubric 词源 ruber→rubrica→红字标题→评分细则——"红字"隐喻权威规则，读音 /ˈruː.brɪk/

- **来源**：[[Evaluator概念全景——从rubric词源到Judge、Strategy、Criteria三层评估模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.8
- **状态**：active

> 拉丁语 ruber（红）→ rubrica（红土/红墨水）→ 中世纪手抄本红字章节标题与礼仪指令 → "权威规则条目" → 教育测量学的评分量规。注意读音 /ˈruː.brɪk/（"鲁-brick"）而非 "rub-rick"；组合词中作名词定语（noun adjunct），如 rubric-based evaluation、rubric reward。

### Claim: Rubric ⊃ Criteria——维度+等级+锚点描述的完整体系，价值在把打分变成可执行可重复的操作

- **来源**：[[Evaluator概念全景——从rubric词源到Judge、Strategy、Criteria三层评估模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.7
- **状态**：active

> Criteria 只回答"评哪些维度"（如 accuracy、groundedness）；rubric 在此之上补齐"每个维度分几档、每档长什么样"（等级 levels + 锚点描述 descriptors，如"5 分=引用全部关键事实且无捏造；3 分=有遗漏但无捏造…"）。锚点是一致性的来源——没有锚点的打分是自由发挥，人评和 LLM judge 都会漂移。

### Claim: Rubric 是 judge 的配置而非 judge 本身——换 rubric 即得到不同评估器

- **来源**：[[Evaluator概念全景——从rubric词源到Judge、Strategy、Criteria三层评估模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.7
- **状态**：active

> 三层正交模型下 rubric 位于 Layer 3（评什么），与 Layer 1 Judge（谁评）独立：GPT-5 + 客服 rubric 和 GPT-5 + 医疗 rubric 是两个不同的评估器，judge 未变；反过来 GPT judge 换人工 judge，rubric 可原样复用。把 rubric 当成 judge 的一种（"rubric evaluator 是一种 judge"）是产品层打包话语，研究层它是配置项。

### Claim: Rubric as Reward 呈三阶段趋势线——从评估报表到进入训练循环再到 rubric 本身被优化

- **来源**：[[从Evaluator到Reward-Function——评估信号如何变成APO与强化学习的训练信号]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.7
- **状态**：active

> 阶段一：rubric 用于评估出报表（传统教育测量与 eval 平台用法）；阶段二：rubric 进 RL 训练循环充当 reward——RaR（Rubrics as Rewards, 2507.17746）、Rubric Anchors（2508.12790）、Dr Tulu（2511.19399）；阶段三：rubric 本身成为被生成/优化的对象——OpenRubrics（2510.07743）、Auto-Rubric（2510.17314）、MRRG 多角色 rubric 生成（2607.01830）。无 GT 的开放任务由此获得可扩展的 reward 路线，rubric 成为"数据+评估资产"的核心载体。

### Claim: Rubric 进训练循环带来 reward hacking 新形态——四类防御只提高 hack 难度，不消除（Goodhart）

- **来源**：[[从Evaluator到Reward-Function——评估信号如何变成APO与强化学习的训练信号]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.7
- **状态**：active

> Rubric 一旦成为 reward，policy 会学会"迎合 rubric 措辞"而非真正提升质量（关键词堆砌、格式表演、锚点边缘试探）。四类防御：① judge ≠ policy（[[generation-evaluation-separation]]，避免 self-preference 被 RL 放大）；② 确定性锚点掺入（可验证信号打底）；③ rubric 动态演化（定期改写防过拟合）；④ 盲选校准 + 锁版（与人工一致率 ≥85% 才上线，训练期锁定版本）。Goodhart's Law 决定这些手段只抬高 hack 成本，不能根除。

## 冲突与演进

- 2026-08-03：概念篇 + 链路篇两篇成文入库。趋势线论文均经核实（ChatGPT 讨论中的 "RUBRIC-ARROW"、"C2" 为幻觉引用，已剔除）。

## 关联概念

- [[llm-as-a-judge]] — `constrains` rubric 把 judge 打分从自由发挥约束成一致可重复：维度+等级+锚点是 judge 的评分配置
- [[reward-design-three-inputs]] — `grounds` "先修 judge rubric 再校准"决策点的操作对象就是 rubric；锚点质量直接决定 σ_noise 下限
- [[generation-evaluation-separation]] — `uses` rubric 进训练循环后，judge≠policy 分离是 reward hacking 的第一道防线

## 来源日记

- [[2026-08-03-周一]] — rubric 与 evaluator 概念梳理主任务，概念篇 + 链路篇两篇成文
