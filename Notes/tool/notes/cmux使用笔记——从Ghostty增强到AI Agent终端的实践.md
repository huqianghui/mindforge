---
title: cmux使用笔记——从Ghostty增强到AI Agent终端的实践
created: 2026-04-09
tags: [cmux, terminal, ghostty, claude-code, ai-agent, tmux, browser-automation, devops]
---

# cmux使用笔记——从Ghostty增强到AI Agent终端的实践

## 一、cmux 是什么

cmux 是一个基于 Ghostty 的 macOS 终端应用，由 [manaflow-ai](https://github.com/manaflow-ai/cmux) 开发。它在 Ghostty 的基础上增加了垂直标签页、多会话管理、AI coding agent 通知等能力。

> **一句话定位**：cmux = Ghostty（终端渲染） + tmux 风格的 session 管理 + AI Agent 集成层

核心特点：
- 原生 macOS GUI 终端（非 tmux 那种纯终端方案）
- 垂直标签页布局
- 工作区（Workspace）管理
- AI Agent 通知与集成（Claude Code Teams、oh-my-opencode）
- 内置 Browser Automation（基于 Chromium）
- 中文显示友好

官方文档：[cmux Getting Started](https://cmux.com/docs/getting-started)

## 二、核心概念模型

cmux 的层级结构（从大到小）：

```
Window → Workspace → Pane → Surface
```

| 概念 | 类比 | 说明 |
|------|------|------|
| Window | 窗口 | 最外层容器 |
| Workspace | tmux session | 一组相关 pane 的集合，有独立 cwd |
| Pane | tmux pane | 可分割的面板区域 |
| Surface | 面板内容 | 实际运行 terminal / browser 的单元 |

关键认知：
- Workspace 是 cmux 的核心管理单元，类似 tmux session
- 每个 Surface 可以是 terminal 或 browser
- 所有 CLI 命令都是 **workspace-relative** 的

## 三、cmux 命令执行机制

### 3.1 命令的本质

cmux 配置文件（`cmux.json`）中的 command 本质只是 **字符串 shell 命令**：

```json
{
  "name": "Run Tests",
  "command": "npm test"
}
```

执行时，cmux 会在新建的 terminal session 里用 shell 执行命令——没有 magic，就是 fork 一个 shell。

### 3.2 与 tmux 的核心区别

| 维度 | tmux | cmux |
|------|------|------|
| 执行方式 | shell attach | GUI terminal |
| 控制方式 | tmux socket | cmux socket API |
| pane | tmux pane | 原生 UI pane |
| command | send-keys | spawn terminal + run |

cmux 是**直接创建 terminal + 执行 command**，而不是往已有 session 里塞命令。

### 3.3 架构分层

```
GUI App（核心）
  ↑
Socket API（唯一稳定接口）
  ↑
CLI（只是 wrapper，外部调用时能力降级）
```

CLI 不是一等公民，Socket API 才是。cmux 本质是 **terminal orchestrator**，不是 command runner。

## 四、CLI 使用踩坑实录

### 4.1 Socket not found 问题

在外部终端（Terminal / iTerm / Ghostty）直接执行 `cmux list-workspaces` 会报错：

```
Error: Socket not found at /Users/.../cmux.sock
```

**根因**：cmux CLI **默认只在 cmux 内部 terminal 有效**。默认 socket 模式是 `cmux processes only`，只允许 cmux 启动的进程访问。

**解决方案**：

方案 A（推荐）——在 cmux 内部执行：
```bash
# 打开 cmux App → 在里面的 terminal 执行
cmux list-workspaces
```

方案 B——外部调用时放开 socket 权限：
```bash
export CMUX_SOCKET_MODE=allowAll
cmux list-workspaces
```

方案 C——显式指定 socket：
```bash
cmux --socket /tmp/cmux.sock list-workspaces
```

### 4.2 命令行为不一致问题

`cmux send` 能成功但 `cmux list-surfaces` 打印 help 信息——这不是 bug，而是设计问题：

| 命令 | 对 workspace 上下文的依赖 | 行为 |
|------|--------------------------|------|
| `send` | 弱依赖（fallback 到 active surface） | 大多数情况能 work |
| `list-surfaces` | 强依赖（必须知道哪个 workspace） | 无上下文时直接打 help |

**解决方案**：永远显式指定 workspace：
```bash
cmux list-surfaces --workspace workspace:2
cmux send --workspace workspace:2 "echo hello\n"
cmux new-split --workspace workspace:2 right
```

验证当前是否在 cmux 内部：
```bash
echo $CMUX_WORKSPACE_ID
# 有值 → 在 cmux 里 ✅
# 没值 → 外部 ❌
```

### 4.3 两套 CLI 的混淆

系统中可能存在多个 cmux binary：

```bash
which -a cmux
# /Applications/cmux.app/Contents/Resources/bin/cmux  ← App CLI（UI 入口）
# /opt/homebrew/bin/cmux                               ← Homebrew 安装
# /usr/local/bin/cmux                                  ← 手动 symlink
```

`sudo ln -sf` 创建的 symlink 可能指向错误的版本。如果发现命令集不完整（只有 welcome/shortcuts/themes），说明用的是 UI launcher CLI 而非 Control CLI。

清理方法：
```bash
sudo rm /usr/local/bin/cmux  # 只删链接，不影响 App 本体
which cmux  # 确认当前默认版本
```

## 五、Browser Automation——AI 可操作的浏览器层

### 5.1 本质定位

cmux 内置了一个基于 Chromium 的浏览器自动化层。但它**不是 Playwright / Selenium 的替代品**，而是：

> **AI-first automation layer**——给 AI agent 用的浏览器操作接口

核心区别：

| 维度 | Playwright | cmux Browser |
|------|-----------|-------------|
| 用户 | 人类开发者 | AI agent |
| 控制方式 | CSS selector | snapshot + 元素引用（e1, e2） |
| 稳定性 | selector 易碎 | 相对稳定 |
| 抽象层 | DOM | UI 语义 |
| 目标 | E2E 测试 | 自动执行任务 |

### 5.2 工作流

```
navigate → snapshot → act → snapshot（循环）
```

关键：每次 DOM 变化后必须重新 snapshot，因为元素引用会失效。

### 5.3 适用场景

适合：
- AI 自动操作网页（注册、填表、后台操作）
- AI + 本地开发联动（写代码 → 启动服务 → 浏览器验证）
- RAG + 浏览器执行

不适合：
- 精准 E2E 测试（用 Playwright）
- 爬虫（用 API）
- 高稳定自动化流程

### 5.4 与 Chrome DevTools MCP 的关系

如果已经配置了 Chrome DevTools MCP，**90% 场景不需要 cmux browser**：

| 能力 | Chrome DevTools MCP | cmux Browser |
|------|-------------------|-------------|
| 点击/输入/导航 | 完整支持 | 支持 |
| Console error | 完整支持 | 有限 |
| Network 分析 | 完整支持 | 基本没有 |
| Performance trace | 完整支持 | 不支持 |
| 稳定性 | 基于 CDP，非常稳定 | snapshot-based，容易漂 |

**判断标准**：
- Debug → 用 Chrome DevTools MCP
- GUI agent / 多 agent 协作 → 才考虑 cmux browser

## 六、与 Claude Code 的集成

### 6.1 核心机制——tmux shim

cmux 与 Claude Code 的集成不是 API 级别的，而是**环境劫持**：

```bash
cmux claude-teams
```

这个命令伪造了一个 tmux 环境，让 Claude 以为自己在控制 tmux。但实际上 tmux 命令被 cmux shim 劫持，转成 socket API 调用。

Claude 执行 `split-pane`、`send-keys` 等操作时，cmux 会将其转换为：创建 GUI pane、控制 agent、调用 browser 等操作。

### 6.2 多 Agent 分工（cmux 真正价值）

cmux 的杀手锏在于多 agent 并行：

- Agent 1（写代码）：实现 feature
- Agent 2（跑服务）：npm run dev
- Agent 3（浏览器测试）：打开 UI → 操作 → 验证
- Agent 4（看日志）：tail -f logs

全都在一个界面里，一个 orchestrator agent 可以控制其他 agent。

### 6.3 Agentic Debug Loop

有 cmux 的闭环：

```
Claude 写代码 → 启动 dev server → 打开 browser panel
→ 自动操作页面 → 读取 console error → 修改代码 → 再验证
```

### 6.4 让 Claude 稳定使用 MCP 的技巧

与其写复杂的 skill，不如用好 prompt：

**技巧 1——显式指令**：
```
Use chrome-devtools MCP to:
- open page
- click login
- check console errors
```

**技巧 2——加 fallback**：
```
If clicking fails, inspect DOM and retry
```

**技巧 3——强制 debug loop**：
```
Repeat until no console errors
```

## 七、当前限制与注意事项

### 产品成熟度
- cmux 仍处于产品过渡期，CLI 行为不一致
- 部分命令 implicit，部分必须 explicit
- 外部调用 CLI 时能力降级

### Browser Automation 的坑
- snapshot 依赖 UI，UI 变化后 ref 失效
- 认证流程（Google Login、企业系统）基本会卡
- 有 shadow DOM 时识别失败
- 有时人操作 10 秒的事，agent 要搞 2 分钟

### 对 cmux 的正确定位
- 它是 **terminal orchestrator + AI agent runtime**
- 不是 tmux 替代品（虽然有 shim）
- 不是测试框架（用 Playwright）
- 不是爬虫工具（用 API）
- 更像"一个会用电脑的实习生"

## 八、我的使用结论

经过实际使用和调研，cmux 的优势在于：

1. **中文显示**：比 Ghostty 直接使用体验更好
2. **布局管理**：垂直标签页 + Workspace 管理比 tmux 更直观
3. **AI Agent 集成**：`cmux claude-teams` 让多 agent 协作成为可能
4. **不需要复杂配置**：开箱即用的 GUI 终端

目前的问题：
- CLI 外部调用不完整（需要在 cmux 内部使用）
- Socket API 文档和行为有时不一致
- 产品还在快速迭代中，部分功能不够稳定

**总体判断**：作为日常开发终端替代 Ghostty 已经可用。Browser Automation 在已有 Chrome DevTools MCP 的情况下优先级不高，但多 agent 协作的潜力值得关注。

## 参考资料

- [manaflow-ai/cmux](https://github.com/manaflow-ai/cmux) — GitHub 仓库
- [cmux 官方文档](https://cmux.com/docs/getting-started)
- [cmux API 文档](https://cmux.com/docs/api)
- [cmux 介绍文章](https://mp.weixin.qq.com/s/STGTT0Tq6TnBlD4SAjWvXQ)
