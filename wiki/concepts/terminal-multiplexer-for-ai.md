---
title: "Terminal Multiplexers for AI"
created: "2026-04-13"
updated: "2026-11-07"
tags:
  - wiki
  - concept
  - tmux
  - cmux
  - terminal
  - remote
aliases:
  - "终端复用器"
  - "tmux"
  - "cmux"
related: []
---

# Terminal Multiplexers for AI

## 摘要

终端复用器（tmux、cmux）对 AI Agent 工作流至关重要。tmux 的核心价值是解耦终端会话与终端窗口，实现从任何设备（Mac、iPhone、iPad）通过 SSH 访问持久 Claude Code 会话。cmux = Ghostty + tmux 式会话管理 + AI Agent 集成层，是原生 macOS GUI 终端而非纯终端方案。2026-07 的 Orca（多 Agent 编排 IDE + Mobile 远程互动）把同一"会话与窗口解耦"范式推进到产品化：执行永远在 desktop/server，手机只是遥控器（指挥、审阅、提交），跨网靠 Tailscale 组网而非云中继。

## Claims

### Claim: tmux 解耦终端会话与窗口

- **来源**：[[tmux与Claude远程交互实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-08-04
- **置信度**：0.7
- **状态**：active（2026-08-04 由 stale 回填激活——Orca 遥控执行模型提供同范式新证据）

> 实现从任何设备通过 SSH 访问持久 Claude Code 会话。

### Claim: Orca 遥控执行模型——手机是遥控器，执行永远在电脑

- **来源**：[[Orca使用笔记：多Agent编排与远程互动]]
- **首次出现**：2026-07-25
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Orca 官方文档 https://github.com/stablyai/orca/blob/main/docs/site/content/docs/remote-servers.mdx 与 ways-to-run.mdx ：Remote Orca Server 持有项目/worktree/终端/agent 会话，客户端只提供 UI，经 Tailscale；仓库 README https://github.com/stablyai/orca 的 Parallel Worktrees 与 Mobile Compa…

> Orca Mobile 是 read-mostly 遥控器：浏览会话、下指令、审阅 diff、批准提交，但 Agent 执行永远发生在 desktop/server 上——这是 tmux"会话与窗口解耦"范式的产品化延伸。跨网络不走云中继，靠 Tailscale 组一张私有网；Remote Orca Server 模式把运行时归属从"我的 Mac"翻转到"远端常驻服务器"，四种连接模式覆盖本机/局域网/Tailscale/远端服务器。每个任务独立 git worktree 隔离，支持 fan-out 并行跑多个 Agent 再 pick the winner——终端复用从"人访问会话"进化为"人调度 Agent 编队"。

### Claim: cmux 是 GUI 终端而非纯终端

- **来源**：[[cmux使用笔记]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.6
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：cmux 官方仓库 https://github.com/manaflow-ai/cmux ：基于 Ghostty/libghostty 的原生 macOS 终端，带内置浏览器和 CLI/socket API

> Ghostty（终端渲染）+ tmux 式会话管理 + AI Agent 集成层。

### Claim: cmux 的 CLI 与 Unix socket 同为可编程接口

- **来源**：[[cmux使用笔记]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.3
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 降级——依据：cmux 官方仓库 https://github.com/manaflow-ai/cmux 称 CLI 与 socket API 均可完成每个动作，并未表明 CLI 是降级 wrapper

> **现行结论（2026-11-07 降级）**：改为'CLI 与 Unix socket 同为可编程接口'；'外部调用时 CLI 能力降级'本轮无官方佐证
>
> 以下为原记录：
> CLI 只是 wrapper，Socket API 才是唯一稳定接口，外部调用时 CLI 能力降级。

## 冲突与演进

- 2026-08-04：Orca 使用笔记提供同范式新证据（遥控执行模型、Tailscale 跨网、worktree 隔离 + fan-out），页面由 stale 回填激活；tmux 解耦 Claim 同步激活，cmux 两条 Claim 无新证据维持 stale。
- 2026-11-07：/revalidate 全库复核（证据分类）——确认 2

## 关联概念


## 来源日记

- [[tmux与Claude远程交互实践]] — tmux 实践
- [[cmux使用笔记]] — cmux 实践
- [[Orca使用笔记：多Agent编排与远程互动]] — 遥控执行模型、Tailscale 跨网、worktree 隔离与 fan-out（2026-07-25）
