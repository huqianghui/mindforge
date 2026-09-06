---
title: "Codex Desktop Architecture（Codex Desktop 架构机制）"
created: "2026-09-06"
updated: "2026-09-06"
tags:
  - wiki
  - concept
  - agent
  - codex
  - harness
  - bundle
  - computer-use
aliases:
  - "Codex Desktop 架构"
  - "三元组合公式"
related:
  - "[[model-harness-codesign]]"
  - "[[computer-use]]"
  - "[[mcp-vs-cli]]"
  - "[[harness-portability-spectrum]]"
---

# Codex Desktop Architecture（Codex Desktop 架构机制）

## 摘要

Codex Desktop（现顶着 ChatGPT.app 的名字，bundle identifier 仍是 `com.openai.codex`）的正确心智模型不是"CLI 包了个 GUI"，而是一个**三元组合的 runtime distribution**：ChatGPT 壳（Desktop UI）+ bundled Codex CLI（agent 引擎）+ bundled plugins（computer-use 等能力 payload）。三元各有独立版本与能力边界，被 Apple Bundle 机制捆成一个"文件"分发。

本页是 Codex Desktop 系列01~06（2026-09-05 六篇逆向/实测批次）的**伞形索引页**：自有论断只收"架构组合"与"接入操作面"两层；per-model harness 切片、治理层断供、分发链、MCP 解耦等重量级论断已分散归口到通用概念页，本页以路由索引指向（见下），不重复收录。定位类比 [[graph-engineering]] 的伞形页先例。

与 Claude Code 的架构对照是理解本页的最短路径：**Codex 把几乎所有 harness 行为下沉为 per-model 数据（每个模型自带一套 harness 切片），Claude Code 则是一套全局 harness 配多个可换模型**——两种第一方绑定哲学的完整对照见文末对照表。

一个重要的定性：本页记录的这套机制（per-model 切片、code_mode 工具语言化、bundled payload 分发、条目级治理四件套）**是一次连贯的方向性尝试，不是行业定局**——它是 harness 设计空间里的一种路线选择，与 Claude Code 的全局 harness + 离散工具 + 开放扩展面构成一场正在进行的活体对照实验。两条路线各自的取舍（表达力 vs 治理面、绑定深度 vs 可移植性）见对照表与 [[model-harness-codesign]] 的"垂直/水平长期共存"判断。

## Claims

### Claim: Codex Desktop 是三元组合的 runtime distribution——三版本号互相独立，排查一律问包内二进制

- **来源**：[[Codex Desktop系列03：bundled的真正含义与三版本号——Apple Bundle概念、同源不同发行版与com.openai.codex血缘]]、[[Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链]]
- **首次出现**：2026-09-05
- **最近更新**：2026-09-06
- **置信度**：0.85（本机实测 + codesign 验证 + 官方 issue 佐证）
- **状态**：active

> `Codex Desktop = ChatGPT 壳 + bundled CLI + bundled plugins`。三个部分版本互相独立：App version（26.901.x）、bundled CLI（`/Applications/ChatGPT.app/Contents/Resources/codex --version`，如 0.153.1）、terminal CLI（Homebrew/npm 另装，如 0.153.4）——**排查任何 Desktop 行为一律以包内二进制版本为准**，App 自身版本号对定位 schema/行为无用。bundled CLI 与 standalone CLI 是**同源不同发行版**：同一个 openai/codex 开源项目、两条发行通道、与 App 配套测试的不同 build；能力差异出在 build 之外的 App 环境层（签名/Apple Events/进程树）。血缘证据：`codesign -dv` 显示 ChatGPT.app 的 bundle identifier 仍是 **`com.openai.codex`**——新 ChatGPT.app 是 Codex Desktop 演化出的统一壳（Chat + Work + Codex），不是 Classic 加了个 Codex。三元中**只有 CLI 一元开源**（且只是一个特定 build），壳与能力 payload 均为 proprietary。

### Claim: 第三方 provider 接入是"逐层可撬性"问题——目录层可替换、工具层不可补、治理层必须显式覆盖，评估要按层给答案

- **来源**：[[Codex Desktop系列01：接入Azure OpenAI GPT-6——bundled CLI版本锁定、model catalog schema与分层排错]]、[[Codex Desktop系列02：gpt-5.4-mini与三条暗线——全局配置菜单、退休元数据与自动审批调用链]]
- **首次出现**：2026-09-05
- **最近更新**：2026-09-06
- **置信度**：0.85（Azure GPT-6/mini 全链路实测验收）
- **状态**：active

> Codex harness 对第三方 provider 的态度是**分层的"默认绑定 + 可撬"**，每层答案不同：① **模型目录层可替换**——`model_catalog_json` 整体替换（非 merge），schema 跟 bundled CLI 版本走（`rust-vX.Y.Z` tag 是唯一可靠坐标，手写和 main 分支都走不通），且官方 catalog 里第三方场景要的模型定义往往齐全、只是 `visibility: "hide"`（翻 visibility 即可，不必造轮子）；② **服务端工具层不可补**——harness 检测到自定义 provider 后拒发 web_search 声明；③ **治理层必须显式覆盖**——审批等隐藏模型调用跟 provider 走，需 `auto_review_model_override` 指向真实 deployment。配套操作纪律：模型菜单读全局配置（`cwd: null`），项目级 catalog 控制不了它；退休元数据（`upgrade`/`retirement_at`）是 OpenAI 第一方生命周期信息、与自己 Azure deployment 无关，清 `null`；分层排错顺序 schema 层 → provider 层 → API 兼容层，一次只动一层。结论：评估"某 harness 能不能接自家模型端点"应该**按层给出答案**，而不是一个总体是否。（断供侧的三层框架——工具层/目录层/治理层——归口 [[computer-use]]，本条是同一链路的接入操作面。）

### Claim: gpt-6-astra 条目显示 Computer Use 是最强模型档的发力方向——治理与运行时围绕最新模型配齐

- **来源**：[[Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链]]、[[Codex Desktop系列06：ModelInfo字段值手册——unified_exec、code_mode、Ultra档与治理字段的源码级解读]]
- **首次出现**：2026-09-06
- **最近更新**：2026-09-06
- **置信度**：0.75
- **状态**：active

> 从最强模型条目的字段配置能读出能力投资方向：gpt-6-astra 的 ModelInfo 自带 computer/browser use 的**全套治理内容**——`confirmation_policies` 四级确认政策全文、guardian 的 `node_repl_policy.md` 专管 "computer and browser use via node_repl or cua_repl"；运行时侧，`cua_repl`（cua = Computer Use Agent）是与 node_repl 同一 bundled Node.js 24 运行时的 Computer Use 变体（App bundle 内 `cua_node/` 目录），`tool_mode: code_mode_only` 下桌面/浏览器操作与其他工具一样走 JS 编排、收进单一治理入口。结合分发链事实（payload 只随 Apple Silicon 的第一方 App 分发、standalone CLI 与 Intel 构建都不带），可见 **Computer Use 能力栈是围绕"最新模型档 × 第一方 App 形态"优先配齐的**：老模型（mini，`direct`）与 CLI 发行版都不在第一梯队。这与 ChatGPT Work 把 Codex harness 泛化为"通用工作 harness"的产品方向互为表里——通用工作任务需要操作 GUI，Computer Use 就是最新模型档的发力点。

## 论断路由索引（已归口的重量级论断，此处不重复收录）

| 论断 | 归口页 | 一句话 |
|---|---|---|
| per-model harness 实例化（九层解剖、"每模型自带 harness 切片"、schema 校验=拒绝启动行为未定义的 agent、Ultra=多 agent 委派开关、alias 化石） | [[model-harness-codesign]] | co-design 证据从论断层升级到源码字段层 |
| tool_mode 光谱 Direct→CodeModeOnly（CodeAct 动机、单一治理入口、「更多的工具」vs「一种语言」） | [[model-harness-codesign]] | 工具调用形态也是 per-model co-design 对象 |
| 治理层断供（审批=第二条隐藏模型调用链、codex-auto-review 常量、断供三层框架） | [[computer-use]] | 接第三方要盘点 harness 全部模型调用 |
| Computer Use 分发链（分发态 App bundle/运行态 ~/.codex、feature flag≠payload、签名/TCC/进程树不可拆） | [[computer-use]] | 第一方绑定的分发层形态 |
| MCP 作同产品内 CLI↔native helper 解耦协议 | [[mcp-vs-cli]] | MCP 角色谱系的"产品内部分层"一档 |

**挂起候选**（单批次未达 2+ 门槛，见 LOOP_STATE 待审区）：`apple-bundle`、`unified-exec-persistent-shell`、`code-mode-tool-calling`——任一升格建页后应回挂本页关联。

## 与 Claude Code 的架构对照

| 维度 | Codex Desktop | Claude Code |
|---|---|---|
| harness 归属 | **per-model 实例化**：系统提示词/工具形态/治理/编排/上下文机制全随模型条目分发 | **全局 harness**：系统提示词、权限模式、hooks 是全局资产，模型只是可换参数 |
| 工具调用哲学 | 最强模型 `code_mode_only`——能力做成「一种语言」（JS 编排，node_repl 单一治理入口） | Direct 端——能力做成「更多的工具」（几十个离散工具点名直调，per-tool 权限清晰） |
| 能力扩展分发 | bundled plugin payload 随第一方 App 走（Computer Use 不随开源 CLI） | MCP 生态自组 + Skill/Plugin 开放目录 |
| 上下文压缩 | 机制 prompt 全存模型条目（catalog 数据，逐模型可调） | compaction 为 harness 内建行为（黑盒） |
| 开源边界 | 仅 CLI 一元开源（特定 build），壳与 payload proprietary | CLI 闭源但扩展面（skill/hook/MCP/subagent）全开放 |
| 第三方模型接入 | 可撬但逐层功课（本页 Claim 2 + 九层核对） | `model` 参数即换（代价：服务端工具层断供同样存在，见 [[computer-use]]） |

两列的深层分歧就是 [[model-harness-codesign]] 的路线之争在数据结构层的投影：绑定越深，"接上推理端点"离"接上完整 agent"越远。

**读这张表的正确姿势是"两组实验假设"而非"两份产品说明"**：Codex 这一列押注"模型足够强时，harness 应该跟着模型走"（切片化、代码化、payload 化都是这个假设的推论）；Claude Code 那一列押注"harness 是长期资产，模型是可替换引擎"。哪个假设赢，取决于模型能力演进速度与企业对可控性/可移植性的需求强度——目前两条路线都在加注（Codex 给老模型保留 direct、Claude Code 也在靠近 MCP code execution），中间态互相渗透恰是"尝试"而非"定局"的证据。后续观察锚点：xAI grok-build 等新入场第一方 harness 会选哪一侧、DSH"Everything is a Plugin"会不会成为第三条可分解路线（见 [[model-harness-codesign]] 绑定×可分解十字定位）。

## 冲突与演进

- 2026-09-06：建页（用户裁决）。定位为系列01~06 的伞形索引页——"产品名不建页"先例不变（本页主语是架构机制而非产品）；已归口论断只做路由不复制，自有 Claims 收"三元组合/接入操作面/Computer Use 发力方向"三条此前无归口的论断。

## 关联概念

- [[model-harness-codesign]] — `grounds` 三元组合与 per-model 切片架构为"第一方绑定路线"提供字段级实证载体
- [[computer-use]] — `uses` Computer Use 是 bundled plugins 一元的旗舰 payload；其分发链与治理层论断归口该页
- [[mcp-vs-cli]] — `uses` 架构内部用 MCP 作 CLI↔native helper 的解耦协议
- [[harness-portability-spectrum]] — `grounds` bundled payload 随第一方 App 分发 = 可移植性光谱"不可移植端"的实证

## 来源日记

- [[Codex Desktop系列01：接入Azure OpenAI GPT-6——bundled CLI版本锁定、model catalog schema与分层排错]] — 目录层可撬性、版本锁定、分层排错
- [[Codex Desktop系列02：gpt-5.4-mini与三条暗线——全局配置菜单、退休元数据与自动审批调用链]] — 全局配置、退休元数据、审批调用链三条暗线
- [[Codex Desktop系列03：bundled的真正含义与三版本号——Apple Bundle概念、同源不同发行版与com.openai.codex血缘]] — 三元组合公式、三版本号、血缘
- [[Codex Desktop系列04：Computer Use藏身之处——openai-bundled plugin、SkyComputerUse native helper与分发链]] — 分发链、cua_node、两种 plugins 目录
- [[Codex Desktop系列05：一个模型条目装下整个harness——从gpt-6-astra展开配置看Model与Harness的真实边界]] — 九层解剖（论断归口 codesign）
- [[Codex Desktop系列06：ModelInfo字段值手册——unified_exec、code_mode、Ultra档与治理字段的源码级解读]] — 源码级字段核实、cua_repl、治理字段
