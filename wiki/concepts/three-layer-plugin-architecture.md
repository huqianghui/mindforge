---
title: "Three-Layer Plugin Architecture"
created: "2026-04-13"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - gsd
  - superpowers
  - gstack
  - architecture
aliases:
  - "GSD + Superpowers + gstack 三层架构"
related:
  - "[[claude-code-extension-system]]"
  - "[[harness-engineering]]"
---

# Three-Layer Plugin Architecture

## 摘要

GSD + Superpowers + gstack 构成三层插件架构，各有明确定位：GSD 管"做对的事情"（Spec + Phase + State + Context），Superpowers 管"做事情的方法对"（Engineering Practices），gstack 管"做完能交付"（External World）。三者不是"装更多插件"，而是需要设计清晰的职责边界和交接协议。必须用 CLAUDE.md 声明式路由规则消除 skill 匹配歧义。

## Claims

### Claim: Superpowers 是 workflow-first，gstack 是 tool-first

- **来源**：[[Vibe-Coding系列08：三层插件架构|Vibe Coding系列08]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-07 确认——依据：作者对两框架的归类判断，库内无矛盾；Superpowers 发布说明显示其已含 agents 与 workflow skills https://github.com/obra/superpowers/blob/main/RELEASE-NOTES.md 与「伪二分」一致

> "Superpowers 是方法论、gstack 是工具箱"是伪二分——两者都是 skill/tool 集合 + workflow 编排的混合体。

### Claim: 三层定位——GSD/Superpowers/gstack

- **来源**：[[Vibe-Coding系列08：三层插件架构|Vibe Coding系列08]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale
- **证据类型**：产品与服务
- **复核**：2026-11-07 待定——依据：GSD 与 gstack 的当前定位本轮未取到官方资料

> GSD 管"做对的事情"，Superpowers 管"做事情的方法对"，gstack 管"做完能交付"。

### Claim: 没有一个框架能独立覆盖全链路

- **来源**：[[Vibe-Coding系列09：开源框架融合实践|Vibe Coding系列09]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.9
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-07 确认——依据：作者的融合实践结论；Superpowers 上游 issue 也在讨论按模型能力调整流程 https://github.com/obra/superpowers/issues/2017，库内无矛盾

> 框架融合不是"装更多插件"，而是设计清晰的职责边界和交接协议。

### Claim: 必须用 CLAUDE.md 声明式路由消除 skill 匹配歧义

- **来源**：[[Vibe-Coding系列09：开源框架融合实践|Vibe Coding系列09]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Claude Code 官方 skills 文档：skill 的 name 与 description 常驻 context 用于匹配，CLAUDE.md 作为持久指令加载 Claude Code 官方文档 Skills https://code.claude.com/docs/en/skills（路由表有效性属作者实践，官方未直接背书「必须」）

> Claude Code 遇到泛指令时按路由表查表执行而非随机匹配。

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——确认 3、待定 1

## 关联概念

- [[harness-engineering]] — `part-of` CLAUDE.md 路由是 Harness 的一部分
- [[claude-code-extension-system]] — `uses` 三层架构基于 Claude Code 扩展体系

## 来源日记

- [[Vibe-Coding系列08：三层插件架构|Vibe Coding系列08]] — GSD + Superpowers + gstack 三层分析
- [[Vibe-Coding系列09：开源框架融合实践|Vibe Coding系列09]] — 框架融合与路由
