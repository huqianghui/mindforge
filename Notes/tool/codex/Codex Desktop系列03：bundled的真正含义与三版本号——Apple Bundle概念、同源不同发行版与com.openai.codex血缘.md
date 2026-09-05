---
title: Codex Desktop系列03：bundled的真正含义与三版本号——Apple Bundle概念、同源不同发行版与com.openai.codex血缘
created: 2026-09-05
tags:
  - AI
  - agent
  - codex
  - macos
  - bundle
  - harness
---

# Codex Desktop 系列03：bundled 的真正含义与三版本号——Apple Bundle 概念、同源不同发行版与 com.openai.codex 血缘

> 系列导航：[系列01：接入 Azure GPT-6](Codex%20Desktop系列01：接入Azure%20OpenAI%20GPT-6——bundled%20CLI版本锁定、model%20catalog%20schema与分层排错.md) ｜ [系列02：mini 与三条暗线](Codex%20Desktop系列02：gpt-5.4-mini与三条暗线——全局配置菜单、退休元数据与自动审批调用链.md) ｜ 本篇 ｜ [系列04：Computer Use 藏身之处](Codex%20Desktop系列04：Computer%20Use藏身之处——openai-bundled%20plugin、SkyComputerUse%20native%20helper与分发链.md) ｜ [系列05：模型条目装下整个 harness](Codex%20Desktop系列05：一个模型条目装下整个harness——从gpt-6-astra展开配置看Model与Harness的真实边界.md) ｜ [系列06：ModelInfo 字段值手册](Codex%20Desktop系列06：ModelInfo字段值手册——unified_exec、code_mode、Ultra档与治理字段的源码级解读.md)

> 素材来源：2026-09-05 与 ChatGPT 的讨论（[原始对话](https://chatgpt.com/share/6a9b8f60-340c-83ec-b92f-99f80ef6ab2e)）。系列01/02 里反复出现 "bundled CLI" 这个词，这一篇把它彻底吃透——bundle 是什么、三个版本号为什么并存、以及 ChatGPT.app 这个名字底下藏着的真实血缘。

## 引言：一个组合公式

先给结论。理解 Codex Desktop 的正确心智模型不是"CLI 包了个 GUI"，而是一个三元组合：

```text
Codex Desktop App
  = ChatGPT app（Desktop UI 壳）
  + bundled Codex CLI（agent 引擎）
  + bundled plugins（browser / chrome / computer-use 等 runtime payload）
```

三个部分各有自己的版本与能力边界，装在同一个 `.app` bundle 里一起分发。系列01 的 model catalog schema 要看 bundled CLI 版本、[[Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链]] 里 Computer Use 只在 App 里有，都是这个公式的推论。而要真正看懂这个公式，先要看懂 `bundle` 这个词在 Apple 体系里的分量。

## 一、Bundle 不是随口的"打包"，是 Apple 的正式架构概念

macOS 语境下的 bundle（/ˈbʌndəl/）有 Apple 官方的精确定义：

> A bundle is a directory that the system presents to people as a single file.

**Bundle 本质是一个目录，Finder 把它伪装成一个文件。** `/Applications/ChatGPT.app` 在 Finder 里是一个"文件"，实际上是：

```text
ChatGPT.app/
└── Contents/
    ├── Info.plist          ← CFBundleIdentifier / CFBundleVersion 等元数据
    ├── MacOS/              ← 主可执行文件
    ├── Frameworks/         ← bundled frameworks
    ├── PlugIns/            ← macOS 系统级 plugin（注意：与 agent plugin 不是一回事）
    └── Resources/          ← bundled resources
```

由此派生的整个词族——`bundled framework`、`bundled resource`、`bundled executable`、`CFBundle*` API——都指向同一个概念：**被放进某个自包含软件组件目录里、随主体一起分发的代码或资源**。App、Framework、Plugin、App Extension 在 Apple 眼里都是 Bundle，Bundle 里还能套 Bundle——它是一个软件组件组织模型。

为什么 Windows 和开源技术栈少见这个词？不是没有对应概念，而是选择了不同抽象：Windows 的核心分发单位是 **Package**（MSIX/APPX + Manifest + Package Identity），Unix/Linux 的传统哲学是"文件系统本身就是应用组织结构"（`/usr/bin`、`/usr/lib`、`/usr/share` 分散放置），包管理生态自然长出 package/module/crate/image 这些词。粗略的心智对照：

| 维度 | macOS / Apple | Windows / 开源 |
|---|---|---|
| 核心抽象 | Bundle（自包含目录单元） | Package（分发/安装/依赖单元） |
| 典型形态 | `.app` / `.framework` / `.appex` | MSIX / deb / npm package / Docker image |
| 元数据 | `Info.plist` | Manifest |
| 组织哲学 | 应用相关的东西收进一个目录 | 按文件系统惯例分散放置 |

一句话区分：**Bundle 偏"应用内部的组织形式"，Package 偏"分发与安装单位"**。有意思的是两边在互相渗透——Windows 也有了 `.msixbundle`，而 macOS 的 App Store 分发也带 package 属性。

## 二、bundled CLI ≠ 终端里的 codex：三个版本号并存

组合公式的第一个直接推论：一台 Mac 上可能同时存在**三个互相独立的版本号**——

```text
ChatGPT / Codex Desktop
        │
        ├── App version:      26.901.x        ← Desktop UI 壳的版本
        │
        ├── bundled CLI:      codex-cli 0.153.1   ← App bundle 内携带的引擎
        │       （/Applications/ChatGPT.app/Contents/Resources/codex）
        │
        └── terminal CLI:     codex-cli 0.153.4   ← Homebrew/npm 另装的
                （/opt/homebrew/bin/codex 等）
```

三者互不等价（表中两个 CLI 版本为 2026-09-05 本机实测值）。Desktop 真正启动的是 bundle 内那个二进制，所以系列01 的 `model_catalog_json` schema 兼容性要看 **bundled CLI** 的版本——终端里 `codex --version` 的结果可能比它新几个 patch，照着它去拿 schema 就会错位。这也是为什么 openai/codex 的 issue 模板要求同时报告 `Codex App: 26.xxx` 和 `Bundled CLI: 0.xxx` 两个字段（如 [openai/codex#38934](https://github.com/openai/codex/issues/38934) 的案例）。

排查任何 Desktop 行为时的第一习惯：**版本问 bundle 内的二进制**——

```bash
/Applications/ChatGPT.app/Contents/Resources/codex --version
```

### 同源，但不是同一个发行版

一个自然的追问：除了版本独立，bundled CLI 和独立安装的 CLI 源码、功能是不是完全一样？答案要分两层：**源码层面基本是同一个 [openai/codex](https://github.com/openai/codex) 开源项目；运行时/发行版层面不能视为等同**。

Desktop 打包的是一个**与该 App 版本配套测试过的固定 build**——OpenAI maintainer 的公开说法是 "Desktop app contains a bundled version of the CLI that has been tested specifically with that version of the app"，让 Desktop 换用其他 CLI binary 官方明确不推荐。公开 issue 里同一台机器出现过 standalone `0.147.0` 与 bundled `0.147.0-alpha.6.5` 并存的案例——同一个源码项目、两条发行通道、两个 build。

功能上也不能说 100% 一样。CLI binary 的核心 agent 能力高度重合，但 Desktop 在 binary 之外额外提供了 App integration、bundled plugins、native helpers、Desktop IPC 这一层。把"相同程度"按层拆开：

| 层次 | 是否一样 |
|---|---|
| GitHub 源码项目 | ✅ 基本相同 |
| Codex Agent 核心逻辑 | ✅ 高度相同 |
| CLI binary / 配置 schema | ⚠️ 同一项目的不同 build，跟版本走 |
| bundled plugins / Computer Use runtime | ❌ Desktop 专属 |
| Desktop IPC / 签名 / entitlement / 进程树 | ❌ 不一样 |

有一个公开 issue 把这条边界钉死了：**同一份 computer-use plugin cache，Homebrew standalone CLI 下不可用，App-bundled CLI 可以工作**——差异出在 macOS process authentication / Apple Events 这类 App 环境层，而不是 CLI 代码本身（展开见 [[Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链]]）。所以不要把 `Contents/Resources/codex` 理解成"另一个 Codex"：它就是 Codex CLI 的一个特定配套 build，被当作 dependency bundled 进 App；Desktop 的额外能力长在 build 之外的那一层。

## 三、血缘与开源边界：ChatGPT.app 是 Codex Desktop 演化来的

组合公式里"ChatGPT app 壳"这一元还值得再追问一层：它和还在维护的 **ChatGPT Classic** 是一个东西吗？为什么它没有开源代码？

答案先说结论：**不是一个东西，且血缘方向和名字暗示的相反——新 ChatGPT.app 不是 Classic 加了个 Codex，而是 Codex Desktop 演化/扩展出来的统一 Desktop Shell**。

- **产品关系**：OpenAI 官方口径是 ChatGPT Classic = 上一代 ChatGPT 桌面客户端（继续独立维护、有自己的更新与 Enterprise 能力），新 ChatGPT.app = Chat + Work + Codex 的统一应用；原 Codex App 用户升级后直接变成 ChatGPT.app，Codex chats/projects 全部保留，且 "new agent features may be available only in the new app"。
- **血缘证据**：`codesign -dv --verbose=4 /Applications/ChatGPT.app` 可以看到，这个名叫 ChatGPT 的 app，bundle identifier 仍然是 **`com.openai.codex`**——软件工程血缘上它就是原 Codex Desktop 的延续，改名合并了 Chat/Work 形态，而不是把两个 `.app` 拼起来。
- **开源边界**：整个 bundle 里只有 Codex CLI 这一元对应开源仓库 openai/codex；ChatGPT/Work 客户端部分和 SkyComputerUse native helper 都是 proprietary，没有 `openai/chatgpt` 这样的公开 repo 可对源码。

把三个名字的关系画清楚：

```text
ChatGPT Classic        ← 上一代 proprietary ChatGPT 桌面客户端（维护型）
ChatGPT.app            ← 新一代 proprietary Desktop Shell（主线）
  ├── ChatGPT / Work        （proprietary，无公开源码）
  └── Codex
       ├── bundled Codex CLI（开源，openai/codex 的配套 build）
       └── bundled Computer Use（proprietary native runtime）
codex CLI（独立安装）   ← openai/codex 开源项目的 standalone 发行版
```

这一层也让组合公式更精确：三元组合里，**开源的只有中间那一元（CLI），且只是它的一个特定 build；壳与能力 payload 都是专有的**。所谓"Codex Desktop"在文件系统里根本没有以自己名字存在——它是 `com.openai.codex` 这个 bundle 顶着 ChatGPT 的名字活着。

## 小结

1. **Bundle 是 Apple 的软件组件组织模型**：目录伪装成文件、自包含分发；与 Windows/开源的 Package 是两种哲学——前者管"应用内部组织"，后者管"分发安装单位"。
2. **Codex Desktop = ChatGPT app 壳 + bundled CLI + bundled plugins**，三个版本号互相独立；排查 Desktop 行为一律以 `Contents/Resources/codex --version` 为准。
3. **bundled CLI 与 standalone CLI 同源不同发行版**：同一个 openai/codex 项目、两条发行通道、配套测试的不同 build；能力差异出在 build 之外的 App 环境层（签名/Apple Events/进程树）。
4. **ChatGPT.app 的血缘是 Codex Desktop**：bundle identifier 仍为 `com.openai.codex`，新 app 是 Codex Desktop 演化出的统一壳（Chat + Work + Codex）；三元组合里只有 CLI 一元开源，壳与 Computer Use payload 均为 proprietary。

组合公式的第三元——bundled plugins——里藏着最值得解剖的一块：Computer Use 到底在哪、怎么被调起来，见 [[Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链]]。

## 参考

- [原始讨论（ChatGPT share）](https://chatgpt.com/share/6a9b8f60-340c-83ec-b92f-99f80ef6ab2e)
- [Apple Developer 文档：Bundles and packages](https://developer.apple.com/documentation/foundation/bundles_and_packages)
- [openai/codex 仓库](https://github.com/openai/codex)
- [openai/codex#38934 — App version 与 Bundled CLI version 的区分](https://github.com/openai/codex/issues/38934)
- 相关笔记：[[Codex Desktop系列01：接入Azure OpenAI GPT-6——bundled CLI版本锁定、model catalog schema与分层排错]]｜[[Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链]]｜[[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]]
