---
title: "Skill Creator & Orchestration"
created: "2026-04-13"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - skill
  - orchestration
  - claude-code
aliases:
  - "Skill Creator"
  - "智能编排层"
related:
  - "[[skill-runtime]]"
  - "[[claude-code-extension-system]]"
---

# Skill Creator & Orchestration

## 摘要

融合多个 Skill 的正确架构是"编排层而非合并层"——不复制子 skill 代码，而是作为智能编排层通过 Decision Framework 做路由。Skill 跨平台兼容性是事实标准，同一份 SKILL.md 可在 Claude Code、Chat API、OpenAI Codex、Gemini CLI 等多个 AI Agent 中使用。

## Claims

### Claim: 融合 Skill 的正确架构是编排层而非合并层

- **来源**：[[用Skill-Creator打造CSA演示工具|使用Skill-Creator融合多个PPT Skill]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-07 确认——依据：作者的 Skill-Creator 融合实测，库内无后续修订；编排层思路与 Claude Code 官方「plugin 打包多 skill」一致 Claude Code 官方文档 Plugins https://code.claude.com/docs/en/plugins

> 不复制子 skill 代码，而是作为智能编排层通过 Decision Framework 做路由。

### Claim: Explore Agent 自动分析比人手动对比更全面

- **来源**：[[用Skill-Creator打造CSA演示工具|使用Skill-Creator融合多个PPT Skill]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-07 确认——依据：作者单次实测数字（5 skill、38 次调用），无外部更新来源，库内无矛盾

> 5 个 skill、38 次工具调用约 2 分钟，尤其对工具链细节（如 CJK 字体处理差异）的挖掘更全面。

### Claim: Skill 跨平台兼容性是事实标准

- **来源**：[[Claude-Code系列06：Plugin生态与开发]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.6
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Claude Code 官方文档 Skills https://code.claude.com/docs/en/skills 引用 agentskills.io 跨产品通用技能规范；Superpowers 发布说明提到 Agentskills compliance https://github.com/obra/superpowers/blob/main/RELEASE-NOTES.md

> 同一份 SKILL.md 不仅能在 Claude Code 中运行，也可在 Chat API、OpenAI Codex、Gemini CLI 等其他 AI Agent 中使用。

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——确认 3

## 关联概念

- [[skill-runtime]] — `extends` Skill Creator 构建的是 Skill Runtime 的编排层
- [[claude-code-extension-system]] — `part-of` Skill 是 Claude Code 扩展体系的核心组件

## 来源日记

- [[用Skill-Creator打造CSA演示工具|使用Skill-Creator融合多个PPT Skill]] — Skill 融合实践
- [[Claude-Code系列06：Plugin生态与开发]] — 跨平台兼容性
