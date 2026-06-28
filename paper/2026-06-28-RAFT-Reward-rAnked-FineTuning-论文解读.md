---
title: "论文阅读：RAFT（Reward rAnked FineTuning）——拒绝采样 SFT 的理论出处"
created: 2026-06-28
tags: [paper-reading, RAFT, STaR, rejection-sampling, SFT, RLHF, agent-lightning, alignment]
paper: "RAFT: Reward rAnked FineTuning for Generative Foundation Model Alignment"
authors: [Hanze Dong, Wei Xiong, 等（LMFlow 团队）]
source: https://arxiv.org/html/2304.06767v4
related: "[[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]]"
---

# 论文阅读：RAFT（Reward rAnked FineTuning）——拒绝采样 SFT 的理论出处

> 接 [[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]] 与 [[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]]：跑通 demo 后发现那段 SFT 代码（`reward>0` 过滤 + reward 排序 + while 迭代）骨架眼熟，本篇回到原始 paper，弄清这套「拒绝采样 SFT」的理论出处——RAFT（2023）与它的推理域前身 STaR（2022）。

## 〇、为什么读这篇

[[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]] §3.7 复盘动态飞轮实验时，反复撞到一个判断：agent-lightning 那条 SFT 线**不是普通监督微调，而是拒绝采样自训练**。它的三件套——采样、按 reward 过滤排序、在留下的样本上做 SFT 然后迭代——和某个有名字的方法高度同构。这个名字就是 **RAFT**，更早的推理域版本叫 **STaR**。读原始 paper 的目的有三：

1. 确认 agent-lightning 的代码骨架确实 = RAFT/STaR，不是巧合；
2. 弄清这套方法相对 PPO/RLHF 的**定位**（为什么是「SFT 机制 + RL 数据」）；
3. 把前面几轮关于 reward、采样、拒绝采样的零散讨论收敛成一个有出处的整体认知。

## 一、RAFT 的核心主张：用 SFT 的机制做 PPO 的事

**论文定位**：RAFT 是一个**对齐框架（alignment framework）**，目标和 RLHF 里的 PPO 一样——让生成模型的输出对齐某个 reward（人类偏好、任务正确性、审美等），但**用监督微调（SFT）的方式实现**，而非策略梯度。

**三步迭代框架**（论文原文 Contributions）：

```
重复以下三步直到收敛：
  1) Sample   : 从当前生成模型采一批样本
  2) Rank/Filter: 用 reward function 给样本打分，过滤出高 reward 的子集
  3) Fine-tune: 在过滤出的子集上做 SFT，得到更新后的模型
```

**相对 PPO 的卖点**（论文明确列出）：

- **更稳更鲁棒**：基于「SFT-like training」，没有 PPO 的训练不稳定、不需要 value model / critic；
- **超参少、好调**：PPO 一堆敏感超参（KL 系数、clip、GAE λ、value loss 权重……），RAFT 几乎只有 `K` 和温度 `λ`；
- **数据生成与模型更新解耦**：采样阶段和训练阶段完全分开，可并行、可缓存、可分布式——这点正是 agent-lightning 把它做成 demo 的工程理由。

**适用范围广**：论文不仅在 LLM（LLaMA-7B）上做对齐，还在**扩散模型（Stable Diffusion）**上做了对齐实验——说明 RAFT 是 method-agnostic 的通用框架，不限于文本。

## 二、实验关键数字

| 维度 | 设置 / 结果 |
|---|---|
| 模型 | LLaMA-7B（文本对齐）+ Stable Diffusion（图像对齐） |
| 数据集 | HH-RLHF（Anthropic Helpful & Harmless） |
| `K`（每 prompt 采样数） | **{8, 16, 32}** |
| 温度 `λ` | **1.0** |
| 收敛迭代数 | K=16/32 约 **10~12** 轮，K=8 约 **15~18** 轮（K 大收敛快） |
| Wall-clock（无早停） | K=8 → 5h；K=16 → 6.05h；K=32 → 7.05h（K 大推理慢，但迭代少） |

奖励对比（HH-RLHF reward，越高越对齐）：

| 模型 | reward | ppl（困惑度） |
|---|---|---|
| LLaMA-7B（base） | −0.435 | 4.781 |
| LLaMA-7B + SFT | 0.772 | 3.781 |
| LLaMA-7B-SFT + PPO | 2.077 | 4.156 |
| HH-RLHF-Chosen（人类优选参考） | 1.873 | — |

论文强调 RAFT 能达到与 PPO 可比的 reward，**同时更好地保住多样性指标（distinct/unique/msttr）与较低 ppl**——即对齐时少付「输出塌缩」的代价。这点呼应 §3.7 复盘里那条警告：在自产数据上反复训有 mode collapse 风险，RAFT 论文自己也把多样性当核心指标盯着。

**`K` 就是我们讨论过的「每题采样数」**：K∈{8,16,32} 不是温度变出来的，而是**对同一 prompt 独立采样 K 次**（温度 λ=1.0 保证 K 次互不相同）。这正是前面辨析过的——`K` 来自重复采样的次数，温度只负责让这 K 次分叉。

## 三、reward 在 RAFT 里只「选数据」，不「进梯度」

这是 RAFT 与真 RL（PPO）最本质的分界，也是前面几轮讨论的落点：

| | RAFT | PPO/RLHF |
|---|---|---|
| reward 的角色 | **过滤阈值**（filter threshold） | **嵌进梯度的学习信号** |
| reward 数值用法 | 只比大小做接受/拒绝，选完即弃 | 算 advantage，逐 token 缩放梯度 |
| 信用分配（摊到每步） | **无**，整条轨迹同等对待 | **有**，return/advantage 把终点 reward 摊回每步 |
| 梯度 | 纯 CE loss（无 reward 项） | 策略梯度（含 advantage） |
| 用负样本 | 不用（只留高 reward 的） | 用（负 advantage 压低坏动作） |

所以 RAFT 是「**RL 的数据哲学 + SFT 的更新机制**」：它消费和 RL 同样的三元组 `(prompt, response, reward)`，但 reward 只在**门口检票**（选哪些进训练集），进了门之后是标准监督学习——被选中的样本无论 reward 0.9 还是 0.6，对 loss 贡献一样。

往中间补一档就连成光谱：**RAFT（硬 0/1 选择）→ RWR（reward 当软权重）→ PPO（reward 经 advantage 进每步梯度）**。越往右，reward 从「检票」一步步走进梯度核心。

## 四、RAFT 与 STaR：同一骨架的两个出处

「拒绝采样 SFT」的理论源头其实有两篇，RAFT 是 generalized 版，STaR 是更早的推理域专用版。

**STaR（Self-Taught Reasoner，Zelikman et al., NeurIPS 2022, arXiv:2203.14465）**：

```
重复以下循环：
  1) 用少量 few-shot rationale 提示，让模型对一批题生成 CoT 推理 + 答案
  2) 只保留「最终答案正确」的 rationale（filter by correctness）
  3) 对做错的题，把正确答案当 hint 反向生成 rationale（rationalization 兜底）
  4) 在所有「最终正确」的 rationale 上 fine-tune
  5) 重复
```

STaR 在 CommonsenseQA 上做到与 **30× 大模型** 可比，核心贡献是「让模型用自己的推理 bootstrap 自己的推理」。

**两者对照**：

| 维度 | STaR（2022） | RAFT（2023） |
|---|---|---|
| 领域 | **推理专用**（CoT、数学、常识 QA） | **通用对齐**（文本 + 扩散模型） |
| reward | 二值「答案对不对」 | **任意 reward function / reward model**（连续） |
| 特色机制 | **Rationalization**：失败题给答案当 hint 反向造 rationale | 无；纯靠采样命中 |
| 框定 | 自训练 / 推理 bootstrap | RLHF/PPO 的 SFT 替代方案 |
| 共同骨架 | **采样 → 按 reward 过滤 → SFT → 迭代** | **同左** |

一句话关系：**STaR = 推理域、二值 reward、带 rationalization 兜底的拒绝采样自训练；RAFT = 把它推广到任意 reward model + 任意生成模型，并正式定位成 PPO 的替代**。两者共享同一条「rejection-sampling SFT」骨架，这就是 agent-lightning SFT 代码的理论出处。

## 五、呼应 agent-lightning 代码：骨架完全对得上，但退化了

把 RAFT 三步映射到 [[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]] 剖析过的 `sft_algorithm.py`：

| RAFT 步骤 | agent-lightning 代码 | 备注 |
|---|---|---|
| ① Sample 采一批 | `enqueue_rollout(...)` `sft_algorithm.py:290`（每题一次） | **退化：K=1** |
| ② Filter 按 reward 过滤 | `[r for r in all_records if r["reward"]>0]` `:400` | 二值 reward（像 STaR） |
| ②' Rank 排序 | `sort(key=reward, reverse=True)` `:404` | 取 top-N 用；这里近乎空操作 |
| ③ Fine-tune SFT | `unsloth_training(...)` 子进程 LoRA SFT | merged_16bit 存 version_n |
| 迭代 while | `while max_iterations is None or ...` `:351` | 用户改成动态停 |

**对得上，但 demo 把 RAFT 退化成了最朴素的版本**（§3.7 已诊断）：

- **K=1 + temperature=0（greedy）**：`math_agent.py:140` 温度默认 0.0，每题只采一次——退化成 pass@1，**没有 RAFT 赖以工作的采样多样性**。论文是 K∈{8,16,32} + λ=1.0；
- **二值 reward**：`compute_reward` 返回 0/1（`math_agent.py:145`），所以 `:404` 的 sort 几乎没用（留下的全是 1.0）——更像 STaR 而非用 reward model 的 RAFT；
- **非累积**：`all_records` 每轮空列表重建（`:320`），不像论文那样可累积扩充数据集。

**这解释了 §3.7 实测的「慢爬」**：把 RAFT 退化成 K=1 greedy，就只能一阶一阶收割「贪心路径刚翻对」的题，丢了论文里 K 大 → 收敛快（10~12 轮）的核心红利。**要复现论文曲线，就得把 K 拧上去（temp 0.7~1.0 + 每题采 K 次）**——这正是复盘里说的「采样数才是数据增长主杠杆」。

## 六、几个概念澄清（讨论沉淀）

- **拒绝采样 ≠ sorted**：「拒绝」的本质是 `filter(reward > 阈值)`（接受/拒绝），sort 只是当你要 top-k 时的实现手段。留「所有 reward>0」根本不用 sort。所以精确等式是 **拒绝采样 = reward + filter（要 top-k 时再加 sorted）**。
- **借用的名字**：这里的「拒绝采样」借用统计里 Monte Carlo Rejection Sampling 的名，但**退化成「reward 高就接受」**，没有概率比、不保证采到目标分布。别去对统计教材的定义。
- **K 来自重复采样，不是温度**：`n=K` 批量采样 = 循环采 K 次，多样性相同；真正影响「分配跨度」的是**温度采样 vs beam search**——beam 趋同（挤在众数）、温度采样撒得开。RAFT 要跨度大，所以用温度采样而非 beam。
- **和 RLHF 的「多候选选一个」的关系**：ChatGPT 让你从多个回答里选——那是**偏好数据采集**，喂给 RM→PPO 或直接喂 DPO。RAFT 把「人选」换成「自动 reward model 选」，且赢家拿去做 SFT（而非训 RM）。

## 七、现状与适用性：对已后训练的模型还成立吗

- **仍适用，但角色变了**：对已经重度后训练的 GPT/Llama/Qwen，RAFT 从「首次对齐」降级为「**任务特化 + 自我提升的一道工序**」。它唯一硬条件是 **pass@k>0**（模型得偶尔做对），强模型 pass@k 更高 → 可收割的正确轨迹更多。
- **天花板 = 基座 pass@k**：训练数据全来自模型自产正确轨迹，**只能放大已会的、教不会全新能力**；模型越强 headroom 越小。同时要警惕在自产同质数据上反复训导致的**多样性塌缩**（RAFT 论文盯多样性指标正是为此）。
- **社区现状：活得很好，但融进了主流 pipeline**。「rejection sampling fine-tuning（RFT）」已是现代后训练的标准组件：Llama 2/3 的 RLHF 含 rejection sampling 这一步，**DeepSeek-R1 在 RL 训完后专门加一道 rejection sampling 自我精炼**，Qwen3 多阶段后训练也用。学术上 NeurIPS 2025 已把它和 PPO/GRPO/DPO 并列研究。它的定位是「**便宜、稳定的第一档**，上 RL 之前先榨一轮」。

## 八、小结

- **RAFT 是「RL 的数据哲学 + SFT 的更新机制」**：消费 `(prompt, response, reward)`，但 reward 只做接受/拒绝（filter），不进梯度——这是它区别于 PPO 的本质。
- **三步骨架 = 采样 → 按 reward 过滤排序 → SFT → 迭代**，STaR（2022，推理域、带 rationalization）是它的前身，agent-lightning 的 SFT 代码就是这套骨架的工程实现。
- **demo 把 RAFT 退化成 K=1 greedy 二值 reward 非累积版**，丢了论文「K 大→收敛快」的红利，这正是慢爬的根因；复现论文曲线要拧 K（temp 0.7~1.0 + 每题采 K 次）。
- **对已后训练的强模型仍适用**（且更易收割），但受自蒸馏天花板约束；社区里它以「rejection sampling fine-tuning」之名成了 DeepSeek-R1/Llama/Qwen 后训练 pipeline 的标准一档。
- 在 agent-lightning 的阶梯里：**APO（不改权重，reward 选 prompt）→ RAFT（改权重，reward 选轨迹做 SFT）→ RL（reward 进梯度）**，RAFT 是承上启下的那一档。

## 参考

- [RAFT: Reward rAnked FineTuning for Generative Foundation Model Alignment](https://arxiv.org/html/2304.06767v4)（Hanze Dong, Wei Xiong 等，LMFlow 团队，2023）
- [STaR: Bootstrapping Reasoning with Reasoning](https://openreview.net/forum?id=_3ELRdg2sgI)（Zelikman, Wu, Mu, Goodman，Stanford，NeurIPS 2022，arXiv:2203.14465）
- [Reward rAnked FineTuning (RAFT) — Emergent Mind](https://www.emergentmind.com/topics/reward-ranked-finetuning-raft)
- [Self-Taught Reasoning (STaR) — Emergent Mind](https://www.emergentmind.com/topics/self-taught-reasoning-star)
