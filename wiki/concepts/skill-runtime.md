---
title: "Skill Runtime"
created: "2026-04-13"
updated: "2026-08-10"
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

### Claim: Agent Skills 规范只定义包格式不定义执行环境——scripts 层是 skill 可移植性的隐藏断层

- **来源**：[[2026-08-10-周一]]
- **首次出现**：2026-08-10
- **最近更新**：2026-08-10
- **置信度**：0.8
- **状态**：active

> Agent Skills 规范（agentskills.io）只定义 SKILL.md + bundled assets 的**包格式**，不定义执行环境——SKILL.md 里写 `Prerequisites: Python 3.x` 只是给模型看的散文，无机制保证 runtime 真有 Python。**skill 声明依赖，harness + runtime 决定依赖是否被满足**。由此产生可移植性断层：指令层（markdown）跨 harness 100% 可移植（Claude Code / Copilot / Codex 都认），scripts 层把 skill 悄悄绑回特定 runtime。各 runtime 实测差异（2026-08 查证）：Claude Code 本地=宿主机有啥用啥、可自装依赖；Claude API code execution 容器=预装固定包清单 + 默认无出站网络、`pip install` 不可用；GitHub Copilot coding agent（Actions 形态）=唯一给环境控制权的，走 `copilot-setup-steps.yml` 预装；Copilot Studio（GitHub Copilot harness）=内置 Python 引擎（与 code interpreter 同源）但无用户安装机制、Node.js 无官方承诺。社区 skill 市场上带脚本的 skill 都隐含未声明的 runtime 假设——装前要审的不只是安全性还有环境兼容性；规范缺一个类似 package.json `engines` 的运行时声明字段。

### Claim: 托管 runtime 下 skill 脚本的四条实操策略——最小公分母、降级路径、重依赖走 MCP、探针实测

- **来源**：[[2026-08-10-周一]]
- **首次出现**：2026-08-10
- **最近更新**：2026-08-10
- **置信度**：0.75
- **状态**：active

> 面向跨 harness 可移植的 skill 脚本设计：① **最小公分母**——Python 标准库 only、不依赖 Node 专属脚本，重依赖以纯 Python 源码 vendor 进 skill 的 scripts/ 目录（无网也能用）；② **运行时探测 + 文字降级**——SKILL.md 写明"优先跑脚本，环境无 Python 则按以下手动步骤"，脚本失效时模型降级为纯推理执行，印证"离模型越近越可移植"；③ **重依赖改走 MCP**——需要 playwright/特定 SDK/Node 生态时不塞 skill scripts，做成 MCP server 跑在自控环境，把依赖问题从管不了的托管 sandbox 转移到管得了的自有服务器；④ **env-probe 探针 skill**——脚本打印 sys.version、pkgutil.iter_modules() 包清单、socket 出站测试、subprocess 试 node --version，上线前在目标 harness 跑一次拿真实能力清单，比等平台文档快且可重复验证。

## 冲突与演进

- 2026-08-04：SEP-2640 提供协议层证据——skill=MCP Resource + progressive disclosure 三步，本页"按需投影"范式获得标准化路径，页面由 stale 注入新活跃证据。
- 2026-08-10：从 Copilot Studio 三 harness 讨论补充 scripts 层可移植性断层——规范只管包格式不管执行环境，与 SEP-2640 的约束同构（指令层依赖 harness 实现注入点，脚本层依赖 runtime 提供解释器）；沉淀托管 runtime 下的四条实操策略。

## 关联概念

- [[context-explosion]] — `addresses` Skill Runtime 是 Context 爆炸的解法方向
- [[context-projection]] — `implements` Skill Runtime 的 Selection Layer 实现上下文投影
- [[cybernetics-agent-design]] — `contrasts` 控制论框架中 Skill Runtime 对应缺位的 L5 状态观测层

## 来源日记

- [[Vibe Coding系列05]] — Skill Runtime 范式提出
- [[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]] — SEP-2640、skill=MCP Resource、progressive disclosure 三步（2026-07-30）
- [[2026-08-10-周一]] — skill scripts 可移植性断层、各托管 runtime 环境差异实测、四条实操策略（2026-08-10）
