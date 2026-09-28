---
title: "The Bitter Lesson"
created: "2026-04-13"
updated: "2026-09-28"
tags:
  - wiki
  - concept
  - ai-theory
  - sutton
  - scaling
aliases:
  - "Bitter Lesson"
  - "苦涩的教训"
related:
  - "[[forward-deployed-engineer]]"
  - "[[harness-engineering]]"
---

# The Bitter Lesson

## 摘要

Rich Sutton 的元原则：利用计算的通用方法（search + learning）最终胜过依赖手工编码人类领域知识的方法——这一规律在国际象棋、围棋、语音识别、计算机视觉等所有 AI 领域反复得到验证。"苦涩"在于心理层面：研究者精心打造的领域知识被简单的"更多计算"碾压，这个模式已重复了 70 年。

## Claims

### Claim: 通用计算方法最终胜过手工领域知识

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：stale

> search + learning 最终击败所有 hand-coded human domain knowledge，跨越所有 AI 领域。

### Claim: "苦涩"是心理层面的

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.8
- **状态**：stale

> 研究者精心打造的领域知识被简单暴力的"更多计算"碾压，70 年来反复发生。

### Claim: Sutton 不是在推广 RL

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：stale

> 是一个跨领域元原则："让计算（search + learning）替代人类知识"，不限于强化学习。

### Claim: 存在四阶段循环

- **来源**：[[2026-03-21-The-Bitter-Lesson]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.8
- **状态**：stale

> (1) 编码人类知识 → (2) 短期有效 → (3) 长期停滞 → (4) 对立的计算扩展方法实现突破。

### Claim: 职业版 Bitter Lesson——操作性知识被模型能力吞噬，问题定义/约束设计/跨域迁移存活

- **来源**：[[FDE职业进化论——AI时代前线部署工程师的个人突围与团队重构]]
- **首次出现**：2026-05-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> Bitter Lesson 投射到个人职业层面：凡是"操作性知识"（怎么写某框架代码、某工具的使用步骤）都会被更强模型 + 更多算力吞噬——教 AI 做的每件事都在为自己的替代计时。存活的是三元能力：① **问题定义**——把客户模糊痛点翻译成可解问题（模型只能解已定义的问题）；② **约束设计**——为 AI 划定行为边界与验收标准（Harness 侧工作，见 [[forward-deployed-engineer]]）；③ **跨域迁移**——把 A 领域的解决模式搬到 B 领域（模式识别的输入来自跨现场经验，模型没有你的现场）。个人策略不是和算力赛跑，而是站到算力曲线的乘法位置上。

### Claim: 金字塔 algorithms < compute < data < doing the right task 把 Bitter Lesson 再推一层——连方法都不是关键，关键是选对要解的任务；FLAN lesson 与"Bitterest lesson"是两个例证

- **来源**：[[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]]
- **首次出现**：2026-09-26
- **最近更新**：2026-09-28
- **置信度**：0.65
- **状态**：active

> TypeSafe 创始人演讲 slide《How can that be possible?》四层金字塔，越底层杠杆越大。FLAN lesson：Google FLAN 论文创造 "instruction tuning" 一词六千引用，事后看指令微调最优用量为零——算法层大量投入被更底层变化整体抹掉。Bitterest lesson：如果 RLHF 这么显然为什么 GPT-2 时代没做？模型能力已够、缺的不是算法与算力，是没人把"按人类偏好对齐"当作要做的任务——"doing the right task"在 LLM 史上只发生过约一次半。Bitter Lesson 原始表述是"通用方法 + 算力最终胜过人工注入的领域知识"，这张 slide 说连方法都不是关键。对 FinOps 与飞轮的推论（[[data-flywheel]] / [[cost-per-task]]）：三层循环都运行在任务已选定的前提下，RSI 与飞轮都不能纠正任务选错；中圈资产（prompt 配方 / skill 文本 / 微调数据）要按"可能被清零"折旧，评估集与接收方判定标准最抗归零应优先投资。（演讲观点 + 作者对齐，单篇）

## 冲突与演进

- 2026-08-04：从 FDE 职业进化论补充职业层投射——操作知识被吞噬、三元能力存活。
- 2026-09-28：注入 FinOps 系列 02 Claim——从"方法 vs 领域知识"再推到"任务选择 > 方法"；与 08-04 职业层投射并列为第二个应用层投射（FinOps 预算杠杆）。

## 关联概念

- [[harness-engineering]] — `contrasts` Harness Engineering 是人类知识编码的现代形式，可能面临 Bitter Lesson 挑战
- [[forward-deployed-engineer]] — `grounds` Bitter Lesson 是 FDE 价值锚从操作知识迁移到三元能力的理论依据

## 来源日记

- [[2026-03-21-The-Bitter-Lesson]] — 论文精读笔记
- [[FDE职业进化论——AI时代前线部署工程师的个人突围与团队重构]] — 职业层投射：三元能力存活（2026-05-30）
- [[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]] — 金字塔四层与三层循环对齐、FLAN lesson、Bitterest lesson、资产折旧推论（2026-09-26）
