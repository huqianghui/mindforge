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

## 冲突与演进

- 2026-06-25：系列02 纠正系列01——SFT 不是内置算法类，而是走自定义算法扩展点（继承 `Algorithm` + `run()`）。

## 关联概念

- [[automatic-prompt-optimization]] — `part-of` APO 是 agent-lightning `algorithm/` 槽位的内置算法之一（一等公民）
- [[rejection-sampling-finetuning]] — `part-of` SFT/RAFT 走 agent-lightning 自定义算法扩展点，是三级阶梯的第二级
- [[reinforcement-learning]] — `part-of` VERL（RL）是 agent-lightning 内置算法，三级阶梯的最高级，需 SFT warmup
- [[generation-evaluation-separation]] — `uses` litagent（生成）与 reward grader（评估）分离正是生成-评估分离原则的框架级实例
- [[bitter-lesson]] — `grounds` method-agnostic 阶梯让优化方法可随算力/数据升级，体现"计算胜过人工设计"
- [[sft-rejection-sampling-hands-on]] — `produces` 三级阶梯第二级（SFT）的动手实战流程页

## 来源日记

- [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] — 9 模块脊柱、控制反转、method-agnostic 接缝、store 选型、三级阶梯、客户接入 playbook
- [[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]] — APO 单点接线与 beam search 内核
- [[Agent Lightning系列03：自定义算法与Trainer集成——5个store动作、生产者消费者与一键运行]] — 5 个 store 动作、algo/runner 生产者消费者分工
- [[Agent Lightning系列04：APO源码剖析——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景]] — 算法=LLM调用+sorted、虚拟多 agent 真相
- [[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]] — SFT 内核：拒绝采样造标签、自蒸馏
- [[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]] — SFT 实战：Azure GPU VM + unsloth 跑通
