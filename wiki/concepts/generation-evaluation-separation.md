---
title: "生成-评估分离（Generation-Evaluation Separation）"
created: "2026-04-17"
updated: "2026-07-21"
tags:
  - wiki
  - concept
  - agent
  - harness-engineering
  - architecture-pattern
  - design-principle
aliases:
  - "生成-评估分离"
  - "Generation-Evaluation Separation"
  - "Planner-Generator-Evaluator"
related:
  - "[[harness-engineering]]"
  - "[[meta-harness]]"
  - "[[negative-feedback]]"
---

# 生成-评估分离（Generation-Evaluation Separation）

## 摘要

生成-评估分离是 AI Agent 系统设计的核心架构原则：生成内容的 Agent 和评估质量的 Agent 必须分离，不能既当运动员又当裁判。OpenAI、Anthropic、Google DeepMind 在 2026 年初独立演化出同一套模式，标志着行业共识。

典型实现为 Planner-Generator-Evaluator 三 Agent 架构。Meta-Harness 论文中对应 Guides（生成指导）和 Sensors（评估检测）的双重控制机制。

## Claims

### Claim: 三家公司独立演化出同一个分离原则

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-02
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> OpenAI、Anthropic、Google DeepMind 在 2026 年初独立演化出同一套设计范式——生成与评估必须分离。这不是巧合而是行业共识，来自各自在长时任务中的实践教训。

### Claim: Meta-Harness 中 Guides 和 Sensors 是分离原则的工程实现

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-07-06
- **置信度**：0.8
- **状态**：active

> Meta-Harness 论文将 Harness 组件分为 Guides（指导生成方向）和 Sensors（检测输出质量），两者独立作用于模型——这是生成-评估分离的精确工程表述。

### Claim: 写作去AI味的 Humanizer multi-pass 是分离原则在文本生成域的实例

- **来源**：[[去除AI味：从语言指纹到人机文本边界的消融]]
- **首次出现**：2026-06-29
- **最近更新**：2026-07-18
- **置信度**：0.7（2026-07-18 由 0.6 上调——来源含消融实验验证，按经验证来源规则设为 max(当前, 0.7)）
- **状态**：active

> 去除"AI味"的 Agent 架构采用 Writer→Humanizer→Reviewer 三者分离：Writer 生成初稿、Humanizer 识别并改写 AI 痕迹、Reviewer 做最终人味检测。文章明确指出三者必须分离的理由是"避免自己改自己的盲区"——这与 maker/checker 不能既当运动员又当裁判是同一原则，证明生成-评估分离不止适用于 Coding Agent，在文本生成/去同质化场景同样成立。

### Claim: SDD 的"AI 起草，人类拍板，脚本验证"是分离原则在合规/规格验证域的实例

- **来源**：[[Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进]]
- **首次出现**：2026-07-20
- **最近更新**：2026-07-21
- **置信度**：0.7
- **状态**：active

> Spec-Driven Development 的角色分工"AI 起草，人类拍板，脚本验证，Git 记账"把生成（AI）与评估（人类批准 + 确定性脚本验证 Traceability）严格分开，且评估侧进一步分层：判断性评估归人类、可确定性计算的验证归脚本。这把分离原则从 Coding/文本生成域扩展到合规级规格验证域——V-Model 双轨中左轨规格（生成）与右轨测试规格（评估）的配对结构本身就是分离原则的方法论化。

## 冲突与演进

- 2026-04-02：从三家公司的实践中识别出共同模式。
- 2026-04-16：Meta-Harness 论文提供了更精确的 Guides/Sensors 双重控制框架。
- 2026-06-29：去AI味文章提供文本生成域的实例（Writer→Humanizer→Reviewer），表明该原则跨域成立。
- 2026-07-20：SDD/Spec Kit 提供合规/规格验证域实例（"AI 起草，人类拍板，脚本验证"），且评估侧分层出"人类判断 vs 确定性脚本"两级。

## 关联概念

- [[harness-engineering]] — `grounds` 生成-评估分离是 Harness 设计的核心架构原则
- [[negative-feedback]] — `uses` 评估结果作为负反馈驱动生成修正

## 来源日记

- [[Vibe Coding系列01]] — Section 四 三家公司独立演化的共同设计原则
- [[2026-04-16-Meta-Harness论文解读与实践思考]] — Guides/Sensors 双重控制机制
- [[去除AI味：从语言指纹到人机文本边界的消融]] — Writer→Humanizer→Reviewer 三者分离（文本生成域实例）
- [[Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进]] — "AI 起草，人类拍板，脚本验证"（合规/规格验证域实例）
