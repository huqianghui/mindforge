---
title: "Computer Use"
created: "2026-08-30"
updated: "2026-08-30"
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

## 冲突与演进

- 2026-08-30：建页。系列一~七 + Orca 使用笔记二共 8 篇（2026-08-29~30 成文）提供完整素材；browser-use 不单独建页（包含关系即本页第一条 Claim）；action-loop、semantic-first-coordinate-fallback 按"避免同批次碎片化"作页内 Claims 收入。

## 关联概念

- [[agent-loop-architecture]] — `extends` action loop 是 agent loop 在 GUI 操作域的实例化：同一循环范式，观察对象换成屏幕状态、动作换成 UI 事件
- [[model-harness-codesign]] — `grounds` CLI 无原生 Computer Use 的产品边界推断与服务端工具全家桶现象，为第一方绑定路线提供实证
- [[skill-runtime]] — `grounds` "Skill 可见但 runtime 缺失"是 skill 声明与执行环境分离的又一实证（与 scripts 断层同构）
- [[harness-portability-spectrum]] — `grounds` Skill 跨 CLI/App 可发现但 runtime 不可移植，是可移植性分层的第 3 处独立论证

## 来源日记

- [[2026-08-29-周六]] — 系列一~六成文 + Orca 补位实测（网易云音乐）
- [[2026-08-30-周日]] — 系列七成文（web search 分界）+ 社区补位生态调研（open-computer-use / cua / UI-TARS）
