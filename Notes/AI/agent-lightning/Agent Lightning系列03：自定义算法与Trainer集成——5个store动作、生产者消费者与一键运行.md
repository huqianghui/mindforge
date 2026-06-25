---
title: Agent Lightning 系列 03：自定义算法与 Trainer 集成——5 个 store 动作、生产者/消费者与一键运行
created: 2026-06-25
tags: [agent-lightning, custom-algorithm, store, producer-consumer, trainer, APO, method-agnostic, rollout, integration-contract, runner]
---

# Agent Lightning 系列 03：自定义算法与 Trainer 集成——5 个 store 动作、生产者/消费者与一键运行

> 官方那个 `apo_custom_algorithm.py` 名字叫 APO，但它**一行 APO/beam 代码都没改**。它真正想教的不是"怎么优化 prompt"，而是"**任何算法怎么塞进 agent-lightning**"——也就是算法与框架之间那根叫 store 的接缝。本篇把这个例子彻底拆开：5 个 store 动作的接入契约、algo/runner 的生产者-消费者分工、三进程手动 vs Trainer 一键的取舍，以及怎么跑、怎么看结果。

---

## 〇、为什么单开这一篇

[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] 在结尾预告过：要真正理解框架的「控制反转」，光看内置 APO 不够，得看一个**自定义算法**怎么接进去。官方 `examples/apo/` 下正好给了一对文件：

- `apo_custom_algorithm.py`——算法与 runner **进程分离**的写法（配合 `agl store` 三件套）；
- `apo_custom_algorithm_trainer.py`——把三件套**塌缩成一条命令**的 Trainer 写法。

但很多人（包括我第一次读）会被名字误导，以为这是"APO 的另一种实现"。**不是。** 这一篇就来回答三个被反复问到的问题：

1. 这个例子到底想表达什么观点？是不是"自己管 store、自己 find reward"？
2. 它改了 APO/beam 的哪个部分？（剧透：**一个字都没改**）
3. 三个进程太麻烦，直接跑 trainer 行不行？要不要单独起 store？

本篇基于 0.3.1 源码（fork 自 `microsoft/agent-lightning`），所有论断带 `file:line` 出处。

---

## 一、最重要的一句话：这个例子教的不是 APO，是「接入契约」

### 1.1 它用一个"假算法"故意把 APO 抽走

打开 `apo_custom_algorithm.py:46-50`，所谓的"优化算法"长这样：

```python
prompt_candidates = [
    "You are a helpful assistant. {any_question}",
    "You are a knowledgeable AI. {any_question}",
    "You are a friendly chatbot. {any_question}",
]
```

三个**写死的** prompt，挨个跑一遍、各打一次分，最后 `max` 选最高分（`:98`）。**这里没有文本梯度、没有 Critic/Editor、没有 beam search、没有任何迭代生成**——它连"优化"都算不上，本质是个**穷举三选一**。

> 所以你的直觉完全正确：这个例子**没有修改 APO，也没有修改 beam search**。真正的 APO 内核（`algorithm/apo/apo.py` 里的文本梯度 + `_evaluate_and_select_beam` 的 top-k 剪枝，见 [[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]]）在这个文件里**根本没被引用**。作者是**故意**把 APO 这个复杂优化器整个替换成一个三行的占位 stub。

### 1.2 为什么要用假算法

因为真 APO 太复杂。如果用真 APO 做例子，你会被 Critic/Editor/beam 的逻辑淹没，**反而看不清"算法和框架之间那根线"长什么样**。

作者的教学策略是**做减法**：把算法换成谁都能看懂的穷举，剩下的代码就**只剩接入框架的样板**。于是这个文件真正暴露出来的，是一张"算法接入契约"——你想用**任何**自己的优化逻辑（穷举、随机、进化算法、贝叶斯优化、甚至真 APO），只要会调下面那 5 个 store 动作，框架就帮你跑 rollout、打分、收集 trace。

**一句话总结观点**：这个例子证明的是「算法 ↔ store 的契约」，而不是「APO 怎么写」。名字里的 `apo` 只是个被掏空的壳。

---

## 二、5 个 store 动作 = 算法接入契约

把 `apo_algorithm(*, store)`（`:42`）那个 for 循环里的样板逐行抠出来，会发现**任何算法接入框架都只需要做这 5 件事**：

| # | 动作 | 源码 | 干什么 | 类比 |
|---|------|------|--------|------|
| 1 | `store.add_resources(resources)` | `:65` | 把这一轮要试的 prompt 挂到 store 上（包成 `PromptTemplate`，`:62`） | 把考题贴到公告栏 |
| 2 | `store.enqueue_rollout(input=..., mode="train")` | `:69` | 推一个任务进队列，等 runner 来领 | 把试卷投进收件箱 |
| 3 | `store.wait_for_rollouts(rollout_ids=[...], timeout=...)` | `:76` | 轮询等 runner 把这个任务跑完（最多等 30 秒，`:75`） | 等学生交卷 |
| 4 | `store.query_spans(rollout_id)` | `:86` | 取回这次执行的完整轨迹（OpenTelemetry spans） | 收回答题卡 |
| 5 | `agl.find_final_reward(spans)` | `:92` | 从轨迹里抽出那个数值分数 | 从答题卡上读出得分 |

拿到 reward 后，算法自己决定怎么用——这个例子是 `prompt_and_rewards.append(...)`（`:95`）攒起来，最后 `max` 选优（`:98`）。**"怎么选"是算法的自由，框架不管**。

> 关键认知：这 5 个动作就是 [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] 讲的 **store-centric 控制平面**的全部 API 面。算法只通过 store 和外界打交道，**完全不知道 runner 是谁、在哪、用什么模型**。这就是 method-agnostic 的工程基础——换算法（APO→RL→SFT）只是换这 5 个动作之间的逻辑，runner 和 agent 代码一字不动。

---

## 三、生产者/消费者：algo 与 runner 为什么要拆成两个进程

### 3.1 谁是生产者，谁是消费者

```
┌─────────────┐   ① add_resources（贴 prompt） ┌──────────┐   ④ iter() 拉任务   ┌──────────────┐
│ algo（生产者） │ ─────────────────────────────▶ │  store    │ ◀────────────────── │ runner（消费者） │
│             │   ② enqueue_rollout（推任务）   │（队列+黑板）│                     │              │
│  穷举 3 个    │ ─────────────────────────────▶ │           │   ⑤ 写回 spans       │  跑 LLM + 打分  │
│  prompt      │   ③ wait → query → find_reward  │           │ ◀────────────────── │              │
└─────────────┘   （读回结果）                    └──────────┘                     └──────────────┘
```

- **algo = 生产者**（`apo_algorithm`，`:42`）：它 `enqueue_rollout`（`:69`）往队列里推任务，并通过 `add_resources`（`:65`）设定"这一轮用哪个 prompt"。**它生产任务，但不执行任务。**
- **runner = 消费者**（`apo_runner`，`:154`）：`runner.iter()`（`:161`）不断从 store 拉任务、执行 `apo_rollout`（调 gpt-4.1-nano，`:107`）、再用 `llm_judge`（`:127`）打分，把结果（spans）写回 store。**它执行任务，但不决定试什么。**

你之前问"对应的就是设置的 prompt？"——**对**。生产者设的那个 prompt，就是 `prompt_candidates` 里当前这一个，通过 `add_resources` 包成 `PromptTemplate` 注入（`:62-65`）；消费者在 `apo_rollout` 里用 `prompt_template.format(any_question=task)`（`:110`）把它填进真正的 LLM 调用。

### 3.2 为什么非要拆成两个进程

进程分离不是为了好看，而是**解耦执行规模与优化逻辑**：

1. **算法是单点的，runner 是可横向扩展的**。优化逻辑（选哪个 prompt）天然串行、只要一个进程；但跑 rollout 是 IO 密集的慢活，可以起 N 个 runner 并行消费同一个队列。拆开后，加 runner = 加吞吐，不碰算法。
2. **算法和 runner 可以跑在不同机器/不同环境**。比如算法在你笔记本上，runner 在带 GPU 的远端——靠 store（4747 端口）通信。这正是 §四要讲的 `ClientServerExecutionStrategy` 的用武之地。
3. **故障隔离**。runner 崩了，任务还在队列里，重启 runner 能接着消费；算法侧只是 `wait_for_rollouts` 多等一会儿。

> 这就是为什么例子要先 `agl store` 起一个独立的"黑板"，再分别起 algo 和 runner——三者通过 store 这个**中间黑板**异步协作，而不是函数直接调用。

---

## 四、两种运行方式：三进程手动 vs Trainer 一键

同一套逻辑，官方给了两种跑法。**它们等价，只是把"进程编排"这件事放在了不同的地方。**

### 4.1 方式 A：三进程手动（`apo_custom_algorithm.py`）

需要开**三个终端**：

```bash
# 终端 1：起独立 store（监听 0.0.0.0:4747）
agl store

# 终端 2：起消费者（先起，因为算法只等 30 秒）
python apo_custom_algorithm.py runner

# 终端 3：起生产者（一启动就驱动整个闭环）
python apo_custom_algorithm.py algo
```

`main()`（`:164`）里 `store = agl.LightningStoreClient("http://localhost:4747")`（`:165`）——注意这是个 **Client**，连的是终端 1 那个独立 store 服务。argparse 的 `mode` 参数（`:167`，choices=`["algo","runner"]`）决定这个进程当生产者还是消费者。

⚠️ **时序坑**：算法侧 `wait_for_rollouts` 最多等 30 秒（`:75` 的 `for _ in range(30)`），等不到就 `RuntimeError`（`:81`）。所以 **runner 必须先于或同时于 algo 起来**，否则任务没人消费、算法直接报错。

### 4.2 方式 B：Trainer 一键（`apo_custom_algorithm_trainer.py`）

只需**一个终端、一条命令**：

```bash
python apo_custom_algorithm_trainer.py
```

它做的事（`:41-44`）：

```python
trainer = Trainer(n_workers=1, algorithm=apo_algorithm_usable_in_trainer)
trainer.fit(apo_rollout)
```

`@algo` 装饰器（`:29`）把 `apo_algorithm` 包成 Trainer 能识别的算法对象（等价于 `algo(apo_algorithm)`，`:36`），`fit(apo_rollout)` 把 rollout 函数交给 Trainer。**Trainer 在进程内部同时拉起 store、algo、runner 三者**——文件头的 docstring 写得很直白："This is equivalent to the following three commands in parallel"（`:10-16`）。

### 4.3 关键：Trainer 自带 store，不用单独起 `agl store`

这是你最关心的疑问。答案在 `trainer/trainer.py`：

- 构造时 `self.store = self._make_store(store, self.strategy)`（`:232`）；
- `_make_store` 的注释明说 **"By default, it's always a in-memory store"**（`:296`）；
- 默认工厂 `default_store_factory = lambda: InMemoryLightningStore(...)`（`:300`）。

所以 **Trainer 会自己造一个进程内的 InMemoryLightningStore，不需要你另开 `agl store`**。

| 方式 | 命令数 | 要不要 `agl store` | store 在哪 | 适合 |
|------|--------|-------------------|-----------|------|
| A 三进程手动 | 3 | **要** | 独立服务（4747） | 学习链路、跨机/多 runner 扩展 |
| B Trainer 一键 | 1 | **不要** | Trainer 进程内（内存） | 本地快速验证、单机调试 |

⚠️ **不要混用**：如果你已经开着 `agl store`，再跑 trainer，trainer 会**无视外部 store、自己另起内存 store**（除非显式配 `ClientServerExecutionStrategy` 把 store 暴露成服务，`:299/:319`）。外部那个不会报错，但白开了，还容易让你对"结果在哪看"产生混乱。**跑 trainer 前先把三进程那套关掉。**

> 进阶：`_make_store`（`:293`）的第二个分支显示——只有当 `strategy` 是 `ClientServerExecutionStrategy`（`:299`）时，store 才会是线程安全/可被外部连接的版本。也就是说，**单机用内存 store（默认），分布式才升级成 client/server**。这与 [[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]] §1 讲的部署形态一脉相承。

---

## 五、怎么跑、怎么看结果

### 5.1 前置：API Key

无论哪种方式，`apo_rollout`（`:105`）和 `llm_judge`（`:128`）都用 `AsyncOpenAI()` 调 gpt-4.1-nano。**跑之前必须配好凭证**：

- 公有 OpenAI：`export OPENAI_API_KEY=sk-...`
- Azure OpenAI：需改用 `AsyncAzureOpenAI` 并配 endpoint/deployment（系列01 §1.4 的 deployment 表给过映射）。

### 5.2 看结果：盯两个终端的彩色标记

**不需要再跑任何"测试命令"**——algo（生产者）一启动就自动驱动整个闭环。你要做的只是看输出：

**algo / 生产者侧**（红色 `[Algo]`）：
```
[Algo] Updating prompt template to: '...'   ← 正在试某个候选（:58）
[Algo] Queuing task for clients...          ← 推任务（:68）
[Algo] Received Result: ...                 ← 收到 runner 回传（:83）
[Algo] Final reward: 0.7                     ← 这个候选的得分（:94）
...
[Algo] Best prompt found: '...' with reward 0.9   ← 最终结论（:99）
```
最后这行 `Best prompt found` 就是结果——从 3 个候选里挑 reward 最高的那个。**它出现 = 跑通了。**

**runner / 消费者侧**（确认它在干活）：
```
[Rollout] LLM returned: ...      （:115）黄色
[Judge] Judge returned score: ... （:147）蓝色
[LLM] Span ... : ...             （:124）绿色，调试用的 span dump
```

### 5.3 常见"卡住"信号与排查

| 现象 | 位置 | 原因 / 排查 |
|------|------|------------|
| algo 报 `RuntimeError: Expected a completed rollout...` | `:81` | 30 秒没等到结果 → runner 没消费成功。去 runner 终端看红字，**最常见是 API Key / Azure endpoint 没配好** |
| algo 报 `Rollout ... did not succeed. Status: ...` | `:85` | rollout 跑了但失败 → 看 runner 侧异常栈 |
| runner 终端一直静默 | — | runner 没起来或起晚了（算法只等 30 秒）。三进程方式务必 **runner 先起** |
| `Judge returned no content` / score=0.0 | `:144/:151` | judge 模型没返回合法数字 → 多为模型/配额问题 |

---

## 六、从玩具到真 APO：只换 for 循环，框架不动

这个例子最有价值的启发是：**把那个穷举 for 循环换成真正的优化逻辑，框架那 5 个 store 动作一个字都不用改。**

```python
# 玩具版（example 现状，:56-95）
for prompt in prompt_candidates:        # 写死 3 个，穷举
    add_resources(prompt) → enqueue → wait → query → find_reward
return max(候选, key=reward)             # :98

# 真 APO 版（algorithm/apo/apo.py 的逻辑）
beam = [seed_prompt]
for round in range(beam_rounds):
    for parent in beam:
        critique = Critic(gradient_model, 低分轨迹)   # 文本梯度
        candidates = Editor(apply_edit_model, parent, critique)  # 改写
        for c in candidates:
            add_resources(c) → enqueue → wait → query → find_reward  # ← 同样 5 个动作！
    beam = top_k(所有候选, key=reward)    # beam search 剪枝
```

对比看得很清楚：**变的只是"怎么产生候选、怎么选候选"（算法的脑子），不变的是"怎么让候选跑起来拿到分"（框架的手脚）**。这正是 [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] 反复强调的控制反转——你只负责领域逻辑，执行/追踪/存储交给框架。

> 也正因如此，例子叫 `apo_custom_algorithm` 是一种"反话"：它**不是** APO，而是"如果你想写自己的算法（包括但不限于 APO），接口长这样"的脚手架。理解了这一点，再回头看真 APO（[[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]]），就知道它无非是把这个 for 循环换成了"文本梯度 + beam search"。

---

## 七、小结

1. **例子的观点不是 APO，是「接入契约」**：`apo_custom_algorithm.py` 用一个写死 3 个 prompt 的穷举 stub **故意替换掉整个 APO 优化器**，目的是把"算法 ↔ store 的契约"单独暴露出来。
2. **APO/beam 一字未改**——你的直觉对的。真 APO 内核（文本梯度 + beam search）在这个文件里根本没被引用，作者是有意做减法。
3. **接入契约 = 5 个 store 动作**：`add_resources`（贴 prompt）→ `enqueue_rollout`（推任务）→ `wait_for_rollouts`（等结果）→ `query_spans`（取轨迹）→ `find_final_reward`（读分数）。任何算法只要会这 5 步就能接入。
4. **algo=生产者、runner=消费者**：algo 推任务+设 prompt（不执行），runner 拉任务+跑 LLM+打分（不决策），靠 store 这块黑板异步解耦——好处是 runner 可横向扩展、可跨机、可故障隔离。
5. **三进程 vs Trainer 一键**：手动三进程要 `agl store`（靠 4747 通信）；Trainer **自带内存 store**（`trainer/trainer.py:300`），一条命令搞定，**不用单独起 store**。两者别混用。
6. **从玩具到真 APO**：只换 for 循环里的"产生+选择候选"逻辑，框架那 5 个动作不动——这就是 method-agnostic 的落地证明。

> 相关：[[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]]（实践接线 + beam search 内核）、[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]（数据流脊柱 + 控制反转）、[[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]]（APO 算法本体）、[[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]
