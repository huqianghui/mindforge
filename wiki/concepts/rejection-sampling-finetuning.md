---
title: "拒绝采样微调（Rejection Sampling Fine-tuning / RAFT / STaR）"
created: "2026-06-29"
updated: "2026-07-07"
tags:
  - wiki
  - concept
  - llm-training
  - sft
  - rejection-sampling
  - raft
  - star
  - self-distillation
  - alignment
aliases:
  - "拒绝采样微调"
  - "Rejection Sampling Fine-tuning"
  - "RAFT"
  - "STaR"
  - "RFT"
  - "ReST"
related:
  - "[[automatic-prompt-optimization]]"
  - "[[reinforcement-learning]]"
  - "[[continual-self-improving-ai]]"
  - "[[generation-evaluation-separation]]"
  - "[[advantage-function]]"
---

# 拒绝采样微调（Rejection Sampling Fine-tuning / RAFT / STaR）

## 摘要

拒绝采样微调是一种"用 SFT 的机制做 RL 的事"的对齐/自提升方法：模型自己生成一批 rollout → 用 reward 过滤排序留高分轨迹 → 把这批"被验证正确的自产轨迹"当模仿标签做 SFT → 迭代。它的本质区别于教科书 SFT——教科书 SFT 需要现成的"标准输出序列"当 label 直接模仿；拒绝采样微调**没有现成 label，而是用 reward 当裁判，无中生有地造出原本缺失的训练标签**。理论出处是 RAFT（Reward rAnked FineTuning, 2023）与更早的推理域版本 STaR（Self-Taught Reasoner, 2022）。它消费和 RL 同样的三元组 `(prompt, response, reward)`，但 reward 只在门口"检票"（选哪些样本进训练集），不进梯度——这是它区别于 PPO 的本质。在 agent-lightning 里它是 method-agnostic 阶梯的中间档（[[automatic-prompt-optimization]] → 本方法 → [[reinforcement-learning]]）。社区里它以"rejection sampling fine-tuning（RFT）"之名成了 DeepSeek-R1 / Llama / Qwen 后训练 pipeline 的标准一档。

## Claims

### Claim: 不是"喂标准答案"，是"用 reward 造标签"——target 是评分键不是模仿 label

- **来源**：[[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]]
- **首次出现**：2026-06-26
- **最近更新**：2026-06-26
- **置信度**：0.9
- **状态**：active

> 最大的认知误区：以为 agent-lightning 的 SFT 是喂标准答案让模型模仿。真相是它**没有理想输出序列**——数据集只给"最终答案"（如 GSM-hard 的 `target = -9867630`）和一个 grader，不给"解题过程"。要区分两种 ground-truth：**任务的标准答案（评分键）**喂给 grader 算 reward（`math_agent.py:123` 用 `np.isclose` 精确匹配，干净无噪声）；**模型输出的标准答案（模仿 label）**则没有预先给。模型自己跑 rollout 生成 response → grader 用 target 验证为正确 → 把这些"经认证正确"的自产轨迹留下当 SFT 对。数据集自带的 `code` 解法字段从头到尾没被引用，是冗余死字段。一句话：**需要 ground-truth 来评分，不需要 ground-truth 来模仿。**

### Claim: "算法"内核还是一行 sorted——与 APO 对称，区别只在下游消费

- **来源**：[[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]]
- **首次出现**：2026-06-26
- **最近更新**：2026-07-06
- **置信度**：0.9
- **状态**：active

> SFT 这条线的"算法"内核是 `all_triplets.sort(key=lambda x: x["reward"], reverse=True)` + 切 top fraction（`sft_algorithm.py:294-295`，默认留 top 50%），与 APO 的 `sorted(...)[:beam_width]` 对称——同一套 sorted，区别只在 sort 完之后是「拿去微调」而非「选 prompt」。这是 method-agnostic 的兑现：同一份 grader/reward，APO 排序选 prompt、SFT 排序筛轨迹、RL 当梯度信号，grader 一行不改只换算法侧消费方式。**生产坑**：demo 只按比例切、不设 reward 阈值——若某轮所有 rollout 都答错（reward 全 0）照样取前 50%，等于拿 0 分垃圾做 SFT 把模型训得"更自信地答错"；正确做法是阈值过滤（只留 `reward > 0`）。

### Claim: 答对了为什么还训练——把 pass@k 压成 pass@1，把搜索成本内化进权重

- **来源**：[[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]]
- **首次出现**：2026-06-26
- **最近更新**：2026-06-26
- **置信度**：0.8
- **状态**：active

> "能答对 ≠ 稳定答对"。模型"答对"通常意味着 temperature>0 采样下跑 N 次碰巧有一次走到正确路径——它对正确解法只分配了一部分概率质量（如 20%）。自蒸馏不教新知识，而是把模型偶尔能找到的正确路径反复强化，让概率从 20% 提到 80%，把"偶然对"压成"稳定对"（pass@k → pass@1）。两层收益：① **best-of-N → greedy 内化**——推理本来要"采样 16 次 + grader 挑最好"才交对卷，自蒸馏把这能力烧进权重，单次 greedy 解码就能做到，本质是把推理期搜索成本预支到训练期；② **泛化**——强化好推理*模式*会迁移到没见过的题。诚实边界：已 pass@1 高置信答对的题训练收益接近 0；真正吃肉的是"时对时错"的题。为什么不能把答错的也训：SFT 数学本质是无条件最大化喂进去的东西的似然，喂错误轨迹=主动教它学错，reward 就是那道门。

### Claim: 自蒸馏 vs 强→弱蒸馏——区别只在 runner 配哪个模型跑 rollout

- **来源**：[[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]]
- **首次出现**：2026-06-26
- **最近更新**：2026-06-26
- **置信度**：0.8
- **状态**：active

> 因为 runner 的 rollout 模型与算法侧的训练目标模型解耦（生产者/消费者分离），同一套框架支持两种形态：**rollout 模型 == 被训模型** → 自我提升、自举 = STaR/RAFT/ReST（自蒸馏，扩充"已会题"的稳定性）；**更强模型跑 rollout、训更弱模型** → 强→弱知识转移 = 拒绝采样蒸馏（扩覆盖率，能教会学生本来不会的题）。弱模型的死穴是有些难题采样 N 次全错（0 条正确轨迹）→ 自蒸馏一无所获；换强模型去跑能产出这些难题的正确轨迹，target 在此验证强模型轨迹确实对（避免把老师的错误也蒸馏进去）。reward 来源两条路：有 ground-truth → 精确匹配 grader（客观零噪声，首选）；没有 → 强模型当 LLM-as-judge（主观有噪声，要防 reward hacking）。

### Claim: RAFT = RL 的数据哲学 + SFT 的更新机制，reward 只"检票"不进梯度

- **来源**：[[2026-06-28-RAFT-Reward-rAnked-FineTuning-论文解读]]
- **首次出现**：2026-06-28
- **最近更新**：2026-07-06
- **置信度**：0.9
- **状态**：active

> RAFT（Reward rAnked FineTuning, 2023, LMFlow 团队）是个对齐框架，目标和 RLHF 的 PPO 一样（让输出对齐某 reward），但用 SFT 方式实现而非策略梯度。三步迭代：Sample（从当前模型采一批）→ Rank/Filter（用 reward 过滤出高分子集）→ Fine-tune（在子集上 SFT）→ 重复直到收敛。相对 PPO 的卖点：更稳更鲁棒（无训练不稳定、不需要 value model/critic）、超参少好调（几乎只有 K 和温度 λ）、数据生成与模型更新解耦（可并行缓存分布式）。本质分界：reward 在 RAFT 里只做**接受/拒绝的过滤阈值**，选完即弃、无信用分配、纯 CE loss 无 reward 项、不用负样本；PPO 里 reward 是嵌进梯度的学习信号（算 advantage 逐 token 缩放梯度、用负样本）。补一档连成光谱：**RAFT（硬 0/1 选择）→ RWR（reward 当软权重）→ PPO（reward 经 advantage 进每步梯度）**，越往右 reward 越走进梯度核心。STaR（2022）是它的推理域前身——二值 reward + 带 rationalization 兜底（失败题给答案当 hint 反向造 rationale）。

### Claim: demo 把 RAFT 退化成 K=1 greedy 二值 reward 非累积版，丢了"K 大→收敛快"红利

- **来源**：[[2026-06-28-RAFT-Reward-rAnked-FineTuning-论文解读]]
- **首次出现**：2026-06-28
- **最近更新**：2026-06-28
- **置信度**：0.8
- **状态**：active

> 论文用 K∈{8,16,32} + 温度 λ=1.0，K 大收敛快（K=16/32 约 10~12 轮，K=8 约 15~18 轮）。但 agent-lightning demo 把 RAFT 退化成最朴素版本：① **K=1 + temperature=0（greedy）**——每题只采一次，退化成 pass@1，没有 RAFT 赖以工作的采样多样性；② **二值 reward**——`compute_reward` 返回 0/1，sort 几乎没用（留下全是 1.0），更像 STaR 而非用 reward model 的 RAFT；③ **非累积**——每轮空列表重建，不像论文可累积扩充数据集。这解释了实测的"慢爬"：退化成 K=1 greedy 只能一阶一阶收割"贪心路径刚翻对"的题。要复现论文曲线就得把 K 拧上去（temp 0.7~1.0 + 每题采 K 次）——采样数才是数据增长主杠杆。`K` 来自重复采样次数不是温度，温度只负责让这 K 次分叉。

### Claim: 对已后训练的强模型仍适用，但受自蒸馏天花板约束（pass@k）

- **来源**：[[2026-06-28-RAFT-Reward-rAnked-FineTuning-论文解读]]
- **首次出现**：2026-06-28
- **最近更新**：2026-06-28
- **置信度**：0.8
- **状态**：active

> 对已重度后训练的 GPT/Llama/Qwen，RAFT 从"首次对齐"降级为"任务特化 + 自我提升的一道工序"。唯一硬条件是 **pass@k>0**（模型得偶尔做对），强模型 pass@k 更高 → 可收割的正确轨迹更多。天花板 = 基座 pass@k：训练数据全来自模型自产正确轨迹，只能放大已会的、教不会全新能力，模型越强 headroom 越小；同时要警惕在自产同质数据上反复训导致的**多样性塌缩**（RAFT 论文专门盯 distinct/unique/msttr 多样性指标）。社区现状：以"rejection sampling fine-tuning（RFT）"之名成了现代后训练标准组件——Llama 2/3 RLHF 含这一步、DeepSeek-R1 在 RL 训完后专门加一道 rejection sampling 自我精炼、Qwen3 多阶段后训练也用。定位是"便宜、稳定的第一档，上 RL 之前先榨一轮"。

## 冲突与演进

- 2026-06-26：从 agent-lightning 源码逐行剖析 SFT 路线，确立"用 reward 造标签"、自蒸馏 vs 强→弱蒸馏、与 RL 的场景边界。
- 2026-06-28：回到 RAFT/STaR 原始 paper，确认代码骨架的理论出处，定位 reward"只检票不进梯度"是区别 PPO 的本质，诊断 demo 退化成 K=1 greedy 是慢爬根因。

## 关联概念

- [[agent-lightning]] — `part-of` SFT/RAFT 走 agent-lightning 自定义算法扩展点，是 APO→SFT→RL 三级阶梯的第二级
- [[method-agnostic]] — `part-of` SFT/RAFT 是 method-agnostic 三级阶梯中档（用 reward 筛轨迹做微调、改权重），与 APO 共享同一 reward
- [[automatic-prompt-optimization]] — `contrasts` 同属 agent-lightning method-agnostic 阶梯，APO 用 reward 排序选 prompt（不动权重）、本方法用 reward 筛轨迹做微调（改权重），sorted 内核对称
- [[reinforcement-learning]] — `contrasts` RAFT 是"RL 的数据哲学 + SFT 的更新机制"，reward 只过滤不进梯度；SFT 飞轮到顶/要压榨负例/reward 有程度/难题 0 正样本时该升级到 RL
- [[continual-self-improving-ai]] — `implements` 自蒸馏/ReST 是模型自举式持续自我提升的具体训练机制
- [[generation-evaluation-separation]] — `uses` grader（评分）与 model（生成）分离，reward 作为独立裁判筛选自产轨迹
- [[bitter-lesson]] — `grounds` 用采样+算力换训练数据、自动 reward 替代人工标注，呼应算力终将胜出
- [[skillopt]] — `contrasts` 同属拒绝采样谱系"打分筛选、只留改进"，RAFT 筛样本、SkillOpt 筛编辑
- [[advantage-function]] — `contrasts` RAFT 的 reward 只当接受/拒绝阈值（无基线、选完即弃），在 reward 用法光谱最左；advantage 在最右（减基线进梯度）
- [[prompt-optimization-tool-selection]] — `contrasts` "是否走向权重微调（SFT/RL）"是该决策的关键前提

## 来源日记

- [[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]] — reward 造标签、target 是评分键、自蒸馏 vs 蒸馏、SFT vs RL 场景边界、工具调用 SFT、单轮 vs 多轮记录
- [[2026-06-28-RAFT-Reward-rAnked-FineTuning-论文解读]] — RAFT 三步框架、reward 只检票、RAFT vs STaR、demo 退化诊断、社区现状
- [[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]] — 实战跑通、动态飞轮实验、K=1 慢爬复盘
