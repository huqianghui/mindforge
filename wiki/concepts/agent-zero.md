---
title: "Agent Zero"
created: "2026-05-07"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - agent
  - autonomy
  - ai-os
aliases:
  - "agent0"
  - "Agent Zero Framework"
related:
  - "[[cybernetics-agent-design]]"
  - "[[harness-engineering]]"
  - "[[hermes-agent]]"
  - "[[openclaw-agent-gateway]]"
  - "[[skill-hub-ecosystem]]"
---

# Agent Zero

## 摘要

Agent Zero 是 agent0ai 开源的自主 AI Agent 框架，核心理念为 **prompt-defined autonomous computer operator**——最大化 Agent 自由度而非 Harness 可控性。它代表 "AI OS / autonomous runtime" 一派（与 Devin、Manus、Open Interpreter 同属极端自主路线）。其真正价值不在于学习如何构建 Agent，而在于**暴露了无约束 Agent 的失败模式**——context drift、endless loops、token explosion、memory corruption——从反面论证了 Harness 的必要性。

## Claims

### Claim: Agent Zero 代表 Agent 设计哲学中的"极端自主"端

- **来源**：[[2026-05-07-周四]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.7
- **状态**：stale
- **证据类型**：产品与服务
- **复核**：2026-11-07 待定——依据：未检索 Agent Zero 官方仓库，无本轮实际证据

> Agent Zero 本质是 prompt-defined autonomous computer operator，设计目标是最大化 agent 自由度。属于 "AI OS / autonomous runtime" 一派，与 Devin、Manus、Open Interpreter 同类。来源：与 ChatGPT 讨论后的归纳。

### Claim: 三种 Agent 设计哲学形成光谱——自主性 vs 确定性 vs 自我改进

- **来源**：[[2026-05-07-周四]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过：wiki/ paper/ Notes/ 中同主题页与来源文章 git log，2026-04 后仅有标题精简/链接格式类改动，无反向结论）

> 三种 agent philosophy 对比：
> - **Agent Zero** = agent 自由演化（autonomy 极端，determinism 差）
> - **OpenClaw** = 稳定 runtime + multi-channel assistant（企业 agent platform）
> - **Hermes** = self-improving cognitive loop（更接近 cognitive architecture，与 cybernetics 方向最契合）
>
> 这不是执行范式（ReAct/Plan-and-Solve）之分，而是系统设计哲学之分。

### Claim: Agent Zero 的核心问题是 Harness 太弱——自由 ≠ 稳定

- **来源**：[[2026-05-07-周四]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过：wiki/ paper/ Notes/ 中同主题页与来源文章 git log，2026-04 后仅有标题精简/链接格式类改动，无反向结论）

> Production agent 最怕四种失败模式：context drift（上下文漂移）、endless loops（死循环）、token explosion（token 爆炸）、memory corruption（记忆损坏）。Agent Zero 的自由度设计使其难以防范这些问题。从反面论证了：harness 必须存在、feedback 必须结构化、memory 必须被 regulation。

### Claim: Agent Zero 的真正学习价值是"暴露问题"而非"提供方案"

- **来源**：[[2026-05-07-周四]]
- **首次出现**：2026-05-07
- **最近更新**：2026-05-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过：wiki/ paper/ Notes/ 中同主题页与来源文章 git log，2026-04 后仅有标题精简/链接格式类改动，无反向结论）

> 不是学它怎么做 agent，而是学它暴露了什么问题。结论：暂不深入，作为研究型参考样本。优先级归类为第二层（研究 agent autonomy），第一层必须深挖的是 Claude Code / OpenClaw / Hermes / MCP / A2A / LangGraph。

### Claim: SKILL.md 已成跨平台开放标准，正在催生 agent-native package ecosystem

- **来源**：[[2026-05-07-周四]]
- **首次出现**：2026-05-07
- **最近更新**：2026-11-07
- **置信度**：0.5
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 修订——依据：SKILL.md 已成为 Anthropic 于 2025-12-18 发布的 Agent Skills 开放标准（agentskills.io），Microsoft/OpenAI/GitHub/Cursor 等已采纳：https://www.unite.ai/anthropic-opens-agent-skills-standard-continuing-its-pattern-of-building-industry-infrastructure ；https://strapi.io/blog/what-are-agent-skills-and-ho

> **现行结论（2026-11-07 修订）**：SKILL.md 已是跨平台开放标准（agentskills.io，2025-12 发布，多家主流 agent/IDE 采纳），『尚无广泛采纳证据』已过时
>
> 以下为原记录：
> Agent Zero 引入的 SKILL.md 标准值得关注——如果这种格式被多个框架采纳，可能出现 agent-native 的 package ecosystem（类似 npm/pip 之于编程语言）。目前仍是早期观察，尚无广泛采纳证据。

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——待定 1、长效 3

## 关联概念

- [[harness-engineering]] — `grounds` Agent Zero 从反面论证了 Harness 必须存在
- [[hermes-agent]] — `contrasts` 三种 Agent 哲学之一：self-improving cognitive loop
- [[openclaw-agent-gateway]] — `contrasts` 三种 Agent 哲学之一：stable runtime + enterprise gateway
- [[cybernetics-agent-design]] — `grounds` Hermes 与 cybernetics 方向最契合，Agent Zero 缺乏负反馈约束
- [[skill-hub-ecosystem]] — `extends` SKILL.md standard 可能扩展 Skill Hub 生态

## 来源日记

- [[2026-05-07-周四]] — 学习和对比 Agent Zero，与 ChatGPT 讨论得出三种 Agent 哲学框架
