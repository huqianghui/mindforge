---
title: Orca使用笔记二——Computer Use桌面控制与Codex CLI补位实践
created: 2026-08-29
tags:
  - tool
  - ai-agent
  - computer-use
  - Orca
  - Codex
  - desktop-automation
---

# Orca 使用笔记二——Computer Use 桌面控制与 Codex CLI 补位实践

> 本文依据当前安装的 Orca 运行时通过 `orca skills get computer-use` 返回的动态手册整理。Orca 的命令面会随版本变化，实际操作前应重新读取动态手册，不要凭旧笔记猜测 subcommand 或 flag。

## 一、这项能力解决什么问题

Orca 除了 [[Orca使用笔记——多Agent编排IDE与Mobile跨网络远程互动|多 Agent、worktree 与 Mobile 编排能力]]，还提供一套独立的 **Computer Use provider**。它让终端里的 Agent 可以通过 `orca computer` 检查和操作本机桌面应用：

- 枚举正在运行的应用和窗口
- 获取 Accessibility Tree 与窗口截图
- 按语义元素点击、写入值、执行辅助操作
- 输入文本、按键、组合键和粘贴文本
- 滚动、拖拽，以及在必要时按窗口局部坐标操作
- 在每次动作后返回新状态，供 Agent 继续观察与决策

它最重要的使用场景，是给没有原生桌面控制 runtime 的 Codex CLI 提供执行后端：

```text
Codex CLI
→ Orca computer-use Skill（发现入口）
→ orca computer CLI（动作协议）
→ Orca Helper（权限持有者）
→ macOS / Linux / Windows 的桌面辅助功能与截图能力
```

这不是一次性脚本，而是一个持续的 **action loop**：

```text
观察应用与窗口
→ 读取 Accessibility Tree 和截图
→ 选择最窄、最语义化的动作
→ 执行动作
→ 读取动作返回的新状态
→ 验证结果，再决定下一步
```

核心原则只有一句：**先观察、单步动作、立即复查**。桌面 UI 会随焦点、滚动、导航和异步渲染变化，连续使用旧状态进行多步盲操作，很容易点错对象。

## 二、安装、命令入口与运行状态

### 2.1 安装 Orca

macOS 可以通过 Homebrew 安装 Orca：

```bash
brew install --cask stablyai/orca/orca
```

安装后先启动 Orca 桌面应用。Computer Use 的系统权限由 **Orca Helper** 持有，不是由 Codex CLI 持有；因此终端能运行 `orca`，并不等于 Accessibility 和截图权限已经就绪。

### 2.2 一次会话只选择一个可执行文件

不同环境的 CLI 名称可能不同，开始时选定一次，后续不要混用：

| 环境 | 应使用的命令 |
|---|---|
| `ORCA_CLI_COMMAND` 已设置（常见于 Orca 管理的 WSL session） | 使用该环境变量的实际值 |
| Dev checkout 且存在 `ORCA_DEV_REPO_ROOT` | `orca-dev` |
| Linux、且不在 Orca-managed terminal 内 | `orca-ide` |
| macOS、Windows 或 Orca-managed terminal | `orca` |

Linux 外部终端不要直接运行裸 `orca`——它通常会解析为 GNOME Orca screen reader。本文后续命令以 macOS 常用的 `orca` 为例；若命中了上表其他环境，应把命令名整体替换为已选定的可执行文件，而不是在 Shell 中创建一个名为 `ORCA` 的变量。

### 2.3 每次先读取当前版本手册

```bash
orca skills get computer-use
```

本地 `SKILL.md` 只是 discovery stub，完整用法由当前二进制动态返回。这样可以避免 Skill 缓存与实际 Orca 版本不一致。

### 2.4 Skill 来源、安装与 Agent 注册

Orca App 内含与自身版本匹配的 Computer Use Skill guide/source，但**安装 Orca App 本身，不等于已经为 Codex 或 Claude Code 注册该 Skill**。这里需要区分两个概念：

- **物理文件位置**——本机当前的全局 Skill 实体位于 `~/.agents/skills/computer-use/SKILL.md`，安装元数据位于 `~/.agents/.skill-lock.json`；`~/.codex/skills/` 和 `~/.claude/skills/` 下没有同名 Skill 实体
- **Agent 注册与可发现性**——Codex 能直接发现共享目录 `~/.agents/skills/`，因此可以命中该 Skill；某个 Agent 是否会自动触发它，还取决于安装元数据中是否注册了该 Agent，不能仅根据文件是否被复制到 Agent 私有目录判断

本机运行 `npx skills list --global --json` 的当前结果显示，`computer-use` 的注册对象包含 Codex 等 Agent，但不包含 Claude Code，因此当前 Claude Code 不会自动发现并触发该 Skill。

Claude Code 技术上可以使用同一 Skill，因为它能够执行 Orca CLI。为其注册的准确命令是：

```bash
npx skills add https://github.com/stablyai/orca --skill computer-use --agent claude-code --global
```

注册后需要重启 Claude Code 会话。即使没有安装或注册 Skill，也仍可明确指示 Claude Code 手动执行 `orca computer`；区别是它缺少自动发现入口，以及 Skill 提供的观察顺序、安全约束和错误恢复规范。

### 2.5 状态、启动、能力与权限检查

```bash
orca status --json
orca open --json
orca status --json
orca computer capabilities --json
orca computer permissions --json
```

使用顺序是：先查状态；只有 Orca 未运行时才执行 `open`；再查 `capabilities` 和 `permissions`。若错误明确指出某一项权限，可缩小检查范围：

```bash
orca computer permissions --id accessibility --json
orca computer permissions --id screenshots --json
```

命令只负责检查和打开相应设置流程，系统授权仍应在操作系统的 setup UI 中完成。Agent 驱动调用统一优先使用 `--json`，截图二进制不会塞进 JSON，而会写入 `screenshot.path` 指向的文件。

### 2.6 本机实测基线（2026-08-29）

当前 macOS 环境实测为 Orca `1.4.155`、Computer Use provider `orca-computer-use-macos 1.0.0`，runtime 状态为 `ready`，Accessibility 与截图权限均已授权。provider 当前支持应用和窗口枚举、按窗口 id/index 定位、截图、元素 frame、点击、输入、粘贴、按键、组合键、滚动、拖拽、`set-value` 与辅助 action；当前不支持窗口 focus/move-resize、OCR、annotated screenshot，以及 Dock、菜单栏、菜单和系统 dialog 等独立 surface。

这组结果只是当前机器与当前版本的能力快照，不应写成 Orca 的永久产品承诺。升级版本或切换操作系统后，应重新运行 `capabilities` 与 `permissions`，再决定可用动作。

## 三、从应用到窗口：先锁定正确目标

### 3.1 枚举应用

```bash
orca computer list-apps --json
```

选择器优先级如下：

1. 优先使用 `list-apps` 返回的 bundle ID，例如 `com.microsoft.edgemac`
2. 应用名无歧义时可以用名称，例如 `Spotify`
3. 同名实例无法区分时才使用 `pid:<number>`

```bash
orca computer get-app-state --app com.microsoft.edgemac --json
orca computer get-app-state --app Spotify --json
orca computer get-app-state --app pid:12345 --json
```

`--app` 选择的是**桌面应用**，不是网站名。例如 Gmail 在 Edge 中打开时，目标应是 Edge 的 bundle ID，而不是 `--app Gmail`。

### 3.2 多窗口应用先枚举窗口

```bash
orca computer list-windows --app com.microsoft.edgemac --json
```

窗口标题相似或应用有多个窗口时：

- 列表里的 id 不是 `none`，优先使用 `--window-id <id>`
- 没有可用 id 时，使用 `--window-index <n>`
- 选定后，后续 `get-app-state` 和动作都保持使用同一个窗口选择器，直到目标窗口变化

示例：

```bash
orca computer get-app-state --app com.microsoft.edgemac --window-id <id> --restore-window --json
```

`--restore-window` 适合窗口被最小化、未置前或截图可能被其他窗口遮挡的场景，但不是无限重试按钮。如果已经请求 restore 仍收到 `window_not_focused`，应停止反复 restore，转而检查权限、手动把窗口置前，或改用不依赖键盘焦点的语义操作。

## 四、读状态：Tree 负责语义，Screenshot 负责视觉

```bash
orca computer get-app-state --app <app> --json
```

一次状态通常同时包含：

- Accessibility Tree——识别控件语义、值、frame、可执行 action 和 `element-index`
- Screenshot——确认视觉布局、遮挡和 Tree 未暴露的信息

在 JSON 输出中，Tree 文本和动作索引位于：

```text
result.snapshot.treeText
```

`elementCount` 只是元素数量，**不能用于推导有效索引**。Tree 为减少噪声可能跳过若干节点，因此索引可能是稀疏的；只能使用 `treeText` 中真实显示的数字标签。

### `element-index` 是短生命周期句柄

元素索引会在以下情况后失效：

- 页面导航或应用重新渲染
- 点击、输入或其他 UI-changing action
- 滚动
- 应用焦点或目标窗口变化
- 等待时间较长，界面发生异步更新

因此不要把 `element-index` 当成稳定 selector，也不要把它写进长期脚本。动作返回的新 snapshot 可以直接用于下一步；若返回状态不足，就重新执行 `get-app-state`。

## 五、动作选择：语义操作优先，坐标操作兜底

### 5.1 语义操作

```bash
orca computer click --app <app> --element-index <index> --json
orca computer set-value --app <app> --element-index <index> --value "text" --json
orca computer perform-secondary-action --app <app> --element-index <index> --action <name> --json
```

优先级建议：

1. 文本框暴露 value 时，优先 `set-value`——provider 能读回新值时，可给出 verified value write
2. 按钮、菜单项等控件优先 `click`
3. 只有 Tree 明确列出 secondary action 名称时，才使用 `perform-secondary-action`

不要猜 action 名称。遇到 `action_not_supported`，先检查元素列出的 action，再使用其中之一。

### 5.2 键盘与文本输入

```bash
orca computer type-text --app <app> --text "text" --json
orca computer press-key --app <app> --key Return --json
orca computer hotkey --app <app> --key CmdOrCtrl+A --json
orca computer paste-text --app <app> --text "text" --json
```

- `type-text` 只应在已经聚焦文本框，并确认应用存在 focused text receiver 后使用
- Synthetic keyboard delivery 可能只报告 unverified；动作成功不代表文字一定落入目标字段，必须查看返回状态
- 单键和导航键使用 `press-key`，例如 `Return`、`Escape`、`Tab`、方向键
- 单一修饰组合使用 `hotkey`，跨平台优先写成 `CmdOrCtrl+A`、`CmdOrCtrl+Shift+P`
- Browser-hosted form 的正文输入，在确认焦点后可以优先用 `paste-text`，之后立即检查状态

敏感文字不要直接出现在 shell history 中。POSIX Shell 可以从标准输入传入：

```bash
printf '%s' "$TEXT" | orca computer set-value --app <app> --element-index <index> --value-stdin --json
printf '%s' "$TEXT" | orca computer paste-text --app <app> --text-stdin --json
```

Linux 和 Windows 的动作 payload 仍会经过短生命周期的本地 operation file，因此除非用户明确要求，不应代输密码、token 等秘密。

### 5.3 滚动与拖拽

```bash
orca computer scroll --app <app> --element-index <index> --direction down --json
orca computer drag --app <app> --from-element-index <index> --to-element-index <index> --json
```

能找到语义元素时，优先使用 element frame 或 index。滚动会使旧索引失效，完成后必须读取返回状态或重新 snapshot。

### 5.4 坐标操作与 Screenshot Scale

语义 Tree 过浅、元素没有 actionable frame，或视觉区域根本未暴露语义节点时，可以使用窗口局部坐标：

```bash
orca computer click --app <app> --x 100 --y 100 --json
orca computer scroll --app <app> --x 100 --y 100 --direction down --json
orca computer drag --app <app> --from-x 100 --from-y 100 --to-x 300 --to-y 300 --json
```

这里的坐标不是全屏坐标，而是**当前目标窗口的局部 action coordinates**。如果截图中的 `scale` 不等于 `1`，必须先换算：

```text
action_x = screenshot_pixel_x / screenshot.scale
action_y = screenshot_pixel_y / screenshot.scale
```

坐标必须来自同一个目标窗口的最新状态；窗口移动、缩放、切换或重绘后不能复用。Linux 和 Windows 的截图可能来自目标窗口在可见桌面上的区域，窗口被遮挡时像素不可信，可用 `--restore-window` 后重拍；无法取得焦点时，应更信任 Tree，而不是被遮挡的 screenshot。

如果只需要 Tree，不关心视觉像素，可在观察缓慢或截图失败时添加 `--no-screenshot`。

## 六、可复制的实战流程

下面以“在 Edge 地址栏打开目标页面”为例。每一步都只消费上一步刚返回的新状态，不复用旧索引。

### Step 1：检查 runtime 与能力

```bash
orca status --json
orca computer capabilities --json
orca computer permissions --json
```

### Step 2：找到浏览器与目标窗口

```bash
orca computer list-apps --json
orca computer list-windows --app com.microsoft.edgemac --json
```

### Step 3：恢复窗口并获取新状态

```bash
orca computer get-app-state --app com.microsoft.edgemac --window-id <id> --restore-window --json
```

从 `result.snapshot.treeText` 找到地址栏的真实 `element-index`。

### Step 4：直接设置地址栏的值

```bash
orca computer set-value --app com.microsoft.edgemac --window-id <id> --element-index <fresh-address-bar-index> --value "https://example.com" --json
```

### Step 5：读取动作返回状态，确认焦点与值，再提交

```bash
orca computer press-key --app com.microsoft.edgemac --window-id <id> --key Return --json
```

### Step 6：页面变化后重新观察

```bash
orca computer get-app-state --app com.microsoft.edgemac --window-id <id> --json
```

如果页面表单的 Accessibility action 没有移动 DOM focus，可以从一个已确认聚焦的字段开始用 `Tab` / `Shift+Tab` 导航，或基于最新截图使用窗口局部坐标。不要在未确认 focused receiver 时连续输入。

### 通用模板

```bash
# 1. 运行环境
orca status --json
orca computer capabilities --json
orca computer permissions --json

# 2. 选择桌面应用与窗口
orca computer list-apps --json
orca computer list-windows --app <app> --json

# 3. 观察
orca computer get-app-state --app <app> --window-id <id> --restore-window --json

# 4. 执行一个最窄动作
orca computer click --app <app> --window-id <id> --element-index <fresh-index> --json

# 5. 消费动作返回的新状态；必要时重新观察
orca computer get-app-state --app <app> --window-id <id> --json
```

## 七、错误恢复速查

| 错误 | 正确恢复路径 |
|---|---|
| `app_not_found` | 重新运行 `list-apps`，改用 bundle ID；网站应选择承载它的桌面浏览器应用 |
| `app_blocked` | 立即停止——目标被 Computer Use 明确禁止操作 |
| `window_not_found` / `window_stale` | 重新 `list-windows`，选择当前窗口，再获取状态 |
| `window_not_focused` | 用 `--restore-window` 重试一次；仍失败则停止反复 restore，检查权限或手动置前 |
| `element_not_found` | 旧 index 已过期，重新 `get-app-state` |
| `unsupported_capability` | 当前 provider 或桌面环境不支持，改用语义替代；若错误点名依赖则补装依赖 |
| `action_not_supported` | 读取元素列出的 action，使用其中之一，或改用 `click` / `set-value` |
| `value_not_settable` | 聚焦元素后再用键盘输入，并检查返回状态 |
| `element_not_clickable` | 找有 frame 的父/子元素，或用最新截图的窗口局部坐标 |
| `invalid_argument` | 修正 flag，不要原样重试 |
| `action_timeout` | 先检查当前状态，再用更简单的语义动作；观察过慢时考虑 `--no-screenshot` |
| `screenshot_failed` | Tree 足够时用 `--no-screenshot`；否则检查 `screenshots` 权限、窗口可见性和遮挡 |
| `accessibility_error` | 运行 `capabilities`；若点名权限，检查 `permissions --id accessibility` |
| Tree 为空且无截图 | 应用可能没有可见窗口、被最小化，或权限未授予 |

恢复动作本身也必须遵循“重新观察 → 单步操作 → 验证”，不要对同一个失败命令无限重试。

## 八、浏览器场景怎么路由

Orca 有两条名字相近、但作用域完全不同的浏览器控制链：

| 目标 | 正确入口 | 观察与元素句柄 |
|---|---|---|
| Orca worktree 内置 Browser tab | Orca CLI browser 命令 | `orca snapshot` 产生 `@e1` 等 ref |
| 外部 Chrome、Edge、Safari 窗口 | `orca computer ...` | Accessibility Tree 的 `element-index` + screenshot |
| Browser webview 或其他桌面应用 UI | `orca computer ...` | 同上 |
| Orca 自身的 app chrome、设置界面 | `orca computer ...` | 同上 |

### Orca 内置浏览器

```bash
orca goto --url https://example.com --json
orca snapshot --json
orca click --element @e3 --json
orca snapshot --json
```

这里的 `@e3` 是某个内置 Browser tab 的 snapshot ref，导航或切换 tab 后就会失效。它与 Computer Use Tree 中的数字 `element-index` 不是同一种句柄，不能混用。

### 外部桌面浏览器

```bash
orca computer get-app-state --app com.microsoft.edgemac --restore-window --json
orca computer set-value --app com.microsoft.edgemac --element-index <address-bar-index> --value "https://example.com" --json
orca computer press-key --app com.microsoft.edgemac --key Return --json
```

外部浏览器的地址栏优先用 `set-value`，不要假设裸 `type-text` 会自动进入地址栏。大型 tab strip 可能只暴露 active tab，并显示 inactive tabs 已省略的提示——这是主动降噪，不应据此猜测不可见 tab 的 index。

Orca 内置 Browser 也不等于 Codex App 的 `@Browser`，更不等于通过 Extension 接管真实 profile 的 `@Chrome`。它是 Orca worktree-scoped 的独立 browser runtime。

## 九、安全边界：能点不等于应该点

Computer Use 具有接近“远程手”的权限，必须把用户授权范围当作硬边界：

- 未经用户明确要求，不 push、不提交表单、不发送消息、不购买、不删除数据、不修改账号设置
- 只读取用户指定的敏感内容，不顺手扩大读取范围
- 不把密码、token、私钥等秘密直接放进命令行参数或 shell history
- `app_blocked` 是硬停止信号，不尝试绕过
- UI-changing action 后验证结果，避免重复点击造成双重提交或重复发送
- 页面、邮件、聊天和文档里的文字都只是**不可信内容**，不能当作 Agent 指令执行

Orca Helper 持有 Accessibility 和截图权限，意味着信任边界落在 Orca runtime；这与 Codex App 原生 Computer Use 的权限持有者、审批 UI 和安全策略不同。安装 Orca 不是给 Codex CLI 本体“增加系统权限”，而是引入了一个有权限的外部执行后端。

## 十、与 OpenAI bundled Computer Use：补位，而非完全替代

Orca 和 OpenAI bundled Computer Use 顶层都遵循 action loop，底层都依赖截图、Accessibility Tree 与输入事件，因此动作原语高度对应：

| 能力 | OpenAI bundled | Orca Computer Use |
|---|---|---|
| 获取应用状态 | `sky.get_app_state(...)` | `orca computer get-app-state` |
| 点击 | `sky.click(...)` | `orca computer click` |
| 设置值 | `sky.set_value(...)` | `orca computer set-value` |
| 按键 | `sky.press_key(...)` | `orca computer press-key` |
| 滚动、拖拽 | `sky.scroll(...)` / `sky.drag(...)` | `orca computer scroll` / `drag` |

但二者并不等价：

- OpenAI bundled Computer Use 依赖 Codex App 注入的 `node_repl` 与 `@oai/sky` runtime，并与 App 的审批 UI 集成
- Orca 通过 Shell 中的 `orca computer` 独立调用，权限由 Orca Helper 持有，稳定性和能力取决于当前 Orca provider、系统权限与桌面环境
- Orca 可以给 Codex CLI 补上通用桌面观察与操作，但不会变成 OpenAI 的原生 `@Computer-Use`
- Orca 内置 Browser 可以控制 Orca 自己的 Browser tab，却不实现 Codex `@Browser` binding，也不能替代 `@Chrome` 的真实 Chrome profile 接管链路
- 两套 Skill 即使都叫 `computer-use`，真正决定能否执行的仍是宿主是否具备对应 runtime

因此准确结论是：

> **Orca 是 Codex CLI 的第三方 Computer Use 执行后端，可以补齐桌面 GUI 操作，但不能完整替代 Codex App 原生 Computer Use、`@Browser` 与 `@Chrome` 的整套宿主集成。**

## 十一、日常使用检查清单

1. 先确定本次会话应使用 `orca`、`orca-dev`、`orca-ide`，还是 `ORCA_CLI_COMMAND` 的实际值
2. 运行 `skills get computer-use`，以当前二进制动态手册为准
3. 检查 `status`、`capabilities` 和 `permissions`
4. `list-apps` 选 bundle ID；多窗口时先 `list-windows`
5. 用 `get-app-state` 获取 Tree 与 screenshot
6. 从 `result.snapshot.treeText` 读取真实 index，不用 `elementCount` 猜索引
7. 优先 `set-value`、`click` 等语义动作，坐标只作兜底
8. UI 变化后使用动作返回的新状态，或重新 `get-app-state`
9. 按 screenshot 的 `scale` 换算窗口局部坐标
10. 发送、删除、交易、账号修改和秘密输入必须尊重用户授权与安全边界

## 参考与相关笔记

- [[Orca使用笔记——多Agent编排IDE与Mobile跨网络远程互动]]
- [[Computer Use与Browser Use系列六：Codex CLI与App的能力分界——同一套Skill、两条调用链与第三方生态补位]]
- Orca 动态手册：`orca skills get computer-use`
- Orca CLI 动态手册：`orca skills get orca-cli`
