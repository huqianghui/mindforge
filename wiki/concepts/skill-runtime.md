---
title: "Skill Runtime"
created: "2026-04-13"
updated: "2026-08-04"
tags:
  - wiki
  - concept
  - skill
  - runtime
  - agent
aliases:
  - "Skill Runtime"
  - "Skill 运行时"
related:
  - "[[context-explosion]]"
  - "[[skill-pattern]]"
  - "[[claude-code-extension-system]]"
  - "[[context-projection]]"
---

# Skill Runtime

## 摘要

Skill Runtime 是解决 Context 爆炸问题的范式方案：从 document-centric（全量拼接）迁移到 capability-centric（按需投影）。核心流程是"query → intent parse → skill match → context projection → execution"。Context 是声明式的（YAML schema 定义 I/O/依赖），而非全量拼接的文档。

## Claims

### Claim: 行业缺失的方案是 Skill Runtime 模式

- **来源**：[[Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：stale

> query 触发 intent parse -> skill match -> context projection -> execution。

### Claim: Skill Runtime 的 context 是声明式的

- **来源**：[[Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：stale

> YAML schema 定义输入/输出/依赖，而非全量拼接的文档——从 document-centric 到 capability-centric 的范式迁移。

### Claim: 评估 Agent system 能否 scale 的 5 个自检问题

- **来源**：[[Vibe Coding系列05]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 谁决定用哪个 skill、context 是否全量拼接、skill 有无明确 I/O、context 是否 externalizable、execution 是否 independent。

### Claim: SEP-2640 把 skill 标准化为 MCP Resource——progressive disclosure 三步正是 context projection 的协议化

- **来源**：[[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> MCP 规范提案 SEP-2640 把 skill 以 **MCP Resource（而非 callable tool）**暴露：skill 是"读进上下文的文本"，不是"被调用的函数"。加载走 progressive disclosure 三步：① Advertise——server 只广播 skill 的 name + description（轻量元数据）；② Load——模型判断相关后才读取 SKILL.md 全文；③ Read resources——skill 内引用的深层文件按需再读。这正是本页 2026-04 提出的"query → skill match → context projection"流程的协议化落地——按需投影从范式设想变成 MCP 标准草案。关键约束：三步的 client 逻辑必须由 harness 实现，harness 不实现（如 Foundry Prompt Agent 的托管 harness）skill 就无注入点。

## 冲突与演进

- 2026-08-04：SEP-2640 提供协议层证据——skill=MCP Resource + progressive disclosure 三步，本页"按需投影"范式获得标准化路径，页面由 stale 注入新活跃证据。

## 关联概念

- [[context-explosion]] — `addresses` Skill Runtime 是 Context 爆炸的解法方向
- [[context-projection]] — `implements` Skill Runtime 的 Selection Layer 实现上下文投影
- [[cybernetics-agent-design]] — `contrasts` 控制论框架中 Skill Runtime 对应缺位的 L5 状态观测层

## 来源日记

- [[Vibe Coding系列05]] — Skill Runtime 范式提出
- [[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]] — SEP-2640、skill=MCP Resource、progressive disclosure 三步（2026-07-30）
