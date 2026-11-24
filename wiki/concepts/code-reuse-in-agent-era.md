---
title: "Code Reuse in Agent Era"
created: "2026-04-13"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - agent
  - code-reuse
  - architecture
aliases:
  - "Agent 时代的代码复用"
related:
  - "[[harness-engineering]]"
---

# Code Reuse in Agent Era

## 摘要

Coding Agent 存在结构性复用缺陷：每次会话倾向从头实现功能而非复用已有代码，因为 agent 缺乏项目全局视角。现有框架里，gstack 已在规划流程里内置复用检查（2026-11-24 复核），Superpowers 与 Compound Engineering 是否直接处理本轮未核对。真正的解法是"用架构约束让 agent 不得不复用"——四层防线：CLAUDE.md 架构约束 > FEATURE.md 依赖边界 > Superpowers 流程嵌入复用检查 > Plugin 协作。

## Claims

### Claim: Coding Agent 有结构性代码复用缺陷

- **来源**：[[Vibe-Coding系列07：Coding-Agent时代的代码复用|Vibe Coding系列07]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-24
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-24 确认——依据：[obra/superpowers#2587](https://github.com/obra/superpowers/issues/2587)（按任务逐块定型类型模型，结构问题到整体评审才暴露）；[gstack office-hours skill](https://github.com/garrytan/gstack/blob/main/office-hours/SKILL.md)、[plan-ceo-review skill](https://github.com/garrytan/gstack/blob/main/plan-ceo-review/SKILL.md)（专门加"复用阶梯"，说明问题被普遍承认）。证据间接，置信度不升

> **现行结论（2026-11-24 确认）**：仍成立，且有了社区一手样本：Superpowers 用户报告连续两个计划里类型模型被一个任务一个任务地定下来，结构性问题要到整个分支评审时才暴露，修复耗时超过任务本身——agent 看到的是当前任务的上下文，不是整体蓝图。gstack 在规划类 skill 里专门加"复用阶梯"，也从侧面说明这是公认的问题。
>
> 原记录：每次会话倾向于从头实现功能而非复用已有代码，因为 agent 缺乏项目全局视角——它看到的是当前会话上下文，不是架构蓝图。

### Claim: 现有框架均未直接解决代码复用

- **来源**：[[Vibe-Coding系列07：Coding-Agent时代的代码复用|Vibe Coding系列07]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-24
- **置信度**：0.7
- **状态**：outdated
- **证据类型**：产品与服务
- **复核**：2026-11-24 退役——依据：[gstack office-hours skill](https://github.com/garrytan/gstack/blob/main/office-hours/SKILL.md)、[plan-ceo-review skill](https://github.com/garrytan/gstack/blob/main/plan-ceo-review/SKILL.md)：gstack 的规划类 skill 已内置复用阶梯（写新代码前先停在第一个成立的台阶），方案模板要求列出复用的现有代码与模式。被下方"gstack 已在规划流程里内置复用检查"一条取代；Superpowers 与 Compound Engineering 本轮未查

> **已退役（2026-11-24）**：对 gstack 不再成立——它的 office-hours、plan-ceo-review、design-review 等 skill 都写入了"复用阶梯"，方案模板有"Reuses"一栏。替代结论见同页下一条。Superpowers 与 Compound Engineering 是否直接处理代码复用，本轮没有核对，不作结论；"CE 是知识复用不是代码复用"一句仍可参考。
>
> 原记录：Superpowers、gstack、Compound Engineering 没有一个直接解决代码复用——CE 是知识复用不是代码复用，单人场景下 CE 与 Claude Code memory 基本等价。

### Claim: 四层防线是代码复用的真正解法

- **来源**：[[Vibe-Coding系列07：Coding-Agent时代的代码复用|Vibe Coding系列07]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-24
- **置信度**：0.8
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-24 确认——依据：[gstack office-hours skill](https://github.com/garrytan/gstack/blob/main/office-hours/SKILL.md)、[plan-ceo-review skill](https://github.com/garrytan/gstack/blob/main/plan-ceo-review/SKILL.md)（把"写新代码前先查可复用的"嵌进规划流程，印证第三层"流程嵌入复用检查"）；四层整体仍是自己的主张，置信度不升

> **现行结论（2026-11-24 确认）**：思路不变——不指望 agent 自己学会复用，而是用约束让它不得不复用。其中"在流程里嵌入复用检查"这一层已有框架独立做到（gstack 的复用阶梯与方案模板里的"复用了什么"），印证了这一层的有效性；"CLAUDE.md 架构约束最关键"这一排序仍只有自己的实践支撑。
>
> 原记录：不让 agent 自己学会复用，而是用架构约束让它不得不复用。四层：CLAUDE.md 架构约束（最关键）> FEATURE.md 依赖边界 > Superpowers 流程嵌入复用检查 > Plugin 协作。

### Claim: gstack 已在规划流程里内置复用检查——写新代码前先走"复用阶梯"，方案模板必须列出复用了哪些现有代码与模式

- **来源**：[gstack office-hours skill](https://github.com/garrytan/gstack/blob/main/office-hours/SKILL.md)、[plan-ceo-review skill](https://github.com/garrytan/gstack/blob/main/plan-ceo-review/SKILL.md)
- **首次出现**：2026-11-24
- **最近更新**：2026-11-24
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务

> gstack 的多个 skill（office-hours、plan-ceo-review、design-review）共用一段规矩："不熟悉的东西先搜再建"，按"久经考验的 → 新而流行的 → 第一性原理"三层取舍，并且写新代码前沿着复用阶梯往下走、停在第一个成立的台阶；方案对比模板里每个方案都要写"Reuses：利用了哪些现有代码或模式"，范围统计也要把复用的代码算进去。这是把"复用检查"做成流程步骤，而不是靠 agent 自觉，与本页"四层防线"里的第三层同一思路。另外它的 `/learn` 把跨会话学到的项目模式、坑和偏好沉淀下来，属于知识复用。

## 冲突与演进

- 2026-11-24：/revalidate——2 条确认（结构性复用缺陷、四层防线）、1 条退役（"现有框架均未直接解决"，gstack 已内置复用阶梯），新增 gstack 现状一条；摘要同步修改。
（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——待定 3

## 关联概念

- [[harness-engineering]] — `part-of` CLAUDE.md 架构约束是 Harness Engineering 的一部分

## 来源日记

- [[Vibe-Coding系列07：Coding-Agent时代的代码复用|Vibe Coding系列07]] — Coding Agent 代码复用问题分析与解法
