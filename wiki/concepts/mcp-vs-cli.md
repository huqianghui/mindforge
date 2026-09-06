---
title: "MCP vs CLI"
created: "2026-04-13"
updated: "2026-09-06"
tags:
  - wiki
  - concept
  - mcp
  - cli
  - tool-integration
aliases:
  - "MCP vs CLI"
related:
  - "[[context-engineering]]"
  - "[[opencli]]"
---

# MCP vs CLI

## 摘要

MCP 和 CLI 是 AI Agent 工具集成的两条路线。MCP 的优势是跨应用通用性和动态工具发现，但存在严重的 context 膨胀问题（70+ 工具消耗 15,000-25,000 tokens）。CLI 利用 model 预训练知识，token 效率极高，但缺乏协议级标准化。社区出现了"抛弃 MCP、回归 CLI"的趋势，但两者应共存互补。

## Claims

### Claim: MCP 存在严重 context 膨胀问题

- **来源**：[[MCP vs CLI — 为什么开发者在重新审视 MCP]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 每个 MCP Server 在每次推理调用时通过 tools/list 注入所有工具定义。70+ 工具消耗 15,000-25,000 tokens，占 context window 10%+。

### Claim: CLI 方式 token 效率极高

- **来源**：[[MCP vs CLI — 为什么开发者在重新审视 MCP]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 只需单个 Bash tool 定义，model 利用预训练知识理解命令行工具。

### Claim: 社区出现"回归 CLI"趋势

- **来源**：[[MCP vs CLI — 为什么开发者在重新审视 MCP]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：stale

> 驱动因素：MCP 的运维复杂度（额外 server 进程、调试困难、第三方信任需求）。

### Claim: MCP 与 CLI 应共存互补

- **来源**：[[MCP vs CLI — 为什么开发者在重新审视 MCP]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> MCP 的优势是跨应用通用性和动态工具发现；CLI 的优势是成熟 Unix 生态、零协议开销、直接进程调用。选择不是二元的。

### Claim: Azure Skills 是 MCP/CLI 共存互补的最佳实战案例

- **来源**：[[Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践]]
- **首次出现**：2026-05-14
- **最近更新**：2026-05-24
- **置信度**：0.8
- **状态**：stale

> Azure Skills 在剧本中预编排了 MCP/CLI 分工：关键专有 API（AppLens 诊断、Resource Health）走 MCP，常见成熟命令（azd up、terraform apply、kubectl）走 CLI。选择标准：模型是否熟悉 + CLI 有无等价命令 + 操作复杂度 + 安全敏感度。MCP 用上下文空间换取调用精确度；CLI 用模型内置知识换取上下文节省。

### Claim: WebMCP 把工具集成的选型从 MCP/CLI 二元扩展为三层——自家页面场景的最优解

- **来源**：[[Computer Use与Browser Use系列四：产品化——可审计智能RPA、Extension-Plugin-WebMCP三层选型与安全设计]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-30
- **置信度**：0.7
- **状态**：active

> 浏览器操作产品化引入第三层：**WebMCP site tools**——页面顶层 JS 里 `document.modelContext.registerTool()` 把页面能力直接声明为 agent 工具（带 readOnlyHint/untrustedContentHint 注解），agent 不再猜 DOM、不点坐标，直接调业务语义工具。三层分工：Extension 解决"进入用户正在看的页面"（登录态）、Plugin+MCP 解决"安全稳定做业务"（页面没开也能跑）、WebMCP 解决"当前页面告诉 agent 自己能做什么"（工具随页面关闭失效）。选型判据从"MCP 上下文换精度 vs CLI 内置知识换节省"扩展为按运行位置分层：操作自家页面 → WebMCP 优先；后台任务 → MCP+API；第三方站点 → Extension/浏览器控制兜底。OpenAI 开发者文档站已实测暴露 search/lookup/navigate site tools——生产级 WebMCP 已存在。

### Claim: MCP 的非典型用法——同一产品内部 CLI↔native helper 的解耦协议

- **来源**：[[Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链]]
- **首次出现**：2026-09-05
- **最近更新**：2026-09-06
- **置信度**：0.7
- **状态**：active

> Codex Desktop 的 Computer Use 调用链（bundled CLI → computer-use plugin → **MCP** → SkyComputerUseClient/Service → macOS Accessibility）展示了 MCP 的第三种角色：既不是"跨应用接第三方工具"、也不是与 CLI 对垒的外部工具接入路线，而是**同一产品内部两个第一方组件之间的进程间解耦协议**——plugin 的 `.mcp.json` 把 MCP server 的 command 直接指向同一 App bundle 里的 native 可执行文件。对选型框架的含义：MCP 的协议价值不只在开放生态互操作，也在"把平台专有 runtime（受签名、TCC 权限、进程树绑定的 native 能力）与可开源的 agent 引擎干净分层"——CLI 一侧保持开源与可移植，重能力收进专有 helper，两者之间只剩一个标准协议界面。

## 冲突与演进

- 2026-08-30：注入 WebMCP 三层选型 Claim（Computer Use 系列四），页面由全 stale 注入 active 新证据；4 月的 MCP/CLI 二元对比 Claims 维持 stale，其结论被三层框架包含而非推翻。
- 2026-09-06：注入"MCP 作同产品内解耦协议"Claim（Codex Desktop 系列04）——MCP 角色谱系从"外部工具接入"扩展出"产品内部组件分层"一档。

## 关联概念

- [[context-engineering]] — `part-of` MCP 是 Context Engineering 的工具接入层
- [[opencli]] — `contrasts` OpenCLI 为 CLI 路线提供标准化接口描述
- [[rtk-token-compression]] — `contrasts` RTK 选择 CLI 代理而非 MCP 协议，体现两条工具集成路线的不同取舍

## 来源日记

- [[MCP vs CLI — 为什么开发者在重新审视 MCP]] — MCP 与 CLI 对比分析
- [[Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践]] — Azure Skills 的 MCP/CLI 分工实证
- [[Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链]] — MCP 作同产品内 CLI↔native helper 解耦协议的非典型用法
