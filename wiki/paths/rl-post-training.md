---
title: "学习路径：强化学习与后训练"
created: "2026-11-07"
updated: "2026-11-07"
tags:
  - wiki
  - path
  - reinforcement-learning
  - post-training
  - agent-lightning
path_id: "rl-post-training"
audience: "自己 + CSA 团队"
gap_topics:
  - agentic-rl
  - distillation
  - reward-design
signals:
  - "arXiv：agentic RL、credit assignment、RLVR、on-policy distillation、reward hacking"
  - "verl / OpenRLHF / rllm / agent-lightning 的 GitHub release"
  - "HuggingFace：后训练模型与数据集"
---

# 学习路径：强化学习与后训练

这条路径讲"改权重"的那一半：为什么要 RL、RL 的几个核心概念、reward 怎么设计、SFT 和 RL 在 APO → SFT → RL 阶梯上各占哪一级、框架和基础设施怎么选，最后是一次实跑。不改权重的优化（APO、SkillOpt、harness 自我改进）在 [[agent-self-improvement]] 那条路径里。

**怎么用**：按站点顺序读，每站对照「算会」自查。这条路径和日记里的 12 周 RL 学习计划互为补充：计划管读书和论文，路径管把读到的东西落到 wiki 里的哪些判断上。

> [!WARNING]
> 这个领域的 wiki 页大多写于 7~9 月，stale 比例高；框架版本和 benchmark 数字变化快，以复核行为准。理论类结论（advantage、bitter lesson）变化慢。

**预计总用时**：约 16~20 小时（不含实跑）。

## 第 1 站 · 为什么要 RL：Bitter Lesson 与缩放定律

- **读**：[[bitter-lesson]]、[[scaling-laws]]、[[reinforcement-learning]]（前三条 Claim）
- **前置**：无
- **用时**：约 1 小时
- **⚠️ stale**：理论页，stale 只表示没有新证据
- **算会**：
  - 能说出 Bitter Lesson 的核心：通用计算方法最终胜过手工领域知识，以及它为什么不是一篇 RL 论文
  - 能说出 RL 的核心贡献是 search 与 learning 的统一
  - 能区分"RL agent"和"LLM agent"：同一个词，两种实体

## 第 2 站 · 核心概念：advantage 与四种形态

- **读**：[[advantage-function]]、[[reinforcement-learning]]（Claim「LLM RL 的四种形态」）、[[Agent-Lightning系列07：强化学习与VERL入门]]
- **前置**：第 1 站
- **用时**：约 2 小时
- **算会**：
  - 能解释 advantage 是"减掉状态基线后的相对好坏"，减基线是为了降方差
  - 能说出 PPO、GRPO、RLHF、RLVR 的区别，以及它们为什么都收敛到 rollout 与 training 交替
  - 能说出"用不用 advantage"为什么是 harness 与 RL 的分水岭

## 第 3 站 · 学习与 harness 的分界

- **读**：[[online-learning]]
- **前置**：第 2 站
- **用时**：约 45 分钟
- **算会**：
  - 能用一条硬标准区分 harness 与学习：有没有改模型参数
  - 能说出行业为什么选 harness-first，在线学习的三个致命问题是什么
  - 能说出"用 harness 模拟 learning"为什么是真正的前沿问题

## 第 4 站 · Reward：评估器与 reward 是两本账

- **读**：[[reward-design-three-inputs]]、[[llm-as-a-judge]]、[[rubric]]、[[process-reward-model]]
- **前置**：第 2 站
- **用时**：约 2.5 小时
- **算会**：
  - 能说出 reward 设计第一天就需要的三份输入，以及"验收分不动、优化 reward 单独按信噪比设计"的两本账分家
  - 能说出 evaluator 的三个正交维度（Judge × Strategy × Criteria），以及 judge 可靠性的八类偏差为什么就是 reward 噪声的来源
  - 能说出 ORM 与 PRM 在打分对象、数据成本、风险上的权衡，以及 PRM 的标注瓶颈为什么让领域专家不可替代

## 第 5 站 · 阶梯：APO → SFT → RL 共享一份 reward

- **读**：[[method-agnostic]]、[[prompt-optimization-maturity-ladder]]
- **前置**：第 4 站
- **用时**：约 1 小时
- **算会**：
  - 能说出三级阶梯共享同一份 reward，只是消费方式不同
  - 能说出从 L1 迁移到 L2 的两个前提：可量化的 reward、数据量过阈值（<10 / 30~50 / 100+）
  - 能说出"先解决 reward、噪声、数据量，框架只是引擎不是方向盘"

## 第 6 站 · SFT：用 reward 造标签

- **读**：[[rejection-sampling-finetuning]]、[[sft-rejection-sampling-hands-on]]、[[Agent-Lightning系列05：SFT路线剖析]]、[[Agent-Lightning系列06：SFT实战]]
- **前置**：第 5 站
- **用时**：约 2 小时
- **算会**：
  - 能解释拒绝采样微调不是"喂标准答案"，而是"用 reward 造标签"，target 是评分键
  - 能说出"答对了为什么还要训练"：把 pass@k 压成 pass@1，把搜索成本内化进权重
  - 能说出为什么 train_loss 下降不能当"变强"的证据

## 第 7 站 · 框架：agent-lightning 的接缝设计

- **读**：[[agent-lightning]]、[[environment-agnostic]]、[[Agent-Lightning系列02：框架全景]]
- **前置**：第 5 站
- **用时**：约 2 小时
- **算会**：
  - 能画出 agent-lightning 的数据流脊柱，说出 store 为什么是训练的控制平面
  - 能说出 method-agnostic（换算法只换槽位）和 environment-agnostic（接新任务只写 EnvAdapter）各在哪一侧
  - 能说出显式环境契约的暗面：接口实现完不等于数据流追通过

## 第 8 站 · 基础设施：VERL、Slime 与并行

- **读**：[[verl]]、[[slime-rl-framework]]、[[rl-infra-framework-selection]]、[[distributed-training-parallelism]]、[[Slime与VERL架构对比]]
- **前置**：第 7 站
- **用时**：约 2.5 小时
- **算会**：
  - 能说出 TRL、OpenRLHF、VERL 是抽象层谱系而不是替代关系，以及 agent RL 为什么几乎必然选 VERL 类架构
  - 能说出 VERL 最大的瓶颈在 rollout，以及 Slime 用数据 buffer 解耦训练与采样的思路
  - 能说出 FSDP 切存储、TP / PP 切计算的区别

## 第 9 站 · 实跑：calc_x 跑通 VERL

- **读**：[[Agent-Lightning系列08：RL实战]]
- **前置**：第 6、8 站
- **用时**：约 1.5 小时阅读（实跑另计）
- **算会**：
  - 能说出一次 agent RL 实跑从环境、reward 到训练配置的完整链路
  - 能说出实跑中最先撞到的几个坑，以及怎么判断训练"在变好"而不只是"没崩"

## 前沿站 · 正在发生的变化

来自知识差距报告的 agentic-rl、distillation、reward-design 主题。「算会」统一是：**能说出它改变了上面哪一站的哪条结论**。

- **Agentic RL 的细粒度 credit assignment**（2026-10-19，高优先级，建议深挖）→ 影响第 2、4 站：多步 agent 轨迹里的 advantage 怎么分到每一步
- **多教师 on-policy distillation 成为后训练标配**（2026-10-19，高优先级）→ 影响第 6 站：拒绝采样之外的另一条"把能力压进权重"的路
- **RL 环境合成成赛道**（2026-09-12）→ 影响第 7 站：EnvAdapter 背后的环境从哪来
- **Reward hacking 进入基准化阶段**（2026-09）→ 影响第 4 站：reward 噪声之外的另一类风险
- **Skill-RL 化浪潮**（2026-09-12）→ 与 [[agent-self-improvement]] 衔接：skill 优化开始借 RL 的方法

## 毕业标准

给一个具体任务（比如让 agent 学会调某个内部 API），能说出：先用哪一级（APO / SFT / RL）、reward 怎么设计、需要多少数据、用哪个框架、算力和瓶颈在哪，以及怎么证明它真的变好了。

## 这条路径暴露的缺口

- **stale 集中**：[[agent-lightning]] 11/11、[[verl]] 8/8、[[rejection-sampling-finetuning]] 9/9，框架类结论需要按最新 release 复核
- **缺方法页**："GRPO 训练数据准备"（日记里的知识差距任务已列出，ms-swift / verl 素材在手）
- **缺概念页**：credit assignment、on-policy distillation 还没有独立页
