---
title: "RTK Token Compression"
created: "2026-04-15"
updated: "2026-11-16"
tags:
  - wiki
  - concept
  - token-compression
  - cli
  - rust
  - ai-agent
aliases:
  - "RTK"
  - "Rust Token Killer"
related:
  - "[[caveman-token-compression]]"
  - "[[context-engineering]]"
  - "[[mcp-vs-cli]]"
  - "[[meta-harness]]"
  - "[[model-routing]]"
---

# RTK Token Compression

## 摘要

RTK（Rust Token Killer）是一个 Rust 编写的 CLI 代理工具，通过在 AI Coding Agent（如 Claude Code）与底层操作系统之间插入一个透明代理层，对工具调用的输出进行 token 压缩，从而降低 LLM 上下文消耗、减少成本并提升响应速度。核心思路是"不改 Agent、不改 LLM，只压缩中间数据流"——通过 59 个 TOML 配置文件和 38 个 Rust 模块实现可扩展的策略引擎。

## Claims

### Claim: RTK 通过 CLI 代理实现透明 token 压缩

- **来源**：[[RTK系列01：Rust-Token-Killer简介]]、[[2026-04-14-周二]]
- **首次出现**：2026-04-14
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：RTK 官方仓库 https://github.com/rtk-ai/rtk ：CLI proxy，重写命令并过滤压缩输出，100+ 命令，<10ms 开销；注意其是改写命令（rtk git status）的钩子方式

> RTK 在 Agent 和 OS 之间插入代理层，拦截 Bash/Read/Glob/Grep/Ls 等工具调用的输出，通过策略引擎裁剪、压缩、重组数据后返回给 Agent。Agent 无需任何修改即可获得压缩后的输出。

### Claim: RTK 的策略引擎基于 TOML 配置实现可扩展压缩

- **来源**：[[RTK系列02：源码深度解析]]、[[2026-04-15-周三]]
- **首次出现**：2026-04-15
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：stale
- **证据类型**：产品与服务
- **复核**：2026-11-07 待定——依据：官方仓库 README 未取到 '59 个 TOML 配置文件' 的计数，数字易变

> 59 个 TOML 配置文件定义了针对不同命令（git diff、cargo test、npm install 等）的压缩策略，包括行过滤、正则替换、重复折叠、截断等操作。用户可通过 Session 数据分析实际 token 消耗，定制个性化压缩规则。

### Claim: RTK 代表 Agent 工具链中"中间件"范式

- **来源**：[[RTK系列01：Rust-Token-Killer简介]]、[[RTK系列02：源码深度解析]]、[[2026-04-15-周三]]
- **首次出现**：2026-04-15
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过 中间件范式：wiki/concepts/rtk-token-compression.md）

> RTK 的架构启示：AI Agent 的工具调用链可以像 Web 中间件一样插入处理层。这种模式可以扩展到安全审计（拦截危险命令）、缓存（重复查询去重）、可观测性（记录所有工具调用）等场景。

### Claim: RTK 与 Caveman 完全互补，可同时启用覆盖全链路 token 优化

- **来源**：[[Caveman与RTK对比]]
- **首次出现**：2026-04-30
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：RTK 官方仓库 https://github.com/rtk-ai/rtk 称节省 60-90%（输入侧）；Caveman 官方仓库 https://github.com/juliusbrussee/caveman 压缩 output；作用于不同数据流。78% 为作者模拟值，未复核

> Caveman 压缩 output tokens（LLM 回复，-65%），RTK 压缩 input tokens（工具输出，-80%），两者作用于完全不同的数据流互不干扰。联合使用 30 分钟会话总节省 ~78%（130,900→28,586 tokens）。RTK 绝对节省量更大（命令输出占总量 ~90%），但纯对话场景仅 Caveman 有效。

### Claim: RTK 四大过滤策略实现确定性压缩

- **来源**：[[Caveman与RTK对比]]
- **首次出现**：2026-04-30
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：RTK 官方仓库 https://github.com/rtk-ai/rtk 列出 Smart Filtering / Grouping / Truncation / Deduplication 四策略，<10ms 开销

> 智能过滤（去噪音/注释/空白）、分组（按目录/类型聚合）、截断（仅保留失败用例）、去重（合并重复日志行并计数）。与 Caveman 的概率性输出压缩不同，RTK 基于确定性算法，效果稳定可预测，每命令处理开销 <10ms。

### Claim: 插在 agent 与工具之间的中间件，失败时必须退化成透传——RTK 三层回退：元命令报错、TOML 过滤器匹配、无匹配则无缓冲原样透传，退出码完整保留，"rtk 任意命令"永远是安全前缀

- **来源**：[[RTK系列02：源码深度解析]]
- **首次出现**：2026-04-15
- **最近更新**：2026-11-16
- **置信度**：0.75
- **状态**：active
- **证据类型**：实测经验

> Clap 解析失败时：① 命令属于 RTK 自身元命令（gain、discover、learn、init、config）→ 展示参数错误；② 在 TOML 过滤器注册表里找到匹配 → 执行原命令、走 8 阶段 TOML 管道、按 `rtk:toml` 记追踪；③ 都没有 → `Stdio::inherit()` 流式透传，只记计时（0 token）供 `rtk gain --history` 分析。设计含义：压缩器出错的代价必须是"少省一点 token"，而不是"agent 的命令跑不了"——agent 无法判断工具层是不是自己出的错，任何阻塞都会被它当成任务失败去重试或绕路。hook 安装与安全检查也按同一原则：解析失败静默记录、不打断命令。

### Claim: 通用过滤器有天花板，个性化优化要从真实会话历史里找——RTK 读 Claude Code 的 session 记录，按 discover → optimize → verify → gain 闭环生成、验证、度量过滤器

- **来源**：[[RTK系列03：个性化优化引擎]]
- **首次出现**：2026-04-15
- **最近更新**：2026-11-16
- **置信度**：0.65
- **状态**：active
- **证据类型**：实测经验

> 通用过滤器覆盖常见命令、节省 60~90%，但有四个盲区：未覆盖的命令（每天跑几十次的 `terraform plan` 全量透传）、对个人过于保守的配置（`head_lines=50` 而输出常年不到 25 行）、反复出现的 CLI 拼写错误、文本过滤器压不动的结构化 JSON 输出。`rtk optimize` 用四个分析器扫会话历史，生成过滤器与配置建议并应用；`rtk verify` 校验生成的过滤器、`rtk gain` 度量实际节省。这是把"工具层的调优"做成一个有度量的反馈闭环（见 [[feedback-loop]]），而不是靠人去猜哪些命令值得压。文章描述的是设计与实现，节省数字为项目自述。

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——确认 3、待定 1、长效 1

## 关联概念

- [[caveman-token-compression]] — `contrasts` RTK 压缩 input tokens（工具输出），Caveman 压缩 output tokens（LLM 回复），两者互补
- [[context-engineering]] — `extends` RTK 是 Context Engineering 在工具链层面的实践——通过压缩工具输出来优化 LLM 可用上下文
- [[mcp-vs-cli]] — `contrasts` RTK 选择 CLI 代理而非 MCP 协议，体现了两条工具集成路线的不同取舍
- [[model-routing]] — `contrasts` RTK 压缩 token 数量，模型路由降 token 单价，两条正交优化轴可叠加
- [[meta-harness]] — `contrasts` RTK 压缩工具输出是手工 Harness 优化，Meta-Harness 将此过程自动化

## 来源日记

- [[RTK系列01：Rust-Token-Killer简介]] — 为什么需要 RTK、原理与压缩率
- [[RTK系列02：源码深度解析]] — 三层回退、十大过滤策略、TOML 过滤器 DSL、hook 与安全机制
- [[RTK系列03：个性化优化引擎]] — 个性化优化引擎：四个分析器与 optimize 闭环
- [[2026-04-14-周二]] — 首次研究 RTK，本地安装试用
- [[2026-04-15-周三]] — 深度源码分析，撰写 RTK 系列 3 篇文章
- [[2026-04-30-周四]] — 与 Caveman 对比，产出三层优化对比文章
