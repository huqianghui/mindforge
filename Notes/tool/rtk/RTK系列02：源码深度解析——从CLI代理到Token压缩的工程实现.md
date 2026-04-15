---
title: RTK 系列 02：源码深度解析——从 CLI 代理到 Token 压缩的工程实现
created: 2026-04-15
tags:
  - AI
  - claude-code
  - rtk
  - token-optimization
  - context-engineering
  - rust
  - source-code-analysis
---

# RTK 系列 02：源码深度解析——从 CLI 代理到 Token 压缩的工程实现

> **RTK 系列文章**
> 1. [RTK 系列 01：RTK——AI Coding Agent 的 Token 压缩利器](RTK系列01：RTK（Rust%20Token%20Killer）——AI%20Coding%20Agent的Token压缩利器.md)（核心理念与使用方法）
> 2. **本文：RTK 源码深度解析**（架构与实现）
> 3. [RTK 系列 03：个性化优化引擎——基于 Session 数据的智能调优](RTK系列03：个性化优化引擎——基于Session数据的智能调优.md)（个人功能增强）

[上一篇](RTK系列01：RTK（Rust%20Token%20Killer）——AI%20Coding%20Agent的Token压缩利器.md)从用户视角介绍了 RTK 的核心理念与使用方法。本文将深入 RTK 的 55K 行 Rust 源码，从系统架构、过滤策略、TOML DSL 引擎、安全机制到分析系统，全面解构这个 CLI Token 压缩工具的工程实现。

---

## 1. 系统架构总览

### 1.1 入口与路由

RTK 的入口位于 `src/main.rs`（2299 行），采用 Clap derive 宏定义 CLI 结构：

```rust
struct Cli {
    command: Commands,        // 子命令枚举
    verbose: u8,              // -v/-vv/-vvv（全局计数）
    ultra_compact: bool,      // --ultra-compact（全局）
    skip_env: bool,           // --skip-env（全局）
}
```

启动流程 `run_cli()` 依次执行五个阶段：

1. **遥测 Ping** — `telemetry::maybe_ping()`，后台异步，每天最多一次，GDPR 门控
2. **Clap 解析** — `Cli::try_parse()`，失败则进入三层回退系统
3. **Hook 检查** — `hook_check::maybe_warn()`，每日限频一次的钩子过期提醒
4. **完整性校验** — `integrity::runtime_check()`，SHA-256 验证钩子未被篡改
5. **命令分发** — `match cli.command { ... }` 路由到对应处理模块

### 1.2 Commands 枚举：50+ 命令变体

`Commands` 枚举覆盖了 10 个生态系统的 50+ 命令变体：

| 生态系统 | 命令变体 | 处理模块 |
|----------|---------|----------|
| Git | Git, Gh, Gt, Diff | `cmds::git::*` |
| Rust | Cargo, Err, Test | `cmds::rust::*` |
| JavaScript | Npm, Npx, Pnpm, Vitest, Tsc, Next, Lint, Prettier, Playwright, Prisma | `cmds::js::*` |
| Python | Ruff, Pytest, Mypy, Pip | `cmds::python::*` |
| Go | Go, GolangciLint | `cmds::go::*` |
| .NET | Dotnet | `cmds::dotnet::*` |
| Cloud | Aws, Docker, Kubectl, Curl, Wget, Psql | `cmds::cloud::*` |
| System | Ls, Tree, Read, Grep, Find, Wc, Env, Json, Log, Deps, Summary, Format, Smart | `cmds::system::*` |
| Ruby | Rake, Rspec, Rubocop | `cmds::ruby::*` |
| Meta | Gain, Config, Discover, Learn, Session, Init, Verify, Trust, Proxy, Telemetry | `analytics::*`, `hooks::*` |

复杂命令通过**嵌套子命令枚举**进一步路由：`GitCommands`（13 个变体）、`CargoCommands`（6 个）、`DockerCommands` -> `ComposeCommands`、`GoCommands`、`PnpmCommands` 等。所有嵌套枚举带 `Other(Vec<OsString>)` 变体，使用 `#[command(external_subcommand)]` 实现未知子命令的透传。

### 1.3 数据流：从命令到压缩输出

以 `rtk cargo test` 为例的完整数据流：

```
CLI 输入
  -> Clap 解析成功
  -> 遥测 ping + Hook 检查 + 完整性校验
  -> cargo_cmd::run(CargoCommand::Test, &args, verbose)
    -> TimedExecution::start()                          // 计时开始
    -> Command::new("cargo").args(["test"]).output()    // 执行原始命令
    -> filter_cargo_test(stdout + stderr)               // 应用专用过滤器
    -> println!(filtered)                               // 输出压缩结果
    -> tee_and_hint(raw, "cargo-test", exit_code)       // 失败时保存原始输出
    -> timer.track("cargo test", "rtk cargo test",      // 记录到 SQLite
         raw, filtered)
  -> std::process::exit(code)                           // 传播退出码
```

---

## 2. 三层回退系统：永不阻塞

RTK 最重要的设计原则是**永远不阻止命令执行**。当 Clap 解析失败（遇到未注册的命令）时，进入三层回退：

### 第 1 层：RTK 元命令错误

如果命令在 `RTK_META_COMMANDS` 集合中（gain、discover、learn、init、config 等），说明是 RTK 自身命令的参数错误，直接展示 Clap 的错误信息。

### 第 2 层：TOML 过滤器匹配

在 TOML 过滤器注册表中查找：

```rust
toml_filter::find_matching_filter(&lookup_cmd) -> Some(CompiledFilter)
```

匹配成功后，执行原始命令、应用 8 阶段 TOML 管道、输出过滤结果，并以 `"rtk:toml"` 前缀记录追踪数据。

### 第 3 层：纯透传

无任何匹配时，直接流式传输：

```rust
resolved_command(args[0])
    .stdin(Stdio::inherit())
    .stdout(Stdio::inherit())
    .stderr(Stdio::inherit())
    .status()
```

透传命令也会记录计时数据（0 令牌，仅计时），用于后续的 `rtk gain --history` 分析。

**安全属性**：任何命令都有效（`rtk <任何命令>` 是安全前缀）、退出码完整保留、解析失败静默记录、未知命令使用 `Stdio::inherit()` 无缓冲流式传输。

---

## 3. 核心基础设施

### 3.1 配置系统（`config.rs`）

配置文件位于 `~/.config/rtk/config.toml`，结构包含 7 个子配置：

```rust
pub struct Config {
    pub tracking: TrackingConfig,    // enabled, history_days(90), database_path
    pub display: DisplayConfig,      // colors, emoji, max_width(120)
    pub filters: FilterConfig,       // ignore_dirs: [".git", "node_modules", "target", ...]
    pub tee: TeeConfig,              // enabled, mode(Failures), max_files(20), max_file_size(1MB)
    pub telemetry: TelemetryConfig,  // enabled, consent_given, consent_date
    pub hooks: HooksConfig,          // exclude_commands: Vec<String>
    pub limits: LimitsConfig,        // grep_max_results(200), status_max_files(15), ...
}
```

所有子配置都派生 `Default` + `#[serde(default)]`，因此部分 TOML 文件也是有效的——缺少的字段自动使用默认值。

### 3.2 SQLite Token 追踪（`tracking.rs`，1356 行）

追踪数据库位于 `~/.local/share/rtk/history.db`：

```sql
CREATE TABLE commands (
    id INTEGER PRIMARY KEY,
    timestamp TEXT NOT NULL,
    original_cmd TEXT NOT NULL,
    rtk_cmd TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    saved_tokens INTEGER NOT NULL,
    savings_pct REAL NOT NULL,
    exec_time_ms INTEGER DEFAULT 0,
    project_path TEXT DEFAULT ''
);
```

关键设计选择：
- **WAL 模式** + 5 秒忙等待超时，支持多个 AI 实例并发访问
- **90 天自动保留**，每次插入时清理过期数据
- **Token 估算**：`ceil(text.len() / 4.0)`——约 4 字符/token 的启发式算法
- **项目范围查询**使用 SQL `GLOB`（非 `LIKE`），避免路径中通配符的歧义

核心 API 是 `TimedExecution` 结构体：

```rust
pub struct TimedExecution { start: Instant }
impl TimedExecution {
    pub fn start() -> Self;
    pub fn track(&self, original_cmd, rtk_cmd, input: &str, output: &str);
    pub fn track_passthrough(&self, original_cmd, rtk_cmd);  // 0 tokens
}
```

### 3.3 Tee 原始输出恢复（`tee.rs`）

当过滤后的命令失败（非零退出码）时，保存未过滤的原始输出到 `~/.local/share/rtk/tee/`，以便 LLM 可以重新读取完整错误信息。

支持三种模式：`Failures`（默认，仅失败时保存）、`Always`、`Never`。文件按轮转策略管理（默认最多 20 个文件，每个最大 1MB），UTF-8 安全截断（在字符边界处截断）。

### 3.4 共享执行骨架（`runner.rs`）

`run_filtered()` 是被 20+ 模块、40+ 调用点使用的标准执行模板：

```rust
pub fn run_filtered<F>(
    cmd: Command, tool_name: &str, args_display: &str,
    filter_fn: F, opts: RunOptions<'_>,
) -> Result<i32>
where F: Fn(&str) -> String
```

六个执行阶段：执行 -> 过滤 -> 打印（含 tee 提示）-> stderr 透传 -> 追踪 -> 返回退出码。

`RunOptions` 构建器支持：`stdout_only()`（仅过滤 stdout）、`.tee("label")`（启用恢复）、`.early_exit_on_failure()`（失败时跳过过滤）。

---

## 4. 十大过滤策略（A-J）

RTK 在 58 个 Rust 源文件（约 29,771 行）中实现了 10 种过滤策略，每种针对不同类型的命令输出：

### 策略 A：逐行正则过滤（30-70% 节省）

最基础的策略。遍历输出行，跳过匹配噪声模式的行。被 npm、tree、cargo build 等使用：

```rust
for line in output.lines() {
    if line.starts_with('>') && line.contains('@') { continue; }
    if line.trim_start().starts_with("npm WARN") { continue; }
    result.push(line.to_string());
}
```

### 策略 B：状态机解析（70-95% 节省）

用枚举驱动的阶段跟踪，在关键标记行处转换状态。被 pytest、rake、rspec、cargo test 使用：

```rust
enum ParseState { Header, TestProgress, Failures, Summary }
// 在 "=== FAILURES ===" 等标记行处转换
```

### 策略 C：JSON 注入 + 结构化解析（60-90% 节省）

注入 `--output-format=json` 或 `--format json`，通过 serde 反序列化，输出紧凑摘要。被 ruff、golangci-lint、rspec、vitest、playwright、aws、kubectl 使用。17 个文件使用 `serde_json::from_str`。

### 策略 D：NDJSON 流式处理（80-95% 节省）

注入 `-json` 标志，将每行解析为事件对象，按维度聚合。被 `go test` 使用——将逐行 `GoTestEvent` 聚合为 `PackageResult`。

### 策略 E：分段/块过滤（70-95% 节省）

收集多行错误/警告块，去除块间噪声，限制前 15 个错误块。被 cargo build/test/clippy、git diff 使用。

### 策略 F：多命令组合（50-80% 节省）

运行多个子命令并组合结果。如 `git diff` 先运行 `--stat`（文件摘要），再运行完整 diff，最后通过 `compact_diff()` 截断 hunk。

### 策略 G：去重（80-95% 节省）

规范化行（用占位符替换时间戳/UUID/十六进制/数字），计数出现次数，显示唯一模式及重复计数。被 `log_cmd` 和 `kubectl logs` 使用。

### 策略 H：摘要生成与分组（60-90% 节省）

解析结构化诊断输出，按文件或规则分组，输出紧凑的分组摘要。被 tsc、mypy、golangci-lint、rubocop、ruff、grep 使用。

### 策略 I：格式模板注入（40-60% 节省）

注入自定义 `--format` 模板以精确获取所需字段：

```rust
.args(["ps", "--format", "{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}"])
```

被 `docker ps`、`docker images` 使用。

### 策略 J：TOML DSL 管道（可变节省）

59 个内置 TOML 过滤器的声明式 8 阶段管道。详见下一节。

### 令牌节省策略矩阵

| 策略 | 节省率 | 机制 |
|------|--------|------|
| 噪声行去除 | 30-70% | 移除进度条、编译行、空行 |
| 成功短路 | 90-99% | 成功时输出单行摘要 |
| JSON 注入 + 模式压缩 | 60-90% | 解析结构化数据，仅输出关键字段 |
| Diff 压缩 | 50-80% | 限制 hunk 为 100 行，显示 stat 摘要 |
| 错误/失败聚焦 | 70-95% | 去除通过测试，仅显示失败 |
| 日志去重 | 80-95% | 规范化 + 计数唯一模式 |
| 格式模板注入 | 40-60% | 自定义 `--format` 获取精确字段 |
| 截断保护 | 安全网 | `truncate()`、`max_lines`、`head/tail_lines` |

### 三层优雅降级

所有解析器遵循三层降级策略：

| 层级 | 触发条件 | 输出 |
|------|----------|------|
| 第 1 层（完整） | JSON 完整解析 | 紧凑摘要 |
| 第 2 层（降级） | JSON 失败，正则有效 | 带警告标记的摘要 |
| 第 3 层（透传） | 所有解析失败 | 截断原始输出 + `[RTK:PASSTHROUGH]` |

这确保了**过滤器永远不会丢失信息**——最坏情况也只是退回到截断的原始输出。

---

## 5. TOML 过滤器 DSL：声明式扩展机制

### 5.1 为什么需要 TOML DSL

58 个 Rust 过滤模块覆盖了最常用的命令，但工具链的长尾是无穷的——terraform、make、gcc、brew、ansible、helm 等都需要过滤支持。为每个工具写 Rust 代码不现实。

TOML 过滤器 DSL 解决了这个问题：**无需编写 Rust 代码即可添加工具支持**。

### 5.2 查找优先级（首次匹配）

1. `.rtk/filters.toml` — 项目本地（需通过信任系统验证）
2. `~/.config/rtk/filters.toml` — 用户全局
3. 内置 — `src/filters/*.toml` 由 `build.rs` 拼接，通过 `include_str!` 编译嵌入
4. 透传 — 无匹配，原始命令直接执行

### 5.3 过滤器定义格式

```toml
[filters.terraform-plan]
description = "Terraform plan 输出过滤器"
match_command = "^terraform\\s+plan"
strip_ansi = true
filter_stderr = false

replace = [
    { pattern = "\\d{4}-\\d{2}-\\d{2}T[\\d:]+Z", replacement = "<timestamp>" },
]

match_output = [
    { pattern = "No changes", message = "terraform plan: 无变更" },
]

strip_lines_matching = ["^Refreshing state", "^\\s*$"]
truncate_lines_at = 200
head_lines = 50
tail_lines = 10
max_lines = 80
on_empty = "terraform plan: ok"
```

### 5.4 八阶段管道

由 `core/toml_filter.rs` 的 `apply_filter()` 按顺序执行：

| 阶段 | 字段 | 操作 |
|------|------|------|
| 1 | `strip_ansi` | 移除 ANSI 转义码 |
| 2 | `replace` | 逐行正则替换（规则链式执行） |
| 3 | `match_output` | 检查完整文本；匹配则返回消息（**短路**） |
| 4 | `strip/keep_lines` | 通过 RegexSet 过滤行（互斥） |
| 5 | `truncate_lines_at` | 截断每行到 N 个字符 |
| 6 | `head/tail_lines` | 保留前 N 行和/或后 N 行 |
| 7 | `max_lines` | 绝对行数上限 |
| 8 | `on_empty` | 结果为空时的替换消息 |

阶段 3 的 `match_output` 是**短路机制**——如果命令输出匹配预定义的成功模式（如 "No changes"），直接返回一条简短消息，跳过后续所有阶段。这是测试通过、构建成功等场景下实现 90%+ 压缩率的关键。

### 5.5 59 个内置过滤器

涵盖构建（gcc、make、gradle、swift-build）、代码检查（biome、shellcheck、hadolint）、基础设施（terraform、helm、gcloud、ansible）、包管理器（brew、bundle、composer、poetry）、任务运行器（just、turbo、nx）、系统（df、du、ps、ping）等 7 个类别。

### 5.6 内联测试 DSL

每个过滤器可以包含内联测试，由 `rtk verify` 执行：

```toml
[[tests.gcc]]
name = "去除 include 链, 保留错误和警告"
input = """
In file included from /usr/include/stdio.h:42:
main.c:10:5: error: use of undeclared identifier 'foo'
"""
expected = "main.c:10:5: error: use of undeclared identifier 'foo'"
```

`rtk verify --require-all` 确保每个过滤器至少有一个测试（CI 强制执行）。

### 5.7 构建时拼接

`build.rs` 读取所有 `src/filters/*.toml` 文件，拼接成单个字符串，通过 `include_str!` 嵌入到二进制文件。这意味着**添加新 TOML 过滤器只需创建文件——无需修改任何 Rust 代码**。

---

## 6. 钩子系统与安全机制

### 6.1 AI Agent 集成

RTK 支持 9 种 AI 编程工具：Claude Code、Cursor、Codex、Gemini CLI、OpenCode、Windsurf、Cline、Kilocode、Antigravity。

集成通过 `rtk init -g` 完成：

1. 写入钩子脚本 `~/.claude/hooks/rtk-rewrite.sh`（二进制嵌入）
2. 存储 SHA-256 哈希到 `~/.claude/hooks/.rtk-hook.sha256`
3. 修补 `~/.claude/settings.json`，添加 PreToolUse 钩子注册
4. 写入 `rtk-awareness.md` 说明文件

**运行时流程**：AI Agent 执行命令 -> Claude Code 触发 PreToolUse 钩子 -> `rtk-rewrite.sh` 调用 `rtk rewrite "git status"` -> 权限检查 -> 改写为 `rtk git status` -> Agent 执行改写后的命令。

### 6.2 改写命令的退出码协议

| 退出码 | 含义 |
|--------|------|
| 0 | 改写允许——钩子可自动放行 |
| 1 | 无 RTK 等效命令——原样透传 |
| 2 | 匹配拒绝规则——延迟到原生拒绝 |
| 3 | 匹配询问规则——改写但提示用户 |

**安全不变量**：`PermissionVerdict::Default` 映射到退出码 3（询问），而非 0（允许）。**未识别的命令永远不会被自动允许**。

### 6.3 权限系统

从 settings.json 读取 Claude Code 权限规则。判定优先级：**Deny > Ask > Allow > Default (ask)**。

支持的模式匹配：精确匹配、前缀匹配（带词边界）、尾部通配符（`git push*`）、前导通配符（`* --force`）、中间通配符（`git * main`）、全局（`*`）、冒号语法（`sudo:*`）。

**复合命令安全**（issue #1213）：用 `&&`、`||`、`|`、`;` 链接的命令被拆分，每个非空段都必须独立匹配 allow 规则才能获得 `Allow` 判定。

### 6.4 完整性校验

SHA-256 钩子篡改检测：

- 安装时 `store_hash()` 写入只读（0o444）的 `.rtk-hook.sha256`
- 启动时 `runtime_check()` 比较存储的哈希与当前值
- `Tampered` 状态直接阻止执行并报错，exit(1)
- **无环境变量绕过**——合法修改需重新运行 `rtk init -g --auto-patch`

### 6.5 信任系统

控制项目本地 `.rtk/filters.toml` 的加载。这是安全边界，因为过滤器可以改写输出。

- **加载前信任**：未信任的过滤器被静默跳过
- `rtk trust` 显示过滤器内容 + 风险摘要，然后存储 SHA-256
- **TOCTOU 防护**：单次读取文件 -> 从缓冲区显示 -> 对同一缓冲区计算哈希
- **CI 覆盖**：`RTK_TRUST_PROJECT_FILTERS=1` 仅在同时设置 CI 环境变量时有效，防止 `.envrc` 注入攻击

---

## 7. 分析与报告系统

### 7.1 Gain 仪表板（`rtk gain`）

主要的 Token 节省仪表板，支持多种视图：

- **默认 KPI**：总命令数、节省 tokens、平均节省率、执行时间、效率仪表
- **按命令排名**：计数、节省 tokens、平均节省率、影响条
- **时间维度**：`--daily`、`--weekly`、`--monthly`、`--all`
- **项目范围**：`--project` 过滤到当前工作目录
- **ASCII 图表**：`--graph` 每日节省柱状图（最近 30 天）
- **配额估算**：`--quota --tier pro|5x|20x` 估算订阅配额节省
- **导出**：`--format json|csv`

### 7.2 经济分析（`rtk cost`）

将 ccusage 消费数据与 RTK 节省数据结合，计算实际美元节省：

```
加权输入 CPT 公式：
weighted_units = input + 5*output + 1.25*cache_create + 0.1*cache_read
input_cpt = total_cost / weighted_units
rtk_savings_usd = saved_tokens * input_cpt
```

### 7.3 会话采用率（`rtk session`）

衡量 Claude Code 会话中的 RTK 采用率：发现最近 10 个会话 -> 从 JSONL 转录中提取所有 Bash 命令 -> 分类已使用 RTK vs. 可被改写 -> 报告每个会话的采用率百分比。

### 7.4 发现系统（`rtk discover`）

在 Claude Code 历史中查找错失的 RTK 机会。包含：
- **Shell 词法分析器**（手写分词器）
- **会话提供者**（读取 `~/.claude/projects/` JSONL）
- **命令注册表**（53 条规则）
- **规则数据库**（正则模式、RTK 等效命令、节省估算）

### 7.5 学习系统（`rtk learn`）

检测重复的 CLI 错误并建议纠正：
1. 查找 `is_error=true` 的命令
2. 跳过 TDD 循环错误（编译失败、测试失败）
3. 在 3 命令窗口内向前查找纠正
4. 通过 Jaccard 相似度计算 `command_similarity()`
5. 置信度 >= 0.6 则接受

---

## 8. Rust 工程模式

### 8.1 错误处理

全局使用 `anyhow::Result` + `.context()`（120+ 处），上下文字符串遵循 `"Failed to ..."` 模式。

所有过滤器遵循**回退模式**：

```rust
let filtered = filter_output(&output.stdout)
    .unwrap_or_else(|e| {
        eprintln!("rtk: filter warning: {}", e);
        output.stdout.clone()  // 失败时透传原始输出
    });
```

### 8.2 正则管理

- 共享模式使用 `lazy_static!`（25 个块）或 `OnceLock`（较新文件）
- 正则字面量中的 `.unwrap()` 是唯一允许 unwrap 的场景——错误的正则是编程错误
- 动态模式（如 `summary.rs` 基于用户输入的 format）允许函数内 `Regex::new`

### 8.3 过滤函数签名（100% 一致性）

```rust
fn filter_output(input: &str) -> String
```

由 `runner::run_filtered` 的 `F: Fn(&str) -> String` 约束强制执行。38+ 个 `pub fn run()` 模块遵循统一签名。

### 8.4 模块结构约定

每个 `*_cmd.rs` 遵循固定顺序：模块文档注释 -> 导入 -> 类型/枚举 -> `lazy_static!` -> `pub fn run()` -> 私有 `fn filter_*()` -> `#[cfg(test)] mod tests`。

生态系统 `mod.rs` 使用 `automod::dir!()` 自动发现模块。

### 8.5 关键设计决策

| 决策 | 理由 |
|------|------|
| **无异步** | 零 `tokio`/`async-std`，单线程。仅有线程：遥测 ping + 代理流式传输 |
| **回退优先** | 未知命令透明透传，永不阻塞 |
| **退出码保真** | 每个处理函数返回 `Result<i32>`，通过 `std::process::exit()` 传播 |
| **默认开放安全** | `is_operational_command()` 白名单，新命令不自动做完整性检查 |
| **ChildGuard RAII** | `Drop` 实现杀死并等待子进程，防止僵尸进程 |

### 8.6 依赖精简

| 包 | 用途 |
|----|------|
| `clap` 4 (derive) | CLI 参数解析 |
| `anyhow` | 错误处理 |
| `regex` + `lazy_static` | 模式匹配 |
| `serde` + `serde_json` | 序列化（JSON 注入策略） |
| `toml` | 配置 + TOML 过滤器解析 |
| `rusqlite` (bundled) | SQLite 追踪 |
| `sha2` | 钩子完整性验证 |

发布配置：`opt-level = 3`、`lto = true`、`codegen-units = 1`、`panic = "abort"`、`strip = true`——确保最小二进制体积和最优性能。

---

## 9. 总结：RTK 的工程智慧

深入 RTK 源码后，几个工程设计原则特别值得借鉴：

| 原则 | 体现 |
|------|------|
| **安全第一** | 三层回退永不阻塞、过滤器降级透传、SHA-256 完整性校验、TOCTOU 防护 |
| **可观测性内建** | SQLite 追踪每条命令、gain/cost/session/discover 四维分析 |
| **声明式扩展** | TOML DSL 8 阶段管道、59 个内置过滤器、零 Rust 代码添加支持 |
| **一致性约束** | `run_filtered()` 强制统一签名、`automod` 自动发现、模块结构约定 |
| **信息论思维** | 10 种专用过滤策略、Failure Focus、成功短路——最大化每 token 信息密度 |

RTK 不只是一个"Token 压缩工具"，它是**在 CLI 代理层将信息论、安全工程和 Rust 系统编程完美结合的典范**。对于构建 Agent 基础设施的工程师来说，RTK 的架构设计和工程模式都是值得深入研究的参考。

---

## 参考资料

- [RTK GitHub 仓库](https://github.com/rtk-ai/rtk)
- [RTK 系列 01：RTK——AI Coding Agent 的 Token 压缩利器](RTK系列01：RTK（Rust%20Token%20Killer）——AI%20Coding%20Agent的Token压缩利器.md)
- [RTK 系列 03：个性化优化引擎——基于 Session 数据的智能调优](RTK系列03：个性化优化引擎——基于Session数据的智能调优.md)
