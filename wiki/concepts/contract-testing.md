---
title: "Contract Testing"
created: "2026-04-23"
updated: "2026-04-23"
tags:
  - wiki
  - concept
  - testing
  - microservices
aliases:
  - "契约测试"
  - "Consumer-Driven Contract Testing"
related:
  - "[[testcontainers]]"
  - "[[harness-quality-gate]]"
---

# Contract Testing

## 摘要

Contract Testing（契约测试）是验证微服务间 API 接口是否一致的测试方法，与集成测试（Testcontainers）互补而非竞争。契约测试验证"接口契约是否一致"（快速、无真实依赖），集成测试验证"代码与真实依赖是否正确协作"。

主流框架分为两种驱动模式：Consumer 驱动（Pact，多语言支持）和 Provider 驱动（Spring Cloud Contract，Spring Boot 深度集成）。PactFlow AI（2025）能从 OpenAPI spec 自动生成契约测试，代表 AI 辅助测试生成的前沿方向。

## Claims

### Claim: 契约测试与集成测试互补——前者验证接口一致性，后者验证真实协作

- **来源**：[[Vibe Coding系列12：测试环境即代码——从Testcontainers到Ephemeral Environment的Harness实践]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：active

> 测试金字塔从下到上：Unit（pytest/JUnit）→ Contract（Pact）→ Integration（Testcontainers）→ E2E（Playwright）。契约测试在不启动真实依赖的情况下验证服务间 API 接口，速度快、隔离好。

### Claim: PactFlow AI 能从 OpenAPI spec 自动生成契约测试

- **来源**：[[Vibe Coding系列12：测试环境即代码——从Testcontainers到Ephemeral Environment的Harness实践]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.5
- **状态**：active

> PactFlow AI（2025）支持 MCP Server 集成 VS Code/Cursor/Claude Code，从 OpenAPI spec 自动生成契约测试。这是 AI 辅助测试生成的前沿方向。

## 冲突与演进

（暂无）

## 关联概念

- [[testcontainers]] — `contrasts` 契约测试验证接口契约，Testcontainers 验证真实依赖协作，两者互补
- [[harness-quality-gate]] — `part-of` 契约测试是质量门禁测试层的一部分

## 来源日记

- [[2026-04-23-周四]] — Vibe Coding 系列12：测试环境即代码文章撰写
