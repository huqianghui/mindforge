---
title: 从 Evaluator 到 Reward Function——评估信号如何变成 APO 与强化学习的训练信号
created: 2026-08-03
tags:
  - AI
  - evaluation
  - reward-function
  - agent-lightning
  - APO
  - reinforcement-learning
  - rubric
---

# 从 Evaluator 到 Reward Function——评估信号如何变成 APO 与强化学习的训练信号

> 本篇是 Evaluation 系列的**链路篇**，回答一个连接两个领域的问题：**Evaluation（评估）和 Optimization（训练/优化）原本是分开的两套体系，评估器打出的分数如何变成 APO 的排序依据、变成 RL 的奖励函数？** 概念辨析见姊妹篇 [[Evaluator概念全景——从rubric词源到Judge、Strategy、Criteria三层评估模型]]。
>
> 配套阅读：[[Agent Lightning系列04：APO源码剖析——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景]]（APO 如何消费 reward）、[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]（RL 如何消费 reward）。

## 一、先给结论：一条统一链路

把 Evaluation 和 Training 两个领域接起来，是下面这条链路：

```
Agent Rollout
        │
        ▼
Evaluator（评估器）
        │
        ├── Rule Evaluator        确定性规则（格式、可执行性）
        ├── Metric Evaluator      经典指标（EM、F1、通过率）
        ├── LLM Judge             通用 LLM 裁判
        └── Rubric Evaluator      LLM Judge + 结构化评分标准
        │
        ▼
Reward Function（奖励函数）
        │
        ▼
Optimizer
（APO / PPO / GRPO / DPO / RL）
        │
        ▼
Model / Prompt Update
```

三个角色的职责边界：

- **Evaluator**：产生**评价信号（evaluation signal）**——回答 "How good is this answer?"
- **Reward Function**：把一个或多个评价信号**转换成训练所需的奖励信号（reward signal）**——回答 "How should the optimizer learn?"
- **Optimizer**：真正消费 reward 去更新 prompt、policy 或模型权重。

核心认识一句话：

> **Rubric Evaluator 不是 Reward Function 的竞争者，而是 Reward Function 最重要的上游来源之一。**

这也解释了一个产品现象：Azure AI Foundry 提供 [Rubric Evaluator](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rubric-evaluators) 评估 Agent（输出 0~1 归一化分数），而 APO / RL 框架可以直接消费这个分数作为训练信号——评估产品和训练框架天然接得上。

## 二、Evaluator 和 Reward Function 的三层区别

两者容易混淆，因为很多时候 reward 就"等于"评估分。但职责、输入、输出三层都不同：

### 2.1 职责不同（最重要）

| | Evaluator | Reward Function |
|---|---|---|
| 回答的问题 | How good is this answer? | How should the optimizer learn? |
| 所属领域 | Evaluation（评价） | Optimization（训练） |
| 产出去向 | 报表、监控、人的决策 | 训练循环（排序、梯度、策略更新） |

这个分工正是 [[reward-design-three-inputs]] 中"两本账分家"的理论根基：**验收分（evaluation 口径）逐字节不动保历史可比，优化 reward 单独按信噪比设计**——两本账对应链路上两个不同的节点，本来就不该是同一个函数。

### 2.2 输入不同

Evaluator 通常只看 Question + Answer（最多加上对话历史）。Reward Function 的输入面宽得多，尤其在 Agent RL 里：

```
reward = f(
    answer_score,      # 来自 evaluator
    trajectory,        # 完整轨迹
    tool_calls,        # 工具调用是否正确/冗余
    latency,           # 延迟
    cost,              # 成本
    ground_truth,      # 有 GT 时
)
```

典型组合：`reward = answer_score + tool_score − λ₁·latency − λ₂·cost`。**Rubric 分数可以只是 reward 的一个组成部分**——回答质量 0.46 分，工具乱调十次再扣一截。

### 2.3 输出不同

- Evaluator 输出可以很富：逐维分数 + 理由 + 结构化 JSON（`Accuracy:4, Safety:5, Reason:...`）。
- Reward Function 最终必须坍缩成**一个标量**：`0.87`。RL 只认识 scalar。

但"富输出"在坍缩前有独立价值：APO 的文本梯度直接消费 judge 的批评文字（不只是分数），逐维分数还可以用于反思桶归因——扔掉这些信息再去做 prompt 优化，等于自废武功。

## 三、agent-lightning 视角：reward 从哪来，框架不管

[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] 讲过 agent-lightning 的 method-agnostic 设计，落到 reward 上就一句话：**框架只要求 `reward: float`，从哪来完全不限制**。

APO 的循环：

```
Prompt → Agent Rollout → Reward Function → reward: float
   ↑                                            │
   └── New Prompt ← Textual Gradient ←──────────┘
```

APO 拿到 reward 只做一件事：`sorted()[:beam_width]`（见 [[Agent Lightning系列04：APO源码剖析——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景]]）。所以 reward 可以来自：

- Exact Match / 通过率（可验证，零噪声）
- Metric（F1、结构化字段命中）
- LLM Judge 裸打分
- **Rubric Evaluator**（LLM Judge + 结构化评分标准）
- Human（最贵，只用于校准）

把 Rubric Evaluator 装进 reward function 的形态：

```
Rubric：Accuracy 40% ｜ Groundedness 30% ｜ Helpfulness 20% ｜ Safety 10%
LLM Judge 逐维打分：5 / 4 / 4 / 5（1~5 分制）
加权归一化 → reward = 0.92 → 喂给 APO / RL
```

**同一份 reward 沿 APO → SFT（拒绝采样）→ RL 阶梯复用**，只是消费方式不同：APO 用它排序 prompt 候选，RAFT 用它筛样本造标签（[[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]]），RL 用它算 advantage 更新权重。这是 agent-lightning 阶梯"资产可沿用"的根本原因——**评估资产（evaluator/rubric）是三种优化方法共享的地基**。

## 四、按 Optimizer 看 reward 的消费方式

| Optimizer | 消费方式 | 对 reward 的要求 |
|-----------|---------|-----------------|
| **APO** | 候选 prompt 在验证集上跑分 → `sorted()` 剪枝 | 只需能排序；但噪声会直接造成排序翻转 → 摆动 |
| **PPO** | reward → advantage → 策略梯度 | 标量、逐样本；对噪声和 scale 敏感，常需 normalize |
| **GRPO** | 组内相对比较算 advantage（省 critic） | 同一 prompt 多个 rollout 的**相对**质量要可信 |
| **DPO** | 不要标量，要偏好对（chosen > rejected） | pairwise 评估天然适配；pointwise 分数需转成偏好对 |
| **RLVR** | 可验证 reward（对/错、过/不过） | 零噪声但只覆盖有 GT 的封闭任务 |

两个工程要点：

1. **评估策略（Layer 2）和 optimizer 有天然配对**——Pointwise ↔ PPO/GRPO 的标量 reward；Pairwise ↔ DPO 的偏好对；Reference-based ↔ RLVR。选评估策略时就已经在选下游优化路线。
2. **噪声在不同 optimizer 里的放大系数不同**——APO 的 beam search 每轮基于噪声排序剪枝，错杀好候选无法挽回；GRPO 组内相对比较能抵消一部分系统性偏差（如 verbosity bias 对组内所有 rollout 同向作用）；但没有任何 optimizer 能靠算法层面免疫低质量 reward。地基还是那句话：**先把 reward/eval 做稳，再谈优化**（扩大评估集、同 prompt 多次采样取均值、拆分 judge 降噪——见 [[reward-design-three-inputs]]）。

## 五、Rubric as Reward：2025~2026 的研究趋势线

以前 Evaluation 和 Reward Modeling 是两个社区：evaluation 打完分出报表就结束，reward 靠人工偏好数据训 reward model。2025 年起两条线合流——**rubric 从评估工具升级为 reward 的结构化来源**，解决的是"无法验证的开放域任务（写作、医疗、深度研究）怎么做 RL"这个硬问题。

已核实的代表工作（时间线）：

| 工作 | 机制 | 要点 |
|------|------|------|
| [Rubrics as Rewards（RaR）](https://arxiv.org/abs/2507.17746)（Gunjal et al., 2507.17746） | 每个 prompt 配一份结构化 checklist rubric，GRPO 训练 | 比裸 LLM-judge reward 在 HealthBench 上相对提升 28%；rubric 让小 judge 逼近大 judge 的判断质量 |
| [Reinforcement Learning with Rubric Anchors](https://arxiv.org/abs/2508.12790)（Huang et al., 2508.12790） | 10k+ 规模 rubric 库作为 reward 锚点，扩展 RLVR 到开放域 | 显式讨论 rubric 时代的 reward hacking 与防御 |
| [OpenRubrics](https://arxiv.org/abs/2510.07743)（Liu et al., 2510.07743） | 对比式生成 rubric（Contrastive Rubric Generation），合成可扩展 rubric 数据 | rubric 生产的自动化——rubric 本身也要规模化 |
| [Auto-Rubric](https://arxiv.org/abs/2510.17314)（Xie et al., 2510.17314） | 从偏好数据反推可泛化评价标准 | rubric 不再纯手写，从数据中学 |
| [Dr Tulu](https://arxiv.org/abs/2511.19399)（Shao et al., 2511.19399） | RL with Evolving Rubrics：rubric 随训练动态演化 | 静态 rubric 会被 policy 摸透，演化 rubric 对抗 hacking |
| [Many Voices, One Reward（MRRG）](https://arxiv.org/abs/2607.01830)（2607.01830） | 多角色（multi-role）生成 rubric 再聚合成 reward | 单一视角 rubric 有盲区，多角色互补降偏差 |

趋势读法：

```
第一阶段：LLM → Judge → 8.5 分 → 出报表（评估到此为止）
第二阶段：Rubric Judge → scalar reward → GRPO/PPO（rubric 进训练循环）
第三阶段：rubric 自动生成 + 动态演化（rubric 本身成为被优化的对象）
```

演进逻辑与 [[automatic-prompt-optimization]] 的"评估信号成熟度决定优化档位"一脉相承：**训练方法在阶梯上走多远，取决于 reward 质量能撑多远；而 rubric 是提升 LLM-judge 型 reward 信噪比的最有效结构化手段**——它把"凭感觉打分"变成"逐维、有锚点、可解释的打分"，正对应 [[Prompt优化成熟度阶梯——从vibe check、LLM-judge到数据闭环：APO与SkillOpt前置篇]] 里 L1→L2 的关键跃迁。

## 六、Reward Hacking：rubric 进训练循环后的新风险

Rubric 只做评估时，打分偏差顶多误导报表；进了训练循环，policy 会**主动学会迎合 rubric**——这就是 reward hacking 在 rubric 时代的新形态：

- rubric 有 "Completeness" 维度 → 模型学会堆砌关键词、面面俱到地灌水，牺牲准确性和简洁性；
- rubric 有 "引用依据" 维度 → 模型学会伪造看似合理的引用格式；
- rubric 等级锚点写得含糊 → judge 打分被答案的自信语气带偏。

这是 [Rubric Anchors](https://arxiv.org/abs/2508.12790) 和 [Dr Tulu](https://arxiv.org/abs/2511.19399) 重点处理的问题，防御手段与 [[generation-evaluation-separation]] 的原则同构：

1. **评估者与被优化者分离**——judge 模型 ≠ policy 模型，避免 self-preference 被 RL 放大；
2. **确定性锚点混入**——rubric 分数与规则分（格式、可验证子项）混合，规则分 hack 不动；
3. **rubric 动态演化**——静态 rubric 会被摸透，训练过程中更新 rubric（Dr Tulu 路线）；
4. **人工盲选校准**——judge 与业务盲选一致率达标才获得代理资格（[[reward-design-three-inputs]] 的 ≥85% 门槛），且训练前锁版。

本质上，rubric 时代的 reward hacking 是控制论老问题的重演：**任何被度量的指标一旦成为优化目标，就不再是好的度量**（Goodhart's Law）。rubric 缓解但不消除它——rubric 把"模糊的单一分数"拆成"逐维、有锚点的结构化分数"，提高了 hack 的难度，但也只是提高难度而已。

## 七、数据 + 评估：所有 Solution 的公共地基

把镜头拉远，一个更根本的判断是：**数据 + 评估是 AI 系统最重要的组成部分**。模型和算法在快速商品化——基座模型可以换、优化算法（PPO/GRPO/APO）是公开的、harness 框架层出不穷；真正沉淀下来、换不掉的差异化资产只有两样：**你的数据，和你的评估体系**。而这两者互为因果：评估筛出好数据，数据反过来校准评估。

按 solution 逐条看，评估都坐在关键位置上：

| Solution | 评估扮演的角色 | 没有评估会怎样 |
|----------|--------------|---------------|
| **RAG** | Faithfulness / Groundedness / Context Precision & Recall 是唯一能回答"检索到底有没有用"的手段 | 调 chunk size、调 top-k、换 embedding 全是盲调——改了不知道好没好 |
| **Agent** | Task Success、Tool Correctness、Planning Quality 定位失败环节；τ-Voice 基准发现语音 Agent 79~90% 失败源于 Agent 行为而非 ASR/TTS——这种归因结论只能靠评估体系产出 | harness 迭代失去方向，只能靠 demo 印象判断改进 |
| **APO** | reward 直接决定 beam search 的排序剪枝 | 摆动、错杀好候选（APO 摆动第一大原因就是评估噪声） |
| **SFT（拒绝采样）** | **评估器就是数据工厂**——RAFT 用 reward 从 rollout 中筛出高分样本当训练标签，数据质量 = 评估质量（[[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]]） | 筛不出可信标签，微调喂进去的就是噪声 |
| **RL** | reward 是训练信号本身，评估质量直接是模型能力上限 | reward hacking、训崩、收敛到错误行为 |

注意一个贯穿性的结构：**沿 APO → SFT → RL 阶梯，评估信号的"消费强度"逐级升高**——APO 只用它排序（错了下轮还能纠正），SFT 用它造数据（错误固化进权重一次），RL 用它逐步更新策略（错误被反复放大）。所以越往阶梯上方走，前置的评估投资越不可省略。这也是为什么 [[reward-design-three-inputs]] 强调 reward 是 APO/SFT/RL 三者**共享的地基**：地基打一次，三层楼共用；地基歪一寸，越高的楼歪得越厉害。

数据和评估之间还有一个飞轮关系，值得单独点出：

```
评估 ──筛选──▶ 高质量数据（拒绝采样、bad case 挖掘）
  ▲                        │
  └────校准（盲选 A/B、eval set 扩充、rubric 迭代）────┘
```

L1 阶段人工看 case 攒下的评估直觉 → 变成 L2 的 eval set 和 rubric → 评估器筛数据喂训练 → 训练暴露新 bad case → 回填 eval set。**这个闭环本身就是知识库/资产的积累过程**——模型会过时，这个闭环里沉淀的数据和评估标准不会。

## 八、小结

1. **统一链路**：Agent Rollout → Evaluator（产生评价信号）→ Reward Function（转换成奖励信号）→ Optimizer（APO/PPO/GRPO/DPO 消费信号）→ Update。Evaluation 和 Training 不是两个世界，是一条管道的上下游。
2. **三层区别记牢**：职责（评价 vs 训练）、输入（QA 对 vs 轨迹+延迟+成本）、输出（富结构 vs 单标量）。
3. **agent-lightning 只认 `reward: float`**：Rubric Evaluator 是 reward 的上游实现之一，同一份评估资产沿 APO → SFT → RL 阶梯复用。
4. **Rubric as Reward 是合流趋势**：RaR、Rubric Anchors、OpenRubrics、Dr Tulu、MRRG——rubric 从评估工具变成 reward 来源，再变成被优化的对象本身。
5. **代价是 reward hacking**：rubric 进训练循环后必须配防御——judge/policy 分离、确定性锚点、动态演化、盲选校准锁版。
6. **数据 + 评估是最重要的资产**：模型和算法商品化，数据与评估体系是换不掉的差异化资产；沿 APO → SFT → RL 阶梯评估信号消费强度逐级升高，评估投资越发不可省略；"评估筛数据、数据校准评估"的飞轮是知识与资产积累的本体。
