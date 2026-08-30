---
title: Orca使用笔记——多Agent编排IDE与Mobile跨网络远程互动
created: 2026-07-25
tags:
  - tool
  - ai-agent
  - orchestration
  - mobile
  - remote-access
---

# Orca 使用笔记——多 Agent 编排 IDE 与 Mobile 跨网络远程互动

> 官方文档：[Orca Docs](https://www.onorca.dev/docs) ｜ GitHub：[stablyai/orca](https://github.com/stablyai/orca)（MIT 开源，27.7k stars）｜ 本文基于 2026-07 官方文档整理，重点回答两个问题：**Mobile 上能做什么互动**、**跨局域网之外是否可用**。

## 一、Orca 是什么

Orca 是 Stably AI 开源的**桌面 IDE，用于并排运行多个 AI coding agent**。它的核心模型是：

- **每个任务一个 git worktree** —— 每个任务独占自己的 worktree、agent 终端和浏览器 tab，多个 agent 并行工作互不干扰，不需要 stash、不需要来回切分支。
- **BYO Agent（自带 Agent）** —— Orca 本身不是模型，也不卖订阅。它编排你已经在用的 CLI agent：Claude Code、Codex、Cursor CLI、OpenCode、Copilot CLI、Qwen Code 等，官方口径是"**任何能在终端里跑的 CLI agent 都能跑在 Orca 里**"。
- **典型用法**：把同一个 bug 派给三个 agent 并行尝试，比较 diff 后择优合并（fan-out + pick the winner）。

围绕这个模型，桌面端提供：并行 worktree 编排、Ghostty 级终端（WebGL 渲染、无限分屏、重启后保留 scrollback）、AI diff 逐行批注回传 agent、内嵌 Chromium 的 Design Mode（点击 UI 元素直接把 HTML/CSS/截图喂进 prompt）、GitHub/Linear 原生集成、账号切换与用量追踪（可看 Claude/Codex 的 rate-limit 重置时间）、Orca CLI（`orca worktree create` / `snapshot` / `click` / `fill`，agent 也能反过来驱动 Orca）。

定位上有三个"不是"值得注意：**不是模型**（自带订阅）、**不是 git 替代品**（worktree 就是真实 git worktree，随时可以 `cd` 进去用原生 git）、**不是托管 VPS 产品**（远程算力全部用你自己控制的机器和云账号）。

## 二、Mobile Companion：手机上能做什么

Mobile 是 Orca 区别于同类工具（如 cmux，见 [[cmux使用笔记——从Ghostty增强到AI Agent终端的实践]]）最突出的能力。iOS（App Store / TestFlight）和 Android（APK）双端，与桌面 Orca **配对**后使用。

官方对 mobile 的定位很克制：**"read-mostly + 手机上真正需要的那几个控制"，它是桌面的遥控器（remote control），刻意不做完整编辑器**。具体能做的事：

### 查看与监控

- **看到所有 worktree 及其 agent 状态**（working / done / waiting on input）。而且是**跨主机聚合视图**——本地桌面和多个远程 Orca server 上的 worktree 统一列在一个列表里，切换不需要换设备。
- **浏览 workspace 完整文件树**，包括深层嵌套路径，可直接打开任意文件查看。
- **回看终端 scrollback**，了解 agent 刚才做了什么、问了什么；支持长按选择、复制，通过 share-sheet 粘贴回复。
- **Push 通知**：agent 从 working 转 idle（即真正完成，而不只是暂停）时手机收到推送，和桌面通知镜像。

### 编写与互动（用户最关心的部分）

- **回复等待输入的 agent**：发送 `continue`、`yes` 或自由文本，可**附带照片或文件**，也可以**点麦克风口述**（语音转文字后发送）。
- **Live 模式**：切到 Live 后每个键入字符直接流向活动终端，口述文字也直接插入终端（不自动回车）——相当于手机变成远程键盘。
- **终端辅助键行**：提供手机键盘上不方便按的 `Tab`、`Shift+Tab` 等按键。
- **从手机创建 workspace**：与桌面相同的 Smart 源模式（Smart / GitHub / Linear / GitLab / Branch / Name），选好源后还有 Advanced 命名与分支控制，workspace 在配对的桌面上创建。
- **Source Control 提交**：点分支图标打开源码管理——查看分支状态、检查变更文件、stage/unstage、staged 集合就绪后直接 commit；已有 PR 的分支可以 Link an existing PR。
- **切换 agent 账号**：与桌面状态栏相同的账号切换器，含各账号用量和 rate-limit 重置倒计时，手机上切换即在配对桌面上生效。
- **浏览器视图**：打开 Web / Mobile 双模式浏览器会话，Mobile 模式让配对桌面的浏览器给出手机尺寸的响应式视口，方便检查响应式页面。

### 执行模型：手机是遥控器，干活的永远是电脑上的那个 Claude Code

先把最容易误解的一点说清楚：**手机不执行任何东西，执行方永远是配对的电脑（桌面或 Remote Server），改代码的还是电脑上正在跑的那个 CLI agent**。链路如下：

```
手机（遥控器 UI）
   │  下发指令：文本 / 口述 / 照片 / continue
   ▼
电脑上的 Orca（运行时，source of truth）
   │  指令注入对应 worktree 的 agent 终端
   ▼
Claude Code / Codex 等 CLI agent（跑在电脑上）
   │  读写代码、跑命令、git 操作——全在电脑的 worktree 里
   ▼
结果回流手机：状态变化、terminal scrollback、diff、推送通知
```

由此推出几个关键事实：

- **同一个会话**：手机上看到的 agent 会话就是电脑上正在跑的那个 Claude Code 进程，不是手机本地新起的。人在电脑前敲和在手机上发，进的是同一个终端会话。
- **凭证只装电脑**：Claude Code 的登录、repo、工具链都只需要在电脑（或 server）上，手机只装 Orca app 本身。
- **电脑关则断**：桌面 Orca 退出手机即断连（无云中继）——反向印证执行全在电脑侧。想要"电脑合盖 agent 不停"，就用 Remote Orca Server 模式（见下文）。
- 手机上的 commit、创建 workspace 同理，都是"发指令 → 电脑执行"。

在此基础上，"能否在 mobile 上改代码"的准确回答分两层：

1. **人手动编辑代码文件：不能**。文件树和文件是只读查看，官方刻意不做编辑器。硬要手改只能走 Live 模式在终端里跑 `vim`（每个键入字符直接流向电脑终端，技术上可行，体验只适合一两行应急）。
2. **通过 Claude Code 改代码：完全畅通，且是设计主路**。从下发任务（创建 workspace + 发 prompt）、中途回复、到看 diff、stage、commit 的整个 agent 驱动闭环，手机端都能完成——和坐在电脑前用 Claude Code 是同一回事，只是输入端换成了手机。

所以 Orca mobile 的哲学是：**编写权交给 agent，手机保留"指挥 + 审阅 + 提交"**。在"AI 写代码、人做审阅与决策"的工作流里，手机端覆盖的恰好是人的那部分。

### 配对机制

1. 桌面端从 account/status 菜单打开配对流程，显示一次性配对码；
2. 手机端 Orca app 选 **Pair** 粘贴配对码（或走桌面深链直接跳到手机配对页）；
3. 配对交换**直接发生在桌面和手机之间**，之后使用设备 token 维持连接。

关键约束：**没有云中继（no cloud relay）**。桌面 app 关闭连接即断；重开桌面后手机自动重连。桌面永远是 source of truth。

## 三、跨局域网互动：可以，但要靠 Tailscale 组私网

这是需要仔细回答的问题。结论先行：

> **可以在不同局域网之间互动，但不是开箱即用**——Orca 没有厂商云中继，官方推荐（且文档中唯一给出完整路径的）方案是 **Tailscale**：手机和桌面/服务器加入同一个 tailnet，穿透 NAT 后手机在任何网络（蜂窝、外地 Wi-Fi）都能连回家里/公司的 Orca。

### 为什么不能直接跨网

配对连接是手机与桌面**点对点直连**。同一 LAN 内可以直接互通；跨网络时双方都在 NAT 之后，没有中继就无法建立连接。官方明确警告：**不要把 Orca 端口直接转发到公网**——推荐 Tailscale、WireGuard、可信 LAN、SSH forwarding 或带认证的 tunnel。

### 方案一：桌面 + Tailscale（最简路径）

适合"家里/办公室一台常开机器，人带手机在外"的场景：

1. 两端（桌面机 + 手机）都装 Tailscale，登录同一 tailnet；
2. 桌面 Orca：**Settings → Remote Orca Servers → Advertise this app as a server → New Link**，Connection address 选 Tailscale 地址（形如 `100.x.y.z`），生成 Access Link；
3. 手机（或另一台笔记本的 Orca client）粘贴该链接配对。

Tailscale 给机器分配的 `100.` 开头私网地址不受物理网络位置影响，Orca 会把它排在连接地址选择器首位——这就是官方设计的跨网通道。

### 方案二：Remote Orca Server（常开运行时 + 多端接入）

如果希望 agent **在笔记本合盖后继续跑**、手机随时重连同一批会话，就把一台常开机器（旧笔记本、Mac mini、家庭服务器、云 VPS）升级为 Remote Orca Server：

- **Server 拥有全部运行时**：仓库、worktree、终端、tab、provider 账号、agent 会话都在 server 上；client（笔记本/手机）只是 UI。
- client 断开、睡眠都不影响 agent 继续工作；重连即回到 server 端状态。
- agent CLI（Claude Code、Codex 等）和 git 凭证要装在 **server** 上——client 的登录不会自动带过去。
- 每个配对 client 有独立可撤销的 token（Shared Server Access 列表里可逐个 revoke）。

Headless Linux 服务器用 `orca serve` 代替桌面 app，且有专门的手机配对参数：

```bash
# 无头服务器上启动并生成 mobile 专用配对二维码
orca serve --pairing-address 100.64.1.20 --mobile-pairing
```

手机保持在同一 tailnet，打开 Orca Mobile 扫终端二维码即可配对。

### 跨网实操清单

**方案一实操（桌面 + 手机，最常见）**：

1. **两端装 Tailscale，进同一 tailnet**：
   ```bash
   brew install --cask tailscale   # Mac
   ```
   手机装 Tailscale app，**登录同一账号**（免费个人版够用）。验证：面板里互相可见，电脑获得 `100.x.y.z` 私网地址。
2. **桌面 Orca 声明为 server**：**Settings → Remote Orca Servers → Advertise this app as a server → New Link**，Connection address 选 `100.x.y.z`（没出现点刷新），**Generate Access Link** 并复制。
3. **手机配对**：Orca app → **Pair** → 粘贴 access link。之后蜂窝网络/外地 Wi-Fi 都能连回。
4. **日常保持三件事在线**：电脑不睡眠（电源设置防睡眠或 `caffeinate` / Amphetamine，合盖睡眠会断）、Orca 桌面 app 运行中（退出即断）、Tailscale 连接中。

**方案二实操（headless server）**：

1. **server 端装全套**：Orca（含 CLI）、Tailscale（同一 tailnet）、**agent CLI（Claude Code 等）并完成登录**、git 凭证。凭证必须在 server 上——client 的登录不会带过去。
2. **启动并生成手机配对码**：
   ```bash
   orca serve --pairing-address <server的100.x地址> --mobile-pairing
   # 防火墙需要固定端口时加：--port 6768
   ```
   前台进程，长期跑用 tmux / systemd 托管；终端打印 endpoint + 手机专用 QR 码。
3. **手机扫码**：同一 tailnet 下 Orca Mobile → **Pair** → 扫 QR 或粘贴链接。笔记本可同时接入：**Settings → Remote Orca Servers → Add Server** 粘贴同一 pairing URL。

**安全两条**：不要把 Orca 端口映射到公网（官方明确警告）；每个 client 有独立 token，可在 server 的 **Shared Server Access** 里单独撤销。

### 四种运行模式速查

| 模式 | 文件与 agent 在哪 | 适合场景 |
| --- | --- | --- |
| Local | 本机桌面 | 日常开发、快速迭代 |
| SSH target | 你的远程主机（笔记本 Orca 拥有运行时） | 已有 dev box / GPU 机器，一台笔记本驱动多台远程机 |
| Remote Orca Server | 常开机器上的 Orca 运行时 | **手机重连同一会话**、笔记本睡眠 agent 不停、自动化接入 |
| Per-workspace 环境 | 每 workspace 一个临时 VM/容器（BYO 云账号，`orca.yaml` recipe） | 任务级隔离、用完即毁的沙箱 |

SSH 与 Remote Server 的分界：SSH 模式下笔记本 Orca 拥有运行时、远端只跑选定 worktree；Remote Server 模式下远端拥有全部运行时，桌面、浏览器、**手机**、自动化多个 client 共享同一会话——**要手机跨网互动，Remote Server（或桌面 + Tailscale advertise）才是正确形态**。四种模式可在同一安装里混用。

## 四、上手路径与个人评估

最小可用路径（macOS）：

```bash
brew install --cask stablyai/orca/orca
```

手机装 Orca IDE（iOS App Store / Android APK），同一 Wi-Fi 下先完成本地配对体验；确认价值后再加 Tailscale 打通跨网。

几点个人判断：

1. **Mobile 的价值在"人机异步"**：agent 跑长任务时人不必守在电脑前——推送告诉你 agent 完成或卡住，手机上读 scrollback、回一句 `continue`、口述新指令、甚至直接 commit。这与 [[tmux与Claude远程交互实践]] 手工搭建的"远程遥控 Claude"是同一诉求，但 Orca 给出的是产品化答案（状态感知 + 结构化操作，而非裸终端）。
2. **无云中继是双刃剑**：隐私和数据主权干净（没有第三方服务器经手代码与会话），代价是跨网互动必须自建 Tailscale/WireGuard 层——对个人是十分钟配置，对团队则要管理 tailnet ACL。
3. **与 cmux 的分工**：cmux 强在本机终端体验，Orca 强在编排模型（worktree 隔离 + 多 agent 对比 + 远程/移动接入）。"fan out 同一任务给多个 agent 择优"的工作流与 [[generation-evaluation-separation]] 的生成-评估分离思想一致——生成交给多个 agent，评估（diff review、批注、合并决策）留给人，而 mobile 端恰好把评估环节从书桌上解放出来。

## 参考

- [What is Orca? — Orca Docs](https://www.onorca.dev/docs)
- [Mobile companion — Orca Docs](https://www.onorca.dev/docs/mobile)
- [Remote Orca Servers — Orca Docs](https://www.onorca.dev/docs/remote-servers)
- [Ways to run Orca — Orca Docs](https://www.onorca.dev/docs/ways-to-run)
- [Notifications & Inbox — Orca Docs](https://www.onorca.dev/docs/notifications)
- [stablyai/orca — GitHub](https://github.com/stablyai/orca)

## 相关笔记

- [[Orca使用笔记二——Computer Use桌面控制与Codex CLI补位实践]]
