---
title: "反馈闭环（Feedback Loop）"
created: "2026-04-17"
updated: "2026-10-29"
tags:
  - wiki
  - concept
  - systems-thinking
  - control-theory
  - harness-engineering
  - knowledge-management
aliases:
  - "反馈闭环"
  - "Feedback Loop"
  - "闭环控制"
related:
  - "[[generation-evaluation-separation]]"
  - "[[harness-engineering]]"
  - "[[personal-knowledge-compiler]]"
---

# 反馈闭环（Feedback Loop）

## 摘要

反馈闭环是系统将输出结果回传为输入、驱动持续修正的结构性机制。区分"线性工具链"和"控制系统"的关键判据就是：是否有闭环。在 AI Agent 领域，反馈闭环横跨 Harness 工程（执行-评估-修正）、知识管理（实践-提取-验证-更新）和 Meta-Harness（Propose → Evaluate → Log → Repeat）三大领域。

收敛性公式：收敛性 = 约束强度 × 反馈频率 / 执行自由度。没有闭环的系统只能"跑"，不能"收敛"。

## Claims

### Claim: 反馈闭环是区分线性工具链和控制系统的关键

- **来源**：[[Claude-Code系列07：Harness分层架构]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.9
- **状态**：stale

> "能跑"和"能收敛"是两回事。没有反馈闭环的 Agent 是线性工具链——执行完就结束；有反馈闭环的 Agent 是控制系统——能根据结果自我修正。

### Claim: Meta-Harness 的四步闭环是自动化 Harness 优化的核心

- **来源**：[[2026-04-16-Meta-Harness]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：stale

> Propose → Evaluate → Log → Repeat 搜索循环将手工 Harness 迭代自动化。完整执行 trace 是不可替代的诊断信号（50.0% vs 仅分数的 34.6%）。

### Claim: 知识管理也需要反馈闭环——日记到 wiki 的循环

- **来源**：[[PKC系列02：个人知识编译器进化]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：stale

> 知识流不能是单向的（日记 → wiki）。实践反馈必须回流到知识库——应用方法后的成功/失败应更新 Claims 置信度，形成：日记 → 提取 → wiki → 应用 → 反馈 → wiki 的完整闭环。

### Claim: 云资源治理域实例——事件路径负责"及时"、定时扫描负责"全"，可靠性来自两路都读当前状态再比对修正，而非任一路单独保证；调节器只自动修它能安全修的，其余交给人

- **来源**：[[Azure资源标签守护：事件订阅与定时扫描的自动修复]]
- **首次出现**：2026-10-26
- **最近更新**：2026-10-29
- **置信度**：0.75
- **状态**：active

> Event Grid 事件让检查在资源变更后及时发生，定时扫描看到某一时刻的全量当前状态；两路都"读真实状态 → 比对规则 → 修偏差"，是 [[negative-feedback]] 在运维域的形态（期望状态调和）。修复要幂等：Merge 只提交需修正的键、已合规直接返回、写后再读、资源已删就结束不重建。执行边界：被策略禁用的 Key 认证只检测并交接、不自动改回；告警只把自动化解决不了的问题交给人——一次 6 秒超时 9 秒后自愈仍发了 Sev1 Fired + Resolved 两封邮件，改为状态型告警、持续未恢复才通知、恢复不发信。未知资源类型先报错而非静默跳过。单篇单实现（`reconciliation-loop` 独立建页 HOLD）。

## 冲突与演进

- 2026-04-17：反馈闭环概念在三个领域（Agent 工程、知识管理、Meta-Harness）的统一视角首次建立。

## 关联概念

- [[harness-engineering]] — `grounds` 反馈闭环是 Harness 认知系统（L6 Eval）的核心
- [[personal-knowledge-compiler]] — `uses` PKC 的知识迭代依赖实践反馈闭环
- [[generation-evaluation-separation]] — `uses` 分离的评估环节是闭环的关键节点
- [[negative-feedback]] — `uses` 标签守护的两路调和都以"读当前状态 → 比对 → 修偏差"的负反馈为单元

## 来源日记

- [[Claude-Code系列07：Harness分层架构]] — 线性工具链 vs 控制系统的区分
- [[2026-04-16-Meta-Harness]] — Steering Loop 四步闭环
- [[PKC系列02：个人知识编译器进化]] — 知识管理反馈闭环
- [[2026-10-26-周一]] / [[Azure资源标签守护：事件订阅与定时扫描的自动修复]] — 事件 + 定时扫描双路调和、幂等修复、告警只交接自动化解决不了的问题（运维域实例）
