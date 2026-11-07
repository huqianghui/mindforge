---
title: "Ephemeral Environment"
created: "2026-04-23"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - testing
  - devops
  - ci-cd
aliases:
  - "临时环境"
  - "短暂环境"
  - "Environment as a Service"
  - "EaaS"
related:
  - "[[testcontainers]]"
  - "[[harness-quality-gate]]"
---

# Ephemeral Environment

## 摘要

Ephemeral Environment（临时环境）是一种按需创建、用完销毁的全栈隔离环境方案，主要用于 PR 级别的全链路测试验证。它是测试环境隔离的最高层级——Testcontainers 解决测试函数级隔离，docker-compose 解决测试套件级隔离，而 Ephemeral Environment 解决 PR 级隔离。

核心方案分两类：Kubernetes 原生（vCluster、Tilt、Skaffold、Garden）和 EaaS 平台（Signadot、Bunnyshell、Speedscale）。其中 Signadot 的 MCP Server 支持是值得关注的前沿方向——允许 AI Coding Agent 自动创建沙箱环境进行验证。

## Claims

### Claim: 测试环境隔离有三个粒度层级——Testcontainers < docker-compose < Ephemeral Environment

- **来源**：[[Vibe-Coding系列12：测试环境即代码]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：grep 过 ephemeral environment/Testcontainers（Notes/Azure/paper/wiki），最新命中仅为 wiki 索引与学习路径页，无与之冲突的更新文章

> docker-compose 是"你维护一个环境"，Testcontainers 是"测试自己创建环境"，Ephemeral Environment 是"每个 PR 拥有自己的世界"。三者不是替代关系，而是不同粒度的环境隔离。

### Claim: Signadot MCP Server 允许 AI Agent 自动创建沙箱环境

- **来源**：[[Vibe-Coding系列12：测试环境即代码]]
- **首次出现**：2026-04-23
- **最近更新**：2026-11-07
- **置信度**：0.6
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：依据：Signadot 官方文档概览 https://www.signadot.com/docs/overview ；官网 https://www.signadot.com ——MCP server 随 CLI 发布，agent 可创建沙箱环境、跑测试并读取结果

> Signadot 的 MCP Server 允许 AI Coding Agent（Claude Code、Cursor 等）在生成代码后自动创建沙箱环境进行验证，支持 50+ 并发 Agent。这是"AI Agent 自主测试"的前沿方向。

### Claim: 测试环境即代码（Test Environment as Code）有五个核心原则

- **来源**：[[Vibe-Coding系列12：测试环境即代码]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：grep 过 ephemeral environment/Testcontainers（Notes/Azure/paper/wiki），最新命中仅为 wiki 索引与学习路径页，无与之冲突的更新文章

> 五原则：版本控制（环境定义与应用代码在同一 Git 仓库）、幂等创建（运行两次产生相同环境）、参数化（变量/overlay 适配不同上下文）、自动生命周期（PR 创建 → 创建环境，PR 合并 → 销毁环境）、密钥管理（永远不硬编码 secret）。

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——长效 2、确认 1

## 关联概念

- [[harness-quality-gate]] — `extends` 作为质量门禁的环境基础设施层
- [[testcontainers]] — `contrasts` Testcontainers 解决测试级隔离，Ephemeral Environment 解决 PR 级隔离

## 来源日记

- [[2026-04-23-周四]] — Vibe Coding 系列12：测试环境即代码文章撰写
