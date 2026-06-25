---
title: Agent Lightning 系列 02：框架全景与脊柱拆解——9 大模块与 method-agnostic 设计
created: 2026-06-25
tags: [agent-lightning, architecture, framework, rollout, reward, tracer, store, adapter, algorithm, triplet, agent, RL]
---

# Agent Lightning 系列 02：框架全景与脊柱拆解——9 大模块与 method-agnostic 设计

> 从单点 APO 升到整个框架——把核心模块串成一条数据流脊柱，搞清楚"你提供什么、框架拥有什么"，以及为什么换优化方法（APO↔RL↔SFT）能不动 agent 代码

---

## 〇、为什么需要这一篇

[[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]] 把 **APO 单点**吃透了（实践接线 + beam search 内核 + 三轮噪声复盘）。但 APO 只是 `algorithm/` 槽位里的一个算法。要回答两个更上层的问题——

1. **客户已有一份 agent 代码，怎么快速接入框架？**
2. **今天调 prompt（APO），明天想 RL/SFT 微调权重，能不能不重写？**

——就必须跳出 APO，理解整个框架的「脊柱」。本篇基于 0.3.1 源码（`microsoft/agent-lightning`）逐模块拆，所有论断都带 `file:line` 出处。

---

## 一、一张图看懂：数据流脊柱

整个框架是**一条单向数据流**，两端是你的「领域零件」，中间是框架的「基础设施 + 算法」：

```
        ┌─────────────── 你提供（领域知识）───────────────┐
        │                                                  │
   ┌────▼─────┐                                      ┌─────▼─────┐
   │ litagent │  你的 agent 逻辑，@rollout 包成函数    │  reward   │  你的打分口径（grader）
   └────┬─────┘                                      └─────▲─────┘
        │                                                  │
════════│══════════════ 框架拥有（infra + 算法）═══════════│════════════
        │                                                  │
   ┌────▼─────┐   ┌─────────┐   ┌────────┐   ┌─────────┐  │
   │  runner  │──▶│ tracer  │──▶│ store  │──▶│ adapter │──┘
   │ 跑N次rollout│  │抓OTel span│ │存生命周期│ │span→结构化│
   └──────────┘   └─────────┘   └────┬───┘   └────┬────┘
                                     │            │
                                ┌────▼────────────▼────┐
                                │     algorithm        │  APO / VERL / 自定义
                                │  消费上面一切来优化     │
                                └──────────────────────┘
        ┌───────────────────────────────────────────────┐
        │ trainer：把以上全部串起来编排（持有/注入/执行）   │
        │ types：模块间的数据契约（Triplet/Rollout/...）  │
        └───────────────────────────────────────────────┘
```

**控制反转（inversion of control）**：你定义的是「什么算好」的静态零件（agent 逻辑 + reward + 数据集），框架拥有的是「把好坏变成可迭代优化循环」的动态机制。这点 [[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]] §五已经论证过，系列02 把它落到每个模块上。

---

## 二、九大模块逐个拆

每个模块只讲三件事：**职责、关键类（file:line）、边界**。

### 2.1 `litagent` — 你的 agent，被 `@rollout` 包成函数

- **职责**：把任意 agent 逻辑变成框架能调度的执行单元。
- **关键**：`@rollout`（`litagent/decorator.py:465`）是**函数装饰器**，靠 `inspect.signature` 自动判型。硬性签名约束（`_validate_*_rollout_func`，`decorator.py:352/434`）：
  - 第一个参数**必须叫 `task`**；
  - **必须**带 `llm`（自己建 client）**或** `prompt_template`（框架注入可调 prompt）之一；可选第三参 `rollout`（拿 metadata）。
- 装饰后变成 `FunctionalLitAgent`（`decorator.py:94`），它继承 `LitAgent`——所以「函数式」只是「类式」的语法糖。
- **边界**：框架**不关心**你函数体里用 LangChain / OpenAI SDK / AutoGen / 裸写。它只认「签名 + 返回值」。所谓"零代码改动"实质是"包一层符合签名的函数"。

```python
# 包一个 LangChain agent：不是包实例，是写一个函数把 chain 调用塞进去
@rollout
def my_agent(task, prompt_template):
    chain = build_langchain_chain(prompt_template.template)   # 你的领域逻辑
    result = chain.invoke(task["input"])
    return grader(result)        # 返回 float（见 §2.6 reward）
```

### 2.2 `runner` — 把 rollout 跑 N 次

- **职责**：调度执行——并发跑多条 rollout、重试、超时、心跳、把结果回写 store。
- **关键**：`LitAgentRunner`（`runner/agent.py:60`）。两个入口：`step()`（`agent.py:794`，单条，系列01 的 Step-0 验证用它）、`iter()`（`agent.py:737`，持续从 store 取任务跑）。
- **边界**：runner 是「生产者」——它产出 spans，写进 store；不做优化决策。**grader 返回的 float 在这里被转成 reward span**（见 §2.6）。

### 2.3 `tracer` — 把每次 LLM 调用抓成 OTel span

- **职责**：可观测性。自动 instrument LLM 库，把每次调用记成 OpenTelemetry span。
- **关键**：`AgentOpsTracer`（`tracer/agentops.py:32`）继承 `OtelTracer`，`instrument()` 调 `instrument_all()`——自动 patch `instrumentation/` 下的 openai/langchain/litellm/vllm。
- **边界（重要，回答"能否与客户已有 trace 共存"）**：
  1. **共存**：底层是 OTel 标准，客户已有 OTel 体系就共享同一 `TracerProvider`，框架只多挂一个 `LightningSpanProcessor` 喂训练；
  2. **只用客户的**：`instrument_managed=False`（`agentops.py:46/61`）关掉自动 patch，自己管 instrumentation；还能换 `tracer/otel.py`/`weave.py`/`dummy.py`；
  3. **底线**：框架要训练，**必须能拿到 reward span**。trace 可以是客户那套，但 reward 信号得按框架格式 emit。

### 2.4 `store` — 训练的「控制平面」

- **职责**：不只是存 trace，而是协调整个 rollout 生命周期。`base.py:104` docstring 自称 "persistent **control-plane** that coordinates training rollouts"——存队列、attempt、状态机、spans、resources，是 runner（生产者）↔ algorithm（消费者）之间的中枢。
- **关键后端**（`store/__init__.py`，比初看到的多）：
  | 实现 | 文件 | 场景 |
  |------|------|------|
  | `InMemoryLightningStore` | `memory.py` | 单机/实验 |
  | （SQLite） | `sqlite.py` | 单机持久化 |
  | `CollectionBasedLightningStore` + `collection/mongo` | `collection_based.py` | Mongo 文档存储 |
  | `LightningStoreClient/Server` | `client_server.py` | 分布式，多 runner 跨进程走 HTTP |
- **边界 / 生产选型**：store 特点是「高频小记录读写 + 队列状态机语义 + 嵌套 JSON 的 spans」。
  - **Azure → Cosmos DB for MongoDB API 最省事**：协议兼容，直接复用现成 mongo 实现，0 代码；
  - **PostgreSQL**：可行但**无现成实现**，要自己实现 `LightningStore` 接口，trace 塞 JSONB（pg 比 mysql 强）；
  - **MySQL 不推荐**（JSON 支持弱）。
  - 一句话：**Azure 上用 Cosmos(Mongo API)；非要关系型且已有 PG → pg+JSONB 自己实现接口**；纯实验用 memory/sqlite。

### 2.5 `adapter` — 把 span 还原成「上层能用的结构」

- **职责**：底层 spans 是一堆扁平 dotted attribute（如 `gen_ai.prompt.0.role`），adapter 把它们还原成结构化对象。
- **两个方向**（`adapter/__init__.py`）：
  - `TraceToMessages`（`messages.py`）→ `OpenAIMessages`（`{messages, tools}` OpenAI chat 格式，`messages.py:22`）。给 **APO 的 gradient_model** 读"agent 到底说了啥"。
  - `TraceToTriplet` 系列（`triplet.py:767/831/944`）→ `List[Triplet]` 轨迹。给 **RL/SFT 训练**用。
- **边界**：这是 **method-agnostic 的关键接缝**——同一份 trace，APO 用 messages 看对话，RL 用 triplet 取训练样本。换方法 = 换 adapter 出口，rollout 不动。

### 2.6 `reward` — grader 与 reward 的桥

- **职责**：把你的领域打分（grader 返回的 float）变成框架能读的标准信号。
- **坑点澄清**：`agentlightning/reward.py` 本身是 **deprecated 转发层**（`from .emitter.reward import *`），**真实现在 `emitter/reward.py`**。
- **grader→reward 两条路**（逻辑在 `runner/agent.py`）：
  1. **隐式（最常用）**：`@rollout` 函数**直接 `return` 一个 float**（`float` 是合法 `RolloutRawResult`，`core.py:307`）。runner 在 `agent.py:294` 判 `isinstance(raw_result, (bool,int,float))` → `agent.py:304` 自动 `emit_reward(raw_result)`。
  2. **显式**：函数体里调 `emit_reward(score)`（`emitter/reward.py:148`），或给 grader 加 `@reward` 装饰器——适合一次 rollout 发多维 reward。
- **回读**：`find_final_reward(spans)`（`emitter/reward.py:307`）倒序找最后一个 reward span 取值，供算法排序/优化。
- **一句话**：grader 算分 → `emit_reward` 把分写进 trace（一个 OTel span）→ `find_final_reward` 把分读回来。

### 2.7 `algorithm` — 可插拔的优化策略

- **职责**：消费 store 里的 rollout 结果来优化（改 prompt 或改权重）。
- **接口规范**（`algorithm/base.py:25`）：继承 `Algorithm`，实现 `run(train_dataset, val_dataset)`（`base.py:135`）；框架 fit 时注入依赖，run 里用 `self.get_store()`/`get_adapter()`/`get_initial_resources()`/`get_llm_proxy()` 拿脊柱组件。也可用 `@algo` 装饰器（`decorator.py`）写函数式，按关键字参数声明要哪些依赖。
- **内置只有两个**（`algorithm/__init__.py` 仅 export）：**APO**（prompt）、**VERL**（RL 权重）+ `Baseline`/`FastAlgorithm` 工具类。
- **边界**：算法是「消费者」，只通过 store 与 runner 解耦通信。**换算法不碰 rollout / reward**——这就是 method-agnostic 的兑现处。

### 2.8 `trainer` — 编排者

- **职责**：把上面全部串起来。`Trainer`（`trainer/trainer.py:120`）持有 `algorithm / store / n_runners / execution_strategy / tracer / adapter / initial_resources`，把 store/adapter/resources 注入 algorithm，并把 telemetry 接回 store。
- **默认装配**：store=`InMemoryLightningStore`、tracer=`AgentOpsTracer`、adapter=`TracerTraceToTriplet`（`trainer.py:9/19/20`）——所以最简用法不用显式传这些。

### 2.9 `types` — 数据契约

模块之间流的是这几个 pydantic 模型（`types/core.py`、`types/resources.py`）：
- `Rollout`（`core.py:174`）：一次「agent 在一个 task 上的完整执行」，含 `rollout_id/input/status/config` 重试配置；
- `Attempt`（`core.py:136`）：一次 rollout 的一次尝试（可重试多个）；
- `Triplet`（`core.py:69`）：`prompt/response/reward/metadata`——一个交互轮次（详见 §3.3）；
- `PromptTemplate`（`resources.py:146`）：APO 优化的对象，作为 resource 注入；
- `Dataset`（`core.py:376`，Protocol）：你的数据集契约。

---

## 三、三个最易踩的设计点（深答）

### 3.1 prompt 必须从 agent 里「抽出来」变成注入资源

这是接入 APO 的**唯一强制改造**。看 example：
- `room_selector.py:122` `@rollout def room_selector(task, prompt_template)`——prompt 不写死在函数里；
- `:351` `prompt_template = prompt_template_baseline()`；`:357` `runner.step(task, resources={"main_prompt": prompt_template})`。

机制：**APO 每轮生成新的 `PromptTemplate`，通过 resources 注入，agent 函数体不变，变的是注进来的 template**（`prompt_rollout` docstring，`decorator.py:391`："algorithms manage and optimize the prompt template, while agents consume the template"）。

> agent = `prompt + model + tool + knowledge`，APO 只动 prompt 一项，其余在函数体里固定。**客户 agent 若 prompt 写死，必须先重构成「baseline prompt template + 注入」**，否则 APO 没有可优化对象。

### 3.2 grader 与 reward 的关系（再强调）

很多人卡在"为什么 `reward.py` 是空的"。答案：它是 deprecated shim，真逻辑在 `emitter/reward.py` + `runner/agent.py:294-304`。**grader 是你的领域打分函数（返回 float），reward 是这个 float 被 emit 成 OTel span 后框架能读到的标准信号**。转换器就是 runner 的「return float → 自动 emit_reward」。

### 3.3 为什么叫 `Triplet`（明明 4 个字段）

`Triplet`（`core.py:69`）字段是 `prompt, response, reward, metadata`，docstring："Single interaction turn captured during reinforcement learning."
- **核心三元是 `(prompt, response, reward)`**——RL 经典三件套（≈ state-action-reward / 输入-输出-反馈）。`metadata`（`default_factory=dict`）是附加杂物袋，不计入"三元"。**名字取自语义三元组，不是字段计数**。
- **主要服务 RL/SFT 这条权重微调线**：adapter 把 trace 转成 `List[Triplet]` 喂训练。**APO 不直接用 Triplet**（它用 `TraceToMessages` 看对话）。
- **层级关系**：

```
Rollout（一个 task 的一次执行，可含多次重试 Attempt）
  └─ 内部多次 LLM 调用（room_selector 首轮 + tool 后第二轮）
       └─ 每个交互轮次 = 一个 Triplet
```

---

## 四、端到端追一次 rollout（把脊柱跑起来）

以 room_selector 为例，串起 §二的模块：

1. **trainer.fit()** 装配 store/tracer/adapter，把 `prompt_template_baseline()` 作为 initial resource 交给 APO；
2. **APO（algorithm）** 生成一个候选 `PromptTemplate`，往 **store** enqueue 一批 rollout；
3. **runner** 从 store 取任务，调你的 `@rollout` 函数（注入该 prompt_template）；
4. 函数体内 agent 调 LLM（**tracer** 自动把每次调用记成 span），最后 `return grader(...)` 的 float；
5. **runner** 见返回 float → `emit_reward` 写一个 reward span → 全部 spans 回写 **store**；
6. **adapter**（`TraceToMessages`）把 spans 还原成对话 messages；`find_final_reward` 取出分数；
7. **APO** 拿分数做 beam search 选优，生成下一代 prompt → 回到第 2 步。

> 换成 RL：第 6 步换 `TraceToTriplet` 取训练样本，第 7 步换 VERL 更新权重——**第 1~5 步（你的 agent + reward）一行不改**。这就是脊柱的价值。

---

## 五、内置算法 vs 自定义算法（SFT 的真实身份）

- **内置（一等公民）**：APO、VERL。
- **SFT 不是内置算法类**——它走「自定义算法扩展点」：继承 `Algorithm` + 实现 `run()`，在 `run()` 里用 `store.enqueue_rollout(...)` 收集带 reward 的轨迹、用 adapter 转 triplet、再喂给 Unsloth/Azure 微调。官方示例：
  - `examples/unsloth/sft_allinone.py`（Unsloth + LoRA + `trl.SFTTrainer`）；
  - `examples/azure/`（Azure OpenAI fine-tuning job，把成功 checkpoint 部署成新 deployment）。

> 这纠正了 [[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]] 初版把 SFT 列为内置算法的说法。

**自定义算法长什么样**：`examples/apo/apo_custom_algorithm.py` 演示了不依赖 `APO` 类、自己写优化循环的写法——核心就一句 `await store.enqueue_rollout(...)`（`apo_custom_algorithm.py:69`），配合 `apo_custom_algorithm_trainer.py` 的「algorithm 进程 + runner 进程」分离模式。这套「store 居中、算法与执行解耦」的写法，是 [[Agent Lightning系列03：自定义算法与Trainer集成——5个store动作、生产者消费者与一键运行]] 的主题。

---

## 六、客户 agent 接入 playbook（四步插槽）

把脊柱的两端插上你的零件即可：

1. **包 agent**：现有 agent 逻辑写进一个 `@rollout` 函数（签名 `(task, prompt_template)` 或 `(task, llm)`）；
2. **写 reward**：定义 grader（返回 float），让 rollout 函数 `return` 它——**这步最难，框架帮不上忙**（reward 设计 + 降噪是真瓶颈，见系列01 §4.4）；
3. **抽 prompt**：若 agent prompt 写死，重构成 baseline `PromptTemplate` + 注入（§3.1）；
4. **选 trainer 槽位**：先插 APO 调 prompt；将来换 RL（VERL）/SFT 时，**这步之外一行不改**。

---

## 七、小结与系列展望

本篇把 APO 单点视角升级成**整框架视角**，核心认知：

1. 框架是一条**数据流脊柱**：litagent→runner→tracer→store→adapter→reward→algorithm，trainer 编排、types 做契约；
2. **控制反转**：你提供 agent 逻辑 + reward + 数据（领域），框架提供执行/追踪/存储/算法（基础设施）；
3. `@rollout` 包**函数**不包实例，靠签名自动判型；prompt 必须抽成**注入资源**才能被 APO 优化；
4. grader→reward 靠「return float → 自动 emit_reward span → find_final_reward 回读」；
5. **adapter 是 method-agnostic 的接缝**：APO 走 messages、RL/SFT 走 triplet，换方法不动 agent；
6. 内置算法只有 **APO + VERL**，**SFT 走自定义算法扩展点**（Unsloth/Azure 示例）。

**系列后续计划**：

- 系列 03（已完成）：[[Agent Lightning系列03：自定义算法与Trainer集成——5个store动作、生产者消费者与一键运行]]——拆 `apo_custom_algorithm.py` / `apo_custom_algorithm_trainer.py`，讲清 5 个 store 动作接入契约、algo/runner 生产者消费者分工、Trainer 自带内存 store 的一键运行
- 系列 04（已完成）：[[Agent Lightning系列04：APO源码祛魅——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景]]——逐行打开 `apo.py`，戳破"算法=LLM调用+sorted"、"多 agent 协作是虚拟角色"，讲清难度迁移与核心使用场景
- 系列 05：VERL 路线——真正微调权重的 RL 训练（GPU 环境）
- 系列 06：把框架套到自己的真实 Agent 上（换数据集 + reward + agent 逻辑）

> 相关：[[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]]、[[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]
