---
title: Context7：让 AI Agent 实时获取最新文档的 MCP Server——以 Azure 文档为例
created: 2026-03-19
tags: [context7, mcp, mcp-server, context-engineering, azure, azure-skills, documentation, ai-agent, upstash, llm]
---

# Context7：让 AI Agent 实时获取最新文档的 MCP Server——以 Azure 文档为例

## 一、问题的起点：AI 生成的代码为什么总是"差一点"？

用 AI 编码助手写 Azure 相关代码时，经常遇到这类问题：

- 模型生成的 `az` CLI 命令用了一个**已废弃的参数**
- Terraform AzureRM Provider 的资源属性名**和最新版本对不上**
- Azure SDK 的 API 调用方式是**旧版本的写法**
- Bicep 模块引用了一个**不存在的 AVM 模块路径**

根本原因很简单：**LLM 的训练数据有截止日期**。模型在 2024 年训练时学到的 Azure CLI 参数，到 2026 年可能已经改了三次。即使是最新的模型，面对快速迭代的 SDK 和 CLI，也不可能保证每个参数都是最新的。

**Context7** 就是为解决这个问题而生的——它是一个 MCP Server，能在 AI Agent 运行时**实时检索最新版本的官方文档和代码示例**，注入到 LLM 的上下文中，让模型基于当前文档生成代码，而不是靠记忆猜测。

---

## 二、Context7 是什么？

[Context7](https://context7.com)（`@upstash/context7-mcp`）是 Upstash 开源的文档检索 MCP Server，GitHub 仓库 [upstash/context7](https://github.com/upstash/context7) 已有 **49,000+ Stars**，npm 周下载量 **50 万+**。

**核心定位**：为 AI 编码助手提供**实时的、版本特定的**库文档和代码示例。

**工作原理**：

```
开发者提示词                    Context7 Server                      LLM
    │                              │                                  │
    │  "用 Bicep 部署 AKS,         │                                  │
    │   use context7"              │                                  │
    │─────────────────────────────→│                                  │
    │                              │  1. resolve-library-id("bicep")  │
    │                              │  2. query-docs("/azure/bicep",   │
    │                              │     "deploy AKS cluster")        │
    │                              │                                  │
    │                              │  向量检索 + 重排序                 │
    │                              │  返回最相关的代码片段              │
    │                              │←─────────────────────────────────│
    │                              │                                  │
    │  [最新 Bicep AKS 模块示例     │                                  │
    │   注入到 LLM 上下文]          │─────────────────────────────────→│
    │                              │                                  │
    │                              │          基于最新文档生成代码       │
    │←─────────────────────────────────────────────────────────────────│
```

**关键特性**：
- **通用性**——不是 Azure 专属，索引了数千个开源库的文档
- **版本感知**——支持指定版本查询（如 `/vercel/next.js@14`）
- **服务端智能**——检索和排序在 Context7 服务端完成，不消耗 LLM 的推理 token
- **两种模式**——MCP Server（集成到 AI 工具）和 CLI（`npx ctx7`，独立使用）

---

## 三、两个核心工具

Context7 MCP Server 只暴露 **2 个工具**，设计极简：

### 3.1 `resolve-library-id`——"我要查哪个库？"

将用户输入的库名解析为 Context7 的标准库 ID。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `libraryName` | string | 是 | 库名，如 `"azure-docs"`、`"bicep"`、`"terraform-azurerm"` |
| `query` | string | 是 | 用户的原始问题——用于智能相关性排序 |

**返回值**（按相关性排序）：

```json
[
  {
    "id": "/microsoftdocs/azure-docs",
    "title": "Azure Documentation",
    "totalTokens": 11260999,
    "totalSnippets": 61791,
    "trustScore": 8.9,
    "benchmarkScore": 76.7,
    "lastUpdateDate": "2026-03-18T..."
  },
  ...
]
```

每个结果包含 `trustScore`（信任度，0-10）和 `benchmarkScore`（基准测试得分，0-100），帮助 Agent 判断文档质量。

### 3.2 `query-docs`——"给我这个库关于 X 的文档"

用库 ID + 查询问题，检索最相关的文档片段和代码示例。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `libraryId` | string | 是 | 标准库 ID，如 `/microsoftdocs/azure-docs`、`/azure/bicep` |
| `query` | string | 是 | 具体问题——用于向量检索和重排序 |
| `type` | string | 否 | 返回格式：`txt`（默认）或 `json` |

**返回值**包含两类内容：
- **`codeSnippets`**——代码示例（含语言、标题、描述、源 URL）
- **`infoSnippets`**——文档段落（含面包屑路径、正文、token 数）

**典型调用流程**：

```
Agent: resolve-library-id("bicep", "deploy AKS with GPU node pool")
  → 返回 [{ id: "/azure/bicep", trustScore: 9.6 }, ...]

Agent: query-docs("/azure/bicep", "AKS cluster with GPU node pool deployment")
  → 返回最新的 Bicep AKS 模块配置示例
```

---

## 四、数据从哪来？索引管道与新鲜度真相

### 4.1 七种数据源

Context7 的文档索引是**社区驱动**的——任何人都可以通过 API 或 Web UI 提交库。支持 7 种数据来源：

| 来源类型 | API 端点 | 说明 |
|----------|----------|------|
| **GitHub 仓库** | `POST /v2/add/repo/github` | 最常见的来源——爬取仓库中的 Markdown、代码示例 |
| **GitLab 仓库** | `POST /v2/add/repo/gitlab` | |
| **Bitbucket 仓库** | `POST /v2/add/repo/bitbucket` | |
| **通用 Git 服务** | `POST /v2/add/repo/git` | Gitea、Forgejo、Codeberg、自托管 GitLab 等 |
| **OpenAPI 规范** | `POST /v2/add/openapi` | 从 URL 解析或上传文件（≤10MB） |
| **llms.txt 文件** | `POST /v2/add/llms.txt` | 新兴标准——专为 LLM 设计的结构化文档索引 |
| **网站** | `POST /v2/add/website` | 爬取网页内容 |

以 Azure 官方文档为例，它的数据源是 GitHub 仓库 `microsoftdocs/azure-docs`——这个仓库包含 Azure 所有服务的 Markdown 文档，每天都有数百次 commit。

### 4.2 索引管道：从源码到可检索的代码片段

```
数据源（GitHub/Website/OpenAPI）
    │
    ▼
┌──────────────────┐
│ 解析引擎（私有）   │  Markdown → 代码片段 + 文档段落
│ Parsing Engine    │  版本检测器：识别多版本文档，排除旧版本
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ 质量处理          │  代码片段三阶段去重：
│                  │    1. 精确匹配
│                  │    2. 余弦相似度（近似重复）
│                  │    3. 非唯一性过滤
│                  │  两轮 Prompt Injection 检测
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ 向量数据库        │  存储代码片段和文档段落的向量嵌入
│ Vector DB        │  查询时：向量检索 → 服务端重排序 → 返回 Top-K
└──────────────────┘
```

> **注意**：解析引擎（Parsing Engine）和爬取引擎（Crawling Engine）是 **Upstash 私有闭源组件**。开源的只有 MCP Server 客户端（`@upstash/context7-mcp`）和 CLI 工具。

### 4.3 元数据维护：Trust Score + Benchmark + 版本检测

每个索引库都有一套自动维护的元数据：

**Trust Score（信任度，0-10）**——衡量数据源的可信度：
- 对于 Git 仓库：基于 star 数、账号/组织年龄、活跃度、follower 数、profile 完整度
- 对于网站：基于 TLS 使用、域名权威度（DA）、反向链接数、引用域名数

**Benchmark Score（基准测试，0-100）**——衡量文档质量：
- Context7 自动生成开发者问题，测试文档索引能否回答这些问题
- `/hashicorp/terraform-provider-azurerm` 得分 93.7（优秀），`/microsoftdocs/azure-docs` 得分 76.7（良好）

**版本检测器**——自动识别多版本文档结构，排除旧版本，只保留最新版本的内容。查询时支持版本语法：`/owner/repo@version`。

**验证状态**——三条路径获得"已验证"标记：
1. Trust Score ≥ 9（自动）
2. MCP 使用量排名 Top 100 且 Trust Score ≥ 6（自动）
3. 库作者主动认领（人工）

### 4.4 新鲜度真相：不是"实时"，而是"定期快照"

**这是使用 Context7 时必须了解的关键局限。** 以 Azure 官方文档为例，从 [Context7 的库详情页](https://context7.com/microsoftdocs/azure-docs) 可以看到：

| 字段 | 值 | 含义 |
|------|-----|------|
| Source | `github.com/microsoftdocs/azure-docs` | 数据源 |
| Last Updated | **2025-10-01** | 源仓库最后检测到的内容变更 |
| Last Run Date | **2025-12-17** | Context7 最后一次执行索引 |
| Current SHA | `35bc526d...` | 索引时锁定的 Git commit |
| Parse Failures | 887 / 16,714 | 约 5% 的页面解析失败 |

**关键问题**：`microsoftdocs/azure-docs` 仓库**每天都有数百次 commit**，但 Context7 的最后一次索引是 **2025 年 12 月 17 日**——距今已经 **3 个月**。这意味着：

- Context7 提供的 Azure 文档**比 LLM 训练数据新**（模型训练截止更早）
- 但**不是真正的实时**——它是"定期快照"模式
- **最近 3 个月新增或修改的 Azure 文档**不会出现在 Context7 的返回结果中

**刷新机制**：Context7 提供 `POST /v1/refresh` API 可以手动触发重新索引，但目前没有证据表明 Azure 文档库被频繁刷新。对于高活跃仓库（如 `microsoftdocs/azure-docs`），社区成员或库作者可以定期触发刷新。

**实际影响**：对于**稳定的 API 参考**（如 Bicep 语法、Terraform 资源属性），3 个月的延迟通常可以接受；但对于**快速迭代的新功能**（如刚发布的 AKS 新特性），Context7 可能还没来得及索引。

---

## 五、Azure 文档：一个具体的使用场景

Context7 索引了大量 Azure 相关文档，以下是已确认的 Azure 库：

| Context7 库 ID | 内容 | Tokens | 代码片段 | 页面数 | 信任度 |
|----------------|------|--------|----------|--------|--------|
| `/microsoftdocs/azure-docs` | **Azure 官方文档全集** | 11,260,999 | 61,791 | 16,714 | 8.9 |
| `/hashicorp/terraform-provider-azurerm` | Terraform AzureRM Provider | 2,865,566 | 13,282 | 2,982 | 9.8 |
| `/azure/azure-sdk-for-net` | Azure SDK for .NET | 1,806,291 | 11,447 | 1,704 | 9.6 |
| `/azure/azure-sdk-for-python` | Azure SDK for Python | 626,804 | 3,614 | 1,421 | 9.6 |
| `/azure/azure-cli` | Azure CLI 参考 | 158,804 | 910 | 170 | 9.6 |
| `/azure/bicep` | Bicep DSL | 116,811 | 354 | 138 | 9.6 |

其中 `/microsoftdocs/azure-docs` 是 Context7 的"VIP 库"——**16,714 个页面、1,100 万+ tokens、近 13 万个 QA 对**。这意味着当 AI Agent 需要查询 Azure 的任何服务文档时，Context7 可以提供几乎完整的覆盖。

### 实际效果对比

**不用 Context7**（模型靠记忆）：

```bicep
// 模型可能生成过时的 AKS 模块引用
module aks 'br/public:compute/aks:1.0.0' = {  // ← 版本可能已不存在
  params: {
    kubernetesVersion: '1.27'  // ← 可能已不支持
  }
}
```

**用 Context7**（实时检索最新文档）：

```bicep
// Context7 返回当前 AVM 模块的最新版本和参数
module aks 'br/public:avm/res/container-service/managed-cluster:0.5.3' = {
  params: {
    kubernetesVersion: '1.30'
    agentPoolProfiles: [
      {
        name: 'gpupool'
        vmSize: 'Standard_NC24ads_A100_v4'  // 最新 GPU VM SKU
        count: 2
      }
    ]
  }
}
```

差异的关键在于：模块路径、版本号、参数名和 GPU VM SKU 这些**高频变化的细节**——这正是 LLM 训练数据最容易过时的地方。

---

## 六、Azure Skills 中的两级检索策略

在 [Azure Copilot 生态全景](../../Azure/Azure%20Copilot%20生态全景：Skills、MCP%20Server%20与%20Copilot%20Agents%20的协作实践.md) 一文中，我们介绍了 Azure Skills 通过 `/plugin` 命令同时安装 Azure MCP Server 和 Context7：

```json
// Azure Skills 的 .mcp.json
{
  "mcpServers": {
    "azure": {
      "command": "npx",
      "args": ["-y", "@azure/mcp@latest", "server", "start"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

但 Azure Skills **并不是在所有场景都用 Context7**——它设计了一个精巧的**两级检索策略**：

### 场景 1：Azure 基础设施（Bicep/Terraform）——Context7 是补充

`azure-prepare/references/recipes/azd/iac-rules.md` 中规定：

> **Primary（主力）**：用 `mcp_azure_mcp_documentation` + `mcp_bicep_list_avm_metadata` 获取官方 AVM 模块目录
> **Secondary（补充）**：**仅当 Azure MCP 文档不够详细时**，才用 Context7 补充实现示例

**为什么？** Azure MCP Server 自带的文档工具（`mcp_azure_mcp_documentation`）提供的是**经过微软审核的、与当前 Azure 环境一致的权威内容**。Context7 爬取的是 GitHub 仓库的公开文档，可能有轻微延迟。对于基础设施配置这种**差一个字段就会部署失败**的场景，权威性优先。

### 场景 2：SDK 文档（Copilot SDK）——Context7 是主力

`azure-hosted-copilot-sdk/references/copilot-sdk.md` 中规定：

> Use **context7** MCP tools as the **PRIMARY** way to get SDK documentation:
> 1. `context7-resolve-library-id` with `libraryName: "copilot-sdk"`
> 2. `context7-query-docs` with resolved ID and query
> 3. Fallback: 如果 Context7 不可用，才用 `github-mcp-server-get_file_contents` 直接读 GitHub 文件

**为什么？** SDK API 变化频繁，Azure MCP Server 并没有为每个 SDK 都提供专门的文档工具。Context7 的实时爬取能力在这里更有价值——它能提供最新版本的 SDK 代码示例，而不是 Azure MCP Server 可能还没来得及更新的旧版接口。

### 设计原则

```
┌────────────────────────────────────────────────────────────┐
│                   Azure Skills 检索策略                     │
│                                                            │
│  基础设施文档（Bicep/Terraform/ARM）                        │
│    Primary  → Azure MCP Server（mcp_azure_mcp_documentation）│
│    Secondary → Context7（仅补充示例代码）                    │
│                                                            │
│  SDK/API 文档（Copilot SDK、第三方库）                       │
│    Primary  → Context7（实时最新）                           │
│    Fallback → GitHub 文件直读                               │
│                                                            │
│  设计逻辑：权威内容用权威源，快速迭代的内容用实时检索          │
└────────────────────────────────────────────────────────────┘
```

这个两级策略体现了一个重要的 Context Engineering 原则：**文档检索不是"用一个工具查所有"，而是根据内容的变化频率和权威性需求，选择最合适的检索路径。**

---

## 七、服务端架构、费用与 API Key

### 7.1 服务端在哪里？

Context7 的文档索引和向量检索**全部在 Upstash 的云端服务器上完成**（Upstash 总部在加州）。远程 MCP 端点：

```
https://mcp.context7.com/mcp
```

用户有两种接入方式，但**底层都依赖 Upstash 云端**：

| 接入方式 | 原理 | 本地是否需要运行进程？ |
|----------|------|---------------------|
| **本地进程模式**（`npx @upstash/context7-mcp`） | 本地启动 Node.js 进程，作为 MCP 协议转发层，实际检索请求**发送到 Upstash 云端** | 是 |
| **远程 MCP 模式**（直连 `https://mcp.context7.com/mcp`） | AI 工具直接连接 Upstash 远程 MCP 端点，无需本地进程 | 否 |

> **关键理解**：不管用哪种模式，"检索和排序在 Context7 服务端完成"指的是在 **Upstash 的云端基础设施**上完成——向量数据库、重排序模型、Prompt Injection 检测管道都运行在那里。本地进程只是一个轻量级的协议适配器。

### 7.2 费用

| 计划 | 价格 | API 调用量/月 | 超出后 | 私有仓库 | 自托管 |
|------|------|-------------|--------|---------|--------|
| **Free** | $0 | 1,000 次 | 被阻断（每天赠送 20 次补偿调用） | ✗ | ✗ |
| **Pro** | $10/seat/月 | 5,000 次/seat | $10/1,000 次（不阻断） | ✅（$25/1M tokens） | ✗ |
| **Enterprise** | 按需定价 | 自定义 | 不阻断 | ✅ | ✅ Docker/K8s/On-Premise + SOC-2/GDPR + SSO |

**1,000 次/月的免费额度够不够用？** 每次文档查询通常需要 2 次 API 调用（`resolve-library-id` + `query-docs`）。按每天查 15 次文档计算，一个月约 900 次——刚好在免费额度内。如果是高频开发，需要 Pro 计划。

**Azure Skills 的场景**：Azure Skills 的 `.mcp.json` 中**没有配置 API Key**，说明它依赖免费无 Key 模式。Skills 并不是每次都调用 Context7（只在 SDK 文档场景使用），所以免费额度通常够用。

### 7.3 API Key：可选但建议配置

**无 Key 也能用**，但有限制：

| | 无 API Key | 有 API Key |
|---|-----------|-----------|
| **公开库查询** | ✅ 可用（低速率限制） | ✅ 可用（高速率限制） |
| **私有仓库** | ✗ | ✅（Pro 计划） |
| **使用量追踪** | 按 IP 限流 | 按账号限额 |

**获取 Key 的方式**：

```bash
# 方式 1（推荐）：自动 setup——通过 OAuth 认证并自动生成 Key
npx ctx7 setup --claude    # Claude Code
npx ctx7 setup --cursor    # Cursor
npx ctx7 setup --opencode  # OpenCode

# 方式 2：手动获取
# 访问 https://context7.com/dashboard 注册账号，获取以 ctx7sk 开头的 API Key
```

---

## 八、实践配置指南

### 8.1 独立使用（不依赖 Azure Skills）

**Claude Code**（两种方式）：
```bash
# 方式 A：本地进程（无需 Key）
claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp

# 方式 B：远程 MCP + API Key（推荐，更高限额）
claude mcp add --scope user --header "CONTEXT7_API_KEY: ctx7sk_xxx" --transport http context7 https://mcp.context7.com/mcp
```

**VS Code**（`.vscode/mcp.json`）：
```json
{
  "servers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "YOUR_API_KEY" }
    }
  }
}
```

**Cursor**（`~/.cursor/mcp.json`）：
```json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "YOUR_API_KEY" }
    }
  }
}
```

### 8.2 CLI 模式（脱离 MCP 使用）

```bash
# 搜索 Azure 相关库
npx ctx7 library "azure-docs" "AKS GPU node pool"

# 直接查询文档
npx ctx7 docs "/microsoftdocs/azure-docs" "deploy AKS with GPU"

# 查询 Terraform AzureRM Provider
npx ctx7 docs "/hashicorp/terraform-provider-azurerm" "azurerm_kubernetes_cluster gpu"
```

### 8.3 在提示词中触发

最简单的使用方式——在任何支持 Context7 的 AI 工具中，直接在提示词末尾加上 `use context7`：

```
用 Terraform 部署一个带 GPU 节点池的 AKS 集群，use context7
```

Agent 会自动调用 `resolve-library-id` 和 `query-docs`，检索最新的 Terraform AzureRM 文档后再生成代码。

---

## 九、架构与性能

### 7.1 服务端智能检索

Context7 的核心设计理念是：**把文档过滤和排序的工作从 LLM 搬到专用的检索服务器上。**

> "Filtering and ranking documentation is cheaper, faster, and more predictable on our infrastructure than asking a general-purpose reasoning model to do it as part of generation."
> —— Upstash 技术博客

这与传统的"把整个文档页面塞进 LLM 上下文"的做法形成鲜明对比。Context7 在服务端完成**向量检索 + 重排序**，只返回最相关的代码片段和文档段落，大幅减少 token 消耗。

### 7.2 性能数据

Context7 在架构重写后的性能提升：

| 指标 | 重写前 | 重写后 | 改善 |
|------|--------|--------|------|
| 平均 token 消耗 | 9,700 | 3,300 | **-65%** |
| 平均延迟 | 24 秒 | 15 秒 | **-38%** |
| 平均工具调用次数 | 3.95 | 2.96 | **-30%** |

**关键优化**：旧版本需要多次来回调用（搜索 → 获取 → LLM 过滤 → 再获取），新版本一次 `query-docs` 调用就返回精确结果。

### 7.3 质量保障机制

**信任度评分（Trust Score）**——基于仓库的 star 数、账号年龄、活跃度、follower 数等指标计算，0-10 分。Azure 相关库的信任度普遍在 8.9-9.8 之间。

**基准测试（Benchmark Score）**——自动生成开发者问题，测试文档覆盖率和代码示例质量，0-100 分。`/hashicorp/terraform-provider-azurerm` 得分 93.7，说明其文档索引质量很高。

**安全机制**——两轮 Prompt Injection 检测管道，检索输入限制为最小必要信息（不接收用户代码和对话历史），防止通过文档内容注入恶意指令。

---

## 十、与其他文档获取方式的对比

| 方式 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| **Context7 MCP** | 实时最新、版本特定、服务端检索（省 token）、覆盖面广 | 依赖第三方服务、免费额度有限（1K/月）、爬取可能有延迟 | AI 编码助手的日常文档查询 |
| **Azure MCP `documentation`** | 微软官方权威、与 Azure 环境一致 | 仅覆盖 Azure 自身服务、不覆盖第三方库（Terraform、K8s） | Azure 基础设施配置 |
| **WebFetch / 网页抓取** | 可以访问任何 URL | 返回大量无关内容（导航栏、广告）、消耗大量 token、无智能过滤 | 偶尔查看特定页面 |
| **LLM 内置知识** | 零延迟、零 token 成本 | 有截止日期、参数可能过时、无法验证 | 查询稳定的、不常变化的 API |
| **RAG（自建向量库）** | 完全可控、可索引私有文档 | 需要自建基础设施、维护成本高 | 企业私有文档 |

**核心差异**：Context7 解决的是 LLM 内置知识和 RAG 之间的空白地带——公开的、快速迭代的库文档。这些文档**太多太杂不适合全部塞进 LLM 训练数据**，但**又不是私有内容不需要自建 RAG**。Context7 用一个轻量级的 MCP Server 填补了这个空白。

---

## 十一、Context Engineering 视角：Context7 的定位

从 [Context Engineering](A%20Survey%20of%20Context%20Engineering%20for%20Large%20Language%20Models/A%20Survey%20of%20Context%20Engineering%20for%20LargeLanguage%20Models%20读书笔记.md) 的框架看，Context7 属于**Retrieval Context（检索型上下文）** 的一种实现：

```
LLM 的上下文组成：
├── System Context（系统指令）      ← SKILL.md 剧本
├── Tool Context（工具定义）         ← Azure MCP Server 工具 Schema
├── Retrieval Context（检索内容）    ← Context7 文档检索 ★
├── Conversation Context（对话历史）
└── User Context（用户输入）
```

与传统 RAG 相比，Context7 的特点是：

1. **检索在服务端完成**——不消耗 LLM 的推理 token 做过滤和排序
2. **索引由社区维护**——不需要用户自建向量库
3. **通过 MCP 协议集成**——任何支持 MCP 的 AI 工具都能用，不需要专门适配

这也呼应了 [MCP vs CLI — 为什么开发者在重新审视 MCP](MCP%20vs%20CLI%20—%20为什么开发者在重新审视%20MCP.md) 一文中的核心观点：**MCP 用上下文空间换取调用精确度**。Context7 通过注入精确的文档片段（而非让模型猜测），用少量上下文空间（平均 3,300 tokens）换取了代码生成的准确性。

但 Context7 是云端 SaaS——如果团队需要索引**私有文档**或希望**不按次收费**，可以用开源组件自建类似系统。下一节详细讨论。

---

## 十二、私有化部署：自建类 Context7 系统

Context7 免费版有 1,000 次/月的调用限制，且**无法索引企业私有仓库**（需 Pro 或 Enterprise 计划）。如果团队需要索引内部 SDK、私有框架文档，并且希望不按次收费，可以考虑自建一套类似系统。

### 12.1 Context7 Enterprise 的局限

Context7 Enterprise 确实提供**自托管部署**（Docker/K8s/On-Premise），但需要注意：

- 开源的 `@upstash/context7-mcp` **只是一个轻量级 MCP 客户端**——它把请求转发给 Upstash 云端
- **索引管道、解析引擎、向量数据库都是 Upstash 私有闭源组件**，不在开源仓库中
- Enterprise 自托管本质上是**Upstash 把私有后端部署到你的环境中**，不是真正的开源自建

因此，如果要完全自主可控、零外部依赖地部署一套类 Context7 系统，需要用开源组件组装。

### 12.2 四种开源替代架构

#### 方案 A：RAGFlow——开箱即用，最快落地

[RAGFlow](https://github.com/infiniflow/ragflow)（Apache 2.0，GitHub 40K+ Stars）是目前最接近"一键替代 Context7"的开源方案：

```
文档文件 → RAGFlow（解析 + 分块 + 嵌入 + 向量存储 + 检索 + MCP）
                                    │
                             MCP Protocol
                                    │
                      Claude Code / Cursor / Windsurf
```

| 能力 | 说明 |
|------|------|
| **文档解析** | PDF、DOCX、PPTX、XLSX、HTML、图片、扫描件——内置深度理解 |
| **智能分块** | 模板化分块，保留引用关系 |
| **MCP 支持** | 2025 年 8 月原生支持——检索管道直接暴露为 MCP 工具 |
| **数据同步** | Confluence、S3、Notion、Google Drive 等 |
| **管理 UI** | 内置 Web UI，可视化管理索引和查询 |
| **部署** | Docker Compose 一键部署，约 1 小时可运行 |
| **资源需求** | 4+ 核 CPU、16 GB RAM、50 GB 磁盘 |

**适合**：想要最少折腾、快速投入使用的团队。

#### 方案 B：Docling + LlamaIndex + Qdrant MCP——模块化，最灵活

```
文档文件 → Docling（解析） → LlamaIndex（分块 + 嵌入） → Qdrant（向量存储）
                                                             │
                                                    Qdrant MCP Server
                                                             │
                                                   Claude Code / Cursor
```

| 组件 | 角色 | 许可 |
|------|------|------|
| [Docling](https://github.com/docling-project/docling)（MIT，IBM/LF AI 基金会，56K+ Stars） | 文档解析——PDF/Office/HTML 深度理解（表格、公式、布局） | MIT |
| [LlamaIndex](https://github.com/run-llama/llama_index)（MIT） | RAG 编排——分块、嵌入、索引管道 + `workflow_as_mcp` 直接暴露为 MCP | MIT |
| [Qdrant](https://github.com/qdrant/qdrant)（Apache 2.0，Rust） | 向量数据库——量化压缩可降低 97% 内存 | Apache 2.0 |
| [Qdrant MCP Server](https://github.com/qdrant/mcp-server-qdrant)（MIT） | 官方 MCP 适配器——`qdrant-store` + `qdrant-find` 两个工具 | MIT |

**适合**：需要对每个环节精细控制的团队——选择自己的嵌入模型、调整分块策略、自定义重排序逻辑。

#### 方案 C：Haystack + Hayhooks + Qdrant——生产级，最稳健

```
文档文件 → Haystack 索引管道 → Qdrant（存储）
                                    │
                          Haystack 查询管道
                                    │
                             Hayhooks（MCP）
                                    │
                         Claude Code / Cursor
```

[Haystack](https://github.com/deepset-ai/haystack)（Apache 2.0，deepset）是被 Apple、Meta、Databricks 在生产中使用的 RAG 框架。[Hayhooks](https://github.com/deepset-ai/hayhooks) 可以将任意 Haystack 管道**原生暴露为 MCP 工具**。

**适合**：需要企业级可观测性、已有 Haystack 经验的团队。

#### 方案 D：ChromaDB MCP Server——最简单，适合原型

```
文档文件 → Python 脚本（解析 + 嵌入 + 存储） → ChromaDB（本地持久化）
                                                        │
                                                Chroma MCP Server
                                                        │
                                                Claude Code / Cursor
```

[ChromaDB](https://github.com/chroma-core/chroma)（Apache 2.0）+ [Chroma MCP Server](https://github.com/chroma-core/chroma-mcp) 提供 12 个 MCP 工具（语义搜索、全文搜索、元数据过滤）。可以完全在笔记本上运行，无需外部服务。

**适合**：个人开发者、快速验证想法。

### 12.3 方案对比

| 维度 | Context7（云端） | RAGFlow | Docling+LlamaIndex+Qdrant | Haystack+Hayhooks | ChromaDB |
|------|----------------|---------|--------------------------|-------------------|----------|
| **部署复杂度** | 零（SaaS） | 低（Docker Compose） | 中（多组件） | 中-高 | 极低 |
| **MCP 原生支持** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **私有仓库索引** | Pro/Enterprise | ✅ | ✅ | ✅ | ✅ |
| **文档解析能力** | 私有引擎 | 优秀（内置） | 优秀（Docling） | 需集成 | 需自写 |
| **费用模型** | 按次/按 seat | 纯基础设施成本 | 纯基础设施成本 | 纯基础设施成本 | 纯基础设施成本 |
| **维护成本** | 零 | 低 | 中 | 中 | 低 |
| **索引质量保障** | Trust Score + Benchmark | 自行保障 | 自行保障 | 自行保障 | 自行保障 |

### 12.4 实践建议

**如果你只是想索引内部几个库的文档**——用 ChromaDB MCP Server，写一个 Python 脚本解析文档、生成嵌入、存入 ChromaDB，2 小时内可以跑通。

**如果你想搭建一个团队级的文档检索平台**——用 RAGFlow，Docker Compose 一键部署，内置 Web UI 管理索引，原生 MCP 支持，一天内可以投入使用。

**如果你有复杂的定制需求**（多种文档格式、自定义排序、特殊安全要求）——用 Docling + LlamaIndex + Qdrant 的模块化方案，每个环节都可以精细调优。

**不管选哪种方案**，自建系统需要自行解决 Context7 免费提供的三个能力：
1. **索引新鲜度**——需要设置定时任务重新索引文档
2. **质量评估**——需要自建测试机制验证检索质量
3. **安全过滤**——需要对索引内容做 Prompt Injection 检测（或信任内部文档源）

---

## 十三、总结

| 维度 | Context7 |
|------|----------|
| **定位** | 通用文档检索 MCP Server——为 AI 编码助手提供实时最新的库文档 |
| **核心工具** | `resolve-library-id`（找库）+ `query-docs`（查文档），仅 2 个工具 |
| **Azure 覆盖** | 索引了 Azure 官方文档（16K+ 页面）、Terraform AzureRM、Azure SDK、Bicep 等 |
| **Azure Skills 中的角色** | 两级检索：基础设施文档用 Azure MCP（主）+ Context7（补）；SDK 文档用 Context7（主） |
| **核心价值** | 解决 LLM 训练数据过时问题——用实时检索替代模型记忆 |
| **适用场景** | 查询快速迭代的公开库文档（SDK、CLI、框架） |
| **不适用场景** | 企业私有文档（需自建 RAG 或使用十二节的替代方案）、稳定不变的 API（模型内置知识够用） |

**一句话总结**：Context7 是 AI 编码助手的**"实时文档检索层"**——它不替代 LLM 的内置知识，而是在模型知识过时的地方**注入当前版本的权威文档**，让代码生成从"猜测"变为"基于事实"。

---

## 参考资料

- [Context7 GitHub (upstash/context7)](https://github.com/upstash/context7) — 49K+ Stars，MIT 协议
- [Context7 官网](https://context7.com) — 库搜索、排名、文档
- [npm: @upstash/context7-mcp](https://www.npmjs.com/package/@upstash/context7-mcp) — 50 万+周下载量
- [Context7 Without Context Bloat（架构博客）](https://upstash.com/blog/new-context7) — 性能优化细节
- [Context7 Quality and Safety（质量与安全博客）](https://upstash.com/blog/context7-quality-and-safety) — Trust Score 计算方法
- [Azure Skills GitHub (microsoft/azure-skills)](https://github.com/microsoft/azure-skills) — 22 个 Azure 专家剧本
- [Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践](../../Azure/Azure%20Copilot%20生态全景：Skills、MCP%20Server%20与%20Copilot%20Agents%20的协作实践.md) — Azure Skills 完整分析
- [MCP vs CLI — 为什么开发者在重新审视 MCP](MCP%20vs%20CLI%20—%20为什么开发者在重新审视%20MCP.md) — MCP 的上下文工程视角
- [RAGFlow](https://github.com/infiniflow/ragflow) — 开源 RAG 引擎，原生 MCP 支持
- [Docling](https://github.com/docling-project/docling) — IBM 开源文档解析工具
- [Qdrant MCP Server](https://github.com/qdrant/mcp-server-qdrant) — 向量数据库官方 MCP 适配器
- [Haystack + Hayhooks](https://github.com/deepset-ai/hayhooks) — 生产级 RAG 管道 MCP 暴露
- [ChromaDB MCP Server](https://github.com/chroma-core/chroma-mcp) — 轻量级向量检索 MCP
