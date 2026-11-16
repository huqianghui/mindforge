---
title: "Skill Hub Ecosystem"
created: "2026-04-11"
updated: "2026-11-16"
tags:
  - wiki
  - concept
  - claude-code
  - skill
  - plugin
  - agent
aliases:
  - "Skill Hub"
  - "Plugin Hub"
  - "Coding Agent 插件生态"
related:
  - "[[azure-copilot-ecosystem]]"
  - "[[claude-code-extension-system]]"
---

# Skill Hub Ecosystem

## 摘要

Coding Agent（如 Claude Code）的 Skill/Plugin 生态正在快速发展，多个社区平台提供不同定位的扩展方案。主要玩家包括 OpenClaw（2800+ 社区 Skill）、Superpowers（内置 Skill 工具系统）、GStack（命令行增强）等。生态仍处于早期整合阶段，各平台定位差异明显。

## Claims

### Claim: ClawHub 是 OpenClaw 的 Skill 注册中心——规模数千至上万，且有恶意 skill 风险

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-11-07
- **置信度**：0.2
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 降级——依据：OpenClaw 技能数 ClawHub 2026-02 已超 13000，VoltAgent 精选清单称 5400+（https://github.com/VoltAgent/awesome-openclaw-skills ；https://felo.ai/blog/best-openclaw-skills-2026 仅作线索）；2857 是 2026-02 审计样本数

> **现行结论（2026-11-07 降级）**：「2800+」已过时，改为「数千至上万，且有安全审计发现大量恶意 skill」；「Claude Code 主流 Skill 注册中心」说法不准，ClawHub 是 OpenClaw 的注册中心。
>
> 以下为原记录：
> OpenClaw / ClawHub 提供 2800+ 社区 Skill，是目前 Claude Code 生态中规模最大的 Skill 注册中心。George 提到可将 OpenClaw 的 Skill Hub 模式用于功能复用——将培训材料、培训流程、培训打分作为独立 Skill 模块化管理。

### Claim: gstack、Superpowers、Compound Engineering 分工不重叠——Superpowers 管"怎么想"（方法论流程），gstack 管"做不做、动得了"（产品决策与浏览器、QA、发布），CE 管"记住"（每次把经验写回知识库）；先选一个主框架，再叠加

- **来源**：[[Gstack、Superpowers与Compound-Engineering对比]]、[[Claude-Code双插件搭配：superpowers与gstack]]、[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-11-16
- **置信度**：0.5
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-16 修订——依据：两篇外部实践文章（存档于 vibe-coding/references），均为第三方，未对照各项目官方文档；Hermes 仍无资料，从本条移除

> 两篇外部实践的共同分法：Superpowers 是一套工程方法论（拆需求、写计划、系统化排查、自检审查），不碰浏览器；gstack 一头管"建不建"（`/office-hours`、`/plan-ceo-review` 类产品与工程评审），一头管"动得了"（真实浏览器 `/qa`、发布与上线后监控），不抢计划撰写；Compound Engineering 走 brainstorm → plan → work → review → compound，最后一步把经验写进 `docs/solutions/`，下次规划时读回来。组合用法：gstack 决策、CE 或 Superpowers 执行、gstack 真机测试、CE 沉淀。两篇都提醒同时装多个会命令重叠、流程冲突，先跑通一个再叠加。原条目（2026-04-11）把 Hermes 并列为第三个框架，但没有任何来源，已移除；Hermes 作为长期运行的 agent 见 [[hermes-agent]]。CE 的"知识复利"与本库"编译一次、持续维护"同构，见 [[personal-knowledge-compiler]]。

### Claim: 企业级 skill hub 的护城河是独占数据，不是架构——表现层、编排层、执行层三层谁都能搭，Accio Work 的差异来自平台自有的交易、搜索与排序数据，外部 agent 操作同样的页面也拿不到

- **来源**：[[Accio-Work：阿里跨境AI-Agent工作台解读]]
- **首次出现**：2026
- **最近更新**：2026-11-16
- **置信度**：0.55
- **状态**：active
- **证据类型**：产品与服务

> 三层：表现层（skill 发现、启用、结果展示）、编排层（agent loop 与 skill 路由调度）、执行层（API、网页自动化、数据查询）。关键设计取舍：skill 注册静态配置还是经 MCP 动态发现、调度交给模型还是规则路由。同范式产品（Claude Desktop、WorkBuddy）已具备同等架构能力，所以差异落在数据：市场需求分析靠平台交易与买家画像、定价建议靠历史成交与竞品、曝光优化靠内部排序规则——外部 agent 即使能操作页面也只能看到单个店铺的数据。推论：企业在 M365 / D365 上做同类方案，价值要落在自有业务数据与流程的接入上，而不是再造一个 skill 框架。产品分析，基于公开信息。

## 冲突与演进

- 2026-11-16：完备性补抽 [[Accio-Work：阿里跨境AI-Agent工作台解读]]，新增 1 条 Claim。
- 2026-11-16：完备性补抽两篇外部参考，三大框架一条由 0.3 stale 修订为 0.5 active，范围收窄为 gstack / Superpowers / CE，Hermes 移出。
（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——待定 1

## 关联概念

- [[azure-copilot-ecosystem]] — `contrasts` Azure Skills 是 Microsoft 官方的 Skill 实现，与社区 Skill Hub 构成互补
- [[claude-code-extension-system]] — `part-of` Skill Hub 是 Claude Code 扩展体系的社区生态

## 来源日记

- [[Accio-Work：阿里跨境AI-Agent工作台解读]] — 企业级 Skill Hub 的三层架构与护城河
- [[Gstack、Superpowers与Compound-Engineering对比]] — gstack / Superpowers / CE 的分工与组合流程（外部参考）
- [[Claude-Code双插件搭配：superpowers与gstack]] — superpowers 是大脑、gstack 是手脚（外部参考）
- [[2026-04-11-周六]] — 社区 Skill Hub 和 Plugin Hub 生态调研
- [[2026-04-13-周一]] — 调查和学习 gstack 任务
