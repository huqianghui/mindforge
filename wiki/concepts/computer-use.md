---
title: "Computer Use"
created: "2026-08-30"
updated: "2026-09-12"
tags:
  - wiki
  - concept
  - agent
  - computer-use
  - browser-use
aliases:
  - "Browser Use"
  - "桌面控制"
  - "浏览器操作"
related:
  - "[[agent-loop-architecture]]"
  - "[[model-harness-codesign]]"
  - "[[skill-runtime]]"
  - "[[harness-portability-spectrum]]"
---

# Computer Use

## 摘要

Computer Use 是 agent 直接操作 UI 层（而非 API 层）的能力：观察屏幕/页面状态（截图、DOM、Accessibility Tree），执行点击、输入、滚动等人类动作。它与 Browser Use 是包含关系——Browser Use 是 Computer Use 在浏览器域的子集。这条能力路线的价值在于绕开 API 对接（SaaS 接口变更、跨部门审批），把"用户已经会用的业务界面"直接当作 agent 的操作对象；代价是维护对象从 API 契约变成页面语义。

本概念的核心工程认知有三条主线：① **action loop 协议**——模型提议动作、handler 翻译执行、重新观察验证的循环，是 agent loop 在 GUI 操作域的实例化；② **Skill 是说明书、Runtime 才是手脚**——工具/Skill 声明处处可见，但执行 runtime 决定能力归属（Codex CLI vs App 的能力分界实证）；③ **执行位置决定补位形态**——能力越贴近用户本地状态（登录态、桌面、系统权限），缺位时越只能在客户端补。

## Claims

### Claim: Computer Use ⊃ Browser Use——操作 UI 层而非 API 层，四种浏览器形态的本质是 Profile 边界

- **来源**：[[Computer Use与Browser Use系列一：概念与产品形态——从包含关系到四种浏览器形态与认证三链路]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-29
- **置信度**：0.8
- **状态**：active

> Computer Use 是广义 GUI 操作能力（桌面应用 + 浏览器），Browser Use 是其浏览器子集。Codex 侧四种浏览器形态（内置 `@Browser`、Chrome extension `@Chrome`、Playwright、Orca 内嵌 Browser）的本质差异是 **Profile 边界**——是否复用用户真实浏览器的登录态。认证三链路（桌面应用 provider / 扩展继承 / 独立会话）相互独立，Azure OpenAI provider 实测可用。

### Claim: action loop 是 agent loop 在 GUI 操作域的实例化——协议层/翻译层/执行层分离，官方只给协议不给执行器

- **来源**：[[Computer Use与Browser Use系列三：自己实现——action loop协议、双执行器路线与跨平台adapter矩阵]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-30
- **置信度**：0.8
- **状态**：active

> 循环骨架与 agent loop 同构（观察 → 模型判断 → 执行 → 回灌新状态），区别仅在实例化域：观察对象从工具返回值变成屏幕/页面状态（截图、DOM、AX 树），动作从 API 调用变成 UI 事件（click/type/scroll 坐标或元素引用）。分层上，模型返回的 action JSON 只是协议（`{type:"click",x,y}` 不会自己执行）；**action handler 是自己要写的翻译层**（官方仅给示例）；执行层可选 Playwright（浏览器页面）或 xdotool/系统事件（整个桌面）。"Docker 支持这些 action"是误读——支持 action 的是 handler，Docker/Playwright 只是执行环境。

### Claim: 语义操作优先、坐标操作兜底——Codex 与 Orca 两个独立实现同构收敛

- **来源**：[[Computer Use与Browser Use系列二：Codex浏览器运行时解剖——从bundled plugin看Agent浏览器控制的工程设计]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-29
- **置信度**：0.7
- **状态**：active

> Codex 运行时三套操作 API 按精度降级：playwright 语义层（locator/getByRole，页面小改版不失效）→ dom_cua 节点层 → cua 纯视觉坐标兜底；Orca 独立实现同样收敛到"Accessibility Tree 语义元素优先、Screenshot 坐标兜底"。跨产品同构是设计规律的强信号：**坐标一次重排就失效，语义定位才可长期维护**。推荐降级链：语义操作 → 截图+坐标 → 交人接管。

### Claim: Skill 是说明书、Runtime 才是手脚——CLI/App 共享 Skill 发现机制但执行 runtime 不对等

- **来源**：[[Computer Use与Browser Use系列六：Codex CLI与App的能力分界——同一套Skill、两条调用链与第三方生态补位]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-29
- **置信度**：0.7
- **状态**：active

> 实测：Codex CLI 能读到 App 的 bundled Computer Use Skill 文件（198 行完整 API 文档），但缺 `node_repl + @oai/sky` runtime，Skill 是一纸空文；本机 Orca 提供替代后端（75 行 discovery stub + 动态手册），同一任务（播放网易云音乐）经 `orca computer` 跑通。两个同名 `computer-use` Skill 并存时，路由的隐式裁决者是 **runtime 可用性排除法**而非智能路由。两条调用链在顶层 action loop 和底层 macOS Accessibility 一致，中间的执行引擎、协议、权限持有者（App 审批 UI vs Orca Helper）完全不同——信任边界随之不同。

### Claim: 执行位置决定能力归属——Computer Use / Browser Use / Web Search 三例同构，能力越贴近本地状态补位越只能在客户端

- **来源**：[[Computer Use与Browser Use系列七：Web Search与浏览器操作的分界——信息获取三级梯、执行位置与成本转移]]
- **首次出现**：2026-08-30
- **最近更新**：2026-08-30
- **置信度**：0.7
- **状态**：active

> 三个实例共享"声明处处可见、runtime 决定归属"结构：Computer Use（CLI 缺 `@oai/sky` → Orca 客户端补）、Browser Use（CLI 缺 Browser runtime → Orca 内嵌 Browser/Playwright 客户端补）、Web Search（换 Bedrock/Vertex/Databricks 代理后服务端执行器消失 → Tavily MCP 客户端补/LiteLLM 代理层拦截/browser use 开 Google 反向补）。规律：**web search 无本地状态，三层都能补；browser use 依赖登录态、computer use 依赖桌面与系统权限，只能客户端补**。"自带搜索"的产品全是第一方闭环（模型和搜索执行器同服务端）——服务端工具全家桶是第一方绑定的隐性福利。

### Claim: 服务端工具断供要分两层判断——端点层有无执行器 × harness 层肯不肯发声明，断供点越上游可补位层越少

- **来源**：[[Computer Use与Browser Use系列七：Web Search与浏览器操作的分界——信息获取三级梯、执行位置与成本转移]]
- **首次出现**：2026-08-30
- **最近更新**：2026-09-04
- **置信度**：0.85
- **状态**：active

> Codex + Azure OpenAI 断供解剖补出第二层：Azure Responses API 端点层其实有阉割版 `web_search` 执行器（`external_web_access` 恒 false，搜预建索引），但 Codex harness **只在默认 OpenAI provider 时才附加工具声明**（openai/codex#3851）——声明根本不出门，端点侧有执行器也无用。对照 Claude Code + Databricks 是"端点无执行器、声明发了没人执行"。两层判断框架的推论：**断供点越靠上游，下游可补位的层就越少**——LiteLLM 代理层拦截只救"断在端点层"的场景（声明得先出门才有物可拦），harness 层断供只剩客户端补位；客户端补位最通用正因为它在整条链路最上游。现场实锤：Codex App 配 Azure provider 后模型自述"当前会话没有向我暴露 web_search 工具"——连第一方 App 形态也断供，能力归属跟请求落点走、不跟产品形态走。附带暴露最隐蔽的代价：工具缺失时模型可能凭训练知识一本正经作答过期数据，用户不追问根本发现不了。

### Claim: 判定工具执行位置的五条指纹需多条交叉——弹本地权限恰证执行器在本地；管道决定能力下限、模型性格决定实际走几级梯

- **来源**：[[Computer Use与Browser Use系列七：Web Search与浏览器操作的分界——信息获取三级梯、执行位置与成本转移]]
- **首次出现**：2026-08-31
- **最近更新**：2026-09-04
- **置信度**：0.8
- **状态**：active

> VS Code 三模型对照实验（GPT-5.6 Sol / Gemini 3.7 Flash / Grok 4.6，同一问题只换模型）：三者搜索 Output schema 完全相同（`url_citation` 锚点 + `bing_searches`），证明走的是 Copilot 服务端统一管道而非某家模型厂商的 hosted search——Gemini 数据点起证伪作用（Google 自家 grounding 是另一套 `groundingMetadata` 格式）。五条判定指纹：① 工具名前缀（`mcp_` → MCP）；② Output schema（鉴别哪条管道格式化了结果，**不能**直接等同哪家执行）；③ 客户端有无对应物（没装扩展还能搜 → 服务端）；④ 换模型对照（schema 随模型变 → 挂模型；不变 → 挂管道层）；⑤ 权限弹窗位置——**弹本地权限恰恰证明执行器在本地**，这是执行位置最硬的指纹。元教训：单一指纹会误判（只看 schema 曾把统一管道误认成 OpenAI hosted），换模型对照这类控制变量实验一次就能分离管道层与模型层。真正的行为差异变量是模型性格：GPT/Gemini 信任搜索成品直接成文，Grok 自发沿三级梯下探（本地 fetch Yahoo 交叉验证触发权限弹窗）——管道决定能力下限，模型性格决定实际走几级梯。

### Claim: UI 层天然残缺、数据层天然完整——DOM 虚拟化是页面性质而非工具缺陷

- **来源**：[[Computer Use与Browser Use系列五：最佳实践与日常使用习惯——场景路由表、内容获取链路与实战经验]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-30
- **置信度**：0.8
- **状态**：active

> browser use 解决登录态和 JS 渲染，**不解决 DOM 虚拟化**——虚拟化页面（如 ChatGPT share）的活 DOM 只含视口附近内容，`domSnapshot()` 读到的和手写 Playwright 一样残缺，且 agent 意识不到缺。真解在换数据层（如解析 turbo-stream 数据块）。信息获取三级梯（search 发现 → fetch 获取 → browser use 到场）中，上层工具可向下兼容下层只读场景（browser use 开 Google 省搜索 API 费），但代价是模型 token、延迟与风控风险——"能补"和"该用它补"之间隔着成本表。抓取后完整性核验（数量/关键词/悬置/边界四查）责任永远在人。

### Claim: 产品化路线是"可审计智能 RPA"——模型提议、策略放行、执行器落地三权分立

- **来源**：[[Computer Use与Browser Use系列四：产品化——可审计智能RPA、Extension-Plugin-WebMCP三层选型与安全设计]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-29
- **置信度**：0.7
- **状态**：active

> 企业场景的核心原则：模型不应直接持有浏览器控制权限——模型只提出动作，策略层决定是否放行（域名/动作白名单、高风险确认），执行器在客户浏览器本地落地。动作设计成高层业务语义（`click("新建订单")` 而非坐标），SaaS 适配从 SDK 变成流程配置。三条铁律：模型凭据不进扩展、客户 Cookie 不上后端、页面状态脱敏后才回传。安全确认按四级分类（Hand-off Required → No Confirmation），CAPTCHA/付费墙/改密码是产品硬编码的不可放行项。

### Claim: 断供框架的第三层是治理层——harness 的隐藏模型调用跟 provider 走，接第三方要盘点全部模型调用而非只主模型

- **来源**：[[Codex Desktop系列02：gpt-5.4-mini与三条暗线——全局配置菜单、退休元数据与自动审批调用链]]、[[Codex Desktop系列06：ModelInfo字段值手册——unified_exec、code_mode、Ultra档与治理字段的源码级解读]]
- **首次出现**：2026-09-05
- **最近更新**：2026-09-12
- **置信度**：0.85（二进制逆向 + 源码常量实锤 + 修复推断确认——"配置意图 + 404 消失"而非抓包实测；404 归因于 codex-auto-review 系"源码选择逻辑 + luna 已部署仍需 override"两条证据推出，错误信息本身不回传模型名）
- **状态**：active

> 在"端点层 × harness 层"两层判断框架之上，Codex Desktop 接 Azure 实测补出断供的层级序列：**工具层**（web_search 声明不发）→ **目录层**（catalog schema 版本锁定；退休元数据是 OpenAI 第一方生命周期、与第三方 deployment 现实脱节——`retirement_at` 源码注释为 Informational，CLI 不执行退休，自动迁移是 UI 层行为）→ **治理层**（本条核心）：审批（Approve for me）是**第二条隐藏的模型调用链**，同样打到你配置的 provider。默认审批模型名以常量写死在源码（provider.rs:131-133）：ChatGPT 登录态取 `codex-auto-review`（Codex 内部合成名，任何第三方端点必然无同名 deployment → 404）、API key 认证态取 `gpt-5.6-luna`；修复是条目级 `auto_review_model_override` 指向真实存在的 deployment（存在即整体替换默认值，guardian/review.rs:897-898）。治理层断供最阴险处在错误归因困难：主模型正常、404 出现在审批环节、报错不说明发起方。且治理层实为**四件套**（审批模型 / guardian_v2 安全分类器 / confirmation_policies 确认政策 / collaboration_modes），全部是模型条目字段——每个环节都可能发起模型调用或依赖模型名，都是潜在断点（confirmation_policies 源码原文同时印证了系列四的四级确认分类）。配套验证纪律：三种权限模式对应三种运行态，只有 Approve for me（`approvals_reviewer: auto_review`）才真正走审批模型——Full access 下写文件成功不能作为审批链路修复的证据。

### Claim: Computer Use 的分发链——分发态在 App bundle、运行态 reconcile 到用户目录；feature flag ≠ payload、签名/权限/进程树疑似紧耦合（推测）

- **来源**：[[Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链]]、[[Codex Desktop系列03：bundled的真正含义与三版本号——Apple Bundle概念、同源不同发行版与com.openai.codex血缘]]
- **首次出现**：2026-09-05
- **最近更新**：2026-09-12
- **置信度**：0.75（①② 本机路径验证 + 公开 issue 佐证；③ 为推测未直接验证——2026-09-12 按系列04 事实性修订软化）
- **状态**：active

> 系列六"runtime 不对等"的物理答案：Computer Use 不在 CLI 二进制里，而在 App bundle 携带的 plugin payload 里——`Resources/plugins/openai-bundled/plugins/computer-use/`（plugin.json + .mcp.json + skills + SkyComputerUseClient.app），`.mcp.json` 把 MCP server 的 command 指向 bundle 内的 native helper；Codex 启动时经 bundled plugin marketplace reconciliation 把 payload 安装到 `~/.codex/plugins/cache/`——"Computer Use 在哪"有两个答案：**分发态在 App bundle，运行态在用户目录**。边界证据分两档：① payload 随 CPU 架构走——Intel x64 构建根本不带这套文件，而 `codex features list` 仍显示 `computer_use stable true`（**feature flag ≠ payload**）；② bundled CLI 手动补挂 plugin 后也能获得能力——载体是 plugin payload 而非 App 本身；③（**推测，未直接验证**）SkyComputerUseClient 从 Codex.app 进程树之外启动可能因 code signature / launch context 失败——三个引用 issue 均未直接描述该故障模式、本机也无对照测试，推测与 macOS TCC 的 responsible-process 归因链有关：App Bundle + native helper + 签名 + TCC 权限 + 进程树**可能是紧密耦合的，但不是"不可拆整体"的定论**；这个方向若成立，可解释 standalone 与 bundled CLI 版本号相同能力也不同（"同源不同发行版"在能力层的表现）。另注：整条配置层调用链（CLI → plugin → MCP → SkyComputerUseClient → macOS Accessibility）目前的证据全是文件位置与 `.mcp.json` 指向，尚无一次真实触发的运行时观测（进程树、日志时间线）坐实每一跳。这是第一方绑定在**分发层**的形态：能力扩展做成 bundle 内 payload，随第一方 App 分发而不随开源 CLI 分发。

### Claim: DCC 域实证——Computer Use 适合做"眼睛"不适合做"手"，批量制作交给应用 API

- **来源**：[[Blender系列02：三种操作入口与官方MCP安装——三组件架构、本地进程原理与SDK版本兼容实录]]、[[Blender系列03：虎式坦克实战——从一句话需求到8秒开火动画的完整链路与工程解剖]]
- **首次出现**：2026-09-07
- **最近更新**：2026-09-12
- **置信度**：0.75（实测三故障 + 后台路径独立验证）
- **状态**：active

> Blender 实战给"UI 层天然残缺"补上桌面 DCC 域的实测注脚。三入口分工：**bpy Python API** 做批量建模/改参数/设关键帧/渲染（一次脚本执行完成大量重复操作），**Computer Use** 只做"眼睛"（查看窗口实际状态、打开文件），**MCP** 把 API 路径接到"正在打开的场景"（保留选中对象与编辑状态）。Computer Use 窗口操作实测接连三故障：`noWindowsAvailable`（-10005）、用户粘贴操作冲突、dmg 安装镜像未推出导致两处应用共享同一 bundle identifier（`org.blenderfoundation.blender`）而窗口定位歧义——改完整应用路径可读状态但并非全部操作恢复。关键的归因纪律：**故障只影响桌面界面操作，后台脚本生成与渲染独立验证成功，不能从 UI 故障推断模型生成失败**。UI 不可靠时切数据层/API 层的补位实例：扩展安装绕过 GUI，走 Blender 后台接口 `bpy.ops.extensions.package_install_files` 完成。GUI 操作易受窗口焦点、用户并发操作、安装状态干扰——与浏览器域"能点不等于应该点"、"DOM 虚拟化真解在数据层"同构。

## 冲突与演进

- 2026-08-30：建页。系列一~七 + Orca 使用笔记二共 8 篇（2026-08-29~30 成文）提供完整素材；browser-use 不单独建页（包含关系即本页第一条 Claim）；action-loop、semantic-first-coordinate-fallback 按"避免同批次碎片化"作页内 Claims 收入。
- 2026-09-04：注入系列七 08-30/08-31 三波修订的两条新 Claim——两层判断框架（端点层×harness 层，Codex+Azure 断供解剖 + Scout 镜像）与五条执行位置判定指纹（三模型对照实验）。"执行位置决定能力归属"从单层判断细化为两层判断。
- 2026-09-06：注入 Codex Desktop 系列02/03/04/06 两条新 Claim——治理层断供（审批链路是第二条隐藏模型调用链，断供框架从两层扩展为工具层/目录层/治理层序列，源码常量实锤 + 实测修复闭环）与分发链解剖（分发态 App bundle / 运行态用户目录、feature flag ≠ payload、签名权限进程树不可拆整体）。confirmation_policies 源码原文为"四级确认分类"Claim（系列四）提供第一方源码印证。
- 2026-09-12：按 Codex 系列事实性评审修订（09-07，commit 5768895）更正两处——分发链 Claim 的"签名/TCC/进程树不可拆整体"软化为"疑似紧耦合（推测，未直接验证）"并降置信度 0.8→0.75；治理层 Claim 补证据边界（修复为推断确认非抓包、404 归因为两证据推理）。同日注入 Blender DCC 域实证 Claim（三入口分工、Computer Use 三故障、"眼睛不做手"）。

## 关联概念

- [[agent-loop-architecture]] — `extends` action loop 是 agent loop 在 GUI 操作域的实例化：同一循环范式，观察对象换成屏幕状态、动作换成 UI 事件
- [[model-harness-codesign]] — `grounds` CLI 无原生 Computer Use 的产品边界推断与服务端工具全家桶现象，为第一方绑定路线提供实证
- [[skill-runtime]] — `grounds` "Skill 可见但 runtime 缺失"是 skill 声明与执行环境分离的又一实证（与 scripts 断层同构）
- [[harness-portability-spectrum]] — `grounds` Skill 跨 CLI/App 可发现但 runtime 不可移植，是可移植性分层的第 3 处独立论证

## 来源日记

- [[2026-08-29-周六]] — 系列一~六成文 + Orca 补位实测（网易云音乐）
- [[2026-08-30-周日]] — 系列七成文（web search 分界）+ 社区补位生态调研（open-computer-use / cua / UI-TARS）
- [[Codex Desktop系列02：gpt-5.4-mini与三条暗线——全局配置菜单、退休元数据与自动审批调用链]] — 审批链路 404 排查与 override 修复实测、三种权限模式验证纪律
- [[Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链]] — 分发链解剖：plugin payload 路径、reconciliation 机制、三个边界证据
- [[Codex Desktop系列06：ModelInfo字段值手册——unified_exec、code_mode、Ultra档与治理字段的源码级解读]] — 审批模型常量与 override 代码路径、治理四件套字段、retirement_at Informational
- [[Blender系列02：三种操作入口与官方MCP安装——三组件架构、本地进程原理与SDK版本兼容实录]] — 三入口分工表、Computer Use 三故障实录
- [[Blender系列03：虎式坦克实战——从一句话需求到8秒开火动画的完整链路与工程解剖]] — "眼睛不做手"结论的来源实操
