---
title: "Harness 可移植性分层"
created: "2026-08-30"
updated: "2026-09-04"
tags:
  - wiki
  - concept
  - harness
  - skill
  - portability
aliases:
  - "harness-portability-spectrum"
  - "跨 harness 可移植性"
related:
  - "[[harness-engineering]]"
  - "[[skill-runtime]]"
  - "[[computer-use]]"
---

# Harness 可移植性分层

## 摘要

跨 harness 可移植性分层描述 agent 资产在更换宿主（Claude Code / Codex / Copilot / Foundry…）时的存活能力，规律一句话：**离模型越近越可移植**。skill（纯文本指令）与 MCP（协议标准）可移植性高；instructions/system prompt 中等（各平台注入方式不同）；subagent、hook、command、plugin 可移植性低（深度绑定特定 harness 的事件模型与实现细节）。

该分层最初作为 Claim 归口 [[harness-engineering]]（2026-08-04 HOLD），此后三处独立论证使其升格建页：① Copilot Studio 三 harness 产品证据（同一 agent 配置换 harness 跑出不同行为）；② Vibe Coding 系列14 以可移植性为主轴论证 Harness 框架的 Skill 化收敛（Superpowers 三版本目录实证）；③ Computer Use 系列六的 runtime 维度补充（Skill 跨宿主可发现≠可执行）。它是 agent 资产投资决策的基础判据：**资产应优先沉淀在可移植层**。

## Claims

### Claim: 离模型越近越可移植——skill/MCP 高、prompt 中、subagent/hook/command 低

- **来源**：[[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-30
- **置信度**：0.8
- **状态**：active

> 离模型近的资产只依赖"模型能读文本"这一最普适能力；离模型远的资产依赖 harness 私有机制（hook 挂的是 harness 内部生命周期事件，事件模型本身就是实现细节，换 harness 事件就不存在——hook 可移植性几乎为零）。Copilot Studio 三 harness 并存提供产品级证据：同一 agent 配置换 harness 跑出不同行为，"选 harness 就是选行为语义"。

### Claim: skill 是唯一跨 harness 可移植的资产载体——Superpowers 多宿主 bootstrap 实证

- **来源**：[[Vibe Coding系列14：Harness框架的Skill化收敛——从Agent、Command、Hook全家桶到纯Skill的架构简化]]
- **首次出现**：2026-08-20
- **最近更新**：2026-08-30
- **置信度**：0.8
- **状态**：active

> Superpowers 6.3.0 release notes 明确列出 Harness Support 章节（Hermes Agent、Grok Build CLI、Antigravity、Pi、Codex……），同一套 skills 通过不同 bootstrap 机制注入各家 harness；仓库同时存在 `CLAUDE.md`、`AGENTS.md`、`GEMINI.md` 三个入口文件——一份方法论、多个宿主。一旦资产押注在 skill 上，agent/command/hook 这些绑定单一宿主的机制就成了拖累跨平台发布的死重。这是 Harness 框架 Skill 化收敛的第三个（结构性）原因。Foundry 侧共振：Prompt/Hosted Agent 的 Skill support 双 Yes——skill 正在成为跨 harness 的行业通用格式。

### Claim: 可移植性有两个维度——文本可发现性 ≠ runtime 可执行性

- **来源**：[[Computer Use与Browser Use系列六：Codex CLI与App的能力分界——同一套Skill、两条调用链与第三方生态补位]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-30
- **置信度**：0.75
- **状态**：active

> Codex CLI 与 App 共享插件目录，Skill 文件跨宿主 100% 可发现；但 bundled Computer Use Skill 依赖的 `node_repl + @oai/sky` runtime 只在 App 注入——**同一份 Skill 在 App 是完整能力、在 CLI 是一纸空文**。这给"离模型越近越可移植"补了精确化限定：可移植的是 skill 的**指令层**（markdown 说明书）；skill 若依赖特定执行接口（runtime tool、脚本解释器），该依赖层的可移植性立即跌至 hook 级别。与 [[skill-runtime]] 的 scripts 断层同构：规范只管包格式，不管执行环境。

### Claim: 纯文本资产的维护成本低一个量级——收敛到 skill 后测试从"跑代码"变成"eval campaign"

- **来源**：[[Vibe Coding系列14：Harness框架的Skill化收敛——从Agent、Command、Hook全家桶到纯Skill的架构简化]]
- **首次出现**：2026-08-20
- **最近更新**：2026-08-30
- **置信度**：0.75
- **状态**：active

> agent/hook/command 是代码，有兼容性矩阵与平台差异（Superpowers 一个 SessionStart hook 要在 PowerShell/cmd/bash 三种 shell 上验证引号与括号行为）。收敛到纯 skill 后：测试方式变成 eval campaign + subagent probe（每处文本删减做微测试）、发布物从多平台二进制行为变成 markdown 文本（review 即 diff）。可移植性与维护成本是同一枚硬币的两面——它们共同解释了框架竞争维度的迁移：不再比机制精巧，而是比方法论文本质量。

### Claim: "搬家工具"成为产品类目——切换成本真实存在但正在被工程化消解，可流动的只有可移植层

- **来源**：[[Agent Harness五平台对比——DeepSeek Harness、pi、Codex、OpenHands与Goose的架构哲学与场景选择]]
- **首次出现**：2026-08-31
- **最近更新**：2026-09-04
- **置信度**：0.75
- **状态**：active

> 2026 年市场侧实证：dsh-movein 一键迁移 Claude Code/Codex/OpenCode 配置、Codex 官方提供 Claude Code 配置一键导入、Goose 直连任何为 Claude Desktop 写的 MCP server——"搬家工具"本身成了产品类目，说明切换成本真实存在、且正在被工程化消解。但消解是分层的：**skill/MCP 资产在五家间基本可流动，hook/plugin/subagent 配置仍锁死在各自 harness**——市场行为精确复现了"离模型越近越可移植"的分层线。资产沉淀策略由此获得市场侧背书：优先投资可移植层。

## 冲突与演进

- 2026-08-30：升格建页（用户裁决）。2026-08-04 HOLD 于 harness-engineering 页内 Claim；复核阈值"第 2 篇独立引用"被系列14（08-20）与 Computer Use 系列六（08-29）两次命中后解除。harness-engineering 页保留原始 Claim（Copilot Studio 证据），本页作分层判据的归口页并补 runtime 维度精确化。
- 2026-09-04：注入首批续证——五平台横评的"搬家工具成产品类目"市场侧实证（建页后第 4 处独立来源）。

## 关联概念

- [[harness-engineering]] — `part-of` 可移植性分层是 harness 资产投资决策的一个判据维度，原始 Claim 归口该页
- [[skill-runtime]] — `uses` scripts 断层与 runtime 依赖问题界定了 skill 可移植性的下界
- [[model-harness-codesign]] — `constrains` 第一方绑定路线的服务端工具全家桶（runtime 私有接口）天然压低跨 harness 可移植性

## 来源日记

- [[2026-08-20-周四]] — 系列14 成文（SDLC framework Skill 化收敛调查）
- [[2026-08-29-周六]] — Computer Use 系列六成文（Skill 可见但 runtime 缺失实测）
