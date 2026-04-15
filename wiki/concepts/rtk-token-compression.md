---
title: "RTK Token Compression"
created: "2026-04-15"
updated: "2026-04-15"
tags:
  - wiki
  - concept
  - token-compression
  - cli
  - rust
  - ai-agent
aliases:
  - "RTK"
  - "Rust Token Killer"
related:
  - "[[context-engineering]]"
  - "[[harness-engineering]]"
  - "[[mcp-vs-cli]]"
---

# RTK Token Compression

## 摘要

RTK（Rust Token Killer）是一个 Rust 编写的 CLI 代理工具，通过在 AI Coding Agent（如 Claude Code）与底层操作系统之间插入一个透明代理层，对工具调用的输出进行 token 压缩，从而降低 LLM 上下文消耗、减少成本并提升响应速度。核心思路是"不改 Agent、不改 LLM，只压缩中间数据流"——通过 59 个 TOML 配置文件和 38 个 Rust 模块实现可扩展的策略引擎。

## Claims

### Claim: RTK 通过 CLI 代理实现透明 token 压缩

- **来源**：[[2026-04-14-周二]]
- **首次出现**：2026-04-14
- **最近更新**：2026-04-15
- **置信度**：0.8
- **状态**：active

> RTK 在 Agent 和 OS 之间插入代理层，拦截 Bash/Read/Glob/Grep/Ls 等工具调用的输出，通过策略引擎裁剪、压缩、重组数据后返回给 Agent。Agent 无需任何修改即可获得压缩后的输出。

### Claim: RTK 的策略引擎基于 TOML 配置实现可扩展压缩

- **来源**：[[2026-04-15-周三]]
- **首次出现**：2026-04-15
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：active

> 59 个 TOML 配置文件定义了针对不同命令（git diff、cargo test、npm install 等）的压缩策略，包括行过滤、正则替换、重复折叠、截断等操作。用户可通过 Session 数据分析实际 token 消耗，定制个性化压缩规则。

### Claim: RTK 代表 Agent 工具链中"中间件"范式

- **来源**：[[2026-04-15-周三]]
- **首次出现**：2026-04-15
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：active

> RTK 的架构启示：AI Agent 的工具调用链可以像 Web 中间件一样插入处理层。这种模式可以扩展到安全审计（拦截危险命令）、缓存（重复查询去重）、可观测性（记录所有工具调用）等场景。

## 冲突与演进

（暂无）

## 关联概念

- [[context-engineering]] — `extends` RTK 是 Context Engineering 在工具链层面的实践——通过压缩工具输出来优化 LLM 可用上下文
- [[harness-engineering]] — `part-of` Token 压缩是 Harness 工程的一个环节——优化 Agent 运行环境
- [[mcp-vs-cli]] — `contrasts` RTK 选择 CLI 代理而非 MCP 协议，体现了两条工具集成路线的不同取舍

## 来源日记

- [[2026-04-14-周二]] — 首次研究 RTK，本地安装试用
- [[2026-04-15-周三]] — 深度源码分析，撰写 RTK 系列 3 篇文章
