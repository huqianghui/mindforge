---
title: Agent Lightning 算法深解：APO = 文本梯度 + Beam Search，以及与其他搜索策略的对比
created: 2026-06-25
tags: [agent-lightning, APO, beam-search, textual-gradient, prompt-optimization, search-strategy, ProTeGi, tree-of-thought, self-consistency, algorithm]
---

# Agent Lightning 算法深解：APO = 文本梯度 + Beam Search，以及与其他搜索策略的对比

> APO 不是 beam search——beam search 只是 APO 内部的搜索内核。本篇拆开「宏观优化方法 vs 微观搜索策略」的层级关系，讲透文本梯度的 Critic→Editor 机制，并把 beam search 放进搜索策略谱系里，和 greedy / BFS / DFS / Tree-of-Thought / Self-Consistency 逐个对比。

---

## 〇、为什么单开这一篇

[[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]] 已经把 APO 的 **beam search 内核**（三参数、三阶段、调用次数）和**实践踩坑**讲透了。但有两个更深的算法问题没展开，而它们恰恰是理解 APO 本质、以及向客户解释"为什么是 beam search 而不是别的"的关键：

1. **APO 和 beam search 到底是什么关系？** 很多人把两者画等号，其实是层级错位。
2. **beam search 在搜索算法谱系里处于什么位置？** 为什么 APO 选它，而不选 greedy / DFS / Tree-of-Thought？

本篇是系列01 §二的**算法理论补充**——不碰实践接线，只讲机制与对比。

---

## 一、先厘清混淆：APO ≠ Beam Search

### 1.1 层级关系：方法 vs 策略

**APO（Automatic Prompt Optimization）是一个完整的优化方法**，它包含两个本质不同的子机制：

1. **怎么产生更好的候选**——靠「文本梯度」：让强模型诊断当前 prompt 哪里差（Critic），再据此改写（Editor）。这是 APO 的**生成机制**。
2. **怎么在候选里挑、怎么管理搜索过程**——靠「beam search」：维护一个固定大小的候选集，每轮扩展、打分、剪枝。这是 APO 的**搜索策略**。

**beam search 只承担第 2 件事。** 它本身不知道"prompt 怎么变好"，它只负责"在一堆已生成的候选里，按分数保留 top-k、决定下一轮从谁出发"。

> 一句话：**APO = 文本梯度（生成方向）+ beam search（搜索管理）**。把 APO 等同于 beam search，等于把"梯度下降训练"等同于"Adam 优化器"——后者只是前者的一个零件。

### 1.2 类比神经网络训练

这个层级关系，和深度学习训练一一对应，借此最好记：

| 神经网络训练 | APO | 职责 |
|------------|-----|------|
| 损失函数 / 反向传播算出的**数值梯度** | **文本梯度**（Critic 的自然语言批评） | 指出"往哪个方向改" |
| 优化器（SGD/Adam）按梯度**更新权重** | **Editor** 按批评**改写 prompt** | 执行一步更新 |
| 学习率调度 / early-stopping / checkpoint 选优 | **beam search** 的剪枝选优 + history-best 簿记 | 管理搜索过程、挑最优 |
| 验证集 loss | **Judge/Evaluator** 打的分 | 衡量好坏 |

> 关键洞察：**梯度负责"方向"，搜索策略负责"探索与保留"**。APO 把数值梯度换成了文本梯度（因为 prompt 是离散文本、不可微），但"方向 + 搜索"这个二分结构没变。

### 1.3 宏观 APO vs 微观 beam search（对照表）

| 维度 | APO（宏观方法） | beam search（微观策略） |
|------|----------------|------------------------|
| 是什么 | 完整的 prompt 优化方法 | 一种启发式搜索策略 |
| 解决什么 | "如何自动把 prompt 变好" | "如何在候选集里高效搜索保留" |
| 核心动作 | 生成文本梯度 + 改写 + 搜索 | 扩展 → 打分 → 剪枝 top-k |
| 关键参数 | gradient_model / apply_edit_model | beam_width / branch_factor / beam_rounds |
| 可替换性 | 是 agent-lightning 内置算法之一 | 理论上可换成 greedy / 进化算法等 |
| 源码位置 | `algorithm/apo/apo.py` 整体 | `_sample_parent_prompts` / `_evaluate_and_select_beam` |

---

## 二、文本梯度机制：Critic → Editor

### 2.1 数值梯度 vs 文本梯度

| | 数值梯度（DL） | 文本梯度（APO） |
|---|--------------|----------------|
| 形态 | 一个浮点向量 ∂L/∂θ | 一段自然语言批评（"你在 X 场景选错了房间，因为没考虑无障碍约束……"） |
| 谁产生 | 自动微分引擎 | **Critic 模型**（gradient_model，如 gpt-5-mini） |
| 怎么用 | 优化器 θ ← θ − η·∇ | **Editor 模型**（apply_edit_model）读批评、改写 prompt |
| 前提 | 参数可微 | 参数（prompt）离散不可微，所以借 LLM 推理来"模拟"方向信号 |

> 这套思路源自 **ProTeGi**（论文 *"Automatic Prompt Optimization with Gradient Descent and Beam Search"*，Pryzant et al. 2023）——它的核心 idea 就是：既然 prompt 不可微，就让一个强 LLM 充当"梯度算子"，用自然语言告诉你"哪里错、往哪改"。

### 2.2 四个角色及其协作

APO 一轮迭代里，有四个清晰的角色在流水线上接力。**注意 Judge 和 Critic 是两件事**——前者给"分数"（标量），后者给"方向"（文本），常被混为一谈：

| 角色 | 别名 | 输入 | 输出 | 对应模型参数 | 类比 |
|------|------|------|------|-------------|------|
| **Evaluator / Judge** | 打分器 | agent 的 rollout 输出 + 标准答案 | **数值分**（0~1） | grader 的 `model`（如 gpt-4.1-mini） | 考试判分老师 |
| **Critic / Teacher** | 批评者 | 低分样本的 rollout 轨迹 | **文本梯度**（自然语言诊断） | `gradient_model`（如 gpt-5-mini） | 写评语的导师 |
| **Editor** | 改写者 | 旧 prompt + Critic 的批评 | **新 prompt 候选** | `apply_edit_model`（如 gpt-4.1-mini） | 按评语修改作文 |
| **Beam Search** | 搜索器 | 旧 beam + 新候选 + 各自分数 | **top-k 候选**（下一轮 beam） | 无模型，纯算法 | 选拔赛裁判 |

**数据怎么流转**（结合系列01 §二的三阶段）：

```
                    [Judge] 打分
                       │
   ┌───────────────────┼───────────────────┐
   │ 低分样本轨迹        ▼                    │
   │            ┌──────────────┐             │
   └───────────▶│   Critic     │ 文本梯度    │
                │ gradient_model│────────┐   │
                └──────────────┘         ▼   │
                              ┌────────────────┐
                旧 prompt ───▶│    Editor      │
                              │ apply_edit_model│
                              └───────┬────────┘
                                      │ 新候选 prompt
                                      ▼
                              ┌────────────────┐
              旧 beam ───────▶│  Beam Search   │──▶ 下一轮 top-k beam
              新候选 ────────▶│  剪枝选优       │
                              └────────────────┘
```

> 一个常被忽略的接缝：Critic 看的不是原始字符串，而是 **`TraceToMessages` adapter 把 rollout 的 OpenTelemetry spans 还原成的对话 messages**（系列01 §2.2 已点出）。这就是 method-agnostic 的体现——同一份 trace，APO 走 messages 喂 Critic，RL/SFT 走 triplet 喂训练（详见 [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] §2.5）。

### 2.3 为什么 Critic 和 Editor 要分成两个模型

源码里 `gradient_model` 和 `apply_edit_model` 是分开配置的（系列01 §1.4 的 deployment 表也分开列），这不是冗余：

- **Critic 要强推理**：诊断"prompt 为什么导致选错房间"需要深度分析，所以默认用更强的 gpt-5-mini。
- **Editor 只要会改写**：拿到明确批评后照着改，是相对机械的任务，用便宜的 gpt-4.1-mini 即可。
- **职责分离也利于约束**：系列01 §4.5 的踩坑揭示——非法模板（正则 `{4}`、JSON 花括号）的源头常常在 **Critic 的批评原话**里，所以 `gradient_prompt_files` 和 `apply_edit_prompt_files` 要**两端同时约束**。分两个模型 = 分两个可独立约束的注入点。

---

## 三、端到端走一遍：以 text-to-SQL 为例

把上面四个角色串进一个具体任务——**自然语言转 SQL** 的 agent prompt 优化：

**任务**：给定数据库 schema + 用户问题（"上个月销售额前 3 的产品"），agent 生成 SQL；grader 用执行结果是否匹配标准答案打分。

**第 0 步｜seed prompt**（极简 baseline）：
> "You are a SQL assistant. Given the schema and question, write a SQL query."

**第 1 轮迭代**：

1. **rollout**：seed prompt 在一批训练问题上跑，agent 生成 SQL。
2. **Judge 打分**：执行 SQL 对比标准结果。发现「带时间范围的问题」大量失败——agent 漏写 `WHERE date BETWEEN ...`，或把"上个月"理解成日历月而非滚动 30 天。
3. **Critic 写文本梯度**（gradient_model 看失败轨迹）：
   > "The prompt fails on time-bounded questions because it gives no guidance on interpreting relative dates ('last month'). It also omits instruction to always include explicit date filters. Add: (1) define 'last month' as the previous calendar month; (2) require an explicit WHERE clause for any time reference; (3) prefer `LIMIT` for top-N questions."
4. **Editor 改写**（apply_edit_model 按批评改）：产出新候选 prompt，加入"日期解释规则 + 强制 WHERE + top-N 用 LIMIT"。
5. **beam search 选优**：新候选 + seed 一起在验证集打分，top-`beam_width` 进下一轮。若新候选确实在时间类问题上涨分，它就留在 beam 里。

**第 2 轮**：从存活的候选再出发，Critic 可能转而批评"JOIN 多表时漏了别名"——**每一轮的文本梯度都对准当前 beam 的最大短板**，像梯度下降一步步沿最陡方向走。

> 这个例子凸显文本梯度的优势：它不仅说"错了"（数值梯度也能），还说**"为什么错、具体怎么改"**（数值梯度做不到）。代价是每一步都要调强模型推理，比数值梯度贵几个数量级——所以才需要 beam search 这种**有预算约束的搜索**来控制爆炸（见下一节）。

---

## 四、Beam Search vs 其他搜索策略

这是本篇的重点。把 beam search 放进搜索算法谱系，才能回答"APO 为什么选它"。

### 4.1 搜索策略谱系

所有这些策略都在解同一个问题：**在一棵"候选树"里找最优节点**（这里节点 = 一个 prompt 候选，边 = 一次"求梯度+改写"）。区别只在**每一层保留几个、怎么扩展**。

| 策略 | 每层保留 | 扩展方式 | 内存 | 找到最优概率 | 典型场景 |
|------|---------|---------|------|------------|---------|
| **Greedy（贪心）** | 1（只留当前最优） | 只从最优节点扩展 | O(1) | 低（易陷局部最优） | 资源极紧、可接受次优 |
| **BFS（广度优先）** | **全部**（整层不剪枝） | 逐层全展开 | O(b^d) 爆炸 | 高（穷举） | 树很浅、分支少 |
| **DFS（深度优先）** | 1 条路径走到底 | 沿一条路径深入，回溯 | O(d) | 中（看回溯策略） | 找任一可行解、树很深 |
| **Beam Search** | **top-k**（k=beam_width） | 从 k 个父节点各扩展 branch_factor 个 | O(k·b) 可控 | 中高（k 调探索宽度） | **候选多、评估贵、要控成本**（APO 选它） |
| **Tree-of-Thought (ToT)** | 可变（含前瞻/回溯/自评估） | LLM 自评估决定扩展哪些分支 | O(k·b) + 评估开销 | 高（但贵） | 需要多步推理回溯的复杂任务 |
| **Self-Consistency** | 不剪枝，采样多条独立路径 | 并行采样 N 条，**投票/聚合** | O(N) | 高（靠多数表决降方差） | 单步任务、答案可投票聚合 |

### 4.2 逐个对比：为什么 APO 选 beam search

**vs Greedy（为什么不只留 1 个）**：
greedy 等价于 `beam_width=1`。prompt 评估有强噪声（系列01 §4.4 实测同 prompt 摆动 0.2），只留 1 个 = 把全部赌注押在一次带噪打分上，极易被"虚高候选"带偏。**beam_width>1 保留多个候选 = 给噪声留缓冲，是对抗 max-over-noise 的结构性防御。**

**vs BFS（为什么不全留）**：
BFS 不剪枝，候选数按 `branch_factor^rounds` 指数爆炸。APO 每个候选的评估要在验证集上跑 N 条 rollout（每条 ≈ 3 次 API 调用），成本无法承受。**beam search 用固定 beam_width 把每层宽度钉死，把指数爆炸压成线性 O(k·b·rounds)**——这是 APO 选它的**首要理由：评估太贵，必须控宽度**。

**vs DFS（为什么不深挖一条）**：
DFS 沿一条路径走到底再回溯。但 prompt 优化没有明确的"终止深度"，且一条路径可能整条都在次优区。beam search 的**逐层并行扩展**能同时探索多个改写方向（一个候选可能在解决"时间过滤"、另一个在解决"JOIN 别名"），比单路径深挖更鲁棒。

**vs Tree-of-Thought（为什么不用更聪明的搜索）**：
ToT 更强（带 LLM 自评估、前瞻、回溯），但每个节点的"自评估"又要调 LLM，开销在 beam search 之上再叠一层。**APO 的瓶颈本就是评估成本，引入 ToT 是雪上加霜。** APO 把"评估"外包给了便宜的 Judge + 验证集打分，而非让搜索器自己反思——这是工程上的成本权衡。ToT 更适合单次推理任务，APO 是离线批量优化，目标函数不同。

**vs Self-Consistency（这俩其实正交，可叠加）**：
Self-Consistency 不是"选哪个候选"的策略，而是"**同一候选评估几次取聚合**"降方差的手段。它和 beam search 不冲突——系列01 §4.4.2 给的降噪建议"每个候选多采样 k 次取均值"正是 self-consistency 思路。**beam search 管"候选间选择"，self-consistency 管"单候选评估降噪"，二者可以叠在一起用。**

### 4.3 候选选择的更深一层：bandit 视角

beam search 的"打分排序取 top-k"是最朴素的选择方式。当评估带噪且预算有限时，候选选择本身可以建模成**多臂老虎机（multi-armed bandit）**问题——这是学术上对"如何在噪声下高效选优"的更优解：

| 方法 | 思路 | 解决什么 |
|------|------|---------|
| **朴素 top-k**（beam search 默认） | 每个候选评固定次数，按均值排序 | 简单，但好候选和差候选花一样多预算，浪费 |
| **UCB（Upper Confidence Bound）** | 优先评"均值高 **或** 不确定性大"的候选 | 把评估预算动态分配给有希望的候选 |
| **Successive Rejects / Halving** | 分轮淘汰，每轮砍掉一半最差的，预算集中到存活者 | 在固定总预算下最大化"选对最优"的概率 |

> 这层是 APO 当前实现没做、但**值得向客户提的优化点**：当验证集大、候选多、噪声强时，把 beam search 的"等额评估"换成 UCB/Successive Rejects 式的"自适应预算分配"，能用同样的 API 成本更可靠地选出真·最优。系列01 §4.4 的"虚高"问题，本质就是"等额评估 + max 选择"在统计上的上偏，bandit 方法正是对症解药。

### 4.4 一张图总结搜索策略选型

```
评估便宜 + 树浅          →  BFS（穷举最稳）
评估便宜 + 要任一解      →  DFS
评估贵 + 候选多（APO）   →  Beam Search（控宽度）★
需多步推理回溯          →  Tree-of-Thought
单候选评估有噪声        →  叠加 Self-Consistency 降方差
噪声下选优 + 预算紧      →  Beam Search + UCB/Successive Rejects
极度资源受限 + 可接受次优 →  Greedy（beam_width=1）
```

---

## 五、小结

1. **APO ≠ beam search**：APO 是完整优化方法 =「文本梯度（生成方向）+ beam search（搜索管理）」；beam search 只是其中的搜索内核。混为一谈等于把"梯度下降"等同于"Adam"。
2. **文本梯度 = Critic 写、Editor 改**：因为 prompt 离散不可微，借强 LLM 模拟"方向信号"。Critic（gradient_model）给文本批评、Editor（apply_edit_model）执行改写、Judge 给数值分、beam search 选优——四角色接力，源自 ProTeGi。
3. **Critic/Editor 分两个模型**有意为之：Critic 要强推理（诊断），Editor 只需会改写（便宜），且分离后能独立约束两个注入点（系列01 §4.5 的两端约束）。
4. **APO 选 beam search 的首要理由是成本**：评估每个候选要在验证集上跑大量贵 rollout，beam_width 把指数爆炸（BFS）压成线性，又比 greedy 多留缓冲对抗评估噪声。
5. **谱系定位**：greedy（留 1）/ BFS（全留）/ DFS（深挖）/ beam（top-k）/ ToT（带自评估，更贵）/ self-consistency（正交降噪，可叠加）。
6. **进阶方向**：把 beam 的"等额评估 + max 选择"升级为 bandit（UCB / Successive Rejects）的"自适应预算分配"，是对症系列01「虚高」问题的统计学解药。

> 相关：[[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]]（实践 + beam search 内核 + 噪声复盘）、[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]（adapter 接缝 + method-agnostic）、[[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]
