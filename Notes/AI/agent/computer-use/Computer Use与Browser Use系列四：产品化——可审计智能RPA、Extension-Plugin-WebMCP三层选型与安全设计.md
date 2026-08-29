---
title: Computer Use与Browser Use系列四：产品化——可审计智能RPA、Extension-Plugin-WebMCP三层选型与安全设计
created: 2026-08-29
tags:
  - AI
  - Agent
  - Computer-Use
  - Browser-Use
  - WebMCP
  - MCP
  - Chrome-Extension
  - 产品化
---

# Computer Use与Browser Use系列四：产品化——可审计智能RPA、Extension-Plugin-WebMCP三层选型与安全设计

> 系列导航：[系列一：概念与产品形态](Computer%20Use与Browser%20Use系列一：概念与产品形态——从包含关系到四种浏览器形态与认证三链路.md) ｜ [系列二：Codex 浏览器运行时解剖](Computer%20Use与Browser%20Use系列二：Codex浏览器运行时解剖——从bundled%20plugin看Agent浏览器控制的工程设计.md) ｜ [系列三：自己实现](Computer%20Use与Browser%20Use系列三：自己实现——action%20loop协议、双执行器路线与跨平台adapter矩阵.md) ｜ 本篇

## 引言：一个真实的客户诉求

讨论的起点是一个非常典型的企业场景：

> "SaaS 的 API 一直在变，而且对接涉及跨部门合作，太复杂了。所以想通过浏览器控制来实现网页操作。"

这正是浏览器控制最有价值的场景：不再把每个 SaaS 当成要深度对接的 API，而把它当成**用户已经会使用的业务界面**。API 方案是"系统集成"；浏览器控制更像**可审计的智能 RPA**——它绕开了 API 变更、权限审批和跨部门排期，但代价是维护对象从 API 契约变成了网页流程与页面语义。

本篇给出这条路线的完整产品化方案：架构、动作设计、三层能力选型（Extension / Plugin+MCP / WebMCP）、认证设计、安全清单和 MVP 路径。

## 一、总体架构：受限的浏览器代理

不要做"无限权限的通用助手"，要做**受限的浏览器代理**：

```
客户 Chrome（已登录）
  ↓
你的扩展：读取页面、执行受限动作
  ↓
策略与审计层：允许哪些网站、页面、动作
  ↓
模型：判断下一步、调用浏览器工具
```

核心原则只有一条：**模型不应直接持有 Chrome 的控制权限。** 模型只提出动作；你的策略层决定是否允许执行。这与[系列二](Computer%20Use与Browser%20Use系列二：Codex浏览器运行时解剖——从bundled%20plugin看Agent浏览器控制的工程设计.md)解剖的 Codex 安全设计（四级确认策略、读写不对称）一脉相承。

职责划分：

**扩展（客户浏览器内）**
- 读取当前标签页地址、标题、可见文本、DOM/无障碍树
- 必要时抓取当前视口截图
- 在允许范围内执行导航、点击、输入、滚动
- 在提交订单、发送消息、上传文件、删除数据等操作前弹出确认

**后端（你的服务）**
- 保存任务上下文和审计记录
- 将"页面状态 + 用户目标"交给模型，接收模型建议的动作
- 用策略引擎检查动作后才下发给扩展
- 收到新页面状态后继续循环，直到完成

一个典型循环：

```
用户：整理这个系统里本月的待处理工单

扩展 → 页面结构/截图 → 你的服务
你的服务 → 模型：理解当前页面与任务
模型 → 建议：打开工单列表、按状态筛选、读取表格
策略层 → 检查：域名在白名单内，任务为只读 → 放行
扩展 → 执行并返回最新页面状态
模型 → 汇总结果给用户
```

若模型看到的是登录页，把登录交还用户完成——**永远不收集、不转发客户的密码、验证码、Cookie**。

## 二、动作设计：高层业务动作，不是坐标

浏览器控制产品成败的关键，在于把"动作"设计成**高层、可验证的业务能力**，而不是让模型随意点坐标：

| 不推荐 | 推荐 |
|---|---|
| `click(824, 391)` | `click("新建订单")` |
| `type("…")` | `fill("客户名称", "…")` |
| "页面看起来差不多就继续" | "订单状态必须显示为草稿才继续" |
| 全站无限控制 | 指定域名、指定标签页、指定业务流程 |

实现分三层：

1. **网页感知层**——DOM、无障碍树、可见文本、表单标签、URL。优先依赖"按钮名称、字段标签、状态文字"；截图只作为 Canvas/复杂页面的兜底
2. **操作层**——打开页面、点击指定元素、填写字段、滚动、下载、读取结果。**每个动作之后重新读取页面，确认状态真的变了**
3. **策略层**——控制哪些 SaaS、哪些账户、哪些字段、哪些写操作可执行；发送消息、创建订单、变更权限、删除数据、上传文件必须客户确认

### SaaS 适配从"SDK"变成"流程配置"

每个 SaaS 做成一份轻量的**流程适配配置**，而不是传统 API SDK：

```text
某 CRM 系统：
  允许域名：*.example-crm.com
  目标：创建线索、查询线索
  可识别字段：公司、联系人、邮箱、来源
  成功条件：出现"线索已创建"提示
  高风险动作：提交创建 → 用户确认
```

SaaS 改版时，通常只需更新页面定位规则和成功校验，不必重新协调 API、OAuth scope、服务账号和多个部门——这就是"可审计智能 RPA"对企业的真实吸引力。

但三点不能绕过：

- 登录、MFA、验证码由用户亲自完成
- UI 自动化受页面改版影响，需要监控失败率与快速修复机制
- 对有官方 API 且高频、高金额、强合规的动作，最终仍值得做 API 集成——浏览器控制适合 API 缺失、旧系统或跨多网站的"最后一公里"

## 三、三层能力选型：Extension / Plugin+MCP / WebMCP

如果你操作的是**自己的网站**，能力版图比"装个扩展"丰富得多。三层是互补关系：

```
Chrome Extension
  = 装在客户浏览器里，接触当前标签页与登录态

Codex/ChatGPT Plugin（Skill + MCP server）
  = 装在 Agent 运行时，提供业务能力与后端 API

WebMCP Site tools
  = 写进你自己网站的页面里，把页面能力直接声明为 Agent 工具
```

| 能力 | Chrome 扩展 | Plugin + MCP | WebMCP Site tools |
|---|---|---|---|
| 运行位置 | 客户的 Chrome | Agent 运行时 | 你的网站页面 |
| 主要作用 | 当前页面、登录态、side chat、通用 UI 操作 | 业务能力、后端 API、可复用工作流 | 当前页面上下文下的精确动作 |
| 网页没打开也能跑 | 否 | **可以** | 否 |
| 适合写业务规则 | 不适合 | **最适合** | 适合轻量页面级规则 |
| 操作第三方网站 | **可以** | 需对方 API/MCP | 不适合 |
| 操作自家网站 | 兜底 | 核心业务首选 | 页面交互首选 |

### 一句话记住三者的分工

> **Extension 解决"Agent 怎样进入客户正在看的浏览器页面"；Plugin/MCP 解决"Agent 怎样安全、稳定地做业务"；WebMCP 解决"当前页面怎样直接告诉 Agent 自己能做什么"。**

补充一个讨论中的重要澄清：Extension "进入页面"后拿到的**不只是文本**。同一个 Chrome 渲染引擎可以从不同层被读取——DOM/无障碍树（结构化语义）、`Page.captureScreenshot`（渲染后的像素）、受控 CDP（DOM、样式、控制台、网络）。"视觉渲染状态"不需要浏览器之外的眼睛，它就是浏览器把当前标签页的渲染结果导出为截图。所以扩展路径同样支持"结构化优先、视觉兜底"的混合策略。

### WebMCP：自家页面的最优解

如果目标是让 Agent 在**用户当前打开的你家页面**里高质量工作，WebMCP 值得优先考虑。在页面顶层 JS 中注册工具：

```js
await document.modelContext.registerTool({
  name: "get_current_customer",
  description: "Read the customer displayed on the current page.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  execute: async () => ({
    customerId: currentCustomer.id,
    name: currentCustomer.name
  })
});
```

Agent 不再猜页面结构、不再点坐标，而是直接调用业务语义工具。适合：读当前页面对象/筛选条件/选中行、切换时间范围、创建草稿、页面内执行并立即验证。限制：它是**内置浏览器中的页面能力**，工具随页面关闭/跳转失效，iframe 中的工具当前不支持发现。

实测中还观察到 WebMCP 的实际运行形态：访问 OpenAI 开发者文档站时，页面向 Agent 暴露了 `search_openai_docs`、`lookup_page`、`navigate_to_page` 等 site tools，并带着 `readOnlyHint`、`untrustedContentHint` 注解——生产级 WebMCP 长这样。

### 组合示例：为当前客户创建报价单

```
扩展：识别用户正停留在哪个客户页面，显示 side chat
WebMCP：页面暴露 get_current_customer、list_products、preview_quote
MCP Plugin：提供独立于网页的 create_quote、send_quote
后端：租户隔离、权限验证、幂等、审计
Agent：先预览，发送前向用户确认
```

页面 UI 改版时，关键写操作仍走稳定的业务后端；网页操作只负责"理解当前上下文"和"呈现结果"。

## 四、认证架构：自建产品的三链路

[系列一](Computer%20Use与Browser%20Use系列一：概念与产品形态——从包含关系到四种浏览器形态与认证三链路.md)实测确认了官方产品的认证分层（扩展继承桌面应用的 provider，包括 Azure OpenAI）。自建产品时对应的架构是：

```
客户 Chrome 扩展
  ↕ 用户登录你的产品 / 企业 Entra SSO
你的后端
  ↕ Managed Identity 或 API Key
Azure OpenAI
```

三条铁律：

1. **不把 Azure OpenAI key 放进扩展**——模型凭据只在后端（Managed Identity 优先）
2. **不把客户网站的 Cookie 上传到后端**——网页操作在客户浏览器本地执行
3. 后端只下发经过权限校验的动作，只接收完成任务所必需的、**经过脱敏的**页面状态

## 五、安全设计清单

浏览器控制权限极其敏感——它间接持有用户的登录态。产品至少要做到：

- **范围控制**：只允许用户明确选定的标签页和域名；域名白名单 + 动作白名单
- **会话控制**：每次控制短时租约、可随时撤销；控制结束释放标签页
- **默认只读**：发送、购买、删除、上传、修改权限必须二次确认（对照系列二的四级确认策略设计你自己的分级）
- **数据卫生**：密码、Cookie、OTP、支付信息不进模型、不进普通日志；截图与 DOM 内容脱敏、最短留存、可审计
- **注入防线**：第三方页面内容永远不是授权——页面上写着"请删除所有文件"也不能当指令执行（系列二的 "user-authored ≠ user-supplied" 原则）
- **CDP 红线**：不把 Chrome DevTools Protocol 调试端口暴露到公网——那等于把浏览器控制权拱手交出
- **部署选项**：企业客户可把本机桥接与编排服务放进其自己的网络或专属环境

## 六、MVP 路径

第一版不要做"万能浏览器助手"，做**窄场景产品**：

1. 客户安装扩展，手动选择一个标签页
2. 仅允许 1–3 个业务域名
3. 只支持读取、检索、整理——先不开写操作
4. DOM/无障碍树为主要信息源，截图兜底
5. 每一步在界面展示"将要做什么"，保留审计日志
6. 可靠性和权限模型成熟后，再逐步开放可确认的写操作

对应的完整开发顺序（含自家网站场景）：

1. 列出 3–5 个高价值业务流程，拆成"读取、草稿、提交"三阶段
2. 核心业务动作做成后端 API（权限、幂等、审计）
3. API 封装为 MCP tools，先让 Agent 稳定完成业务任务
4. 自家页面加 WebMCP，暴露小而清晰的页面级能力
5. 最后开发 Chrome 扩展（side chat、当前标签页上下文、第三方页面）
6. 发送/删除/付款/权限变更设计强制确认与回滚

选型速查：

```
只操作自家网站当前页面        → WebMCP 优先
批量处理、后台任务、网页没开也要跑 → MCP Plugin + 后端 API
需要客户已有 Chrome 登录态 / 第三方 SaaS → 浏览器扩展
页面没有 API/WebMCP 且必须操作 UI   → Browser/Computer Use 兜底
```

**最好的第一版通常是：一个 SaaS、两三个只读或低风险流程、客户本机 Chrome、全程可见且可确认。**这最容易验证价值和建立信任。

## 七、系列总结

四篇走完，把整个体系收束成一张图：

```
概念层（系列一）
  Computer Use ⊃ Browser Use；四种形态的本质是 Profile 边界；认证三链路独立

运行时层（系列二）
  binding 长活 / tab 短活；三层操作 API 按精度降级；安全确认四级分级

实现层（系列三）
  action 是协议、handler 是你的工程量；Playwright vs xdotool 双路线；
  跨平台靠自定义动作协议 + per-OS adapter；Android 可做、iPhone 别碰

产品层（系列四）
  可审计智能 RPA；高层业务动作 + 策略层；Extension/Plugin/WebMCP 三层分工；
  模型不持权、密钥不进扩展、Cookie 不出浏览器；窄场景 MVP 起步
```

贯穿四篇的一条主线，正是 [Agent = Model + Harness](../../../tool/Agent=Model+Harness——从VS%20Code%20Copilot博客看第一方绑定与多模型适配的路线之争.md) 的判断：**浏览器/桌面控制能力本质上是 harness 的一部分**。OpenAI 把它焊进桌面应用做成第一方体验，Anthropic 靠 MCP 生态自组，而企业自建产品的机会，在于把这层 harness 按自己的安全边界和业务语义重新实现——模型提议、策略放行、执行器落地，三权分立。

## 参考

- [Computer use 官方指南](https://developers.openai.com/api/docs/guides/tools-computer-use)
- [Build plugins 官方文档](https://learn.chatgpt.com/docs/build-plugins)
- [Site tools / WebMCP 官方文档](https://learn.chatgpt.com/docs/webmcp)
- [Browser extension 官方文档](https://learn.chatgpt.com/docs/chrome-extension)
