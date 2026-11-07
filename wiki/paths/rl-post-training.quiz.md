---
title: "题库：强化学习与后训练"
created: "2026-11-07"
updated: "2026-11-07"
tags:
  - wiki
  - path
  - quiz
path_id: "rl-post-training"
---

# 题库：强化学习与后训练

配合 [[rl-post-training]] 使用，按站点分组。题型：**场景**、**辨析**、**解释**。答案是参考要点，说出主要意思即可。

## 第 1 站 · 为什么要 RL：Bitter Lesson 与缩放定律

### Q1 · 解释

**问**：Bitter Lesson 的核心结论是什么？

**答**：从长期看，能随计算规模扩展的通用方法（搜索与学习）最终胜过人工植入的领域知识；"苦涩"在于研究者的心血常被更多算力超越。

**出处**：[[bitter-lesson]]

### Q2 · 辨析

**问**："Bitter Lesson 是 Sutton 在推广强化学习。"对吗？

**答**：不对。它是一篇关于 AI 方法论的文章，讲的是通用计算方法与人工知识的长期对比，不是在推 RL。

**出处**：[[bitter-lesson]]

### Q3 · 解释

**问**：RL 在 AI 方法上的核心贡献是什么？

**答**：把搜索（search）和学习（learning）统一在一个框架里：在环境中试错探索，再把探索得到的经验学进策略。

**出处**：[[reinforcement-learning]]

### Q4 · 辨析

**问**："RL agent 和 LLM agent 是同一种东西。"对吗？

**答**：不对。同一个词，两种实体：RL agent 是在环境里学策略的学习体，LLM agent 通常是用固定权重的模型加 harness 完成任务，不一定在学习。

**出处**：[[reinforcement-learning]]

## 第 2 站 · 核心概念：advantage 与四种形态

### Q1 · 解释

**问**：advantage 和 reward、return 有什么区别？

**答**：reward / return 是绝对的好坏，advantage 是减掉状态基线后的相对好坏（Q − V）：这个动作比在这个状态下的平均水平好多少。

**出处**：[[advantage-function]]

### Q2 · 解释

**问**：为什么要减基线？

**答**：为了降低方差：抵消"这个状态本身有多容易"这个公共偏置，让梯度信号只反映动作选择的好坏。

**出处**：[[advantage-function]]

### Q3 · 解释

**问**：PPO、GRPO、RLHF、RLVR 有什么共同点？

**答**：最终都收敛到 rollout 与 training 交替：先用当前策略采样一批轨迹并打分，再用这些数据更新策略，如此循环。区别在 reward 从哪来、advantage 怎么算。

**出处**：[[reinforcement-learning]]

### Q4 · 辨析

**问**："只要用了 reward，就是在做 RL。"对吗？

**答**：不对。用不用 advantage 才是 harness 与 RL 的分水岭：harness 用 reward 做筛选、排序、拒绝；RL 用 advantage 进入梯度去改权重。

**出处**：[[advantage-function]]

## 第 3 站 · 学习与 harness 的分界

### Q1 · 解释

**问**：区分 harness 与"学习"的硬标准是什么？

**答**：有没有改模型参数。改了参数才是学习；只改 prompt、记忆、工具、流程的，都属于 harness。

**出处**：[[online-learning]]

### Q2 · 解释

**问**：为什么行业普遍选择 harness-first，而不是在线学习？

**答**：在线学习有三个致命问题：不稳定（在线更新容易发散，reward 有噪声时更严重）、不可控（reward / loss 噪声直接传导到参数）、灾难性遗忘（新数据覆盖旧能力）。所以现实路线是 Harness-First > 离线训练 > 在线学习 > RL：控制层可控、可解释、立刻见效。

**出处**：[[online-learning]]

### Q3 · 辨析

**问**："在线学习就是一个单独的训练循环。"对吗？

**答**：不准确。在线学习是双回路混合系统：一个回路改行为（类似 harness），一个回路改参数（学习），所以不能简单归为 harness 或训练。

**出处**：[[online-learning]]

### Q4 · 解释

**问**：为什么说"用 harness 模拟 learning"是前沿问题？

**答**：在不改权重的前提下，让 harness 通过记忆、skill、经验整理表现出"越用越好"的效果，既拿到学习的收益，又保留 harness 可审计、可回滚的好处。

**出处**：[[online-learning]]

## 第 4 站 · Reward：评估器与 reward 是两本账

### Q1 · 解释

**问**：设计 reward 第一天需要哪三份输入？

**答**：业务属性（各维度该占多少权重的直觉）、对标签和数据分布的一次扫描（比如正例占比过低，零成本就能发现某个分量其实是常数）、一次小规模校准跑（比如 100 条，只花几美元，看哪个分量会饱和）。只用业务直觉一份输入拍权重，是在设计当时就能发现的缺陷。

**出处**：[[reward-design-three-inputs]]

### Q2 · 解释

**问**："两本账分家"指什么？

**答**：验收分逐字节不动，用来对外交代；优化用的 reward 单独按信噪比设计，用来训练或优化。两者混用，要么验收失真，要么优化信号太吵。

**出处**：[[reward-design-three-inputs]]

### Q3 · 解释

**问**：evaluator 的三个正交维度是什么？

**答**：Judge（谁来评：人、规则、reward model、LLM）× Strategy（怎么评：打分、成对比较等）× Criteria（评什么：rubric 维度）。不应压成一棵树。

**出处**：[[llm-as-a-judge]]

### Q4 · 解释

**问**：ORM 与 PRM 的权衡是什么？为什么 PRM 让领域专家不可替代？

**答**：ORM 只给结果打分，数据便宜但信号稀疏；PRM 给每一步打分，信号密但标注贵、风险是标错。"这一步想歪了"只有领域专家能标，所以 PRM 的标注瓶颈定义了专家的价值。

**出处**：[[process-reward-model]]

## 第 5 站 · 阶梯：APO → SFT → RL 共享一份 reward

### Q1 · 解释

**问**：APO、SFT、RL 三级阶梯的共同点是什么？

**答**：共享同一份 reward，只是消费方式不同：APO 用它挑 prompt，SFT 用它筛样本造标签，RL 用它算 advantage 改权重。

**出处**：[[method-agnostic]]

### Q2 · 解释

**问**：从 L1（LLM-judge）迁移到 L2（数据闭环）有哪两个前提？

**答**：可量化的 reward，以及数据量过阈值：少于 10 条留在 L1，30~50 条可以试 L2，100 条以上才稳定。

**出处**：[[prompt-optimization-maturity-ladder]]

### Q3 · 辨析

**问**："优化效果不好，换个更好的框架就行。"对吗？

**答**：不对。先解决 reward、评估噪声、数据量，框架只是引擎不是方向盘；APO 摆动大的主因通常是评估噪声。

**出处**：[[prompt-optimization-tool-selection]]

### Q4 · 场景

**问**：客户只有 15 条标注样本，想直接上 RL。你怎么建议？

**答**：先停在 L1：用 LLM-judge 和人工对照把 reward 做稳、继续攒 bad case；数据过 30~50 条再试 L2 数据闭环，RL 是阶梯最后一级。

**出处**：[[prompt-optimization-maturity-ladder]]

## 第 6 站 · SFT：用 reward 造标签

### Q1 · 辨析

**问**："拒绝采样微调就是喂标准答案。"对吗？

**答**：不对。它是用 reward 造标签：模型自己生成多个候选，按 reward 筛出好的当训练数据，target 是评分键而不是外部给的标准答案。

**出处**：[[rejection-sampling-finetuning]]

### Q2 · 解释

**问**：模型已经答对了，为什么还要用这些答对的样本训练？

**答**：把 pass@k 压成 pass@1：原来要采样多次才碰到对的，训练后一次就对，把搜索成本内化进权重。

**出处**：[[rejection-sampling-finetuning]]

### Q3 · 辨析

**问**："train_loss 一直在降，说明模型在变强。"对吗？

**答**：不对。train_loss 下降只能确认训练没崩，不能当变强的证据；要看留出集上的 reward 或通过率。

**出处**：[[sft-rejection-sampling-hands-on]]

### Q4 · 解释

**问**：自举飞轮是怎么转起来的？

**答**：每轮用更新后的模型重新采样、按 reward 过滤，能留下的合格样本变多（实测从 80 条到 86 条），数据变多又让下一轮更好。

**出处**：[[sft-rejection-sampling-hands-on]]

## 第 7 站 · 框架：agent-lightning 的接缝设计

### Q1 · 解释

**问**：agent-lightning 从 0.3.1 到 v1.0，架构有什么变化？什么没变？

**答**：0.3.1 是"9 模块数据流脊柱 + store 控制平面 + adapter 接缝"；v1.0 简化为 Trainer（verl + vLLM）、API Gateway、Rollout Controller 三件，由 Gateway 把交互转成训练数据。控制反转和 method-agnostic 的思想没变。

**出处**：[[agent-lightning]]

### Q2 · 解释

**问**：method-agnostic 和 environment-agnostic 分别在哪一侧解耦？

**答**：method-agnostic 在算法侧：换优化方法只换算法槽位，agent 与 reward 不改；environment-agnostic 在环境侧：接新任务只写 EnvAdapter，trainer 不改不 fork。

**出处**：[[method-agnostic]]、[[environment-agnostic]]

### Q3 · 辨析

**问**："EnvAdapter 接口实现完，环境就接好了。"对吗？

**答**：不对。显式契约也有暗面：接口之外的隐式要求会静默退化，"接口实现完"不等于"数据流追通过"，要把一条样本从采样到训练完整追一遍。

**出处**：[[environment-agnostic]]

### Q4 · 解释

**问**：所有训练框架要客户提供的东西，本质上是哪三样？

**答**：数据、执行（环境里怎么跑）、打分（reward）。

**出处**：[[environment-agnostic]]

## 第 8 站 · 基础设施：VERL、Slime 与并行

### Q1 · 辨析

**问**："TRL、OpenRLHF、VERL 是三个互相替代的框架。"对吗？

**答**：不对。它们是抽象层谱系：TRL 是算法工具，OpenRLHF 是工程框架，VERL 是基础设施。agent RL 几乎必然选 VERL 类架构，这是由任务本质决定的。

**出处**：[[rl-infra-framework-selection]]

### Q2 · 解释

**问**：VERL 最大的瓶颈在哪？理想状态是什么？

**答**：瓶颈在 rollout（采样）而不是训练；理想状态是 rollout 与 training 重叠执行，不互相等。

**出处**：[[verl]]

### Q3 · 解释

**问**：Slime 的核心设计哲学是什么？适合谁？

**答**：训练与采样彻底解耦，用 Data Buffer 连成数据流闭环；技术选型是 Megatron 训练 + SGLang 推理 + Ray 调度。适合 MoE、超大模型、高吞吐 agent RL，不适合已在 HF / vLLM 体系或需要多后端的团队。

**出处**：[[slime-rl-framework]]

### Q4 · 解释

**问**：FSDP 和 TP / PP 切的分别是什么？

**答**：FSDP 切的是存储（参数、梯度、优化器状态分片，逐层 all-gather 后释放），多卡是"提效的副本"；TP / PP 切的是计算，多卡是"否则算不了的协作"。

**出处**：[[distributed-training-parallelism]]

## 第 9 站 · 实跑：calc_x 跑通 VERL

### Q1 · 解释

**问**：为什么第一个 RL 实跑选 calc_x，而不是 spider 或 chartqa？

**答**：三个 VERL 例子都至少要 1 张 40GB GPU，calc_x 最轻、最经典，有 debug / `--ci-fast` 模式；chartqa 最重，锁死特定 vLLM 版本，容易踩 flash-attn / CUDA 的坑。

**出处**：[[Agent-Lightning系列08：RL实战]]

### Q2 · 辨析

**问**："RL 训练会自动先跑一遍 SFT 做冷启动。"对吗？

**答**：不对。SFT 与 RL 是两个独立入口，RL 的冷启动靠配置 `model.path` 指向一个已经 SFT 过的模型，不会自动 SFT。

**出处**：[[verl]]

### Q3 · 场景

**问**：RL 的 calc_x 和 SFT 跑过的 unsloth 例子是什么关系？为什么适合放在一起比较？

**答**：是同一个阶梯上的上下两级：unsloth 是 SFT 那一级（数学数据集 + 计算器工具 + 拒绝采样），calc_x 是 RL 那一级（VERL）。两者的任务结构和 reward 逻辑几乎一样，最适合回答"同一个任务上 SFT 和 RL 差在哪"。

**出处**：[[Agent-Lightning系列08：RL实战]]

### Q4 · 解释

**问**：怎么判断 RL 训练"在变好"而不只是"没崩"？

**答**：看留出集上的 reward / 通过率是否上升，而且和基线模型在同一批题上对比；训练集 reward 和 loss 只能说明过程正常。

**出处**：[[sft-rejection-sampling-hands-on]]、[[Agent-Lightning系列08：RL实战]]
