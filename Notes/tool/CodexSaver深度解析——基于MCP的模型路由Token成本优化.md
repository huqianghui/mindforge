---
title: "CodexSaver 深度解析——基于 MCP 的模型路由 Token 成本优化"
created: 2026-05-11
tags:
  - token-optimization
  - MCP
  - codex
  - deepseek
  - model-routing
  - cost-optimization
  - LLM
---

# CodexSaver 深度解析——基于 MCP 的模型路由 Token 成本优化

> Token 优化系列第三篇。前两篇分别介绍了 [Caveman](Caveman深度解析——LLM%20Token压缩的Prompt%20Engineering之道.md)（通过 Prompt Engineering 压缩 LLM 输出）和 [RTK](rtk/RTK系列01：RTK（Rust%20Token%20Killer）——AI%20Coding%20Agent的Token压缩利器.md)（通过 CLI 代理压缩工具输出）。本文介绍第三种范式——[CodexSaver](https://github.com/fendouai/CodexSaver)：不压缩 token，而是通过 MCP 将低风险任务路由到廉价模型执行，从根本上降低 token 的单价成本。

---

## 一、三种范式的根本区别

在进入 CodexSaver 的细节之前，有必要先厘清三种 Token 优化范式的本质差异：

| 维度 | Caveman | RTK | CodexSaver |
|------|---------|-----|-----------|
| **优化对象** | LLM 输出 token 数量 | 工具输入 token 数量 | Token 单位成本（$/token） |
| **核心机制** | Prompt 约束 LLM 生成风格 | CLI 代理过滤命令输出 | MCP 路由任务到廉价模型 |
| **技术本质** | Prompt Engineering | 数据管道过滤 | 模型调度与任务分级 |
| **节省方式** | 减少 token 总量 | 减少 token 总量 | 同样 token 量，花更少的钱 |
| **风险** | 可能影响推理质量 | 可能丢失关键信息 | 廉价模型输出质量可能不足 |
| **适用 Agent** | Claude Code、Codex 等 | Claude Code | 任何支持 MCP 的 Agent |

**关键认知**：Caveman 和 RTK 是**压缩策略**——让同一个模型处理更少的 token；CodexSaver 是**路由策略**——让不同价格的模型各做擅长的事。两者正交，可以叠加使用。

---

## 二、CodexSaver 是什么

[CodexSaver](https://github.com/fendouai/CodexSaver) 是一个 MCP 工具，将 OpenAI Codex 变成一个成本感知的任务路由器。其核心逻辑：

```
昂贵的模型负责判断（reasoning）
廉价的模型负责执行（volume）
永远不混淆两者
```

### 2.1 设计哲学

大多数编程 session 包含两类截然不同的工作：

- **昂贵思考**：架构设计、安全审查、复杂逻辑推理、歧义消解
- **廉价执行**：写测试、生成文档、代码搜索、代码解释、样板填充

Codex 在前者上无可替代，但在后者上大材小用。CodexSaver 的设计就是让正确的模型做正确的事。

### 2.2 架构：MCP 路由层

```
┌────────────────────────────────────────────────────────────┐
│                     OpenAI Codex                            │
│                                                            │
│  ┌──────────────┐    任务分析    ┌─────────────────────┐   │
│  │ 用户请求      │ ──────────→  │  CodexSaver MCP      │   │
│  └──────────────┘               │  (任务分类+路由)      │   │
│                                 └──────┬──────────────┘   │
│                                        │                   │
│                          ┌─────────────┼────────────┐      │
│                          │             │            │      │
│                          ▼             ▼            ▼      │
│                    ┌──────────┐  ┌──────────┐ ┌─────────┐ │
│                    │ 高风险    │  │ 低风险    │ │ 预览    │ │
│                    │ Codex    │  │ DeepSeek │ │ 仅路由  │ │
│                    │ 原地执行  │  │ 委派执行  │ │ 展示   │ │
│                    └──────────┘  └──────────┘ └─────────┘ │
└────────────────────────────────────────────────────────────┘
```

**三种路由状态**：

| 状态 | 含义 | 场景 |
|------|------|------|
| `codex_takeover` | 任务留在 Codex | 风险高、歧义大、涉及保护领域 |
| `delegated_execution` | 委派给廉价模型 | 写测试、文档、搜索、解释等低风险工作 |
| `preview` | 仅展示路由决策 | 预览模式，不实际调用外部模型 |

### 2.3 任务分级策略

CodexSaver 将开发任务分为两类：

**留给 Codex（高性能模型）**：
- 架构设计与系统设计
- 安全审查与漏洞分析
- 受保护域（敏感业务逻辑）
- 最终审批与合并决策
- 复杂多步推理

**委派给 Worker（廉价模型）**：
- 编写单元测试
- 生成代码文档/注释
- 代码搜索与解释
- 样板代码填充
- 格式化与重构建议

---

## 三、成本分析：为什么路由有效

### 3.1 模型价格差异

以 DeepSeek 与 OpenAI 旗舰模型对比（2026 年数据）：

| 指标 | OpenAI（GPT-4/5） | DeepSeek | 差异 |
|------|-------------------|----------|------|
| 输入 token | $2.50/百万 | $0.15/百万 | **16x** |
| 输出 token | ~$10/百万 | ~$4/百万 | **~2.5x** |

### 3.2 规模化成本对比

| 月度 Token 量 | OpenAI 成本 | DeepSeek 成本 | 节省比例 |
|--------------|-------------|---------------|---------|
| 5000 万 | ~$170–218 | ~$10 | 94% |
| 5 亿 | ~$1,600 | ~$120 | 92% |
| 10 亿 | ~$18,000 | ~$1,800 | 90% |

### 3.3 实际节省预估

假设一个典型编程 session 中，60% 的工作是低风险执行类任务：

```
无 CodexSaver：100% token × $2.50/M = $2.50/M
有 CodexSaver：40% × $2.50/M + 60% × $0.15/M = $1.09/M
节省：56%
```

如果结合 Caveman + RTK 先压缩 token 总量（~78%），再用 CodexSaver 路由：

```
三层联合：总 token 降低 78%，剩余 token 中 60% 再降价 94%
最终成本 ≈ 原始的 ~12%
```

---

## 四、工程实现

### 4.1 安装与配置

CodexSaver 采用全局安装模式，一次配置所有 workspace 可用：

```bash
git clone https://github.com/fendouai/CodexSaver
cd CodexSaver

# 配置 Worker 模型（默认 DeepSeek）
python cli.py auth set --provider deepseek --api-key YOUR_API_KEY

# 全局安装到 Codex
python cli.py install

# 验证安装
python cli.py doctor
```

安装后，`~/.codex/config.toml` 中注册 MCP 入口，指向 `~/.codexsaver/codexsaver_mcp.py`。

### 4.2 多 Provider 支持

除 DeepSeek 外，支持一键切换：

```bash
# OpenAI 低价模型
python cli.py auth set --provider openai --api-key KEY --model gpt-4o-mini

# Anthropic
python cli.py auth set --provider anthropic --api-key KEY --model claude-3-5-haiku-latest

# 本地模型（零成本）
python cli.py auth set --provider ollama --model llama3.1
python cli.py auth set --provider lmstudio --model local-model

# 自定义 endpoint
python cli.py auth set --provider custom --api-key KEY \
  --base-url https://example.com/v1/chat/completions --model your-model
```

### 4.3 交互反馈机制

CodexSaver 的一个设计亮点是**路由决策可见性**。每次任务委派都返回 `interaction` 块：

```json
{
  "interaction": {
    "tool": "codexsaver.delegate_task",
    "mode": "delegated_execution",
    "headline": "CodexSaver delegated this task to the configured worker provider.",
    "route_label": "[CodexSaver] route=deepseek task_type=write_tests risk=low",
    "next_step": "Review the worker result and apply it only if the patch looks safe."
  }
}
```

这解决了路由系统最大的信任问题：用户始终知道哪个模型在处理哪个任务。

### 4.4 使用方式

安装完成后，在 Codex 中自然对话即可触发路由：

```
> 帮我为这个函数写单元测试

[CodexSaver] route=deepseek task_type=write_tests risk=low
→ DeepSeek 执行，Codex 审查结果
```

```
> 这段代码有安全漏洞吗？

[CodexSaver] codex_takeover — 安全审查留在 Codex
→ Codex 直接处理
```

---

## 五、适用边界与风险

### 5.1 优势

- **成本线性可控**：规模越大，节省越明显（90%+ 级别）
- **不损失 token 信息**：不像 Caveman/RTK 通过压缩减少信息量，CodexSaver 保持完整上下文
- **可审计**：每次路由决策都有可见记录
- **零修改现有工作流**：全局 MCP 注册，对用户透明

### 5.2 风险与权衡

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 廉价模型质量不足 | 错误代码、逻辑缺陷 | Codex 负责最终 review |
| 额外延迟（~6s/任务） | 交互体验下降 | 仅批量/非紧急任务路由 |
| 数据安全 | 代码发送到第三方 API | 可用本地模型（Ollama）替代 |
| 路由误判 | 高风险任务被委派 | 保守策略 + 人工 review |
| 工具链维护 | 依赖外部服务可用性 | 降级策略——路由失败则 Codex 接管 |

### 5.3 不适用场景

- **中小规模使用**：月度 token 消耗低于千万级时，工程复杂度超过成本收益
- **高安全要求**：不允许代码离开组织边界的场景（除非用本地模型）
- **需要一致性推理**：跨多个步骤的长链推理不宜中途切换模型
- **非 Codex 用户**：目前仅支持 OpenAI Codex 生态

---

## 六、三种范式的协同使用

三种 token 优化方案作用于完全不同的维度，可以叠加使用：

```
┌───────────────────────────────────────────────────────┐
│                   Token 优化全景                        │
├─────────────────┬────────────────┬────────────────────┤
│   Layer 1       │   Layer 2      │    Layer 3         │
│   Caveman       │   RTK          │    CodexSaver      │
│                 │                │                    │
│  压缩 LLM 输出  │  压缩工具输出   │  路由到廉价模型     │
│  (-65%)         │  (-80%)        │  (-56% 单价)       │
│                 │                │                    │
│  Prompt Eng.    │  CLI Proxy     │  MCP Routing       │
│  质量换token    │  噪声过滤      │  模型分级调度       │
└─────────────────┴────────────────┴────────────────────┘
```

### 联合使用效果估算

以 30 分钟开发 session 为基准：

| 优化层 | 作用 | Token 效果 | 成本效果 |
|--------|------|-----------|---------|
| 无优化 | — | 130,900 tokens | 100% 成本 |
| +Caveman | LLM 输出 -65% | ~123,000 tokens | ~94% |
| +RTK | 工具输出 -80% | ~28,586 tokens | ~22% |
| +CodexSaver | 60% 流量路由 | 28,586 tokens | ~12% |

**三层联合：token 总量降低 78%，单价再降 56%，最终成本约为原始的 12%。**

### 决策矩阵

| 场景 | 推荐组合 | 理由 |
|------|---------|------|
| 个人开发，预算敏感 | Caveman + RTK | 零额外成本，纯压缩 |
| 团队开发，大量批量任务 | RTK + CodexSaver | 批量任务路由收益最大 |
| 极致成本优化 | 三者全开 | 12% 成本，适合高频调用 |
| 复杂架构设计 | 仅 RTK | 不压缩推理输出，不路由关键判断 |
| 本地部署，合规优先 | CodexSaver + Ollama | 数据不出组织，零 API 费用 |

---

## 七、跨平台适配——MCP 模式的通用性

### 7.1 核心认知：MCP Server 是平台无关的

CodexSaver 的本质是一个 **MCP Server**——它通过标准的 MCP 协议暴露 `delegate_task` 工具。而 MCP 是一个开放协议，**任何支持 MCP 的 AI Coding Agent 都可以接入**：

| 平台 | MCP 支持 | 接入方式 |
|------|---------|---------|
| OpenAI Codex | 原生支持 | `~/.codex/config.toml` 注册 |
| Claude Code | 原生支持 | `~/.claude/settings.json` 或项目 `.mcp.json` 注册 |
| GitHub Copilot（Agent Mode） | 支持 MCP | VS Code 设置中注册 MCP Server |
| Cursor | 支持 MCP | 项目 `.cursor/mcp.json` 注册 |

也就是说，CodexSaver 这个具体实现虽然是为 Codex 写的安装脚本，但其 MCP Server 核心逻辑（任务分类 → 风险评估 → 路由到廉价模型）**可以直接复用或稍作适配用于任何平台**。

### 7.2 为其他平台编写适配

以 Claude Code 为例，适配思路非常直接：

```bash
# 方案 1：直接复用 CodexSaver 的 MCP Server，手动注册
# 在 .claude/settings.json 或 .mcp.json 中添加：
{
  "mcpServers": {
    "codexsaver": {
      "command": "python",
      "args": ["~/.codexsaver/codexsaver_mcp.py"]
    }
  }
}
```

```bash
# 方案 2：自写精简版 MCP Server（Python ~100 行）
# 核心逻辑：
# 1. 接收任务描述
# 2. 规则判断风险等级（关键词匹配：security/architecture → 高风险）
# 3. 低风险任务 → 调用 DeepSeek API 执行
# 4. 高风险任务 → 返回 "codex_takeover" 让宿主模型处理
```

**关键点**：模型路由的核心价值不在于某个具体 repo 的实现，而在于这个**模式（Pattern）**——通过 MCP 协议将任务分级委派给不同成本的模型。任何开发者都可以根据自己的平台和需求编写对应的 MCP Server。

### 7.3 各平台的补充路由手段

除了 MCP Server 这条通用路径，各平台还有各自的模型分级机制：

| 平台 | 原生分级能力 | 与 MCP 路由的区别 |
|------|------------|-----------------|
| Claude Code | `model` 参数选 haiku/sonnet/opus | Agent 级别分级，非 task 级别 |
| oh-my-claudecode | Agent 类型自动路由到不同模型 | 框架级调度，粒度更粗 |
| Codex | 仅单一模型 | 无原生分级，MCP 路由是唯一手段 |
| Copilot | 平台内多供应商选择 | 用户不可自定义路由规则 |

MCP 路由的独特价值在于：**task 级别的细粒度控制** + **完全自定义的路由规则** + **接入任意第三方或本地模型**。

### 7.4 趋势判断

模型路由正在成为 AI Coding 工具的标配能力：

1. **模型多样化**：主流 Agent 都在支持多模型选择（Claude Code 支持 haiku/sonnet/opus，Codex 支持 GPT 系列）
2. **成本透明化**：GitHub 的 AI Credits、OpenAI 的 Usage Dashboard 让用户直面 token 消耗
3. **路由智能化**：从手动选择模型 → 规则路由（CodexSaver） → 自适应路由（基于任务复杂度自动选择）
4. **本地模型崛起**：Ollama、LM Studio 让零成本执行成为可能，路由策略的收益上限进一步提升

---

## 八、总结

| 维度 | Caveman | RTK | CodexSaver |
|------|---------|-----|-----------|
| 一句话 | 让 LLM 少说废话 | 让工具少传噪音 | 让便宜模型干粗活 |
| 技术路线 | Prompt Engineering | Rust CLI Proxy | MCP Model Routing |
| 节省类型 | Token 数量 | Token 数量 | Token 单价 |
| 风险维度 | 推理质量 | 信息完整性 | 执行质量 |
| 适用规模 | 个人即受益 | 个人即受益 | 规模化后显著 |
| 平台依赖 | Claude Code 等 | Claude Code | 任何支持 MCP 的平台 |

Token 优化不是单一维度的问题。**压缩（减少数量）和路由（降低单价）是两条正交的优化轴**。Caveman + RTK 解决"用多少 token"的问题，CodexSaver 解决"每个 token 花多少钱"的问题。三者联合使用，可以将 AI Coding 的 token 成本从 100% 压缩到约 12%——这意味着原本只能支撑一周的预算，现在可以用两个月。

---

## 参考

- [CodexSaver GitHub](https://github.com/fendouai/CodexSaver)
- [Caveman 深度解析——LLM Token 压缩的 Prompt Engineering 之道](Caveman深度解析——LLM%20Token压缩的Prompt%20Engineering之道.md)
- [RTK 系列 01：RTK——AI Coding Agent 的 Token 压缩利器](rtk/RTK系列01：RTK（Rust%20Token%20Killer）——AI%20Coding%20Agent的Token压缩利器.md)
- [Caveman 与 RTK 对比——两种互补的 LLM Token 优化方案](Caveman与RTK对比——两种互补的LLM%20Token优化方案.md)
