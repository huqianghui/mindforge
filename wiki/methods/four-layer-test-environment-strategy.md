---
title: "四层测试环境策略"
created: "2026-04-23"
updated: "2026-04-23"
tags:
  - wiki
  - method
  - testing
  - devops
  - testcontainers
method_type: "layered-strategy"
related_concepts:
  - "[[testcontainers]]"
  - "[[ephemeral-environment]]"
  - "[[contract-testing]]"
related_methods:
  - "[[harness-five-dimension-quality-gate]]"
---

# 四层测试环境策略

## 摘要

将测试环境按隔离粒度组织为四层递进策略，从单元测试的 mock 到 PR 级的 Ephemeral Environment 逐层升级。核心认知：docker-compose 是"你维护一个环境"，Testcontainers 是"测试自己创建环境"，Ephemeral Environment 是"每个 PR 拥有自己的世界"——三者不是替代关系，而是不同粒度的环境隔离。

## 适用条件

- **前置依赖**：Docker 环境可用（本地或 CI）；项目有集成测试需求
- **适用场景**：全栈项目（如 ReactJS + FastAPI + PostgreSQL + Azure）；微服务架构；CI 并发场景
- **不适用场景**：纯前端无后端依赖的项目；无 Docker 环境

## 步骤

### Step 1: Layer 1 — 单元测试 + 契约测试

- **输入**：代码变更
- **操作**：用 mock 执行单元测试；用 Pact/Spring Cloud Contract 验证服务间 API 契约
- **输出**：基础功能正确性 + 接口契约一致性
- **判断标准**：所有单元测试通过 + 零契约违规
- **工具**：pytest mock / JUnit mock + Pact / Spring Cloud Contract

### Step 2: Layer 2 — 集成测试环境（Testcontainers）

- **输入**：通过 Layer 1 的代码
- **操作**：Testcontainers 按需启动真实依赖容器（DB/MQ/Cache），每个测试独立环境
- **输出**：代码与真实依赖正确协作
- **判断标准**：所有集成测试通过、无数据污染
- **工具**：Testcontainers（PostgreSQL/Redis/Kafka 模块）+ Azurite（Azure Storage 模拟）+ WireMock（API Mock/录制回放）

### Step 3: Layer 3 — E2E 测试环境

- **输入**：通过 Layer 2 的代码
- **操作**：Playwright + Testcontainers DB 搭建全链路测试环境，覆盖真实用户场景
- **输出**：全链路功能验证
- **判断标准**：关键用户流程全部通过
- **工具**：Playwright + Testcontainers（DB + Backend）

### Step 4: Layer 4 — Ephemeral Environment

- **输入**：PR 创建事件
- **操作**：自动创建 PR 级全栈隔离环境，供人工验收和 AI Agent 自动验证
- **输出**：PR 级全栈环境可访问
- **判断标准**：环境健康检查通过、PR 合并后自动销毁
- **工具**：Kubernetes 原生（vCluster/Tilt/Skaffold）或 EaaS 平台（Signadot/Bunnyshell）

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| 单体应用 + Azure | Layer 1-3 即可 | 无需 PR 级隔离，Testcontainers + Azurite + WireMock 覆盖 |
| 微服务 + K8s | 全四层 | 微服务间依赖复杂，需 PR 级全栈隔离 + 契约测试 |
| CI 中 Docker-in-Docker 困难 | 使用 Testcontainers Cloud | 避免 DinD 的安全风险和性能损耗 |
| Azure 云服务（AI Foundry、Speech） | WireMock 录制/回放 | 先对真实 Azure 服务录制请求/响应，CI 中回放 |

## Claims

### Claim: Testcontainers 的核心价值不是"更方便启动 Docker"，而是让每个测试拥有自己的 infrastructure

- **来源**：[[Vibe Coding系列12：测试环境即代码——从Testcontainers到Ephemeral Environment的Harness实践]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.8
- **状态**：active

> 三种混乱的测试环境模式（本地手工 / docker-compose 共享 / E2E 本地能跑 CI 不行）导致数据污染和 flaky test。Testcontainers 让每个测试拥有独立的 infrastructure，从根本上解决隔离问题。

## 实践记录

（暂无）

## 关联概念

- [[testcontainers]] — `uses` Layer 2-3 的核心工具
- [[ephemeral-environment]] — `uses` Layer 4 的环境方案
- [[contract-testing]] — `uses` Layer 1 的契约测试工具

## 关联方法

- [[harness-five-dimension-quality-gate]] — `extends` 将质量门禁的测试维度从 Testcontainers 扩展为四层环境策略

## 来源

- [[Vibe Coding系列12：测试环境即代码——从Testcontainers到Ephemeral Environment的Harness实践]] — 四层测试环境策略完整设计
