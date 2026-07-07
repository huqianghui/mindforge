---
title: "论文阅读：LifeSkill——「边行动边学习」的参数化路径，兼论它「理论在线、工程离线」的真相"
created: 2026-07-07
tags: [paper-reading, LifeSkill, JitRL, continual-learning, test-time-adaptation, online-learning, co-evolution, skill-internalization, VGSL, OSI, verifier, LoRA, LifelongAgentBench, parametric-learning, agent-lightning]
paper: "Learning While Acting: A Skill-Enhanced Test-Time Co-Evolution Framework for Online Lifelong Learning Agents"
source: https://arxiv.org/abs/2606.04815
related: "[[2026-07-06-JitRL-无梯度测试时RL论文解读]]"
---

# 论文阅读：LifeSkill——「边行动边学习」的参数化路径，兼论它「理论在线、工程离线」的真相

> 这是 [[2026-07-06-JitRL-无梯度测试时RL论文解读|昨天那篇]]结尾预告的「下一篇深读」。在 CL-RL 四篇全景里（JitRL / LifeSkill / XSkill / CURATOR），**LifeSkill 是唯一真改参数的一篇**，独占「部署后 + 改参数」这个历来空着的象限，也因此最接近 [[online-learning]] 里定义的「真在线学习」——慢回路真的动了权重。JitRL 那篇把「不改参数」一侧讲透了；这篇要问的是另一侧：**当你选择把学到的东西写回参数，会换来什么、又会付出什么？**
>
> 核心结论分两层。**第一层（论文层）**：LifeSkill 和 JitRL 是「边行动边学习」的两条对偶路径——JitRL 问「如何在不更新参数的情况下表现得像学过」，LifeSkill 问「如何把技能真正学进参数、并让技能用完即消失」。它最漂亮的想法是 **skill 不该一直待在 prompt 里，而应最终被内化进权重然后消失**——Agent 不该「依赖技能」，而该「成为技能」。**第二层（工程层，也是本文重点）**：顺着「它真能在线学习吗」这个追问往下压，结论比论文的自我定位冷静得多——**LifeSkill 理论上满足 online learning 的定义，工程上基本不可能真在线**。它的核心循环「失败 → 生成多个候选 skill → 每个 rollout N 次 → verifier 评分 → 训练 skill extractor → 再训练 policy」本质是**一个被 test-time 触发的小型 offline RL 训练循环**。所以它更准确的名字不是 "Learning While Acting"，而是 **"learning *after* acting, in mini-batches"**。真正把 LifeSkill 和 JitRL 分开的判据，也不再是 JitRL 那篇辨明的「知识存哪」，而是往前一步的「**这次适应能不能在部署的延迟预算内完成**」——这根「适应延迟」轴，才是理解这对路径分工的关键。

## 一、定位：四篇里唯一改参数的那篇

先把坐标接回昨天。[[2026-07-06-JitRL-无梯度测试时RL论文解读|JitRL 那篇]]用两根轴摆开了四篇 CL-RL：X 轴 = 改不改参数（harness 风 ↔ learning 风），Y 轴 = 何时适应（离线 ↔ 部署后）。逐篇核对 abstract 后，四篇里只有 LifeSkill 的原话写着 "Online Skill Internalization ... **refines the policy model's parameters**"——它是唯一在部署后真改权重的。

用 JitRL 那篇提出的「存储位面」轴看得更清楚：JitRL / XSkill / CURATOR 都把学到的东西存进**外部持久记忆库**（与权重解耦），而 **LifeSkill 跳到了轴的另一侧——把学到的东西内化回 base 权重**。这一跳换来的性质和那三篇正好相反：

| 性质 | JitRL / XSkill / CURATOR（外部库） | LifeSkill（权重内化） |
|---|---|---|
| 可移植（换 base 模型） | ✅ memory 照用 | ❌ 绑死这个模型 |
| 可外科式删除坏经验 | ✅（CURATOR 的立身之本） | ❌ 权重里的教训删不掉 |
| 灾难性遗忘风险 | 无（append-only） | **有**（overwrite 权重） |
| 能否内化 base 不会的新能力 | ❌ 只能重排已有候选 | **✅ 这正是改参数的意义** |

最后一行是 LifeSkill 存在的全部理由：**JitRL 的能力天花板锁死在 base model 的候选覆盖上——它只能重排已会的、造不出新动作分布**。想突破这层天花板、内化 base 模型根本不生成的全新能力，就只有真改参数一条路。LifeSkill 就是走这条路的。

## 二、核心机制：co-evolution 的两个模型 + VGSL + OSI

LifeSkill（arXiv:2606.04815，Learning While Acting）的系统由**两个协同进化的模型**组成，而不是一个：

- **Policy Model**（执行）——真正下场做任务的 agent；
- **Skill Extractor**（抽取技能）——从失败中提炼「可复用技能」的模型。

两者通过两阶段学习形成闭环。

### (1) VGSL——Verifier-Guided Skill Learning（从失败中学技能）

流程是一个小型 RL loop：

1. Policy Model 执行任务，**失败**；
2. Skill Extractor 针对失败情境生成 **K 个候选 skill**；
3. 每个候选 skill 拿去做 **N 次 rollout**（让 policy 带着这条 skill 重新尝试任务）；
4. 一个**确定性 verifier** 判定每次 rollout 的成败，算出该 skill 的 success rate；
5. **用 success rate 当 reward，反过来训练 Skill Extractor**——让它未来更会生成「真能救活失败任务」的 skill。

本质：**把「一条 skill 有没有用」这件事，变成了可以给 Skill Extractor 打分的 reward 信号**。这一步和昨天 JitRL 的哲学是相通的（都用 verifier/evaluator 把交互结果变成学习信号），差别在 JitRL 把信号灌进 memory 的 advantage，LifeSkill 把信号灌进 Skill Extractor 的梯度。

### (2) OSI——Online Skill Internalization（让技能内化进权重）

这是 LifeSkill 最有创意的一步：

1. 用一条有效的 skill **成功**完成任务，得到一条成功轨迹；
2. **把 skill 从输入里移除**（从 prompt/context 中删掉）；
3. **用这条「已去掉 skill 提示」的成功轨迹去训练 Policy Model**（改参数）。

结果：skill 描述的那套本领被**内化成模型自己的能力**，而不再是一段挂在输入里的外部提示。下次遇到同类情境，policy 不需要 skill 提示也能做对——因为它已经「成了」这个 skill。

### co-evolution 闭环

两个模型互相喂养，形成协同进化：

```
policy 失败
   │
   ▼
skill extractor 生成候选 skill ──► rollout + verifier 打分 ──► 训练 skill extractor（VGSL）
   │                                                              （extractor 越来越会抽 skill）
   ▼
skill 帮 policy 成功 ──► 去掉 skill 的成功轨迹 ──► 训练 policy（OSI）
                                                     （policy 越来越强，失败越来越少）
```

一句话概括：**Learning While Acting = 行动驱动学习（失败 → 抽 skill）+ 学习反哺行动（skill 内化 → policy 变强）**。

## 三、最漂亮的一个想法：skill 应该「用完即消失」

LifeSkill 值得单独拎出来的，是它对 skill 生命周期的判断——这一点比它的具体算法更有启发。

主流的 skill-library / skill-injection 路线（也包括 XSkill 的技能流）默认 **skill 是持久的外部资产**：抽出来、存进库、需要时检索注入 context。skill 一直存在，agent 一直依赖它。

LifeSkill 反过来主张：**skill 不该一直存在于 prompt 中，而应最终消失。**

- skill 存在 prompt 里 → 它是**外部拐杖**，占 context、每次都要检索注入、agent 始终「依赖」它；
- skill 内化进权重 → 它**变成了 agent 自己**，不再占 context、不需检索、agent「成为」了它。

换个说法：**Agent 不应该「依赖技能」，而应该「成为技能」。** 这和人的学习是同构的——初学开车时你脑子里默念「离合、油门、看后视镜」（skill 在 prompt 里），熟练后这些步骤消融进肌肉记忆、不再需要默念（skill 内化进权重）。LifeSkill 把这个「从显式提示到隐式能力」的过程，做成了一个可训练的机制。

这也正是它和整簇「不改参数」方法的分水岭：**那三篇都在优化「如何更好地用外部拐杖」，LifeSkill 在优化「如何把拐杖变成腿」。**

## 四、参数化 vs 非参数化：一张对偶表

把 LifeSkill 和 JitRL 并排，两条路径的对偶关系就清楚了（JitRL 的细节见[[2026-07-06-JitRL-无梯度测试时RL论文解读|昨天那篇]]，这里只做对照，不重复展开）：

| 维度 | LifeSkill | JitRL |
|---|---|---|
| 学习时间 | test-time + **持续训练** | test-time（**无训练**） |
| 参数更新 | ✅ 更新（LoRA / 权重） | ❌ 冻结 |
| 核心机制 | skill 抽取 + 内化（VGSL + OSI） | memory + logit 调整（kNN advantage） |
| 技能表征 | 显式 skill，最终**内化消失** | 无显式 skill，存原始 $(s,a,G)$ |
| 动态 | co-evolution（两模型协同进化） | just-in-time（查表即改分） |
| 长期能力 | ✅ 沉淀进权重 | ❌ 不沉淀（存外部库） |
| 能力位置 | **模型参数** | **外部 memory** |
| 持久性 | 长期（权重级） | 即时（logit 级瞬时生效） |
| 成本 | **高**（训练） | **低**（推理） |
| 架构哲学 | **学会它**（parametric learning） | **临时用它**（non-parametric learning） |

一个可以留着的心智模型：

> **LifeSkill learns by transforming interaction into skill（把交互变成技能）；JitRL learns by transforming memory into action bias（把记忆变成动作偏置）。**

两种哲学的一句话对立：**LifeSkill 让模型真正变强；JitRL 让模型看起来更强。**

## 五、核心质疑：LifeSkill 真能「在线学习」吗？——理论在线，工程离线

前四节是论文层的梳理。但把「Learning While Acting」这个名字当真、追问一句「它真能在部署时**在线**学习吗」，答案会立刻变得不一样。这一节是本文的重点。

**先给结论**：

- **理论上**：可以算 online learning ✅
- **工程上**：基本不可能真正在线做 ❌——只能是「准在线 / 延迟在线」

### 为什么「理论上可以」

LifeSkill 满足 online / continual learning 的定义条件：

- 数据是 **streaming** 的（task-by-task 到达）；
- 更新发生在 **test-time**（部署期间，不是一次性预训练）；
- 模型是**逐步被更新**的（不是训完就冻）。

按 [[online-learning]] 里那条硬标准（**区分 harness 与 learning 只看有没有改参数**），LifeSkill 改参数，所以它落在「真在线学习」一侧——它的慢回路（改权重）确实动了。从 ML 定义看，它是货真价实的 online / continual learning framework。

### 为什么「工程上不成立」——这个直觉是对的

问题出在它那个循环的**重量**。把 VGSL + OSI 拆开算一遍成本：

```
失败 → 生成 K 个 skill
        每个 skill：rollout N 次（每次都是完整 LLM 推理）
                    verifier 评估 N 次
        → 训练 skill extractor（一次 gradient update，VGSL）
→ 用成功轨迹再训练 policy（又一次 gradient update，OSI）
```

单次适应的成本量级：

$$O(K \times N \times \text{LLM inference} + \text{2 次 training})$$

这带来三个致命的工程问题：

**① Latency 爆炸。** 你不可能在真实系统里让「用户请求 → 等你把 K 个 skill 各 rollout N 次 → 再训两轮 → 才返回结果」。这条链路上的每一次 rollout 都是一次完整的 LLM 调用，训练更是秒级以上。**这根本不是 online inference，而是一次 offline training，只是被伪装成在线。**

**② Compute 不可持续。** 如果真让它持续跑——每个 task 都可能触发 skill search、每个 failure 都触发一轮 rollout + 双重训练——成本会随任务流指数级放大。部署一周的算力账单会难看到没法上线。

**③ Continual Learning 其实不成立。** 真正的 CL 要求三件事：**快速适应、不破坏已有能力、可持续更新**。LifeSkill 三条都打折扣：

- ❌ **更新慢**——要 rollout + 两轮训练，不是「快速」；
- ❌ **没有明确的防遗忘机制**——OSI 直接拿新轨迹 overwrite policy 权重，论文没给出对抗灾难性遗忘的专门设计（对比 JitRL 的 append-only memory 天然免疫遗忘）；
- ❌ **强依赖 batch / task window**——它更像在一个任务窗口上做 mini-batch 训练，不是逐样本即时更新。

### 更准确的定位

所以 LifeSkill 实际上是：

> **「一个被 test-time 触发的 offline training loop」**

而不是：

> ~~真正的 real-time online learning system~~

一句可以直接写进结论的话：

> **LifeSkill is theoretically online, but practically offline.**

或者更锋利的版本：

> **LifeSkill does not "learn while acting" — it "learns *after* acting, in mini-batches".**

严谨地给它归类：它属于 ✅ test-time adaptation、✅ online fine-tuning（宽松意义上），但**不属于** ❌ real-time online learning、❌ production-grade continual learning。

## 六、那它到底该怎么部署：异步 / 延迟在线学习

质疑不是为了否定 LifeSkill，而是为了给它找到**正确的工程位置**。如果真要用它，唯一现实的落地形态是**把「行动」和「学习」在时间轴上解耦**：

```
在线执行（fast path，低延迟，直接服务用户）
        │
        ▼
收集失败轨迹（异步落盘，不阻塞主链路）
        │
        ▼
后台异步训练（offline / background：VGSL + OSI 那套重循环放这里跑）
        │
        ▼
周期性热更新模型（攒够一批、训好一版，再灰度替换线上权重）
```

也就是说，它能做的是 **asynchronous / delayed online learning（异步 / 延迟在线学习）**，而不是 real-time CL。用最贴现实的话说：

> **不能 real-time CL，只能 offline CL with online data**（用在线采集的数据、做离线的持续学习）。

这也校准了论文名字的野心——

> **LifeSkill shows how agents *could* learn online, but not how they *should* be deployed online.**

它证明了「部署后改参数并内化新能力」这条路走得通（占住了那个历来空着的象限），但没有解决「如何在部署延迟预算内完成这次改参数」这个真正卡在生产化面前的问题。

## 七、工程选型：什么时候 LifeSkill，什么时候 JitRL

把第五、六节的判断落成一张可操作的选型表——**关键的新判据是「适应延迟」**：你这次适应能不能塞进部署的延迟预算里。

**选 JitRL（不改参数、即时）：**

- 用的是 closed API（根本不能训练，只能拿到 logits 或采样）；
- 需要**低成本 + 低延迟**，适应要在单次决策内即时生效；
- 需要快速迭代、频繁换 base 模型（memory 可移植）；
- 任务在 base 模型的能力覆盖范围内——只需「更聪明地用已有能力」。

**选 LifeSkill（改参数、延迟）：**

- 有**稳定的任务分布**（值得为之沉淀长期能力，不会训完就过时）；
- 能接受**异步 / 离线训练**的部署形态（fast path 执行 + 后台训练 + 周期更新）；
- 需要**内化 base 模型根本不会的新能力**——突破 JitRL 那道候选覆盖天花板；
- 有算力预算承担 rollout + 双重训练的重循环。

### 最值得写的扩展点：hybrid

两条路径不是二选一，而是可以**分工到不同时间尺度**上：

| 时间尺度 | 用谁 | 干什么 |
|---|---|---|
| **短期适应**（此刻、单任务） | JitRL | 即时改 logits，低延迟应对当前情境 |
| **长期沉淀**（跨会话、后台） | LifeSkill | 异步把反复出现的模式内化进权重 |

**这很可能是最优架构**：前台用 JitRL 做零延迟的即时适应（把交互结果先写进 memory），后台用 LifeSkill 那套重循环异步消化 memory、把真正稳定复现的能力内化进权重、周期性热更新。前台负责「现在就变聪明」，后台负责「慢慢真变强」。JitRL 的 memory 恰好可以当 LifeSkill 的训练数据源——两者在数据流上天然衔接。

## 八、实验关键数字

LifeSkill 在 **LifelongAgentBench** 上评测——这个 benchmark 的特点正好卡住 CL 的要害：环境（Database / Operating System / Knowledge Graph）都有**确定性 verifier**（可验证成败）、任务之间**有依赖**、且**可复现**。

| 方法 | 得分 |
|---|---|
| **LifeSkill** | **0.59** |
| 最强「有训练」baseline | 0.52 |
| 最强「无训练」baseline | 0.49 |

读数点：LifeSkill（0.59）同时压过最强有训练（0.52）和最强无训练（0.49）baseline——说明「VGSL 抽 skill + OSI 内化」这套组合拳确实比「单纯在线微调」和「单纯 memory/prompt」都更有效。但也要注意——**这套数字是在离线可复现的 benchmark 上刷出来的，恰恰印证了第五节：它的评测设定本身就是「批量、可复现、离线」的，不是真实部署的实时流。**

> ⚠️ 与 JitRL 的数字**不可直接对比**——两者 benchmark 不同（JitRL 用 WebArena / Jericho，LifeSkill 用 LifelongAgentBench），评测协议也不同。

## 九、复现与不确定性

- **官方代码尚未公开**——这是复现 LifeSkill 最大的障碍，RL 细节（VGSL 的 reward 设计、OSI 的训练超参、K/N 取值）需要自行实现，坑会很多。
- **Benchmark 可用**：[caixd-220529/LifelongAgentBench](https://github.com/caixd-220529/LifelongAgentBench)，Dataset 在 HuggingFace（LifelongAgentBench）——即使复现不了 LifeSkill 本身，这个 benchmark 也值得拿来评测自己的 CL 方案。
- **复现建议（难度高）**：核心模块要自己搭 policy model（LoRA 简化）+ skill extractor + verifier + VGSL trainer + OSI trainer。务实做法：**从单个 DB 环境起步、砍低 rollout 次数 N、用 LoRA 简化 policy 更新**——先把闭环跑通，再谈刷分。
- **对比 JitRL 的复现性**：JitRL 的 [liushiliushi/JitRL](https://github.com/liushiliushi/JitRL) 官方 repo 可直接用，复现门槛远低于 LifeSkill——这本身也是「不改参数」路线的一个工程优势（没有训练细节要调）。
- **结果外推风险**：0.59 这个数只在 LifelongAgentBench 的可验证、有依赖、可复现设定下成立，换到无确定性 verifier 或非文本任务上不保证成立。

## 十、小结

- **LifeSkill 是 CL-RL 四篇里唯一真改参数的一篇**，占住「部署后 + 改参数」这个历来空着的象限，也是最接近 [[online-learning]] 定义的「真在线学习」的一篇。它在「存储位面」轴上跳到权重一侧，换来了 JitRL 那三篇拿不到的东西——**能内化 base 模型根本不会的全新能力**（代价是不可移植、不可外科删除、有遗忘风险）。
- **机制 = co-evolution 双模型（Policy + Skill Extractor）+ VGSL（verifier 引导从失败中抽 skill）+ OSI（去掉 skill 提示、用成功轨迹把技能内化进权重）**。最漂亮的想法是 **skill 应「用完即消失」——Agent 不该依赖技能，而该成为技能**。
- **和 JitRL 是一对对偶路径**：JitRL「把记忆变成动作偏置」（让模型看起来更强），LifeSkill「把交互变成技能并内化」（让模型真正变强）；一个 non-parametric、即时、低成本，一个 parametric、延迟、高成本。
- **最重要的判断（工程层）——LifeSkill 理论在线、工程离线**。它的核心循环是「被 test-time 触发的 offline training loop」，latency 爆炸、compute 不可持续、也不满足 real-time CL 的三条要求（更新慢、无防遗忘、依赖 batch）。它不是 "learn while acting"，而是 **"learn *after* acting, in mini-batches"**。
- **正确的部署形态是异步 / 延迟在线学习**：fast path 执行 + 异步后台训练 + 周期热更新——「不能 real-time CL，只能 offline CL with online data」。
- **真正分开这对路径的判据，是从「知识存哪」再往前一步的「适应延迟」**：适应能否塞进部署延迟预算。塞不进的（LifeSkill）只能异步离线，塞得进的（JitRL）才能即时在线。
- **最优架构很可能是 hybrid**：短期适应交给 JitRL（前台、零延迟、改 logits），长期沉淀交给 LifeSkill（后台、异步、改权重），JitRL 的 memory 顺便当 LifeSkill 的训练数据源。
- **它们代表两种根问题**：AI 应该「真正变强」（Learning），还是「更聪明地使用已有能力」（Acting）？而真正有趣的问题是——**我们能不能同时拥有这两者？** hybrid 就是对这个问题的一个工程回答。

## 参考

- [Learning While Acting: A Skill-Enhanced Test-Time Co-Evolution Framework for Online Lifelong Learning Agents](https://arxiv.org/abs/2606.04815)（arXiv:2606.04815，本文主角，CL-RL 四篇里唯一改参数）
- [LifelongAgentBench](https://github.com/caixd-220529/LifelongAgentBench)（LifeSkill 的评测 benchmark，Dataset 在 HuggingFace）
- [[2026-07-06-JitRL-无梯度测试时RL论文解读]] — CL-RL 四篇全景 + JitRL 深读，本文的对偶篇（「不改参数」一侧）与「存储位面」判据的来源
- [[online-learning]] — 控制论视角下 harness / learning / 在线学习 / RL 的边界辨析（本文第五节「理论在线、工程离线」判断的判据来源）
- [[continual-self-improving-ai]] — 持续自改进 AI 的概念骨架
- [[2026-07-06-gap-analysis]] — 今天主任务方向一「Agent 持续学习 / test-time 自进化」的来源报告
