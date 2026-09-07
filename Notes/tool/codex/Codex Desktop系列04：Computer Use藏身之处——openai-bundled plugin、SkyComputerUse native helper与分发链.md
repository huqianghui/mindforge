---
title: Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链
created: 2026-09-05
tags:
  - AI
  - agent
  - codex
  - computer-use
  - macos
  - mcp
---

# Codex Desktop 系列04：Computer Use 藏身之处——openai-bundled plugin、SkyComputerUse native helper 与分发链

> 系列导航：[系列01：接入 Azure GPT-6](Codex%20Desktop系列01：接入Azure%20OpenAI%20GPT-6——bundled%20CLI版本锁定、model%20catalog%20schema与分层排错.md) ｜ [系列02：mini 与三条暗线](Codex%20Desktop系列02：gpt-5.4-mini与三条暗线——全局配置菜单、退休元数据与自动审批调用链.md) ｜ [系列03：bundled 与三版本号](Codex%20Desktop系列03：bundled的真正含义与三版本号——Apple%20Bundle概念、同源不同发行版与com.openai.codex血缘.md) ｜ 本篇 ｜ [系列05：模型条目装下整个 harness](Codex%20Desktop系列05：一个模型条目装下整个harness——从gpt-6-astra展开配置看Model与Harness的真实边界.md) ｜ [系列06：ModelInfo 字段值手册](Codex%20Desktop系列06：ModelInfo字段值手册——unified_exec、code_mode、Ultra档与治理字段的源码级解读.md)

> 素材来源：2026-09-05 与 ChatGPT 的讨论（[原始对话](https://chatgpt.com/share/6a9b8f60-340c-83ec-b92f-99f80ef6ab2e)，与系列03 同一场），路径与结构均已在本机验证。

## 引言：一个老疑问的物理答案

[[Computer Use与Browser Use系列六：Codex CLI与App的能力分界——同一套Skill、两条调用链与第三方生态补位]] 实测过一个现象：**standalone Codex CLI 没有 Computer Use，而 Codex Desktop 有**。当时的结论是"runtime 不对等"——本篇把这个"不对等"的物理位置找到了：Computer Use 不在 CLI 二进制里，而在 App bundle 携带的 plugin payload 里。这正是系列03 组合公式（ChatGPT 壳 + bundled CLI + bundled plugins）第三元的具体解剖。

## 一、藏身目录（本机已验证）

公开 issue（[openai/codex#18258](https://github.com/openai/codex/issues/18258)、[openai/codex#26451](https://github.com/openai/codex/issues/26451)）给出了路径，本机实际确认存在：

```text
/Applications/ChatGPT.app/Contents/Resources/
├── codex                              ← bundled CLI
├── cua_node/
└── plugins/
    └── openai-bundled/                ← bundled plugin marketplace
        └── plugins/
            └── computer-use/
                ├── plugin.json
                ├── .mcp.json          ← 关键：MCP server 指向 native helper
                ├── skills/
                └── Codex Computer Use.app/
                    ├── Contents/MacOS/
                    │   └── SkyComputerUseService   ← Service 二进制（2026-09-07 本机 ~/.codex/computer-use/ 复核补全）
                    └── Contents/SharedSupport/
                        └── SkyComputerUseClient.app/
                            └── Contents/MacOS/
                                └── SkyComputerUseClient
```

`.mcp.json` 的核心内容就一件事——把 `computer-use` 这个 MCP server 的 `command` 指向 bundle 里的 native 可执行文件：

```json
{
  "mcpServers": {
    "computer-use": {
      "command": "./Codex Computer Use.app/.../SkyComputerUseClient",
      "args": ["mcp"]
    }
  }
}
```

[openai/codex#18258](https://github.com/openai/codex/issues/18258) 里给出的注册名是 `com.openai.sky.CUAService`（launchd/XPC 注册标识），与本机实测看到的 `SkyComputerUseService` 二进制是"注册名 vs 可执行文件"的关系——两者指向同一个 Service，issue 记录的是系统注册层，本机 listing 补的是文件系统层。

### 一个排查小坑：两种 plugins 目录

实际翻 bundle 时很容易先撞见 `Contents/PlugIns/CodexDockTilePlugin.docktileplugin` 然后困惑"怎么只有这个"。这是 **macOS 系统级 Plugin Bundle**（Dock 图标交互用），与 Codex 的 agent plugin 完全不是一回事：

```text
Contents/PlugIns/              ← macOS 系统 plugin 机制（DockTile 等）
Contents/Resources/plugins/    ← Codex 自己的 agent plugin marketplace
```

同名不同层，找 Computer Use 要去后者。

## 二、完整调用链与分发链

![Codex Computer Use 调用链与 bundled plugin 分发链|760](../../../asset/codex-computer-use-callchain-2026-09-05.svg)

配置层调用链（静态证据，未做运行时触发验证）：Codex Agent（bundled CLI）→ computer-use plugin → MCP → `SkyComputerUseClient`（MCP server）→ `SkyComputerUseService` → macOS Accessibility / Screen Capture / 键鼠输入 / App discovery。这条链目前的证据全是文件位置与 `.mcp.json` 里的 `command` 字段指向，还没有一次真实触发的运行时观测（进程树、日志时间线等）来坐实每一跳。至少 **Computer Use 这条能力完全经 native helper 完成**（Codex 自身代码是否还有其他桌面操作路径未排查），CLI 是通过 MCP 协议调用它。

分发链上还有一层容易忽略的机制：App bundle 里的 plugin 不是原地运行的，Codex 启动时有一套 **bundled plugin marketplace reconciliation**——把 bundle 内 payload 安装到 `~/.codex/plugins/cache/openai-bundled/computer-use/<version>/`，实际 runtime 落在 `~/.codex/computer-use/` 下。本机实测（2026-09-07）验证了这条落地路径确实存在：

```text
~/.codex/computer-use/
├── Codex Computer Use.app/
│   └── Contents/
│       ├── MacOS/
│       │   └── SkyComputerUseService
│       └── SharedSupport/
│           └── SkyComputerUseClient.app/
│               └── Contents/MacOS/SkyComputerUseClient
└── config.json

~/.codex/plugins/cache/openai-bundled/
├── browser/
├── chrome/
├── codex-app-tools/
├── computer-use/
├── latex/
├── unified-computer-use/
└── visualize/
```

reconcile 是否落地会因机器/渠道而异：[openai/codex#26451](https://github.com/openai/codex/issues/26451) 记录的其实是一台**跳过** computer-use 的机器——cache 里只有 browser/chrome，日志里是 `bundled_plugin_install_skipped_missing` 事件——可作反例对照，不能反过来当"安装成功"的证据。所以"Computer Use 在哪"有两个答案：**分发态在 App bundle 里，运行态（若 reconcile 落地）在用户目录里**，本机属于后一种。

## 三、三个进一步的证据

- **payload 随架构走**：[openai/codex#31160](https://github.com/openai/codex/issues/31160) 对比发现 Intel x64 构建的 App bundle 里**根本没有** computer-use plugin 和 SkyComputerUse 组件，Apple Silicon 构建才有，且 helper 是 Mach-O arm64 而非 universal binary——Computer Use 不是被 flag 关掉了，是文件根本不在包里。本机实测（2026-09-07，`codex features list 2>&1 | grep -i computer`）输出 `computer_use stable true`——这条与 #31160 的运行日志分属两类证据，`stable true` 同样不代表 runtime 在场：**feature flag ≠ payload**。
- **bundled CLI 可以手动"补挂"**：公开 issue 记录过 workaround——用 bundle 内 CLI 执行 `plugin marketplace add .../openai-bundled` 再 `plugin add computer-use@openai-bundled`，CLI 侧也能出现 Computer Use。这印证了能力的载体是 plugin payload（payload 仍来自 App bundle 内，只是换了个 CLI 进程去加载它），而非取决于用哪个 CLI 进程去加载它；也正因如此，社区有 "first-class Computer Use support from the Codex CLI" 的 feature request。
- **权限与签名（推测，未直接验证）**：`SkyComputerUseClient` 从 Codex.app 进程树之外启动会因 code signature / launch context 问题失败，这一点三个引用 issue 都没有直接描述，本机也没有做过对照测试，推测与 macOS TCC 的 responsible-process 归因链有关——App Bundle + native helper + 签名 + macOS TCC 权限（屏幕录制、辅助功能）+ 进程树可能是紧密耦合的，但目前只是推测，不是"不可拆的整体"这样的定论。这个方向如果成立，可以解释为什么 standalone CLI 和 bundled CLI 即使 `--version` 完全相同，能力也不一定相同（系列03 的"同源不同发行版"在能力层的表现）。

## 四、修正后的心智模型

把两条链合起来，"App = CLI 的 GUI"这个旧模型可以正式作废，换成：

```text
                Codex Desktop（.app bundle = runtime distribution）
                        │
        ┌───────────────┼────────────────┐
        ↓               ↓                ↓
   Desktop UI       bundled CLI     bundled plugins
  （ChatGPT 壳）   （agent 引擎）        │
                                ┌───────┼────────────┐
                                ↓       ↓            ↓
                             browser  chrome    computer-use
                                                     │
                                                     ↓
                                        SkyComputerUseClient/Service
                                                     │
                                                     ↓
                                                  macOS
```

**App Bundle 本身就是一个 runtime distribution**：UI 壳、agent 引擎、能力 payload 三者版本独立、能力独立，只是被 Apple 的 Bundle 机制捆成一个"文件"分发（三版本号的完整论证见 [[Codex Desktop系列03：bundled的真正含义与三版本号——Apple Bundle概念、同源不同发行版与com.openai.codex血缘]]）。这个视角下，系列各篇的结论可以统一起来：

- 系列01 的 **schema 版本锁定**——锁的是三元组合里 bundled CLI 那一元的版本；
- 系列六（Computer Use与Browser Use）的 **CLI 与 App 能力分界**——分界线就是 bundled plugins 这一元在不在场；
- [[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]] 的路线之争——Codex 把 harness 的能力扩展做成了 bundle 内 payload，随第一方 App 分发而不随开源 CLI 分发，这是第一方绑定在**分发层**的形态（模型层、工具声明层、治理层之外的又一层）。

## 小结

1. **Computer Use 是 bundled plugin + native helper，不是 CLI 功能**：分发态在 `Resources/plugins/openai-bundled/plugins/computer-use/`，运行态 reconcile 到 `~/.codex/`，桌面操作由 SkyComputerUseClient/Service 通过 MCP 提供。
2. **feature flag ≠ payload**：`computer_use stable true` 不代表 runtime 在场，Intel 构建就根本不带这套文件。
3. **签名/权限/进程树可能是耦合的（推测，未直接验证）**：推测 native helper 离开 App 进程树可能起不来——若成立，能力绑定在 App 环境而非 CLI 版本；三个引用 issue 与本机实测都未直接验证这个故障模式。
4. **`Contents/PlugIns/` 与 `Contents/Resources/plugins/` 是两套机制**：前者是 macOS 系统 plugin，后者才是 Codex agent plugin marketplace。

下一步可挖的方向：把 computer-use plugin 从 `plugin.json` → `.mcp.json` → `skills/` → `SkyComputerUseClient` 完整逆向一遍，画出 Codex Computer Use 的内部架构图——与 Orca 补位方案（[[Orca使用笔记二——Computer Use桌面控制与Codex CLI补位实践]]）做同层对比。

## 参考

- [原始讨论（ChatGPT share）](https://chatgpt.com/share/6a9b8f60-340c-83ec-b92f-99f80ef6ab2e)
- [openai/codex#18258 — App bundle 内 openai-bundled/computer-use plugin 目录报告](https://github.com/openai/codex/issues/18258)
- [openai/codex#26451 — computer-use plugin 内部结构与 bundled marketplace reconciliation 日志](https://github.com/openai/codex/issues/26451)
- [openai/codex#31160 — Intel x64 与 Apple Silicon 构建的 Computer Use payload 差异](https://github.com/openai/codex/issues/31160)
- 相关笔记：[[Codex Desktop系列03：bundled的真正含义与三版本号——Apple Bundle概念、同源不同发行版与com.openai.codex血缘]]｜[[Computer Use与Browser Use系列六：Codex CLI与App的能力分界——同一套Skill、两条调用链与第三方生态补位]]｜[[Orca使用笔记二——Computer Use桌面控制与Codex CLI补位实践]]
