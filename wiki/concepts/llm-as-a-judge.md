---
title: "LLM-as-a-Judge（三层正交评估模型）"
created: "2026-08-03"
updated: "2026-08-03"
tags:
  - wiki
  - concept
  - evaluation
  - llm-judge
  - reward-design
aliases:
  - "LLM Judge"
  - "Evaluator"
  - "评估器"
related:
  - "[[rubric]]"
  - "[[reward-design-three-inputs]]"
  - "[[generation-evaluation-separation]]"
  - "[[automatic-prompt-optimization]]"
---

# LLM-as-a-Judge（三层正交评估模型）

## 摘要

LLM-as-a-Judge 是用通用 LLM 充当评估裁判的方法，2024 年后成为开放式任务评估的主流。理解 evaluator 领域的钥匙是**三层正交模型**：Layer 1 Judge（谁来评：Human/Rule/Metric/LLM）× Layer 2 Strategy（怎么评：Pointwise/Pairwise/Listwise/Reference-based/Reference-free）× Layer 3 Criteria（评什么：Accuracy/Groundedness/Safety…，[[rubric]] 是其组织形式）——三层独立组合，绝大多数概念混乱来自把三层压成一层。

2025 年后研究重心从"怎么让 LLM 打分"转向 **Judge Reliability（打的分能不能信）**——position/verbosity/self-preference 等偏差与校准问题，直接决定评估信号能否进一步充当训练信号（reward）。

## Claims

### Claim: Evaluator 有三个正交维度——Judge（谁评）× Strategy（怎么评）× Criteria（评什么），不应压成一棵树

- **来源**：[[Evaluator概念全景——从rubric词源到Judge、Strategy、Criteria三层评估模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.7
- **状态**：active

> 换 Judge 不换标准（GPT judge 换人工，rubric 可不变）；同一 judge 既能 pointwise 也能 pairwise；换一套 rubric，同一 judge 就从客服评估器变成医疗评估器。很多 Survey 和产品文档把三层画成同一棵分类树，是概念混乱的根源。

### Claim: Judge 四种实现各有定位——Human 是校准锚点、Rule/Metric 零噪声优先、Reward Model 与 LLM Judge 边界正在收敛

- **来源**：[[Evaluator概念全景——从rubric词源到Judge、Strategy、Criteria三层评估模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.7
- **状态**：active

> Human 是黄金标准但贵且慢，定位是校准锚点而非日常工具（所有自动 judge 的终极指标是 Agreement with Humans）；能用确定性规则评的信号（格式、可执行性、精确匹配）永远优先用 Rule/Metric（零噪声，与 [[reward-design-three-inputs]] "确定性规则分白送零噪声信号"一致）；专训 reward model（PairRM/Prometheus）走向 rubric 化可解释化、通用 LLM judge 走向 RL 训练强化（J1），两条线在收敛。

### Claim: 产品层与研究层是两套话语——Rubric Evaluator = LLM Judge + Rubric + Prompt Template + Scoring Logic

- **来源**：[[Evaluator概念全景——从rubric词源到Judge、Strategy、Criteria三层评估模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.8
- **状态**：active

> 研究层（Survey 分类）把 Rubric-based 放在 LLM-as-a-Judge 之下（judge 的一种策略配置）；产品层（Azure AI Foundry）把 Rubric Evaluator 作为打包组件直接调用——内部就是 LLM judge 对加权维度逐维打 1~5 分并给理由，加权平均后归一化到 0~1，Foundry 把它作为 Agent 评估推荐主指标。两种画法都对，只是抽象层次不同。基于 Foundry 官方文档核对。

### Claim: Judge Reliability 八类偏差是 reward 噪声 σ_noise 的具体来源——研究重心已从"怎么打分"转向"分能不能信"

- **来源**：[[Evaluator概念全景——从rubric词源到Judge、Strategy、Criteria三层评估模型]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.7
- **状态**：active

> Consistency（同答案打十次漂移）、Position Bias、Verbosity Bias、Self-Preference（GPT 偏爱 GPT）、Style Bias、Prompt Sensitivity、Calibration 错位、Agreement with Humans——这张清单把 [[reward-design-three-inputs]] 里抽象的"judge 噪声 σ_noise"拆成可对症的病灶。评估噪声顺训练管道放大：APO 摆动第一大原因是评估噪声而非算法（见 [[automatic-prompt-optimization]]），"把 judge 做稳"（多次采样取均值、拆分维度、rubric 锚点）是评估和优化共同的地基。

### Claim: 评估策略与下游 Optimizer 有天然配对——选评估策略时就已经在选优化路线

- **来源**：[[从Evaluator到Reward-Function——评估信号如何变成APO与强化学习的训练信号]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.7
- **状态**：active

> Pointwise ↔ PPO/GRPO 的标量 reward；Pairwise ↔ DPO 的偏好对（人比较两个比给绝对分更稳，Chatbot Arena 用 Elo 的原因，但喂标量训练循环需 Bradley-Terry 转换）；Reference-based ↔ RLVR 的可验证 reward（有 GT 才有零噪声路线，无 GT 才需要 rubric + LLM judge 近似）。Reference-based/free 这条分界线直接决定下游优化技术选型。

## 冲突与演进

- 2026-08-03：概念篇 + 链路篇两篇成文，三层正交模型与 Judge Reliability 议题入库。ChatGPT 讨论中引用的 "RUBRIC-ARROW"、"C2" 两篇论文经核实不存在（幻觉引用），已替换为已核实论文（Survey 2411.15594 / 2411.16594 / 2412.05579 / 2507.21504 / MRRG 2607.01830）。

## 关联概念

- [[rubric]] — `uses` rubric 是 judge 的评分配置：维度+等级+锚点让打分从自由发挥变成一致可重复
- [[generation-evaluation-separation]] — `implements` judge（评估者）与被评估的生成者分离是该原则在评估层的体现；judge ≠ policy 是 reward hacking 第一道防线
- [[reward-design-three-inputs]] — `grounds` Reliability 偏差清单为该方法的 σ_noise 测量与降噪决策（拆分 judge、多次取中位数、≥85% 盲选一致率）提供依据
- [[automatic-prompt-optimization]] — `constrains` judge 噪声直接决定 APO beam search 排序的可信度，是摆动的第一大原因

## 来源日记

- [[2026-08-03-周一]] — rubric 与 evaluator 概念梳理主任务，概念篇 + 链路篇两篇成文
