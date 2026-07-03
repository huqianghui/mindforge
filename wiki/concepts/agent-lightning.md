---
title: "Agent Lightning"
created: "2026-06-29"
updated: "2026-06-29"
tags:
  - wiki
  - concept
  - agent-lightning
  - framework
  - rollout
  - reward
  - method-agnostic
aliases:
  - "Agent Lightning"
  - "agent-lightning"
  - "method-agnostic 训练框架"
related:
  - "[[automatic-prompt-optimization]]"
  - "[[rejection-sampling-finetuning]]"
  - "[[reinforcement-learning]]"
  - "[[generation-evaluation-separation]]"
---

# Agent Lightning

## 摘要

Agent Lightning（`microsoft/agent-lightning`）是一个 **method-agnostic 的 agent 优化训练框架**：你提供「领域零件」（agent 逻辑 + reward grader + 数据集），框架提供「基础设施 + 算法」（执行/追踪/存储/优化），通过一条单向数据流脊柱把"什么算好"变成"可迭代的优化循环"。其核心设计价值在于——**换优化方法（APO↔SFT↔RL）只换 algorithm 槽位，agent 代码与 reward 一行不改**，从而支撑「APO → SFT → RL」由轻到重的三级优化阶梯。

[[automatic-prompt-optimization]]（APO）和 [[rejection-sampling-finetuning]]（SFT/RAFT）是它 `algorithm/` 槽位里的两个具体算法；[[prompt-optimization-tool-selection]] 与 [[hybrid-inference-framework-selection]] 等决策也以它为评估对象。本页是这些算法页/决策页的母概念。

## Claims

### Claim: 框架是一条 9 模块数据流脊柱 + 控制反转

- **来源**：[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> litagent → runner → tracer → store → adapter → reward → algorithm 是一条单向数据流，trainer 编排、types 做契约（基于 0.3.1 源码逐模块带 `file:line` 拆解）。控制反转：你定义「什么算好」的静态零件（agent 逻辑 + reward grader + 数据集），框架拥有「把好坏变成可迭代优化循环」的动态机制。

### Claim: method-agnostic 的接缝是 adapter——换算法不动 agent

- **来源**：[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> 同一份 trace，APO 走 `TraceToMessages`（看对话），RL/SFT 走 `TraceToTriplet`（取训练样本）。algorithm 是「消费者」，只通过 store 与 runner（生产者）解耦通信——换优化方法 = 换 algorithm 出口槽位，rollout / reward / store 一行不改。这是 method-agnostic 的兑现处，也是它区别于纯 prompt 工具（DSPy）的差异化价值。

### Claim: @rollout 包函数不包实例；prompt 必须抽成注入资源

- **来源**：[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> `@rollout` 靠 `inspect.signature` 自动判型，硬性签名：第一参必须叫 `task`，必须带 `llm` 或 `prompt_template` 之一。框架不关心函数体用 LangChain/OpenAI/AutoGen，只认「签名 + 返回值」——所谓"零代码改动"实质是"包一层符合签名的函数"。但接入 APO 有唯一强制改造：agent 若把 prompt 写死，必须重构成 baseline `PromptTemplate` + 注入，否则 APO 没有可优化对象。

### Claim: store 是训练的控制平面，不只是 trace 存储

- **来源**：[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> store 自称 "persistent control-plane that coordinates training rollouts"——存队列、attempt、状态机、spans、resources，是 runner（生产者）↔ algorithm（消费者）的中枢。生产选型：负载是「高频小记录读写 + 队列状态机 + 嵌套 JSON spans」，Azure 上用 Cosmos DB for MongoDB API 最省事（协议兼容、0 代码复用现成 mongo 实现）；已有 PostgreSQL 则 pg+JSONB 自己实现接口；MySQL 不推荐（JSON 支持弱）。

### Claim: 三级优化阶梯 APO → SFT → RL，SFT 是微调权重最便宜稳的入口

- **来源**：[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> 由轻到重：APO（只改 prompt，推理级，受限基座已有能力）→ SFT（拒绝采样只学正样本，16GB LoRA 可跑，把 pass@k 压成 pass@1）→ RL（正负样本+探索，40GB+，能探出新策略）。SFT 不是可有可无的过渡：① APO 改不动「能不能做对」只改「怎么说」，到顶后动权重最便宜入口是 SFT；② RL 几乎总要 SFT warmup，跳过直接 RL 冷启动易崩；③ reward 干净且 pass@k>0 时 SFT 性价比最优。其「只学正样本不探索」的限制恰是它便宜稳的来源——是 tradeoff 不是缺陷。

### Claim: 内置算法只有 APO + VERL，SFT 走自定义算法扩展点

- **来源**：[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> `algorithm/__init__.py` 仅 export 两个一等公民：APO（prompt）、VERL（RL 权重）。SFT **不是**内置算法类——它继承 `Algorithm` + 实现 `run()`，在 run 里用 `store.enqueue_rollout` 收集带 reward 轨迹、adapter 转 triplet、喂 Unsloth/Azure 微调（`examples/unsloth/sft_allinone.py`、`examples/azure/`）。这纠正了系列01 初版把 SFT 列为内置算法的说法。

### Claim: store 居中解耦——算法与执行靠 5 个 store 动作做生产者消费者

- **来源**：[[Agent Lightning系列03：自定义算法与Trainer集成——5个store动作、生产者消费者与一键运行]]
- **首次出现**：2026-06-26
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> 自定义算法不依赖内置 `APO`/`VERL` 类，自己写优化循环，核心接入契约就是一组 store 动作（`enqueue_rollout` 等 5 个）。algorithm 进程（消费者）与 runner 进程（生产者）通过 store 解耦，可分进程跑也可用 Trainer 自带内存 store 一键运行。这印证了 §2.4「store 是控制平面」——它不是被动存储，而是 runner↔algorithm 之间的协调中枢，是 method-agnostic 能成立的物理基础。

### Claim: 算法本质 = LLM 调用 + sorted，"多 agent 协作"是虚拟角色

- **来源**：[[Agent Lightning系列04：APO源码剖析——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景]]
- **首次出现**：2026-06-26
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> 逐行打开 `apo.py` 后戳破两个直觉误解：① APO 算法核心就是「LLM 调用 + `sorted`（按 reward 排序选优）」，没有神秘机制；② APO 内部的"多 agent 协作"（Judge/Critic/Editor/BeamSearch）是同一个 LLM 扮演的虚拟角色，不是多个独立 agent 进程。这与 [[rejection-sampling-finetuning]] 的「内核是 sorted」形成同构——APO 和 SFT 共享「采样 → 按 reward 排序 → 取优」的对称结构。

### Claim: 对 VERL 是架构锁定而非简单依赖——Agent RL 是系统问题

- **来源**：[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]、[[Agent Lightning系列08：RL实战篇——example选型、calc_x跑通VERL训练与tinker等框架]]
- **首次出现**：2026-06-29
- **最近更新**：2026-07-03
- **置信度**：0.85
- **状态**：active

> agent-lightning 的 RL 这一级只有一条内置路径——`algorithm` 槽位里的 [[verl]]。它不是「兼容 VERL」而是「建立在 VERL 类架构假设之上」，隐式依赖四项能力：多步 Agent→trajectory RL、工具调用→async rollout、高吞吐→分布式 rollout worker、RLVR/自动奖励→自定义 reward pipeline。这套「rollout abstraction + reward pipeline + actor/critic/rollout/reward worker + Ray runtime」正是 Triplet 轨迹、reward span、store 控制平面在 RL 级能落地的前提。本质：Agent 时代 RL 是分布式系统问题而非算法问题，VERL 被选中是因它解决「系统级 RL」瓶颈（框架选型详见 [[rl-infra-framework-selection]]）。**补充（系列08 实战暴露）**：这层架构锁定不是抽象的、而是钉在具体版本上的紧耦合——agentlightning 0.3.1 按老路径 import `verl.workers.fsdp_workers`，verl 0.8.0 已删该模块，故 0.3.1 只能配 verl ≤0.7.0。跨库 import 契约会随 VERL 版本演进而破裂，"架构建立在假设之上"的代价是版本窗口很窄（详见 [[verl]] 版本锁定 Claim）。

### Claim: 数据流飞轮在哲学上与 Slime 同构，反比所绑的 VERL 更近

- **来源**：[[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]]
- **首次出现**：2026-06-29
- **最近更新**：2026-06-29
- **置信度**：0.75
- **状态**：active

> agent-lightning 的 `runner→store→algorithm` 飞轮与 [[slime-rl-framework]] 的 `Rollout→Data Buffer→Training` 数据流逐项同构（store↔Data Buffer 居中中枢、runner↔Rollout 产数据、algorithm↔Training 吃数据改 prompt/权重），且 method-agnostic 正是 Slime「Agent workflow = data generation」的另一种表述；反而与 VERL 的 Controller+Workers（中央 Driver 逐步编排）范式相反。但关键修正：二者**不在同一层**——agent-lightning 在 RL infra 之上，VERL/Slime 是被填进其 `algorithm` 槽位的引擎。故「与 Slime 更吻合」指「换 Slime 会更统一（数据流包数据流）」，而非「现在选错了」；绑 VERL 是工程选型（生态/多 backend/Server mode）而非哲学错配。本质是 Agent RL「rollout 与优化解耦、用 buffer 连成数据流」这一形状在不同层的殊途同归。

## 冲突与演进

- 2026-06-25：系列02 纠正系列01——SFT 不是内置算法类，而是走自定义算法扩展点（继承 `Algorithm` + `run()`）。
- 2026-06-29：从系列07 与 Slime vs VERL 对比补充——对 VERL 是架构锁定（Agent RL=系统问题）、数据流飞轮与 Slime 同构但不同层，接入 verl/slime-rl-framework 概念页。
- 2026-07-03：从系列08 实战篇细化架构锁定 Claim——加入版本窗口证据（0.3.1↔verl≤0.7.0，verl 0.8.0 删 fsdp_workers），置信度 0.8→0.85。

## 关联概念

- [[generation-evaluation-separation]] — `uses` litagent（生成）与 reward grader（评估）分离正是生成-评估分离原则的框架级实例
- [[bitter-lesson]] — `grounds` method-agnostic 阶梯让优化方法可随算力/数据升级，体现"计算胜过人工设计"
- [[sft-rejection-sampling-hands-on]] — `produces` 三级阶梯第二级（SFT）的动手实战流程页
- [[verl]] — `uses` VERL 是 agent-lightning RL 级唯一内置后端，二者是架构锁定关系
- [[slime-rl-framework]] — `contrasts` Slime 的 Data Buffer 数据流与 agent-lightning 的 store 飞轮同构，比所绑的 VERL 更近（但不同层）
- [[skillopt]] — `contrasts` 权重级（policy/θ，需 GPU）vs 文本级（context/外部状态，冻结/可迁移）的互补层，可叠加

## 来源日记

- [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] — 9 模块脊柱、控制反转、method-agnostic 接缝、store 选型、三级阶梯、客户接入 playbook
- [[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]] — APO 单点接线与 beam search 内核
- [[Agent Lightning系列03：自定义算法与Trainer集成——5个store动作、生产者消费者与一键运行]] — 5 个 store 动作、algo/runner 生产者消费者分工
- [[Agent Lightning系列04：APO源码剖析——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景]] — 算法=LLM调用+sorted、虚拟多 agent 真相
- [[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]] — SFT 内核：拒绝采样造标签、自蒸馏
- [[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]] — SFT 实战：Azure GPU VM + unsloth 跑通
- [[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]] — RL 这一级绑定 VERL 的选型逻辑与架构锁定本质
- [[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]] — agent-lightning 飞轮与 Slime 数据流同构、不同层的殊途同归
- [[Agent Lightning系列08：RL实战篇——example选型、calc_x跑通VERL训练与tinker等框架]] — calc_x 首跑暴露架构锁定的版本窗口（0.3.1↔verl≤0.7.0）
