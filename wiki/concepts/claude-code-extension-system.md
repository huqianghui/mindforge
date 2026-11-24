---
title: "Claude Code Extension System"
created: "2026-04-13"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - claude-code
  - plugin
  - skill
  - command
aliases:
  - "Claude Code 扩展体系"
  - "Command / Skill / Agent / Plugin"
related:
  - "[[skill-runtime]]"
---

# Claude Code Extension System

## 摘要

Claude Code 的扩展体系经历三次演进：Command（固定 prompt 模板，共享主 session context）→ Skill（知识注入，被动触发，AI 自动判断加载）→ Plugin（命名空间隔离 + Marketplace 分发）。Plugin 是分发单元不是运行时单元——安装后被"拆包"，运行时 model 看到的是独立的 tool/skill/command。

## Claims

### Claim: 自定义 Command 已并入 Skill——扩展体系是 Skill 加 Agent，Plugin 负责打包分发

- **来源**：[[Claude-Code系列04：Command、Skill与Agent]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 修订——依据：Claude Code 官方文档 Skills https://code.claude.com/docs/en/skills

> **现行结论（2026-11-07 修订）**：官方文档：自定义 commands 已合并进 skills，`.claude/commands/x.md` 与 `skills/x/SKILL.md` 都创建 /x。正文改为「Command 并入 Skill，两层加 Agent」，三层说法降为两层加独立角色
>
> 以下为原记录：
> Command 是 prompt 模板（快捷入口，共享主 session context），Skill 是知识注入（被动触发，AI 自动判断加载），Agent 是独立角色（独立 context window，可限制工具和模型）。

### Claim: Plugin 是 Coding Agent 从"工具"走向"平台"的关键拐点

- **来源**：[[Claude-Code系列06：Plugin生态与开发]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Claude Code 官方文档 Plugins https://code.claude.com/docs/en/plugins：plugin 把 skills、agents、hooks、MCP 打包成可安装可版本化的单元，经 marketplace 分发

> 将 Skill/Command/Subagent/Hook/MCP 统一封装为可安装、可版本化的模块，类似 VS Code Extension 生态能力。

### Claim: Plugin 是分发单元不是运行时单元

- **来源**：[[Claude-Code系列06：Plugin生态与开发]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Claude Code 官方文档 Plugins https://code.claude.com/docs/en/plugins：运行时 skill/agent/command 以独立条目进入 context，MCP 随 plugin 启停

> 安装后被"拆包"，运行时 model 看到的是独立的 tool/skill/command，完全不感知"Plugin"概念。

### Claim: 扩展机制经历三次演进

- **来源**：[[Claude-Code系列06：Plugin生态与开发]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 修订——依据：Claude Code 官方文档 Skills https://code.claude.com/docs/en/skills；Claude Code 官方文档 Plugins https://code.claude.com/docs/en/plugins

> **现行结论（2026-11-07 修订）**：演进链改为：Command 合并进 Skill，再由 Plugin 打包分发；Plugin 现在额外可含 hooks module（mod）。「Anthropic 明确表示」一句无本轮来源，删去或标出处
>
> 以下为原记录：
> Command → Skill → Plugin。Anthropic 明确表示未来 Plugin 将成为标准扩展方式。

### Claim: 入口和执行分开：Command（现为 Skill）做入口，Agent 做隔离执行——把长规范塞进入口会占满主会话上下文、不能限工具、也不能被别处复用

- **来源**：[[Claude-Code系列04：Command、Skill与Agent]]
- **首次出现**：2026-03-16
- **最近更新**：2026-11-24
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验

> 以 /obsidian 为例：入口只把参数拼进一段 prompt 交给主会话，主会话再调用 obsidian-agent；agent 在全新上下文里启动，body 作为系统提示、参数作为首条用户消息，重新加载 CLAUDE.md，跑完只返回摘要。完全可以把 agent 的全部内容写进入口直接执行，但有四个代价：大量格式规范占据主会话上下文；主会话会被其他对话干扰，agent 只看到 vault 相关信息；入口只在本项目用，agent 可以被任何会话或入口调用；入口无法限制工具权限，agent 可以精确声明可用工具。三者最核心的架构差别就在上下文与权限隔离：入口和 skill 都共享主会话的上下文与全部工具，skill 只是把知识注入进来；agent 是完全隔离的。

### Claim: 不是每个角色都需要独立的 agent 定义——prompt 每次动态生成的角色用通用 agent 加模板，prompt 固定的角色才写成专用 agent 文件

- **来源**：[[Claude-Code系列04：Command、Skill与Agent]]
- **首次出现**：2026-03-16
- **最近更新**：2026-11-24
- **置信度**：0.65
- **状态**：active
- **证据类型**：理论

> Superpowers 插件里的三种经典 subagent 角色：implementer 和 spec-reviewer 都是通用 agent 加动态 prompt 模板（每个任务的 prompt 不同，spec-reviewer 以"不信任 implementer"的立场做角色对抗），code-reviewer 才是固定系统提示的专用 agent。判断依据是 prompt 是否随任务变化：变化就用模板，固定才值得单独定义、单独限工具和模型。

## 冲突与演进

- 2026-11-24：/extract-knowledge 厚度补抽 Claude Code 系列 04：新增"入口与执行分开"和"不是每个角色都要独立 agent 定义"两条。
（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——确认 2

## 关联概念

- [[skill-runtime]] — `uses` Skill 的运行时执行模型

## 来源日记

- [[Claude-Code系列04：Command、Skill与Agent]] — Command/Skill/Agent 三层解析
- [[Claude-Code系列06：Plugin生态与开发]] — Plugin 生态与演进
