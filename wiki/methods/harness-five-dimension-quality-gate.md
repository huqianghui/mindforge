---
title: "Harness 五维质量门禁"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - method
  - devops
  - ci-cd
  - harness
  - quality
method_type: "quality-gate"
related_concepts:
  - "[[harness-quality-gate]]"
  - "[[testcontainers]]"
  - "[[harness-engineering]]"
related_methods:
  - "[[ai-native-five-layer-pipeline]]"
---

# Harness 五维质量门禁

## 摘要

通过 pre-commit hook + Harness CI pipeline 构建全链路质量保障方案。五个维度按严格递进顺序排列，每一层过滤特定类型的问题，越往后越重（成本越高、反馈越慢）。核心原则：**尽早拦截、逐层加重**——格式问题在本地 pre-commit 就拦截，不要浪费 CI 资源。

## 适用条件

- **前置依赖**：Harness CI（或同类 CI/CD 平台）、pre-commit 框架、对应语言的工具链
- **适用场景**：团队协作的中大型项目，需要标准化质量保障
- **不适用场景**：个人实验性项目、一次性脚本

## 步骤

### Step 1: 代码格式检查（pre-commit hook）

- **输入**：git staged 文件
- **操作**：运行格式化工具自动修复代码风格
- **输出**：格式统一的代码
- **判断标准**：所有代码符合项目格式标准
- **工具链**：
  - Java: google-java-format / Spotless
  - Python: Black + isort
  - JS/TS: Prettier + ESLint --fix

### Step 2: 架构测试验证

- **输入**：项目代码
- **操作**：运行架构测试工具，验证包依赖规则、分层约束、命名规范
- **输出**：架构合规报告
- **判断标准**：无架构违规（包依赖方向正确、无循环依赖）
- **工具链**：
  - Java: ArchUnit
  - Python: import-linter / pytestarch
  - JS/TS: dependency-cruiser / eslint-plugin-boundaries

### Step 3: 代码检查器（Lint / Static Analysis）

- **输入**：项目代码
- **操作**：运行静态分析工具扫描代码缺陷、安全漏洞
- **输出**：Lint 报告 + 安全扫描结果
- **判断标准**：无 P0/P1 级 lint 错误，无已知安全漏洞
- **工具链**：
  - Java: SpotBugs + PMD + SonarQube
  - Python: Ruff + Bandit + mypy
  - JS/TS: ESLint + TypeScript strict

### Step 4: CI 编译与集成测试

- **输入**：完整代码库
- **操作**：编译项目 + 运行集成测试（使用 Testcontainers 启动真实依赖）
- **输出**：编译结果 + 测试报告 + 覆盖率
- **判断标准**：编译成功，测试通过率 > 阈值，覆盖率达标
- **工具链**：Testcontainers（真实数据库/消息队列/缓存）

### Step 5: 性能测试

- **输入**：部署的测试环境
- **操作**：运行性能基准测试和负载测试
- **输出**：性能报告（响应时间、吞吐量、资源消耗）
- **判断标准**：关键接口延迟 < SLA，无性能回退

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| 小团队 / 快速迭代 | Step 1-3 + Step 4（仅单元测试） | 性能测试开销大，可延后 |
| 新项目初期 | 先配 Step 1，逐步加 Step 2-5 | 避免一次性引入过多工具 |
| 架构稳定的成熟项目 | 全部 5 步 | 投资回报最大化 |

## Claims

### Claim: 质量门禁应覆盖 5 个递进维度

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-12
- **置信度**：0.5
- **状态**：active

> 核心思路：通过 pre-commit hook + Harness CI pipeline，从 5 个维度构建质量门禁。每个维度对应一组多语言工具链。

### Claim: ArchUnit 是 Java 架构测试的标准工具

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-11
- **置信度**：0.8
- **状态**：active

> Java 用 ArchUnit，Python 用 import-linter / pytestarch，JS/TS 用 dependency-cruiser / eslint-plugin-boundaries。

## 实践记录

<!-- 在实际项目中应用此方法后，记录结果反馈 -->

（暂无实践记录）

## 关联概念

- [[harness-quality-gate]] — `implements` 此方法的概念定义页
- [[testcontainers]] — `uses` Step 4 集成测试的核心工具
- [[harness-engineering]] — `implements` 质量门禁是 Harness Engineering 工具链的一部分

## 关联方法

- [[ai-native-five-layer-pipeline]] — `part-of` Pipeline Step 4/5 的质量保障

## 来源

- [[2026-04-11-周六]] — Harness 工程质量门禁体系设计
- [[2026-04-12-周日]] — 追踪任务延续
