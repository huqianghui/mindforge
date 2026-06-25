---
title: Agent Lightning 系列 04：APO 源码祛魅——算法 = LLM 调用 + sorted、虚拟多 agent 真相与核心使用场景
created: 2026-06-25
tags: [agent-lightning, APO, source-code, beam-search, multi-agent, bitter-lesson, reward-design, use-case, prompt-optimization, demystification]
---

# Agent Lightning 系列 04：APO 源码祛魅——算法 = LLM 调用 + sorted、虚拟多 agent 真相与核心使用场景

> 读完 `apo.py` 全部 896 行后，一个朴素的结论浮出来：**所谓 APO 算法、所谓 beam search，剥到底就是"几次 LLM 调用 + 一个 `sorted()`"**。这篇不回避这个"反高潮"，反而把它当起点——因为它精确地指出：agent-lightning 的价值**不在算法**。本篇逐层打开源码实现、戳破"多 agent 协作"的浪漫想象、讲清难度真正迁移到了哪里，最后回答最该问的问题：**这框架到底什么时候该用、什么时候别用。**

---

## 〇、一个"反高潮"的开场

前三篇（[[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]] / [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] / [[Agent Lightning系列03：自定义算法与Trainer集成——5个store动作、生产者消费者与一键运行]]）一路从实践、框架到自定义算法，但都停在"算法之外"。这一篇真正钻进 `agentlightning/algorithm/apo/apo.py`，把 APO 和 beam search 的实现彻底摊开。

钻进去之后，一个让人略感失望的事实是：

> **APO 算法 = 多次 LLM 调用 + 一个 `sorted()` 取 top-k。** 没有精巧的数据结构，没有花哨的优化技巧，整个算法是**一个 Python 类 + 一个 `for` 循环**。

但这个失望恰恰是本篇的价值所在。它逼我们问对问题：**如果算法这么平凡，那这框架凭什么存在？价值到底在哪？什么场景才值得用它？** 答案在第四、五节。先把源码看透。

---

## 一、源码全景：APO 就是一个类，beam search 是它的一段控制流

整个 APO 算法，就 `apo.py` 一个文件、一个 `APO(Algorithm)` 类（`:81`）。它的唯一入口是 `run()`（`:809`）：

```
APO(Algorithm)                          apo.py:81
  └─ run()                              :809   唯一入口；beam search 外层循环在此
       ├─ _initialize_beam()            :512   取 seed prompt + 建数据集迭代器
       ├─ 初始验证（seed 打基线分）       :849-870
       └─ for rnd in range(beam_rounds): :873  ★ beam search 主循环（默认 3 轮，:112）
            ├─ _sample_parent_prompts()       :883→:546   从 beam 选 beam_width 个父 prompt
            ├─ _generate_candidate_prompts()  :886→:577   ★ try + critic + edit 全在这
            ├─ all_candidates = [*beam, *new] :889        老 beam + 新候选合并
            ├─ _evaluate_and_select_beam()    :892→:689   ★ score + top-k 剪枝
            └─ _update_best_prompt()          :895→:758   冠军全量 val 重打分、记历史最优
```

**第一个要破除的误解：没有 `class BeamSearch`。** beam search 不是被 import、被实例化、被调用的"算法对象"，它是 `run()` 这段代码的**形状**：

1. 维护一个固定大小的列表 `beam`（`:844` 初始化为 `[seed]`）；
2. 每轮做三件事——扩展（生成孩子）、打分、`sorted(...)[:beam_width]` 砍成 top-k。

这就是 beam search 的全部。它被**织进 for 循环**，而非封装成模块。所以你在代码里"找不到 beam search"是正常的——**它不是一个东西，是一种循环写法**。

---

## 二、把概念循环映射到代码行：try / score / critic / edit

你可以把 APO 的一轮迭代理解成 **try → score → critic → edit** 的循环。每个阶段在源码里的确切落点：

| 概念阶段 | 源码方法 | 行号 | 实际做了什么 |
|---------|---------|------|------------|
| **try（执行/rollout）** | `evaluate_prompt_on_batch()` | `:430` | `update_resources` 挂 prompt（`:469`）→ 逐条 `enqueue_rollout`（`:473`）→ 轮询等 runner 跑完（`:478-494`）。**这步不调优化 LLM，是把任务推给 runner 进程** |
| **score（打分）** | `get_rollout_results()` + 求均值 | `:391` / `:502` | `query_spans`（`:413`）取轨迹 → `find_final_reward`（`:417`）抽分 → 算平均（`:502`） |
| **critic（文本梯度）** | `compute_textual_gradient()` | `:259` | `random.choice` 选批评模板（`:279`）→ POML 渲染（`:297`）→ 用 **gradient_model** 发 LLM 调用（`:310-314`）→ 得一段自然语言批评 |
| **edit（改写）** | `textual_gradient_and_apply_edit()` 后半 | `:361-388` | `random.choice` 选改写模板（`:361`）→ POML 渲染（`:367`）→ 用 **apply_edit_model** 发 LLM 调用（`:376-381`）→ 得新 prompt |

### 2.1 发动机：`_generate_candidate_prompts` 的双层循环

整个算法的核心在 `:577`，看它的双层循环（`:622` / `:637`）：

```python
for (beam_idx, prompt) in parent_prompts:          # :622 遍历每个父 prompt
    for branch_idx in range(self.branch_factor):   # :637 每父生 branch_factor 个孩子
        grad_samples = next(grad_dataset_iterator)  # :650 取一批训练数据
        rollout_results, _ = await self.evaluate_prompt_on_batch(  # :651 ← TRY
            prompt, resource_name, grad_samples, mode="train", ...)
        new_prompt = await self.textual_gradient_and_apply_edit(    # :658 ← CRITIC + EDIT
            prompt, rollout_results, ...)
        new_prompt_template = PromptTemplate(template=new_prompt, ...)  # :670
        candidates.append(self._create_versioned_prompt(new_prompt_template))  # :685
```

读成人话：**对 beam 里每个父 prompt，先让 runner 拿它跑一批真实任务（try）拿到失败轨迹，再让 Critic 诊断、Editor 改写，产出 `branch_factor` 个改进候选。** try 和 critic/edit 是**串行接力**——必须先 try 出失败样本，才有东西给 critic 批评。

### 2.2 beam search 的"剪枝"就是一行 `sorted`

`_evaluate_and_select_beam`（`:689`）只干两件事：

```python
val_batch = next(val_dataset_iterator)          # :719 取一批验证数据（轮内候选共用，保证可比）
for prompt in candidates:                        # :721 每个候选打分
    _, score = await self.evaluate_prompt_on_batch(prompt, ..., mode="val", ...)  # :726
    prompt.score = score                         # :733
sorted_prompts = sorted(candidates, key=lambda x: x.score, reverse=True)  # :741
selected_prompts = sorted_prompts[:self.beam_width]   # :742  ★ 取 top-k = beam search 剪枝
```

**`sorted(...)[:beam_width]`（`:741-742`）这一行，就是 beam search 区别于穷举（BFS）的全部秘密**：无论生成多少候选，只留分数最高的 `beam_width` 个，把指数爆炸压成线性（详见 [[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]] §4）。

所以你的祛魅是准确的：**APO 算法 = 多次 `chat.completions.create()`（try 的 rollout、critic、edit）+ 一个 `sorted()`。** 仅此而已。

---

## 三、戳破"多 agent 协作"：虚拟角色，不是真 agent

你敏锐地指出这像"plan-execute-verify 的多 agent 协作模式"。**概念上对，实现上要泼盆冷水。**

### 3.1 plan-execute-verify 的概念映射

| 经典范式 | APO 对应 | 代码 |
|---------|---------|------|
| **plan**（决定试什么） | critic + edit 生成候选 | `_generate_candidate_prompts` `:577` |
| **execute**（执行） | runner 跑 rollout | `evaluate_prompt_on_batch` `:430`（推给 runner 进程） |
| **verify**（验证、保留） | score + beam 剪枝 | `_evaluate_and_select_beam` `:689` |

这个映射是成立的，参见 [[Agent经典范式与人类问题处理模式的映射]]。

### 3.2 但"Critic agent / Editor agent"是虚拟的

很多人想象 APO 内部有一个"Critic agent"和一个"Editor agent"在对话协作。**源码里没有这回事。** 所谓 Critic 和 Editor，在代码里就是**两次 `self.async_openai_client.chat.completions.create(...)`**：

| | Critic | Editor |
|---|---|---|
| 代码 | `:310-314` | `:376-381` |
| 区别仅在 | `model=self.gradient_model` | `model=self.apply_edit_model` |
| 和 | POML 模板 `text_gradient_*.poml`（`:279`） | POML 模板 `apply_edit_*.poml`（`:361`） |

**没有 agent 类、没有 agent 实例、没有消息总线、没有 orchestrator/graph、没有每个 agent 各自的记忆。** "角色" = 一次带特定角色 prompt 的无状态 LLM 调用。

### 3.3 和真·多 agent 框架的对比

| 维度 | 真多 agent（LangGraph / AutoGen / CrewAI） | APO 的"多角色" |
|------|------------------------------------------|---------------|
| agent 是什么 | 有状态对象（含 memory / tools / 角色） | 一次无状态 LLM 调用 |
| 协作方式 | 消息传递 / 图编排 / 自由对话 | 函数顺序调用（critic 的输出直接当 edit 的输入参数） |
| 谁决定流程 | orchestrator / graph / agent 自主 | 写死的 `for` 循环（`:637`） |
| 运行形态 | 多进程 / 多对话上下文 | 单进程、单线程顺序 await |

> **结论**：APO 是"用 prompt 扮演角色"，不是"用对象封装 agent"。它比真多 agent 框架**轻得多**——没有编排开销、没有 agent 间通信、流程完全确定。这是优点（简单、可控、便宜），也是局限（不能让角色自主回溯、不能动态增减角色，对比 [[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]] §4.2 里 ToT 那种"带自评估的搜索"——APO 故意不做，因为评估太贵）。

---

## 四、所谓"算法"：难度迁移到了哪里

既然核心循环平凡，那 APO 难在哪？**难度从"算法"迁移到了三个框架帮不上忙的地方。** 这不是 APO 的特例，是 AI 算法的普遍真相——梯度下降是"算导数减一下"，Transformer 是"matmul + softmax"，beam search 是"排序砍 top-k"。[[The Bitter Lesson — 算力终将胜出，对 AI Agent 工程的启示]] 讲的正是：能 scale 的方法内核往往简单到尴尬。**核心循环简单是特性，不是缺陷。**

真正的难点：

| 看似一行的代码 | 真正难的部分 | 证据 |
|---------------|------------|------|
| `compute_textual_gradient` 一次 LLM 调用（`:310`） | **批评模板（POML）怎么写**——让 Critic 产出"有用且不带毒"的批评 | `text_gradient_*.poml`（`:69-73`）；系列01 §4.5：批评里写了正则 `{4}`/JSON，Editor 照抄进模板直接渲染崩 |
| `sorted()[:beam_width]` 排个序（`:741`） | **排的是带噪声的分**——同 prompt 摆动 0.2，"sort + 取 max"在统计上系统性上偏（max-over-noise bias） | 系列01 §4.4；解药是 [[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]] §4.3 的 bandit / UCB |
| `evaluate_prompt_on_batch` 调一下（`:430`） | **reward / grader 怎么设计**——reward 是垃圾，优化越狠越垃圾 | grader 函数；系列01 §4.4"越优化越啰嗦反而掉分" |
| `enqueue_rollout` 推个任务（`:473`） | **让这堆 LLM 调用真能并发、跨机、容错地大规模跑** | store + async 编排 + `TraceToMessages` adapter（`:414`）+ timeout（`:476`） |

> **一句话钉死**：APO 的"智能"不在 for 循环里，在那几个 `.poml` 模板里；APO 的"可靠性"不在 sorted 里，在 store 那套管道里。算法骨架几十行就能手写，但把它变成**能稳定提升 prompt 的东西**，卡点是三件事——**写对批评模板、设计对 reward、压住评估噪声**。这正是 [[Agentic-Engineering——质量与成本的一体化优化]] 强调的：工程价值在"质量与成本的治理"，不在算法炫技。

---

## 五、那它到底什么时候该用？——agent-lightning 的核心使用场景

把祛魅推到底，问题就清晰了：**既然算法平凡，选不选这个框架，取决于你是否需要它的"管道"（store 编排）和"方法可换"（method-agnostic），而非算法本身聪不聪明。**

### 5.1 框架的唯一核心职责

agent-lightning 干的就一件事：**自动优化一个已有 agent，而不重写它。** 它提供三条共享同一套 harness 的优化路线（[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] §五）：

| 路线 | 改什么 | 本系列 |
|------|--------|--------|
| **APO** | 调 prompt，不动权重 | 系列 01/03/04（本系列主线） |
| **VERL** | RL 调模型权重 | 系列 05（GPU 环境） |
| **SFT** | 监督微调权重 | 自定义算法扩展点 |

核心卖点是 method-agnostic：**同一份 agent 代码 + reward + 数据集，今天插 APO 调 prompt，明天换 VERL 调权重，rollout 和 reward 一行不改。**

### 5.2 正中靶心的场景（该用）

1. **你有 agent + 可量化 reward + 数据集，想自动迭代优化**——这是设计靶心。手调 prompt 调不动了，想让强模型替你"诊断+改写"循环跑。
2. **你想在多种优化方法间切换**——先 APO 试 prompt，发现 prompt 到顶了想上 RL 微调权重，不想重写 agent。method-agnostic 的解耦在这里值回票价。
3. **评估很贵、要大规模并发/跨机/容错地跑 rollout**——store 把 algo（生产者）和 runner（消费者）解耦，runner 可水平扩展、跨机、崩了能重连（系列03 §3.2）。单机 100 条数据手写脚本够，上千条 × 多候选 × 多轮就需要这套管道。
4. **离线批量优化**（不是线上 serving）——APO 是离线把 prompt 调好，产出一个固化的最优 prompt（`get_best_prompt()`，`:245`），再拿去线上用。

### 5.3 别用的场景（避坑）

1. **一次性、简单任务**——手调 prompt 几分钟搞定，框架接线 + 调试反而更慢（系列01 §5：框架省的是"写对+调试"，不是"从不可能到可能"）。
2. **没有好的 reward**——reward 设计是真瓶颈，框架完全帮不上。reward 含糊（如系列01 的"be critical + partial score"本身就是噪声制造机），优化越狠越跑偏。
3. **数据太小、噪声压过信号**——`sorted()` 排的是带噪分，小数据集上 max-over-noise 让"虚高候选"胜出，APO 反而不如 baseline（系列01 §4.4 实测）。
4. **你要的是线上推理 serving**——用途错配。agent-lightning 是优化器/训练器，不是推理网关（那是 [[OpenClaw架构解读——从claw0教学仓库理解AI Agent网关的核心设计]] 那类东西的活）。

### 5.4 选型决策一句话

> **如果你的瓶颈是"算法不够聪明"——agent-lightning 帮不了你（它的算法也就是 LLM 调用 + sorted）。如果你的瓶颈是"有 reward 和数据，但缺一套能自动迭代、可换方法、能扩展跑的优化管道"——这正是它的主场。** 横向参考 [[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]：纯调 prompt 且不需要 RL/SFT，DSPy/TextGrad 可能更轻；要在 prompt↔权重之间自由切换、要 agent 级 rollout 编排，才轮到 agent-lightning。

---

## 六、小结

1. **祛魅是对的**：APO 算法 = 多次 LLM 调用（try 的 rollout + critic + edit）+ 一个 `sorted()[:beam_width]`（`apo.py:741`）。整个算法是一个 `APO` 类 + `run()` 里的一个 `for` 循环（`:873`）。
2. **beam search 不是模块，是循环形状**：维护定长 `beam` 列表，每轮 扩展→打分→top-k 剪枝。代码里找不到 `class BeamSearch` 是正常的。
3. **try/score/critic/edit 的代码落点**：`evaluate_prompt_on_batch`（`:430`）/ `find_final_reward`（`:417`）/ `compute_textual_gradient`（`:259`）/ `textual_gradient_and_apply_edit`（`:361`）。
4. **多 agent 是虚拟的**：Critic/Editor 只是两次带不同 POML 模板和 model 参数的 `chat.completions.create`，没有 agent 对象、没有编排——比 LangGraph/AutoGen 轻得多，也少了自主回溯能力。
5. **难度迁移**：算法平凡，真难点在 POML 批评模板、reward 设计、评估噪声治理——三件框架帮不上的事（呼应 Bitter Lesson）。
6. **核心使用场景**：有 agent + reward + 数据、想自动迭代 / 想换优化方法 / 要大规模跑 rollout → 该用；一次性任务 / 没好 reward / 数据太小 / 要线上 serving → 别用。**选它是为了管道和方法可换，不是为了算法聪明。**

> 相关：[[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]]（实践 + 噪声复盘）、[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]（框架脊柱）、[[Agent Lightning系列03：自定义算法与Trainer集成——5个store动作、生产者消费者与一键运行]]（接入契约）、[[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]]（算法理论）、[[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]、[[The Bitter Lesson — 算力终将胜出，对 AI Agent 工程的启示]]
