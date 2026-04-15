---
title: RTK 系列 03：个性化优化引擎——基于 Session 数据的智能调优
created: 2026-04-15
tags:
  - AI
  - claude-code
  - rtk
  - token-optimization
  - context-engineering
  - rust
  - personalization
---

# RTK 系列 03：个性化优化引擎——基于 Session 数据的智能调优

> **RTK 系列文章**
> 1. [RTK 系列 01：RTK——AI Coding Agent 的 Token 压缩利器](RTK系列01：RTK（Rust%20Token%20Killer）——AI%20Coding%20Agent的Token压缩利器.md)（核心理念与使用方法）
> 2. [RTK 系列 02：源码深度解析——从 CLI 代理到 Token 压缩的工程实现](RTK系列02：源码深度解析——从CLI代理到Token压缩的工程实现.md)（架构与实现）
> 3. **本文：RTK 个性化优化引擎**（个人功能增强）

[前两篇](RTK系列01：RTK（Rust%20Token%20Killer）——AI%20Coding%20Agent的Token压缩利器.md)介绍了 RTK 的核心理念和源码架构。本文聚焦于一个个人功能增强方向：**基于用户真实 Session 数据，自动生成个性化优化建议**——即 `rtk optimize` 命令的设计与实现。

---

## 1. 从通用优化到个性化优化

### 1.1 通用优化的天花板

如 [系列第二篇](RTK系列02：源码深度解析——从CLI代理到Token压缩的工程实现.md) 所述，RTK 内置了丰富的过滤器体系，覆盖常见命令并实现 60-90% 的 Token 节省。

但每个开发者的工作流都是独特的。通用优化存在四个盲区：

| 盲区 | 具体场景 | 浪费程度 |
|------|---------|---------|
| **未覆盖命令** | Terraform 用户每天运行 `terraform plan` 40 次，RTK 没有对应过滤器，输出全量透传 | 高 |
| **配置过于保守** | `head_lines=50` 适合大多数用户，但如果你的 `cargo test` 输出始终少于 25 行，这个限制本身在浪费 | 中 |
| **重复 CLI 错误** | 开发者输入 `git commit --ammend` 三次才纠正为 `--amend`，每次错误都消耗 Token | 低但频繁 |
| **结构化输出浪费** | `gh api --jq` 产生机器可读 JSON，RTK 的文本过滤器无法有效压缩 | 中 |

### 1.2 解决思路：让数据说话

`rtk optimize` 的核心思路是：**分析用户真实的 Claude Code Session 历史，找到个性化的优化机会，自动生成并应用优化建议**。

```
rtk discover  <- "被动发现：你错过了什么？"
    | 数据复用
    v
rtk optimize  <- "主动建议：你应该怎么做？"（新）
    | 应用
    v
rtk verify    <- "验证：生成的过滤器是否正确？"
    | 追踪
    v
rtk gain      <- "度量：你节省了多少？"
```

`rtk optimize` 填补了 `discover`（问题识别）和 `verify`（方案验证）之间的**方案生成**环节。

---

## 2. 使用场景

### 场景 1：新团队接入

团队采用 RTK，但使用了默认过滤器集之外的工具（Bazel、Terraform、Pulumi 等）。

```bash
# 使用一周后
rtk optimize --since 7

# 输出：
#   为 `terraform apply` 生成 TOML 过滤器（42 次使用，每月可节省 ~15,200 tokens）
#   为 `kubectl logs` 生成 TOML 过滤器（38 次使用，每月可节省 ~12,100 tokens）

rtk optimize --apply  # 自动生成并安装 TOML 过滤器
```

### 场景 2：长期使用后的配置调优

使用 RTK 一个月后，追踪数据揭示了优化机会。

```bash
rtk optimize --since 30

# 输出：
#   将 `gh api --jq` 排除在过滤之外（结构化 JSON，仅 3% 节省率）
#   降低 cargo test 的 head_lines（P95 输出 < 25 行）
```

### 场景 3：CLI 纠错规则

开发者反复输入错误命令，浪费 Token 在错误输出和重试上。

```bash
rtk optimize

# 输出：
#   纠正：git commit --ammend -> git commit --amend（3 次出现）
#   → 写入：.claude/rules/cli-corrections.md
```

### 场景 4：CI/CD 集成

导出优化报告为 JSON，用于仪表板或自动化管道。

```bash
rtk optimize --format json --since 7 > optimization-report.json

# 通过 cron 定期执行
0 9 * * 1 rtk optimize --apply --min-frequency 10
```

---

## 3. CLI 接口设计

```
rtk optimize [OPTIONS]

OPTIONS:
    -p, --project <PATH>      限定项目范围（默认：当前目录）
    -a, --all                 分析所有项目
    -s, --since <DAYS>        分析最近 N 天（默认：30）
        --sessions <N>        最多分析 N 个会话（默认：50）
    -f, --format <FMT>        输出格式：text|json（默认：text）
        --apply               自动应用所有建议（写入配置/过滤器/规则）
        --dry-run             预览变更但不执行
        --min-frequency <N>   命令最少出现次数才生成建议（默认：5）
        --min-savings <PCT>   预估最低节省率才生成 TOML（默认：30）
    -v, --verbose             显示详细分析过程
```

典型使用流程：

```bash
rtk optimize                          # 1. 查看建议
rtk optimize --dry-run                # 2. 预览变更
rtk optimize --apply                  # 3. 应用建议
rtk verify                            # 4. 验证生成的过滤器
rtk gain --weekly                     # 5. 一周后查看效果
```

---

## 4. 架构设计

### 4.1 模块结构

```
src/optimize/
├── mod.rs              <- 管道编排器：收集数据 -> 4 个分析器 -> 排序 -> 输出
├── suggestions.rs      <- 类型定义（SuggestionKind、Suggestion、OptimizeReport）
├── uncovered.rs        <- 分析器 1：检测高频未覆盖命令
├── toml_generator.rs   <- 分析器 2：自动生成 TOML 过滤器定义
├── config_tuner.rs     <- 分析器 3：建议配置参数调优
├── corrections.rs      <- 分析器 4：提取 CLI 错误纠正规则
├── report.rs           <- 文本和 JSON 报告格式化
└── applier.rs          <- --apply 执行引擎（带备份的文件写入）
```

**共计 8 个新文件约 1800 行新代码 + 2 个已修改文件约 80 行。零新增 crate 依赖。**

### 4.2 数据流

```
                     rtk optimize (mod.rs)
                           |
         ┌─────────┬───────┼───────┬──────────┐
         v         v       v       v          v
    ┌─────────┐ ┌──────┐ ┌──────┐ ┌────────┐
    │uncovered│ │ toml │ │config│ │correct-│
    │   .rs   │ │gen.rs│ │tuner │ │ions.rs │
    └────┬────┘ └──┬───┘ └──┬───┘ └───┬────┘
         │         │        │         │
         v         v        v         v
    ┌─────────┐ ┌──────┐ ┌──────┐ ┌────────┐
    │discover/│ │样本  │ │core/ │ │learn/  │
    │registry │ │输出  │ │track-│ │detect- │
    │classify │ │分析  │ │ing   │ │or      │
    └─────────┘ └──────┘ └──────┘ └────────┘
         │         │        │         │
         └─────────┴────────┴─────────┘
                        |
                 Vec<Suggestion>
              (按 impact_score 降序)
                        |
              ┌─────────┼─────────┐
              v         v         v
         ┌────────┐ ┌───────┐ ┌───────┐
         │report  │ │--apply│ │--dry- │
         │text/json│ │applier│ │run    │
         └────────┘ └───────┘ └───────┘
```

### 4.3 复用现有模块（零修改）

这是设计的关键——**最大化复用，最小化侵入**。`rtk optimize` 直接复用了 [系列第二篇](RTK系列02：源码深度解析——从CLI代理到Token压缩的工程实现.md) 中介绍的 6 个核心模块：`discover`（命令分类）、`learn`（纠错检测）、`tracking`（SQLite 历史查询）、`config`（配置读写）、`toml_filter`（过滤器匹配）以及 `provider`（会话数据读取）。

仅修改 2 个文件：`main.rs`（+20 行路由）和 `tracking.rs`（+新查询方法）。

---

## 5. 四个分析器详解

### 5.1 分析器 1：未覆盖命令检测（`uncovered.rs`）

**目标**：找到没有 RTK 过滤器的高频命令。

**算法**：

1. 对每个 `ExtractedCommand`，调用 `split_command_chain()` 拆分复合命令
2. 对每部分调用 `classify_command()`
3. 将 `Unsupported` 结果累积到 `HashMap<base_command, UncoveredStats>`

```rust
struct UncoveredStats {
    base_command: String,
    count: usize,
    total_output_chars: usize,
    sample_outputs: Vec<String>,  // 最多保留 5 个输出样本
    example_full_command: String,
}
```

4. 按 `count >= min_frequency` 过滤
5. 估算每月 Token 节省：

```
avg_tokens = avg_output_chars / 4
monthly_count = count * 30 / days_covered
estimated_savings = avg_tokens * (min_savings_pct / 100) * monthly_count
```

6. 对每个命令调用 `toml_generator::generate_toml_filter()` 生成 TOML
7. 返回 `Vec<Suggestion>`，类型为 `GenerateTomlFilter`

**影响分数**：`sqrt(count * avg_output_chars / 1000)`，上限 100。

### 5.2 分析器 2：TOML 过滤器自动生成（`toml_generator.rs`）

**核心创新**：根据命令输出样本，**自动推断过滤规则**。

#### 噪声模式检测

通过 `lazy_static!` 正则表达式检测常见噪声：

| 模式 | 正则表达式 | 典型命中率 |
|------|-----------|-----------|
| 空行 | `^\s*$` | 10-30% |
| 时间戳 | `^\s*\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}` | 0-80%（日志输出） |
| 进度条 | `\d+%\|[bars]\|\.{4,}\|[=+>]` | 0-50%（安装/构建） |
| 分隔线 | `^[\s\-=\*_]{3,}\s*$` | 5-15% |

对所有输出样本统计每种模式的命中率。命中率 > 60% 的模式加入 `strip_lines_matching`。

#### 截断参数推断

```rust
fn infer_truncation(sample_outputs: &[String]) -> (Option<usize>, Option<usize>, Option<usize>) {
    let median = percentile(&line_counts, 50);
    let p95 = percentile(&line_counts, 95);

    let head_lines = if median > 30 { Some(30) } else { None };
    let max_lines = if p95 > 80 { Some(80) } else { None };
    let truncate_at = if max_line_length > 200 { Some(200) } else { None };

    (head_lines, max_lines, truncate_at)
}
```

#### 成功短路检测

在 >80% 的短输出中出现的通用短语（"success"、"ok"、"done"、"complete"、"passed"、"0 errors"）会被生成为 `match_output` 规则——这是实现 90%+ 压缩率的关键。

#### TOML 渲染与验证

生成完整 TOML 定义 + 内联测试，然后通过 `toml::from_str::<toml::Value>()` 验证语法。解析失败则回退到最小过滤器。

### 5.3 分析器 3：配置参数调优（`config_tuner.rs`）

**目标**：分析追踪数据，发现配置可优化的地方。

#### 3a. 低节省率命令检测

调用 `tracker.low_savings_commands(20)` 查找平均节省率 < 30% 的命令：
- 包含 `--json`、`--format json`、`-o json` 的结构化输出命令 -> 建议 `ExcludeCommand`（加入排除列表）
- 其他低节省率命令 -> 建议 `TuneConfig`（检查过滤规则）

#### 3b. 输出百分位分析

```sql
SELECT rtk_cmd, COUNT(*) as cnt, AVG(output_tokens), MAX(output_tokens)
FROM commands
WHERE timestamp > datetime('now', '-30 days')
GROUP BY rtk_cmd HAVING cnt >= 5
ORDER BY AVG(output_tokens) DESC
```

- 如果 avg_tokens < 50 且当前 `passthrough_max_chars > 500` -> 建议降低限制
- 如果 avg_tokens > 2000 且无截断 -> 建议添加 `head/tail` 截断

### 5.4 分析器 4：CLI 错误纠正（`corrections.rs`）

**100% 复用 `learn` 模块**，无新检测逻辑：

1. `learn::detector::find_corrections(commands)` — 滑动窗口 + Jaccard 相似度
2. 按 `confidence >= 0.6` 过滤
3. `learn::detector::deduplicate_corrections()` — 合并相似纠正
4. 按 `occurrences >= min_occurrences` 过滤
5. 转换为 `Suggestion::WriteCorrection`

**与 `rtk learn` 的区别**：完全相同的检测逻辑，但输出为 `Suggestion` 而非直接写文件。只有 `--apply` 时才写入 `.claude/rules/cli-corrections.md`。

---

## 6. 核心类型定义

```rust
#[derive(Debug, Clone, Serialize)]
pub enum SuggestionKind {
    /// 为未覆盖的高频命令生成 TOML 过滤器
    GenerateTomlFilter { toml_content: String },
    /// 调整现有配置参数
    TuneConfig { field: String, current: String, suggested: String },
    /// 生成 CLI 错误纠正规则
    WriteCorrection { wrong: String, right: String, error_type: String },
    /// 将命令加入排除列表
    ExcludeCommand { command: String, reason: String },
}

#[derive(Debug, Clone, Serialize)]
pub struct Suggestion {
    pub kind: SuggestionKind,
    pub category: String,           // "TOML Filter", "Config", "Correction", "Exclusion"
    pub impact_score: u32,          // 0-100
    pub estimated_tokens_saved: u64,// 每月估算
    pub confidence: f64,            // 0.0-1.0
    pub description: String,        // 人类可读描述
}

#[derive(Debug, Serialize)]
pub struct OptimizeReport {
    pub sessions_analyzed: usize,
    pub commands_analyzed: usize,
    pub days_covered: u64,
    pub suggestions: Vec<Suggestion>,
    pub total_estimated_monthly_savings: u64,
    pub current_coverage_pct: f64,   // 当前 RTK 覆盖率
    pub projected_coverage_pct: f64, // 应用建议后预估覆盖率
}
```

### 建议优先级与评分

所有建议按 `impact_score` 降序排列：

| 建议类型 | 评分公式 | 典型范围 |
|---------|---------|---------|
| GenerateTomlFilter | `sqrt(count * avg_output / 1000)` | 10-100 |
| ExcludeCommand | 固定 30 | 30 |
| TuneConfig | 固定 15-20 | 15-20 |
| WriteCorrection | `occurrences * 10` | 10-50 |

---

## 7. 应用引擎（`applier.rs`）

### 每种建议类型的写入目标

| 类型 | 目标文件 | 操作 |
|------|---------|------|
| `GenerateTomlFilter` | `~/.config/rtk/filters.toml` | 追加 TOML 过滤器定义 |
| `TuneConfig` | `~/.config/rtk/config.toml` | 加载、修改字段、保存 |
| `WriteCorrection` | `.claude/rules/cli-corrections.md` | 追加纠正规则 |
| `ExcludeCommand` | `config.toml` -> `hooks.exclude_commands` | 添加到排除列表 |

### 安全保证

- **写入前备份**：所有目标文件使用 `.bak` 扩展名备份
- **创建父目录**：缺失的目录自动创建
- **TOML 仅追加**：永远不覆盖现有过滤器定义
- **配置向后兼容**：只添加字段，不删除
- **验证**：TOML 过滤器写入后自动运行 `rtk verify` 验证语法和测试

---

## 8. 输出示例

### 文本报告

```
═══════════════════════════════════════════════════════════
  RTK Optimize Report
═══════════════════════════════════════════════════════════

  Sessions: 38 | Commands: 2,147 | Period: 30 days
  Coverage: 67.3% -> 89.1% (projected)
  Est. monthly savings: ~42,500 tokens

───────────────────────────────────────────────────────────
  TOML Filter Suggestions
───────────────────────────────────────────────────────────

  1. [HIGH] Generate TOML filter for `terraform apply`
     42 uses, ~15,200 tokens/month
     → strip timestamps + progress + empty lines
     → head_lines=40, max_lines=80, strip_ansi=true

  2. [MED]  Generate TOML filter for `kubectl logs`
     38 uses, ~12,100 tokens/month
     → keep_lines_matching=["error|warn|fatal|panic"]

  3. [MED]  Generate TOML filter for `yarn install`
     21 uses, ~5,600 tokens/month
     → strip progress bars + resolution lines

───────────────────────────────────────────────────────────
  Config Tuning
───────────────────────────────────────────────────────────

  4. [MED]  Exclude `gh api --jq` from filtering
     Reason: structured JSON, only 3% savings rate

  5. [LOW]  cargo test: head_lines 50 -> 25
     Reason: 95% of outputs < 25 lines

───────────────────────────────────────────────────────────
  CLI Corrections
───────────────────────────────────────────────────────────

  6. [MED]  git commit --ammend -> git commit --amend
     3 occurrences -> .claude/rules/cli-corrections.md

───────────────────────────────────────────────────────────
  Apply: rtk optimize --apply
  Preview: rtk optimize --dry-run
```

### JSON 报告

```json
{
  "sessions_analyzed": 38,
  "commands_analyzed": 2147,
  "days_covered": 30,
  "current_coverage_pct": 67.3,
  "projected_coverage_pct": 89.1,
  "total_estimated_monthly_savings": 42500,
  "suggestions": [
    {
      "kind": {
        "GenerateTomlFilter": {
          "toml_content": "[filters.terraform-apply]\n..."
        }
      },
      "category": "TOML Filter",
      "impact_score": 85,
      "estimated_tokens_saved": 15200,
      "confidence": 0.7,
      "description": "Generate TOML filter for `terraform apply` (42 uses)"
    }
  ]
}
```

---

## 9. 编排流程

`mod.rs` 中的 `run()` 函数编排整个管道：

```rust
pub fn run(project, all, since, sessions, format, apply, dry_run,
           min_frequency, min_savings, verbose) -> Result<i32> {
    // 1. 收集会话数据
    let provider = ClaudeProvider;
    let session_paths = provider.discover_sessions(project_filter, Some(since))?;

    // 2. 提取命令和输出
    let (extracted, command_executions) = extract_all_commands(&provider, session_paths)?;

    // 3. 运行 4 个分析器（顺序执行，RTK 无 async）
    let mut suggestions = Vec::new();
    suggestions.extend(uncovered::analyze_uncovered(&extracted, min_frequency, min_savings));
    suggestions.extend(config_tuner::analyze_config(&tracker, &config)?);
    suggestions.extend(corrections::analyze_corrections(&command_executions, 0.6, 1));

    // 4. 按 impact_score 降序排列
    suggestions.sort_by(|a, b| b.impact_score.cmp(&a.impact_score));

    // 5. 构建报告并输出
    let report = build_report(session_paths.len(), extracted.len(), since, &suggestions);

    match format {
        "json" => println!("{}", serde_json::to_string_pretty(&report)?),
        _ => {
            println!("{}", report::format_text(&report));
            if dry_run { applier::format_dry_run(&suggestions)?; }
            else if apply { applier::apply_all(&suggestions)?; }
        }
    }
    Ok(0)
}
```

---

## 10. 实现策略

### 分阶段交付

| 阶段 | 组件 | 复杂度 | 新代码量 |
|------|------|--------|---------|
| **P0** | suggestions.rs + uncovered.rs + corrections.rs + mod.rs + report.rs | 低-中 | ~500 行 |
| **P1** | config_tuner.rs + toml_generator.rs + applier.rs | 中-高 | ~700 行 |
| **P2** | JSON 输出 + --dry-run 预览 | 低 | ~200 行 |
| **P3**（未来） | --watch 模式（fsnotify 实时监听） | 高 | 待定 |

### 零新增依赖

所有实现复用现有 crate：`regex`、`lazy_static`、`serde`/`serde_json`、`toml`、`anyhow`、`dirs`。仅 P3 阶段的 `--watch` 模式需要新增 `notify` crate。

### 关键数据转换

```
ExtractedCommand (from discover/provider.rs)
├── command: String
├── output_content: Option<String>   <- 前 1000 字符
├── output_len: Option<usize>
└── is_error: bool

路径 A（分析器 1+2）:
  -> classify_command() -> Unsupported?
  -> 累计 output_content 样本
  -> toml_generator::generate_toml_filter()

路径 B（分析器 4）:
  -> 转换为 CommandExecution
  -> find_corrections() -> CorrectionPair
  -> deduplicate -> CorrectionRule
  -> Suggestion::WriteCorrection
```

`output_content` 仅保留前 ~1000 字符。对 TOML 生成器来说足够检测行模式，但用 `output_len`（完整长度）来推断截断参数。

---

## 11. 设计亮点与反思

### 11.1 "数据驱动"而非"规则驱动"

传统思路是让用户手动配置过滤器。`rtk optimize` 反其道而行——**让数据自动生成配置**。用户不需要了解 TOML DSL 的 8 阶段管道，只需运行 `rtk optimize --apply`，系统会根据真实使用模式自动生成最优配置。

### 11.2 最大化复用，最小化侵入

8 个新文件、2 个修改文件、零新增依赖。这得益于 RTK 已有模块的良好抽象：
- `discover` 提供了命令分类能力
- `learn` 提供了纠错检测能力
- `tracking` 提供了历史数据查询能力
- `toml_filter` 提供了过滤器 schema 定义

### 11.3 安全优先的应用策略

`--apply` 不是盲目写入：
- 先备份、再写入
- TOML 仅追加、不覆盖
- 生成后自动验证（`rtk verify`）
- `--dry-run` 让用户预览变更

### 11.4 覆盖率作为北极星指标

报告中的 `67.3% -> 89.1%` 覆盖率变化，是用户决策的核心参考。这个指标回答了一个简单问题：**你的 CLI 输出有多少比例经过了 RTK 优化？**

---

## 12. 总结

`rtk optimize` 代表了 Token 优化从"一刀切"到"千人千面"的演进。它的核心洞察是：

| 维度 | 通用 RTK | rtk optimize |
|------|---------|-------------|
| 优化来源 | 预定义规则 | 用户真实行为数据 |
| 过滤器 | 手动编写 | 自动生成 TOML |
| 配置 | 保守默认值 | 基于百分位分析调优 |
| 错误处理 | 无 | 自动提取纠正规则 |
| 覆盖检测 | 被动报告 | 主动建议 + 一键应用 |

对于每天高强度使用 AI Coding Agent 的开发者来说，`rtk optimize` 是**从 77% 平均压缩率迈向 90%+ 个性化压缩率的最后一公里**。

---

## 参考资料

- [RTK GitHub 仓库](https://github.com/rtk-ai/rtk)
- [RTK 系列 01：RTK——AI Coding Agent 的 Token 压缩利器](RTK系列01：RTK（Rust%20Token%20Killer）——AI%20Coding%20Agent的Token压缩利器.md)
- [RTK 系列 02：源码深度解析——从 CLI 代理到 Token 压缩的工程实现](RTK系列02：源码深度解析——从CLI代理到Token压缩的工程实现.md)
