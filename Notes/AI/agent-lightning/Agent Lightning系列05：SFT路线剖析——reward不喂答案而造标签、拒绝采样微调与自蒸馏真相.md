---
title: Agent Lightning 系列 05：SFT 路线——reward 不喂答案而造标签、拒绝采样微调与自蒸馏真相
created: 2026-06-26
tags:
  - agent-lightning
  - SFT
  - rejection-sampling
  - RAFT
  - STaR
  - self-distillation
  - distillation
  - unsloth
  - LoRA
  - reward-design
  - on-policy
  - prompt-optimization
  - demystification
---

# Agent Lightning 系列 05：SFT 路线——reward 不喂答案而造标签、拒绝采样微调与自蒸馏真相

> [[Agent Lightning系列04：APO源码剖析——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景]] 把 APO 拆解成「LLM 调用 + 一个 `sorted()`」。本篇对 SFT 做一次对称的拆解：**agent-lightning 的 SFT 不是"喂标准答案让模型模仿"，而是"用 reward 当裁判，把模型自己写的、被验证正确的解题过程，造成原本不存在的模仿标签"。** 我们从两个反直觉问题切入——「模型都答对了还训练什么」「有全量数据和 ground truth 为什么只挑高分的练」——逐行打开 `examples/unsloth/` 源码，讲清拒绝采样微调（rejection sampling / RAFT / STaR）的真相、自蒸馏与强→弱蒸馏的边界，以及为什么它是上手权重微调最该先跑的一条线。

---

## 〇、为什么先写 SFT，而不是原计划的 RL

系列 02 的路线规划里，权重微调本来打算先讲 VERL（RL）。但真要上手，**SFT 是快速成功的更优起点**——这不是偷懒，是工程理性。对比两个例子的"门槛"（都在 `/tmp` 拉下来的 `microsoft/agent-lightning` v0.3.1 源码 `examples/` 下）：

| | SFT（`examples/unsloth/`） | RL（`examples/calc_x/`，VERL） |
|---|---|---|
| GPU | **16GB**（4-bit 量化 + LoRA，`unsloth_helper.py:38`） | **40GB** 起（README 明示） |
| 依赖 | unsloth + trl，**无需 VERL**（README："You will not need VERL"） | 要装 VERL（出了名地难装）+ AutoGen + MCP |
| 数据 | GSM-hard 前 64 条**已打包**进 `data_gsmhard.jsonl` | 要去 Google Drive 下 parquet 再解压 |
| 稳定性 | 监督学习，确定性强、必收敛 | reward hacking / KL 发散 / 超参敏感 |

一句话：**SFT 把所有不确定性都摁掉了**，让你能先确认"框架接没接通"，而不是被 RL 的不稳定淹没分不清"是接线错了还是 RL 没调好"。所以本系列把 SFT 提前到系列 05，VERL 顺延到系列 06。

但"容易跑"不等于"容易懂"。SFT 在 agent-lightning 里的实现藏着两个最容易拐错弯的认知点，正是本篇要讲清的。

---

## 一、最大的误解：SFT 不是"喂标准答案"，是"用 reward 造标签"

### 1.1 教科书 SFT vs agent-lightning 的 SFT

| | 教科书 SFT | agent-lightning 的 SFT（`unsloth/`） |
|---|---|---|
| 你手里有什么 | **标注好的「输入→理想输出序列」对** | 只有任务输入 + 一个 grader，**没有理想输出序列** |
| 需要 reward 吗 | **不需要**，标签本身就是答案 | **需要**，靠 reward 筛出"够好"的样本当答案 |
| 训练样本从哪来 | 人工/外部标注 | 模型自己跑 rollout，reward 筛 top-k |
| 流程 | 直接对标签做交叉熵模仿 | 生成 → 打分 → `sort by reward` 留 top → 微调 |

`sft_algorithm.py:148` 一句注释把整件事说穿了："**use the reward to select the top triplets to train on**"。`:342` 再确认："**Trains the model on top-performing examples**"。

### 1.2 `target` 是 ground-truth，但它喂的是 grader，不是 trainer

这是认知上最容易拐错的弯。看 GSM-hard 的样本数据：

```json
{
  "input": "Janet's ducks lay 16 eggs per day. She eats three ... bakes muffins ... with 4933828 ... sells the remainder at $2 per egg. How much does she make daily?",
  "code": "def solution():\n    eggs_per_day = 16\n    eggs_eaten = 3\n    eggs_baked = 4933828\n    eggs_sold = eggs_per_day - eggs_eaten - eggs_baked\n    ...\n    return result",
  "target": -9867630.0
}
```

直觉上你会问：**这个 `target` 不就是 ground-truth 吗？`code` 不就是标准解法吗？** 答案要把"两种 ground-truth"分开：

| | 给谁用 | 本例对应 |
|---|---|---|
| **任务的标准答案**（评分键） | 喂给 **grader** 算 reward | `target: -9867630.0`（正确数值） |
| **模型输出的标准答案**（模仿 label） | 教科书 SFT 喂给 **trainer** 直接模仿 | agent-lightning **没有预先给** |

源码铁证（`math_agent.py`）：

- `:123` `reward = compute_reward(result.final_output, task["target"])` —— `target` **只进 grader**。
- `:128/132` `compute_reward(result, target)`，`:145-146` 抽出数字后 `np.isclose(answer, target, rtol=1e-5)` → 命中给 `1.0`，否则 `0.0`。**精确匹配式 grader，reward 干净无噪声**。
- 关键：**那个 `code` 字段从头到尾没被引用**。模型不抄 `code`，而是自己生成解法（rollout），grader 只比对最终数字对不对。

> 所以准确说法是：**agent-lightning 的 SFT 需要 ground-truth 来"评分"，但不需要 ground-truth 来"模仿"。** `target` 是裁判手里的判分钥匙；模型交的卷子（reasoning + code）是它自己写的；只有满分卷被收进错题本，反过来让它再背一遍。`code` 是数据集自带、但本流程用不上的冗余字段。

这就是「拒绝采样微调」（rejection sampling fine-tuning，又名 RAFT / STaR）的内核：**reward 不是在"筛数据质量"，是在"生产你原本没有的训练标签"。**

---

## 二、源码全景：四步一迭代，外加那个熟悉的 `sorted`

SFT 这条线的核心是 `sft_one_iter()`（`sft_algorithm.py:135`），它干四件事（`:150` docstring）：

```
sft_one_iter()                              sft_algorithm.py:135
  ├─ 1. rollout 收集轨迹                      :168
  │    ├─ vllm_server 起模型服务              :61   （本地起当前模型供 rollout）
  │    ├─ LLM proxy 地址写进 store            :190
  │    ├─ enqueue_rollout(mode="train")       :201  ← 推任务给 runner
  │    └─ wait_for_rollouts 轮询              :213-214
  ├─ 2. 轨迹 → triplet                        :228
  │    ├─ query_spans(rollout_id)             :231
  │    ├─ data_adapter.adapt(spans)           :242  → List[Triplet]（token_ids + reward）
  │    └─ reversed(triplets) 让后置 reward 前传 :254-256
  ├─ ★ sort by reward + 切 top fraction        :294-295  ← 与 APO 的 sorted 对称！
  ├─ 3. Unsloth SFT 训练                       :307-327 （子进程 spawn，:310）
  └─ 4. 存模型 models/version_{iter+1}         :308/327
```

### 2.1 那个熟悉的 `sorted`：SFT 的"算法"也是一行排序

还记得系列 04 的结论吗——APO 的剪枝就是 `sorted(...)[:beam_width]`（`apo.py:741`）。**SFT 这条线的"算法"内核，同样是一行排序加切片**：

```python
random.shuffle(all_triplets)                                       # :293
all_triplets.sort(key=lambda x: x["reward"], reverse=True)         # :294  ★ 按 reward 降序
sliced_triplets = all_triplets[: max(1, int(len(all_triplets) * triplet_fraction))]  # :295  ★ 留 top fraction
```

`TRAIN_TRIPLET_FRACTION = 0.5`（`:354`）——只保留 reward 最高的 **50%** 轨迹拿去训练。

> 系列 04 的结论在 SFT 这条线照样成立：**SFT 的"算法"核心还是 `sort by reward` 取 top-k，区别只在 sort 完之后是「拿去微调」而不是「选 prompt」。** APO 排序选 prompt、SFT 排序筛轨迹——同一套 `sorted`，不同的下游消费。

#### 2.1.1 一个被 demo 省掉的坑：只切比例，不设阈值

这行 `sorted` 藏着一个**生产环境会咬人的坑**——它只按比例切，**没有任何 reward 阈值过滤**。源码只有一处守卫（`:291`）：空列表才报错；之后无条件 `sort` + 切 top `triplet_fraction`：

```python
if len(all_triplets) == 0:           # :291  唯一守卫——空列表才 raise
    raise ValueError("No triplets to train on.")
random.shuffle(all_triplets)         # :293
all_triplets.sort(key=lambda x: x["reward"], reverse=True)   # :294
sliced_triplets = all_triplets[: max(1, int(len(all_triplets) * triplet_fraction))]  # :295
```

后果：**如果某轮所有 rollout 都答错（reward 全 0），它照样取前 50%——而那 50% 全是 0 分垃圾**，等于拿错误轨迹做 SFT，把模型训得「更自信地答错」。

GSM-hard 例子里没炸，靠两个前提兜底：① reward 是二值 0/1，排序后 1 全排前面；② base 模型本来就能解对一部分，有正样本垫底。但**「按固定比例切」本身就有缺陷**：

- 正确率 > 50% → top 50% 全对（理想）；
- **正确率 < 50% → 保留了所有正确的，再用 0 分样本「凑满」50%（污染）**。

正确做法应是**阈值过滤**（只留 `reward > 0` 或 `reward == max`），而非固定比例。demo 为简单省掉了这步——又一个「框架给骨架、可靠性自己补」的例证（呼应系列 04 §四：难点在 reward 设计与噪声治理，不在那行 sorted）。

### 2.2 两个工程细节

- **label masking（三个字段各管什么）**：一条 HuggingFace 训练样本有 `input_ids / labels / attention_mask` 三个张量字段（`:44-57`），看 `:271-273` 的实例最直观：

  ```
  input_ids:      [151644, 872, 198, 3838, 374, 279, 74024]   # 模型读到的 = prompt + response
  labels:         [ -100, -100, -100, 3838, 374, 279, 74024]   # 前 3 个 prompt token 被 -100 盖住
  attention_mask: [    1,   1,   1,    1,   1,   1,     1]      # 全 1，标记有效位置
  ```

  - `input_ids` = 模型**读什么**（完整 prompt+response，prompt 必须在，否则没上下文）；
  - `labels` = 模型被**考什么**（`:276` `[-100]*len(prompt) + response`）。`-100` 是 PyTorch `CrossEntropyLoss` 的 `ignore_index`——**标 -100 的位置 loss 记 0**，所以只在 response token 上算 loss，模型只学「怎么答」不学「复述题」；
  - `attention_mask` = 哪些位置是真 token vs padding（`:280` 这里全 1，padding 由后续 collator 补）。

  一句话：**input_ids 是「看什么」，labels 是「考什么」，attention_mask 是「哪些位置真实存在」**——prompt masking 就是让「看」和「考」错开。
- **reward 跨轮传播**：`reversed(triplets)`（`:254-256`）让一次 rollout 里**后面轮次的 reward 往前面的轮次传**。因为多轮 agent（如先调工具再总结）只有最后一轮才拿到 reward，前面几轮没有直接分——倒序遍历把最终 reward 赋给前置轮次，这样前面的推理步骤也能被纳入"正确轨迹"。

### 2.3 它是迭代自提升，不是一次性训练

`sft_algorithm()`（`:332`）主循环 `MAX_ITERATIONS = 2`（`:351`）。**每一轮都用上一轮训出来的新模型**（`models/version_{n}`）去跑 rollout、再训成 `version_{n+1}`：

```
version_0（初始模型）→ rollout → 筛 top → 训练 → version_1
version_1（更强）     → rollout → 筛 top → 训练 → version_2
```

模型越训越强 → 生成的 rollout 越来越对 → 可用的高分轨迹越来越多 → 再训更强。**这就是 ReST（Reinforced Self-Training）/ 迭代 RAFT 的形态**——一个自举的飞轮。

### 2.4 实例剖析：input / code / target 一条数据的「三段命运」

回到 §1.2 那条 Janet 鸭子数据，把它在整条流水线里走一遍——**同一条元数据的三个字段，在不同阶段扮演完全不同的角色**：

| 字段 | rollout 阶段 | grading 阶段 | SFT 训练阶段 |
|------|-------------|-------------|-------------|
| `input`（题目） | ✅ 喂给模型当 prompt，让它解题 | —— | ✅ 进 SFT 记录的 prompt 段（被 -100 盖住） |
| `code`（数据集自带解法） | ❌ 完全不引用 | ❌ 不引用 | ❌ 不引用——**全程死字段** |
| `target`（最终数字答案） | ❌ 不给模型（给了就是泄题） | ✅ 喂 grader，`np.isclose` 判分 | ❌ 不进训练样本 |

**注意三个字段没有一个直接变成「模型要模仿的输出」**——模型要模仿的 response 是它**自己跑 rollout 生成的**（reasoning + 最终答案），经 grader 用 `target` 验证为正确后才留下。整条数据的流转：

```
元数据集记录                      rollout（模型自产）              最终 SFT 记录
┌──────────────┐                 ┌──────────────────┐          ┌──────────────────────────┐
│ input  题目   │──喂模型 prompt──▶│ 模型生成 response  │          │ input_ids = 题目+模型解法   │
│ code   解法   │  （死字段，不用） │ （reasoning+答案） │──筛 top─▶│ labels    = [-100×题目]+解法 │
│ target 答案   │──┐              └────────┬──────────┘          │ reward    = grader 给的分   │
└──────────────┘  │                       │                     └──────────────────────────┘
                  └──喂 grader 判分◀────────┘ np.isclose(答案, target)
```

**最终 SFT 记录的字段**（`HuggingFaceDatasetRecord`，`:44-57`）只有四个，没一个直接来自元数据集的原始字段：

| SFT 字段 | 来源 | 作用 |
|---------|------|------|
| `input_ids` | 元数据 `input` + 模型自产 response 的 token | 模型读到的完整序列 |
| `labels` | 同上，但 prompt 段全填 `-100` | 只在 response 上算 loss |
| `attention_mask` | 全 1 | 标记有效位置 |
| `reward` | grader 用 `target` 判出的分 | 排序筛 top-k 用，**不进 loss** |

> 一句话收口：**元数据集只提供「题目 + 评分钥匙」，训练用的「答案」是模型自己造、reward 认证的。** 这就是 §一 结论的具象版——SFT 需要 ground-truth 来评分（`target`），不需要 ground-truth 来模仿（response 自产）。

### 2.5 带工具调用（MCP / function-call）的 SFT 数据长什么样

math_agent 实际是个**带工具的 agent**——它通过 MCP 调用计算器（`math_agent.py:96-120`，`MCPServerStdio` + `uvx mcp-server-calculator`），vLLM 也开了工具解析（`:69-70` `auto_tool_choice=True, tool_call_parser="hermes"`）。那么**工具调用步骤算 SFT 内容吗？** 算，但只算「模型自己生成的那部分」。

机制还是 `:275`——**每个 LLM 调用 = 一个 triplet**，`response` 是模型生成的、`prompt` 是喂给它的：

| 内容 | 落在哪 | 算 loss? |
|------|--------|---------|
| 模型**决定调用工具**（function_call 名 + 参数） | 某轮的 `response` | ✅ 训练 |
| 工具**返回值**（observation，如计算器返回 484） | 下一轮的 `prompt` | ❌ 被 -100 盖住 |
| 模型**基于结果给最终答案** | 再下一轮的 `response` | ✅ 训练 |

**SFT 学的是「何时调用、怎么格式化调用、拿到结果后怎么收尾」，不学「背工具输出」**——工具结果是外部事实，被 mask 掉只当条件上下文。

**具体例子**：任务「16 \* 24 + 100 等于几？」，模型用 calculator。这一次 rollout 产出**两条** triplet：

```
Triplet A（决定调用工具这轮）
  input_ids = [system+tools schema][user:"16*24+100=?"][assistant: calculator(expression="16*24+100")]
  labels    = [   -100 × (system+schema+user 全部)    ][assistant function_call 的 token_ids]
  → 学：看到题 + 工具 → 发出这个调用

Triplet B（拿到结果收尾这轮）
  input_ids = [...前面全部 + tool 返回 "484"][assistant: "### 484 ###"]
  labels    = [ -100 × (前面全部，含工具返回 484) ][assistant "### 484 ###" 的 token_ids]
  → 学：看到工具返回 484 → 输出 "### 484 ###"（484 在 prompt 里被盖住，不是背出来的）
```

**换了 MCP / function 还能迁移吗？——推理模式可迁移，调用语法不可迁移**：

1. **改函数签名/参数**（`calculator(expression=...)` → `calc(expr=...)`）：学到的字面调用格式 token 不再匹配 → 退化；高层推理（「算术 → 用计算器」）部分迁移，精确语法要重学。
2. **整套换 MCP server**（不同工具集）：学到的工具选择策略是为旧工具集训的 → 基本不迁移，甚至有害（模型去调不存在的工具）。

> **铁律：在工具上做 SFT = 把「当前工具契约」烧进权重，契约一变就得重训。** 所以先把工具 schema 定稳、版本化，再 SFT；可迁移的只有推理套路，不是调用语法。

### 2.6 单轮记录 vs 多轮记录：拆分粒度与对最终模型的影响

§2.5 的例子是**每轮一条**（称 A 法）：一次带工具的 rollout 切成 2 条独立 SFT 记录。源码确认（`sft_algorithm.py`）：`triplets = data_adapter.adapt(spans)`（`:242`）把一次 rollout 切成 `List[Triplet]`，`for triplet in reversed(triplets)`（`:256`）逐个 `all_triplets.append`（`:277`）——**N 轮 = N 条记录**。但「整段多轮拼成一条」（称 B 法，trl multi-turn SFT 常见）也合法。两种拆法对**最终模型效果**有没有差别？

#### 先纠正一个问法：拆分在 adapter，不在模型

模型 / `SFTTrainer` **不理解「轮次」**——它只吃 `{input_ids, labels, attention_mask}`，做标准 next-token + label mask，不知道这条是第几轮、是不是 tool_call。**要 A 还是 B 取决于 `TraceToTriplet` adapter（`:36/:242`）怎么切 trace**，不是模型内部能「自动拆成多步」。拆分是数据侧的事。

| | A. 每轮一条（agent-lightning 用） | B. 整段一条（trl multi-turn 常见） |
|---|---|---|
| 一条记录 | 一次 LLM 生成（一个 triplet） | 整段多轮对话 |
| 算 loss 的 token | 仅本轮 assistant | 所有轮 assistant（user/tool 段 mask） |
| 前缀 | 轮2 把轮1+工具返回重塞进 prompt（重复编码） | 前缀只编码一次 |
| reward 粒度 | 每 triplet 一个（可按轮筛） | 整段一个 |

#### 第一层：token 梯度等价——不影响「能不能学会」

causal LM 的 loss 是**每个 response token 独立的交叉熵**，都以左侧为上下文。只要 A 法的轮2 记录把**真实的轮1+工具返回**放进 prompt（`:275` 确实如此），那「轮2 各 token 的梯度」在 A、B 里**完全相同**——同样 token、同样 `P(轮2 | 轮1, 工具结果)`。**所以 A 不破坏多步能力**：推理时模型本就逐轮自回归，A 训的正是每轮的条件分布。

> 真正决定多步能力的是**前缀是不是 on-policy**——A、B 都用模型自产轨迹当前缀（拒绝采样的天然属性），这比拆法重要得多。

#### 第二层：真实但二阶的差异（长轨迹才显著）

token 梯度等价，不代表训练分布等价：

| 差异 | A（每轮一条） | B（整段一条） | 对效果的影响 |
|------|--------------|--------------|------------|
| **长对话权重** | 5 轮→5 样本，**长对话被上采样** | 每段恒 1 样本，对话间等权 | A 让模型偏向长任务风格 |
| **短轮 vs 长轮** | 两轮独立样本，短 tool_call 轮**不被稀释** | 一序列里长答案轮 token **淹没**短轮 | A 给「学会调工具」相对更高权重 |
| **算力** | 轮2 重复编码前缀，随轮数膨胀 | 前缀只算一次 | **长 agent 轨迹下 B 明显省** |

**还有一个 A/B 共有的坑**（不是拆法差异）：**跨轮 exposure bias**——纯 SFT 只见「正确前缀」，推理时若轮1 生成略偏，轮2 没被训过「从错误前缀恢复」。A、B 都有，**只有 RL（系列06）能治**（它见自己的错）。

#### 实践结论

- **短任务（2 轮数学）**：A/B 差异可忽略。
- **长 agent 轨迹**：**B（多轮 packing + assistant-only mask）通常更优**——省算力、分布更忠实、不被长对话上采样带偏。
- **agent-lightning 偏选 A**，不是因为训得更好，而是为了 **①与 RL 统一 triplet 表示（method-agnostic）②reward 跨轮传播需要 per-turn triplet**（`reversed`，`:254-256`）。这是为框架一致性付的工程税，不是为模型效果做的选择。

> 一句话：**A、B 在 token 梯度上等价，最终能力主要由 on-policy 前缀决定；差异在训练分布权重与算力——长轨迹选 B，要 RL/per-turn reward 选 A。**

---

## 三、第一个反直觉问题：模型都答对了，还训练什么？

> "如果我都已经答对的题目，模型本身就能答对，还需要训练一遍干嘛？"

关键在一个被压缩掉的区别：**"能答对" ≠ "稳定答对"**。

模型"答对"通常意味着：在 temperature>0 采样下，跑 N 次里**碰巧有一次**走到了正确路径。它对正确解法只分配了**一部分概率质量**——比如 20%，剩下 80% 还是错的。这就是 **pass@k（k 次里有一次对）vs pass@1（一次就对）的差距**。

自蒸馏做的事，不是教新知识，而是：

> **把模型偶尔能找到的正确路径，反复强化，让那条路径的概率从 20% 提到 80%——把"偶然对"压成"稳定对"。**

打个比方：一个学生 10 次考试蒙对 1 次。"蒙对过"不代表"学会了"。把他蒙对那次的解题过程抽出来反复练，从"10 次对 1 次"变成"10 次对 8 次"。题目没变，变的是稳定性。

更精确的工程视角，两层收益：

1. **best-of-N → greedy 的内化**。推理时你本来要"采样 16 次 + grader 挑最好的"才能交对卷（贵）。自蒸馏把这个 best-of-N 能力**烧进权重**，训练后单次 greedy 解码就能做到原来要 16 次采样才做到的事。**本质是把推理期的搜索成本，预支到训练期的权重里。**
2. **泛化**。在"已解出"的题上强化正确推理*模式*，会迁移到**没见过的题**——模型学的是好推理的套路，不是背这几道题的答案。

**诚实的边界**：如果模型已经 pass@1 高置信答对了，训练它确实收益很小（梯度接近 0）。自蒸馏真正吃到肉的，是那些**模型"时对时错"的题**——这恰好引出第二个问题。

---

## 四、第二个反直觉问题：有全量数据 + ground truth，为什么不全量 SFT，非要只挑高分的？

这里有个最关键的澄清，一句话解开困惑：

> **数据集给你的 ground truth 是"最终答案"（`target = -9867630`），不是"解题过程"。而经典 full SFT 需要的恰恰是"完整解题过程当标准答案去模仿"——这个数据集没有。**

所以你**没法直接做全量 SFT**，因为你缺的就是"输出序列标签"：

| 你有的 | 你缺的（SFT 模仿所需） |
|---|---|
| `input`（题目） | —— |
| `target`（最终数字答案） | **完整的 reasoning + code 输出序列** |

reward 筛选正是用来**"无中生有地造出这个缺失的标签"**：① 让模型自己写一堆解题过程；② 用 `target` 验证哪些过程真的走到正确答案；③ 把这些"经认证正确"的过程留下当 SFT 对。

### 4.1 为什么不能把答错的也一起训练？

因为 **SFT 的数学本质是"无条件最大化你喂进去的东西的似然"**——你喂什么它就拼命模仿什么。喂错误轨迹 = 主动教它学错。reward 就是那道门：只有"到达正确答案"的轨迹才放进去（`:294-295` 的 top-fraction 切片）。没有这道门，你就是在拿垃圾做 SFT。

（进阶：有些方法*会*用负例——DPO/偏好学习、RL——那是把"对 vs 错"当对比信号。纯 SFT 只能见好样本。）

### 4.2 即使有 gold 解题过程（那个 `code` 字段），为什么还偏好自生成的？

这是 **on-policy / 分布匹配** 的论点：

- gold 过程是用**外部风格**写的，硬逼模型模仿离自己分布很远的文本，效率低、还容易学到表面形式（exposure bias）。
- 自生成的正确过程是 **on-policy**——在模型自己的"语气/分布"里，微调相当于一次**更小的 KL 移动**，强化的是它本来就产得出的路径。所以 RAFT/STaR 在推理任务上常常**打败 naive 的 gold-SFT**。
- 而且 gold 过程可能用了模型难以复现的解法；自生成轨迹**天然可被模型复现**。

---

## 五、自蒸馏 vs 强→弱蒸馏：区别只在 runner 配了哪个模型

"只拿高分记录训练"很像蒸馏。这个直觉对，但要分两种情况，**区别在谁来跑 rollout**：

| rollout 模型 vs 被训模型 | 本质 | 名字 |
|---|---|---|
| **同一个模型**（自己跑自己筛自己练） | 自我提升、自举 | STaR / RAFT / ReST（**自蒸馏**） |
| **更强模型跑、训更弱模型** | 强→弱知识转移 | 拒绝采样**蒸馏** |

`sft_allinone.py` 默认是第一种（自蒸馏，每轮用 `version_{n}` 自己跑）。但框架**天然支持第二种**——因为 runner 的 rollout 模型和算法侧的训练目标模型是**解耦的**（系列 03 的生产者/消费者分离）。你完全可以让 runner 用 GPT-4 / 强模型跑数据集，grader 打分，筛高分轨迹，再拿去 LoRA 微调一个小模型。**这就是标准的 rejection sampling distillation。**

两者解决的问题不同：

- **自蒸馏**：扩充"已会题"上的**稳定性**（pass@k → pass@1）。
- **强→弱蒸馏**：扩充到"学生当前根本不会的题"。弱模型的死穴是**有些难题它采样 N 次全错（0 条正确轨迹）→ 自蒸馏一无所获**；换强模型去跑，能产出这些难题的正确轨迹，给弱模型提供**它自己造不出来的训练信号**。`target` 在这里验证强模型的轨迹确实对（避免把老师的错误也蒸馏进去）。

reward 来源也对应两条路：

- **有 ground-truth**（如本例 GSM-hard 的 `target`）→ 精确匹配 grader，客观、零噪声，**首选**。
- **没 ground-truth** → 强模型当 LLM-as-judge 打分（主观，有噪声，要防 reward hacking，参见系列 04 §四）。

---

## 六、配置与跑法：Unsloth + LoRA + 4-bit

`unsloth_helper.py` 的关键配置（让 16GB GPU 能跑的秘密）：

| 配置 | 值 | 源码 | 作用 |
|------|----|----|------|
| 4-bit 量化 | `load_in_4bit=True` | `:38` | 模型以 4bit 加载，省显存 |
| LoRA rank | `r=32` | `:44` | 只训低秩适配器，不动全量权重 |
| LoRA alpha | `lora_alpha=32` | `:54` | 缩放系数 |
| max_seq_length | `4096` | `:37` | 序列长度上限 |
| 学习率 | `2e-4`（长训练降到 `2e-5`） | `:69` | LoRA 典型 lr |
| batch | `per_device_train_batch_size=2` | `:64` | 单卡小 batch |
| 训练器 | `trl.SFTTrainer`（被 unsloth patch） | `:78` | 实际执行 SFT |

**两种跑法**（与系列 03 的"三进程 vs 一键"一脉相承）：

```bash
# 方式 A：三进程（sft_allinone.py docstring :8-10）
agl store
python sft_rollout_runners.py     # 消费者：跑 rollout
python sft_algorithm.py           # 生产者：收集 → 筛 → 训练

# 方式 B：一键（all-in-one）
python sft_allinone.py            # UnslothSupervisedFinetuning(Algorithm) + Trainer.fit
```

方式 B 的 `UnslothSupervisedFinetuning(Algorithm)`（`sft_allinone.py:30`）在 `run()`（`:52`）里用 `self.get_store()/get_llm_proxy()/get_adapter()`（`:64-66`）拿脊柱组件，循环 `max_iterations`（`:100`，默认 2）调 `sft_one_iter`。**这正是系列 02 讲的接口规范——继承 `Algorithm` 实现 `run()`，框架注入依赖**。

---

## 七、横向收口：reward 的三种消费方式 + 何时从 SFT 升到 RL

把系列 01~05 的优化器拉到一张表，**它们共享同一份 grader/reward，只是消费方式不同**——这就是 method-agnostic 的最终兑现：

| 方法 | reward 怎么被消费 | 源码标志 | 改 agent/reward 吗 |
|------|------------------|---------|------------------|
| **APO**（系列 01/04） | 排序选 **prompt** | `sorted(...)[:beam_width]`（`apo.py:741`） | 否 |
| **SFT**（系列 05） | 排序筛 **轨迹**，top-k 拿去微调 | `all_triplets.sort(..., reverse=True)`（`sft_algorithm.py:294`） | 否 |
| **RL/VERL**（系列 06） | 当**梯度信号**直接进 policy gradient | reward 不排序，做反向传播 | 否 |

你写好的那个 grader（返回 float），从 APO 切到 SFT 再切到 RL **一行都不用改**——变的只是算法侧怎么用这个分。

### 7.1 SFT vs RL：场景边界（系列06 的入口）

把两条权重微调路线的适用边界钉死，下一篇 VERL 就是顺着「SFT 到顶」这条线展开的。

**一句话区分本质**：

- **SFT（拒绝采样）= 「模仿你筛出来的好答案」**——只看**正例**，最大化它们的似然。门是 reward（够好才进），但进了门之后所有样本一视同仁，不区分「好多少」。
- **RL（VERL）= 「按好坏程度调整」**——同时用**正例和负例**，最大化期望 reward。它知道「这条比那条好多少」（advantage），还能**探索**当前采样不到的更优策略。

**什么时候用 SFT（该用）**：

1. **模型已能「偶尔答对」**（pass@k > 0）——有正样本可筛，SFT 把 pass@k 压成 pass@1（§三）。
2. **reward 稀疏/二值/可验证**（如数学精确匹配）——只要「对/错」就够筛 top-k，不需要细粒度分数。
3. **要快、稳、便宜**——监督学习必收敛，16GB 可跑，无 reward hacking（§〇）。
4. **作为 RL 的 warmup**——先 SFT 把分布拉到「能稳定答对一部分」，再 RL 在此基础上探索，比从 base 直接 RL 更稳更快。这是工业界标准的 **SFT→RL 两段式**。

**什么时候 SFT 不够、该上 RL**：

| 触发条件 | 为什么 SFT 不行 | RL 怎么解 |
|---------|----------------|----------|
| **SFT 飞轮到顶** | 模型已稳定输出它能找到的所有正确路径，再迭代不涨 | RL 用对错对比 + 探索，突破天花板 |
| **要压榨负例信息** | SFT 只用正例，扔掉所有错误轨迹携带的信息（信号利用率低） | advantage 把「对 vs 错」变成梯度方向 |
| **reward 有程度（非二值）** | SFT 只会「对的就模仿」，分不出「好 8 分 vs 好 5 分」 | 期望 reward 最大化天然利用连续分 |
| **难题 0 正样本** | 模型采样 N 次全错 → SFT 一无所获（除非换强模型蒸馏，§五） | RL 的探索能逐步爬到正确轨迹 |
| **要对齐「过程」不只「结果」** | 结果对就收，过程错也照学（§1.2 outcome-only 假阳性） | 过程奖励 / PRM 可惩罚坏过程 |

**RL 的代价**（系列06 详谈）：不稳定（reward hacking / KL 发散 / 超参敏感）、高显存（40GB+）、难装（VERL）、reward 噪声会被放大。

> 完整升级顺序：**先 APO 调 prompt（不动权重，最便宜）→ 顶了上 SFT（拒绝采样自提升，正例，16GB）→ 再顶了上 RL（VERL，正负例 + 探索，40GB+）**。每一级都比上一级贵、强、难调。**method-agnostic 的兑现：这三级共享同一份 agent + grader + 数据集，换的只是 `algorithm/` 槽位。** 系列06 就接着把 SFT 留下的「负例信息」和「探索」这两块拼上。

---

## 八、小结

1. **核心结论**：agent-lightning 的 SFT 不是"喂标准答案让模型模仿"，而是**用 reward 当裁判，把模型自己写的、被验证正确的轨迹造成模仿标签**——拒绝采样微调（RAFT/STaR）。
2. **`target` 是评分键，不是模仿 label**：`target` 喂给 grader 算 reward（`math_agent.py:123`，`np.isclose` 精确匹配），`code` 字段根本没被引用。**SFT 需要 ground-truth 评分，不需要 ground-truth 模仿。**
3. **"算法"还是一行 sorted**：`all_triplets.sort(key=reward, reverse=True)` + 切 top 50%（`sft_algorithm.py:294-295`），与 APO 的 `sorted[:beam_width]` 对称——区别只在下游是「微调」还是「选 prompt」。
4. **答对了为什么还训练**：能答对 ≠ 稳定答对。自蒸馏把 pass@k 压成 pass@1，把 best-of-N 的搜索成本内化进权重。
5. **为什么只挑高分不全量**：数据集只给最终答案不给解题过程，reward 是用来**造出缺失的输出标签**；且不能拿错误轨迹做 SFT（会教坏）；自生成正确轨迹是 on-policy，优于硬模仿 gold。
6. **自蒸馏 vs 强→弱蒸馏**：区别只在 runner 配哪个模型——同模型=自蒸馏（扩稳定性），强模型跑=蒸馏（扩覆盖率，能教会学生本来不会的题）。
7. **demo 的坑：只切比例不设阈值**（`:291-295`）——reward 全 0 也会取 top 50%，正确率 < 50% 时会用 0 分样本「凑满」污染训练集。生产应改阈值过滤（`reward > 0`）。
8. **工具调用是 SFT 内容，但只算模型自产部分**：function_call 在 response（训练），工具返回在下轮 prompt（被 -100 盖住）。换工具 schema → 调用语法不迁移、推理模式部分迁移；**先把工具契约定稳再 SFT**。
9. **单轮 vs 多轮记录**：agent-lightning 用 A 法（每轮一条，`:242/256/277`）。A、B 在 token 梯度上等价、不影响能不能学会；差异在训练分布权重与算力——长轨迹 B 更省更忠实，A 是为了与 RL 统一 triplet + reward 跨轮传播。拆分在 adapter 不在模型。
10. **快速成功选 SFT**：16GB + 无需 VERL + 稳定收敛，是上手权重微调的最佳起点；顶了再上 RL（系列 06）。

> 相关：[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]（脊柱 + Algorithm 接口）、[[Agent Lightning系列03：自定义算法与Trainer集成——5个store动作、生产者消费者与一键运行]]（生产者/消费者、一键 vs 三进程）、[[Agent Lightning系列04：APO源码剖析——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景]]（算法剖析对称篇）、[[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]]、[[The Bitter Lesson — 算力终将胜出，对 AI Agent 工程的启示]]、[[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]
