---
title: "method-agnostic（方法无关设计）"
created: "2026-07-02"
updated: "2026-07-07"
tags:
  - wiki
  - concept
  - agent-training
  - architecture
aliases:
  - "方法无关"
  - "换算法只换槽位"
  - "method-agnostic 设计"
related:
  - "[[agent-lightning]]"
  - "[[verl]]"
  - "[[bitter-lesson]]"
---

# method-agnostic（方法无关设计）

## 摘要

**method-agnostic** 是一种优化框架的设计原则：把「优化方法」从「被优化对象」中彻底剥离，使得更换方法（如 APO↔SFT↔RL）退化为**更换一个槽位**，而非重写整个框架。它的兑现处不在算法本身，而在一条居中的**控制平面（store / buffer）**——生产者（rollout/runner）与消费者（algorithm）通过它解耦通信，各自只认接口不认对方实现。

这个原则最完整的落地是 [[agent-lightning]]：你提供「领域零件」（agent 逻辑 + reward grader + 数据集），框架提供「基础设施 + 算法」，换优化方法时 **agent 代码与 reward 一行不改**，只换 `algorithm/` 出口槽位。它支撑起「APO → SFT → RL」由轻到重的三级优化阶梯，也是它区别于纯 prompt 工具（如 DSPy）的差异化价值。同一形状在不同层反复出现：[[verl]] 让「算法替换成为配置问题」（PPO/GRPO/RLHF 可插拔），[[skillopt]] 让「换 environment 不换 algorithm」——共同构成一条 "agnostic 设计脊柱"。

## Claims

### Claim: method-agnostic 的定义是「换方法只换槽位，agent 与 reward 不改」

- **来源**：[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
- **首次出现**：2026-06
- **最近更新**：2026-07-02
- **置信度**：0.9
- **状态**：active

> Agent Lightning 是一个 method-agnostic 的 agent 优化训练框架：换优化方法（APO↔SFT↔RL）只换 `algorithm` 槽位，agent 代码与 reward grader 一行不改。这把「升级优化能力」从"换框架/重写"降级为"换槽位"，是 method-agnostic 的核心承诺。

### Claim: 接缝是 adapter——同一份 trace，不同算法用不同消费方式

- **来源**：[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
- **首次出现**：2026-06
- **最近更新**：2026-07-02
- **置信度**：0.9
- **状态**：active

> 同一份 trace，APO 走 `TraceToMessages`（看对话），RL/SFT 走 `TraceToTriplet`（取训练样本）。algorithm 是「消费者」，只通过 store 与 runner（生产者）解耦通信——换优化方法 = 换 algorithm 出口槽位，rollout / reward / store 一行不改。这是 method-agnostic 从"口号"变成"接缝"的具体位置。

### Claim: store（控制平面）是 method-agnostic 能成立的物理基础

- **来源**：[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
- **首次出现**：2026-06
- **最近更新**：2026-07-02
- **置信度**：0.85
- **状态**：active

> 自定义算法不依赖内置 `APO`/`VERL` 类，自己写优化循环，核心接入契约就是一组 store 动作（`enqueue_rollout` 等 5 个）。store 不是被动存储，而是 runner↔algorithm 之间的协调中枢——正因为有这个居中的控制平面，生产者与消费者才能各自替换而互不影响。没有 store，method-agnostic 只是愿望；有了 store，它才有物理支点。

### Claim: 三级阶梯（APO→SFT→RL）共享同一份 reward，只是消费方式不同

- **来源**：[[automatic-prompt-optimization]]、[[rejection-sampling-finetuning]]
- **首次出现**：2026-06
- **最近更新**：2026-07-02
- **置信度**：0.85
- **状态**：active

> method-agnostic 阶梯由轻到重：APO（不动权重，`sorted()[:beam_width]` 用 reward 排序选 prompt）→ SFT/RAFT（用 reward 筛轨迹做微调，改权重）→ RL（用 reward 当梯度信号）。三者共享同一份 grader/reward，差异只在"如何消费 reward"。这证明 method-agnostic 不是三个独立系统的拼接，而是一份 reward 的三种读法。

### Claim: 「让算法替换成为配置问题」是同一原则在 infra 层的表达

- **来源**：[[Agent Lightning系列03：推理与训练的分野——VERL架构拆解]]
- **首次出现**：2026-06
- **最近更新**：2026-07-02
- **置信度**：0.8
- **状态**：active

> VERL 的算法与执行引擎解耦——PPO/GRPO/RLHF/RLVR 皆为可插拔配置项，"让算法替换成为一个配置问题"，与 agent-lightning 上层的 method-agnostic 一脉相承。区别是层次：agent-lightning 在 RL infra 之上做"换优化方法"，VERL 在 RL 引擎内部做"换 RL 算法"。同一个"解耦+插槽"形状在不同抽象层各出现一次。

### Claim: environment-agnostic 是 method-agnostic 的环境侧孪生

- **来源**：[[skillopt]]
- **首次出现**：2026-07
- **最近更新**：2026-07-02
- **置信度**：0.8
- **状态**：active

> SkillOpt 的 `ReflACTTrainer.train()` 编排六阶段流水线，但不认识任何 benchmark——所有 rollout/数据加载通过 `EnvAdapter` 接口回调。接新任务不改 trainer，只写一个 adapter。这与 agent-lightning "换算法只换槽位"同构，区别是这里换的是 **environment** 不是 algorithm。两者共同揭示：把"什么会变"隔离进一个契约层，是让框架长期可扩展的通用手法。

## 冲突与演进

- **母概念归口（2026-07-02）**：method-agnostic 此前散落在 7 个 wiki 页（agent-lightning / verl / reinforcement-learning / rejection-sampling-finetuning / automatic-prompt-optimization / skillopt / prompt-optimization-tool-selection）作为论据，但无归口页。本次抽为独立概念页，上述页面通过 `part-of` / `grounds` 关联到此。
- **层次澄清**：method-agnostic（换优化方法）、VERL 的算法可插拔（换 RL 算法）、environment-agnostic（换环境）三者是**同一原则在不同抽象层的实例**，不是同一层的竞争关系。本页作为"agnostic 设计脊柱"的母概念收束三者。

## 关联概念

- [[agent-lightning]] — `part-of` method-agnostic 是 agent-lightning 的核心设计原则，本页是该原则的归口
- [[verl]] — `contrasts` VERL 在 RL 引擎内部实现"算法可插拔"，是同一原则在更低一层的表达
- [[skillopt]] — `contrasts` environment-agnostic 是 method-agnostic 的环境侧孪生（换环境 vs 换算法）

> 反向入边（在对方页面声明，此处仅备注不重复建边）：[[automatic-prompt-optimization]] 与 [[rejection-sampling-finetuning]] 各以 `part-of` 指向本页（三级阶梯的两档）；[[prompt-optimization-tool-selection]] 以 method-agnostic 是否用得上作为选型关键。

<!-- relation-type: implements / grounds / extends / constrains / contrasts / part-of / uses / produces -->

## 来源日记

- 归口自 agent-lightning 系列 02/03/07/08 与 SkillOpt 源码篇，非单篇日记，故不列具体日记条目。
