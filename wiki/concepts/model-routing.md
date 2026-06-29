---
title: "模型路由（Model Routing）"
created: "2026-06-29"
updated: "2026-06-29"
tags:
  - wiki
  - concept
  - model-routing
  - token-optimization
  - cost-optimization
  - mcp
  - coding-agent
aliases:
  - "模型路由"
  - "Model Routing"
  - "任务分级路由"
  - "CodexSaver"
related:
  - "[[rtk-token-compression]]"
  - "[[caveman-token-compression]]"
  - "[[three-layer-token-optimization]]"
  - "[[mcp-vs-cli]]"
---

# 模型路由（Model Routing）

## 摘要

模型路由是 Token 成本优化里和压缩**正交**的第三条轴：压缩（RTK/Caveman）减少 token *数量*，路由降低 token 的 *单价*（$/token）——同样的 token 量花更少的钱。其核心逻辑是「昂贵模型负责判断（reasoning），廉价模型负责执行（volume），永远不混淆两者」：把架构设计/安全审查/复杂推理等高风险任务留给旗舰模型，把写测试/生成文档/代码搜索/样板填充等低风险执行类任务委派给廉价模型（DeepSeek/haiku/本地 Ollama）。CodexSaver（`fendouai/CodexSaver`）是这一范式的代表实现——一个把 OpenAI Codex 变成成本感知任务路由器的 **MCP Server**，因此平台无关（任何支持 MCP 的 Agent 都能接入）。因为路由不动 token 内容，它与压缩可叠加：压缩把总量降 ~78%、再对剩余 60% 流量路由降价，最终成本可到原始的约 12%。本质区别于 Claude Code 的 `model` 参数（Agent 级分级）——MCP 路由是 **task 级细粒度** + 完全自定义规则 + 可接任意第三方/本地模型。

## Claims

### Claim: 压缩与路由是两条正交的 Token 优化轴

- **来源**：[[CodexSaver深度解析——基于MCP的模型路由Token成本优化]]
- **首次出现**：2026-05-11
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> Caveman（压缩 LLM 输出）和 RTK（压缩工具输出）是**压缩策略**——让同一个模型处理更少的 token；CodexSaver 是**路由策略**——让不同价格的模型各做擅长的事。优化对象不同：压缩降 token *数量*，路由降 token *单价*（$/token）。两者正交可叠加：压缩把总量降 ~78%、再对剩余流量路由降价，三层联合最终成本约为原始的 12%（「原本支撑一周的预算现在能用两个月」）。

### Claim: 昂贵模型判断、廉价模型执行——按风险分级而非按能力高低

- **来源**：[[CodexSaver深度解析——基于MCP的模型路由Token成本优化]]
- **首次出现**：2026-05-11
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> 核心逻辑：「昂贵模型负责判断（reasoning），廉价模型负责执行（volume），永远不混淆两者」。留给旗舰模型：架构设计、安全审查、受保护域、最终审批、复杂多步推理；委派给廉价 worker：写单元测试、生成文档/注释、代码搜索与解释、样板填充、格式化。三种路由状态：`codex_takeover`（留宿主）/ `delegated_execution`（委派廉价模型）/ `preview`（仅展示决策）。DeepSeek vs OpenAI 旗舰输入 token 价差达 16x，假设 60% 是低风险执行类任务，单路由即省 ~56%。

### Claim: 模型路由的价值是 Pattern 而非具体 repo——MCP 让它平台无关

- **来源**：[[CodexSaver深度解析——基于MCP的模型路由Token成本优化]]
- **首次出现**：2026-05-11
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> CodexSaver 本质是一个 **MCP Server**，通过标准 MCP 协议暴露 `delegate_task` 工具——MCP 是开放协议，任何支持 MCP 的 Coding Agent（Claude Code/Copilot/Cursor）都能接入或自写精简版（核心逻辑约 100 行：接任务 → 规则判风险 → 低风险调廉价 API / 高风险返回 takeover）。价值不在某个 repo 实现，而在「通过 MCP 把任务分级委派给不同成本模型」这个 Pattern。区别于各平台原生分级：Claude Code 的 `model` 参数选 haiku/sonnet/opus 是 **Agent 级**分级，MCP 路由是 **task 级**细粒度 + 完全自定义规则 + 可接第三方/本地模型。

### Claim: 路由不损失信息但引入执行质量与延迟风险

- **来源**：[[CodexSaver深度解析——基于MCP的模型路由Token成本优化]]
- **首次出现**：2026-05-11
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> 相对压缩的独特优势：不像 Caveman/RTK 通过压缩减少信息量，路由**保持完整上下文**、可审计（每次路由决策有可见 `interaction` 记录，解决"哪个模型处理哪个任务"的信任问题）、对用户透明（全局 MCP 注册零修改工作流）。代价是新风险维度：廉价模型执行质量可能不足（靠旗舰 model 最终 review 缓解）、额外延迟（~6s/任务，仅批量任务路由）、数据安全（代码发第三方，可用本地 Ollama 替代）、路由误判（保守策略+人工 review）。不适用：月 token < 千万级（工程复杂度超收益）、长链一致性推理（不宜中途切模型）、高合规（除非本地模型）。

## 冲突与演进

- 2026-05-11：作为 Token 优化系列第三篇，确立路由是区别于压缩（Caveman/RTK）的正交优化轴。

## 关联概念

- [[rtk-token-compression]] — `contrasts` RTK 压缩工具输出（减 token 数量），模型路由降 token 单价，两条正交轴可叠加
- [[caveman-token-compression]] — `contrasts` Caveman 压缩 LLM 输出（减 token 数量），模型路由不动内容只换便宜模型执行
- [[three-layer-token-optimization]] — `extends` 三层压缩（compact/RTK/Caveman）之外的第四正交轴；叠加路由后成本可从 ~78% 压缩进一步降到约 12%
- [[mcp-vs-cli]] — `uses` CodexSaver 以 MCP Server 形态实现路由，因此平台无关，是 MCP 集成路线的典型应用
- [[claude-code-agent-subagent]] — `contrasts` Claude Code 的 `model` 参数是 Agent 级分级，MCP 模型路由是 task 级细粒度控制

## 来源日记

- [[CodexSaver深度解析——基于MCP的模型路由Token成本优化]] — 三范式正交、判断/执行分级、MCP 平台无关、成本分析、风险边界、跨平台适配
- [[Caveman与RTK对比——两种互补的LLM Token优化方案]] — 压缩双工具的对比，路由作为正交第三范式的定位背景
