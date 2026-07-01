---
title: "自动提示优化（APO, Automatic Prompt Optimization）"
created: "2026-06-29"
updated: "2026-06-29"
tags:
  - wiki
  - concept
  - agent
  - prompt-optimization
  - apo
  - beam-search
  - textual-gradient
aliases:
  - "APO"
  - "Automatic Prompt Optimization"
  - "自动提示优化"
  - "文本梯度"
  - "Textual Gradient"
related:
  - "[[rejection-sampling-finetuning]]"
  - "[[generation-evaluation-separation]]"
  - "[[reinforcement-learning]]"
---

# 自动提示优化（APO, Automatic Prompt Optimization）

## 摘要

APO 是一种自动把 prompt 调优的完整优化方法，核心结构是「文本梯度（生成方向）+ beam search（搜索管理）」。它把神经网络训练的"方向+搜索"二分结构搬到离散不可微的 prompt 上：因为 prompt 无法求数值梯度，就让强 LLM 充当"梯度算子"（Critic）用自然语言诊断"哪里错、往哪改"，再让另一个 LLM（Editor）照批评改写——这套思路源自 ProTeGi（Pryzant et al. 2023）。beam search 只承担搜索管理（扩展→打分→剪枝 top-k），APO 选它的首要理由是评估成本：每个候选要在验证集上跑大量贵 rollout，beam_width 把指数爆炸压成线性，又比 greedy 多留缓冲对抗评估噪声。在 agent-lightning 里，APO 是 method-agnostic 阶梯的最低一档（不动权重、最便宜），与 [[rejection-sampling-finetuning]]（RAFT）、RL 共享同一份 grader/reward，只是消费方式不同——APO 用 `sorted()[:beam_width]` 排序选 prompt。

## Claims

### Claim: APO ≠ beam search——是「文本梯度 + beam search」的完整方法

- **来源**：[[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-25
- **置信度**：0.9
- **状态**：active

> 把 APO 等同于 beam search 是层级错位，等于把"梯度下降训练"等同于"Adam 优化器"。APO（Automatic Prompt Optimization）是完整优化方法，含两个本质不同的子机制：① **怎么产生更好候选**——靠文本梯度（Critic 诊断 + Editor 改写），这是生成机制；② **怎么在候选里挑、管理搜索过程**——靠 beam search（维护固定大小候选集，每轮扩展、打分、剪枝），这是搜索策略。beam search 本身不知道"prompt 怎么变好"，只负责"在已生成候选里按分数保留 top-k、决定下一轮从谁出发"。一句话：APO = 文本梯度（生成方向）+ beam search（搜索管理）。

### Claim: 文本梯度 = Critic 写、Editor 改，因 prompt 离散不可微而借 LLM 模拟方向信号

- **来源**：[[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-25
- **置信度**：0.85
- **状态**：active

> 一轮 APO 迭代有四个角色接力，对应神经网络训练：**Evaluator/Judge**（grader 的 model，给数值分，类比判分老师）→ **Critic/Teacher**（gradient_model，看低分轨迹写文本梯度＝自然语言诊断，类比写评语的导师）→ **Editor**（apply_edit_model，按批评改写出新候选，类比按评语改作文）→ **Beam Search**（无模型纯算法，选 top-k）。关键区分：Judge 给"分数"（标量）、Critic 给"方向"（文本），常被混为一谈。Critic 和 Editor 故意分两个模型：Critic 要强推理（诊断难，用更强模型）、Editor 只需会改写（机械，用便宜模型），分离后还能独立约束两个 prompt 注入点。文本梯度的优势是不仅说"错了"还说"为什么错、具体怎么改"——代价是每步都调强模型，比数值梯度贵几个数量级，所以才需要有预算约束的 beam search 控爆炸。

### Claim: APO 选 beam search 的首要理由是评估成本，不是它最优

- **来源**：[[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-25
- **置信度**：0.85
- **状态**：active

> 搜索策略谱系都在解"候选树里找最优节点"，区别在每层保留几个：greedy（留 1，易陷局部最优）、BFS（全留，O(b^d) 爆炸）、DFS（深挖一条，无明确终止深度）、beam search（top-k，O(k·b) 可控）、Tree-of-Thought（带 LLM 自评估，更贵）、Self-Consistency（正交降噪，可叠加）。APO 选 beam search 的首要理由是评估太贵——每个候选要在验证集跑大量 rollout，beam_width 把 BFS 的指数爆炸压成线性；又比 greedy（beam_width=1）多留缓冲，对抗评估噪声（同 prompt 打分可摆动 0.2）的 max-over-noise。进阶方向：把"等额评估+max 选择"升级为 bandit（UCB / Successive Rejects）的"自适应预算分配"，是对症"虚高候选"问题的统计学解药。

### Claim: 真正瓶颈是 reward 设计 + 评估噪声 + 数据量，不是选哪个框架

- **来源**：[[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]
- **首次出现**：2026-06-24
- **最近更新**：2026-06-24
- **置信度**：0.85
- **状态**：active

> 任何 prompt 优化工具（DSPy/TextGrad/AdalFlow/agent-lightning）都成立的核心教训：真正的瓶颈不是选哪个框架。① **评估噪声**——小数据集（如 29 题）标准误 `SE ≈ sqrt(p(1−p)/N) ≈ 0.09`，会盖过任何小于 0.18 的真实增益；② **reward 设计**——reward 若设错（如让 LLM 对离散任务输出连续 partial score），框架只会"忠实地优化一个噪声"；③ **数据量**——要可靠确认 Δ 提升需 `SE ≤ Δ/2`，想分辨 0.05 增益需 N≈350+，或用多采样 `SE/√k` 等效放大。落地顺序：先把评测集和 reward 做扎实（降噪、对齐真实目标），再谈用哪个优化器——否则只是在噪声里挑最大值。

## 冲突与演进

- 2026-06-24：从 Azure 实践三轮实跑提炼出"reward+噪声+数据量是真瓶颈"的工具无关教训。
- 2026-06-25：单开算法理论篇，厘清 APO≠beam search 的层级关系、文本梯度的 Critic→Editor 机制、beam search 在搜索谱系中的成本定位。

## 关联概念

- [[agent-lightning]] — `part-of` APO 是 agent-lightning `algorithm/` 槽位的内置算法（一等公民），三级阶梯第一级
- [[rejection-sampling-finetuning]] — `contrasts` 同属 agent-lightning method-agnostic 阶梯，APO 用 reward 排序选 prompt（不动权重）、RAFT 用 reward 筛轨迹做微调（改权重），共享同一份 grader
- [[skillopt]] — `contrasts` 同为文本空间优化，但 APO 优化一次性 prompt、无优化器纪律；SkillOpt 优化持久 skill artifact 且带 validation gate/bounded LR/rejected buffer/slow-meta 四块纪律
- [[generation-evaluation-separation]] — `uses` Judge 打分与 Critic 诊断/生成分离，是生成-评估分离原则的体现
- [[reinforcement-learning]] — `contrasts` APO 把 reward 用于离线 prompt 搜索，RL 把 reward 当梯度信号进 policy gradient
- [[bitter-lesson]] — `grounds` APO 是"用算力换 prompt 质量"的搜索方法，呼应算力终将胜出

## 来源日记

- [[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]] — reward/噪声/数据量是真瓶颈、工具对比
- [[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]] — APO≠beam search、文本梯度 Critic→Editor、搜索策略谱系对比
- [[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]] — beam search 内核、三参数三阶段、实践踩坑与噪声复盘
