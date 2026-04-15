---
title: "Testcontainers"
created: "2026-04-11"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - testing
  - docker
  - ci-cd
aliases:
  - "Testcontainers"
related:
  - "[[harness-quality-gate]]"
---

# Testcontainers

## 摘要

Testcontainers 是一个用真实 Docker 容器替代 mock 进行集成测试的框架。核心能力：按需启动容器（数据库、消息队列、云服务模拟等），测试完自动销毁。多语言支持（Java 最成熟、Python、JavaScript/TypeScript、Go、Rust、.NET），且有 Testcontainers Cloud 提供云端运行能力。

## Claims

### Claim: Testcontainers 用真实容器替代 mock 是集成测试的更好方案

- **来源**：[[2026-04-11-周六]]、[[2026-04-12-周日]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-12
- **置信度**：0.5
- **状态**：active

> Testcontainers 按需启动 Docker 容器（数据库、消息队列、云服务模拟等），测试完自动销毁。常用模块：PostgreSQL、MySQL、Redis、Kafka、LocalStack（AWS 模拟）、MongoDB 等。相比传统 mock/嵌入式数据库方案，提供更接近生产环境的测试保真度。

### Claim: Java 版 Testcontainers 最成熟，JUnit 4/5 原生集成

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-11
- **置信度**：0.8
- **状态**：active

> 多语言支持中 Java 版（testcontainers-java）最成熟，提供 JUnit 4/5 原生集成。Python 版支持 pytest，JavaScript/TypeScript 版支持 Jest/Vitest。

### Claim: 在 Harness CI 中可通过 Docker-in-Docker 或 Testcontainers Cloud 运行

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-11
- **置信度**：0.5
- **状态**：active

> Testcontainers Cloud 提供云端运行容器的能力，无需本地 Docker Desktop。在 Harness CI 中通过 Docker-in-Docker 或 Service Dependency 模式运行 Testcontainers。

## 冲突与演进

（暂无）

## 关联概念

- [[harness-quality-gate]] — `part-of` Testcontainers 是 Harness 质量门禁第 4 层（CI 编译与集成测试）的核心工具

## 来源日记

- [[2026-04-11-周六]] — Testcontainers 技术栈调查与研究；Harness 质量门禁中的 CI 集成测试
- [[2026-04-12-周日]] — 追踪任务延续
