---
title: Exa、Tavily 与 Context7——AI Agent 搜索三剑客的定位与 MCP 配置实践
created: 2026-03-24
tags: [exa, tavily, context7, mcp, search, agent, semantic-search, tool-routing, claude-code, AI-native]
---

# Exa、Tavily 与 Context7——AI Agent 搜索三剑客的定位与 MCP 配置实践

> 三种 Search-for-Agent 框架的能力边界、适用场景与 Claude Code 中的 MCP 配置策略

---

## 一、问题：Agent 的搜索能力从哪来？

当我们给 AI Agent 配置"搜索能力"时，第一反应往往是接 Bing Search 或 Google Search API。但在 Agent 场景下，传统搜索引擎返回的"链接列表"其实不太好用——Agent 需要的是**可直接消费的结构化内容**，而不是让它再去解析 HTML。

社区的应对方案是一批**专为 Agent 设计的搜索服务**，它们通过 MCP（Model Context Protocol）暴露为标准工具接口，让 Agent 像调用函数一样获取信息。其中最具代表性的三个：

- **Exa**——语义深度检索引擎
- **Tavily**——实时结构化搜索平台
- **Context7**——技术文档专用检索服务

它们解决的问题层面不同，组合方式也各异。本文逐一拆解，并给出 Claude Code 中的最佳配置策略。

---

## 二、三剑客定位一览

| 框架 | 一句话定位 | 核心能力 | 适合场景 |
|------|-----------|---------|---------|
| **Exa** | 为 AI 重新设计的语义搜索引擎 | 向量语义检索 + 全文抓取 + 结构化输出 | 深度研究、多步推理、技术趋势分析 |
| **Tavily** | Agent 专用的实时搜索 + 抓取平台 | 快速 web search + extract + crawl + map | 实时新闻、事实查证、快速 QA |
| **Context7** | 技术文档专用检索服务 | 最新 API 文档 / 库说明 / 代码示例检索 | 编程助手、IDE 集成、文档查询 |

**关键认知**：这三者**不是替代关系，而是互补关系**——它们各自覆盖搜索需求的不同象限。

---

## 三、Exa——"给 AI 用的 Google"

### 3.1 本质

Exa 是一家旧金山 AI 搜索创业公司（投资方包括 Benchmark、Lightspeed、NVIDIA、YC），目标是做一个**"给 LLM 用的搜索引擎"**。

与传统搜索引擎的核心差异：

| 维度 | Google / Bing | Exa |
|------|--------------|-----|
| 索引规模 | 万亿级网页 | 十亿～百亿级（远小于传统引擎） |
| 匹配方式 | 关键词 + PageRank | 向量语义（neural search） |
| 结果格式 | 链接列表 + 摘要 | 结构化内容片段 + 全文 + 引用元数据 |
| 优化目标 | 给人类找有点击价值的结果 | 给 LLM 找有信息密度的内容 |
| 商业模式 | 广告驱动 | API 订阅（面向开发者和 AI 客户） |

### 3.2 架构层级

```
[Agent / Claude / Cursor]
        ↓ MCP
   exa-mcp-server（GitHub repo，只是适配层）
        ↓ HTTP API
   Exa Search Backend（真正的搜索引擎，闭源云服务）
        ↓
   Web data（互联网）
```

**关键误区澄清**：

- `exa-mcp-server`（[GitHub](https://github.com/exa-labs/exa-mcp-server)）**不是搜索引擎本体**，只是 MCP 适配层（protocol adapter + tool router）
- 真正的搜索能力来自 Exa 公司自己的云端闭源系统：crawler + index + embedding + ranking
- 官方提供免费远程 MCP 端点 `https://mcp.exa.ai/mcp`，有基本限额

### 3.3 核心工具

| MCP 工具 | 功能 |
|---------|------|
| `web_search_exa` | 实时搜索互联网 |
| `get_code_context_exa` | 代码 & API / 示例搜索 |
| `crawling_exa` | 从具体 URL 提取全文 |
| `company_research_exa` | 研究企业信息 |
| `people_search_exa` | 人物资料搜索 |
| `deep_researcher_start` | 多步深度研究任务 |

### 3.4 强项与局限

- **强项**：语义相关度高、过滤 SEO 垃圾、结构化输出适合 Agent 直接消费、支持多步推理
- **局限**：索引规模远不及 Google/Bing、深度搜索模式较慢、免费额度有限

---

## 四、Tavily——快速实时的 Agent 搜索伴侣

### 4.1 本质

Tavily 是一个**为 Agent 和 RAG 流水线设计的一站式搜索服务**，强调"快速可用、结构化、直接消化"。与 Exa 追求语义深度不同，Tavily 更注重**速度和实时性**。

### 4.2 核心工具

| 工具 | 功能 |
|------|------|
| `tavily_search` | 即时 web 搜索，返回清洗过的内容段落 |
| `tavily_extract` | 从指定 URL 提取结构化内容 |
| `tavily_crawl` | 网站爬虫，逐层抓取 |
| `tavily_map` | 站点结构映射 |
| `tavily_research` | 综合研究（多源聚合） |

### 4.3 独特优势

- **搜索深度可调**：`basic` / `fast` / `advanced` / `ultra-fast`，在速度与相关性之间灵活取舍
- **自动参数优化**：Tavily 会根据查询内容自动调整搜索参数
- **不只是搜索**：extract + crawl 让它在抓取内容和组织网页结构上比纯搜索引擎更全面
- **结构化输出**：清晰的 JSON 结果和 snippet 格式，Agent 无需自己解析 HTML

### 4.4 与 Exa 的核心差异

| 维度 | Tavily | Exa |
|------|--------|-----|
| 设计哲学 | 快速拿答案 | 深度找证据 |
| 返回结果 | 精炼 snippet + 清晰结构 | 丰富上下文 + 引用 + passage |
| 速度 | 快（实时性优异） | 中等（深度搜索较慢） |
| 最佳场景 | 事实查询、新闻检索 | 多步推理、深度调研 |

---

## 五、Context7——技术文档的专属搜索

### 5.1 本质

Context7 与 Exa / Tavily 完全不同——它**不做通用网络搜索**，而是专注于**技术文档、API 说明、库使用示例**等开发者资源的索引和检索。

> 详细介绍见 [Context7：让 AI Agent 实时获取最新文档的 MCP Server——以 Azure 文档为例](../Context-Engineering/Context7：让%20AI%20Agent%20实时获取最新文档的%20MCP%20Server——以%20Azure%20文档为例.md)

### 5.2 核心定位

- 聚焦软件技术文档（API 文档、库说明、代码片段等）
- 让 coding agent 在写代码时"不再迷路"：快速找到 API 参数、使用示例、规范
- 优化过 token 使用（只返回与查询最相关的一小段），减少上下文浪费

### 5.3 与 Exa / Tavily 的关系

```
Context7 = 专注某种内容（开发者资源）  ← 垂直域搜索
Exa     = 广泛语义搜索 + 全文抓取     ← 通用但 AI 优化
Tavily  = 实时搜索 + 结构化爬取       ← 通用但速度优先
```

Context7 不是 Exa 或 Tavily 的替代品，而是**编程场景下的专用补充**。

---

## 六、三者关键对比矩阵

| 维度 | Exa | Tavily | Context7 |
|------|-----|--------|----------|
| **定位** | 语义深度检索 | 实时抓取 + 结构化搜索 | 技术 / 文档检索 |
| **强调** | 语义相关度、深度内容 | 速度、结构化 snippet、爬取工具 | 精准文档索引 |
| **输出风格** | 丰富上下文、引用 + passage | 精炼 snippet + 清晰结构 | 文档片段 + 内容精简 |
| **适合任务** | 多步推理、重大事实调查 | 事实查询 + 实时信息 | 编程 / 技术查询 |
| **实时性** | 中等 | 高 | 非实时（侧重文档版本） |
| **覆盖范围** | 广泛网页（AI 优化筛选） | 广泛网页（速度优先） | 仅技术文档 / API |
| **免费额度** | 有（远程 MCP 端点） | 需 API Key | 免费 |
| **典型案例** | 深度调研 AI 技术趋势 | 快速新闻检索、事实查证 | 查找某库的函数用法 |

### 场景选择建议

- **研究类 Agent**（多句证据、深度回答）→ 优先 **Exa**
- **实时与事实型 Agent**（查最新网页 / 新闻）→ 优先 **Tavily**
- **代码助理 / IDE 集成 Agent**（查文档、示例）→ 用 **Context7**
- **混合场景** → 组合使用（如 Tavily + Context7，或 Exa + Context7）

---

## 七、Claude Code 中的 MCP 配置与 Tool Routing 实践

### 7.1 最小可用配置

```bash
# Exa（免费远程端点，无需 API Key）
claude mcp add --transport http exa https://mcp.exa.ai/mcp

# Tavily（需要 API Key）
claude mcp add --transport http tavily https://mcp.tavily.com/mcp \
  --header "Authorization: Bearer $TAVILY_API_KEY"

# Context7（stdio 模式）
claude mcp add context7 -- npx -y @context7/mcp
```

**Scope 建议**：个人开发用 `--scope user`，项目级用 `--scope project`，不要混用。

### 7.2 Tool Routing——真正的关键

**核心认知**：仅仅配置 MCP 是不够的。如果不写 routing 规则，模型会**随机选择工具**，导致效果不稳定、成本翻倍、延迟上升。

模型选择工具的机制：

```
tools = [exa_search, tavily_search, context7_search, ...]
模型 = 读问题 + 看 tool description → 推理 → 选工具
```

默认模式是 `tool_choice = auto`——模型可以不用工具、用一个、或选任意一个。**tool description 的语义区分度**直接决定选择准确率。

### 7.3 在 CLAUDE.md 中写 Routing 规则

```markdown
## MCP Tool Selection Rules

### Tavily Search
Use Tavily when:
- The query is about recent events, news, or real-time info
- The user asks for quick facts or summaries
- The answer likely exists as a simple web snippet

### Exa Search
Use Exa when:
- The task requires deep research or multiple sources
- The question is conceptual, technical, or analytical
- The answer needs long context or evidence aggregation

### Context7
Use Context7 when:
- Looking up API documentation, library usage, or code examples
- Need the latest version of technical docs (not cached knowledge)

### General Rules
- Prefer Tavily for speed unless depth is required
- Do NOT call both Tavily and Exa for the same query
- Use Context7 for all code/documentation lookups
- Avoid redundant searches across tools
```

### 7.4 常见坑与优化

| 坑 | 说明 | 解决方案 |
|----|------|---------|
| **多工具 = 更强** | 实际上多工具 = 更多噪音 + 选择困难 | 限制 3–5 个 MCP tools |
| **让模型自由选择** | 结果：Tavily + Exa 混用、重复搜索 | 在 CLAUDE.md 写硬约束 |
| **tool description 太模糊** | `"search"` vs `"search"` → 随机选 | 强化语义区分 |
| **output 太大** | 默认 25k tokens，容易炸上下文 | `export MAX_MCP_OUTPUT_TOKENS=20000` |

### 7.5 进阶：Multi-Retrieval 架构

未来的 Agent 搜索不再是"用哪个"，而是"怎么调度"：

```
retrieval layer =
    Exa（semantic / deep）
  + Tavily（real-time / fast）
  + Context7（docs / code）
  + vector DB（private data）
```

关键不是工具数量，而是 **routing 策略**——谁在做决策，决定了 Agent 是"随机工具调度器"还是"可控智能体"。

---

## 八、与已有知识体系的关联

本文介绍的搜索框架，在 Agent 架构中属于**MCP / Tool Layer（执行层）**——参见 [从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构](从Google五种Skill%20Pattern到Agent%20Runtime——Skill、MCP与Agent的统一架构.md) 中的三层架构模型：

```
Agent Loop Controller（运行模式层）
        ↓
   Skill Layer（能力层）
        ↓
   MCP / Tool Layer（执行层）← Exa / Tavily / Context7 在此
        ↓
   External Systems
```

搜索能力是 Agent 最基础的外部工具之一，选择和配置好搜索工具，是构建有效 Agent 系统的第一步。

---

## 总结

**一句话原则**：Exa 找证据、Tavily 找答案、Context7 找文档——三者互补不可互替。

| 需求 | 选择 |
|------|------|
| 深度研究 + 多步推理 | Exa |
| 实时信息 + 快速事实 | Tavily |
| 技术文档 + 代码示例 | Context7 |
| 通用 Agent 搜索栈 | Tavily + Context7（基础），需要深度时加 Exa |

配置了工具不等于用好了工具——**Tool Routing 才是真正的差距所在**。
