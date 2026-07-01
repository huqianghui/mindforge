---
title: "Loop Engineering"
created: "2026-06-16"
updated: "2026-06-16"
tags:
  - wiki
  - concept
  - loop-engineering
  - harness-engineering
  - agentic-engineering
  - automation
aliases:
  - "Loop Engineering"
  - "循环工程"
related:
  - "[[harness-engineering]]"
  - "[[autoresearch]]"
  - "[[feedback-loop]]"
  - "[[generation-evaluation-separation]]"
---

# Loop Engineering

## 摘要

Loop Engineering（循环工程，2026 年出现的新词）是 Agentic Engineering 的**时间维度切片**——关心反馈如何跨轮组织、人何时退出循环。它最大的概念陷阱是同一个词指着**两个不同高度的对象**：内循环（单任务的 Intent→Action→Observation→Adjustment 反馈环，⊂ Harness 的 Eval 层）和外循环（替代人类 prompter、自动发现并编排多个内循环的自治系统，⊃ Harness）。它的真正增量不在"治理/控制/验证"的复述，而在两个被低估的洞察：① **verifier 谱系**——循环形状由验证信号来源决定（Compiler>Test>Runtime>Product>Review），验证应主动"左移"；② **operator→designer 的角色跃迁**——从"按回车的人"变成"设计那个替你按回车的系统的人"。

## Claims

### Claim: Loop Engineering 一词指着内循环与外循环两个不同高度的对象

- **来源**：[[Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界]]
- **首次出现**：2026-06-15
- **最近更新**：2026-06-15
- **置信度**：0.85
- **状态**：active

> 内循环（Kilo 定义）的循环单元是单个 Agent 在单任务上的迭代（Intent→Context→Action→Observation→Adjustment）；外循环（Addy Osmani 定义）的循环单元是跨多任务、按 cadence 自动运行的编排系统。两者不是竞争定义，而是同一棵树的两层：外循环编排多个内循环。用户感到"说不清和 Harness 的区别"，正因为这两个高度被同一个词缝在一起。

### Claim: 外循环的最小内核是"自动发现 + workflow + 重复 + 跨轮记忆"，自动发现是分水岭

- **来源**：[[Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界]]
- **首次出现**：2026-06-15
- **最近更新**：2026-06-15
- **置信度**：0.85
- **状态**：active

> 自动发现（auto-discovery）+ workflow + 重复（cadence）+ 跨轮记忆（state）= 外循环，四个零件缺一不可。其中自动发现是真正的分水岭——它决定"任务从哪来"，也就是"那个不断 prompt 的人"到底有没有被替换掉。任务靠人喂进来的（普通 Harness / Ralph）不是外循环；系统自己 triage 发现的（人退到设计者位置）才是。

### Claim: 循环的形状由它的验证信号来源决定，且验证应主动"左移"

- **来源**：[[Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界]]
- **首次出现**：2026-06-15
- **最近更新**：2026-06-15
- **置信度**：0.85
- **状态**：active

> Kilo 的 5 种内循环本质是一条按 verifier 强度排序的谱系：Compiler-Driven > Test-Driven > Runtime Debugging > Product Iteration > Review-Driven（强←确定性/即时/可自动，弱←噪声/慢/要人）。两条硬规律：① verifier 越接近确定性 ground truth，循环越能跑得紧、越能无人值守；② 验证应尽量左移——把设计约束编码成 test、把 review comment 沉淀成 lint rule，把循环从右侧（要人）推向左侧（可自动）。这是控制论"控制器只能调到传感器测得准的程度"的直接推论：Agent 产出质量的上限 = verifier 质量的上限。

### Claim: Loop Engineering 横切了 Harness 的边界——一半是旧（内循环），一半是新（外循环）

- **来源**：[[Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界]]
- **首次出现**：2026-06-15
- **最近更新**：2026-06-15
- **置信度**：0.8
- **状态**：active

> Loop Engineering 不是 Harness 的同义词，也不是干净的子集或超集，而是从"反馈"视角横切了 Harness 的内部与上层：内循环 ⊂ Harness（六层架构的 L6 Eval 反馈层就是内循环实现，这部分是 Harness 的复述）；外循环 ⊃ Harness（把"多个单 Agent + 各自的 Harness"编排成自治系统，这一层在传统 Harness 叙事里缺位——Harness 默认有人在轮次之间盯着，外循环把这个人也抽掉了）。

### Claim: Ralph Loop 是外循环里"单任务执行"那一格的一种可插拔实现

- **来源**：[[Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界]]
- **首次出现**：2026-06-15
- **最近更新**：2026-06-15
- **置信度**：0.8
- **状态**：active

> Ralph Loop 与外循环是被包含关系，不在一个层面。Ralph Loop 不发现新工作（任务人喂进去，只管磨到 done/not done），外循环的第一步就是自己发现该干什么。Ralph Loop、AutoResearch、Kilo 的 5 种内循环是同一层——都是"单任务怎么收敛"的不同策略，区别在 verifier 强度和有没有 selection 机制（Ralph 无 selection，AutoResearch 有）。外循环高它们一层，只管怎么发现任务、隔离派发、独立验证、跨轮记忆。

### Claim: cron job 与 dynamic workflow 是两根正交的轴——WHEN vs HOW

- **来源**：[[Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界]]
- **首次出现**：2026-06-15
- **最近更新**：2026-06-15
- **置信度**：0.8
- **状态**：active

> cron job 管 WHEN（何时触发，触发/调度轴，人预先写死的确定性调度，对应 Anthropic 的 workflow 分类）；dynamic workflow 管 HOW（如何决策执行，控制流轴，模型运行时决定，对应 agent 分类）。一句话：cron 决定"什么时候醒"，dynamic workflow 决定"醒了之后怎么干"。外循环两者都需要——光有 cron 没 workflow，醒了不知道干嘛；光有 workflow 没 cron，没人按开始。cron + dynamic workflow 就是一个最小可用外循环（MVP），框架（Conductor/Gas Town）省的只是 worktree 隔离、state 持久化、并行调度、diff 审查这几件脏活。

### Claim: Loop Engineering 的核心是 operator→designer 的角色跃迁

- **来源**：[[Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界]]
- **首次出现**：2026-06-15
- **最近更新**：2026-06-15
- **置信度**：0.8
- **状态**：active

> Osmani 的点题是"把自己——那个不断 prompt agent 的人——替换掉"（You design the system that does it instead）。杠杆点从 prompting 移到了 loop design，但责任没有转移——"Build the loop. But build it like someone who intends to stay the engineer, not just the person who presses go." 自治不等于免责，三个代价：验证仍是人工的（done 是声明不是证明）、理解债（Comprehension Debt）累积、认知投降（Cognitive Surrender）的诱惑被循环放大。

### Claim: 外循环已收敛成成熟落地栈，五团队独立得出"瓶颈是基础设施，不是智能"

- **来源**：[[Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界]]
- **首次出现**：2026-06-15
- **最近更新**：2026-06-15
- **置信度**：0.75
- **状态**：active

> OpenAI、Anthropic、Geoffrey Huntley、Horthy、Vasilopoulos 五个独立团队收敛到同一发现。三层框架栈：单任务自治内核（Ralph / Codex `/goal` / Claude Code headless）、并行编排器（Conductor/Crystal/Claude Squad，worktree 隔离）、高吞吐 swarm 引擎（Gas Town + Beads）。四根支柱：Context 架构（分层渐进披露）、Agent 专精（scoped + maker/checker 分离）、持久记忆（文件系统而非对话历史）、结构化执行（research→plan→execute→verify）。Cobus Greyling 的 7 个 playbook（PR Babysitter、Daily Triage、CI Sweeper 等）是窄范围外循环——窄不等于矮，它们仍替换掉了那个手动盯 PR/扫依赖的人。

### Claim: 外循环的安全总纲是"管道自动化，判断留给人"——按 verifier 强弱分级自治

- **来源**：[[Loop Engineering实践——把个人知识库改造成一个外循环系统]]
- **首次出现**：2026-06-16
- **最近更新**：2026-06-16
- **置信度**：0.8
- **状态**：active

> 按验证信号分两类：确定性管道（README 失同步、索引过期、坏图、死链、Claim 年龄——有 ground truth 可程序判定）→ L2 自动执行；语义判断（该提取哪些概念、Claim 对不对、冲突怎么解、该学什么——无 ground truth）→ L1 只提议。铁律：循环替我跑腿，但"什么值得进入 wiki"永远是我的判断——wiki 是认知模型，自动污染它等于污染自己。验证信号弱的循环，约束必须写得更死（如热点雷达：wiki 缺失 ≠ 我不知道，只报近 30 天新名词，绝不铺基础概念）。

### Claim: 无人值守的外循环要三个互相独立的部件——触发器 ≠ 记忆 ≠ trace

- **来源**：[[Loop Engineering实践——把个人知识库改造成一个外循环系统]]
- **首次出现**：2026-06-16
- **最近更新**：2026-06-16
- **置信度**：0.8
- **状态**：active

> 触发器（cron 只是闹钟，真正的循环体是每次那一发 `claude -p`，起一个全新无记忆会话跑完即销毁）、记忆（LOOP_STATE.md，待办快照会被覆盖更新，因为每发都失忆，"模型会忘，仓库不会忘"，也是人工审阅的唯一入口）、trace（loop-run-log.md，只追加不覆盖的事件流，记每轮耗时/退出码）。STATE 是"现在的待办快照"，run-log 是"历史的事件流"。把三件拆开，每层能单独看、单独换，比混在一起的"自动化脚本"易审计。

### Claim: 瓶颈是基础设施不是智能——外循环补的是无状态控制器的"身体"

- **来源**：[[Loop Engineering实践——把个人知识库改造成一个外循环系统]]
- **首次出现**：2026-06-16
- **最近更新**：2026-06-16
- **置信度**：0.8
- **状态**：active

> 借控制论：模型是无状态控制器 `f(context)→output`，外循环系统补的全是它"身体"的部分——传感器（verifier/自动发现）、执行器（connectors：qmd/git/README 写入）、记忆（LOOP_STATE.md）、触发（cron 心跳）。更聪明的模型也替代不了这层，因为这些是系统属性不是智能属性：再聪明的无状态函数也无法凭空长出一块硬盘或一个闹钟。认知脚手架会被更强模型吸收，但"具身事实"不会——这正是 Loop Engineering 是一门工程而非"等模型变强"的原因。

### Claim: 适合做成外循环的工作流有三个特征

- **来源**：[[Loop Engineering实践——把个人知识库改造成一个外循环系统]]
- **首次出现**：2026-06-16
- **最近更新**：2026-06-16
- **置信度**：0.75
- **状态**：active

> ① 重复且有节奏（每天/每周固定要做，否则自动化收益盖不过维护成本）；② 大部分步骤有 ground truth（能交给确定性管道的越多越敢放手）；③ 判断点能干净隔离（把"需要品味"的环节收敛成 STATE 里几条待审，人只在这几个点花注意力）。最终留下的不是"全自动的知识库"，而是一个帮你跑腿、把判断浓缩到一处等你拍板的系统。分阶段信任：先手动空跑验证管道安全 + 语义层守得住边界，再挂 cron。

## 冲突与演进

- 2026-06-15：概念澄清篇确立内/外循环双高度框架，定位 Loop Engineering 在 Prompt⊂Context⊂Harness 概念栈中是"时间维度切片"，并提出 verifier 谱系这一核心增量。
- 2026-06-16：实践篇把外循环最小内核落到个人知识库（PKC），验证"管道自动化、判断留给人"的分级自治可行，并提炼出"瓶颈是基础设施不是智能"的具身控制论洞察。

## 关联概念

- [[harness-engineering]] — `extends` Loop Engineering 是 Harness Engineering 的时间维度切片：内循环 ⊂ Harness 的 L6 Eval 层，外循环 ⊃ Harness（补上人退出后系统怎么自转）
- [[autoresearch]] — `contrasts` AutoResearch 与 Ralph Loop 同为外循环可插拔的"单任务执行内核"，区别在 selection 机制；AutoResearch 五约束正是外循环的保障性护栏
- [[generation-evaluation-separation]] — `uses` 外循环用 maker/checker 分离做独立验证（独立模型打分而非自评）
- [[agent-paradigms]] — `uses` cron=workflow（预定义路径）、dynamic workflow=agent（模型自主控制流），对应 Anthropic 的 workflow/agent 二分
- [[personal-knowledge-compiler]] — `produces` 把 PKC 改造成外循环系统是 Loop Engineering 的一次落地实践

## 来源日记

- [[Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界]] — 内/外循环双高度、最小内核方程、verifier 谱系、与 Harness/Ralph 的边界、cron vs dynamic workflow
- [[Loop Engineering实践——把个人知识库改造成一个外循环系统]] — 把外循环装到 PKC 上：管道自动化判断留人、三件套、5loop×3phase、瓶颈是基础设施
- [[2026-06-15-周一]] — 了解和学习 Loop Engineering（概念澄清）
- [[2026-06-16-周二]] — Loop Engineering 实践：把知识库改造成外循环系统
