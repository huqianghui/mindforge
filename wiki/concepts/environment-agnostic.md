---
title: "Environment-Agnostic（环境无关设计）"
created: "2026-07-16"
updated: "2026-07-16"
tags:
  - wiki
  - concept
  - agent-training
  - architecture
  - adapter-pattern
aliases:
  - "environment-agnostic"
  - "环境无关"
  - "EnvAdapter 契约"
related:
  - "[[method-agnostic]]"
  - "[[skillopt]]"
  - "[[agent-lightning]]"
---

# Environment-Agnostic（环境无关设计）

## 摘要

Environment-agnostic 指训练/优化框架把"任务环境"完全隔离到单一 adapter 接缝之后：trainer 编排全部优化流水线但**不认识任何具体 benchmark**，接新任务不改 trainer、只写一个环境适配层（数据 schema、rollout 执行、打分）。它是 [[method-agnostic]]（换优化算法只换槽位）的**环境侧孪生**——一个解耦"用什么方法优化"，一个解耦"在什么任务上优化"，同一 agnostic 原则在两个正交轴上的实例。

两篇独立来源使其达建页门槛：SkillOpt 源码篇（系列01 §六）给出接口定义——`EnvAdapter` 四个 abstract 方法（`build_train_env`/`build_eval_env`/`rollout`/`get_task_types`），六阶段主循环全部通过回调消费环境；实战篇（系列03）用 video2frames 真实客户任务验证了这个契约的收益与暗面：显式契约可测试可调试，但接口之外的隐式要求会静默退化。

## Claims

### Claim: 接新任务只写 EnvAdapter——trainer 零修改零 fork，所有框架要客户提供的东西本质相同：数据、执行、打分

- **来源**：[[SkillOpt系列01：源码篇——主要模块拆解与六阶段执行流剖析]]、[[SkillOpt系列03：实战篇——video2frames提示词调优，从agent-lightning APO移植到SkillOpt]]
- **首次出现**：2026-07-01
- **最近更新**：2026-07-15
- **置信度**：0.85
- **状态**：active

> trainer 是唯一"发动机"（编排 ROLLOUT→REFLECT→AGGREGATE→SELECT→UPDATE→EVALUATE 六阶段），但所有 rollout/reflect/数据加载通过 `EnvAdapter` 接口回调——想接新任务不改 trainer，只写 adapter。video2frames 移植实证：`train.py` 薄到只有两行有效逻辑（`_ENV_REGISTRY["video2frames"] = Video2FramesAdapter` 注册 + `main()` 委托），是组合根模式（同 pytest 插件、Django app），换来上游 trainer 零修改零 fork——断点续跑、gate、token 记账全部白拿。更深一层：**两个框架（agent-lightning / SkillOpt）要客户提供的东西本质相同**——数据（任务长什么样）、执行（skill + 任务怎么变成模型输出）、打分（输出好不好），差别只在插槽的形状。按设计含金量排序：reward 设计（唯一需要"设计"的部分）→ 目标调用（机械）→ 数据接入（纯机械）→ 胶水（近乎模板）——前三项就是业务本身，没有框架能替你写。

### Claim: 环境契约有隐式/显式两种形状——取舍是上手成本 vs 可排查性，交付客户长期维护选显式

- **来源**：[[SkillOpt系列03：实战篇——video2frames提示词调优，从agent-lightning APO移植到SkillOpt]]
- **首次出现**：2026-07-15
- **最近更新**：2026-07-15
- **置信度**：0.8
- **状态**：active

> 同一个任务在两个框架上的环境接入形态对照：**agent-lightning 契约小而隐式**——一个 rollout 函数 + tracer 标签上报 reward，上手代码最少，但 reward 悄悄没被收集到时几乎无从排查；**SkillOpt 契约大而显式**——一个文件变五个（`tasks.py`/`dataloader.py`/`rollout.py`/`evaluator.py`/`adapter.py`），但每个职责单一、纯函数为主，全部可离线单测（76 个测试零网络调用是直接收益）。对要交付客户长期维护的项目，显式契约更划算：可测试、可调试、跨平台一致（顺带的架构红利：单机纯 I/O 场景用单进程 ThreadPoolExecutor 即可，零 macOS/Linux 差异——agent-lightning 的 server-client 多进程是为跨机器 rollout/进程隔离/可杀挂死设计的，不需要那三个特性就不必付 OS 语义差异的代价）。

### Claim: 显式契约也有暗面——接口之外的隐式要求会静默退化，"接口实现完"≠"数据流追通过"

- **来源**：[[SkillOpt系列03：实战篇——video2frames提示词调优，从agent-lightning APO移植到SkillOpt]]
- **首次出现**：2026-07-15
- **最近更新**：2026-07-15
- **置信度**：0.85
- **状态**：active

> 静默 skip 事故（2026-07-15）：一次完整训练（4 epochs × 5 steps，约 149 万 prompt tokens）产出的 `best_skill.md` 与初始 skill 逐字节相同——`summary.json` 显示 `total_skips: 20`、`best_origin: "initial_skill"`、token 记账里完全没有 analyst 调用。根因：SkillOpt 反思管线读每条 rollout 的 `conversation.json` 构造 analyst 输入，文件不存在时**静默 `continue`**；而这个要求是**隐式契约**——不在 `EnvAdapter` 抽象接口里（接口只要求返回带 id/hard/soft 的字典），只记载在内部辅助函数 docstring 里，离线测试和"history.json 每步有记录"的冒烟标准全验不出来。教训：实现完抽象方法只是必要条件，必须用一次真实/mock 运行把完整管线（rollout → reflect → merge → gate）**追一遍数据流**，确认每个阶段消费到了上一阶段的产物；每次训练后查 `summary.json` 五信号（accepts+rejects > 0、best_origin ≠ initial_skill、token_summary 有 analyst 条目、reflect_s 非零、patches 目录非空）。健康观：reject 不是失败，恰恰是门控在起作用——全 accept 或全 skip 才可疑。

## 冲突与演进

- 2026-07-16：建页。候选自 2026-07-02 loop-harvest 提出（源码篇单篇引用挂起），系列03 实战篇提供第二篇深度引用（真实移植实证 + 显式/隐式契约取舍 + 静默 skip 事故）后达 2+ 门槛。

## 关联概念

- [[method-agnostic]] — `contrasts` 环境侧孪生：method-agnostic 解耦"用什么方法优化"（换算法只换槽位），environment-agnostic 解耦"在什么任务上优化"（接新环境只写 adapter）——同一 agnostic 原则的两个正交轴
- [[agent-lightning]] — `contrasts` 其环境契约是隐式形态（rollout 函数 + tracer 上报），与 SkillOpt 的显式 EnvAdapter 形态构成"小而隐式 vs 大而显式"的取舍两端

## 来源日记

- [[SkillOpt系列01：源码篇——主要模块拆解与六阶段执行流剖析]] — EnvAdapter 四个 abstract 方法、六阶段主循环回调消费环境、与 method-agnostic 的同构关系
- [[SkillOpt系列03：实战篇——video2frames提示词调优，从agent-lightning APO移植到SkillOpt]] — video2frames 移植实证：组合根模式、五文件显式契约取舍、conversation.json 隐式契约静默 skip 事故
