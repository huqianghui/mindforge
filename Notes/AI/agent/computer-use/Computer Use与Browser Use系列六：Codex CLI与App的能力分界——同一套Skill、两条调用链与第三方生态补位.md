---
title: Computer Use与Browser Use系列六：Codex CLI与App的能力分界——同一套Skill、两条调用链与第三方生态补位
created: 2026-08-29
tags:
  - AI
  - Agent
  - Computer-Use
  - Browser-Use
  - Codex
  - Orca
  - Skill
  - Runtime
---

# Computer Use与Browser Use系列六：Codex CLI与App的能力分界——同一套Skill、两条调用链与第三方生态补位

> 系列导航：[系列一：概念与产品形态](Computer%20Use与Browser%20Use系列一：概念与产品形态——从包含关系到四种浏览器形态与认证三链路.md) ｜ [系列二：Codex 浏览器运行时解剖](Computer%20Use与Browser%20Use系列二：Codex浏览器运行时解剖——从bundled%20plugin看Agent浏览器控制的工程设计.md) ｜ [系列三：自己实现](Computer%20Use与Browser%20Use系列三：自己实现——action%20loop协议、双执行器路线与跨平台adapter矩阵.md) ｜ [系列四：产品化](Computer%20Use与Browser%20Use系列四：产品化——可审计智能RPA、Extension-Plugin-WebMCP三层选型与安全设计.md) ｜ [系列五：最佳实践](Computer%20Use与Browser%20Use系列五：最佳实践与日常使用习惯——场景路由表、内容获取链路与实战经验.md) ｜ 本篇

## 引言：一次"CLI 里居然能用 Computer Use"的意外

前五篇的语境基本默认：Computer Use 和 Browser Use 是 Codex **桌面 App** 的能力，CLI 没有。这次实测推翻了一半——在 Codex CLI 会话里说"使用 Computer Use 打开网易云音乐，播放王菲的《金刚经》"，任务真的完成了：Agent 枚举窗口、截图、读取 Accessibility Tree、点击搜索、播放成功。但紧接着测 `@Browser` 和 `@Chrome`，两者都失败。

同一个 CLI，为什么 Computer Use 通了、Browser Use 不通？追下去发现了一个比"能不能用"更有意思的结构：**Codex CLI 和 App 共享同一套 Skill 发现机制，但 Skill 依赖的执行 runtime 两端并不对等**——App 有官方原生后端，CLI 靠第三方工具（本例中是 Orca）补位，而浏览器能力恰好是没有第三方补位的那一块。

本篇把这次实测拆成四个问题：两端能力矩阵到底什么样、"同一套 Skill 两条调用链"在底层如何成立、两个 Computer Use 后端的接口差异有多大、以及 OpenAI 为什么不直接给 CLI 开放原生接口。

## 一、能力矩阵：App 与 CLI 的真实分界

先给修正后的结论表——"修正"是因为第一版答案把 CLI 的 Computer Use 写成了 ❌，实测证明这个 ❌ 需要加限定词：

| 能力                             | Codex App   | Codex CLI        | 备注                        |
| ------------------------------ | ----------- | ---------------- | ------------------------- |
| 文件编辑、Shell、Git、Skills、MCP      | ✅           | ✅                | 核心 Agent 能力两端相近           |
| Computer Use（桌面 GUI 控制）        | ✅ 原生 plugin | ⚠️ 无原生，可由第三方后端补位 | 本机经 Orca 实测通过             |
| Browser Use / 内置浏览器 `@Browser` | ✅           | ❌                | Skill 可见但 runtime 缺失，实测失败 |
| Chrome Extension `@Chrome`     | ✅           | ❌                | 同上，需 App 会话 + 扩展连接        |
| Playwright 浏览器自动化              | 可用          | ✅                | CLI 侧浏览器自动化的实际出路          |
| Web Search                     | ✅           | ✅（视配置）           |                           |

两端的产品定位差异决定了这张表的形状：

- **Codex CLI** 运行在终端里，容易组合进 SSH、CI、管道和非交互式任务，但没有 GUI 宿主——不承载内置浏览器，也不直接控制桌面窗口
- **Codex App** 是图形化工作台，原生承载 Computer Use、内置浏览器和 Chrome 扩展，适合"看见页面、点击界面、操作已登录网站"的任务

概念层的包含关系（系列一讲过，这里放实测视角的版本）：

```text
Computer Use（广义 GUI 操作能力）
├── 桌面应用：Obsidian、网易云音乐、系统设置等
└── 浏览器操作（Browser Use）
    ├── @Browser：App 内置的隔离浏览器
    └── @Chrome：通过扩展连接真实 Chrome profile
```

关键修正：**"CLI 不支持 Computer Use"这句话仅凭官方能力表成立，仅凭实际环境不成立**。准确表述是——CLI 无官方原生 Computer Use，但环境里若装了外接执行后端（如 Orca），链路照样能通。这正是本篇的主线。

## 二、底层结构：Skill 是说明书，Runtime 才是手脚

### 2.1 为什么 CLI 里能看到 App 的 Skill 却用不了

追查两端差异时发现一个反直觉的事实：**Codex CLI 里能读到 App 的 bundled Computer Use Skill 文件**（缓存在 `~/.codex/plugins/cache/openai-bundled/computer-use/<version>/` 下），但完全无法执行它。

原因在于 OpenAI 插件体系的设计：

- 插件采用通用插件目录，App 和 CLI **发现同一批插件**
- 插件可以同时包含 Skill、MCP server、connector 等组件
- 但 **Skill 只是"操作说明"，真正执行动作的是宿主运行时注入的 Tool**

bundled Skill 的第一步就暴露了依赖：

```js
globalThis.sky = (await import("@oai/sky")).sky;
```

这行代码要求宿主提供持久化的 `node_repl` 环境和 `@oai/sky` 模块。Codex App 提供，CLI 不提供——于是同一份 Skill 文件，在 App 里是完整能力，在 CLI 里是一纸空文。

> **安装或缓存了 Skill，不代表当前宿主提供了它依赖的运行接口。** 这是理解 Codex 插件生态最重要的一条。

### 2.2 两条调用链

![Codex App 与 CLI 的两条 Computer Use 调用链|700](../../../../asset/codex-cli-app-computeruse-chains-2026-08-29.svg)

```text
Codex App（官方原生）
→ Computer Use plugin（bundled Skill）
→ node_repl + @oai/sky（持久化 runtime）
→ Computer Use Helper + App 审批 UI
→ macOS Accessibility 与截图能力
```

```text
Codex CLI（第三方补位）
→ computer-use skill（Orca discovery stub）
→ orca computer CLI（Shell 逐次调用）
→ Orca Helper（持有 macOS 权限）
→ macOS Accessibility 与截图能力
```

两条链在最底层汇合——都是 macOS 的 Accessibility Tree、截图和输入事件；在最顶层也一致——都遵循同一个 action loop（系列三的主题）：

```text
观察界面 → 模型判断下一步 → 执行点击/输入 → 再次观察验证
```

不同的是中间两层：**执行引擎、调用协议、权限系统和功能边界全部不同**。逐层对比：

| 层面 | Codex App | Codex CLI（Orca 补位） |
|---|---|---|
| 执行后端 | OpenAI 内置 Computer Use plugin | Orca Computer Use provider |
| 调用方式 | `@Computer-Use` → `@oai/sky` App 内部服务 | Skill → `orca computer ...` |
| 观察界面 | 截图 + Accessibility Tree | 相同 |
| 执行动作 | 点击、输入、滚动等原生接口 | Orca CLI 发出对应操作 |
| 权限管理 | Codex App 设置与审批界面 | Orca Helper 持有的 macOS 权限 |
| 浏览器集成 | 原生 `@Browser` / `@Chrome` | 无对等集成 |
| 能力与稳定性 | 官方整合 | 取决于 Orca 版本与运行状态 |

权限一行值得展开：App 链路里，屏幕录制和辅助功能权限授予 **Codex App 自己**，危险操作审批走 App 的 UI；CLI 链路里，这些 macOS 权限授予的是 **Orca Helper**——Codex CLI 本身从头到尾没碰系统权限。这意味着两条链的信任边界完全不同：前者信任 OpenAI 的审批策略，后者信任第三方工具的权限持有。

## 三、接口对比：两个同名 Skill 的解剖

本机恰好同时存在两个 `name: computer-use` 的 Skill 文件——OpenAI bundled 版（App 用）和 Orca 版（CLI 用）。逐项对比它们，能看清两种后端的设计哲学差异：

| 对比项 | OpenAI bundled skill | Orca skill |
|---|---|---|
| 文件长度 | 198 行 | 75 行 |
| 定位 | 完整执行说明 | discovery stub（入口文件） |
| 执行后端 | `@oai/sky` | `orca computer` |
| 调用环境 | 持久化 `node_repl` | Shell 中执行 Orca CLI |
| 返回形式 | JavaScript 对象 | JSON 命令输出 + 截图文件路径 |
| 状态管理 | `node_repl` 会话内保持状态 | Orca runtime + 每次 CLI 调用 |
| 安全规则 | 完整的分类确认策略 | stub 中只有简要限制 |
| 版本管理 | 插件目录固定版本 | 运行时动态返回与二进制匹配的文档 |

### 3.1 OpenAI bundled skill：文档即完整 API

所有操作通过持久化 `node_repl` 里的 `sky` 对象：

```js
await sky.get_app_state(...)   // 返回 Accessibility Tree + 截图
await sky.click(...)
await sky.set_value(...)
await sky.press_key(...)
```

几个设计细节体现了官方整合的深度：

- 默认强调**重新观察后再使用新的 `element_index`**（防止陈旧索引点错元素）
- 可以自动启动目标应用
- `paste()` 会临时借用剪贴板、用完恢复原内容
- 包含非常详细的风险确认规则：删除、发送消息、上传文件、交易、登录、修改系统设置等都要停下来确认
- 明确规定：除非用户特别要求，**不要混用 AppleScript、`osascript`、JXA 等其他 GUI 技术**——保证操作全部走可审计的同一条链

### 3.2 Orca skill：刻意做短的 discovery stub

Orca 的 SKILL.md 自我声明"This file is a discovery stub, not the usage guide"——它只负责两件事：定位 Orca 可执行文件、告诉 Agent 用 `orca skills get computer-use` 动态拉取真实手册。实际调用形式：

```bash
orca status --json
orca computer capabilities --json
orca computer list-apps --json
orca computer get-app-state --app <app> --json
orca computer click --app <app> --element-index 42 --json
```

stub 设计的动机很清楚：**避免静态说明与 Orca 二进制版本脱节**。真实操作手册由当前安装的 Orca 动态返回，天然版本对齐；代价是 Agent 需要额外处理 runtime 状态探测、应用/窗口选择和结构化错误。这与系列二讲的 `browser.documentation()` 按需加载是同一个思路（progressive disclosure），只是把"文档源"从 plugin 内挪到了二进制里。

### 3.3 操作能力高度对应

两套接口的动作原语几乎一一映射——毕竟底层都是 macOS 的同一套能力：

| `@oai/sky` | Orca CLI |
|---|---|
| `list_apps()` | `orca computer list-apps` |
| `get_app_state()` | `orca computer get-app-state` |
| `click()` | `orca computer click` |
| `set_value()` | `orca computer set-value` |
| `press_key()` | `orca computer press-key` |
| `scroll()` | `orca computer scroll` |
| `drag()` | `orca computer drag` |

### 3.4 同名冲突与路由的真实机制

两个 Skill 的 frontmatter 都声明 `name: computer-use`，环境里实际存在两个同名 Skill。这次任务之所以最终走 Orca，不是什么智能路由，而是**排除法**：当前会话有可执行的 `orca`，但没有 bundled skill 要求的 `node_repl`。换句话说，**Skill 路由的隐式裁决者是 runtime 可用性**——这既是当前机制的务实之处，也是潜在的歧义来源（如果未来两个 runtime 同时可用，行为未定义）。

## 四、实测记录：Orca 补位的成色与毛边

"播放王菲的《金刚经》"这个任务里，界面识别、截图、点击全部由 Orca 完成，但有一处毛边值得记录：**网易云音乐窗口拒绝获得键盘焦点，Agent 额外用了一次 `osascript` 激活窗口**，最后再由 Orca 截图确认播放成功。

这个细节说明两点：

1. 第三方补位链路**能用但不等价**——App 原生链路的 bundled skill 明确禁止混用 `osascript`（保证审计一致性），而 CLI 链路里 Agent 可以自由组合 Shell 工具救场。灵活性和可审计性此消彼长，正是系列四讲的产品化取舍在两条链上的现实投影
2. 窗口焦点是桌面 GUI 自动化的经典暗坑（系列三的 adapter 矩阵里提过），任何执行后端都躲不掉

另一个认知修正与 Orca 本身有关。此前的记录里（[Orca 使用笔记](../../../tool/notes/Orca使用笔记——多Agent编排IDE与Mobile跨网络远程互动.md)），Orca 的定位是 iPhone—Mac 连接器：手机远程发指令、Mac 上的 CLI Agent 执行、结果回传。这次实测确认 **Computer Use provider 是 Orca 的另一条独立能力线**：

```text
Orca
├── Mobile Companion
│   └── iPhone → Mac → CLI Agent
└── Computer Use provider
    └── 截图、Accessibility Tree、点击、输入、滚动、拖动
```

旧笔记里其实早就出现过 `snapshot`、`click`、`fill` 这些命令，只是当时没有把它们识别为"通用 Computer Use 后端"。工具的能力边界经常大于第一次使用时的心智模型——这也算 PKC 语境下"知识需要多轮 pass 才编译完整"的一个注脚。

### Browser Use 为什么没有被补位

`@Browser` 和 `@Chrome` 在 CLI 里的失败方式一致：Skill 已加载，但它们依赖的 Browser runtime（同样是 `node_repl` 承载）未在会话中注入。而 Orca 补齐的只是**桌面 GUI 这一层**——它没有实现 Codex 的 browser binding 协议（系列二），也无法替代 Chrome extension 的接管链路。所以 CLI 侧的浏览器自动化，现实出路仍是 Playwright 另起炉灶：能覆盖"打开页面、点击、断言"，但拿不到 `@Chrome` 的真实登录态复用（系列五场景路由表里 `@Chrome` 一行在 CLI 侧没有等价物）。

### 卸载 Orca 之后还剩什么

把依赖关系推到边界：如果卸载 Orca 且不装替代后端，当前 CLI 就无法进行通用 macOS Computer Use——不能枚举窗口、不能读 Accessibility Tree、不能截图点击。但"补位"这个位置本身是开放的，可选项包括：

- 其他 Computer Use MCP server
- Playwright——仅浏览器自动化，不是完整桌面控制
- AppleScript/JXA——有限的 macOS 应用自动化
- 自建执行后端（系列三的路线：Accessibility API + 截图 + 输入事件）
- 未来 OpenAI 向 CLI 开放 `@oai/sky` runtime

准确结论：**Codex CLI 目前没有原生通用 Computer Use；Orca 是这个环境中恰好补齐该能力的执行后端，而非唯一解。**

## 五、为什么 OpenAI 不给 CLI 开放同一接口

官方没有解释设计决策，但从产品边界可以做合理推断：

- **宿主生命周期**：Codex App 长期运行，有 GUI 宿主和 Helper 生命周期管理；CLI 进程随任务启停，承载不了持久 runtime
- **权限与审批**：App 能集中管理屏幕录制、Accessibility、应用白名单和危险操作审批 UI；给普通终端进程直接开放全桌面控制，安全边界会显著扩大
- **运行环境假设**：CLI 经常跑在 SSH、CI、容器或无桌面环境里——那里根本没有"桌面"可控
- **配套能力的 GUI 依赖**：`@Browser`、Chrome Extension、Computer History 等都依赖 App 的图形界面

所以当前格局的准确描述是：

> Skill 已经可以共享，但 `@oai/sky` 所依赖的 Computer Use runtime 尚未作为通用 CLI 接口提供。

理论上未来只要 OpenAI 向 CLI 注册同样的 `node_repl`/`@oai/sky` 后端，两个入口就能用同一套 Skill——插件体系的架构已经为此留好了位置。但官方文档目前只承诺桌面 App 的原生支持。在那之前，CLI 侧的 Computer Use 就是第三方生态的补位空间，Orca 是其中一个已经跑通的实例。

## 小结

1. **能力分界的真实形状**：App 与 CLI 共享核心 Agent 能力；Computer Use 在 App 是原生、在 CLI 是"无原生但可补位"；Browser Use（`@Browser`/`@Chrome`）目前是 App 独占，CLI 无人补位
2. **Skill ≠ 能力**：插件目录两端共享，Skill 文件处处可见，但 Skill 只是说明书——宿主没注入它依赖的 runtime（`node_repl` + `@oai/sky`），它就是一纸空文
3. **两条调用链，一个 action loop**：官方链（plugin → sky → Helper → 审批 UI）与补位链（stub skill → orca CLI → Orca Helper）在顶层范式和底层 macOS 能力上一致，在执行引擎、协议、权限持有者上完全不同
4. **接口设计的两种哲学**：bundled skill 把 198 行完整 API 和安全策略写死在文档里（版本随插件走）；Orca 用 75 行 stub + 动态手册（版本随二进制走）——各自解决各自的版本对齐问题
5. **补位有成色也有毛边**：Orca 跑通了桌面控制，但窗口焦点这类暗坑需要 `osascript` 救场——第三方链路"能用"和官方链路"等价"之间隔着权限体系、审批策略和禁用混用的一致性约束

## 参考

- 官方文档：[Codex App](https://developers.openai.com/codex/app) · [Codex CLI](https://developers.openai.com/codex/cli) · [Computer Use](https://developers.openai.com/codex/computer-use) · [Browser](https://developers.openai.com/codex/browser) · [Browser extension](https://developers.openai.com/codex/chrome-extension) · [Plugins](https://developers.openai.com/codex/plugins)
- 本系列：[系列二](Computer%20Use与Browser%20Use系列二：Codex浏览器运行时解剖——从bundled%20plugin看Agent浏览器控制的工程设计.md)（browser binding 协议与 runtime 引导）、[系列三](Computer%20Use与Browser%20Use系列三：自己实现——action%20loop协议、双执行器路线与跨平台adapter矩阵.md)（action loop 与执行后端实现）、[系列四](Computer%20Use与Browser%20Use系列四：产品化——可审计智能RPA、Extension-Plugin-WebMCP三层选型与安全设计.md)（可审计性与安全设计）、[系列五](Computer%20Use与Browser%20Use系列五：最佳实践与日常使用习惯——场景路由表、内容获取链路与实战经验.md)（场景路由表）
- [Orca 使用笔记——多 Agent 编排 IDE 与 Mobile 跨网络远程互动](../../../tool/notes/Orca使用笔记——多Agent编排IDE与Mobile跨网络远程互动.md)
