---
title: Codex Desktop系列06：ModelInfo字段值手册——unified_exec、code_mode、Ultra档与治理字段的源码级解读
created: 2026-09-05
tags:
  - AI
  - agent
  - codex
  - harness
  - model-catalog
  - source-code
---

# Codex Desktop 系列06：ModelInfo 字段值手册——unified_exec、code_mode、Ultra 档与治理字段的源码级解读

> 系列导航：[系列01：接入 Azure GPT-6](Codex%20Desktop系列01：接入Azure%20OpenAI%20GPT-6——bundled%20CLI版本锁定、model%20catalog%20schema与分层排错.md) ｜ [系列02：mini 与三条暗线](Codex%20Desktop系列02：gpt-5.4-mini与三条暗线——全局配置菜单、退休元数据与自动审批调用链.md) ｜ [系列03：bundled 与三版本号](Codex%20Desktop系列03：bundled的真正含义与三版本号——Apple%20Bundle概念、同源不同发行版与com.openai.codex血缘.md) ｜ [系列04：Computer Use 藏身之处](Codex%20Desktop系列04：Computer%20Use藏身之处——openai-bundled%20plugin、SkyComputerUse%20native%20helper与分发链.md) ｜ [系列05：模型条目装下整个 harness](Codex%20Desktop系列05：一个模型条目装下整个harness——从gpt-6-astra展开配置看Model与Harness的真实边界.md) ｜ 本篇

> 素材：`openai/codex` 仓库 `rust-v0.153.1` tag 的源码浅克隆逐字段核实。结构体定义在 `codex-rs/protocol/src/openai_models.rs:392`（`ModelInfo`），本文所有"作用"和"取值"均以实际消费代码为准，标注 `文件:行号`。

## 引言：从"字段住在哪层"到"每个值是什么"

[[Codex Desktop系列05：一个模型条目装下整个harness——从gpt-6-astra展开配置看Model与Harness的真实边界]] 把 `gpt-6-astra` 条目按职责分了九层；本篇下探一级：**每个字段在源码里被谁消费、有哪些合法取值、值与值之间差在哪**。这是给自己维护 Azure catalog 用的手册——改任何字段之前，先在这里查它真正控制什么。

先记一个总原则：**字段分两类**。一类在 Rust `ModelInfo` 结构体里，由 CLI/core 消费；另一类不在结构体里（`prefer_websockets`、`available_in_plans`、`requires_sandboxed_review`），由后端 `/models` 接口和 Desktop TS 层消费——CLI 的 serde 会忽略未知字段，所以这类字段写在自定义 catalog 里不影响 CLI 加载，但也别指望 CLI 对它们有任何行为。

## 一、执行与工具字段

### shell_type：模型用什么方式碰 shell

```rust
// protocol/src/openai_models.rs:302
pub enum ConfigShellToolType {
    #[serde(alias = "default", alias = "local", alias = "shell_command")]
    UnifiedExec,
    Disabled,
}
```

0.153.1 里实际只有两个值：

| 值 | 含义 |
|---|---|
| `unified_exec` | 模型获得 `exec_command` + `write_stdin` 两个工具组成的**持久 shell 会话**能力 |
| `disabled` | 模型完全没有 shell 工具 |

**`unified_exec` 到底是什么**：它不是"一次调用跑一条命令"的旧式 shell 工具，而是一个会话式执行器——`exec_command` 启动/复用一个带 session 的进程，`write_stdin` 可以向运行中的进程继续写输入（`core/src/tools/router.rs:166-167` 证实这两个工具名成对暴露；`core/tests/suite/unified_exec_stdin_approval.rs` 等测试覆盖 stdin 写入的独立审批）。这让模型能操作交互式程序（REPL、向导式 CLI、需要确认的安装脚本），而不是每条命令开一个新 shell。它还有两种运行模式（`tools/src/tool_config.rs:29`）：`Direct`（直接起进程）和 `ZshFork`（满足一组 feature flag 且用户 shell 是 zsh 时，fork 用户的 zsh 环境执行——继承用户的 PATH/alias/函数，行为更接近"用户自己敲的命令"）。

**alias 是历史化石**：`shell_command`、`local`、`default` 这些旧值全部被 serde alias 归一化为 `UnifiedExec`。所以 mini 条目里的 `"shell_type": "shell_command"` 在 0.153.1 运行时与 astra 的 `unified_exec` 行为相同——字段值的差异记录的是"该模型当年在什么工具形态上训练"，而运行时行为已收敛。这修正了系列05 的一处表述：co-design 的证据不是"两个模型用两种 shell 工具"，而是"枚举里留着 alias，说明工具形态跟着模型代际演进过"。

### tool_mode：工具怎么被调用

```rust
// protocol/src/openai_models.rs:334
pub enum ToolMode { Direct, CodeMode, CodeModeOnly }
```

| 值 | 含义 |
|---|---|
| `direct` | 经典形态：每个工具是一个独立 function call |
| `code_mode` | 混合：工具既可直接调，也可在代码执行环境（node_repl）里以 API 形式批量编排 |
| `code_mode_only` | 工具**只能**通过写代码调用——模型写 JS，在 node_repl 里 `await` 工具 API |

`core/src/tools/router.rs:147`：`CodeMode | CodeModeOnly` 都会启动 code-mode dispatcher（仓库里有整套 `code-mode` / `code-mode-host` / `code-mode-runtime` crate）。astra 是 `code_mode_only`——这解释了系统提示词里那句"Batch independent searches and reads in one functions.exec using await Promise.allSettled"：**批量并行工具调用是用 JS 语法而不是 parallel function calls 表达的**。也把 `node_repl_auto_review_required: true` 串起来了：工具全走代码执行，代码执行就成了需要审批模型盯着的入口。

### 澄清：这里的"代码执行环境"是 Node.js，不是 Python Code Interpreter

前面反复出现的 node_repl 容易和 ChatGPT 的 Code Interpreter 混为一谈，其实是两个层次的东西，语言也不同。

先说底层是什么：node_repl 是**真正的 Node.js 运行时**——App bundle 里直接带了一整套，`/Applications/ChatGPT.app/Contents/Resources/cua_node/` 下有 `bin/node`（实测 v24.19.0）、专门编译的 REPL 宿主 `bin/node_repl`、以及 `lib/node_modules` 和 npm/npx/corepack；`manifest.json` 写着 `"node_version": "24.19.0"`。源码侧 `protocol/src/mcp.rs:38-39` 把名为 `node_repl` 和 `cua_repl` 的 server 归为 node_repl-backed，code_mode 的执行 handler（`execute_handler.rs:199`）对非 JS 输入直接报错 **"expects raw JavaScript source text"**——模型往里写的就是 JavaScript 源码。

再说它和 Code Interpreter 的区别——不是同一能力的两个语言版本，而是不同层：

| | ChatGPT Code Interpreter | Codex node_repl / code_mode |
|---|---|---|
| 语言 | Python（Jupyter 式沙箱） | JavaScript / Node.js 24 |
| 定位 | **面向用户的能力**：数据分析沙箱 | **harness 内部的工具调度层** |
| 里面能调什么 | Python 标准库 + pandas/numpy/matplotlib、上传文件跑分析 | harness 把可用工具暴露成一套 **JS API**，模型写 JS 去 `await` 它们 |
| 典型用法 | "帮我分析这个 CSV" → 后台跑 Python | `await Promise.allSettled([functions.exec(...), ...])` 批量并行调工具 |
| 产物 | 图表、计算结果 | 工具调用的编排与结果 |

一句话：**Code Interpreter 是"给模型一个 Python 沙箱去算数据"；node_repl 是"把工具调用本身改成写代码来发起"**（业界称 code mode / code action——用代码编排工具，比死板的 parallel function calling 更灵活）。这里用 JS 而非 Python，是因为 Codex 的工具生态（MCP、plugins、computer-use native helper）本就是 JS/TS 世界，暴露成 async JS API + Promise 批处理天然贴合其异步工具模型。旁边的 `cua_repl`（cua = Computer Use Agent）是同一 Node 运行时的 Computer Use 变体——桌面/浏览器操作也走这条 REPL（系列04 的 SkyComputerUse 调用链、以及 guardian 的 `node_repl_policy.md` 专管"computer and browser use via node_repl or cua_repl"，都落在这里）。

### 其余工具字段

| 字段 | 取值 | 作用（源码） |
|---|---|---|
| `apply_patch_tool_type` | `freeform` / null | 文件修改工具的协议形态。0.153.1 枚举只剩 `Freeform`（patch 以自由文本语法而非 JSON 结构提交，`openai_models.rs:310`）；null = 该模型不用专用 patch 工具 |
| `web_search_tool_type` | `text`（默认）/ `text_and_image` | `core/src/tools/hosted_spec.rs:22-29`：决定搜索工具声明的 `search_content_types`——`text_and_image` 允许搜索结果带图。同一函数实现 Cached/Indexed/Live 三档 `external_web_access`（系列七 3.3 的服务端阉割逻辑就在这） |
| `experimental_supported_tools` | 字符串白名单 | `core/src/tools/spec_plan.rs:1162-1200`：逐个名字开实验工具——astra 声明的 `send_user_message_async`（干活中途给用户发消息）和 `clock`（clock.sleep 等待），正是 persistent mode 的两块基石 |
| `node_repl_disabled` | bool | `core/src/mcp_tool_call.rs:1256`：写进 turn metadata 随请求上行，服务端据此关闭 node_repl |
| `supports_parallel_tool_calls` | bool | MCP 侧并行工具调用开关（`codex-mcp/src/runtime.rs`） |
| `supports_search_tool` | bool | 是否注入搜索工具（`spec_plan.rs`） |
| `supports_image_detail_original` | bool | 允许图片以原始清晰度上传（`core/src/image_preparation.rs`） |

## 二、推理与输出字段

### reasoning effort：完整阶梯比菜单上长得多

```rust
// protocol/src/openai_models.rs:50
pub enum ReasoningEffort {
    None, Minimal, Low, Medium, High, XHigh, Max, Ultra,
    Persistent,
    Custom(String),   // 客户端还不认识的、模型自定义的档位
}
```

三个值得注意的成员：**`Ultra` 不是更深的推理档**——`core/src/client.rs:188-200` 写得很清楚：用户选 Ultra 时，实际推理档从 `multi_agent_reasoning_effort` 解析（astra 配的是 `xhigh`，且代码校验它必须是该模型支持的非 Ultra 档）。Ultra 的真实语义是"进入多 agent 委派模式 + 子工作用指定档位"。**`Persistent` 是一个推理档**——持久模式在类型系统里与 low/high 平级。**`Custom(String)` 是前向兼容口**——服务端可以发客户端还不认识的档位名而不炸 schema。

`supported_reasoning_levels` 是"这个模型的菜单上放哪几档"，`default_reasoning_level` 是默认选中项。系列02 的档位坑在这里有了准确解释：mini 菜单最高 `xhigh`，全局配置的 `ultra` 不在其列表里，继承过去就是非法值。

### 输出控制

| 字段 | 取值 | 作用 |
|---|---|---|
| `default_reasoning_summary` | `auto`（默认）/ `concise` / `detailed` / `none` | 推理摘要的默认档（`protocol/src/config_types.rs:65`）；astra 设 `none`——桌面端默认不展示推理摘要 |
| `supports_reasoning_summary_parameter` | bool | 请求里是否允许带 `reasoning.summary` 参数（`client.rs:916`） |
| `support_verbosity` / `default_verbosity` | bool + `low`/`medium`/`high` | 是否/以什么默认值发 verbosity 参数（`client.rs:996`），控制回答详略 |
| `input_modalities` | `text` / `image` / `audio` | 不只是能力声明——`core/src/mcp_tool_call.rs:548` 会按它**清洗 MCP 工具返回值**：不支持 image 的模型，工具结果里的图片内容直接被滤掉 |

## 三、上下文字段：一套自动压缩的数学

| 字段 | 作用（`openai_models.rs:487-510` 的方法实现） |
|---|---|
| `context_window` / `max_context_window` | `resolved_context_window()`：前者缺省回退后者；`max` 的注释明确是"config override 的上限"——自己往大改窗口，超过 max 无效 |
| `effective_context_window_percent` | `usable_context_window()`：窗口 × 百分比 = 真正可用于输入的额度（扣系统提示词/工具开销/输出预留） |
| `auto_compact_token_limit` | `auto_compact_token_limit()`：缺省取窗口的 90% 作为自动压缩触发线；显式给值也会被钳到 90% 以内——**压缩线写死不超过窗口九成** |
| `comp_hash` | 随 turn 上报的压缩兼容指纹（`core/src/session/turn_context.rs:597`）——标识哪些配置的 compaction 状态可互相衔接 |
| `truncation_policy` | `{mode: bytes 或 tokens, limit: N}`（`openai_models.rs:324`）——**工具输出**的截断策略。astra 是 `tokens/10000`：单个工具结果超一万 token 截断；旧模型用 `bytes` 按字节截。这是防单条 `cat` 大文件撑爆上下文的闸门 |

## 四、治理字段：系列02 的源码收尾

`model-provider/src/provider.rs:131-133` 把系列02 二进制逆向的两个字符串钉在了源码里：

```rust
pub const DEFAULT_APPROVAL_REVIEW_PREFERRED_MODEL: &str = "codex-auto-review";
const API_KEY_APPROVAL_REVIEW_PREFERRED_MODEL: &str = "gpt-5.6-luna";
```

选择逻辑（:368-377）：**API key 认证 → `gpt-5.6-luna`；ChatGPT 登录 → `codex-auto-review`**。Desktop 是 ChatGPT 登录态，命中的是 `codex-auto-review`——这是 Codex 内部的合成审批模型名，不对应任何真实模型，第三方端点上不可能有同名 deployment，所以系列02 的 404 发的是它，而**不是** `gpt-5.6-luna`（后者在用户 Azure 里其实已部署、菜单可见——"需要 override 才修好"恰恰证明默认命中的不是这个已存在的 deployment）。覆盖点在 `core/src/guardian/review.rs:897-898`：

```rust
let model_override = turn.model_info().auto_review_model_override.as_deref();
let review_model_id = model_override.unwrap_or(default_review_model_id);
```

条目里的 `auto_review_model_override` 存在即整体替换默认值——系列02 修复生效的确切代码路径。其余治理字段：

| 字段                               | 取值               | 作用                                                                                        |
| -------------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `node_repl_auto_review_required` | bool             | `guardian/review.rs:949`：审批会话额外保留 developer messages（code_mode_only 下代码执行是主要入口，审批要看得到上下文） |
| `model_specialty`                | `"cyber"` / null | `guardian/review.rs:258`：cyber 专用模型的 guardian 拒绝熔断走独立的 `CyberModel` 策略——安全模型有自己的治理曲线      |
| `requires_sandboxed_review`      | （不在 Rust 结构体）    | App/后端侧字段，CLI 忽略                                                                          |

## 五、编排字段

```rust
// protocol/src/protocol.rs:2997
pub enum MultiAgentVersion { Disabled, V1, V2 }
```

| 值 | 差异（`core/src/tools/spec_plan.rs:644-675`） |
|---|---|
| `disabled` | 无多 agent 工具 |
| `v1` | 旧版线程派生，带 spawn 深度限制检查 |
| `v2` | 新版 `spawn_agent` / `followup_task` / `send_message` 工具集，配套系列05 看到的 root/subagent 角色 prompt |

`multi_agent_reasoning_effort`（astra: `xhigh`）：Ultra 档触发委派后，子 agent 工作的推理档位——见第二节 Ultra 的语义。

## 六、展示、生命周期与分发字段

| 字段 | 取值 | 作用 |
|---|---|---|
| `visibility` | `list` / `hide` / `none` | `app-server/src/models.rs:22`：`include_hidden \|\| preset.show_in_picker`——`hide` 只是不进默认 picker，`model/list` 带 `includeHidden: true` 仍会返回（系列02 的"必要不充分"）；`none` 连隐藏列表也不进 |
| `priority` | 整数 | 模型菜单排序权重 |
| `upgrade` | `{model, migration_markdown, retirement_at}` / null | `ModelInfoUpgrade`（`openai_models.rs:712`）。**源码注释明确 `retirement_at` 是 "Informational"**——CLI 不会因时间过期禁用模型；自动切换是 Desktop UI 层行为（受 ChatGPT 认证状态条件）。第三方 provider 场景清 null 的依据就在这：它只是信息，不适用就删 |
| `availability_nux` | 对象 / null | 新模型的引导弹窗（New User Experience）配置 |
| `minimal_client_version` | 版本三元组 | 后端 `/models` 层的客户端版本门槛（`codex-api/src/endpoint/models.rs`）——低于此版本的客户端拿不到该模型 |
| `service_tiers` / `additional_speed_tiers` / `default_service_tier` | 如 `priority`（"Fast, 1.5x speed"）| 速度档位，Desktop 计费/限速 UI 消费 |
| `available_in_plans` / `prefer_websockets` | （不在 Rust 结构体） | 后端按订阅计划过滤模型 / App 侧传输选 WebSocket |

### model_messages 簇：提示词模板机制

系列05 讲了内容，这里补机制（`openai_models.rs:518-536`、`661-709`）：

- `get_model_instructions()`：有 `instructions_template` 就用；**没有则打 warning 返回空系统提示词**——模型照跑但"裸奔"。
- **人格机制就是模板变量替换**：template 里可以埋 personality 占位符，`instructions_variables` 提供 `personality_default` / `friendly` / `pragmatic` 三段文本，按用户设置填充（`Personality` 枚举：`None`/`Friendly`/`Pragmatic`）。astra 的 `instructions_variables: null`——模板即最终文本，不支持人格切换（`supports_personality()` 返回 false）。
- `include_skills/apps/plugin_usage_instructions` 三个布尔（`core/src/session/world_state.rs:266-271`）：是否额外注入 skills/apps/plugins 使用说明。astra 全 false，因为这些说明已内联在主模板里——**布尔开关和模板内容是配套设计的**，自定义 catalog 时别单改一边。
- `persistent_instructions`：注释写明 "Missing or null uses the built-in instructions; **an empty string disables them**"——null 和空字符串语义不同，这类"三态"字段（null=默认/空=关闭/有值=覆盖）在 model_messages 簇里反复出现，改配置时要留意。

## 小结

1. **`unified_exec` = `exec_command` + `write_stdin` 的持久会话执行器**，支持交互式程序与 stdin 独立审批，另有 ZshFork 模式继承用户 shell 环境；`shell_command` 等旧值已 alias 归一化——工具形态的代际演进留在了枚举的 alias 里。
2. **`code_mode_only` 把工具调用整体搬进代码执行**：并行编排用 JS 表达，node_repl 因此成为治理重点（`node_repl_auto_review_required` 配套）。
3. **Ultra 不是推理档，是多 agent 委派开关**：实际档位由 `multi_agent_reasoning_effort` 决定；`Persistent` 是档位、`Custom(String)` 留前向兼容。
4. **治理链路的两个默认审批模型名以常量形式写死在源码**：API key 认证走 `gpt-5.6-luna`、ChatGPT 登录走 `codex-auto-review`，`auto_review_model_override` 整体替换——系列02 的 404 与修复在源码层完全闭环。
5. **`retirement_at` 是 informational**：CLI 不执行退休，自动迁移是 UI 行为——第三方 provider 清 `upgrade: null` 的依据。
6. **改 catalog 前先分清字段归属**：Rust 结构体外的字段（plans/websockets/最低版本）CLI 一概忽略；结构体内的字段注意三态语义（null=默认、空串=关闭、有值=覆盖）。

## 参考

- [openai/codex 仓库](https://github.com/openai/codex)（本文基于 `rust-v0.153.1` tag 源码：`codex-rs/protocol/src/openai_models.rs`、`core/src/client.rs`、`core/src/guardian/review.rs`、`core/src/tools/`、`model-provider/src/provider.rs`、`app-server/src/models.rs`）
- [Codex rust-v0.153.1 官方 models.json](https://raw.githubusercontent.com/openai/codex/rust-v0.153.1/codex-rs/models-manager/models.json)
- 相关笔记：[[Codex Desktop系列05：一个模型条目装下整个harness——从gpt-6-astra展开配置看Model与Harness的真实边界]]｜[[Codex Desktop系列02：gpt-5.4-mini与三条暗线——全局配置菜单、退休元数据与自动审批调用链]]｜[[Codex Desktop系列01：接入Azure OpenAI GPT-6——bundled CLI版本锁定、model catalog schema与分层排错]]｜wiki 概念：[[model-harness-codesign]]
