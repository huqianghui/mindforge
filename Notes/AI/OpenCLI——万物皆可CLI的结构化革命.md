---
tags:
  - OpenCLI
  - CLI
  - MCP
  - AI-Agent
  - tool-calling
  - specification
  - OpenAPI
created: 2026-03-23
---

# OpenCLI：万物皆可 CLI 的结构化革命

## 一句话理解 OpenCLI

> **OpenCLI 之于 CLI，就像 OpenAPI 之于 HTTP API。**

[OpenCLI Specification](https://opencli.org/)（OCS）定义了一个标准的、平台和语言无关的接口描述格式，让人类和计算机都能理解一个 CLI 工具应该如何被调用——无需阅读源代码或文档。

它不是一个新的 CLI 框架，不是一个 agent，也不是 AI——它是一个 **接口描述层（Interface Description Layer）**。

## 为什么现在需要 OpenCLI？

### 传统世界：人 → CLI

过去 CLI 的使用者是人。人可以看 `--help`，读文档，试错。命令行参数的不规范、不统一，对人来说勉强可以应付。

### 新世界：LLM → Tool → CLI

但当 AI Agent 成为 CLI 的调用者时，问题就暴露了：

```bash
yt-dlp -f best -o output.mp4 URL
```

对人来说勉强能看懂，但对 LLM / Agent 来说：
- 参数不统一
- 没有 schema
- 很难稳定调用
- 无法自动发现能力

**OpenCLI 就是为解决这个问题而设计的。**

## OpenCLI 的核心设计

### 分层理解

OpenCLI 的架构可以分为两层：

**Layer 1：OpenCLI Spec（描述层）**

用 JSON/YAML 结构化描述 CLI 的结构——有哪些 command、参数是什么、输入输出类型、如何调用：

```yaml
commands:
  - name: download
    arguments:
      - name: url
        type: string
        required: true
    options:
      - name: format
        type: enum
        values: [best, worst, audio]
```

**Layer 2：具体实现（执行层）**

```bash
download xiaohongshu URL
# 背后是 yt-dlp + ffmpeg + whisper 的 pipeline
```

这一层才是真正的 "pipeline orchestration"，但 OpenCLI 本身不负责这一层。

### 关键区别

| 层 | 是什么 | OpenCLI 负责吗 |
|---|---|---|
| CLI 描述 | command / args / schema | 是 |
| 工具执行 | yt-dlp / ffmpeg | 否 |
| Pipeline 编排 | step1 → step2 → step3 | 否（不是核心） |
| AI 能力 | whisper / LLM | 否 |

### 规范要点

[OpenCLI Specification](https://github.com/spectreconsole/open-cli) 由 [Patrik Svensson](https://patriksvensson.se/posts/2025/07/introducing-open-cli)（Spectre.Console 作者）于 2025 年 7 月发起，目前仍为草案阶段，但已经定义了 schema.json 涵盖：

- CLI 基本信息（info / version / license）
- 命令树结构（commands / sub-commands）
- 参数定义（arguments / options / arity）
- 退出码（exit codes）
- 使用示例（examples）
- 短选项组合、参数分隔符等约定（conventions）

## CLI vs MCP：AI Agent 的两条路线

2025 年以来，AI Agent 生态中出现了两条主要的工具调用路线：MCP（Model Context Protocol）和 CLI。理解它们的区别，是理解 OpenCLI 价值的关键。

### 实测数据：CLI 的压倒性优势

[ScaleKit 的基准测试](https://www.scalekit.com/blog/mcp-vs-cli-use)用 Claude Sonnet 4 对 GitHub 的 Copilot MCP Server（43 个工具）和 `gh` CLI 跑了 75 次对比测试。结果令人震惊：

| 指标 | CLI | MCP | 差距 |
|---|---|---|---|
| Token 消耗（简单任务） | 1,365 | 44,026 | **32 倍** |
| Token 消耗（复杂任务） | 8,750 | 37,402 | **4 倍** |
| 任务成功率 | 100% | 72% | MCP 失败率 28% |
| 月成本（10K 操作） | ~$3 | ~$55 | **18 倍** |

### 为什么 MCP 这么贵？

核心原因是 **Schema Bloat（模式膨胀）**。MCP 会把服务器上所有工具的定义注入到每次对话的上下文中。GitHub MCP Server 暴露了 43 个工具，即使只是查一个 "repo 用什么语言"，agent 也要携带 webhook 管理、gist 创建、PR review 配置等完全用不到的工具 schema。

[Jannik Reinhard 的实战对比](https://jannikreinhard.com/2026/02/22/why-cli-tools-are-beating-mcp-for-ai-agents/)更加直观——同样查询 50 台设备信息：

- **MCP 方案**：总计约 145,000 tokens（其中 schema 注入就占 28,000）
- **CLI 方案**：总计约 4,150 tokens（无 schema 注入开销）

而且 MCP 方案在 3-4 次工具调用后，累积的上下文会把 agent 推到上下文窗口尾部，推理质量显著下降。

### 何时用什么？

CLI 和 MCP 不是非此即彼的关系，而是互补的：

| 场景 | 推荐 | 原因 |
|---|---|---|
| 本地文件操作、日志解析 | CLI | 无状态，延迟 1-50ms |
| 数据库连接、OAuth API | MCP | 需要有状态连接池 |
| 大规模数据处理 | CLI | 避免网络传输 |
| 长连接/流式服务 | MCP | WebSocket/PubSub |

**决策框架**：如果在同一台机器上运行且不需要持久状态——用 CLI；否则用 MCP。

最佳实践是混合使用：

```
1. CLI: fetch_logs → extract_errors  （本地，<10ms）
2. MCP: query_database → check_known_issues  （远程，150ms）
3. CLI: generate_report → write_to_disk  （本地，<5ms）
```

## OpenCLI 在 Agent 生态中的定位

综合以上分析，OpenCLI 在 AI Agent 技术栈中的位置变得清晰：

```
┌─────────────────────────────────────────┐
│  AI Agent（LLM Orchestrator）           │
├─────────────────────────────────────────┤
│                                         │
│  OpenCLI Spec ← CLI 的结构化描述        │
│     ↓                                   │
│  CLI Layer（本地高速执行）               │
│     • 无状态转换                        │
│     • 文件 I/O 和系统调用               │
│     • 数据解析、过滤、聚合              │
│     ⚡ 延迟: 1-50ms                    │
│                                         │
│  MCP Layer（远程协议通信）               │
│     • 有状态数据库连接                  │
│     • 第三方认证 API                    │
│     • 分布式长连接服务                  │
│     ⚡ 延迟: 50-500ms                  │
│                                         │
└─────────────────────────────────────────┘
```

OpenCLI 的角色是 **CLI 的 contract 定义层**。它让 Agent 能够：
- 自动发现 CLI 有哪些命令和参数
- 生成类型安全的调用代码
- 自动生成文档和补全
- 为 MCP Tool 提供 CLI 后端的结构化桥梁

## 现实判断与展望

### 目前的状态

- OpenCLI Spec 仍是**草案阶段**（Draft），由 Spectre.Console 组织维护
- GitHub 仓库（[spectreconsole/open-cli](https://github.com/spectreconsole/open-cli)）约 247 stars
- 已有 JSON Schema 定义和 TypeSpec 描述
- 社区反响积极——Reddit r/programming 上的[讨论](https://www.reddit.com/r/programming/comments/1lujo0u/introducing_opencli/)获得了正面关注

### 面临的挑战

1. **生态采纳**：需要主流 CLI 工具（`gh`、`az`、`kubectl` 等）主动提供 OpenCLI 描述文件
2. **与 MCP 的关系**：两者可以互补，但如何优雅桥接还需要实践验证
3. **Agent 兼容性**：不同 LLM 和 Agent 框架对结构化 CLI 描述的消费方式不统一

### 为什么值得关注

CLI 是计算世界最古老也最持久的接口形式。在 AI Agent 时代，CLI 的"不可结构化"问题第一次成为真正的瓶颈。OpenCLI 试图用 OpenAPI 成功验证过的思路——**用规范消除歧义，用 schema 桥接人机**——来解决这个问题。

当每一个 CLI 工具都有了 machine-readable 的描述文件，"万物皆可 CLI" 就不再只是一句口号，而是 AI Agent 时代的基础设施。

## 参考资料

- [OpenCLI 官网](https://opencli.org/)
- [OpenCLI GitHub 仓库](https://github.com/spectreconsole/open-cli)
- [Introducing OpenCLI — Patrik Svensson](https://patriksvensson.se/posts/2025/07/introducing-open-cli)
- [MCP vs CLI: Benchmarking AI Agent Cost & Reliability — ScaleKit](https://www.scalekit.com/blog/mcp-vs-cli-use)
- [Why CLI Tools Are Beating MCP for AI Agents — Jannik Reinhard](https://jannikreinhard.com/2026/02/22/why-cli-tools-are-beating-mcp-for-ai-agents/)
- [CLI Based AI Agent: Tool Calling with CLI — Vishal Mysore](https://medium.com/@visrow/cli-based-ai-agent-tool-calling-with-cli-19d773add372)
- [CLI vs MCP: Which Interface Should Your AI Agent Use? — CLIfor.ai](https://www.clifor.ai/compare/cli-vs-mcp)
- [ChatGPT 讨论：OpenCLI 与浏览器自动化区别](https://chatgpt.com/share/69c14622-b044-8010-8842-b49546d74479)
