---
title: "Context Explosion"
created: "2026-04-13"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - context
  - scaling
  - agent
aliases:
  - "Context 爆炸"
  - "上下文爆炸"
related:
  - "[[context-engineering]]"
  - "[[framework-selection]]"
  - "[[gsd-project-scale-selection]]"
  - "[[harness-engineering]]"
  - "[[spec-driven-vs-methodology-framework]]"
---

# Context Explosion

## 摘要

Context 爆炸是当前所有 Spec/Workflow 框架（GSD、Superpowers、OpenSpec）面临的核心 scaling 问题。根因是一个错误的隐含假设：context = state。GSD 的规划与状态文档随计划增多而变长（执行层每个任务是全新的 subagent 上下文，2026-11-24 复核）；Superpowers 在大功能时主协调会话的上下文也会爆炸；OpenSpec 的 Delta 模式只是将一次性爆 context 变成多次局部爆。正确做法是 state 外部存储 + context 按需投影（projection）。

## Claims

### Claim: GSD 采用全量上下文拼接模式

- **来源**：[[Vibe-Coding系列05：大项目落地困局|Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-24
- **置信度**：0.6
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-24 降级——依据：[gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) README（v1.3 起写明"每个任务在全新的 subagent 上下文里执行"）；仓库已标注迁移到新仓库 GSD Core，新版未核

> **现行结论（2026-11-24 降级）**：只对规划与状态文档这一层成立——ROADMAP、STATE 这类文档随计划增多而变长、要整体读入。执行层不是全量拼接：GSD 的 README 写明每个任务跑在全新的 subagent 上下文里（"200k tokens purely for implementation"），所以"上下文随计划数线性增长"不能套到执行阶段。项目已迁到新仓库继续开发（GSD Core），新版的上下文组织方式本轮没有核对。
>
> 原记录：document-centric 不是 bug 而是设计，但导致 context 随 plan 数线性增长、无选择加载、模型被迫同时做业务推理和文档解析。

### Claim: GSD 在 L3+ 项目中面临 context 爆炸，本质是 checklist pipeline 而非 skill system

- **来源**：[[Vibe-Coding系列05：大项目落地困局|Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：stale
- **证据类型**：实测经验
- **复核**：2026-11-07 待定——依据：未复核 GSD/Superpowers/OpenSpec 当前版本，无本轮证据

> 优化的是可理解性和可审查性，牺牲的是 token efficiency 和 scalable context。L2 项目是 GSD 的"甜蜜点"（见 [[framework-selection]]），L3+ 项目需要补充 Skill Runtime。

### Claim: Superpowers 的核心错位是"用文本分解解决计算分解问题"——大功能里不只 subagent，主协调会话的上下文也会爆

- **来源**：[[Vibe-Coding系列05：大项目落地困局|Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-24
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-24 修订——依据：[obra/superpowers#2612](https://github.com/obra/superpowers/issues/2612)（15 个任务移植约 2000 行脚本，主协调会话上下文涨到 83 万 token、撞了 5 次会话上限）；[obra/superpowers#512](https://github.com/obra/superpowers/issues/512)（计划文件被反复整份重读的开销）

> **现行结论（2026-11-24 修订）**：核心判断成立，但爆的位置要说准：subagent 每个任务一份新上下文，真正撑爆的是主协调会话——用户报告一个 15 个任务的移植（约 2000 行脚本），写计划时把已读过的源文件又读一遍、计划写成近 9 万字符并改了 37 次，执行时 15 个任务加评审变成 39 个 subagent，协调会话上下文涨到 83 万 token、撞了 5 次会话上限。另一个 issue 也指出计划文件本身被反复整份重读。文本分解只是把工作分给了 subagent，协调与评审的上下文仍在一个地方累积。
>
> 原记录：subagent 的 context 在单个大功能时也会爆炸。

### Claim: OpenSpec Delta 模式只是改变了爆炸时间分布

- **来源**：[[Vibe-Coding系列05：大项目落地困局|Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-24
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-24 确认——依据：[Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)（archive 时按需求标题把 ADDED / MODIFIED / REMOVED 确定性地合并进主 spec，MODIFIED 要写完整的更新后文本）；[OpenSpec#2033](https://github.com/Fission-AI/OpenSpec/issues/2033)（维护者在讨论确定性合并难以做好、改由 agent 合并）。证据间接，置信度不升

> **现行结论（2026-11-24 确认）**：仍成立。delta 只记变化，但 MODIFIED 必须写出完整的更新后需求，归档时还要按标题把 delta 合进主 spec——理解和合并都离不开原 spec 的语义上下文。维护者自己也在讨论"确定性合并难以做好，合并应该交给 agent"，等于承认合并这一步需要完整上下文。
>
> 原记录：LLM 并不会真的"只看 delta"，delta 仍需还原语义上下文，从"一次性爆 context"变成"多次局部爆 context"。

### Claim: 所有框架共享错误假设 context = state

- **来源**：[[Vibe-Coding系列05：大项目落地困局|Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过：wiki/ paper/ Notes/ 中同主题页与来源文章 git log，2026-04 后仅有标题精简/链接格式类改动，无反向结论）

> 正确做法应是 state 外部存储 + context 按需投影（projection）。

### Claim: CoT 软回溯是推理模型烧 token 与"陷在错误框架出不来"的机制根源

- **来源**：[[2026-09-22-Dream-RSI]]
- **首次出现**：2026-09-22
- **最近更新**：2026-09-25
- **置信度**：0.6
- **状态**：active

> 推理模型的思维链只能软回溯：说"等等，前面不对"之后，错误 token 仍留在 context 里继续作为条件分布的一部分，只能靠注意力压低权重、无法像真搜索那样硬回溯（把状态弹出、换分支重来）——搜索状态存在 context window 而非外部结构。这是 CoT 越长越烧 token、且容易陷在错误框架里出不来的机制解释；"CoT 把网络深度换成序列长度"——上下文膨胀在推理模型上的新形态。（论文初读，置信度留低）

## 冲突与演进

- 2026-11-24：/revalidate——GSD 一条降级 0.8 → 0.6（执行层是每任务新上下文）、OpenSpec 一条确认、Superpowers 一条修订（爆的是主协调会话）；摘要同步修改。
（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——待定 4、长效 1

## 关联概念

- [[context-engineering]] — `constrains` Context Engineering 的核心挑战之一
- [[harness-engineering]] — `part-of` Context 管理是 Harness 的关键能力
- [[framework-selection]] — `constrains` Context 爆炸影响框架选型决策
- [[gsd-project-scale-selection]] — `constrains` Context 爆炸是 L3/L4 项目的核心挑战
- [[spec-driven-vs-methodology-framework]] — `constrains` Context 爆炸影响框架选型的关键约束

## 来源日记

- [[Vibe-Coding系列05：大项目落地困局|Vibe Coding系列05]] — Context 爆炸问题的系统分析
